// backend/controllers/orderController.js
const Order = require('../models/order');
const Product = require('../models/product');

// USER ORDER FUNCTIONS

// Get current user's orders only - MUST RETURN UserOrdersResponse FORMAT
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
        .populate('user', 'name email')
        .populate('products.product', 'name description price imageUrl')
        .sort({ createdAt: -1 }); // Most recent first

    // EXACT FORMAT your frontend expects for UserOrdersResponse
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

// Get all orders - Admin only - MUST RETURN AdminOrdersResponse FORMAT
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
        .populate('products.product', 'name description price imageUrl')
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
          averageOrderValue: { $avg: '$total' }
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

    // EXACT FORMAT your frontend expects for AdminOrdersResponse
    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders,
        limit: parseInt(limit)
      },
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      },
      statusBreakdown,
      message: 'All orders retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SHARED FUNCTIONS (used by both user and admin endpoints)

// Get single order - with proper access control - MUST RETURN OrderResponse FORMAT
exports.getOrder = async (req, res) => {
  try {
    let query = { _id: req.params.id };

    // If user is not admin, ensure they can only see their own order
    if (!req.user.isAdmin) {
      query.user = req.user._id;
    }

    const order = await Order.findOne(query)
        .populate('user', 'name email')
        .populate('products.product', 'name description price imageUrl');

    if (!order) {
      return res.status(404).json({
        message: req.user.isAdmin ? 'Order not found' : 'Order not found or access denied'
      });
    }

    // EXACT FORMAT your frontend expects for OrderResponse
    res.json({
      order,
      message: 'Order retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create order - Automatically assign to the authenticated user + UPDATE STOCK
exports.createOrder = async (req, res) => {
  try {
    // Ensure the order is created for the authenticated user
    const orderData = {
      ...req.body,
      user: req.user._id // Override any user field with authenticated user
    };

    // Validate that products exist, check stock, and calculate total
    let calculatedTotal = 0;
    const stockUpdates = []; // Track stock updates to apply after successful order creation

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

        // Check if enough stock is available
        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Only ${product.stock} items available, but ${item.quantity} requested.`
          });
        }

        // Store the stock update info
        stockUpdates.push({
          productId: product._id,
          newStock: product.stock - item.quantity
        });

        item.priceAtTime = product.price;
        calculatedTotal += product.price * (item.quantity || 1);
      }
    }

    // Use calculated total instead of user-provided total for security
    orderData.total = calculatedTotal;

    // Create and save the order
    const order = new Order(orderData);
    const savedOrder = await order.save();

    // Update product stock quantities AFTER successful order creation
    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(
          update.productId,
          {
            stock: update.newStock,
            updatedAt: new Date()
          }
      );
    }

    // Populate the saved order before returning
    const populatedOrder = await Order.findById(savedOrder._id)
        .populate('user', 'name email')
        .populate('products.product', 'name description price imageUrl');

    // EXACT FORMAT your frontend expects for OrderResponse
    res.status(201).json({
      order: populatedOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update order status - Admin only - MUST RETURN OrderResponse FORMAT
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status values
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
          status,
          updatedAt: new Date()
        },
        { new: true }
    ).populate('user', 'name email')
        .populate('products.product', 'name description price imageUrl');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // EXACT FORMAT your frontend expects for OrderResponse
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
    const order = await Order.findById(req.params.id)
        .populate('products.product', 'name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If the order is being cancelled/deleted, optionally restore stock
    // This is a business decision - you might want to restore stock only for certain statuses
    if (order.status === 'pending' || order.status === 'processing') {
      for (const item of order.products) {
        await Product.findByIdAndUpdate(
            item.product._id,
            {
              $inc: { stock: item.quantity }, // Increment stock back
              updatedAt: new Date()
            }
        );
      }
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Order deleted successfully',
      deletedOrder: {
        id: order._id,
        status: order.status,
        total: order.total,
        productCount: order.products.length
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