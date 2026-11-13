const router = require('express').Router();
const env = require('../config/env');
const auth = require('../middleware/auth');

router.use('/auth', require('./auth'));

// public: tells the frontend which optional features this server has turned on
router.get('/config', (req, res) => {
  res.json({
    success: true,
    features: { email: env.email.enabled || !env.isProd, uploads: env.cloudinary.enabled },
  });
});

// everything below needs a logged-in user
router.use(auth);
router.use('/families', require('./families'));
router.use('/members', require('./members'));
router.use('/relationships', require('./relationships'));
router.use('/memories', require('./memories'));
router.use('/comments', require('./comments'));
router.use('/invitations', require('./invitations'));
router.use('/uploads', require('./uploads'));

module.exports = router;
