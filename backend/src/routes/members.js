const router = require('express').Router();
const validate = require('../middleware/validate');
const member = require('../controllers/memberController');
const rel = require('../controllers/relationshipController');
const v = require('../validators/family');

router.get('/:id', member.get);
router.patch('/:id', validate(v.updateMember), member.update);
router.delete('/:id', member.remove);
router.get('/:id/relationships', rel.listForMember);

module.exports = router;
