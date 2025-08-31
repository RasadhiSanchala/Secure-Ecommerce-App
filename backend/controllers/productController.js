const Product = require('../models/product');

// Get all products - Public route, but can show additional data for admins
exports.getProducts = async (req, res) => {
  try {
    let query = {};
    let selectFields = '';

    // For non-admin users, only show available products
    if (!req.user || !req.user.isAdmin) {
      query.available = true;
    }

    // Admins can see all fields, regular users see limited fields
    if (!req.user || !req.user.isAdmin) {
      selectFields = 'name description price category imageUrl available';
    }

    const products = await Product.find(query, selectFields).sort({ createdAt: -1 });
    
    res.json({
      products,
      count: products.length,
      isAdmin: req.user ? req.user.isAdmin : false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product - Public route
exports.getProduct = async (req, res) => {
  try {
    let query = { _id: req.params.id };
    let selectFields = '';

    // For non-admin users, only show available products
    if (!req.user || !req.user.isAdmin) {
      query.available = true;
      selectFields = 'name description price category imageUrl available createdAt';
    }

    const product = await Product.findOne(query, selectFields);
    
    if (!product) {
      return res.status(404).json({ 
        message: req.user && req.user.isAdmin ? 'Product not found' : 'Product not found or not available' 
      });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create product - Admin only
exports.createProduct = async (req, res) => {
  try {
    // Validate required fields
    const { name, price, category } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ 
        message: 'Name, price, and category are required' 
      });
    }

    // Validate price is positive
    if (price < 0) {
      return res.status(400).json({ 
        message: 'Price must be a positive number' 
      });
    }

    const product = new Product({
      ...req.body,
      createdAt: new Date()
    });
    
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update product - Admin only
exports.updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Validate price if provided
    if (updateData.price !== undefined && updateData.price < 0) {
      return res.status(400).json({ 
        message: 'Price must be a positive number' 
      });
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product - Admin only
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ 
      message: 'Product deleted successfully',
      deletedProduct: {
        id: product._id,
        name: product.name,
        category: product.category,
        price: product.price
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};