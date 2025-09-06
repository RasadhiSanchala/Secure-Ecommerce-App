// backend/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const { generateToken } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

// Traditional email/password login (from userController)
const userController = require('../controllers/userController');
router.post('/login', userController.loginUser);
router.post('/register', userController.createUser);

// Auth0 routes
router.get('/auth0', passport.authenticate('openidconnect'));

router.get('/auth0/callback', 
  passport.authenticate('openidconnect', { 
    failureRedirect: '/auth/failure',
    session: false // We'll use JWT instead of sessions
  }), 
  (req, res) => {
    // Successful authentication
    const token = generateToken({
      id: req.user._id,
      email: req.user.email,
      isAdmin: req.user.isAdmin
    });

    // Redirect to frontend with token
    // You can customize this URL based on your frontend setup
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:4200';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// Get current user profile (protected route)
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isAdmin: req.user.isAdmin,
      auth0Id: req.user.auth0Id || null
    }
  });
});

// Refresh token endpoint
router.post('/refresh', authenticateToken, (req, res) => {
  const newToken = generateToken({
    id: req.user._id,
    email: req.user.email,
    isAdmin: req.user.isAdmin
  });

  res.json({ 
    token: newToken,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isAdmin: req.user.isAdmin
    }
  });
});

// Logout endpoint (mainly for clearing frontend state)
router.post('/logout', (req, res) => {
  // With JWT, logout is mainly handled on the frontend by removing the token
  // But you can add token blacklisting logic here if needed
  res.json({ message: 'Logged out successfully' });
});

// Auth0 logout
router.get('/auth0/logout', (req, res) => {
  const returnTo = encodeURIComponent(process.env.FRONTEND_URL || 'https://localhost:4200');
  const logoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${returnTo}`;
  res.redirect(logoutUrl);
});

// Failure route
router.get('/failure', (req, res) => {
  res.status(401).json({ message: 'Authentication failed' });
});

module.exports = router;