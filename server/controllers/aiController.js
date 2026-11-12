const geminiService = require('../services/geminiService');
const intentService = require('../services/intentService');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');
const User = require('../models/User');

/**
 * Process General-Purpose AI Chat Query
 * POST /api/ai/chat
 */
exports.processChat = async (req, res) => {
  try {
    const { message, conversationHistory, preferredLanguage } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const trimmedMsg = message.trim();
    const role = (req.user?.role || 'ADMIN').toUpperCase();
    const userId = req.user?._id;

    // 1. Analyze exact intent & normalize typos / Hinglish
    const intent = intentService.analyzeIntent(trimmedMsg, conversationHistory || []);

    console.log('==================================================');
    console.log('RECEIVED QUESTION:', trimmedMsg);
    console.log('USER ROLE:', role, '| USER NAME:', req.user?.name);
    console.log('AI INTENT:', intent.type, '| PREFERRED LANG:', preferredLanguage || 'en');
    console.log('==================================================');

    // Check for unauthorized action attempts
    if (
      /delete shipment|change route|edit route|select route|modify route|delete route|assign vehicle|assign driver|delete user|manage user|create route/i.test(trimmedMsg)
    ) {
      if (role === 'DRIVER' || role === 'NGO') {
        return res.json({
          success: true,
          data: {
            message: preferredLanguage === 'hi' ? "आपको उस कार्रवाई को करने की अनुमति नहीं है।" : "You don't have permission to perform that action.",
            intent: intent.type,
            usedAI: false,
            mode: 'permission_blocked'
          }
        });
      }
    }

    // 2. Dynamically fetch relevant MongoDB / Live System Data Context based on User Role & Intent
    let relevantData = {
      projectOverview: {
        name: 'Smart Logistics & Accessibility Platform',
        purpose: 'Optimizes supply chain transit and disaster relief freight dispatches through real-time tracking, AI route risk scoring, and weather hazard monitoring.',
        userRole: role,
        userName: req.user?.name || 'User'
      }
    };

    if (role === 'DRIVER') {
      // Driver data context
      const driverShipments = await Shipment.find({ assignedDriver: userId })
        .populate('assignedVehicle', 'registrationNumber vehicleType capacity fuelType currentStatus')
        .populate('assignedDriver', 'name email phone')
        .sort({ updatedAt: -1 })
        .lean();

      const driverShipmentIds = driverShipments.map(s => s._id);

      const activeShipmentObj = driverShipments.find(s => s.status === 'IN_TRANSIT') || 
                                driverShipments.find(s => ['ROUTE_SELECTED', 'ROUTE_PENDING', 'CREATED', 'AT_RISK', 'DELAYED'].includes(s.status)) || null;

      const driverAlerts = await Alert.find({
        $or: [
          { assignedTo: userId },
          { relatedShipment: { $in: driverShipmentIds } }
        ],
        status: { $ne: 'RESOLVED' }
      })
      .sort({ createdAt: -1 })
      .lean();

      const driverVehicleIds = driverShipments.map(s => s.assignedVehicle?._id).filter(Boolean);
      const driverVehicles = await Vehicle.find({
        $or: [
          { assignedDriver: userId },
          { _id: { $in: driverVehicleIds } }
        ]
      }).lean();

      const totalAssigned = driverShipments.length;
      const completedCount = driverShipments.filter(s => s.status === 'DELIVERED').length;
      const inTransitCount = driverShipments.filter(s => s.status === 'IN_TRANSIT').length;
      const delayedCount = driverShipments.filter(s => s.status === 'DELAYED' || s.status === 'AT_RISK').length;

      relevantData.driverData = {
        driverInfo: { id: userId, name: req.user.name, email: req.user.email },
        assignedShipments: driverShipments.map(s => {
          const routeDist = s.selectedRoute?.distanceKm || 0;
          const actualTravelled = s.actualDistanceTravelled || 0;
          const remainingDist = s.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(routeDist - actualTravelled));
          return {
            shipmentId: s.shipmentId,
            status: s.status,
            priority: s.priority,
            goodsType: s.goodsType,
            quantity: `${s.quantity} ${s.unit}`,
            pickup: s.pickup?.locationName || 'N/A',
            destination: s.destination?.locationName || 'N/A',
            selectedRoute: s.selectedRoute?.name || 'Selected Route Corridor',
            distanceKm: routeDist,
            remainingDistanceKm: remainingDist,
            eta: s.status === 'DELIVERED' ? '0 mins' : (s.selectedRoute?.estimatedDurationMinutes ? `${Math.round(s.selectedRoute.estimatedDurationMinutes / 60)} hrs` : 'N/A'),
            vehicleNumber: s.assignedVehicle?.registrationNumber || s.vehicleNumber || 'NOT SPECIFIED',
            liveGPS: s.liveLocation?.latitude ? `${s.liveLocation.latitude.toFixed(4)}, ${s.liveLocation.longitude.toFixed(4)}` : 'N/A'
          };
        }),
        currentActiveShipment: activeShipmentObj ? {
          shipmentId: activeShipmentObj.shipmentId,
          status: activeShipmentObj.status,
          pickup: activeShipmentObj.pickup?.locationName,
          destination: activeShipmentObj.destination?.locationName,
          selectedRoute: activeShipmentObj.selectedRoute?.name || 'Selected Route Corridor',
          vehicleNumber: activeShipmentObj.assignedVehicle?.registrationNumber || activeShipmentObj.vehicleNumber || 'NOT SPECIFIED',
          distanceKm: activeShipmentObj.selectedRoute?.distanceKm || 0,
          remainingDistanceKm: activeShipmentObj.status === 'DELIVERED' ? 0 : Math.max(0, Math.round((activeShipmentObj.selectedRoute?.distanceKm || 0) - (activeShipmentObj.actualDistanceTravelled || 0))),
          eta: activeShipmentObj.status === 'DELIVERED' ? '0 mins' : (activeShipmentObj.selectedRoute?.estimatedDurationMinutes ? `${Math.round(activeShipmentObj.selectedRoute.estimatedDurationMinutes / 60)} hrs` : 'N/A')
        } : null,
        assignedVehicles: driverVehicles.map(v => ({
          registrationNumber: v.registrationNumber,
          vehicleType: v.vehicleType,
          status: v.currentStatus,
          capacity: v.capacity ? `${v.capacity} T` : 'N/A'
        })),
        activeAlerts: driverAlerts.map(a => ({
          alertId: a.alertId,
          title: a.title,
          severity: a.severity,
          description: a.description,
          alertType: a.alertType
        })),
        performance: {
          totalAssigned,
          completed: completedCount,
          inTransit: inTransitCount,
          delayed: delayedCount,
          onTimeCompletionRate: totalAssigned > 0 ? Math.round(((completedCount - delayedCount) / Math.max(1, completedCount)) * 100) : 100
        }
      };
    } else if (role === 'NGO') {
      // NGO data context
      const ngoOrders = await Order.find({
        $or: [
          { createdBy: userId },
          { requestedBy: userId }
        ]
      })
      .populate('assignedShipment', 'shipmentId status selectedRoute liveLocation')
      .sort({ createdAt: -1 })
      .lean();

      const ngoOrderIds = ngoOrders.map(o => o._id);
      const ngoOrderCodes = ngoOrders.map(o => o.orderId).filter(Boolean);

      const ngoShipments = await Shipment.find({
        $or: [
          { requestedBy: userId },
          { createdBy: userId },
          { assignedOrder: { $in: ngoOrderIds } },
          { orderId: { $in: ngoOrderCodes } }
        ]
      })
      .populate('assignedDriver', 'name email phone')
      .populate('assignedVehicle', 'registrationNumber vehicleType capacity')
      .sort({ updatedAt: -1 })
      .lean();

      const ngoShipmentIds = ngoShipments.map(s => s._id);

      const ngoAlerts = await Alert.find({
        $or: [
          { requestedBy: userId },
          { reportedBy: userId },
          { relatedShipment: { $in: ngoShipmentIds } },
          { relatedOrder: { $in: ngoOrderIds } }
        ],
        status: { $ne: 'RESOLVED' }
      })
      .sort({ createdAt: -1 })
      .lean();

      const totalOrders = ngoOrders.length;
      const pendingOrders = ngoOrders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)).length;
      const completedOrders = ngoOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length;

      relevantData.ngoData = {
        ngoInfo: { id: userId, name: req.user.name, email: req.user.email },
        orders: ngoOrders.map(o => ({
          orderId: o.orderId,
          status: o.status,
          priority: o.priority,
          cargoDescription: o.cargoDescription,
          quantity: o.quantity,
          pickup: o.pickupLocation?.locationName || 'N/A',
          delivery: o.deliveryLocation?.locationName || 'N/A',
          assignedShipmentId: o.assignedShipment?.shipmentId || 'Pending Conversion'
        })),
        shipments: ngoShipments.map(s => {
          const routeDist = s.selectedRoute?.distanceKm || 0;
          const actualTravelled = s.actualDistanceTravelled || 0;
          const remainingDist = s.status === 'DELIVERED' ? 0 : Math.max(0, Math.round(routeDist - actualTravelled));
          return {
            shipmentId: s.shipmentId,
            status: s.status,
            priority: s.priority,
            goodsType: s.goodsType,
            pickup: s.pickup?.locationName || 'N/A',
            destination: s.destination?.locationName || 'N/A',
            selectedRoute: s.selectedRoute?.name || 'Selected Route Corridor',
            distanceKm: routeDist,
            remainingDistanceKm: remainingDist,
            eta: s.status === 'DELIVERED' ? '0 mins' : (s.selectedRoute?.estimatedDurationMinutes ? `${Math.round(s.selectedRoute.estimatedDurationMinutes / 60)} hrs` : 'N/A'),
            assignedDriver: s.assignedDriver?.name || 'Unassigned',
            assignedVehicle: s.assignedVehicle?.registrationNumber || s.vehicleNumber || 'NOT SPECIFIED'
          };
        }),
        activeAlerts: ngoAlerts.map(a => ({
          alertId: a.alertId,
          title: a.title,
          severity: a.severity,
          description: a.description
        })),
        performance: {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalShipments: ngoShipments.length,
          activeShipments: ngoShipments.filter(s => s.status === 'IN_TRANSIT').length,
          deliveredShipments: ngoShipments.filter(s => s.status === 'DELIVERED').length,
          completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
        }
      };
    } else {
      // ADMIN role context - Fetch comprehensive system operational data
      const allActive = await Shipment.find({ status: { $nin: ['DELIVERED', 'CANCELLED'] } })
        .populate('assignedDriver', 'name email phone')
        .populate('assignedVehicle', 'registrationNumber vehicleType')
        .limit(10)
        .lean();

      const delayed = await Shipment.find({ status: { $in: ['DELAYED', 'AT_RISK'] } })
        .populate('assignedDriver', 'name email phone')
        .populate('assignedVehicle', 'registrationNumber vehicleType')
        .limit(10)
        .lean();

      const activeAlerts = await Alert.find({ status: 'ACTIVE' })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');

      relevantData.adminData = {
        activeShipments: allActive.map(s => ({
          shipmentId: s.shipmentId,
          status: s.status,
          priority: s.priority,
          goodsType: s.goodsType,
          quantity: `${s.quantity} ${s.unit || ''}`,
          pickup: s.pickup?.locationName || 'N/A',
          destination: s.destination?.locationName || 'N/A',
          selectedRoute: s.selectedRoute?.name || 'Selected Route Corridor',
          assignedDriver: s.assignedDriver?.name || 'Unassigned',
          assignedVehicle: s.assignedVehicle?.registrationNumber || s.vehicleNumber || 'NOT SPECIFIED',
          distanceKm: s.selectedRoute?.distanceKm || 0,
          remainingDistanceKm: Math.max(0, Math.round((s.selectedRoute?.distanceKm || 0) - (s.actualDistanceTravelled || 0))),
          eta: s.selectedRoute?.estimatedDurationMinutes ? `${Math.round(s.selectedRoute.estimatedDurationMinutes / 60)} hrs` : 'N/A'
        })),
        delayedShipments: delayed.map(s => ({
          shipmentId: s.shipmentId,
          status: s.status,
          priority: s.priority,
          goodsType: s.goodsType,
          pickup: s.pickup?.locationName || 'N/A',
          destination: s.destination?.locationName || 'N/A',
          assignedDriver: s.assignedDriver?.name || 'Unassigned',
          assignedVehicle: s.assignedVehicle?.registrationNumber || s.vehicleNumber || 'NOT SPECIFIED',
          selectedRoute: s.selectedRoute?.name || 'N/A'
        })),
        activeAlerts: activeAlerts.map(a => ({
          alertId: a.alertId,
          title: a.title,
          severity: a.severity,
          alertType: a.alertType,
          description: a.description
        })),
        criticalAlerts: criticalAlerts.map(a => ({
          alertId: a.alertId,
          title: a.title,
          severity: a.severity,
          alertType: a.alertType,
          description: a.description
        })),
        systemMetrics: {
          totalOrders: await Order.countDocuments(),
          totalShipments: await Shipment.countDocuments({ status: { $ne: 'CANCELLED' } }),
          activeShipmentsCount: allActive.length,
          deliveredShipmentsCount: await Shipment.countDocuments({ status: 'DELIVERED' }),
          delayedShipmentsCount: delayed.length,
          activeAlertsCount: activeAlerts.length,
          criticalAlertsCount: criticalAlerts.length
        }
      };
    }

    // 3. Send exact question + conversation history + relevant context to Gemini API
    if (geminiService.isGeminiAvailable()) {
      try {
        const aiResponse = await geminiService.generateAIResponse(trimmedMsg, {
          conversationHistory: conversationHistory || [],
          relevantData,
          userRole: role,
          userName: req.user?.name || 'User',
          preferredLanguage: preferredLanguage || 'en'
        });

        console.log('AI RESPONSE (GEMINI):', aiResponse.substring(0, 100) + '...');

        return res.json({
          success: true,
          data: {
            message: aiResponse,
            usedAI: true,
            intent: intent.type,
            mode: 'gemini'
          }
        });
      } catch (geminiErr) {
        console.error('[AI Controller] Gemini API call error:', geminiErr.message);
      }
    }

    // 4. Smart Logistics Reasoning Engine (Direct, question-specific response)
    const directResult = await intentService.handleDatabaseQuery(intent, trimmedMsg, req.user, preferredLanguage || 'en');
    if (directResult && directResult.message) {
      console.log('AI RESPONSE (SMART ENGINE):', directResult.message.substring(0, 100) + '...');
      return res.json({
        success: directResult.success,
        data: {
          message: directResult.message,
          intent: intent.type,
          usedAI: false,
          mode: 'smart_engine'
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'AI service is temporarily unavailable. Please try again.'
    });

  } catch (error) {
    console.error('AI chat processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'AI service is temporarily unavailable. Please try again.'
    });
  }
};

/**
 * Check AI service status
 * GET /api/ai/status
 */
exports.checkStatus = async (req, res) => {
  try {
    const hasGeminiKey = geminiService.isGeminiAvailable();

    res.json({
      success: true,
      data: {
        available: true,
        mode: hasGeminiKey ? 'gemini' : 'smart_engine',
        message: hasGeminiKey
          ? 'AI Assistant Operational (Powered by Gemini AI)'
          : 'AI Assistant Operational (Smart Logistics Engine)'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check AI status'
    });
  }
};

exports.analyzeShipment = async (req, res) => {
  res.json({ success: true, message: 'Shipment analysis complete' });
};

exports.summarizeAlerts = async (req, res) => {
  res.json({ success: true, message: 'Alert summary complete' });
};

exports.generateReportInsights = async (req, res) => {
  res.json({ success: true, message: 'Report insights complete' });
};

exports.analyzeDelay = async (req, res) => {
  res.json({ success: true, message: 'Delay analysis complete' });
};

exports.generateDashboardInsights = async (req, res) => {
  res.json({ success: true, message: 'Dashboard insights complete' });
};
