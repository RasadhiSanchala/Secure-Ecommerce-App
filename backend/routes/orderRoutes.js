const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// GET /orders - Get all orders (Admin only can see all, users see their own)
router.get('/', authenticateToken, getOrders);

// GET /orders/:id - Get single order (Users can only see their own orders, admins can see any)
router.get('/:id', authenticateToken, getOrder);

// POST /orders - Create new order (Authenticated users only)
router.post('/', authenticateToken, createOrder);

// PUT /orders/:id/status - Update order status (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);

// DELETE /orders/:id - Delete order (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteOrder);

module.exports = router;