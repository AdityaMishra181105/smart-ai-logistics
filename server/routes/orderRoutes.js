const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} = require('../controllers/orderController');

// All routes require authentication
router.use(protect);

// Get all orders & Create order
router.route('/')
  .get(getOrders)
  .post(authorize('ADMIN', 'NGO'), createOrder);

// Get single order, update, or delete
router.route('/:id')
  .get(getOrderById)
  .put(authorize('ADMIN'), updateOrder)
  .patch(authorize('ADMIN'), updateOrder)
  .delete(authorize('ADMIN'), deleteOrder);

// Update status specifically
router.route('/:id/status')
  .patch(authorize('ADMIN'), updateOrderStatus);

module.exports = router;
