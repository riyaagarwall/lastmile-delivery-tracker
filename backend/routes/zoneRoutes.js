const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth, requireRole('admin'));

router.post('/', zoneController.create);
router.get('/', zoneController.list);
router.get('/:id', zoneController.getOne);
router.put('/:id', zoneController.update);
router.delete('/:id', zoneController.remove);

module.exports = router;
