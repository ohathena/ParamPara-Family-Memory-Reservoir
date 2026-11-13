const { HttpError } = require('./error');

// validate(schema)            -> checks req.body (cleaned data replaces req.body)
// validate(schema, 'query')   -> checks req.query (cleaned data goes to req.validQuery)
// zod drops fields that are not in the schema, which also protects against mass assignment.
module.exports = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const message = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    return next(new HttpError(400, message));
  }
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  next();
};
