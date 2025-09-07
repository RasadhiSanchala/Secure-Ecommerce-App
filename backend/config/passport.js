// backend/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Auth0Strategy = require('passport-auth0');
const User = require('../models/user');

// Google OAuth Strategy
passport.use('google', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();

    if (!email) {
      return done(new Error('No email provided by Google'), null);
    }

    // Check if user already exists with this email
    let user = await User.findOne({ email });

    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user.googleId = profile.id;
        user.lastLogin = new Date();
        user.emailVerified=true;
        await user.save();
      } else {
        // Just update last login
        user.lastLogin = new Date();
        await user.save();
      }
      return done(null, user);
    } else {
      // Create new user with Google info
      user = new User({
        name: name || 'Google User',
        email,
        googleId: profile.id,
        password: 'oauth-user', // Placeholder password for OAuth users
        isAdmin: false,
        emailVerified: true,
        lastLogin: new Date()
      });
      await user.save();
      return done(null, user);
    }
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Auth0 Strategy
passport.use('auth0', new Auth0Strategy({
  domain: process.env.AUTH0_DOMAIN,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  callbackURL: '/auth/auth0/callback'
}, async (accessToken, refreshToken, extraParams, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const name = profile.displayName || profile.nickname || 'Auth0 User';

    if (!email) {
      return done(new Error('No email provided by Auth0'), null);
    }

    // Check if user already exists with this email
    let user = await User.findOne({ email });

    if (user) {
      // User exists, update Auth0 ID if not set
      if (!user.auth0Id) {
        user.auth0Id = profile.id;
        user.lastLogin = new Date();
        user.emailVerified = true;
        await user.save();
      } else {
        // Just update last login
        user.lastLogin = new Date();
        await user.save();
      }
      return done(null, user);
    } else {
      // Create new user with Auth0 info
      user = new User({
        name,
        email,
        auth0Id: profile.id,
        password: 'oauth-user', // Placeholder password for OAuth users
        isAdmin: false,
        lastLogin: new Date(),
        emailVerified: true
      });
      await user.save();
      return done(null, user);
    }
  } catch (error) {
    console.error('Auth0 OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session (though we're using JWT)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session (though we're using JWT)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;