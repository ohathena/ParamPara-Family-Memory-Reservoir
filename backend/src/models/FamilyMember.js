const mongoose = require('mongoose');

// A person in the family archive. Does NOT need a user account.
const memberSchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    birthDate: { type: Date },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FamilyMember', memberSchema);
