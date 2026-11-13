const router = require('express').Router();
const validate = require('../middleware/validate');
const family = require('../controllers/familyController');
const member = require('../controllers/memberController');
const v = require('../validators/family');

router.post('/', validate(v.createFamily), family.create);
router.get('/', family.list);
router.get('/:id', family.get);
router.patch('/:id', validate(v.updateFamily), family.update);
router.delete('/:id', family.remove);
router.delete('/:id/leave', family.leave);

// people with access: editors and viewers
router.post('/:id/collaborators', validate(v.addCollaborator), family.addCollaborator);
router.patch('/:id/collaborators/:userId', validate(v.changeRole), family.changeRole);
router.delete('/:id/collaborators/:userId', family.removeCollaborator);
router.post('/:id/invitations', validate(v.createInvitation), family.createInvitation);

router.post('/:id/members', validate(v.createMember), member.create);
router.get('/:id/members', member.listForFamily);

router.get('/:id/stats', family.stats);
router.get('/:id/relationships', family.relationships);
router.get('/:id/tree', family.tree);
router.get('/:id/timeline', validate(v.timelineQuery, 'query'), family.timeline);
router.get('/:id/activity', validate(v.activityQuery, 'query'), family.activity);
router.get('/:id/export', family.exportArchive);

module.exports = router;
