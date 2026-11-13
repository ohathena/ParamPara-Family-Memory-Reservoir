const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// `v` is the user's tokenVersion when the token was made; auth middleware rejects tokens with an old version
const makeToken = (user) => jwt.sign({ id: user._id, v: user.tokenVersion || 0 }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

const randomToken = () => crypto.randomBytes(32).toString('hex');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

module.exports = { makeToken, verifyToken, randomToken, sha256 };
