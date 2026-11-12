const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  geocodeShipments,
  geocodeLocation
} = require('../controllers/geocodingController');

router.post('/shipments', protect, authorize('ADMIN'), geocodeShipments);
router.post('/location', protect, geocodeLocation);

module.exports = router;
