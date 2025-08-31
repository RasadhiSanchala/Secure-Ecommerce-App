// backend/config/passport.js
const passport = require('passport');
const OpenIDConnectStrategy = require('passport-openidconnect').Strategy;
const User = require('../models/user');

// Auth0 OpenID Connect Strategy
passport.use(new OpenIDConnectStrategy({
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  authorizationURL: `https://${process.env.AUTH0_DOMAIN}/authorize`,
  tokenURL: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
  userInfoURL: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/auth/auth0/callback',
  scope: 'openid profile email'
}, async (issuer, sub, profile, accessToken, refreshToken, done) => {
  try {
    // Extract user information from Auth0 profile
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const name = profile.displayName || profile.name || 'Unknown User';
    
    if (!email) {
      return done(new Error('No email provided by Auth0'), null);
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // User exists, update Auth0 info if needed
      if (!user.auth0Id) {
        user.auth0Id = sub;
        await user.save();
      }
      return done(null, user);
    } else {
      // Create new user with Auth0 info
      user = new User({
        name,
        email,
        auth0Id: sub,
        password: 'auth0-user', // Placeholder password for Auth0 users
        isAdmin: false
      });
      await user.save();
      return done(null, user);
    }
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;