const Shipment = require('../models/Shipment');
const { geocodeLocation } = require('../services/geocodingService');

/**
 * @desc    Geocode shipments that are missing coordinates
 * @route   POST /api/geocoding/shipments
 * @access  Private (ADMIN, LOGISTICS_OPERATOR)
 * 
 * This endpoint:
 * 1. Finds all shipments without coordinates
 * 2. Geocodes their pickup and destination locations
 * 3. Updates the shipment records with coordinates
 * 4. Returns the updated shipments
 */
exports.geocodeShipments = async (req, res, next) => {
  try {
    console.log('[Geocoding] Starting batch geocoding of shipments...');

    // Find shipments without coordinates
    const shipments = await Shipment.find({
      $or: [
        { 'pickup.latitude': { $exists: false } },
        { 'pickup.latitude': null },
        { 'destination.latitude': { $exists: false } },
        { 'destination.latitude': null }
      ]
    });

    console.log(`[Geocoding] Found ${shipments.length} shipments needing geocoding`);

    if (shipments.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All shipments already have coordinates',
        data: {
          geocoded: 0,
          failed: 0,
          alreadyGeocoded: await Shipment.countDocuments()
        }
      });
    }

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // Process each shipment with rate limiting
    for (let i = 0; i < shipments.length; i++) {
      const shipment = shipments[i];
      const updates = {};
      let needsUpdate = false;

      console.log(`[Geocoding] Processing shipment ${shipment.shipmentId}...`);

      // Geocode pickup if missing
      if (!shipment.pickup.latitude || !shipment.pickup.longitude) {
        console.log(`  -> Geocoding pickup: ${shipment.pickup.locationName}`);
        const pickupCoords = await geocodeLocation(
          shipment.pickup.locationName,
          shipment.pickup.address
        );

        if (pickupCoords) {
          updates['pickup.latitude'] = pickupCoords.latitude;
          updates['pickup.longitude'] = pickupCoords.longitude;
          needsUpdate = true;
          console.log(`  -> Pickup geocoded: [${pickupCoords.latitude}, ${pickupCoords.longitude}]`);
        } else {
          console.warn(`  -> Pickup geocoding failed: ${shipment.pickup.locationName}`);
        }

        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Geocode destination if missing
      if (!shipment.destination.latitude || !shipment.destination.longitude) {
        console.log(`  -> Geocoding destination: ${shipment.destination.locationName}`);
        const destCoords = await geocodeLocation(
          shipment.destination.locationName,
          shipment.destination.address
        );

        if (destCoords) {
          updates['destination.latitude'] = destCoords.latitude;
          updates['destination.longitude'] = destCoords.longitude;
          needsUpdate = true;
          console.log(`  -> Destination geocoded: [${destCoords.latitude}, ${destCoords.longitude}]`);
        } else {
          console.warn(`  -> Destination geocoding failed: ${shipment.destination.locationName}`);
        }

        // Rate limiting: wait 1 second between requests (if not last shipment)
        if (i < shipments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update shipment if we have new coordinates
      if (needsUpdate) {
        const updatedShipment = await Shipment.findByIdAndUpdate(
          shipment._id,
          { $set: updates },
          { new: true }
        );

        if (updatedShipment) {
          successCount++;
          results.push({
            shipmentId: shipment.shipmentId,
            pickup: {
              locationName: shipment.pickup.locationName,
              coordinates: updates['pickup.latitude'] ? 
                [updates['pickup.latitude'], updates['pickup.longitude']] : 
                'already had coordinates'
            },
            destination: {
              locationName: shipment.destination.locationName,
              coordinates: updates['destination.latitude'] ? 
                [updates['destination.latitude'], updates['destination.longitude']] : 
                'already had coordinates'
            }
          });
        } else {
          failCount++;
        }
      } else {
        failCount++;
        console.warn(`  -> No coordinates obtained for shipment ${shipment.shipmentId}`);
      }
    }

    console.log(`[Geocoding] Completed: ${successCount} successful, ${failCount} failed`);

    res.status(200).json({
      success: true,
      message: `Geocoding completed: ${successCount} shipments updated, ${failCount} failed`,
      data: {
        geocoded: successCount,
        failed: failCount,
        total: shipments.length,
        results
      }
    });
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    next(error);
  }
};

/**
 * @desc    Geocode a single location
 * @route   POST /api/geocoding/location
 * @access  Private
 * 
 * Request body: { locationName: string, address?: string }
 */
exports.geocodeLocation = async (req, res, next) => {
  try {
    const { locationName, address } = req.body;

    if (!locationName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide locationName'
      });
    }

    const coords = await geocodeLocation(locationName, address);

    if (coords) {
      res.status(200).json({
        success: true,
        data: coords
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
  } catch (error) {
    next(error);
  }
};
