const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getOverview,
  getShipmentAnalytics,
  getDeliveryPerformance,
  getVehicleAnalytics,
  getRouteAnalytics,
  getAlertAnalytics
} = require('../controllers/analyticsController');

router.get('/overview', protect, getOverview);
router.get('/shipments', protect, getShipmentAnalytics);
router.get('/delivery-performance', protect, getDeliveryPerformance);
router.get('/vehicles', protect, getVehicleAnalytics);
router.get('/routes', protect, getRouteAnalytics);
router.get('/alerts', protect, getAlertAnalytics);

module.exports = router;
