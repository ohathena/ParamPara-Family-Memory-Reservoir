const router = require('express').Router();
const validate = require('../middleware/validate');
const rel = require('../controllers/relationshipController');
const v = require('../validators/family');

router.post('/', validate(v.createRelationship), rel.create);
router.patch('/:id', validate(v.updateRelationship), rel.update);
router.delete('/:id', rel.remove);

module.exports = router;
