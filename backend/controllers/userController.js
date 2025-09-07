// backend/controllers/userController.js
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { generateToken } = require('../utils/jwt');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

// Get all users (Admin only)
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users: users.map(user => user.toSafeObject()),
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: users.length,
        totalUsers: total
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const requestingUserId = req.user._id.toString();
    const targetUserId = req.params.id;

    // Users can only view their own profile unless they're admin
    if (!req.user.isAdmin && requestingUserId !== targetUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(targetUserId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.toSafeObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create user (Registration)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, isAdmin = false } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isAdmin: req.user?.isAdmin ? isAdmin : false // Only admins can create admin users
    });

    await user.save();

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const requestingUserId = req.user._id.toString();
    const targetUserId = req.params.id;
    const updates = req.body;

    // Users can only update their own profile unless they're admin
    if (!req.user.isAdmin && requestingUserId !== targetUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Prevent updating sensitive fields
    delete updates.password; // Use separate endpoint for password changes
    delete updates._id;
    delete updates.googleId;
    delete updates.auth0Id;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Only admins can change isAdmin status
    if (!req.user.isAdmin) {
      delete updates.isAdmin;
    }

    // Email change validation
    if (updates.email) {
      const existingUser = await User.findOne({
        email: updates.email.toLowerCase(),
        _id: { $ne: targetUserId }
      });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email already in use by another user'
        });
      }
      updates.email = updates.email.toLowerCase().trim();
    }

    // Name validation
    if (updates.name) {
      updates.name = updates.name.trim();
      if (updates.name.length < 2) {
        return res.status(400).json({
          message: 'Name must be at least 2 characters long'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
        targetUserId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser.toSafeObject());
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const requestingUserId = req.user._id.toString();
    const targetUserId = req.params.id;
    const { currentPassword, password: newPassword } = req.body;

    // Users can only change their own password unless they're admin
    if (!req.user.isAdmin && requestingUserId !== targetUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validation
    if (!newPassword) {
      return res.status(400).json({
        message: 'New password is required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters long'
      });
    }

    // Find the user
    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if this is an OAuth user
    if (user.isOAuthUser && user.password === 'oauth-user') {
      return res.status(400).json({
        message: `Cannot change password for ${user.oauthProvider} users. Please use ${user.oauthProvider} to manage your password.`,
        useOAuth: true,
        provider: user.oauthProvider
      });
    }

    // Verify current password (unless admin is changing another user's password)
    if (requestingUserId === targetUserId && currentPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          message: 'Current password is incorrect'
        });
      }
    } else if (requestingUserId === targetUserId && !currentPassword) {
      return res.status(400).json({
        message: 'Current password is required'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Password changed successfully',
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const requestingUserId = req.user._id.toString();
    const targetUserId = req.params.id;

    // Users can only delete their own account unless they're admin
    if (!req.user.isAdmin && requestingUserId !== targetUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const deletedUser = await User.findByIdAndDelete(targetUserId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      deletedUser: deletedUser.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// User login with JWT
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        message: 'Invalid email or password'
      });
    }

    // For OAuth users, prevent password login
    if (user.isOAuthUser && user.password === 'oauth-user') {
      return res.status(400).json({
        message: `Please use ${user.oauthProvider} login for this account`,
        useOAuth: true,
        provider: user.oauthProvider
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin
    });

    res.json({
      message: 'Login successful',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};