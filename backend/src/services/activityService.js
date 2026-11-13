const Activity = require('../models/Activity');

// Writes one feed entry. A failed log must never break the real action, so errors are only printed.
async function logActivity({ family, actor, action, subjectType, subjectId = null, subjectLabel = '' }, session = null) {
  try {
    await Activity.create(
      [{ family: family._id || family, actor: actor?._id || null, actorName: actor?.name || '', action, subjectType, subjectId, subjectLabel: String(subjectLabel).slice(0, 160) }],
      { session }
    );
  } catch (err) {
    console.error('activity log failed:', err.message);
  }
}

async function listActivity(familyId, { limit = 20, before } = {}) {
  const filter = { family: familyId };
  if (before) filter.createdAt = { $lt: new Date(before) };
  const items = await Activity.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return { activity: items, nextBefore: items.length === limit ? items[items.length - 1].createdAt : null };
}

module.exports = { logActivity, listActivity };
