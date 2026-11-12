/**
 * Inspect NGO Shipment Data
 * 
 * This script inspects shipment records to compare ADMIN vs NGO shipments
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Shipment = require('../models/Shipment');
const User = require('../models/User');

async function inspectShipments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_logistics', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB\n');

    // Find NGO user (Alice or any NGO_SUPPLIER)
    const ngoUser = await User.findOne({ role: 'NGO_SUPPLIER' });
    if (!ngoUser) {
      console.log('No NGO_SUPPLIER user found');
      process.exit(0);
    }

    console.log('NGO User found:');
    console.log(`  Name: ${ngoUser.name}`);
    console.log(`  Email: ${ngoUser.email}`);
    console.log(`  ID: ${ngoUser._id}\n`);

    // Find shipments created by this NGO
    const ngoShipments = await Shipment.find({ requestedBy: ngoUser._id });
    
    console.log(`Found ${ngoShipments.length} shipment(s) created by ${ngoUser.name}:\n`);

    for (const shipment of ngoShipments) {
      console.log('━'.repeat(80));
      console.log(`Shipment: ${shipment.shipmentId}`);
      console.log(`  Status: ${shipment.status}`);
      console.log(`  Priority: ${shipment.priority}`);
      console.log(`  Goods: ${shipment.goodsType}`);
      console.log(`\n  PICKUP:`);
      console.log(`    locationName: ${shipment.pickup?.locationName}`);
      console.log(`    address: ${shipment.pickup?.address}`);
      console.log(`    latitude: ${shipment.pickup?.latitude}`);
      console.log(`    longitude: ${shipment.pickup?.longitude}`);
      console.log(`    Raw object:`, JSON.stringify(shipment.pickup, null, 2));
      console.log(`\n  DESTINATION:`);
      console.log(`    locationName: ${shipment.destination?.locationName}`);
      console.log(`    address: ${shipment.destination?.address}`);
      console.log(`    latitude: ${shipment.destination?.latitude}`);
      console.log(`    longitude: ${shipment.destination?.longitude}`);
      console.log(`    Raw object:`, JSON.stringify(shipment.destination, null, 2));
      console.log('');
    }

    // Compare with ADMIN-created shipments
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (adminUser) {
      const adminShipments = await Shipment.find({ requestedBy: adminUser._id }).limit(1);
      if (adminShipments.length > 0) {
        const adminShipment = adminShipments[0];
        console.log('\n' + '━'.repeat(80));
        console.log('COMPARISON: ADMIN Shipment');
        console.log('━'.repeat(80));
        console.log(`Shipment: ${adminShipment.shipmentId}`);
        console.log(`\n  PICKUP:`);
        console.log(`    locationName: ${adminShipment.pickup?.locationName}`);
        console.log(`    address: ${adminShipment.pickup?.address}`);
        console.log(`    latitude: ${adminShipment.pickup?.latitude}`);
        console.log(`    longitude: ${adminShipment.pickup?.longitude}`);
        console.log(`    Raw object:`, JSON.stringify(adminShipment.pickup, null, 2));
        console.log(`\n  DESTINATION:`);
        console.log(`    locationName: ${adminShipment.destination?.locationName}`);
        console.log(`    address: ${adminShipment.destination?.address}`);
        console.log(`    latitude: ${adminShipment.destination?.latitude}`);
        console.log(`    longitude: ${adminShipment.destination?.longitude}`);
        console.log(`    Raw object:`, JSON.stringify(adminShipment.destination, null, 2));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Inspection failed:', error);
    process.exit(1);
  }
}

inspectShipments();
