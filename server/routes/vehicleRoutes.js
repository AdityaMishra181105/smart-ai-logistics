const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  updateVehicleStatus,
  assignShipment,
  getVehicleStats,
  deleteVehicle,
} = require('../controllers/vehicleController');

// All routes require authentication
router.use(protect);

// Get stats first to prevent parameter collisions
router.route('/stats')
  .get(getVehicleStats);

// General list query & create
router.route('/')
  .get(getVehicles)
  .post(authorize('ADMIN'), createVehicle);

// Single record inspection, update, and delete
router.route('/:id')
  .get(getVehicleById)
  .put(authorize('ADMIN'), updateVehicle)
  .patch(authorize('ADMIN'), updateVehicle)
  .delete(authorize('ADMIN'), deleteVehicle);

// Specific patches for status and assignments
router.route('/:id/status')
  .patch(authorize('ADMIN'), updateVehicleStatus);

router.route('/:id/assign-shipment')
  .patch(authorize('ADMIN'), assignShipment);

module.exports = router;
