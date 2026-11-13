const crypto = require('crypto');

// Gives every request an id, so a log line and a user's error report can be matched
module.exports = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
