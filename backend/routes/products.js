const express = require('express');
const router = express.Router();
const { api } = require('../utils/apiClient');

// ============================================
// 1. GET /api/products
// ============================================
router.get('/', async (req, res) => {
  try {
    const result = await api.products.getAll(req.query);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 2. GET /api/products/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const result = await api.products.getById(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 3. GET /api/products/:id/configurations
// ============================================
router.get('/:id/configurations', async (req, res) => {
  try {
    const result = await api.products.getConfigurations(req.params.id, req.query);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;