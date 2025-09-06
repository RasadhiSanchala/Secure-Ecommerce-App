// backend/routes/userRoutes.js - Updated with authentication
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// Public routes
router.post('/login', userController.loginUser); // Moved to /auth/login
router.post('/register', userController.createUser); // Moved to /auth/register

// Protected routes - require authentication
// Get all users (Admin only)
router.get('/', authenticateToken, requireAdmin, userController.getUsers);

// Get user by ID (users can view their own profile, admins can view any)
router.get('/:id', authenticateToken, userController.getUserById);

// Update user profile (users can update their own profile, admins can update any)
router.put('/:id', authenticateToken, userController.updateUser);

// Change password (separate endpoint for security)
router.put('/:id/password', authenticateToken, userController.changePassword);

// Delete user (users can delete their own account, admins can delete any)
router.delete('/:id', authenticateToken, userController.deleteUser);

module.exports = router;