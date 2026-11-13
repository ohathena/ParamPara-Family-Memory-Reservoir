const router = require('express').Router();
const validate = require('../middleware/validate');
const memory = require('../controllers/memoryController');
const v = require('../validators/memory');

router.post('/', validate(v.createMemory), memory.create);
router.get('/', validate(v.listMemories, 'query'), memory.list);
router.get('/:id', memory.get);
router.patch('/:id', validate(v.updateMemory), memory.update);
router.delete('/:id', memory.remove);

router.get('/:id/comments', memory.listComments);
router.post('/:id/comments', validate(v.createComment), memory.addComment);

module.exports = router;
