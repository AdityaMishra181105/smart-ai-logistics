const socketIO = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 */
const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const clientUrls = (process.env.CLIENT_URL || '')
          .split(',')
          .map((u) => u.trim().replace(/\/$/, ''))
          .filter(Boolean);

        const allowedOrigins = [
          ...clientUrls,
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175'
        ];

        const normalizedOrigin = origin.replace(/\/$/, '');
        let isAllowed =
          allowedOrigins.includes(normalizedOrigin) ||
          /^http:\/\/localhost:\d+$/.test(normalizedOrigin);

        if (!isAllowed) {
          try {
            const parsed = new URL(origin);
            if (parsed.hostname.endsWith('.vercel.app')) {
              isAllowed = true;
            }
          } catch (_) {}
        }

        if (isAllowed) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Handle vehicle location updates from mobile/GPS devices
    socket.on('vehicle:location:update', (data) => {
      console.log(`[Socket.IO] Vehicle location update:`, data);
      // Broadcast to all connected dashboards
      io.emit('vehicle:location:update', data);
    });

    // Handle incident reports
    socket.on('incident:new', (data) => {
      console.log(`[Socket.IO] New incident reported:`, data);
      io.emit('incident:new', data);
    });

    // Handle alert creation
    socket.on('alert:new', (data) => {
      console.log(`[Socket.IO] New alert:`, data);
      io.emit('alert:new', data);
    });

    // Handle shipment status updates
    socket.on('shipment:status:update', (data) => {
      console.log(`[Socket.IO] Shipment status update:`, data);
      io.emit('shipment:status:update', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log('✓ Socket.IO initialized successfully');
  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Emit vehicle location update to all connected clients
 */
const emitVehicleLocationUpdate = (vehicleData) => {
  if (io) {
    io.emit('vehicle:location:update', vehicleData);
  }
};

/**
 * Emit new incident to all connected clients
 */
const emitNewIncident = (incidentData) => {
  if (io) {
    io.emit('incident:new', incidentData);
  }
};

/**
 * Emit new alert to all connected clients
 */
const emitNewAlert = (alertData) => {
  if (io) {
    io.emit('alert:new', alertData);
  }
};

/**
 * Emit shipment status update to all connected clients
 */
const emitShipmentStatusUpdate = (shipmentData) => {
  if (io) {
    io.emit('shipment:status:update', shipmentData);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitVehicleLocationUpdate,
  emitNewIncident,
  emitNewAlert,
  emitShipmentStatusUpdate
};
