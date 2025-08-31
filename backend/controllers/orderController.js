const Order = require('../models/order');

// Get all orders - Admin sees all, users see only their own
exports.getOrders = async (req, res) => {
  try {
    let query = {};
    
    // If user is not admin, only show their own orders
    if (!req.user.isAdmin) {
      query.user = req.user._id;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('products.product', 'name description price')
      .sort({ createdAt: -1 }); // Most recent first

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single order - Users can only see their own orders, admins can see any
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
    res.json(order);
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

    res.status(201).json(populatedOrder);
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

    res.json(order);
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
        status: order.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};