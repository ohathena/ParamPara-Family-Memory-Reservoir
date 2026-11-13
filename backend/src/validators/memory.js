const { z, objectId, text, optionalText, dateString, optionalDate } = require('./common');

const { CATEGORIES } = require('../models/Memory'); // single source of truth
const category = z.enum(CATEGORIES, { error: `category must be one of: ${CATEGORIES.join(', ')}` });
const { url } = require('./family');

exports.createMemory = z.object({
  family: objectId,
  title: text('Title', 150),
  content: text('Content', 20000),
  category: category.optional(),
  eventDate: optionalDate,
  location: optionalText(150).optional(),
  mediaUrl: url.optional(),
  people: z.array(objectId).max(100).optional(),
});

exports.updateMemory = z.object({
  title: text('Title', 150).optional(),
  content: text('Content', 20000).optional(),
  category: category.optional(),
  eventDate: optionalDate,
  location: optionalText(150).optional(),
  mediaUrl: url.optional(),
  people: z.array(objectId).max(100).optional(),
});

exports.listMemories = z.object({
  family: objectId,
  category: category.optional(),
  author: objectId.optional(),
  person: objectId.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'event']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

exports.createComment = z.object({ content: text('Comment', 2000) });
