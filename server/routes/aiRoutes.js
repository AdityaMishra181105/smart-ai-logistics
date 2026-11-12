const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

/**
 * AI Routes
 */

// Check AI service status
router.get('/status', aiController.checkStatus);

// AI Chat
router.post('/chat', protect, aiController.processChat);

// Shipment Analysis
router.post('/analyze-shipment/:id', protect, aiController.analyzeShipment);

// Delay Analysis
router.post('/analyze-delay/:id', protect, aiController.analyzeDelay);

// Alert Summarization
router.post('/summarize-alerts', protect, aiController.summarizeAlerts);

// Report Insights
router.post('/report-insights', protect, aiController.generateReportInsights);

// Dashboard Insights
router.post('/dashboard-insights', protect, aiController.generateDashboardInsights);

module.exports = router;
