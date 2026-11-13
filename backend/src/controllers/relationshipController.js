const FamilyMember = require('../models/FamilyMember');
const Relationship = require('../models/Relationship');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, checkId } = require('../services/accessService');
const { loadMember } = require('./memberController');

async function loadRelationship(id, user, options) {
  checkId(id);
  const rel = await Relationship.findById(id);
  if (!rel) throw new HttpError(404, 'Relationship not found');
  await getFamilyForUser(rel.family, user, options);
  return rel;
}

// A relationship that says the opposite of an existing one (A parent of B, and B parent of A) makes no sense
async function assertNoContradiction(source, target, type, ignoreId) {
  const opposite = { parent: ['parent'], child: ['child'] }[type];
  const ancestry = type === 'parent' || type === 'child';
  const checks = [];
  if (opposite) checks.push({ source: target, target: source, type: { $in: opposite } }); // B parent of A while A parent of B
  if (ancestry) checks.push({ $or: [{ source, target }, { source: target, target: source }], type: { $in: ['spouse', 'sibling'] } });
  else checks.push({ $or: [{ source, target }, { source: target, target: source }], type: { $in: ['parent', 'child'] } });
  const clash = await Relationship.findOne({ $or: checks, ...(ignoreId && { _id: { $ne: ignoreId } }) });
  if (clash) throw new HttpError(409, 'This conflicts with a relationship that already exists between these two people');
}

exports.create = async (req, res) => {
  const { source, target, type } = req.body;
  if (source === target) throw new HttpError(400, 'A member cannot be related to themselves');

  const [a, b] = await Promise.all([FamilyMember.findById(source), FamilyMember.findById(target)]);
  if (!a || !b) throw new HttpError(404, 'Member not found');
  if (!a.family.equals(b.family)) throw new HttpError(400, 'Both members must belong to the same family');
  await getFamilyForUser(a.family, req.user, { write: true });

  // "A parent of B" and "B child of A" say the same thing, and spouse/sibling work both ways: block those duplicates too
  const mirror = { parent: 'child', child: 'parent', spouse: 'spouse', sibling: 'sibling' }[type];
  const duplicate = await Relationship.findOne({ $or: [{ source, target, type }, { source: target, target: source, type: mirror }] });
  if (duplicate) throw new HttpError(409, 'This relationship already exists'); // the unique index is the last safety net
  await assertNoContradiction(a._id, b._id, type);

  const relationship = await Relationship.create({ family: a.family, source, target, type });
  res.status(201).json({ success: true, relationship });
};

exports.listForMember = async (req, res) => {
  const member = await loadMember(req.params.id, req.user);
  const relationships = await Relationship.find({ $or: [{ source: member._id }, { target: member._id }] })
    .populate('source', 'name')
    .populate('target', 'name');
  res.json({ success: true, count: relationships.length, relationships });
};

exports.update = async (req, res) => {
  const rel = await loadRelationship(req.params.id, req.user, { write: true });
  if (rel.type !== req.body.type) await assertNoContradiction(rel.source, rel.target, req.body.type, rel._id);
  rel.type = req.body.type; // only the type can change
  await rel.save();
  res.json({ success: true, relationship: rel });
};

exports.remove = async (req, res) => {
  const rel = await loadRelationship(req.params.id, req.user, { write: true });
  await rel.deleteOne();
  res.json({ success: true, message: 'Relationship deleted' });
};
