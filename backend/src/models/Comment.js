const mongoose = require('mongoose');

// A comment on a memory. Every family role (viewer too) can comment.
const commentSchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    memory: { type: mongoose.Schema.Types.ObjectId, ref: 'Memory', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

commentSchema.index({ memory: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
