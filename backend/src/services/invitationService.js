const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const Family = require('../models/Family');
const { HttpError } = require('../middleware/error');
const { roleOf } = require('./accessService');
const { logActivity } = require('./activityService');

const EXPIRY_DAYS = 7;
const MAX_PENDING = 20;
const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function createInvitation(family, user, role = 'editor') {
  const pending = await Invitation.countDocuments({ family: family._id, usedBy: null, expiresAt: { $gt: new Date() } });
  if (pending >= MAX_PENDING) throw new HttpError(429, 'Too many pending invitations. Wait for them to expire or be used.');

  const token = crypto.randomBytes(24).toString('hex');
  const invitation = await Invitation.create({
    family: family._id,
    createdBy: user._id,
    tokenHash: hash(token),
    role,
    expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });
  // the plain token is returned only once, we never store it
  return { token, role: invitation.role, expiresAt: invitation.expiresAt };
}

async function findValid(token) {
  const invitation = await Invitation.findOne({ tokenHash: hash(token) });
  if (!invitation || invitation.expiresAt < new Date()) throw new HttpError(404, 'This invitation is invalid or has expired');
  if (invitation.usedBy) throw new HttpError(410, 'This invitation has already been used');
  return invitation;
}

async function previewInvitation(token) {
  const invitation = await findValid(token);
  const family = await Family.findById(invitation.family).select('name description owner').populate('owner', 'name');
  if (!family) throw new HttpError(404, 'This invitation is invalid or has expired');
  return { _id: family._id, name: family.name, description: family.description, invitedBy: family.owner?.name || '', role: invitation.role };
}

async function acceptInvitation(token, user) {
  const invitation = await findValid(token);
  const family = await Family.findById(invitation.family);
  if (!family) throw new HttpError(404, 'This invitation is invalid or has expired');
  if (roleOf(family, user)) return { family, alreadyMember: true };

  // Claim the invitation first with one atomic update, so two people cannot both use a single-use link
  const claimed = await Invitation.findOneAndUpdate(
    { _id: invitation._id, usedBy: null },
    { usedBy: user._id, usedAt: new Date() }
  );
  if (!claimed) throw new HttpError(410, 'This invitation has already been used');

  try {
    const field = invitation.role === 'viewer' ? 'viewers' : 'collaborators';
    await Family.updateOne({ _id: family._id }, { $addToSet: { [field]: user._id } });
  } catch (err) {
    await Invitation.updateOne({ _id: invitation._id }, { usedBy: null, usedAt: null }); // give the link back
    throw err;
  }
  await logActivity({ family, actor: user, action: 'person.joined', subjectType: 'user', subjectId: user._id, subjectLabel: invitation.role });
  return { family, alreadyMember: false, role: invitation.role };
}

module.exports = { createInvitation, previewInvitation, acceptInvitation };
