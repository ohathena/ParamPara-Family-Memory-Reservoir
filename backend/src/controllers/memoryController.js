const Memory = require('../models/Memory');
const FamilyMember = require('../models/FamilyMember');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, checkId } = require('../middleware/access');

const FIELDS = ['title', 'content', 'category', 'eventDate', 'location', 'mediaUrl', 'people'];
const pick = (body) => {
  const out = {};
  for (const key of FIELDS) if (body[key] !== undefined) out[key] = body[key];
  return out;
};

// every person tagged in a memory must exist and belong to the same family
async function checkPeople(people, familyId) {
  if (people === undefined) return;
  if (!Array.isArray(people)) throw new HttpError(400, 'people must be an array of member IDs');
  people.forEach(checkId);
  const count = await FamilyMember.countDocuments({ _id: { $in: people }, family: familyId });
  if (count !== new Set(people.map(String)).size) throw new HttpError(400, 'Some people do not belong to this family');
}

async function loadMemory(id, user) {
  checkId(id);
  const memory = await Memory.findById(id);
  if (!memory) throw new HttpError(404, 'Memory not found');
  const family = await getFamilyForUser(memory.family, user);
  return { memory, family };
}

exports.create = async (req, res) => {
  const { family: familyId } = req.body;
  if (!familyId) throw new HttpError(400, 'family is required');
  const family = await getFamilyForUser(familyId, req.user);
  await checkPeople(req.body.people, family._id);

  const memory = await Memory.create({ ...pick(req.body), family: family._id, author: req.user._id });
  res.status(201).json({ success: true, memory });
};

// GET /api/memories?family=ID&category=&author=&from=&to=&q=&sort=&page=&limit=
exports.list = async (req, res) => {
  const { family: familyId, category, author, from, to, q, sort } = req.query;
  if (!familyId) throw new HttpError(400, 'family query parameter is required');
  const family = await getFamilyForUser(familyId, req.user);

  const filter = { family: family._id };
  if (category) filter.category = String(category);
  if (author) {
    checkId(author);
    filter.author = author;
  }
  if (from || to) {
    filter.eventDate = {};
    if (from) filter.eventDate.$gte = new Date(from);
    if (to) filter.eventDate.$lte = new Date(to);
    if (Object.values(filter.eventDate).some((d) => isNaN(d))) throw new HttpError(400, 'Invalid date');
  }
  if (q) {
    const safe = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex characters
    filter.$or = [{ title: new RegExp(safe, 'i') }, { content: new RegExp(safe, 'i') }];
  }

  const sortOptions = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, event: { eventDate: -1 } };
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

  const [memories, total] = await Promise.all([
    Memory.find(filter)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name')
      .populate('people', 'name'),
    Memory.countDocuments(filter),
  ]);

  res.json({ success: true, page, limit, total, pages: Math.ceil(total / limit), memories });
};

exports.get = async (req, res) => {
  const { memory } = await loadMemory(req.params.id, req.user);
  await memory.populate([{ path: 'author', select: 'name' }, { path: 'people', select: 'name' }]);
  res.json({ success: true, memory });
};

// author or family owner can edit/delete
function canModify(memory, family, user) {
  if (!memory.author.equals(user._id) && !family.owner.equals(user._id)) {
    throw new HttpError(403, 'Only the author or family owner can change this memory');
  }
}

exports.update = async (req, res) => {
  const { memory, family } = await loadMemory(req.params.id, req.user);
  canModify(memory, family, req.user);
  await checkPeople(req.body.people, family._id);
  Object.assign(memory, pick(req.body));
  await memory.save();
  res.json({ success: true, memory });
};

exports.remove = async (req, res) => {
  const { memory, family } = await loadMemory(req.params.id, req.user);
  canModify(memory, family, req.user);
  await memory.deleteOne();
  res.json({ success: true, message: 'Memory deleted' });
};
