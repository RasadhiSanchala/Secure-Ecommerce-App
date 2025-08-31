const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// GET /products - Get all products (Public route, but can show different data based on auth)
router.get('/', optionalAuth, getProducts);

// GET /products/:id - Get single product (Public route)
router.get('/:id', optionalAuth, getProduct);

// POST /products - Create new product (Admin only)
router.post('/', authenticateToken, requireAdmin, createProduct);

// PUT /products/:id - Update product (Admin only)
router.put('/:id', authenticateToken, requireAdmin, updateProduct);

// DELETE /products/:id - Delete product (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

module.exports = router;