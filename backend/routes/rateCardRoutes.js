const express = require('express');
const router = express.Router();
const rateCardController = require('../controllers/rateCardController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth, requireRole('admin'));

router.post('/', rateCardController.create);
router.get('/', rateCardController.list);
router.get('/:id', rateCardController.getOne);
router.put('/:id', rateCardController.update);
router.delete('/:id', rateCardController.remove);

module.exports = router;
