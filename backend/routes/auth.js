const express = require('express');
const router = express.Router();
const { api } = require('../utils/apiClient');
const { extractToken, requireAuth } = require('../middleware/extractToken');
const { registerLimiter, loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Apply token extraction to all routes
router.use(extractToken);

// ============================================
// 1. POST /api/auth/register
// ============================================
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const result = await api.auth.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.data?.details || null,
    });
  }
});

// ============================================
// 2. POST /api/auth/login
// ============================================
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const result = await api.auth.login(req.body);
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
// 3. POST /api/auth/logout
// ============================================
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const result = await api.auth.logout(req.token, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 4. GET /api/auth/me
// ============================================
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await api.auth.me(req.token);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 5. POST /api/auth/refresh
// ============================================
router.post('/refresh', async (req, res) => {
  try {
    const result = await api.auth.refresh(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 6. POST /api/auth/forgot-password
// ============================================
router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const result = await api.auth.forgotPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// 7. POST /api/auth/verify-otp
// ============================================
router.post('/verify-otp', async (req, res) => {
  try {
    const result = await api.auth.verifyOtp(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.data,
    });
  }
});

// ============================================
// 8. POST /api/auth/reset-password
// ============================================
router.post('/reset-password', requireAuth, async (req, res) => {
  try {
    const result = await api.auth.resetPassword(req.token, req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
    });
  }
});

// Legacy endpoints for backward compatibility
router.post('/signup', registerLimiter, async (req, res) => {
  try {
    const result = await api.auth.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.data?.details || null,
    });
  }
});

router.post('/signin', loginLimiter, async (req, res) => {
  try {
    const result = await api.auth.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.data?.details || null,
    });
  }
});

module.exports = router;