const mongoose = require('mongoose');

const GENDERS = ['', 'female', 'male', 'other'];

// A person in the family archive. Does NOT need a user account.
const memberSchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nickname: { type: String, trim: true, maxlength: 60, default: '' }, // "Dadi", "Bade Papa"
    gender: { type: String, enum: GENDERS, default: '' },
    birthDate: { type: Date },
    deathDate: { type: Date },
    birthPlace: { type: String, trim: true, maxlength: 150, default: '' },
    photoUrl: { type: String, trim: true, maxlength: 2000, default: '' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FamilyMember', memberSchema);
module.exports.GENDERS = GENDERS;
