// backend/controllers/orderController.js - Updated with separate user and admin functions
const Order = require('../models/order');

// USER ORDER FUNCTIONS

// Get current user's orders only
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
        .populate('user', 'name email')
        .populate('products.product', 'name description price')
        .sort({ createdAt: -1 }); // Most recent first

    res.json({
      orders,
      count: orders.length,
      message: 'User orders retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN ORDER FUNCTIONS

// Get all orders - Admin only
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { status, userId, limit = 50, page = 1 } = req.query;

    let query = {};

    // Apply filters if provided
    if (status) {
      query.status = status;
    }

    if (userId) {
      query.user = userId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
        .populate('user', 'name email')
        .populate('products.product', 'name description price')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);

    // Calculate stats for admin dashboard
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          statusCounts: {
            $push: {
              status: '$status',
              count: 1
            }
          }
        }
      }
    ]);

    // Calculate status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' }
        }
      }
    ]);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders,
        limit: parseInt(limit)
      },
      stats: stats[0] || {},
      statusBreakdown,
      message: 'All orders retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SHARED FUNCTIONS (used by both user and admin endpoints)

// Get single order - with proper access control
exports.getOrder = async (req, res) => {
  try {
    let query = { _id: req.params.id };

    // If user is not admin, ensure they can only see their own order
    if (!req.user.isAdmin) {
      query.user = req.user._id;
    }

    const order = await Order.findOne(query)
        .populate('user', 'name email')
        .populate('products.product', 'name description price');

    if (!order) {
      return res.status(404).json({
        message: req.user.isAdmin ? 'Order not found' : 'Order not found or access denied'
      });
    }

    res.json({
      order,
      message: 'Order retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create order - Automatically assign to the authenticated user
exports.createOrder = async (req, res) => {
  try {
    // Ensure the order is created for the authenticated user
    const orderData = {
      ...req.body,
      user: req.user._id // Override any user field with authenticated user
    };

    // Validate that products exist and calculate total
    const Product = require('../models/product');
    let calculatedTotal = 0;

    if (orderData.products && orderData.products.length > 0) {
      for (let item of orderData.products) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({
            message: `Product with ID ${item.product} not found`
          });
        }
        if (!product.available) {
          return res.status(400).json({
            message: `Product ${product.name} is not available`
          });
        }
        item.priceAtTime = product.price;
        calculatedTotal += product.price * (item.quantity || 1);
      }
    }

    // Use calculated total instead of user-provided total for security
    orderData.total = calculatedTotal;

    const order = new Order(orderData);
    const savedOrder = await order.save();

    // Populate the saved order before returning
    const populatedOrder = await Order.findById(savedOrder._id)
        .populate('user', 'name email')
        .populate('products.product', 'name description price');

    res.status(201).json({
      order: populatedOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update order status - Admin only
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status values
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status, updatedAt: new Date() },
        { new: true }
    ).populate('user', 'name email')
        .populate('products.product', 'name description price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      order,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete order - Admin only
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      message: 'Order deleted successfully',
      deletedOrder: {
        id: order._id,
        user: order.user,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DEPRECATED - Keep for backward compatibility
exports.getOrders = async (req, res) => {
  // This function now delegates to the appropriate function based on user role
  if (req.user.isAdmin) {
    return exports.getAllOrdersAdmin(req, res);
  } else {
    return exports.getUserOrders(req, res);
  }
};