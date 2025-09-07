# BakeHouse E-Commerce Application

A full-stack e-commerce web application for a bakery shop, built with Angular frontend and Node.js/Express.js backend with MongoDB database. Features product browsing, shopping cart functionality, and user authentication with Google OAuth and Auth0.

## 🚀 Features

### Core Features

-  Product catalog with detailed views
-  Shopping cart functionality
-  User authentication (Login/Register)
-  Responsive design
-  HTTPS development environment

### Bonus Features

-  OAuth integration (Google & Auth0)
-  Angular Signals for state management 
-  JWT-based authentication
-  Session management
-  Email verification

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v18+ recommended)
- **npm** (v8+ recommended)
- **MongoDB** (local installation or MongoDB Atlas)
- **Git**
- **OpenSSL** (for certificate generation)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/RasadhiSanchala/Secure-Ecommerce-App.git
cd Secure-Ecommerce-App
```

### 2. Generate SSL Certificates

The application requires HTTPS certificates for development. Generate them using the provided configuration. Make sure OpenSSL is installed and working on your OS to execute the following commands:

```bash
# Navigate to certs directory
cd certs

# Generate private key
openssl genrsa -out localhost.key 2048

# Generate certificate signing request using the provided localhost.conf
openssl req -new -key localhost.key -out localhost.csr -config localhost.conf

# Generate self-signed certificate
openssl x509 -req -in localhost.csr -signkey localhost.key -out localhost.crt -days 365 -extensions v3_req -extfile localhost.conf

# Verify certificate
openssl x509 -in localhost.crt -text -noout

# Return to project root
cd ..
```

Add the generated certificate to the trusted root certificate store of your OS.

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

#### Backend Environment Variables (.env)

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3005
FRONTEND_URL=https://localhost:4200

# Database
MONGO_URI=mongodb://localhost:27017/bakehouse
# OR for MongoDB Atlas:
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bakehouse

# JWT Configuration
JWT_SECRET=enter-your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your-session-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
```

#### OAuth Setup (Optional)

**Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `https://localhost:4200` to authorized javascript origins
6. Add `https://localhost:3005/auth/google/callback` to authorized redirect URIs

**Auth0:**

1. Sign up at [Auth0](https://auth0.com/)
2. Create a new application and choose regular web application
3. Configure allowed callback URLs: `https://localhost:3005/auth/auth0/callback`
4. Configure allowed logout URLs and allowed web origins: `https://localhost:4200`

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

#### Frontend Environment Configuration

The frontend environment is pre-configured in:

- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

Update the production environment file with your production API URL when deploying.

### 5. Database Setup

#### Option A: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service:

   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community

   # On Ubuntu
   sudo systemctl start mongod

   # On Windows
   net start MongoDB
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Create database user
4. Whitelist your IP address
5. Get connection string and update `MONGO_URI` in `.env`

## 🏃‍♂️ Running the Application

### Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

Backend will start at: `https://localhost:3005`

**Terminal 2 - Frontend:**

```bash
cd frontend
npm start
```

Frontend will start at: `https://localhost:4200`

### Production Mode

**Backend:**

```bash
cd backend
npm start
```

**Frontend:**

```bash
cd frontend
npm run build
npm run serve:ssr:frontend
```

## 🔧 Configuration Details

### SSL/HTTPS Configuration

Both frontend and backend are configured for HTTPS:

- **Backend**: Uses Express HTTPS server with certificates from `../certs/`
- **Frontend**: Angular dev server configured with SSL certificates
- **Certificate paths**:
  - Private key: `certs/localhost.key`
  - Certificate: `certs/localhost.crt`

### CORS Configuration

Backend CORS is configured to accept requests from:

- Development: `https://localhost:4200`
- Production: Environment variable `FRONTEND_URL`

### API Endpoints

Base URL: `https://localhost:3005`

```
GET    /                     # API status
POST   /auth/register        # User registration
POST   /auth/login           # User login
GET    /auth/google          # Google OAuth
GET    /auth/auth0           # Auth0 OAuth
POST   /auth/refresh         # Refresh JWT token
POST   /auth/logout          # Logout

GET    /users/profile        # Get user profile
PUT    /users/profile        # Update user profile

GET    /products             # Get all products
GET    /products/:id         # Get product by ID
POST   /products             # Create product (admin)
PUT    /products/:id         # Update product (admin)
DELETE /products/:id         # Delete product (admin)

GET    /orders               # Get user orders
POST   /orders               # Create order
GET    /orders/:id           # Get order by ID
PUT    /orders/:id           # Update order status (admin)
```

## 📁 Project Structure

```
bakehouse-ecommerce/
├── certs/                      # SSL certificates
│   ├── localhost.conf          # OpenSSL configuration
│   ├── localhost.key           # Private key
│   ├── localhost.crt           # Certificate
│   └── README.md              # Certificate generation guide
├── backend/                    # Node.js/Express API
│   ├── config/                # Database and auth config
│   ├── controllers/           # Route controllers
│   ├── middleware/            # Custom middleware
│   ├── models/                # Mongoose models
│   ├── routes/                # API routes
│   ├── utils/                 # Utility functions
│   ├── .env                   # Environment variables
│   ├── server.js              # Main server file
│   └── package.json           # Dependencies
├── frontend/                   # Angular application
│   ├── src/
│   │   ├── app/               # Angular components & services
│   │   ├── environments/      # Environment configs
│   │   └── assets/            # Static assets
│   ├── angular.json           # Angular configuration
│   └── package.json           # Dependencies
└── README.md                  # This file
```

## 🔒 Security Features

- **HTTPS**: Full HTTPS encryption for development
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: BCrypt for password security
- **CORS Protection**: Configured for specific origins
- **Helmet**: Security headers middleware
- **Input Validation**: Express-validator for API inputs
- **Session Security**: Secure session configuration

## 🚀 Deployment

### Backend Deployment

1. Set `NODE_ENV=production`
2. Update environment variables for production
3. Use process manager like PM2
4. Configure reverse proxy (Nginx)
5. Obtain proper SSL certificates

### Frontend Deployment

1. Build for production: `npm run build`
2. Deploy to static hosting (Netlify, Vercel) or serve with Express
3. Update API URL in environment.prod.ts

## 🐛 Troubleshooting

### Common Issues

**1. Certificate Errors**

- Ensure certificates are generated correctly
- Check file paths in angular.json and server.js
- Accept self-signed certificate in browser

**2. MongoDB Connection Issues**

- Verify MongoDB is running
- Check connection string format
- Ensure network access (for Atlas)

**3. CORS Errors**

- Verify frontend URL in backend CORS config
- Check environment variables
- Ensure credentials: true in requests

**4. OAuth Issues**

- Verify callback URLs in OAuth providers
- Check client ID/secret values
- Ensure HTTPS for OAuth callbacks

### Port Conflicts

- Backend: Change `PORT` in `.env`
- Frontend: Use `ng serve --port <number>`

## 📚 Dependencies

### Backend Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **passport**: Authentication middleware
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **dotenv**: Environment variable loading

### Frontend Dependencies

- **@angular/core**: Angular framework
- **@angular/router**: Routing
- **@angular/forms**: Form handling
- **rxjs**: Reactive programming

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request
