const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  generateRoutes,
  getRoutes,
  selectRoute
} = require('../controllers/routeController');

router.use(protect);

router.post('/generate', authorize('ADMIN'), generateRoutes);
router.get('/', getRoutes);
router.patch('/:routeId/select', authorize('ADMIN'), selectRoute);

module.exports = router;
