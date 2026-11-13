const router = require('express').Router();
const auth = require('../middleware/auth');
const authC = require('../controllers/authController');
const familyC = require('../controllers/familyController');
const memberC = require('../controllers/memberController');
const relC = require('../controllers/relationshipController');
const memoryC = require('../controllers/memoryController');

// auth
router.post('/auth/register', authC.register);
router.post('/auth/login', authC.login);
router.get('/auth/me', auth, authC.me);

// everything below needs a logged-in user
router.use(auth);

// families
router.post('/families', familyC.create);
router.get('/families', familyC.list);
router.get('/families/:id', familyC.get);
router.patch('/families/:id', familyC.update);
router.delete('/families/:id', familyC.remove);
router.post('/families/:id/collaborators', familyC.addCollaborator);
router.delete('/families/:id/collaborators/:userId', familyC.removeCollaborator);

// members
router.post('/families/:id/members', memberC.create);
router.get('/families/:id/members', memberC.listForFamily);
router.get('/members/:id', memberC.get);
router.patch('/members/:id', memberC.update);
router.delete('/members/:id', memberC.remove);

// relationships
router.post('/relationships', relC.create);
router.get('/members/:id/relationships', relC.listForMember);
router.patch('/relationships/:id', relC.update);
router.delete('/relationships/:id', relC.remove);

// memories
router.post('/memories', memoryC.create);
router.get('/memories', memoryC.list);
router.get('/memories/:id', memoryC.get);
router.patch('/memories/:id', memoryC.update);
router.delete('/memories/:id', memoryC.remove);

module.exports = router;
