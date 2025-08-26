const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');

// GET /orders - Get all orders
router.get('/', getOrders);

// GET /orders/:id - Get single order
router.get('/:id', getOrder);

// POST /orders - Create new order
router.post('/', createOrder);

// PUT /orders/:id/status - Update order status
router.put('/:id/status', updateOrderStatus);

// DELETE /orders/:id - Delete order
router.delete('/:id', deleteOrder);

module.exports = router;