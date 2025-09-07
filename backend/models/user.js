// backend/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 255
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // OAuth provider IDs
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  auth0Id: {
    type: String,
    sparse: true,
    unique: true
  },
  // Timestamps
  lastLogin: {
    type: Date,
    default: null
  },
  lastLogout: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // This adds createdAt and updatedAt
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ auth0Id: 1 });

// Virtual to check if user is OAuth user
userSchema.virtual('isOAuthUser').get(function() {
  return !!(this.googleId || this.auth0Id);
});

// Virtual to get OAuth provider
userSchema.virtual('oauthProvider').get(function() {
  if (this.googleId) return 'google';
  if (this.auth0Id) return 'auth0';
  return null;
});

// Method to check if user can change password
userSchema.methods.canChangePassword = function() {
  return !this.isOAuthUser || this.password !== 'oauth-user';
};

// Method to get safe user data (without sensitive info)
userSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    isAdmin: this.isAdmin,
    emailVerified: this.emailVerified,
    lastLogin: this.lastLogin,
    oauthProvider: this.oauthProvider,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);