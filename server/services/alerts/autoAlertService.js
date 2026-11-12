const Alert = require('../../models/Alert');

/**
 * Creates a new alert or updates an existing active/acknowledged one to prevent duplicates.
 */
const createOrUpdateAlert = async ({
  alertType,
  severity,
  title,
  description,
  relatedShipment,
  relatedOrder,
  relatedVehicle,
  relatedRoute,
  location,
  metadata,
  reportedBy,
}) => {
  const query = {
    alertType,
    status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
  };

  if (relatedShipment) query.relatedShipment = relatedShipment;
  if (relatedOrder) query.relatedOrder = relatedOrder;
  if (relatedVehicle) query.relatedVehicle = relatedVehicle;
  if (relatedRoute) query.relatedRoute = relatedRoute;

  let assignedDriverId = null;
  if (relatedShipment) {
    const Shipment = require('../../models/Shipment');
    const shp = await Shipment.findById(relatedShipment).select('assignedDriver');
    if (shp && shp.assignedDriver) {
      assignedDriverId = shp.assignedDriver._id || shp.assignedDriver;
    }
  }
  if (!assignedDriverId && relatedVehicle) {
    const Vehicle = require('../../models/Vehicle');
    const veh = await Vehicle.findById(relatedVehicle).select('assignedDriver');
    if (veh && veh.assignedDriver) {
      assignedDriverId = veh.assignedDriver._id || veh.assignedDriver;
    }
  }

  let existingAlert = await Alert.findOne(query);

  if (existingAlert) {
    if (!existingAlert.assignedTo && assignedDriverId) {
      existingAlert.assignedTo = assignedDriverId;
    }

    const prevSeverity = existingAlert.severity;
    let severityChanged = false;

    if (severity && existingAlert.severity !== severity.toUpperCase()) {
      existingAlert.severity = severity.toUpperCase();
      severityChanged = true;
    }

    existingAlert.title = title || existingAlert.title;
    existingAlert.description = description || existingAlert.description;
    if (location) {
      existingAlert.location = { ...existingAlert.location.toObject(), ...location };
    }
    if (metadata) {
      const existingMeta = existingAlert.metadata ? (typeof existingAlert.metadata.toObject === 'function' ? existingAlert.metadata.toObject() : existingAlert.metadata) : {};
      existingAlert.metadata = { ...existingMeta, ...metadata };
    }

    existingAlert.history.push({
      action: severityChanged ? 'Severity Changed' : 'Alert Updated',
      previousSeverity: severityChanged ? prevSeverity : undefined,
      newSeverity: severityChanged ? severity.toUpperCase() : undefined,
      performedBy: reportedBy || null,
      timestamp: new Date(),
      notes: 'Automatically updated active alert based on status synchronization',
    });

    await existingAlert.save();
    return existingAlert;
  } else {
    const newAlert = new Alert({
      alertType,
      severity: severity.toUpperCase(),
      title,
      description,
      relatedShipment: relatedShipment || null,
      relatedOrder: relatedOrder || null,
      relatedVehicle: relatedVehicle || null,
      relatedRoute: relatedRoute || null,
      location: location || {},
      metadata: metadata || {},
      reportedBy: reportedBy || null,
      assignedTo: assignedDriverId || null,
    });

    newAlert.history = [
      {
        action: 'Alert Created',
        performedBy: reportedBy || null,
        timestamp: new Date(),
        notes: 'Automatically triggered by system telemetry',
      },
    ];

    await newAlert.save();

    try {
      const { logAudit } = require('../auditService');
      await logAudit({
        user: reportedBy || null,
        userName: 'System Telemetry',
        role: 'SYSTEM',
        action: 'ALERT_CREATED',
        module: 'ALERTS',
        referenceId: newAlert.alertId,
        description: `Auto Alert Created: ${newAlert.title} [${newAlert.severity}]`,
        status: 'SUCCESS'
      });
    } catch (audErr) {
      console.error('[autoAlertService] Audit log error:', audErr.message);
    }

    try {
      if (newAlert.relatedShipment) {
        const Shipment = require('../../models/Shipment');
        const shipment = await Shipment.findById(newAlert.relatedShipment);
        if (shipment) {
          const { notifyUser } = require('../notificationService');
          if (shipment.assignedDriver) {
            await notifyUser(shipment.assignedDriver._id || shipment.assignedDriver, {
              title: `Hazard Alert: ${newAlert.title}`,
              message: newAlert.description || `Hazard detected along shipment ${shipment.shipmentId} route.`,
              category: 'ALERT',
              severity: newAlert.severity,
              relatedEntityType: 'Alert',
              relatedEntityId: newAlert._id
            });
          }
          if (shipment.requestedBy) {
            await notifyUser(shipment.requestedBy._id || shipment.requestedBy, {
              title: `Shipment Hazard Alert: ${shipment.shipmentId}`,
              message: `${newAlert.title}: ${newAlert.description}`,
              category: 'ALERT',
              severity: newAlert.severity,
              relatedEntityType: 'Alert',
              relatedEntityId: newAlert._id
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('[autoAlertService] Notification dispatch error:', notifErr.message);
    }

    try {
      const { emitNewAlert } = require('../../config/socket');
      emitNewAlert({
        _id: newAlert._id,
        alertId: newAlert.alertId,
        title: newAlert.title,
        description: newAlert.description,
        alertType: newAlert.alertType,
        severity: newAlert.severity,
        status: newAlert.status,
        relatedShipment: newAlert.relatedShipment,
        relatedVehicle: newAlert.relatedVehicle,
        relatedRoute: newAlert.relatedRoute,
        location: newAlert.location,
        createdAt: newAlert.createdAt
      });
    } catch (socErr) {
      console.warn('[autoAlertService] Socket broadcast error:', socErr.message);
    }

    return newAlert;
  }
};

/**
 * Resolves any existing active or acknowledged alerts for a specific type and entity.
 */
const resolveExistingAlerts = async ({
  alertType,
  relatedShipment,
  relatedVehicle,
  relatedRoute,
  resolvedBy,
}) => {
  const query = {
    alertType,
    status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
  };

  if (relatedShipment) query.relatedShipment = relatedShipment;
  if (relatedVehicle) query.relatedVehicle = relatedVehicle;
  if (relatedRoute) query.relatedRoute = relatedRoute;

  const alerts = await Alert.find(query);

  for (const alert of alerts) {
    const prevStatus = alert.status;
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    alert.resolutionNotes = 'Automatically resolved by system telemetry as status returned to normal.';
    alert.history.push({
      action: 'Alert Resolved',
      previousStatus: prevStatus,
      newStatus: 'RESOLVED',
      performedBy: resolvedBy || null,
      timestamp: new Date(),
      notes: 'System cleared status condition.',
    });
    await alert.save();
  }
};

/**
 * Hook for Shipment status changes
 */
const syncShipmentAlerts = async (shipment, userId) => {
  try {
    const location = shipment.pickup
      ? {
          latitude: shipment.pickup.latitude,
          longitude: shipment.pickup.longitude,
          address: shipment.pickup.address,
          region: shipment.pickup.locationName,
        }
      : {};

    if (shipment.status === 'DELAYED') {
      await createOrUpdateAlert({
        alertType: 'TRANSIT_DELAY',
        severity: shipment.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `Transit Delay: Shipment ${shipment.shipmentId}`,
        description: `Shipment of ${shipment.goodsType} (${shipment.quantity} ${shipment.unit}) is delayed en route to ${shipment.destination?.locationName}.`,
        relatedShipment: shipment._id,
        location,
        reportedBy: userId,
        metadata: {
          goodsType: shipment.goodsType,
          quantity: shipment.quantity,
          unit: shipment.unit,
        },
      });
    } else {
      await resolveExistingAlerts({
        alertType: 'TRANSIT_DELAY',
        relatedShipment: shipment._id,
        resolvedBy: userId,
      });
    }

    if (shipment.status === 'AT_RISK') {
      await createOrUpdateAlert({
        alertType: 'SHIPMENT_RISK',
        severity: shipment.priority === 'CRITICAL' || shipment.priority === 'HIGH' ? 'CRITICAL' : 'MEDIUM',
        title: `Shipment At Risk: ${shipment.shipmentId}`,
        description: `Shipment of ${shipment.goodsType} entered high risk condition en route to ${shipment.destination?.locationName}.`,
        relatedShipment: shipment._id,
        location,
        reportedBy: userId,
      });
    } else {
      await resolveExistingAlerts({
        alertType: 'SHIPMENT_RISK',
        relatedShipment: shipment._id,
        resolvedBy: userId,
      });
    }

    if (['DELIVERED', 'CANCELLED'].includes(shipment.status)) {
      await resolveExistingAlerts({
        alertType: 'TRANSIT_DELAY',
        relatedShipment: shipment._id,
        resolvedBy: userId,
      });
      await resolveExistingAlerts({
        alertType: 'SHIPMENT_RISK',
        relatedShipment: shipment._id,
        resolvedBy: userId,
      });
      await resolveExistingAlerts({
        alertType: 'CORRIDOR_HAZARD',
        relatedShipment: shipment._id,
        resolvedBy: userId,
      });
    }

    // Evaluate route risk and weather hazards
    await syncShipmentRiskAlerts(shipment, userId);
  } catch (err) {
    console.error('Error syncing shipment alerts:', err);
  }
};

/**
 * Evaluates real-time weather & hazard risk telemetry for a shipment with a selected route.
 * Automatically updates/creates active hazard alerts in MongoDB when risk is meaningful
 * or when the risk score changes by > 30 percentage points (absolute difference).
 */
const syncShipmentRiskAlerts = async (shipment, userId = null) => {
  try {
    if (!shipment || !shipment.selectedRoute || !shipment.selectedRoute.name) {
      return;
    }

    const route = shipment.selectedRoute;
    const currentRiskScore = typeof route.riskScore === 'number' ? route.riskScore : (100 - (route.safetyScore || 80));
    const riskLevel = (route.riskLevel || 'LOW').toUpperCase();
    const weatherRisk = route.weatherRisk || {};
    const hazardAnalysis = route.hazardAnalysis || {};
    const riskFactors = Array.isArray(route.riskFactors) ? route.riskFactors : [];

    const shipmentId = shipment._id;
    const shipmentCode = shipment.shipmentId || 'Shipment';

    // Query existing active/acknowledged alert for this shipment
    const existingAlert = await Alert.findOne({
      relatedShipment: shipmentId,
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] }
    });

    let previousRiskScore = 0;
    if (existingAlert && existingAlert.metadata) {
      previousRiskScore = (typeof existingAlert.metadata.get === 'function'
        ? existingAlert.metadata.get('riskScore')
        : existingAlert.metadata.riskScore) || 0;
    }

    const riskChange = currentRiskScore - previousRiskScore;
    const absChange = Math.abs(riskChange);

    // Rule: Create/update alert if risk is meaningful (>=40, HIGH, CRITICAL, Heavy Rain) or changed by >30 points
    const isMeaningfulRisk = currentRiskScore >= 40 || ['HIGH', 'CRITICAL', 'MEDIUM', 'MODERATE'].includes(riskLevel) || weatherRisk.hasHeavyRain || absChange > 30;

    if (isMeaningfulRisk) {
      let severity = 'LOW';
      if (currentRiskScore >= 80 || riskLevel === 'CRITICAL') {
        severity = 'CRITICAL';
      } else if (currentRiskScore >= 60 || riskLevel === 'HIGH') {
        severity = 'HIGH';
      } else if (currentRiskScore >= 40 || ['MEDIUM', 'MODERATE'].includes(riskLevel)) {
        severity = 'MEDIUM';
      }

      let title = `Corridor Hazard Warning: ${route.name}`;
      let description = `Real-time weather analysis detected ${riskLevel} risk corridor (${currentRiskScore}/100) en route from ${shipment.pickup?.locationName || 'Origin'} to ${shipment.destination?.locationName || 'Destination'}.`;

      if (existingAlert && absChange > 30) {
        title = `Risk Level Changed by ${absChange}% for Shipment ${shipmentCode}`;
        description = `Risk score changed from ${previousRiskScore}% to ${currentRiskScore}% (${riskChange > 0 ? '+' : ''}${riskChange} points) based on updated real-time weather corridor telemetry.`;
      } else if (riskFactors.length > 0) {
        const topFactor = typeof riskFactors[0] === 'object' ? (riskFactors[0].factor || riskFactors[0].name) : riskFactors[0];
        description = `Hazard Detected: ${topFactor}. ${description}`;
      }

      const location = {
        latitude: shipment.pickup?.latitude || 0,
        longitude: shipment.pickup?.longitude || 0,
        address: shipment.pickup?.address || '',
        region: `${shipment.pickup?.locationName || 'Origin'} → ${shipment.destination?.locationName || 'Destination'}`
      };

      await createOrUpdateAlert({
        alertType: 'CORRIDOR_HAZARD',
        severity,
        title,
        description,
        relatedShipment: shipmentId,
        location,
        reportedBy: userId,
        metadata: {
          riskScore: currentRiskScore,
          previousRiskScore,
          riskChange,
          absChange,
          riskLevel,
          routeName: route.name,
          shipmentCode,
          weatherRisk,
          hazardAnalysis,
          riskFactors
        }
      });

      console.log(`[autoAlertService] Synced Hazard Alert for Shipment ${shipmentCode} (Risk: ${currentRiskScore}, Change: ${absChange}%)`);
    } else if (existingAlert && currentRiskScore < 30 && riskLevel === 'LOW' && !weatherRisk.hasHeavyRain) {
      await resolveExistingAlerts({
        alertType: 'CORRIDOR_HAZARD',
        relatedShipment: shipmentId,
        resolvedBy: userId
      });
      console.log(`[autoAlertService] Resolved Hazard Alert for Shipment ${shipmentCode} (Risk normalized to ${currentRiskScore})`);
    }
  } catch (err) {
    console.error('Error in syncShipmentRiskAlerts:', err);
  }
};

/**
 * Evaluates all active shipments in MongoDB with selected routes and syncs hazard alerts.
 */
const syncAllActiveShipmentsAlerts = async () => {
  try {
    const Shipment = require('../../models/Shipment');
    const activeShipments = await Shipment.find({
      status: { $in: ['ROUTE_PENDING', 'ROUTE_SELECTED', 'IN_TRANSIT', 'AT_RISK', 'DELAYED'] },
      'selectedRoute.name': { $exists: true, $ne: null }
    });

    for (const shipment of activeShipments) {
      await syncShipmentRiskAlerts(shipment);
    }
  } catch (err) {
    console.error('Error in syncAllActiveShipmentsAlerts:', err);
  }
};

/**
 * Hook for Vehicle status changes
 */
const syncVehicleAlerts = async (vehicle, userId) => {
  try {
    const location = vehicle.currentLocation
      ? {
          latitude: vehicle.currentLocation.latitude,
          longitude: vehicle.currentLocation.longitude,
          address: vehicle.currentLocation.address,
          region: vehicle.currentLocation.locationName,
        }
      : {};

    if (['MAINTENANCE', 'INACTIVE'].includes(vehicle.currentStatus)) {
      const severity = vehicle.currentStatus === 'INACTIVE' ? 'CRITICAL' : 'MEDIUM';
      await createOrUpdateAlert({
        alertType: 'VEHICLE_ISSUE',
        severity,
        title: `Vehicle Issue: Vehicle ${vehicle.registrationNumber}`,
        description: `Vehicle registered under ID ${vehicle.vehicleId} (${vehicle.vehicleType}) transitioned to status: ${vehicle.currentStatus}.`,
        relatedVehicle: vehicle._id,
        location,
        reportedBy: userId,
        metadata: {
          vehicleId: vehicle.vehicleId,
          vehicleType: vehicle.vehicleType,
          status: vehicle.currentStatus,
        },
      });
    } else {
      await resolveExistingAlerts({
        alertType: 'VEHICLE_ISSUE',
        relatedVehicle: vehicle._id,
        resolvedBy: userId,
      });
    }
  } catch (err) {
    console.error('Error syncing vehicle alerts:', err);
  }
};

/**
 * Hook for Route / corridor hazards
 */
const syncRouteAlerts = async (route, userId) => {
  try {
    const location = route.origin?.coordinates
      ? {
          latitude: route.origin.coordinates.latitude,
          longitude: route.origin.coordinates.longitude,
          address: route.origin.address,
          region: route.origin.locationName,
        }
      : {};

    if (route.routeStatus === 'CANCELLED') {
      await createOrUpdateAlert({
        alertType: 'CORRIDOR_HAZARD',
        severity: 'CRITICAL',
        title: `Corridor Hazard: Route ${route.routeName} Cancelled`,
        description: `Corridor Route ${route.routeName} (${route.routeId}) is cancelled and marked unsafe for transits.`,
        relatedRoute: route._id,
        location,
        reportedBy: userId,
      });
    } else {
      await resolveExistingAlerts({
        alertType: 'CORRIDOR_HAZARD',
        relatedRoute: route._id,
        resolvedBy: userId,
      });
    }
  } catch (err) {
    console.error('Error syncing route alerts:', err);
  }
};

module.exports = {
  createOrUpdateAlert,
  resolveExistingAlerts,
  syncShipmentAlerts,
  syncShipmentRiskAlerts,
  syncAllActiveShipmentsAlerts,
  syncVehicleAlerts,
  syncRouteAlerts,
};
