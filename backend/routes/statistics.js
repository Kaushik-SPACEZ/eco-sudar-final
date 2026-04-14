const express = require('express');
const router = express.Router();
const { api } = require('../utils/apiClient');
const { extractToken, requireAuth } = require('../middleware/extractToken');

// Apply token extraction and require auth for all routes
router.use(extractToken);
router.use(requireAuth);

// ============================================
// 1. GET /api/statistics/orders
// ============================================
router.get('/orders', async (req, res) => {
  try {
    const result = await api.statistics.getOrders(req.token, req.query);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 2. GET /api/statistics/active-orders
// ============================================
router.get('/active-orders', async (req, res) => {
  try {
    const result = await api.statistics.getActiveOrders(req.token);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;