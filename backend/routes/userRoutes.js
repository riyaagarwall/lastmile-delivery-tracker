const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth, requireRole('admin'));

router.get('/', userController.list);
router.get('/:id', userController.getOne);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

module.exports = router;
