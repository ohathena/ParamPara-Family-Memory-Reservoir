const FamilyMember = require('../models/FamilyMember');
const Relationship = require('../models/Relationship');
const Memory = require('../models/Memory');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, checkId } = require('../middleware/access');

const pick = (body) => {
  const out = {};
  for (const key of ['name', 'birthDate', 'bio']) if (body[key] !== undefined) out[key] = body[key];
  return out;
};

// loads a member and makes sure the user can access its family
async function loadMember(id, user) {
  checkId(id);
  const member = await FamilyMember.findById(id);
  if (!member) throw new HttpError(404, 'Member not found');
  await getFamilyForUser(member.family, user);
  return member;
}

exports.create = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  if (!req.body.name) throw new HttpError(400, 'Member name is required');
  const member = await FamilyMember.create({ ...pick(req.body), family: family._id });
  res.status(201).json({ success: true, member });
};

exports.listForFamily = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  const members = await FamilyMember.find({ family: family._id }).sort({ name: 1 });
  res.json({ success: true, count: members.length, members });
};

exports.get = async (req, res) => {
  const member = await loadMember(req.params.id, req.user);
  res.json({ success: true, member });
};

exports.update = async (req, res) => {
  const member = await loadMember(req.params.id, req.user);
  Object.assign(member, pick(req.body));
  await member.save();
  res.json({ success: true, member });
};

exports.remove = async (req, res) => {
  const member = await loadMember(req.params.id, req.user);
  // clean up references so nothing points to a deleted member
  await Relationship.deleteMany({ $or: [{ source: member._id }, { target: member._id }] });
  await Memory.updateMany({ people: member._id }, { $pull: { people: member._id } });
  await member.deleteOne();
  res.json({ success: true, message: 'Member deleted' });
};

exports.loadMember = loadMember;
