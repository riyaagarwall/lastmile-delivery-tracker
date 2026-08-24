const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth);

router.post('/', requireRole('admin'), agentController.create);
router.get('/', requireRole('admin'), agentController.list);
router.get('/:id', requireRole('admin', 'agent'), agentController.getOne);
router.put('/:id', requireRole('admin', 'agent'), agentController.update);
router.delete('/:id', requireRole('admin'), agentController.remove);

module.exports = router;
