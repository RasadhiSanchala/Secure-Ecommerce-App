// backend/routes/userRoutes.js - Updated with authentication
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// Public routes
router.post('/login', userController.loginUser); // Moved to /auth/login
router.post('/register', userController.createUser); // Moved to /auth/register

// Protected routes - require authentication
router.get('/', authenticateToken, requireAdmin, userController.getUsers); // Only admins can see all users
router.get('/:id', authenticateToken, userController.getUserById); // Users can see their own profile + admins can see any
router.put('/:id', authenticateToken, userController.updateUser); // Users can update their own profile
router.delete('/:id', authenticateToken, requireAdmin, userController.deleteUser); // Only admins can delete

module.exports = router;