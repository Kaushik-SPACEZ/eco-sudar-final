# 🚀 EcoSudar Backend - API Proxy Server

This is a Node.js/Express proxy server that forwards requests to the Hostinger PHP backend API.

## 📋 Overview

This backend acts as a **proxy layer** between your React Native app and the actual PHP backend hosted on Hostinger. It provides:

- ✅ **23 API endpoints** (Authentication, Users, Products, Orders, Statistics)
- ✅ **Rate limiting** for security
- ✅ **Token extraction** middleware
- ✅ **Error handling** and logging
- ✅ **CORS configuration** for mobile apps

## 🏗️ Architecture

```
React Native App
      ↓
Node.js Proxy (This Server)
      ↓
Hostinger PHP Backend (api.ecosudar.com)
      ↓
MySQL Database
```

## 📦 Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_BASE_URL=https://api.ecosudar.com/api
API_TIMEOUT=30000

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Endpoints

### 🔐 Authentication (8 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| POST | `/api/auth/logout` | ✅ | Logout user |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/refresh` | ❌ | Refresh token |
| POST | `/api/auth/forgot-password` | ❌ | Send OTP |
| POST | `/api/auth/verify-otp` | ❌ | Verify OTP |
| POST | `/api/auth/reset-password` | ✅ | Reset password |

### 👤 User Management (6 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/:id` | ✅ | Get user by ID |
| GET | `/api/users/email/:email` | ✅ | Get user by email |
| PUT | `/api/users/:id` | ✅ | Update user |
| PUT | `/api/users/:id/password` | ✅ | Change password |
| DELETE | `/api/users/:id` | ✅ | Delete user |
| GET | `/api/users/:userId/orders` | ✅ | Get user orders |

### 📦 Products (3 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | ❌ | Get all products |
| GET | `/api/products/:id` | ❌ | Get single product |
| GET | `/api/products/:id/configurations` | ❌ | Get configurations |

### 🛒 Orders (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders` | ✅ | Get all orders |
| POST | `/api/orders` | ✅ | Create order |
| GET | `/api/orders/:id` | ✅ | Get single order |
| PUT | `/api/orders/:id/status` | ✅ | Update order status |

### 📊 Statistics (2 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/statistics/orders` | ✅ | Get order statistics |
| GET | `/api/statistics/active-orders` | ✅ | Get active orders |

## 🔒 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🛡️ Rate Limiting

- **General:** 100 requests per 15 minutes
- **Registration:** 3 requests per hour
- **Login:** 5 requests per 15 minutes
- **OTP:** 3 requests per 15 minutes

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration (not used in proxy mode)
├── middleware/
│   ├── extractToken.js      # JWT token extraction
│   ├── rateLimiter.js       # Rate limiting middleware
│   └── auth.js              # Legacy auth middleware
├── routes/
│   ├── auth.js              # Authentication routes (8 endpoints)
│   ├── users.js             # User management routes (6 endpoints)
│   ├── products.js          # Product routes (3 endpoints)
│   ├── orders.js            # Order routes (4 endpoints)
│   └── statistics.js        # Statistics routes (2 endpoints)
├── utils/
│   └── apiClient.js         # Axios client for Hostinger API
├── database/
│   ├── schema.sql           # Legacy schema
│   └── schema_complete.sql  # Complete database schema for Hostinger
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Dependencies
├── server.js                # Main server file
├── API_DOCUMENTATION.md     # Legacy API docs
├── API_ENDPOINTS_SPECIFICATION.md  # Complete API specification
└── README.md                # This file
```

## 🧪 Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Test Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "password123",
    "user_type": "customer"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "password123"
  }'
```

### Test Protected Endpoint

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

## 🔧 Configuration

### CORS

Update `ALLOWED_ORIGINS` in `.env` to include your app's origin:

```env
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081,http://your-domain.com
```

### API Base URL

Point to your Hostinger backend:

```env
API_BASE_URL=https://api.ecosudar.com/api
```

### Rate Limiting

Adjust rate limits in `.env`:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100  # Max requests per window
```

## 📝 Error Handling

All errors are returned in this format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": {
    // Additional error details (optional)
  }
}
```

## 🚨 Common Issues

### 1. CORS Errors

**Problem:** Mobile app can't connect to server

**Solution:** Add your app's origin to `ALLOWED_ORIGINS` in `.env`

### 2. Connection Timeout

**Problem:** Requests timeout

**Solution:** Increase `API_TIMEOUT` in `.env` or check Hostinger backend status

### 3. Rate Limit Exceeded

**Problem:** Too many requests error

**Solution:** Wait for the rate limit window to reset or adjust limits in `.env`

## 📚 Documentation

- **API Specification:** See `API_ENDPOINTS_SPECIFICATION.md`
- **Database Schema:** See `database/schema_complete.sql`
- **Legacy Docs:** See `API_DOCUMENTATION.md`

## 🔄 Deployment

### Option 1: Deploy with Node.js Server

1. Set `NODE_ENV=production` in `.env`
2. Update `API_BASE_URL` to production URL
3. Run `npm start`

### Option 2: Deploy with PM2

```bash
npm install -g pm2
pm2 start server.js --name ecosudar-api
pm2 save
pm2 startup
```

### Option 3: Deploy with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📞 Support

For issues or questions:
- Check `API_ENDPOINTS_SPECIFICATION.md` for endpoint details
- Review error logs in console
- Verify Hostinger backend is running

## 📄 License

ISC

---

**Last Updated:** April 14, 2026  
**Version:** 1.0.0  
**Total Endpoints:** 23