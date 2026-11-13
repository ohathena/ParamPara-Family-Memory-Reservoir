const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // hash, never returned
    // Bumped on password change / "log out everywhere". Tokens carry the version they were made with,
    // so older tokens stop working at once (fixes the "tokens are not revoked" trade-off from v1).
    tokenVersion: { type: Number, default: 0 },
    // password reset: only a hash of the emailed token is stored, it expires after 30 minutes
    resetTokenHash: { type: String, select: false, default: null },
    resetTokenExpires: { type: Date, select: false, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ resetTokenHash: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
