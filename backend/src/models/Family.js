const mongoose = require('mongoose');

// Roles inside a family:
//   owner   - full control (one person)
//   editor  - can add/edit members, relationships, memories  (stored in `collaborators`, name kept for old data)
//   viewer  - can read everything and comment, cannot change content (stored in `viewers`)
const familySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

familySchema.index({ collaborators: 1 });
familySchema.index({ viewers: 1 });

module.exports = mongoose.model('Family', familySchema);
