const mongoose = require('mongoose');

const CATEGORIES = ['Story', 'Recipe', 'Photograph', 'Letter', 'Family event', 'Tradition', 'Achievement', 'Other'];

const memorySchema = new mongoose.Schema(
  {
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    people: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' }],
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    eventDate: { type: Date },
    location: { type: String, trim: true, maxlength: 150, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

memorySchema.index({ family: 1, category: 1, eventDate: -1 });

module.exports = mongoose.model('Memory', memorySchema);
module.exports.CATEGORIES = CATEGORIES;
