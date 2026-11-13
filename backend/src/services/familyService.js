const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const Relationship = require('../models/Relationship');
const Memory = require('../models/Memory');
const Comment = require('../models/Comment');
const Invitation = require('../models/Invitation');
const Activity = require('../models/Activity');
const { withTransaction } = require('../utils/transaction');
const { roleOf } = require('./accessService');

// Deletes a family and everything that belongs to it, in one transaction when the database supports it.
// Children are removed first, so even without a transaction a failure never leaves records pointing to a missing family.
async function deleteFamilyCascade(family) {
  await withTransaction(async (session) => {
    const q = { family: family._id };
    await Comment.deleteMany(q, { session });
    await Memory.deleteMany(q, { session });
    await Relationship.deleteMany(q, { session });
    await FamilyMember.deleteMany(q, { session });
    await Invitation.deleteMany(q, { session });
    await Activity.deleteMany(q, { session });
    await Family.deleteOne({ _id: family._id }, { session });
  });
}

// Families of a user, each with its role and member/memory counts (2 grouped queries, not 2 per family)
async function listForUser(user) {
  const families = await Family.find({ $or: [{ owner: user._id }, { collaborators: user._id }, { viewers: user._id }] }).sort({ updatedAt: -1 }).lean();
  const ids = families.map((f) => f._id);
  const count = (Model) => Model.aggregate([{ $match: { family: { $in: ids } } }, { $group: { _id: '$family', n: { $sum: 1 } } }]);
  const [members, memories] = await Promise.all([count(FamilyMember), count(Memory)]);
  const toMap = (rows) => new Map(rows.map((r) => [String(r._id), r.n]));
  const m = toMap(members);
  const mem = toMap(memories);
  return families.map((f) => ({
    _id: f._id, name: f.name, description: f.description, createdAt: f.createdAt, updatedAt: f.updatedAt,
    role: roleOf(f, user),
    peopleWithAccess: 1 + f.collaborators.length + (f.viewers?.length || 0),
    memberCount: m.get(String(f._id)) || 0,
    memoryCount: mem.get(String(f._id)) || 0,
  }));
}

async function getStats(familyId) {
  const [members, memories, relationships, comments, byCategory, firstLast] = await Promise.all([
    FamilyMember.countDocuments({ family: familyId }),
    Memory.countDocuments({ family: familyId }),
    Relationship.countDocuments({ family: familyId }),
    Comment.countDocuments({ family: familyId }),
    Memory.aggregate([{ $match: { family: familyId } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Memory.aggregate([{ $match: { family: familyId, eventDate: { $ne: null } } }, { $group: { _id: null, first: { $min: '$eventDate' }, last: { $max: '$eventDate' } } }]),
  ]);
  return {
    members,
    memories,
    relationships,
    comments,
    byCategory: Object.fromEntries(byCategory.map((c) => [c._id, c.count])),
    yearsCovered: firstLast[0] ? { from: firstLast[0].first.getUTCFullYear(), to: firstLast[0].last.getUTCFullYear() } : null,
  };
}

// Full archive as plain JSON, so a family can always take its data with it
async function exportFamily(family) {
  const q = { family: family._id };
  const [members, relationships, memories, comments] = await Promise.all([
    FamilyMember.find(q).select('-__v -family').lean(),
    Relationship.find(q).select('source target type').lean(),
    Memory.find(q).select('-__v -family').populate('author', 'name').lean(),
    Comment.find(q).select('memory author content createdAt').populate('author', 'name').lean(),
  ]);
  return {
    format: 'parampara-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    family: { name: family.name, description: family.description, createdAt: family.createdAt },
    members,
    relationships,
    memories: memories.map((m) => ({ ...m, author: m.author?.name || 'Former member' })),
    comments: comments.map((c) => ({ ...c, author: c.author?.name || 'Former member' })),
  };
}

// Removes a user from every family they joined, and deletes families they own (used when an account is deleted)
async function removeUserEverywhere(user) {
  const owned = await Family.find({ owner: user._id });
  for (const f of owned) await deleteFamilyCascade(f);
  await Family.updateMany({ $or: [{ collaborators: user._id }, { viewers: user._id }] }, { $pull: { collaborators: user._id, viewers: user._id } });
  // their comments go, the memories they wrote stay with the family (shown as "Former member")
  const comments = await Comment.find({ author: user._id }).select('memory').lean();
  await Comment.deleteMany({ author: user._id });
  for (const c of comments) await Memory.updateOne({ _id: c.memory, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  await Invitation.deleteMany({ createdBy: user._id, usedBy: null });
  return { familiesDeleted: owned.length };
}

module.exports = { deleteFamilyCascade, listForUser, getStats, exportFamily, removeUserEverywhere };
