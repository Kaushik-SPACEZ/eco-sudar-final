const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const statisticsRoutes = require('./routes/statistics');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:8081'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'EcoSudar API Proxy is running',
    timestamp: new Date().toISOString(),
    apiBaseUrl: process.env.API_BASE_URL || 'https://api.ecosudar.com/api'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/statistics', statisticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal server error' 
  });
});

// Start server
const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`🚀 EcoSudar API Proxy Server is running`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
      console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🎯 Proxying to: ${process.env.API_BASE_URL || 'https://api.ecosudar.com/api'}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log('📋 Available Endpoints (23 total):');
      console.log('');
      console.log('🔐 Authentication (8):');
      console.log('  POST   /api/auth/register          - Register new user');
      console.log('  POST   /api/auth/login             - Login user');
      console.log('  POST   /api/auth/logout            - Logout user 🔒');
      console.log('  GET    /api/auth/me                - Get current user 🔒');
      console.log('  POST   /api/auth/refresh           - Refresh token');
      console.log('  POST   /api/auth/forgot-password   - Send OTP');
      console.log('  POST   /api/auth/verify-otp        - Verify OTP');
      console.log('  POST   /api/auth/reset-password    - Reset password 🔒');
      console.log('');
      console.log('👤 User Management (6):');
      console.log('  GET    /api/users/:id              - Get user by ID 🔒');
      console.log('  GET    /api/users/email/:email     - Get user by email 🔒');
      console.log('  PUT    /api/users/:id              - Update user 🔒');
      console.log('  PUT    /api/users/:id/password     - Change password 🔒');
      console.log('  DELETE /api/users/:id              - Delete user 🔒');
      console.log('  GET    /api/users/:userId/orders   - Get user orders 🔒');
      console.log('');
      console.log('📦 Products (3):');
      console.log('  GET    /api/products               - Get all products');
      console.log('  GET    /api/products/:id           - Get single product');
      console.log('  GET    /api/products/:id/configurations - Get configurations');
      console.log('');
      console.log('🛒 Orders (4):');
      console.log('  GET    /api/orders                 - Get all orders 🔒');
      console.log('  POST   /api/orders                 - Create order 🔒');
      console.log('  GET    /api/orders/:id             - Get single order 🔒');
      console.log('  PUT    /api/orders/:id/status      - Update order status 🔒');
      console.log('');
      console.log('📊 Statistics (2):');
      console.log('  GET    /api/statistics/orders      - Get order statistics 🔒');
      console.log('  GET    /api/statistics/active-orders - Get active orders 🔒');
      console.log('');
      console.log('🔒 = Requires Authentication');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;