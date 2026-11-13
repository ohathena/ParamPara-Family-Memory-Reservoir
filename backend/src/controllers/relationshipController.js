const FamilyMember = require('../models/FamilyMember');
const Relationship = require('../models/Relationship');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, checkId } = require('../middleware/access');
const { loadMember } = require('./memberController');

async function loadRelationship(id, user) {
  checkId(id);
  const rel = await Relationship.findById(id);
  if (!rel) throw new HttpError(404, 'Relationship not found');
  await getFamilyForUser(rel.family, user);
  return rel;
}

exports.create = async (req, res) => {
  const { source, target, type } = req.body;
  if (!source || !target || !type) throw new HttpError(400, 'source, target and type are required');
  if (!Relationship.TYPES.includes(type)) throw new HttpError(400, `type must be one of: ${Relationship.TYPES.join(', ')}`);
  checkId(source);
  checkId(target);
  if (String(source) === String(target)) throw new HttpError(400, 'A member cannot be related to themselves');

  const a = await FamilyMember.findById(source);
  const b = await FamilyMember.findById(target);
  if (!a || !b) throw new HttpError(404, 'Member not found');
  if (!a.family.equals(b.family)) throw new HttpError(400, 'Both members must belong to the same family');
  await getFamilyForUser(a.family, req.user);

  // spouse and sibling are symmetric, so block the reverse duplicate too
  if (type === 'spouse' || type === 'sibling') {
    const reverse = await Relationship.findOne({ source: target, target: source, type });
    if (reverse) throw new HttpError(409, 'This relationship already exists');
  }

  const relationship = await Relationship.create({ family: a.family, source, target, type });
  res.status(201).json({ success: true, relationship });
};

exports.listForMember = async (req, res) => {
  const member = await loadMember(req.params.id, req.user);
  const relationships = await Relationship.find({
    $or: [{ source: member._id }, { target: member._id }],
  })
    .populate('source', 'name')
    .populate('target', 'name');
  res.json({ success: true, count: relationships.length, relationships });
};

exports.update = async (req, res) => {
  const rel = await loadRelationship(req.params.id, req.user);
  const { type } = req.body; // only the type can change
  if (!Relationship.TYPES.includes(type)) throw new HttpError(400, `type must be one of: ${Relationship.TYPES.join(', ')}`);
  rel.type = type;
  await rel.save();
  res.json({ success: true, relationship: rel });
};

exports.remove = async (req, res) => {
  const rel = await loadRelationship(req.params.id, req.user);
  await rel.deleteOne();
  res.json({ success: true, message: 'Relationship deleted' });
};
