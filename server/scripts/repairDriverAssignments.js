/**
 * Database Repair Script: Fix Driver-Shipment-Vehicle Assignments
 * 
 * This script repairs existing assignments to ensure bidirectional sync:
 * 1. For each Driver with activeShipment set, ensures Shipment.assignedDriver is set
 * 2. For each Driver with assignedVehicle set, ensures Vehicle.assignedDriver is set
 * 3. For each Vehicle with assignedShipment set, ensures Shipment record is aware
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Shipment = require('../models/Shipment');
const User = require('../models/User');

async function repairAssignments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_logistics', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');

    let repairCount = 0;

    // 1. Repair Driver -> Shipment assignments
    console.log('\n[1] Checking Driver -> Shipment assignments...');
    const driversWithShipments = await Driver.find({ activeShipment: { $ne: null } })
      .populate('user')
      .populate('activeShipment');

    for (const driver of driversWithShipments) {
      if (driver.activeShipment && driver.user) {
        const shipment = await Shipment.findById(driver.activeShipment._id);
        if (shipment) {
          const currentDriver = shipment.assignedDriver?.toString();
          const correctDriver = driver.user._id.toString();

          if (currentDriver !== correctDriver) {
            console.log(`  - Fixing shipment ${shipment.shipmentId}: assignedDriver ${currentDriver || 'null'} -> ${correctDriver} (${driver.fullName})`);
            shipment.assignedDriver = driver.user._id;
            await shipment.save();
            repairCount++;
          } else {
            console.log(`  ✓ Shipment ${shipment.shipmentId} already correct (driver: ${driver.fullName})`);
          }
        }
      }
    }

    // 2. Repair Driver -> Vehicle assignments
    console.log('\n[2] Checking Driver -> Vehicle assignments...');
    const driversWithVehicles = await Driver.find({ assignedVehicle: { $ne: null } })
      .populate('user')
      .populate('assignedVehicle');

    for (const driver of driversWithVehicles) {
      if (driver.assignedVehicle && driver.user) {
        const vehicle = await Vehicle.findById(driver.assignedVehicle._id);
        if (vehicle) {
          const currentDriver = vehicle.assignedDriver?.toString();
          const correctDriver = driver.user._id.toString();

          if (currentDriver !== correctDriver) {
            console.log(`  - Fixing vehicle ${vehicle.registrationNumber}: assignedDriver ${currentDriver || 'null'} -> ${correctDriver} (${driver.fullName})`);
            vehicle.assignedDriver = driver.user._id;
            await vehicle.save();
            repairCount++;
          } else {
            console.log(`  ✓ Vehicle ${vehicle.registrationNumber} already correct (driver: ${driver.fullName})`);
          }
        }
      }
    }

    // 3. Repair orphaned Shipment.assignedDriver (no corresponding Driver.activeShipment)
    console.log('\n[3] Checking for orphaned Shipment.assignedDriver...');
    const assignedShipments = await Shipment.find({ assignedDriver: { $ne: null } })
      .populate('assignedDriver');

    for (const shipment of assignedShipments) {
      if (shipment.assignedDriver) {
        const driver = await Driver.findOne({ user: shipment.assignedDriver._id });
        if (driver) {
          if (!driver.activeShipment || driver.activeShipment.toString() !== shipment._id.toString()) {
            console.log(`  - Fixing driver ${driver.fullName}: activeShipment null -> ${shipment.shipmentId}`);
            driver.activeShipment = shipment._id;
            driver.availabilityStatus = 'ASSIGNED';
            await driver.save();
            repairCount++;
          }
        }
      }
    }

    // 4. Repair orphaned Vehicle.assignedDriver (no corresponding Driver.assignedVehicle)
    console.log('\n[4] Checking for orphaned Vehicle.assignedDriver...');
    const assignedVehicles = await Vehicle.find({ assignedDriver: { $ne: null } })
      .populate('assignedDriver');

    for (const vehicle of assignedVehicles) {
      if (vehicle.assignedDriver) {
        const driver = await Driver.findOne({ user: vehicle.assignedDriver._id });
        if (driver) {
          if (!driver.assignedVehicle || driver.assignedVehicle.toString() !== vehicle._id.toString()) {
            console.log(`  - Fixing driver ${driver.fullName}: assignedVehicle null -> ${vehicle.registrationNumber}`);
            driver.assignedVehicle = vehicle._id;
            await driver.save();
            repairCount++;
          }
        }
      }
    }

    console.log(`\n✓ Repair complete! Fixed ${repairCount} relationship(s).`);
    console.log('\nCurrent state:');
    
    // Show summary
    const allDrivers = await Driver.find()
      .populate('user')
      .populate('assignedVehicle')
      .populate('activeShipment');

    for (const driver of allDrivers) {
      console.log(`\n  Driver: ${driver.fullName} (${driver.driverId})`);
      console.log(`    User ID: ${driver.user?._id}`);
      console.log(`    Vehicle: ${driver.assignedVehicle?.registrationNumber || 'None'}`);
      console.log(`    Shipment: ${driver.activeShipment?.shipmentId || 'None'}`);
      console.log(`    Availability: ${driver.availabilityStatus}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Repair failed:', error);
    process.exit(1);
  }
}

repairAssignments();
