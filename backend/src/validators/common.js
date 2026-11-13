const { z } = require('zod');

const objectId = z.string({ error: 'ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');
const text = (label, max) => z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long (max ${max})`);
const optionalText = (max) => z.string().trim().max(max, `Too long (max ${max})`);
const dateString = z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid date');
// null clears the value, missing leaves it unchanged
const optionalDate = dateString.nullable().optional();

module.exports = { z, objectId, text, optionalText, dateString, optionalDate };
