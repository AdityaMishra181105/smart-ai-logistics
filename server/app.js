const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables safely using dynamic directory resolver
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const app = express();

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
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
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// HTTP request logger
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health Check Route
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const isDbConnected = mongoose.connection.readyState === 1;

  if (!isDbConnected) {
    return res.status(503).json({
      success: false,
      status: 'Service Unavailable',
      message: 'Smart Logistics API is running but database is offline',
      database: 'DISCONNECTED',
      timestamp: new Date()
    });
  }

  res.status(200).json({
    success: true,
    status: 'Healthy',
    message: 'Smart Logistics API is running',
    database: 'CONNECTED',
    timestamp: new Date()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart AI Logistics API is live and operational',
    health: '/api/health',
    timestamp: new Date()
  });
});

// Import route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const routeMgmtRoutes = require('./routes/routeMgmtRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const riskRoutes = require('./routes/riskRoutes');
const aiRoutes = require('./routes/aiRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const alertRoutes = require('./routes/alertRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const environmentRoutes = require('./routes/environmentRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const geocodingRoutes = require('./routes/geocoding');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/routes', routeMgmtRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/environment', environmentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Fallback Route for undefined API endpoints
app.use('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found`
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Server Error Captured by Middleware:', err);

  let error = { ...err };
  error.message = err.message;

  // 1. Mongoose Bad ObjectId CastError
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: `Resource not found. Invalid field: ${err.path}`
    });
  }

  // 2. Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `A resource already exists with this ${field}`
    });
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'Internal Server Error'
  };

  // Only expose stack trace in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

module.exports = app;
