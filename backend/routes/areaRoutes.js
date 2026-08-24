const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth, requireRole('admin'));

router.post('/', areaController.create);
router.get('/', areaController.list);
router.get('/:id', areaController.getOne);
router.put('/:id', areaController.update);
router.delete('/:id', areaController.remove);

module.exports = router;
