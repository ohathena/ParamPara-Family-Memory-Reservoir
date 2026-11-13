const FamilyMember = require('../models/FamilyMember');
const Relationship = require('../models/Relationship');
const Memory = require('../models/Memory');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, checkId } = require('../services/accessService');
const { logActivity } = require('../services/activityService');
const { withTransaction } = require('../utils/transaction');

// loads a member and makes sure the user can access its family
async function loadMember(id, user, options) {
  checkId(id);
  const member = await FamilyMember.findById(id);
  if (!member) throw new HttpError(404, 'Member not found');
  const family = await getFamilyForUser(member.family, user, options);
  member.$locals.family = family;
  return member;
}

const assertDates = (m) => {
  if (m.birthDate && m.deathDate && m.birthDate > m.deathDate) throw new HttpError(400, 'Death date cannot be before birth date');
};

exports.create = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { write: true });
  const member = await FamilyMember.create({ ...req.body, family: family._id });
  await logActivity({ family, actor: req.user, action: 'member.added', subjectType: 'member', subjectId: member._id, subjectLabel: member.name });
  res.status(201).json({ success: true, member });
};

exports.listForFamily = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  const members = await FamilyMember.find({ family: family._id }).sort({ name: 1 }).limit(500); // a family archive is small, but never unbounded
  res.json({ success: true, count: members.length, members });
};

// member + their relationships + how many memories they appear in (one call for the profile page)
exports.get = async (req, res) => {
  const member = await loadMember(req.params.id, req.user);
  const [relationships, memoryCount] = await Promise.all([
    Relationship.find({ $or: [{ source: member._id }, { target: member._id }] }).populate('source', 'name photoUrl gender').populate('target', 'name photoUrl gender'),
    Memory.countDocuments({ family: member.family, people: member._id }),
  ]);
  res.json({ success: true, member, relationships, memoryCount, role: member.$locals.family.$locals.role });
};

exports.update = async (req, res) => {
  const member = await loadMember(req.params.id, req.user, { write: true });
  Object.assign(member, req.body);
  assertDates(member);
  await member.save();
  res.json({ success: true, member });
};

exports.remove = async (req, res) => {
  const member = await loadMember(req.params.id, req.user, { write: true });
  // clean up references so nothing points to a deleted member (all-or-nothing on Atlas)
  await withTransaction(async (session) => {
    await Relationship.deleteMany({ $or: [{ source: member._id }, { target: member._id }] }, { session });
    await Memory.updateMany({ people: member._id }, { $pull: { people: member._id } }, { session });
    await FamilyMember.deleteOne({ _id: member._id }, { session });
  });
  res.json({ success: true, message: 'Member deleted' });
};

exports.loadMember = loadMember;
