const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getLocationRisk,
  getRouteRisk,
  getShipmentRouteRisks
} = require('../controllers/environmentalController');

// All environmental routes require authentication
router.use(protect);

// GET /api/environment/location
router.get('/location', getLocationRisk);

// GET /api/environment/route/:shipmentId
router.get('/route/:shipmentId', getShipmentRouteRisks);

// GET /api/environment/route/:shipmentId/:routeId
router.get('/route/:shipmentId/:routeId', getRouteRisk);

module.exports = router;
