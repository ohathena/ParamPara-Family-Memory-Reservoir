const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const Relationship = require('../models/Relationship');
const Memory = require('../models/Memory');
const User = require('../models/User');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, checkId } = require('../middleware/access');

exports.create = async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new HttpError(400, 'Family name is required');
  const family = await Family.create({ name, description, owner: req.user._id });
  res.status(201).json({ success: true, family });
};

exports.list = async (req, res) => {
  const families = await Family.find({
    $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
  }).sort({ createdAt: -1 });
  res.json({ success: true, count: families.length, families });
};

exports.get = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  await family.populate('collaborators', 'name email');
  res.json({ success: true, family });
};

exports.update = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  if (req.body.name !== undefined) family.name = req.body.name; // only these two fields are writable
  if (req.body.description !== undefined) family.description = req.body.description;
  await family.save();
  res.json({ success: true, family });
};

exports.remove = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  // delete everything that belongs to the family
  await Memory.deleteMany({ family: family._id });
  await Relationship.deleteMany({ family: family._id });
  await FamilyMember.deleteMany({ family: family._id });
  await family.deleteOne();
  res.json({ success: true, message: 'Family deleted' });
};

// ---- membership (collaborators) ----
exports.addCollaborator = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  const { email } = req.body;
  if (typeof email !== 'string') throw new HttpError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new HttpError(404, 'No registered user with that email');
  if (family.owner.equals(user._id)) throw new HttpError(400, 'Owner is already in the family');
  if (family.collaborators.some((id) => id.equals(user._id))) throw new HttpError(409, 'Already a collaborator');

  family.collaborators.push(user._id);
  await family.save();
  res.status(201).json({ success: true, message: 'Collaborator added' });
};

exports.removeCollaborator = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  checkId(req.params.userId);
  family.collaborators = family.collaborators.filter((id) => !id.equals(req.params.userId));
  await family.save();
  res.json({ success: true, message: 'Collaborator removed' });
};
