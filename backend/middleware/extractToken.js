// Middleware to extract JWT token from Authorization header
const extractToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.token = authHeader.substring(7); // Remove 'Bearer ' prefix
  } else {
    req.token = null;
  }
  
  next();
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid token.',
    });
  }
  next();
};

module.exports = { extractToken, requireAuth };