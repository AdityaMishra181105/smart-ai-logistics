const mongoose = require('mongoose');

const connectDB = async () => {
  const connString = process.env.MONGODB_URI;
  if (!connString) {
    console.error('==================================================');
    console.error('ERROR: MONGODB_URI environment variable is missing.');
    console.error('Please configure it in server/.env or root .env');
    console.error('==================================================');
    process.exit(1);
  }

  // Safe logging of connection target without exposing credentials
  const safeString = connString.includes('@') 
    ? connString.replace(/\/\/.*@/, '//****@') 
    : connString;
  console.log(`Connecting to MONGODB_URI: ${safeString}`);

  try {
    const conn = await mongoose.connect(connString, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error('==================================================');
    console.error('DATABASE CONNECTION ERROR: MongoDB is unavailable.');
    console.error('Please check if your MongoDB service is running locally or check your MONGODB_URI connection string.');
    console.error(`Details: ${error.message}`);
    console.error('==================================================');
    throw error;
  }
};

module.exports = connectDB;
