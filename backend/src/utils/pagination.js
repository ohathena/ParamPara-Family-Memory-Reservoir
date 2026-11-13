// Turns ?page=&limit= into safe numbers (limit is capped so nobody can ask for everything at once)
exports.parsePagination = (query, { defaultLimit = 10, maxLimit = 50 } = {}) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

exports.pageMeta = (total, page, limit) => ({ page, limit, total, pages: Math.ceil(total / limit) });
