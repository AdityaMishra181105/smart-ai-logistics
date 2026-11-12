const dotenv = require('dotenv');
const path = require('path');

// Load environment variables dynamically based on run directory at the absolute entrypoint
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const app = require('./app');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const geminiService = require('./services/geminiService');
const { initializeSocket } = require('./config/socket');

// Environment configuration validation
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error('==================================================');
  console.error(`FATAL STARTUP ERROR: Missing environment variables: ${missingVars.join(', ')}`);
  console.error('==================================================');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to Database strictly
    await connectDB();

    // Database seeding disabled - no automatic demo data insertion
    // Use the application UI or APIs to create real users, shipments, and other records
    console.log('Automatic database seeding is disabled. Database remains in current state.');

    // Initialize Gemini AI (optional - will warn if not configured)
    geminiService.initializeGemini();

    const server = app.listen(PORT, () => {
      console.log(`Smart Logistics Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Initialize Socket.IO for real-time communication
    initializeSocket(server);

    // Initial alert synchronization & periodic 5-minute background sync
    try {
      const { syncAllActiveShipmentsAlerts } = require('./services/alerts/autoAlertService');
      syncAllActiveShipmentsAlerts().catch((e) => console.error('[Server Startup] Alert sync error:', e.message));

      setInterval(async () => {
        try {
          console.log('[Background Service] Running periodic risk & hazard alert synchronization...');
          await syncAllActiveShipmentsAlerts();
        } catch (err) {
          console.error('[Background Service] Periodic alert sync error:', err.message);
        }
      }, 5 * 60 * 1000);
    } catch (aErr) {
      console.error('[Server Startup] Unable to start background alert sync service:', aErr.message);
    }

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down server gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('Error during MongoDB connection closure:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('==================================================');
    console.error('FATAL SERVER STARTUP ERROR:', error.message);
    console.error('==================================================');
    process.exit(1);
  }
};

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
});

startServer(); // Trigger refresh

