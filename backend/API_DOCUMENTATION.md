# 🚀 EcoSudar Backend API Documentation

## 📊 Overview

This document provides complete API documentation for the EcoSudar backend, including all endpoints, request/response formats, authentication details, and setup instructions.

**Base URL:**
- Production: `https://your-domain.com/api`
- Local Development: `http://localhost:3000/api`

**API Version:** 1.0.0

---

## 📑 Table of Contents

1. [Authentication](#authentication)
2. [Health Check](#health-check)
3. [Authentication Endpoints](#authentication-endpoints)
4. [Product Endpoints](#product-endpoints)
5. [Order Endpoints](#order-endpoints)
6. [Error Handling](#error-handling)
7. [Database Schema](#database-schema)
8. [Setup Instructions](#setup-instructions)

---

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header for protected endpoints:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Token Details:**
- Token expires in 7 days (configurable)
- Token contains: user id, email, and name
- Generated on signup and signin

---

## 🏥 Health Check

### Check API Status

**Endpoint:** `GET /health`

**Description:** Check if the API server is running

**Authentication:** Not required

**Request Example:**
```bash
curl http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "EcoSudar API is running",
  "timestamp": "2026-04-14T12:23:38.000Z"
}
```

---

## 🔑 Authentication Endpoints

### 1. User Signup

**Endpoint:** `POST /api/auth/signup`

**Description:** Register a new user account

**Authentication:** Not required

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "password123"
}
```

**Validation Rules:**
- `name`: Required, non-empty string
- `email`: Required, valid email format
- `phone`: Required, non-empty string
- `password`: Required, minimum 6 characters

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Email already registered"
}
```

**Error Response (400 Validation Error):**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Valid email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

---

### 2. User Signin

**Endpoint:** `POST /api/auth/signin`

**Description:** Login with existing user credentials

**Authentication:** Not required

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Get details of the currently authenticated user

**Authentication:** Required

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access token required"
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## 📦 Product Endpoints

### 1. Get All Products

**Endpoint:** `GET /api/products`

**Description:** Retrieve all products with their size variations

**Authentication:** Not required (public endpoint)

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "premium", "standard", "basic")
- `is_active` (optional): Filter active products (default: "true")

**Request Example:**
```bash
curl "http://localhost:3000/api/products?category=premium&is_active=true"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "EcoSudar Premium",
        "description": "High-quality eco-friendly product",
        "base_price": 1000.00,
        "category": "premium",
        "is_active": true,
        "created_at": "2026-04-14T10:00:00.000Z",
        "updated_at": "2026-04-14T10:00:00.000Z",
        "sizes": [
          {
            "id": 1,
            "size": "Small",
            "price": 1000.00,
            "is_available": true
          },
          {
            "id": 2,
            "size": "Medium",
            "price": 1500.00,
            "is_available": true
          },
          {
            "id": 3,
            "size": "Large",
            "price": 2000.00,
            "is_available": true
          }
        ]
      },
      {
        "id": 2,
        "name": "EcoSudar Standard",
        "description": "Standard eco-friendly product",
        "base_price": 750.00,
        "category": "standard",
        "is_active": true,
        "created_at": "2026-04-14T10:00:00.000Z",
        "updated_at": "2026-04-14T10:00:00.000Z",
        "sizes": [
          {
            "id": 4,
            "size": "Small",
            "price": 750.00,
            "is_available": true
          },
          {
            "id": 5,
            "size": "Medium",
            "price": 1100.00,
            "is_available": true
          },
          {
            "id": 6,
            "size": "Large",
            "price": 1500.00,
            "is_available": true
          }
        ]
      }
    ],
    "count": 2
  }
}
```

---

### 2. Get Single Product

**Endpoint:** `GET /api/products/:id`

**Description:** Get detailed information about a specific product

**Authentication:** Not required

**URL Parameters:**
- `id`: Product ID (integer)

**Request Example:**
```bash
curl http://localhost:3000/api/products/1
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "EcoSudar Premium",
      "description": "High-quality eco-friendly product",
      "base_price": 1000.00,
      "category": "premium",
      "is_active": true,
      "created_at": "2026-04-14T10:00:00.000Z",
      "updated_at": "2026-04-14T10:00:00.000Z",
      "sizes": [
        {
          "id": 1,
          "size": "Small",
          "price": 1000.00,
          "is_available": true
        },
        {
          "id": 2,
          "size": "Medium",
          "price": 1500.00,
          "is_available": true
        },
        {
          "id": 3,
          "size": "Large",
          "price": 2000.00,
          "is_available": true
        }
      ]
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

### 3. Get Product Categories

**Endpoint:** `GET /api/products/meta/categories`

**Description:** Get list of all available product categories

**Authentication:** Not required

**Request Example:**
```bash
curl http://localhost:3000/api/products/meta/categories
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": ["premium", "standard", "basic"]
  }
}
```

---

## 🛒 Order Endpoints

### 1. Create Order

**Endpoint:** `POST /api/orders`

**Description:** Create a new order for a product

**Authentication:** Optional (can be used with or without authentication)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN (optional)
```

**Request Body (Customer Order):**
```json
{
  "product_id": 1,
  "size": "Medium",
  "quantity": 2,
  "purpose": "Personal Use",
  "sub_purpose": "Home Garden",
  "customer": {
    "type": "customer",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "9876543210",
    "address": "123 Main Street, Apartment 4B",
    "city": "Mumbai",
    "pincode": "400001"
  }
}
```

**Request Body (Dealer Order):**
```json
{
  "product_id": 1,
  "size": "Large",
  "quantity": 10,
  "purpose": "Business",
  "sub_purpose": "Resale",
  "customer": {
    "type": "dealer",
    "name": "ABC Enterprises",
    "email": "abc@example.com",
    "phone": "9876543210",
    "address": "456 Business Park, Sector 5",
    "city": "Delhi",
    "pincode": "110001",
    "businessName": "ABC Enterprises Pvt Ltd",
    "contactPerson": "Rajesh Kumar",
    "udyamNumber": "UDYAM-XX-00-1234567",
    "gstNumber": "29ABCDE1234F1Z5"
  }
}
```

**Validation Rules:**
- `product_id`: Required, must be valid integer
- `size`: Required, non-empty string
- `quantity`: Required, minimum 1
- `customer.type`: Required, must be "customer" or "dealer"
- `customer.name`: Required, non-empty string
- `customer.phone`: Required, non-empty string
- `customer.address`: Required, non-empty string
- `customer.city`: Required, non-empty string
- `customer.pincode`: Required, non-empty string
- For dealers: `businessName`, `contactPerson`, `udyamNumber`, `gstNumber` are optional

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "id": 1,
      "order_number": "ES-A3B5C7",
      "user_id": 1,
      "customer_id": 1,
      "product_id": 1,
      "size": "Medium",
      "quantity": 2,
      "purpose": "Personal Use",
      "sub_purpose": "Home Garden",
      "unit_price": 1500.00,
      "subtotal": 3000.00,
      "delivery_fee": 150.00,
      "total": 3150.00,
      "status": "pending",
      "payment_status": "pending",
      "notes": null,
      "created_at": "2026-04-14T12:30:00.000Z",
      "updated_at": "2026-04-14T12:30:00.000Z",
      "product_name": "EcoSudar Premium",
      "customer_name": "Jane Smith",
      "customer_phone": "9876543210",
      "customer_address": "123 Main Street, Apartment 4B"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Product or size not available"
}
```

**Error Response (400 Validation Error):**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Valid product ID is required",
      "param": "product_id",
      "location": "body"
    }
  ]
}
```

**Pricing Calculation:**
- `unit_price`: Price of selected product size
- `subtotal`: unit_price × quantity
- `delivery_fee`: Fixed at ₹150.00
- `total`: subtotal + delivery_fee

---

### 2. Get All Orders

**Endpoint:** `GET /api/orders`

**Description:** Retrieve all orders (filtered by authenticated user if token provided)

**Authentication:** Optional (returns user's orders if authenticated, all orders if not)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN (optional)
```

**Query Parameters:**
- `status` (optional): Filter by order status
  - Values: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`
- `limit` (optional): Number of results to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Request Example:**
```bash
curl "http://localhost:3000/api/orders?status=pending&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "order_number": "ES-A3B5C7",
        "user_id": 1,
        "customer_id": 1,
        "product_id": 1,
        "size": "Medium",
        "quantity": 2,
        "purpose": "Personal Use",
        "sub_purpose": "Home Garden",
        "unit_price": 1500.00,
        "subtotal": 3000.00,
        "delivery_fee": 150.00,
        "total": 3150.00,
        "status": "pending",
        "payment_status": "pending",
        "notes": null,
        "created_at": "2026-04-14T12:30:00.000Z",
        "updated_at": "2026-04-14T12:30:00.000Z",
        "product_name": "EcoSudar Premium",
        "customer_name": "Jane Smith",
        "customer_phone": "9876543210"
      }
    ],
    "count": 1
  }
}
```

---

### 3. Get Single Order

**Endpoint:** `GET /api/orders/:id`

**Description:** Get detailed information about a specific order

**Authentication:** Optional (returns order if user owns it when authenticated)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN (optional)
```

**URL Parameters:**
- `id`: Order ID (integer)

**Request Example:**
```bash
curl http://localhost:3000/api/orders/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_number": "ES-A3B5C7",
      "user_id": 1,
      "customer_id": 1,
      "product_id": 1,
      "size": "Medium",
      "quantity": 2,
      "purpose": "Personal Use",
      "sub_purpose": "Home Garden",
      "unit_price": 1500.00,
      "subtotal": 3000.00,
      "delivery_fee": 150.00,
      "total": 3150.00,
      "status": "pending",
      "payment_status": "pending",
      "notes": null,
      "created_at": "2026-04-14T12:30:00.000Z",
      "updated_at": "2026-04-14T12:30:00.000Z",
      "product_name": "EcoSudar Premium",
      "product_description": "High-quality eco-friendly product",
      "customer_type": "customer",
      "customer_name": "Jane Smith",
      "customer_email": "jane@example.com",
      "customer_phone": "9876543210",
      "customer_address": "123 Main Street, Apartment 4B",
      "customer_city": "Mumbai",
      "customer_pincode": "400001",
      "business_name": null,
      "contact_person": null,
      "udyam_number": null,
      "gst_number": null
    },
    "history": [
      {
        "id": 1,
        "order_id": 1,
        "status": "pending",
        "notes": null,
        "changed_by": 1,
        "created_at": "2026-04-14T12:30:00.000Z"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Order not found"
}
```

---

### 4. Update Order Status

**Endpoint:** `PATCH /api/orders/:id/status`

**Description:** Update the status of an existing order

**Authentication:** Required

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**URL Parameters:**
- `id`: Order ID (integer)

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Order confirmed and ready for processing"
}
```

**Valid Status Values:**
- `pending`: Order placed, awaiting confirmation
- `confirmed`: Order confirmed by seller
- `processing`: Order is being prepared
- `shipped`: Order has been shipped
- `delivered`: Order delivered to customer
- `cancelled`: Order cancelled

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated successfully"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access token required"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Order not found"
}
```

**Error Response (400 Validation Error):**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Invalid status",
      "param": "status",
      "location": "body"
    }
  ]
}
```

---

## ⚠️ Error Handling

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Validation Error Response Format

```json
{
  "success": false,
  "errors": [
    {
      "msg": "Error message",
      "param": "field_name",
      "location": "body"
    }
  ]
}
```

### HTTP Status Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data or validation error
- `401 Unauthorized`: Authentication required or token missing
- `403 Forbidden`: Invalid or expired token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## 🗄️ Database Schema

### Tables Overview

1. **users** - User accounts with authentication
2. **products** - Product catalog
3. **product_sizes** - Product size variations with pricing
4. **customers** - Customer information (regular & dealers)
5. **orders** - Order records
6. **order_status_history** - Order status tracking

### Schema Details

#### users
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
```

#### products
```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);
```

#### product_sizes
```sql
CREATE TABLE product_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
);
```

#### customers
```sql
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type ENUM('customer', 'dealer') NOT NULL DEFAULT 'customer',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    business_name VARCHAR(255),
    contact_person VARCHAR(255),
    udyam_number VARCHAR(50),
    gst_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_phone (phone)
);
```

#### orders
```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    purpose VARCHAR(255),
    sub_purpose VARCHAR(255),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 150.00,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_number (order_number),
    INDEX idx_user (user_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);
