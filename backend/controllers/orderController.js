// backend/controllers/orderController.js
const Order = require('../models/order');
const Product = require('../models/product');

// Get orders for authenticated user
exports.getUserOrders = async (req, res) => {
  try {
    // Only show orders for the authenticated user
    const orders = await Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .populate('user', 'name email')
        .populate('products.product', 'name description price imageUrl');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders - Admin only
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
        .sort({ createdAt: -1 })
        .populate('user', 'name email')
        .populate('products.product', 'name description price imageUrl');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get orders - will route to appropriate function based on user role
exports.getOrders = async (req, res) => {
  try {
    if (req.user.isAdmin) {
      return exports.getAllOrdersAdmin(req, res);
    } else {
      return exports.getUserOrders(req, res);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single order with proper access control
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email')
        .populate('products.product', 'name description price imageUrl');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Allow access if user is admin OR if the order belongs to the authenticated user
    if (!req.user.isAdmin && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
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

    // Update product stock quantities
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

    res.status(201).json({
      order: populatedOrder,
      message: 'Order created successfully and stock updated'
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