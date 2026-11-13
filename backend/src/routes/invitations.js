const router = require('express').Router();
const family = require('../controllers/familyController');

router.get('/:token', family.previewInvitation);
router.post('/:token/accept', family.acceptInvitation);

module.exports = router;
