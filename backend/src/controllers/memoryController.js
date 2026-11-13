const Memory = require('../models/Memory');
const Comment = require('../models/Comment');
const { HttpError } = require('../middleware/error');
const { getFamilyForUser, checkId, canWrite } = require('../services/accessService');
const { assertPeopleInFamily, listMemories } = require('../services/memoryService');
const { logActivity } = require('../services/activityService');
const comments = require('../services/commentService');
const { withTransaction } = require('../utils/transaction');

async function loadMemory(id, user, options) {
  checkId(id);
  const memory = await Memory.findById(id);
  if (!memory) throw new HttpError(404, 'Memory not found');
  const family = await getFamilyForUser(memory.family, user, options);
  return { memory, family };
}

const isOwner = (family, user) => family.owner.equals(user._id);
const isAuthor = (doc, user) => doc.author && doc.author.equals(user._id);

// author or family owner can edit/delete (and a viewer cannot edit, even an old memory of their own)
function assertCanModify(memory, family, user) {
  if (!isAuthor(memory, user) && !isOwner(family, user)) {
    throw new HttpError(403, 'Only the author or family owner can change this memory');
  }
}

exports.create = async (req, res) => {
  const family = await getFamilyForUser(req.body.family, req.user, { write: true });
  await assertPeopleInFamily(req.body.people, family._id);
  const memory = await Memory.create({ ...req.body, family: family._id, author: req.user._id });
  await logActivity({ family, actor: req.user, action: 'memory.created', subjectType: 'memory', subjectId: memory._id, subjectLabel: memory.title });
  res.status(201).json({ success: true, memory });
};

exports.list = async (req, res) => {
  const family = await getFamilyForUser(req.validQuery.family, req.user);
  res.json({ success: true, ...(await listMemories(family._id, req.validQuery)) });
};

// the memory + what the current user may do with it (so the page does not need a second request)
exports.get = async (req, res) => {
  const { memory, family } = await loadMemory(req.params.id, req.user);
  await memory.populate([{ path: 'author', select: 'name' }, { path: 'people', select: 'name photoUrl' }]);
  const role = family.$locals.role;
  const canEdit = canWrite(role) && ((memory.author && memory.author._id.equals(req.user._id)) || role === 'owner');
  res.json({ success: true, memory, role, canEdit });
};

exports.update = async (req, res) => {
  const { memory, family } = await loadMemory(req.params.id, req.user, { write: true });
  assertCanModify(memory, family, req.user);
  await assertPeopleInFamily(req.body.people, family._id);
  Object.assign(memory, req.body);
  await memory.save();
  res.json({ success: true, memory });
};

exports.remove = async (req, res) => {
  const { memory, family } = await loadMemory(req.params.id, req.user, { write: true });
  assertCanModify(memory, family, req.user);
  await withTransaction(async (session) => {
    await Comment.deleteMany({ memory: memory._id }, { session });
    await Memory.deleteOne({ _id: memory._id }, { session });
  });
  res.json({ success: true, message: 'Memory deleted' });
};

// ---- comments (every role, viewers too) ----
exports.listComments = async (req, res) => {
  const { memory } = await loadMemory(req.params.id, req.user);
  const list = await comments.listComments(memory._id);
  res.json({ success: true, count: list.length, comments: list });
};

exports.addComment = async (req, res) => {
  const { memory } = await loadMemory(req.params.id, req.user);
  const comment = await comments.addComment(memory, req.user, req.body.content);
  res.status(201).json({ success: true, comment });
};

// comment author or family owner can delete a comment
exports.deleteComment = async (req, res) => {
  checkId(req.params.id);
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new HttpError(404, 'Comment not found');
  const family = await getFamilyForUser(comment.family, req.user);
  if (!isAuthor(comment, req.user) && !isOwner(family, req.user)) throw new HttpError(403, 'Only the writer or family owner can delete this comment');
  await comments.deleteComment(comment);
  res.json({ success: true, message: 'Comment deleted' });
};
