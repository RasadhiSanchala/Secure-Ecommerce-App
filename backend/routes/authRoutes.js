// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { generateToken } = require('../utils/jwt');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Traditional email/password login (from userController)
const userController = require('../controllers/userController');
router.post('/login', userController.loginUser);
router.post('/register', userController.createUser);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/google/logout', authController.googleLogout);

// Auth0 OAuth routes
router.get('/auth0', authController.auth0Auth);
router.get('/auth0/callback', authController.auth0Callback);
router.get('/auth0/logout', authController.auth0Logout);

// Protected routes (require JWT authentication)
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/refresh', authenticateToken, authController.refreshToken);
router.post('/logout', authenticateToken, authController.logout);

// Authentication result handlers
router.get('/failure', authController.authFailure);

module.exports = router;