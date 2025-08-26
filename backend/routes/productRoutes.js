const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

// GET /products - Get all products
router.get('/', getProducts);

// GET /products/:id - Get single product
router.get('/:id', getProduct);

// POST /products - Create new product
router.post('/', createProduct);

// PUT /products/:id - Update product
router.put('/:id', updateProduct);

// DELETE /products/:id - Delete product
router.delete('/:id', deleteProduct);

module.exports = router;