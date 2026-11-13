const router = require('express').Router();
const memory = require('../controllers/memoryController');

router.delete('/:id', memory.deleteComment);

module.exports = router;
