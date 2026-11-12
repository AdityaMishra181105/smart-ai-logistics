const Shipment = require('../models/Shipment');
const { geocodeLocation } = require('../services/geocodingService');
const { analyzeRouteIntelligence } = require('../services/aiRouteService');

// Helper to resolve coordinates & persist to shipment document
const resolveAndSaveCoordinates = async (shipment) => {
  let modified = false;

  // Resolve Pickup
  if (!shipment.pickup.latitude || !shipment.pickup.longitude) {
    const pickupCoords = await geocodeLocation(shipment.pickup.locationName, shipment.pickup.address);
    if (pickupCoords) {
      shipment.pickup.latitude = pickupCoords.latitude;
      shipment.pickup.longitude = pickupCoords.longitude;
      modified = true;
    }
  }

  // Resolve Destination
  if (!shipment.destination.latitude || !shipment.destination.longitude) {
    const destCoords = await geocodeLocation(shipment.destination.locationName, shipment.destination.address);
    if (destCoords) {
      shipment.destination.latitude = destCoords.latitude;
      shipment.destination.longitude = destCoords.longitude;
      modified = true;
    }
  }

  if (modified) {
    await shipment.save();
    console.log(`[routeController] Saved resolved coordinates to Shipment ${shipment.shipmentId}`);
  }

  return {
    pickup: shipment.pickup.latitude && shipment.pickup.longitude ? [shipment.pickup.latitude, shipment.pickup.longitude] : null,
    destination: shipment.destination.latitude && shipment.destination.longitude ? [shipment.destination.latitude, shipment.destination.longitude] : null
  };
};

// @desc    Generate real route alternatives for a shipment
// @route   POST /api/shipments/:id/routes/generate
// @access  Private (ADMIN)
exports.generateRoutes = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    // Resolve coordinates at root level
    const { pickup, destination } = await resolveAndSaveCoordinates(shipment);

    if (!pickup) {
      return res.status(400).json({
        success: false,
        message: `Unable to locate pickup address "${shipment.pickup.locationName}". Please verify the address.`,
      });
    }

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: `Unable to locate destination address "${shipment.destination.locationName}". Please verify the address.`,
      });
    }

    const originObj = {
      locationName: shipment.pickup.locationName,
      address: shipment.pickup.address || '',
      latitude: pickup[0],
      longitude: pickup[1]
    };

    const destObj = {
      locationName: shipment.destination.locationName,
      address: shipment.destination.address || '',
      latitude: destination[0],
      longitude: destination[1]
    };

    const context = {
      shipmentType: shipment.goodsType,
      priority: shipment.priority,
      vehicleNumber: shipment.vehicleNumber
    };

    const intelligence = await analyzeRouteIntelligence(originObj, destObj, context);

    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: 'ROUTES_GENERATED',
        module: 'ROUTES',
        referenceId: shipment.shipmentId,
        description: `Generated and analyzed ${intelligence.routes?.length || 0} route alternatives for Shipment ${shipment.shipmentId}`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[routeController] generateRoutes audit error:', audErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Real route alternatives generated and analyzed successfully',
      data: {
        shipmentId: req.params.id,
        analysis: intelligence,
        routes: intelligence.routes
      },
    });
  } catch (error) {
    console.error('[routeController] generateRoutes error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Live route service temporarily unavailable.'
    });
  }
};

