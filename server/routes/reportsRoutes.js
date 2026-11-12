const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getOverviewReport,
  getShipmentReport,
  getOrderReport,
  getVehicleReport,
  getRouteReport,
  getAlertReport,
  getDriverReport,
  getNgoReport
} = require('../controllers/reportsController');

router.get('/driver', protect, getDriverReport);
router.get('/ngo', protect, getNgoReport);
router.get('/overview', protect, getOverviewReport);
router.get('/shipments', protect, getShipmentReport);
router.get('/orders', protect, getOrderReport);
router.get('/vehicles', protect, getVehicleReport);
router.get('/routes', protect, getRouteReport);
router.get('/alerts', protect, getAlertReport);

module.exports = router;
