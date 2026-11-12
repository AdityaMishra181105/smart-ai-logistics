const Vehicle = require('../models/Vehicle');
const Shipment = require('../models/Shipment');
const { syncVehicleAlerts } = require('../services/alerts/autoAlertService');

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private (ADMIN)
exports.createVehicle = async (req, res, next) => {
  try {
    const {
      registrationNumber,
      vehicleType,
      capacity,
      capacityUnit,
      currentStatus,
      currentLocation,
      fuelType,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
    } = req.body;

    if (!registrationNumber || !capacity || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide registrationNumber, capacity and vehicleType.',
      });
    }

    // Check if registrationNumber already exists
    const exists = await Vehicle.findOne({ registrationNumber: registrationNumber.toUpperCase() });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A vehicle with registration number ${registrationNumber.toUpperCase()} already exists.`,
      });
    }

    const vehicle = await Vehicle.create({
      registrationNumber: registrationNumber.toUpperCase(),
      vehicleType,
      capacity: parseFloat(capacity),
      capacityUnit: capacityUnit || 'KG',
      currentStatus: currentStatus || 'AVAILABLE',
      currentLocation: currentLocation || { locationName: 'Guwahati Depot' },
      fuelType: fuelType || 'DIESEL',
      lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : null,
      nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null,
      notes,
    });

    await syncVehicleAlerts(vehicle, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully',
      data: vehicle,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private (Authenticated users)
exports.getVehicles = async (req, res, next) => {
  try {
    const query = {};

    // Apply status filter
    if (req.query.status) {
      query.currentStatus = req.query.status.toUpperCase();
    }
    // Apply type filter
    if (req.query.vehicleType) {
      query.vehicleType = req.query.vehicleType.toUpperCase();
    }
    // Apply availability filter
    if (req.query.available === 'true') {
      query.currentStatus = 'AVAILABLE';
      query.assignedShipment = null;
    }

    // Apply Search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { vehicleId: searchRegex },
        { registrationNumber: searchRegex },
        { vehicleType: searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const total = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .populate('assignedShipment', 'shipmentId status')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: vehicles.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private (Authenticated users)
exports.getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('assignedShipment');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    next(error);
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (ADMIN)
exports.updateVehicle = async (req, res, next) => {
  try {
    const {
      registrationNumber,
      vehicleType,
      capacity,
      capacityUnit,
      currentStatus,
      currentLocation,
      fuelType,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
    } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    // Business rules: cannot place vehicle under Maintenance/Inactive if assigned to an active shipment
    if (
      (currentStatus === 'MAINTENANCE' || currentStatus === 'INACTIVE') &&
      vehicle.assignedShipment
    ) {
      const shipment = await Shipment.findById(vehicle.assignedShipment);
      if (shipment && ['IN_TRANSIT', 'AT_RISK', 'DELAYED'].includes(shipment.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition vehicle to ${currentStatus} while it is assigned to an active shipment (${shipment.shipmentId} - ${shipment.status}).`,
        });
      }
    }

    const updates = {};
    if (registrationNumber) {
      const exists = await Vehicle.findOne({
        registrationNumber: registrationNumber.toUpperCase(),
        _id: { $ne: vehicle._id }
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `A vehicle with registration number ${registrationNumber.toUpperCase()} already exists.`,
        });
      }
      updates.registrationNumber = registrationNumber.toUpperCase();
    }
    if (vehicleType) updates.vehicleType = vehicleType;
    if (capacity !== undefined) updates.capacity = parseFloat(capacity);
    if (capacityUnit) updates.capacityUnit = capacityUnit;
    if (currentStatus) updates.currentStatus = currentStatus;
    if (currentLocation) updates.currentLocation = currentLocation;
    if (fuelType) updates.fuelType = fuelType;
    if (lastMaintenanceDate !== undefined) updates.lastMaintenanceDate = lastMaintenanceDate ? new Date(lastMaintenanceDate) : null;
    if (nextMaintenanceDate !== undefined) updates.nextMaintenanceDate = nextMaintenanceDate ? new Date(nextMaintenanceDate) : null;
    if (notes !== undefined) updates.notes = notes;

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('assignedShipment', 'shipmentId status');

    await syncVehicleAlerts(updatedVehicle, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Vehicle details updated successfully',
      data: updatedVehicle,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    next(error);
  }
};

