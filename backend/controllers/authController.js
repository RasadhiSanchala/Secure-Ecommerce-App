// backend/controllers/authController.js
const passport = require('../config/passport');
const { generateToken } = require('../utils/jwt');
const User = require('../models/user');

// Google OAuth - Initiate
exports.googleAuth = (req, res, next) => {
    passport.authenticate('google', {
        scope: ['profile', 'email', 'openid']
    })(req, res, next);
};

// Google OAuth - Callback handler
exports.googleCallback = async (req, res, next) => {
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL}/auth/failure`
    }, (err, user) => {
        if (err) {
            console.error('Google OAuth error:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=oauth_error`);
        }

        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=user_not_found`);
        }

        try {
            // Generate JWT token
            const token = generateToken({
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            });

            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=google`);
        } catch (error) {
            console.error('Token generation error:', error);
            res.redirect(`${frontendUrl}/auth/failure?error=token_generation`);
        }
    })(req, res, next);
};

// Auth0 OAuth - Initiate
exports.auth0Auth = (req, res, next) => {
    passport.authenticate('auth0', {
        scope: 'openid profile email'
    })(req, res, next);
};

// Auth0 OAuth - Callback handler
exports.auth0Callback = (req, res, next) => {
    passport.authenticate('auth0', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL}/auth/failure`
    }, (err, user) => {
        if (err) {
            console.error('Auth0 OAuth error:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=oauth_error`);
        }

        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/auth/failure?error=user_not_found`);
        }

        try {
            // Generate JWT token
            const token = generateToken({
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            });

            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=auth0`);
        } catch (error) {
            console.error('Token generation error:', error);
            res.redirect(`${frontendUrl}/auth/failure?error=token_generation`);
        }
    })(req, res, next);
};

// Get current user profile (protected route)
exports.getProfile = async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                isAdmin: req.user.isAdmin,
                googleId: req.user.googleId || null,
                auth0Id: req.user.auth0Id || null,
                lastLogin: req.user.lastLogin
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve profile' });
    }
};

// Refresh JWT token
exports.refreshToken = async (req, res) => {
    try {
        const newToken = generateToken({
            id: req.user._id,
            email: req.user.email,
            isAdmin: req.user.isAdmin
        });

        res.json({
            token: newToken,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                isAdmin: req.user.isAdmin,
                lastLogin: req.user.lastLogin
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to refresh token' });
    }
};

// Logout endpoint
exports.logout = async (req, res) => {
    try {
        // Update last logout time if needed
        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, { lastLogout: new Date() });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Logout failed' });
    }
};

// Google logout
exports.googleLogout = (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    // Google doesn't have a central logout URL like Auth0, so redirect to frontend
    res.redirect(`${frontendUrl}/auth/logout-success?provider=google`);
};

// Auth0 logout
exports.auth0Logout = (req, res) => {
    const returnTo = encodeURIComponent(process.env.FRONTEND_URL || 'http://localhost:4200');
    const logoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${returnTo}`;
    res.redirect(logoutUrl);
};

// Failure handler
exports.authFailure = (req, res) => {
    const error = req.query.error || 'authentication_failed';
    res.status(401).json({
        message: 'Authentication failed',
        error,
        redirectUrl: `${process.env.FRONTEND_URL}/login`
    });
};