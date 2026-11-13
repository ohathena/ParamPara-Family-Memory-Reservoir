const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const c = require('../controllers/authController');
const v = require('../validators/auth');

const limiter = (limit, windowMs) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, skip: () => env.isTest, message: { success: false, message: 'Too many attempts, try again later' } });

const HOUR = 60 * 60 * 1000;
const QUARTER = 15 * 60 * 1000;

router.post('/register', limiter(20, HOUR), validate(v.register), c.register);
router.post('/login', limiter(20, QUARTER), validate(v.login), c.login);
router.post('/forgot-password', limiter(5, HOUR), validate(v.forgotPassword), c.forgotPassword);
router.post('/reset-password', limiter(10, HOUR), validate(v.resetPassword), c.resetPassword);

router.get('/me', auth, c.me);
router.patch('/me', auth, validate(v.updateMe), c.updateMe);
router.delete('/me', auth, limiter(5, QUARTER), validate(v.deleteMe), c.deleteMe);
router.post('/change-password', auth, limiter(10, QUARTER), validate(v.changePassword), c.changePassword);
router.post('/logout-all', auth, c.logoutAll);

module.exports = router;