```

#### order_status_history
```sql
CREATE TABLE order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL,
    notes TEXT,
    changed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order (order_id)
);
```

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MySQL database (Hostinger or any MySQL server)
- npm or pnpm package manager

### Step 1: Database Setup

1. **Create MySQL Database in Hostinger**
   - Log into Hostinger Control Panel
   - Navigate to "Databases" → "MySQL Databases"
   - Click "Create New Database"
   - Note down the credentials:
     - DB_HOST (e.g., mysql.hostinger.com)
     - DB_USER (e.g., u123456_ecosudar)
     - DB_PASSWORD
     - DB_NAME (e.g., u123456_ecosudar_db)

2. **Import Database Schema**
   - Open phpMyAdmin from Hostinger control panel
   - Select your newly created database
   - Go to "Import" tab
   - Upload `backend/database/schema.sql`
   - Click "Go" to execute
   - Verify all tables are created

### Step 2: Backend Configuration

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Edit `.env` file with your credentials:**
```env
PORT=3000
NODE_ENV=production

# Your Hostinger MySQL credentials
DB_HOST=mysql.hostinger.com
DB_USER=u123456_ecosudar
DB_PASSWORD=your_secure_password
DB_NAME=u123456_ecosudar_db
DB_PORT=3306

# Generate a strong random string (use: openssl rand -base64 32)
JWT_SECRET=your-super-secret-random-string-here
JWT_EXPIRES_IN=7d

