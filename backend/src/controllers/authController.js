const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const { HttpError } = require('../middleware/error');
const { makeToken, randomToken, sha256 } = require('../services/tokenService');
const { sendPasswordReset } = require('../services/emailService');
const { removeUserEverywhere } = require('../services/familyService');
const { withTransaction } = require('../utils/transaction');

const ROUNDS = 10;
const RESET_MINUTES = 30;
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, createdAt: u.createdAt });
const session = (user) => ({ success: true, token: makeToken(user), user: publicUser(user) });
// compared against when the email does not exist, so response time does not reveal which emails are registered
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new HttpError(409, 'Email already registered');

  const user = await User.create({ name, email, password: await bcrypt.hash(password, ROUNDS), lastLoginAt: new Date() });
  res.status(201).json(session(user));
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password'); // same message for both cases

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
  res.json(session(user));
};

exports.me = async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
};

exports.updateMe = async (req, res) => {
  req.user.name = req.body.name;
  await req.user.save();
  res.json({ success: true, user: publicUser(req.user) });
};

// Changing the password ends every other session. This device gets a fresh token so it stays logged in.
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(currentPassword, user.password))) throw new HttpError(400, 'Current password is incorrect');
  user.password = await bcrypt.hash(newPassword, ROUNDS);
  user.tokenVersion += 1;
  await user.save();
  res.json({ success: true, message: 'Password changed. Other devices were logged out.', token: makeToken(user) });
};

exports.logoutAll = async (req, res) => {
  req.user.tokenVersion += 1;
  await req.user.save();
  res.json({ success: true, message: 'Logged out on all other devices', token: makeToken(req.user) });
};

// Always answers the same way, so nobody can use this to find out which emails have accounts
exports.forgotPassword = async (req, res) => {
  if (!env.email.enabled && env.isProd) throw new HttpError(503, 'Password reset by email is not set up on this server');
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const token = randomToken();
    await User.updateOne({ _id: user._id }, { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_MINUTES * 60 * 1000) });
    try {
      await sendPasswordReset(user, `${env.appUrl}/reset-password/${token}`);
    } catch (err) {
      console.error(`[${req.id}] reset email failed:`, err.message); // still answer the same, details stay in the log
    }
  }
  res.json({ success: true, message: 'If that email has an account, a reset link is on its way. Check your inbox (and spam).' });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  // find + clear in one atomic step, so a link cannot be used twice
  const user = await User.findOneAndUpdate(
    { resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } },
    { $set: { resetTokenHash: null, resetTokenExpires: null } },
    { returnDocument: 'after' }
  );
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired. Ask for a new one.');
  user.password = await bcrypt.hash(password, ROUNDS);
  user.tokenVersion += 1; // log out everywhere, the old password may be known to someone else
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ ...session(user), message: 'Password updated, you are logged in' });
};

// Deletes the account: families you own are deleted, you leave the others. Needs your password.
exports.deleteMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(req.body.password, user.password))) throw new HttpError(400, 'Password is incorrect');
  const result = await removeUserEverywhere(user);
  await withTransaction((s) => User.deleteOne({ _id: user._id }, { session: s }));
  res.json({ success: true, message: 'Your account was deleted', ...result });
};
