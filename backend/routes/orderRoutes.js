const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth);

router.post('/quote', requireRole('customer', 'admin'), orderController.quote);
router.post('/', requireRole('customer', 'admin'), orderController.create);
router.get('/', requireRole('customer', 'agent', 'admin'), orderController.list);
router.get('/:id', requireRole('customer', 'agent', 'admin'), orderController.getOne);
router.post('/:id/assign', requireRole('admin'), orderController.assign);
router.put('/:id/status', requireRole('agent', 'admin'), orderController.updateStatus);
router.post('/:id/reschedule', requireRole('customer', 'admin'), orderController.reschedule);

module.exports = router;
