const mongoose = require('mongoose');
const Family = require('../models/Family');
const { HttpError } = require('../middleware/error');

const ROLES = ['owner', 'editor', 'viewer'];

function checkId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid ID');
}

const has = (list = [], userId) => list.some((id) => (id._id || id).equals(userId));

function roleOf(family, user) {
  const ownerId = family.owner._id || family.owner;
  if (ownerId.equals(user._id)) return 'owner';
  if (has(family.collaborators, user._id)) return 'editor';
  if (has(family.viewers, user._id)) return 'viewer';
  return null;
}

const canWrite = (role) => role === 'owner' || role === 'editor';

// Returns the family if the user belongs to it. Otherwise throws 403.
// Every route that touches family data goes through this one function.
//   ownerOnly: only the owner may continue
//   write:     owner or editor (viewers can only read and comment)
async function getFamilyForUser(familyId, user, { ownerOnly = false, write = false } = {}) {
  checkId(familyId);
  const family = await Family.findById(familyId);
  if (!family) throw new HttpError(404, 'Family not found');

  const role = roleOf(family, user);
  if (!role) throw new HttpError(403, 'You do not have access to this family');
  if (ownerOnly && role !== 'owner') throw new HttpError(403, 'Only the family owner can do this');
  if (write && !canWrite(role)) throw new HttpError(403, 'Viewers can read and comment, but cannot change family content');
  family.$locals.role = role; // handy for callers, not saved
  return family;
}

module.exports = { ROLES, checkId, roleOf, canWrite, getFamilyForUser };
