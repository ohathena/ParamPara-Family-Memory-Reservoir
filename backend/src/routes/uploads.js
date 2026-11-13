const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const validate = require('../middleware/validate');
const { getFamilyForUser } = require('../services/accessService');
const { signUpload } = require('../services/uploadService');
const v = require('../validators/family');

// a signature is needed per photo; the limit stops one account from filling the Cloudinary quota
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, skip: () => env.isTest, keyGenerator: (req) => String(req.user._id) });

router.post('/signature', limiter, validate(v.uploadSignature), async (req, res) => {
  const family = await getFamilyForUser(req.body.family, req.user, { write: true });
  res.json({ success: true, ...signUpload(family._id) });
});

module.exports = router;