// @desc    Update vehicle status
// @route   PATCH /api/vehicles/:id/status
// @access  Private (ADMIN)
exports.updateVehicleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Business validation
    if (
      (status === 'MAINTENANCE' || status === 'INACTIVE') &&
      vehicle.assignedShipment
    ) {
      const shipment = await Shipment.findById(vehicle.assignedShipment);
      if (shipment && ['IN_TRANSIT', 'AT_RISK', 'DELAYED'].includes(shipment.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition vehicle to ${status} while it is assigned to active shipment: ${shipment.shipmentId}`,
        });
      }
    }

    vehicle.currentStatus = status.toUpperCase();
    await vehicle.save();

    res.status(200).json({
      success: true,
      message: `Vehicle status updated to ${status}`,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign shipment to vehicle
// @route   PATCH /api/vehicles/:id/assign-shipment
// @access  Private (ADMIN)
exports.assignShipment = async (req, res, next) => {
  try {
    const { shipmentId } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (shipmentId === null || shipmentId === '') {
      const prevShipmentId = vehicle.assignedShipment;
      vehicle.assignedShipment = null;
      if (vehicle.currentStatus === 'ASSIGNED' || vehicle.currentStatus === 'IN_TRANSIT') {
        vehicle.currentStatus = 'AVAILABLE';
      }
      await vehicle.save();

      if (prevShipmentId) {
        await Shipment.findByIdAndUpdate(prevShipmentId, {
          assignedVehicle: null,
          vehicleNumber: ''
        });
      }

      return res.status(200).json({ success: true, message: 'Shipment unassigned from vehicle.', data: vehicle });
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(400).json({ success: false, message: 'Target shipment not found.' });
    }

    if (['MAINTENANCE', 'INACTIVE'].includes(vehicle.currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign shipment to a vehicle with status: ${vehicle.currentStatus}`,
      });
    }

    if (vehicle.assignedShipment && vehicle.assignedShipment.toString() !== shipmentId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is already assigned to another active shipment.',
      });
    }

    // Clear any previous vehicle assigned to this shipment
    await Vehicle.updateMany(
      { assignedShipment: shipment._id, _id: { $ne: vehicle._id } },
      { $set: { assignedShipment: null, currentStatus: 'AVAILABLE' } }
    );

    vehicle.assignedShipment = shipment._id;
    vehicle.currentStatus = 'ASSIGNED';
    await vehicle.save();

    // Sync vehicle reference & registration number on Shipment document
    shipment.assignedVehicle = vehicle._id;
    shipment.vehicleNumber = vehicle.registrationNumber;
    await shipment.save();

    res.status(200).json({
      success: true,
      message: 'Shipment assigned to vehicle successfully',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vehicle statistics
// @route   GET /api/vehicles/stats
// @access  Private (Authenticated users)
exports.getVehicleStats = async (req, res, next) => {
  try {
    const total = await Vehicle.countDocuments();
    const available = await Vehicle.countDocuments({ currentStatus: 'AVAILABLE' });
    const assigned = await Vehicle.countDocuments({ currentStatus: 'ASSIGNED' });
    const inTransit = await Vehicle.countDocuments({ currentStatus: 'IN_TRANSIT' });
    const maintenance = await Vehicle.countDocuments({ currentStatus: 'MAINTENANCE' });
    const inactive = await Vehicle.countDocuments({ currentStatus: 'INACTIVE' });

    res.status(200).json({
      success: true,
      data: {
        total,
        available,
        assigned,
        inTransit,
        maintenance,
        inactive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (ADMIN)
exports.deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (vehicle.assignedShipment) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a vehicle actively assigned to a shipment.',
      });
    }

    await Vehicle.findByIdAndDelete(vehicle._id);

    res.status(200).json({
      success: true,
      message: 'Vehicle record deleted successfully',
      data: {},
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    next(error);
  }
};
