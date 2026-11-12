const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createRoute,
  getRoutes,
  getDriverRoutes,
  getRouteById,
  updateRoute,
  updateRouteStatus,
  assignVehicle,
  addShipment,
  removeShipment,
  getRouteStats,
  deleteRoute,
} = require('../controllers/routeMgmtController');

// Route Intelligence Controller
const {
  analyzeRoute,
  getRouteAlternatives,
  selectRouteAlternative,
  getRouteRisk,
} = require('../controllers/routeIntelligenceController');

// All routes require authentication
router.use(protect);

// Driver route query endpoint
router.get('/driver', getDriverRoutes);

// Stats first to prevent param collision
router.route('/stats')
  .get(getRouteStats);

// List query and create
router.route('/')
  .get(getRoutes)
  .post(authorize('ADMIN'), createRoute);

// Single record inspection, update, and deletion
router.route('/:id')
  .get(getRouteById)
  .put(authorize('ADMIN'), updateRoute)
  .patch(authorize('ADMIN'), updateRoute)
  .delete(authorize('ADMIN'), deleteRoute);

// Status changes
router.route('/:id/status')
  .patch(authorize('ADMIN'), updateRouteStatus);

// Shipments updates
router.route('/:id/shipments')
  .post(authorize('ADMIN'), addShipment);

router.route('/:id/shipments/:shipmentId')
  .delete(authorize('ADMIN'), removeShipment);

// Assignments
router.route('/:id/assign-vehicle')
  .post(authorize('ADMIN'), assignVehicle);

// AI Route Intelligence endpoints
router.route('/:id/analyze')
  .post(authorize('ADMIN'), analyzeRoute);

router.route('/:id/alternatives')
  .get(authorize('ADMIN'), getRouteAlternatives);

router.route('/:id/select')
  .post(authorize('ADMIN'), selectRouteAlternative);

router.route('/:id/risk')
  .get(getRouteRisk);

module.exports = router;
