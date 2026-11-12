const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getRecommendation } = require('../controllers/recommendationController');

// All recommendation routes require authentication
router.use(protect);

// GET /api/recommendations/shipment/:shipmentId
router.get('/shipment/:shipmentId', getRecommendation);

module.exports = router;
