// backend/server.js
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');

const connectDB = require('./config/db');
const passport = require('./config/passport');

const port = process.env.PORT || 3005;
const app = express();


// ==============================
// Middleware
// ==============================

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ==============================
// Passport
// ==============================

app.use(passport.initialize());


// ==============================
// Session
// ==============================

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      'your-session-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);


// ==============================
// Database
// ==============================

connectDB();


// ==============================
// Health Route
// ==============================

app.get('/', (req, res) => {
  res.json({
    message: 'API Server is running',
    endpoints: {
      users: '/users/*',
      products: '/products/*',
      orders: '/orders/*',
    },
  });
});


// ==============================
// Routes
// ==============================

app.use('/users', require('./routes/userRoutes'));
app.use('/products', require('./routes/productRoutes'));
app.use('/orders', require('./routes/orderRoutes'));
app.use('/auth', require('./routes/authRoutes'));


// ==============================
// Error Handler
// ==============================

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  res.status(500).json({
    message: 'Something went wrong!',
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal Server Error',
  });
});


// ==============================
// Local Server Only
// ==============================

if (require.main === module && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(
      `Server running on: http://localhost:${port}`
    );
    console.log(
      `Environment: ${process.env.NODE_ENV || 'development'}`
    );
  });
}


// ==============================
// Export for Vercel
// ==============================

module.exports = app;