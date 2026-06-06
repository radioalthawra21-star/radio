const express = require('express');
const router = express.Router();
const { protect, generalManagerOnly } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/financialMiscController');

router.get('/', protect, generalManagerOnly, ctrl.getAll);
router.get('/:id', protect, generalManagerOnly, ctrl.getById);
router.post('/', protect, generalManagerOnly, ctrl.create);
router.post('/archive-month', protect, generalManagerOnly, ctrl.archiveMonth);
router.put('/:id', protect, generalManagerOnly, ctrl.update);
router.delete('/:id', protect, generalManagerOnly, ctrl.remove);

module.exports = router;
