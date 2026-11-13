const mongoose = require('mongoose');

// A single-use link that lets a registered user join a family as editor or viewer.
// We store only a hash of the token, so a database leak cannot be used to join families.
const invitationSchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'editor' }, // role given to whoever accepts
    expiresAt: { type: Date, required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// MongoDB removes expired invitations automatically
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invitation', invitationSchema);
