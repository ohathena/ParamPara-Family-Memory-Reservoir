const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HttpError } = require('../middleware/error');

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });
const isEmail = (s) => typeof s === 'string' && /^\S+@\S+\.\S+$/.test(s);

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || typeof name !== 'string') throw new HttpError(400, 'Name is required');
  if (!isEmail(email)) throw new HttpError(400, 'A valid email is required');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) throw new HttpError(409, 'Email already registered');

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash });
  res.status(201).json({ success: true, token: makeToken(user._id), user: publicUser(user) });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') throw new HttpError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw new HttpError(401, 'Invalid email or password'); // same message for both cases

  res.json({ success: true, token: makeToken(user._id), user: publicUser(user) });
};

exports.me = async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
};
