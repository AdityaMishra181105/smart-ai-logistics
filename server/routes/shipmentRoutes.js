const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createShipment,
  createShipmentFromOrder,
  getShipments,
  getMyAssignedShipments,
  getShipmentById,
  updateShipmentStatus,
  updateShipment,
  assignDriver,
  deleteShipment
} = require('../controllers/shipmentController');

// All routes require authentication
router.use(protect);

// Get shipments assigned to logged in driver
router.get('/my-assigned', authorize('DRIVER', 'ADMIN'), getMyAssignedShipments);

// Create shipment from existing order
router.post('/from-order/:orderId', authorize('ADMIN'), createShipmentFromOrder);

// Assign driver
router.patch('/:id/assign-driver', authorize('ADMIN'), assignDriver);

// Get all shipments & Create shipment
router.route('/')
  .get(getShipments)
  .post(authorize('ADMIN'), createShipment);

// Get single shipment, update details, or delete
router.route('/:id')
  .get(getShipmentById)
  .patch(authorize('ADMIN'), updateShipment)
  .put(authorize('ADMIN'), updateShipment)
  .delete(authorize('ADMIN'), deleteShipment);

// Update status (Admin or Driver)
router.route('/:id/status')
  .patch(authorize('ADMIN', 'DRIVER'), updateShipmentStatus);

// Nested Route Analysis alternatives
const routeRoutes = require('./routeRoutes');
router.use('/:id/routes', routeRoutes);

module.exports = router;
