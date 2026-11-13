const mongoose = require('mongoose');

const TYPES = ['parent', 'child', 'spouse', 'sibling'];

// Directional: "source is the <type> of target"  (e.g. Asha --parent--> Ravi = Asha is Ravi's parent).
// We do NOT auto-create the reverse record.
const relationshipSchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    source: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', required: true, index: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', required: true, index: true },
    type: { type: String, enum: TYPES, required: true },
  },
  { timestamps: true }
);

relationshipSchema.index({ source: 1, target: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Relationship', relationshipSchema);
module.exports.TYPES = TYPES;
