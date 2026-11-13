const Comment = require('../models/Comment');
const Memory = require('../models/Memory');
const { HttpError } = require('../middleware/error');
const { logActivity } = require('./activityService');

const MAX_PER_MEMORY = 500;

async function listComments(memoryId) {
  return Comment.find({ memory: memoryId }).sort({ createdAt: 1 }).limit(MAX_PER_MEMORY).populate('author', 'name').lean();
}

async function addComment(memory, user, content) {
  if (memory.commentCount >= MAX_PER_MEMORY) throw new HttpError(429, 'This memory has reached the comment limit');
  const comment = await Comment.create({ family: memory.family, memory: memory._id, author: user._id, content });
  await Memory.updateOne({ _id: memory._id }, { $inc: { commentCount: 1 } });
  await logActivity({ family: memory.family, actor: user, action: 'comment.added', subjectType: 'memory', subjectId: memory._id, subjectLabel: memory.title });
  await comment.populate('author', 'name');
  return comment;
}

async function deleteComment(comment) {
  await comment.deleteOne();
  await Memory.updateOne({ _id: comment.memory, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
}

module.exports = { listComments, addComment, deleteComment };
