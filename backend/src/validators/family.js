const { z, objectId, text, optionalText, dateString } = require('./common');
const { TYPES } = require('../models/Relationship');
const { GENDERS } = require('../models/FamilyMember');

const role = z.enum(['editor', 'viewer'], { error: 'role must be editor or viewer' });
// photos must be a web address, so nobody can store a javascript: link
const url = z.string().trim().max(2000).refine((s) => s === '' || /^https?:\/\//i.test(s), 'Link must start with http:// or https://');

exports.url = url;
exports.createFamily = z.object({ name: text('Family name', 100), description: optionalText(1000).optional() });
exports.updateFamily = z.object({ name: text('Family name', 100).optional(), description: optionalText(1000).optional() });
exports.addCollaborator = z.object({ email: z.email({ error: 'A valid email is required' }).trim().toLowerCase(), role: role.optional() });
exports.changeRole = z.object({ role });
exports.createInvitation = z.object({ role: role.optional() });

const memberFields = {
  nickname: optionalText(60).optional(),
  gender: z.enum(GENDERS, { error: 'gender must be female, male, other or empty' }).optional(),
  birthPlace: optionalText(150).optional(),
  photoUrl: url.optional(),
  bio: optionalText(2000).optional(),
};
// birth must come before death
const datesInOrder = (m) => !(m.birthDate && m.deathDate) || new Date(m.birthDate) <= new Date(m.deathDate);
const datesMessage = { message: 'Death date cannot be before birth date', path: ['deathDate'] };

exports.createMember = z.object({ name: text('Name', 100), birthDate: dateString.optional(), deathDate: dateString.optional(), ...memberFields }).refine(datesInOrder, datesMessage);
exports.updateMember = z.object({ name: text('Name', 100).optional(), birthDate: dateString.nullable().optional(), deathDate: dateString.nullable().optional(), ...memberFields }).refine(datesInOrder, datesMessage);

const type = z.enum(TYPES, { error: `type must be one of: ${TYPES.join(', ')}` });
exports.createRelationship = z.object({ source: objectId, target: objectId, type });
exports.updateRelationship = z.object({ type });

exports.timelineQuery = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
exports.activityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  before: dateString.optional(),
});
exports.uploadSignature = z.object({ family: objectId });
