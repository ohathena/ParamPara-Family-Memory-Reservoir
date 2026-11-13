const mongoose = require('mongoose');
const Family = require('../models/Family');
const { HttpError } = require('./error');

function checkId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid ID');
}

// Returns the family if the user is owner or collaborator. Otherwise throws 403.
async function getFamilyForUser(familyId, user, { ownerOnly = false } = {}) {
  checkId(familyId);
  const family = await Family.findById(familyId);
  if (!family) throw new HttpError(404, 'Family not found');

  const isOwner = family.owner.equals(user._id);
  const isCollaborator = family.collaborators.some((id) => id.equals(user._id));

  if (ownerOnly && !isOwner) throw new HttpError(403, 'Only the family owner can do this');
  if (!isOwner && !isCollaborator) throw new HttpError(403, 'You do not have access to this family');
  return family;
}

module.exports = { checkId, getFamilyForUser };