# Update after deployment
ALLOWED_ORIGINS=http://localhost:8081,exp://localhost:8081,https://your-app-domain.com
```

### Step 3: Local Testing

1. **Start development server:**
```bash
npm run dev
```

2. **Test health endpoint:**
```bash
curl http://localhost:3000/health
```

3. **Test signup endpoint:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "password123"
  }'
```

### Step 4: Deploy to Hostinger

#### Option A: Node.js Hosting

1. Upload backend folder via FTP/File Manager
2. Install dependencies: `npm install --production`
3. Set environment variables in Hostinger control panel
4. Start server: `npm start`

#### Option B: VPS/Cloud Hosting

1. **SSH into server:**
```bash
ssh username@your-server-ip
```

2. **Upload and setup:**
```bash
cd /var/www/
# Upload files via FTP or git clone
cd backend
npm install --production
```

3. **Install PM2 Process Manager:**
```bash
npm install -g pm2
pm2 start server.js --name ecosudar-api
pm2 save
pm2 startup
```

4. **Configure Nginx (reverse proxy):**
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Enable SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d api.your-domain.com
```

### Step 5: Update Mobile App

Update your React Native app's API base URL:

```javascript
// In your app configuration
const API_BASE_URL = 'https://api.your-domain.com/api';
```

Update CORS origins in backend `.env`:
```env
ALLOWED_ORIGINS=https://your-app-domain.com,exp://your-expo-url
```

---

## 🔒 Security Features

- **Helmet.js**: Security headers protection
- **CORS**: Cross-Origin Resource Sharing protection
- **JWT**: Secure token-based authentication
- **bcrypt**: Password hashing (10 rounds)
- **SQL Injection Prevention**: Parameterized queries
- **Input Validation**: express-validator for all inputs
- **Rate Limiting**: Recommended for production

---

## 📝 Testing with cURL

### Test Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "password123"
  }'
```

### Test Signin
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Get Products
```bash
curl http://localhost:3000/api/products
```

### Test Create Order (with token)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "product_id": 1,
    "size": "Medium",
    "quantity": 2,
    "customer": {
      "type": "customer",
      "name": "Jane Smith",
      "phone": "9876543210",
      "address": "123 Main Street",
      "city": "Mumbai",
      "pincode": "400001"
    }
  }'
```

---

## 📞 Support

For issues or questions, please contact the development team.

---

## 📄 License

Private - All rights reserved

---

**Last Updated:** April 14, 2026
**Version:** 1.0.0