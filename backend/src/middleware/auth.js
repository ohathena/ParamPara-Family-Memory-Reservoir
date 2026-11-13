const User = require('../models/User');
const { verifyToken } = require('../services/tokenService');

const deny = (res, message) => res.status(401).json({ success: false, message });

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return deny(res, 'Not logged in');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return deny(res, 'Invalid or expired token');
  }
  const user = await User.findById(payload.id); // database errors go to the error handler (500), not a fake 401
  if (!user) return deny(res, 'User no longer exists');
  // password changed or "log out everywhere" used after this token was made
  if ((payload.v || 0) !== (user.tokenVersion || 0)) return deny(res, 'Session ended, please log in again');
  req.user = user;
  next();
};