// @desc    Get generated routes for a shipment
// @route   GET /api/shipments/:id/routes
// @access  Private (ADMIN)
exports.getRoutes = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    const { pickup, destination } = await resolveAndSaveCoordinates(shipment);

    if (!pickup || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Pickup or destination coordinates could not be resolved.',
      });
    }

    const originObj = {
      locationName: shipment.pickup.locationName,
      address: shipment.pickup.address || '',
      latitude: pickup[0],
      longitude: pickup[1]
    };

    const destObj = {
      locationName: shipment.destination.locationName,
      address: shipment.destination.address || '',
      latitude: destination[0],
      longitude: destination[1]
    };

    const intelligence = await analyzeRouteIntelligence(originObj, destObj, {
      shipmentType: shipment.goodsType,
      priority: shipment.priority
    });

    res.status(200).json({
      success: true,
      data: {
        shipmentId: req.params.id,
        routes: intelligence.routes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Select a route for a shipment (Admin Confirmation)
// @route   PATCH /api/shipments/:id/routes/:routeId/select
// @access  Private (ADMIN)
exports.selectRoute = async (req, res, next) => {
  try {
    const { id, routeId } = req.params;
    const { routeData } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    let finalRouteData = routeData;

    // If routeData was not sent in request body, attempt to look up from live route analysis
    if (!finalRouteData) {
      try {
        const originObj = {
          locationName: shipment.pickup?.locationName || 'Pickup Origin',
          address: shipment.pickup?.address || '',
          latitude: shipment.pickup?.latitude,
          longitude: shipment.pickup?.longitude
        };
        const destObj = {
          locationName: shipment.destination?.locationName || 'Destination Target',
          address: shipment.destination?.address || '',
          latitude: shipment.destination?.latitude,
          longitude: shipment.destination?.longitude
        };
        const intelligence = await analyzeRouteIntelligence(originObj, destObj, {
          shipmentType: shipment.goodsType,
          priority: shipment.priority
        });
        const matched = intelligence?.routes?.find(r => r.routeId === routeId);
        if (matched) {
          finalRouteData = matched;
        } else if (intelligence?.routes && intelligence.routes.length > 0) {
          finalRouteData = intelligence.routes[0];
        }
      } catch (genErr) {
        console.warn('[routeController] Could not retrieve fallback route intelligence:', genErr.message);
      }
    }

    if (!finalRouteData) {
      finalRouteData = {
        routeId,
        routeName: 'Selected Transit Corridor',
        distanceKm: 0,
        estimatedDurationMinutes: 0
      };
    }

    const rawRiskFactors = finalRouteData.riskAnalysis?.riskFactors || finalRouteData.riskFactors || [];
    const normalizedRiskFactors = Array.isArray(rawRiskFactors)
      ? rawRiskFactors.map((rf) => {
          if (typeof rf === 'string') {
            return { factor: rf, severity: 'LOW', impact: 'Caution advised along corridor' };
          }
          if (typeof rf === 'object' && rf !== null) {
            return {
              factor: rf.factor || rf.name || 'Risk Factor',
              severity: rf.severity || 'LOW',
              impact: rf.impact || 'Caution required'
            };
          }
          return { factor: String(rf), severity: 'LOW', impact: 'Caution required' };
        })
      : [];

    const name = finalRouteData.routeName || finalRouteData.name || 'Selected Route';
    const distanceKm = finalRouteData.distanceKm !== undefined ? finalRouteData.distanceKm : (finalRouteData.distance || 0);
    const estimatedDurationMinutes = finalRouteData.estimatedDurationMinutes !== undefined
      ? finalRouteData.estimatedDurationMinutes
      : (finalRouteData.durationMinutes !== undefined ? finalRouteData.durationMinutes : (finalRouteData.duration || 0));
    const riskScore = finalRouteData.riskScore !== undefined
      ? finalRouteData.riskScore
      : (finalRouteData.riskAnalysis?.riskScore || 20);
    const safetyScore = finalRouteData.safetyScore !== undefined
      ? finalRouteData.safetyScore
      : (100 - riskScore);
    const riskLevel = finalRouteData.riskLevel || finalRouteData.riskAnalysis?.riskLevel || 'LOW';
    let coordinates = (finalRouteData.coordinates && Array.isArray(finalRouteData.coordinates) && finalRouteData.coordinates.length >= 2)
      ? finalRouteData.coordinates
      : [];

    // Normalize coordinates to [[latitude, longitude], ...] format
    if (Array.isArray(coordinates) && coordinates.length > 0) {
      coordinates = coordinates.map(c => {
        if (Array.isArray(c) && c.length >= 2) {
          if (c[0] > 50 && c[1] < 40) {
            return [c[1], c[0]];
          }
          return [c[0], c[1]];
        }
        return c;
      });
    }

    // If coordinates array is missing or <= 2 points, resolve OSRM real road geometry automatically
    if (coordinates.length <= 2 && shipment.pickup?.latitude && shipment.destination?.latitude) {
      try {
        const { generateRouteAlternatives } = require('../services/aiRouteService');
        const originObj = { locationName: shipment.pickup.locationName, latitude: shipment.pickup.latitude, longitude: shipment.pickup.longitude };
        const destObj = { locationName: shipment.destination.locationName, latitude: shipment.destination.latitude, longitude: shipment.destination.longitude };
        const alternatives = await generateRouteAlternatives(originObj, destObj);
        const matched = alternatives.find(a => a.routeId === routeId) || alternatives[0];
        if (matched && matched.coordinates && matched.coordinates.length > 2) {
          coordinates = matched.coordinates;
          if (matched.distanceKm) finalRouteData.distanceKm = matched.distanceKm;
          if (matched.durationMinutes) finalRouteData.estimatedDurationMinutes = matched.durationMinutes;
        }
      } catch (osrmErr) {
        console.warn('[routeController] Could not fetch OSRM coordinates for selectRoute:', osrmErr.message);
      }
    }

    shipment.selectedRouteId = routeId;
    shipment.selectedRoute = {
      routeId,
      name,
      distanceKm: finalRouteData.distanceKm || distanceKm,
      estimatedDurationMinutes: finalRouteData.estimatedDurationMinutes || estimatedDurationMinutes,
      safetyScore,
      riskScore,
      riskLevel,
      riskFactors: normalizedRiskFactors,
      weatherRisk: finalRouteData.weatherRisk || finalRouteData.riskAnalysis?.weatherConditions || {},
      hazardAnalysis: finalRouteData.hazardAnalysis || finalRouteData.riskAnalysis?.hazardAnalysis || {},
      coordinates,
      selectedAt: new Date(),
      selectedBy: req.user ? (req.user._id || req.user.id) : null
    };

    if (shipment.status === 'CREATED' || shipment.status === 'ROUTE_PENDING') {
      shipment.status = 'ROUTE_SELECTED';
    }

    await shipment.save();

    // Sync/update corresponding Route document in Route collection in MongoDB
    try {
      const Route = require('../models/Route');
      let dbRoute = await Route.findOne({
        $or: [
          { routeId: routeId },
          { shipments: shipment._id }
        ]
      });

      const routeFields = {
        routeName: shipment.selectedRoute.name,
        origin: {
          locationName: shipment.pickup?.locationName || 'Pickup Origin',
          address: shipment.pickup?.address || '',
          coordinates: {
            latitude: shipment.pickup?.latitude || null,
            longitude: shipment.pickup?.longitude || null
          }
        },
        destination: {
          locationName: shipment.destination?.locationName || 'Destination Target',
          address: shipment.destination?.address || '',
          coordinates: {
            latitude: shipment.destination?.latitude || null,
            longitude: shipment.destination?.longitude || null
          }
        },
        distance: shipment.selectedRoute.distanceKm,
        estimatedDuration: shipment.selectedRoute.estimatedDurationMinutes,
        routeStatus: shipment.status === 'IN_TRANSIT' ? 'ACTIVE' : shipment.status === 'DELIVERED' ? 'COMPLETED' : 'PLANNED',
        selectedRouteData: {
          routeId: shipment.selectedRoute.routeId,
          routeName: shipment.selectedRoute.name,
          coordinates: shipment.selectedRoute.coordinates,
          distanceKm: shipment.selectedRoute.distanceKm,
          durationMinutes: shipment.selectedRoute.estimatedDurationMinutes,
          riskLevel: shipment.selectedRoute.riskLevel,
          riskScore: shipment.selectedRoute.riskScore,
          selectedAt: shipment.selectedRoute.selectedAt
        },
        riskAnalysis: {
          level: shipment.selectedRoute.riskLevel,
          score: shipment.selectedRoute.riskScore,
          factors: shipment.selectedRoute.riskFactors,
          analyzedAt: new Date()
        }
      };

      if (dbRoute) {
        Object.assign(dbRoute, routeFields);
        if (!dbRoute.shipments.includes(shipment._id)) {
          dbRoute.shipments.push(shipment._id);
        }
        await dbRoute.save();
      } else {
        await Route.create({
          routeId: routeId.startsWith('RT-') ? routeId : `RT-${shipment.shipmentId}`,
          ...routeFields,
          shipments: [shipment._id]
        });
      }
    } catch (rSyncErr) {
      console.warn('[routeController] Error syncing Route collection:', rSyncErr.message);
    }

    // Sync hazard alert into MongoDB
    try {
      const { syncShipmentRiskAlerts } = require('../services/alerts/autoAlertService');
      await syncShipmentRiskAlerts(shipment, req.user ? (req.user._id || req.user.id) : null);
    } catch (aErr) {
      console.error('[routeController] Error syncing hazard alert:', aErr.message);
    }

    console.log(`[routeController] Confirmed Route "${shipment.selectedRoute.name}" for Shipment ${shipment.shipmentId}`);

    // Create real-time Audit Log
    try {
      const { logAudit } = require('../services/auditService');
      await logAudit({
        user: req.user,
        action: 'ROUTE_SELECTED',
        module: 'ROUTES',
        referenceId: shipment.shipmentId,
        description: `Confirmed & selected route "${shipment.selectedRoute.name}" (${shipment.selectedRoute.distanceKm} km, Safety: ${shipment.selectedRoute.safetyScore}/100)`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[routeController] Audit logging error:', audErr.message);
    }

    // Dispatch notifications to Driver and NGO
    try {
      const { notifyUser } = require('../services/notificationService');

      if (shipment.assignedDriver) {
        await notifyUser(shipment.assignedDriver._id || shipment.assignedDriver, {
          title: 'Route Updated',
          message: `The route for shipment ${shipment.shipmentId} has been updated to "${shipment.selectedRoute.name}".`,
          category: 'ROUTE',
          severity: 'MEDIUM',
          relatedEntityType: 'Shipment',
          relatedEntityId: shipment._id
        });
      }

      if (shipment.requestedBy) {
        await notifyUser(shipment.requestedBy._id || shipment.requestedBy, {
          title: 'Route Selected',
          message: `Route "${shipment.selectedRoute.name}" has been selected for shipment ${shipment.shipmentId}.`,
          category: 'ROUTE',
          severity: 'LOW',
          relatedEntityType: 'Shipment',
          relatedEntityId: shipment._id
        });
      }
    } catch (nErr) {
      console.error('[routeController] Error sending route selection notification:', nErr.message);
    }

    // Real-time broadcast if socket is active
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('shipment:route-selected', {
          shipmentId: shipment._id,
          shipmentCode: shipment.shipmentId,
          selectedRoute: shipment.selectedRoute,
          status: shipment.status
        });
      }
    } catch (sErr) {
      console.warn('[routeController] Socket notification warning:', sErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Route selected and saved successfully',
      data: {
        shipment,
        selectedRoute: shipment.selectedRoute,
      },
    });
  } catch (error) {
    next(error);
  }
};
