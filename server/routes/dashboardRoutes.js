const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getActiveVehicles,
  getRecentIncidents,
  getWeatherSummary,
} = require('../controllers/dashboardController');

// All routes require authentication
router.use(protect);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// Active vehicles with GPS
router.get('/vehicles/active', getActiveVehicles);

// Recent incidents
router.get('/incidents/recent', getRecentIncidents);

// Weather summary
router.get('/weather/summary', getWeatherSummary);

module.exports = router;
