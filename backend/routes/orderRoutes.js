// backend/routes/orderRoutes.js - Updated with separate user and admin endpoints
const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getUserOrders,
  getAllOrdersAdmin
} = require('../controllers/orderController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// USER ORDER ENDPOINTS
// GET /orders/my - Get current user's orders only
router.get('/my', authenticateToken, getUserOrders);

// GET /orders/my/:id - Get single order for current user
router.get('/my/:id', authenticateToken, getOrder);

// POST /orders - Create new order (Authenticated users only)
router.post('/', authenticateToken, createOrder);

// ADMIN ORDER ENDPOINTS
// GET /orders/admin - Get all orders (Admin only)
router.get('/admin', authenticateToken, requireAdmin, getAllOrdersAdmin);

// GET /orders/admin/:id - Get any order by ID (Admin only)
router.get('/admin/:id', authenticateToken, requireAdmin, getOrder);

// PUT /orders/:id/status - Update order status (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);

// DELETE /orders/:id - Delete order (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteOrder);

// DEPRECATED - Keep for backward compatibility, but redirect to appropriate endpoint
// GET /orders - Redirect based on user role
router.get('/', authenticateToken, (req, res, next) => {
  if (req.user.isAdmin) {
    // Redirect admin users to admin endpoint
    return getAllOrdersAdmin(req, res, next);
  } else {
    // Redirect regular users to their orders
    return getUserOrders(req, res, next);
  }
});

// GET /orders/:id - Get single order (with proper access control)
router.get('/:id', authenticateToken, getOrder);

module.exports = router;