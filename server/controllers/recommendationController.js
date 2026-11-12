const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const { getShipmentRecommendation } = require('../services/recommendation/recommendationService');

// @desc    Get smart route recommendation for a shipment
// @route   GET /api/recommendations/shipment/:shipmentId
// @access  Private (ADMIN)
exports.getRecommendation = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    const recommendation = getShipmentRecommendation(shipment);

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    next(error);
  }
};
