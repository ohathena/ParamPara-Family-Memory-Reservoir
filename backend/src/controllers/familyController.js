const { Types } = require('mongoose');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const Relationship = require('../models/Relationship');
const User = require('../models/User');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, roleOf, checkId } = require('../services/accessService');
const familyService = require('../services/familyService');
const { getTimeline } = require('../services/memoryService');
const { buildTree } = require('../services/treeService');
const { logActivity, listActivity } = require('../services/activityService');
const invitations = require('../services/invitationService');

// family + the current user's role in it
const withRole = (family, user) => ({ ...family.toJSON(), role: roleOf(family, user) });
const fieldFor = (role) => (role === 'viewer' ? 'viewers' : 'collaborators');

exports.create = async (req, res) => {
  const family = await Family.create({ ...req.body, owner: req.user._id });
  await logActivity({ family, actor: req.user, action: 'family.created', subjectType: 'family', subjectId: family._id, subjectLabel: family.name });
  res.status(201).json({ success: true, family: withRole(family, req.user) });
};

exports.list = async (req, res) => {
  const families = await familyService.listForUser(req.user);
  res.json({ success: true, count: families.length, families });
};

exports.get = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  await family.populate([{ path: 'owner', select: 'name email' }, { path: 'collaborators', select: 'name email' }, { path: 'viewers', select: 'name email' }]);
  res.json({ success: true, family: withRole(family, req.user) });
};

exports.update = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  Object.assign(family, req.body); // body was cleaned by the validator, only name/description are possible
  await family.save();
  res.json({ success: true, family: withRole(family, req.user) });
};

exports.remove = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  await familyService.deleteFamilyCascade(family);
  res.json({ success: true, message: 'Family deleted' });
};

// ---- people with access (editors + viewers) ----
exports.addCollaborator = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  const user = await User.findOne({ email: req.body.email });
  if (!user) throw new HttpError(404, 'No registered user with that email. Send them an invite link instead.');
  const current = roleOf(family, user);
  if (current === 'owner') throw new HttpError(400, 'Owner is already in the family');
  if (current) throw new HttpError(409, `Already in the family as ${current}`);

  const role = req.body.role || 'editor';
  await Family.updateOne({ _id: family._id }, { $addToSet: { [fieldFor(role)]: user._id } });
  await logActivity({ family, actor: user, action: 'person.joined', subjectType: 'user', subjectId: user._id, subjectLabel: role });
  res.status(201).json({ success: true, message: `${user.name} added as ${role}` });
};

exports.changeRole = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  checkId(req.params.userId);
  const current = roleOf(family, { _id: Types.ObjectId.createFromHexString(req.params.userId) });
  if (!current) throw new HttpError(404, 'This person is not in the family');
  if (current === 'owner') throw new HttpError(400, 'The owner role cannot be changed');
  const { role } = req.body;
  await Family.updateOne({ _id: family._id }, { $pull: { collaborators: req.params.userId, viewers: req.params.userId } });
  await Family.updateOne({ _id: family._id }, { $addToSet: { [fieldFor(role)]: req.params.userId } });
  res.json({ success: true, message: `Role changed to ${role}` });
};

exports.removeCollaborator = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  checkId(req.params.userId);
  await Family.updateOne({ _id: family._id }, { $pull: { collaborators: req.params.userId, viewers: req.params.userId } });
  res.json({ success: true, message: 'Access removed' });
};

exports.leave = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  if (roleOf(family, req.user) === 'owner') throw new HttpError(400, 'The owner cannot leave. Delete the family instead.');
  await Family.updateOne({ _id: family._id }, { $pull: { collaborators: req.user._id, viewers: req.user._id } });
  res.json({ success: true, message: 'You left the family' });
};

// ---- invitations (link based) ----
exports.createInvitation = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  const invitation = await invitations.createInvitation(family, req.user, req.body?.role || 'editor');
  res.status(201).json({ success: true, ...invitation });
};

exports.previewInvitation = async (req, res) => {
  const family = await invitations.previewInvitation(req.params.token);
  res.json({ success: true, family });
};

exports.acceptInvitation = async (req, res) => {
  const { family, alreadyMember, role } = await invitations.acceptInvitation(req.params.token, req.user);
  res.json({ success: true, alreadyMember, role, familyId: family._id, message: alreadyMember ? 'You are already in this family' : 'You joined the family' });
};

// ---- read-only views built for the frontend ----
exports.stats = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  res.json({ success: true, stats: await familyService.getStats(family._id) });
};

exports.relationships = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  const relationships = await Relationship.find({ family: family._id }).populate('source', 'name').populate('target', 'name');
  res.json({ success: true, count: relationships.length, relationships });
};

exports.tree = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  const [members, relationships] = await Promise.all([
    FamilyMember.find({ family: family._id }).select('name nickname gender birthDate deathDate photoUrl').lean(),
    Relationship.find({ family: family._id }).lean(),
  ]);
  res.json({ success: true, tree: buildTree(members, relationships) });
};

exports.timeline = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  res.json({ success: true, ...(await getTimeline(family._id, req.validQuery)) });
};

exports.activity = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user);
  res.json({ success: true, ...(await listActivity(family._id, req.validQuery)) });
};

exports.exportArchive = async (req, res) => {
  const family = await getFamilyForUser(req.params.id, req.user, { ownerOnly: true });
  const data = await familyService.exportFamily(family);
  const safeName = family.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'family';
  res.setHeader('Content-Disposition', `attachment; filename="parampara-${safeName}-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(data);
};
