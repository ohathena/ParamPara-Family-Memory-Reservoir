const Memory = require('../models/Memory');
const FamilyMember = require('../models/FamilyMember');
const { HttpError } = require('../middleware/error');
const { parsePagination, pageMeta } = require('../utils/pagination');

const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, event: { eventDate: -1 } };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// every tagged person must exist and belong to the same family
async function assertPeopleInFamily(people, familyId) {
  if (!people || people.length === 0) return;
  const unique = new Set(people.map(String));
  const count = await FamilyMember.countDocuments({ _id: { $in: [...unique] }, family: familyId });
  if (count !== unique.size) throw new HttpError(400, 'Some people do not belong to this family');
}

async function listMemories(familyId, query) {
  const filter = { family: familyId };
  if (query.category) filter.category = query.category;
  if (query.author) filter.author = query.author;
  if (query.person) filter.people = query.person;
  if (query.from || query.to) {
    filter.eventDate = {};
    if (query.from) filter.eventDate.$gte = new Date(query.from);
    if (query.to) filter.eventDate.$lte = new Date(query.to);
  }
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i'); // escaped, so user input cannot change the pattern
    filter.$or = [{ title: rx }, { content: rx }];
  }

  const { page, limit, skip } = parsePagination(query, { defaultLimit: 10, maxLimit: 50 });
  const [memories, total] = await Promise.all([
    Memory.find(filter)
      .sort(SORTS[query.sort] || SORTS.newest)
      .skip(skip)
      .limit(limit)
      .populate('author', 'name')
      .populate('people', 'name photoUrl'),
    Memory.countDocuments(filter),
  ]);
  return { memories, ...pageMeta(total, page, limit) };
}

// Memories that have an event date, grouped by year (for the timeline page)
async function getTimeline(familyId, { from, to, limit = 100 }) {
  const filter = { family: familyId, eventDate: { $ne: null } };
  if (from) filter.eventDate.$gte = new Date(from);
  if (to) filter.eventDate.$lte = new Date(to);

  const memories = await Memory.find(filter)
    .sort({ eventDate: 1 })
    .limit(limit)
    .select('title category eventDate location content mediaUrl')
    .lean();

  const years = new Map();
  for (const m of memories) {
    const year = new Date(m.eventDate).getUTCFullYear();
    if (!years.has(year)) years.set(year, []);
    years.get(year).push({
      _id: m._id,
      title: m.title,
      category: m.category,
      eventDate: m.eventDate,
      location: m.location,
      mediaUrl: m.mediaUrl,
      excerpt: m.content.length > 160 ? m.content.slice(0, 160) + '...' : m.content,
    });
  }
  return { count: memories.length, years: [...years].map(([year, items]) => ({ year, memories: items })) };
}

module.exports = { assertPeopleInFamily, listMemories, getTimeline };
