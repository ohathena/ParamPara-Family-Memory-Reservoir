const mongoose = require('mongoose');

const ACTIONS = ['family.created', 'member.added', 'memory.created', 'comment.added', 'person.joined'];

// "Who did what" feed for a family. Names are copied in (snapshots), so the feed still reads well
// if the memory or user is deleted later. Old entries are removed automatically after a year.
const activitySchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    action: { type: String, enum: ACTIONS, required: true },
    subjectType: { type: String, enum: ['family', 'member', 'memory', 'user'], required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
    subjectLabel: { type: String, default: '', maxlength: 160 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ family: 1, createdAt: -1 });
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIONS = ACTIONS;
