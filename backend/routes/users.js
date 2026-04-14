const express = require('express');
const router = express.Router();
const { api } = require('../utils/apiClient');
const { extractToken, requireAuth } = require('../middleware/extractToken');

// Apply token extraction and require auth for all routes
router.use(extractToken);
router.use(requireAuth);

// ============================================
// 1. GET /api/users/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const result = await api.users.getById(req.token, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 2. GET /api/users/email/:email
// ============================================
router.get('/email/:email', async (req, res) => {
  try {
    const result = await api.users.getByEmail(req.token, req.params.email);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 3. PUT /api/users/:id
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const result = await api.users.update(req.token, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.data?.details || null,
    });
  }
});

// ============================================
// 4. PUT /api/users/:id/password
// ============================================
router.put('/:id/password', async (req, res) => {
  try {
    const result = await api.users.updatePassword(req.token, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 5. DELETE /api/users/:id
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const result = await api.users.delete(req.token, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 6. GET /api/users/:userId/orders
// ============================================
router.get('/:userId/orders', async (req, res) => {
  try {
    const result = await api.users.getOrders(req.token, req.params.userId, req.query);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;