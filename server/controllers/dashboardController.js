const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private (Authenticated)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Fetch real-time statistics from database
    const [
      totalVehicles,
      activeVehicles,
      totalShipments,
      activeShipments,
      completedShipments,
      pendingShipments,
      delayedShipments,
      totalAlerts,
      activeAlerts,
      criticalAlerts
    ] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ currentStatus: { $in: ['AVAILABLE', 'IN_TRANSIT', 'ASSIGNED'] } }),
      Shipment.countDocuments(),
      Shipment.countDocuments({ status: 'IN_TRANSIT' }),
      Shipment.countDocuments({ status: 'DELIVERED' }),
      Shipment.countDocuments({ status: { $in: ['ROUTE_PENDING', 'ROUTE_SELECTED'] } }),
      Shipment.countDocuments({ status: 'DELAYED' }),
      Alert.countDocuments(),
      Alert.countDocuments({ status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } }),
      Alert.countDocuments({ status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] }, severity: 'CRITICAL' })
    ]);

    // Calculate risk areas (shipments at risk + active critical alerts)
    const atRiskShipments = await Shipment.countDocuments({ status: 'AT_RISK' });
    const highRiskAreas = atRiskShipments + criticalAlerts;

    res.status(200).json({
      success: true,
      data: {
        vehicles: {
          total: totalVehicles,
          active: activeVehicles,
          inactive: totalVehicles - activeVehicles
        },
        shipments: {
          total: totalShipments,
          active: activeShipments,
          completed: completedShipments,
          pending: pendingShipments,
          delayed: delayedShipments,
          atRisk: atRiskShipments
        },
        alerts: {
          total: totalAlerts,
          active: activeAlerts,
          critical: criticalAlerts
        },
        highRiskAreas,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching stats:', error);
    next(error);
  }
};

/**
 * @desc    Get active vehicles with GPS locations
 * @route   GET /api/dashboard/vehicles/active
 * @access  Private (Authenticated)
 */
exports.getActiveVehicles = async (req, res, next) => {
  try {
    const activeVehicles = await Vehicle.find({
      currentStatus: { $in: ['AVAILABLE', 'IN_TRANSIT', 'ASSIGNED'] }
    })
      .select('vehicleId registrationNumber currentStatus currentLocation fuelType')
      .sort({ updatedAt: -1 })
      .limit(100);

    const vehiclesWithGPS = activeVehicles.filter(v => 
      v.currentLocation && 
      v.currentLocation.latitude && 
      v.currentLocation.longitude
    );

    res.status(200).json({
      success: true,
      data: {
        vehicles: vehiclesWithGPS,
        count: vehiclesWithGPS.length,
        totalActive: activeVehicles.length
      }
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching active vehicles:', error);
    next(error);
  }
};

/**
 * @desc    Get recent incidents
 * @route   GET /api/dashboard/incidents/recent
 * @access  Private (Authenticated)
 */
exports.getRecentIncidents = async (req, res, next) => {
  try {
    const alerts = await Alert.find({
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title description severity status location createdAt');

    res.status(200).json({
      success: true,
      data: {
        incidents: alerts.map(alert => ({
          _id: alert._id,
          type: alert.title,
          location: alert.location?.region || alert.location?.address || 'Unknown',
          severity: alert.severity,
          status: alert.status,
          reportedAt: alert.createdAt,
          description: alert.description
        })),
        count: alerts.length
      }
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching incidents:', error);
    next(error);
  }
};

/**
 * @desc    Get weather summary
 * @route   GET /api/dashboard/weather/summary
 * @access  Private (Authenticated)
 */
exports.getWeatherSummary = async (req, res, next) => {
  try {
    const weatherService = require('../services/weatherService');
    
    const defaultLat = 26.1445;
    const defaultLon = 91.7362;
    
    const weather = await weatherService.getWeatherByCoordinates(defaultLat, defaultLon);
    
    if (!weather) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          message: 'Weather data unavailable'
        }
      });
    }

    let riskLevel = 'LOW';
    let riskIndicator = 'text-green-500';
    
    if (weather.rain > 20 || weather.windSpeed > 15) {
      riskLevel = 'HIGH';
      riskIndicator = 'text-red-500';
    } else if (weather.rain > 10 || weather.windSpeed > 10) {
      riskLevel = 'MEDIUM';
      riskIndicator = 'text-orange-500';
    }

    res.status(200).json({
      success: true,
      data: {
        available: true,
        temperature: Math.round(weather.temperature),
        condition: weather.main,
        description: weather.description,
        rainfall: weather.rain,
        windSpeed: weather.windSpeed,
        humidity: weather.humidity,
        riskLevel,
        riskIndicator,
        location: weather.locationName || 'Guwahati, Assam',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching weather:', error);
    res.status(200).json({
      success: true,
      data: {
        available: false,
        message: 'Weather service unavailable'
      }
    });
  }
};
