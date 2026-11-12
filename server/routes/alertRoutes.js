const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  updateAlertStatus,
  updateAlertSeverity,
  assignAlert,
  getAlertHistory,
  deleteAlert,
  getDynamicShipmentAlerts,
  getAlertStats,
} = require('../controllers/alertController');

router.use(protect);

router.get('/stats', getAlertStats);
router.get('/shipment/:shipmentId', getDynamicShipmentAlerts);

router.route('/')
  .get(getAlerts)
  .post(authorize('ADMIN'), createAlert);

router.route('/:id')
  .get(getAlertById)
  .put(authorize('ADMIN'), updateAlert)
  .delete(authorize('ADMIN'), deleteAlert);

router.patch('/:id/status', updateAlertStatus);
router.patch('/:id/severity', authorize('ADMIN'), updateAlertSeverity);
router.patch('/:id/assign', authorize('ADMIN'), assignAlert);
router.get('/:id/history', getAlertHistory);

module.exports = router;
