# 🎯 ECO SUDAR API ENDPOINTS - COMPLETE SPECIFICATION

**Based on:** `schema_complete.sql` database structure  
**Last Updated:** April 14, 2026

---

## 📋 TABLE OF CONTENTS

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Management Endpoints](#user-management-endpoints)
3. [Product Endpoints](#product-endpoints)
4. [Order Endpoints](#order-endpoints)
5. [Statistics Endpoints](#statistics-endpoints)
6. [Error Codes Reference](#error-codes-reference)

---

## 🔐 AUTHENTICATION ENDPOINTS

### 1. POST /api/auth/register
**Rate Limit:** 3 requests per hour  
**Authentication:** Not required  
**Purpose:** Register a new user (Customer or Dealer)

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "user_type": "customer",
  "company_name": "ABC Industries",
  "address": "123 Main Street, Apartment 4B",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pincode": "600001",
  "gst_number": "29ABCDE1234F1Z5",
  "udyam_number": "UDYAM-TN-12-1234567"
}
```

#### Field Validations:
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `name` | ✅ Yes | string | Max 100 chars |
| `email` | ✅ Yes | string | Valid email, unique, max 100 chars |
| `phone` | ✅ Yes | string | Max 15 chars, unique |
| `password` | ✅ Yes | string | Min 6 chars |
| `user_type` | ✅ Yes | enum | 'customer' or 'dealer' |
| `company_name` | ⚠️ If dealer | string | Max 150 chars |
| `address` | ❌ No | text | - |
| `city` | ❌ No | string | Max 50 chars |
| `state` | ❌ No | string | Max 50 chars |
| `pincode` | ❌ No | string | Max 10 chars |
| `gst_number` | ❌ No | string | Max 20 chars |
| `udyam_number` | ❌ No | string | Max 50 chars |

#### Success Response (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "user_type": "customer",
    "company_name": "ABC Industries",
    "address": "123 Main Street, Apartment 4B",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600001",
    "gst_number": "29ABCDE1234F1Z5",
    "udyam_number": "UDYAM-TN-12-1234567",
    "is_active": true,
    "created_at": "2026-04-14T12:30:00.000Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses:

**400 Bad Request - Missing Fields:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "name is required",
    "email is required",
    "phone is required",
    "password is required",
    "user_type is required"
  ]
}
```

**400 Bad Request - Invalid Email:**
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

**409 Conflict - Duplicate Email:**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

**409 Conflict - Duplicate Phone:**
```json
{
  "success": false,
  "error": "Phone number already registered"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 1 hour."
}
```

---

### 2. POST /api/auth/login
**Rate Limit:** 5 requests per 15 minutes  
**Authentication:** Not required  
**Purpose:** User login with phone/email and password

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body (Option 1 - Phone):
```json
{
  "phone": "9876543210",
  "password": "SecurePass123!"
}
```

#### Request Body (Option 2 - Email):
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "user_type": "customer",
      "company_name": "ABC Industries",
      "address": "123 Main Street, Apartment 4B",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "pincode": "600001",
      "gst_number": "29ABCDE1234F1Z5",
      "udyam_number": "UDYAM-TN-12-1234567",
      "is_active": true,
      "created_at": "2026-04-14T12:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Phone/Email and password are required"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**403 Forbidden - Inactive Account:**
```json
{
  "success": false,
  "error": "Account is inactive. Please contact support."
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Too many login attempts. Try again in 15 minutes."
}
```

---

### 3. POST /api/auth/logout
**Authentication:** Required 🔒  
**Purpose:** Logout user and invalidate tokens

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Request Body:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Error Responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

---

### 4. GET /api/auth/me
**Authentication:** Required 🔒  
**Purpose:** Get current logged-in user profile

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "user_type": "customer",
    "company_name": "ABC Industries",
    "address": "123 Main Street, Apartment 4B",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600001",
    "gst_number": "29ABCDE1234F1Z5",
    "udyam_number": "UDYAM-TN-12-1234567",
    "is_active": true,
    "created_at": "2026-04-14T12:30:00.000Z",
    "updated_at": "2026-04-14T12:30:00.000Z"
  }
}
```

#### Error Responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 5. POST /api/auth/refresh
**Authentication:** Not required  
**Purpose:** Refresh access token using refresh token

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Error Responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid or expired refresh token"
}
```

---

### 6. POST /api/auth/forgot-password
**Rate Limit:** 3 requests per 15 minutes per identifier  
**Authentication:** Not required  
**Purpose:** Send OTP for password reset

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body (Option 1 - Phone):
```json
{
  "phone": "9876543210"
}
```

#### Request Body (Option 2 - Email):
```json
{
  "email": "john@example.com"
}
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "identifier": "9876543210",
    "identifier_type": "phone",
    "otp_expires_at": "2026-04-14T12:40:00.000Z",
    "retry_after_seconds": 60
  }
}
```

#### Error Responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Phone or email is required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "No account found with this phone number"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Too many OTP requests. Please try again in 15 minutes."
}
```

---

### 7. POST /api/auth/verify-otp
**Rate Limit:** 5 attempts per OTP  
**Authentication:** Not required  
**Purpose:** Verify OTP code for password reset

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body:
```json
{
  "identifier": "9876543210",
  "otp": "1234"
}
```

#### Field Validations:
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `identifier` | ✅ Yes | string | Phone or email used in forgot-password |
| `otp` | ✅ Yes | string | 4-6 digit code |

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-04-14T12:50:00.000Z"
  }
}
```

#### Error Responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid OTP format. Please enter 4-6 digits."
}
```

**401 Unauthorized - Invalid OTP:**
```json
{
  "success": false,
  "error": "Invalid OTP code",
  "attempts_remaining": 3
}
```

**401 Unauthorized - Expired OTP:**
```json
{
  "success": false,
  "error": "OTP has expired. Please request a new one."
}
```

**429 Too Many Attempts:**
```json
{
  "success": false,
  "error": "Too many failed attempts. Please request a new OTP."
}
```

---

### 8. POST /api/auth/reset-password
**Authentication:** Requires reset_token from verify-otp  
**Purpose:** Reset password after OTP verification

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*Note: Use the reset_token from verify-otp response*

#### Request Body:
```json
{
  "new_password": "NewSecurePass456!",
  "confirm_password": "NewSecurePass456!"
}
```

#### Field Validations:
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `new_password` | ✅ Yes | string | Min 6 chars |
| `confirm_password` | ✅ Yes | string | Must match new_password |

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "user_id": 1,
    "email": "john@example.com"
  }
}
```

#### Error Responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Passwords do not match"
}
```

**400 Bad Request - Weak Password:**
```json
{
  "success": false,
  "error": "Password must be at least 6 characters long"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid or expired reset token"
}
```

---

## 👤 USER MANAGEMENT ENDPOINTS

### 6. GET /api/users/{id}
**Authentication:** Required 🔒  
**Purpose:** Get user details by ID

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### URL Parameters:
- `id` (integer, required): User ID

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "user_type": "customer",
    "company_name": "ABC Industries",
    "address": "123 Main Street, Apartment 4B",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600001",
    "gst_number": "29ABCDE1234F1Z5",
    "udyam_number": "UDYAM-TN-12-1234567",
    "is_active": true,
    "created_at": "2026-04-14T12:30:00.000Z",
    "updated_at": "2026-04-14T12:30:00.000Z"
  }
}
```

#### Error Responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 7. GET /api/users/email/{email}
**Authentication:** Required 🔒  
**Purpose:** Get user details by email

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### URL Parameters:
- `email` (string, required): User email address

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "user_type": "customer",
    "company_name": "ABC Industries",
    "is_active": true,
    "created_at": "2026-04-14T12:30:00.000Z"
  }
}
```

#### Error Responses:

**404 Not Found:**
```json
{
  "success": false,
  "error": "User not found with email: john@example.com"
}
```

---

### 8. PUT /api/users/{id}
**Authentication:** Required 🔒  
**Purpose:** Update user profile

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### URL Parameters:
- `id` (integer, required): User ID

#### Request Body (All fields optional):
```json
{
  "name": "John Updated Doe",
  "email": "john.updated@example.com",
  "phone": "9876543211",
  "company_name": "ABC Industries Ltd",
  "address": "456 New Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "gst_number": "27ABCDE1234F1Z5",
  "udyam_number": "UDYAM-MH-12-1234567"
}
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user_id": 1,
    "name": "John Updated Doe",
    "email": "john.updated@example.com",
    "phone": "9876543211",
    "user_type": "customer",
    "company_name": "ABC Industries Ltd",
    "address": "456 New Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "gst_number": "27ABCDE1234F1Z5",
    "udyam_number": "UDYAM-MH-12-1234567",
    "is_active": true,
    "updated_at": "2026-04-14T13:45:00.000Z"
  }
}
```

#### Error Responses:

**403 Forbidden:**
```json
{
  "success": false,
  "error": "You can only update your own profile"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "error": "Email already in use by another user"
}
```

---

### 9. PUT /api/users/{id}/password
**Authentication:** Required 🔒  
**Purpose:** Change user password

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Request Body:
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePass456!",
  "confirm_password": "NewSecurePass456!"
}
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

#### Error Responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "New password and confirm password do not match"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Current password is incorrect"
}
```

---

### 10. DELETE /api/users/{id}
**Authentication:** Required 🔒  
**Purpose:** Deactivate user account (soft delete)

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "User account deactivated successfully"
}
```

#### Error Responses:

**403 Forbidden:**
```json
{
  "success": false,
  "error": "You can only delete your own account"
}
```

---

### 11. GET /api/users/{userId}/orders
**Authentication:** Required 🔒  
**Purpose:** Get all orders for a specific user

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Query Parameters:
```
?status=pending           // Filter by order status
&page=1                   // Page number (default: 1)
&limit=10                 // Items per page (default: 10)
&sort=created_at          // Sort field (default: created_at)
&order=desc               // Sort order: asc or desc (default: desc)
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "order_id": 1,
      "order_number": "ES-20260414-0001",
      "total_amount": 850.00,
      "delivery_fee": 150.00,
      "order_status": "pending",
      "payment_status": "pending",
      "created_at": "2026-04-14T12:30:00.000Z",
      "total_items": 1,
      "total_quantity": 100
    },
    {
      "order_id": 2,
      "order_number": "ES-20260413-0002",
      "total_amount": 1200.00,
      "delivery_fee": 150.00,
      "order_status": "confirmed",
      "payment_status": "paid",
      "created_at": "2026-04-13T10:15:00.000Z",
      "total_items": 2,
      "total_quantity": 150
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "total_pages": 1
  }
}
```

---

## 📦 PRODUCT ENDPOINTS

### 12. GET /api/products
**Authentication:** Not required (Public)  
**Purpose:** Get all active products

#### Request Headers:
```http
Content-Type: application/json
```

#### Query Parameters:
```
?product_type=pellets     // Filter by type: pellets, biomass-stove, biomass-burner
&category=pellets         // Filter by category
&is_available=true        // Filter by availability
&page=1                   // Page number
&limit=10                 // Items per page
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "product_id": 1,
      "product_name": "Biomass Pellets",
      "product_type": "pellets",
      "description": "Premium quality biomass pellets made from agro residue",
      "base_price": 8.50,
      "category": "pellets",
      "gcv": "4200 Kcal/kg",
      "ash_content": "< 3%",
      "moisture_content": "< 8%",
      "tag": "Most Used 🔥",
      "tag_color": "#F59E0B",
      "suitable_for": "Boilers, Gasifiers, Direct combustion",
      "image_url": "https://example.com/images/pellets.jpg",
      "is_available": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-04-01T00:00:00.000Z"
    },
    {
      "product_id": 2,
      "product_name": "Biomass Stove",
      "product_type": "biomass-stove",
      "description": "Compressed biomass briquettes for industrial use",
      "base_price": 7.00,
      "category": "briquettes",
      "gcv": "3800 Kcal/kg",
      "ash_content": "< 5%",
      "moisture_content": "< 10%",
      "tag": "Eco Choice 🌿",
      "tag_color": "#1DB954",
      "suitable_for": "Industrial dryers, Brick kilns",
      "image_url": "https://example.com/images/stove.jpg",
      "is_available": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-04-01T00:00:00.000Z"
    },
    {
      "product_id": 3,
      "product_name": "Biomass Burner",
      "product_type": "biomass-burner",
      "description": "Natural wood chips for biomass gasifiers",
      "base_price": 5.50,
      "category": "chips",
      "gcv": "3500 Kcal/kg",
      "ash_content": "< 7%",
      "moisture_content": "< 7%",
      "tag": "Best Value 💰",
      "tag_color": "#3B82F6",
      "suitable_for": "Gasifiers, Biomass boilers",
      "image_url": "https://example.com/images/burner.jpg",
      "is_available": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-04-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "total_pages": 1
  }
}
```

---

### 13. GET /api/products/{id}
**Authentication:** Not required (Public)  
**Purpose:** Get single product details by ID

#### Request Headers:
```http
Content-Type: application/json
```

#### URL Parameters:
- `id` (integer, required): Product ID

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "product_id": 1,
    "product_name": "Biomass Pellets",
    "product_type": "pellets",
    "description": "Premium quality biomass pellets made from agro residue",
    "base_price": 8.50,
    "category": "pellets",
    "gcv": "4200 Kcal/kg",
    "ash_content": "< 3%",
    "moisture_content": "< 8%",
    "tag": "Most Used 🔥",
    "tag_color": "#F59E0B",
    "suitable_for": "Boilers, Gasifiers, Direct combustion",
    "image_url": "https://example.com/images/pellets.jpg",
    "is_available": true,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-04-01T00:00:00.000Z"
  }
}
```

#### Error Responses:

**404 Not Found:**
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 14. GET /api/products/{id}/configurations
**Authentication:** Not required (Public)  
**Purpose:** Get product configurations (sizes, purposes, prices)

#### Request Headers:
```http
Content-Type: application/json
```

#### URL Parameters:
- `id` (integer, required): Product ID

#### Query Parameters:
```
?size=6mm                 // Filter by size
&purpose=Commercial Kitchen  // Filter by purpose
&is_available=true        // Filter by availability
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "config_id": 1,
      "product_id": 1,
      "size": "6mm",
      "purpose": "Commercial Kitchen",
      "price": 8.50,
      "is_available": true,
      "created_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "config_id": 2,
      "product_id": 1,
      "size": "6mm",
      "purpose": "Industrial Dryer",
      "price": 8.50,
      "is_available": true,
      "created_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "config_id": 3,
      "product_id": 1,
      "size": "8mm",
      "purpose": "Commercial Kitchen",
      "price": 8.50,
      "is_available": true,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Error Responses:

**404 Not Found:**
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

## 🛒 ORDER ENDPOINTS

### 15. GET /api/orders
**Authentication:** Required 🔒  
**Purpose:** Get all orders (admin/user based on role)

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Query Parameters:
```
?user_id=1                // Filter by user (admin only)
&order_status=pending     // Filter by status
&payment_status=paid      // Filter by payment status
&from_date=2026-04-01     // Filter from date
&to_date=2026-04-14       // Filter to date
&page=1                   // Page number
&limit=10                 // Items per page
&sort=created_at          // Sort field
&order=desc               // Sort order
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "order_id": 1,
      "order_number": "ES-20260414-0001",
      "user_id": 1,
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "9876543210",
      "total_amount": 1000.00,
      "delivery_fee": 150.00,
      "order_status": "pending",
      "payment_status": "pending",
      "payment_method": null,
      "delivery_address": "123 Main Street, Apartment 4B",
      "delivery_city": "Chennai",
      "delivery_state": "Tamil Nadu",
      "delivery_pincode": "600001",
      "notes": null,
      "created_at": "2026-04-14T12:30:00.000Z",
      "updated_at": "2026-04-14T12:30:00.000Z",
      "items_count": 1,
      "total_quantity": 100
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1
  }
}
```

---

### 16. POST /api/orders
**Authentication:** Required 🔒  
**Purpose:** Create a new order

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Request Body:
```json
{
  "delivery_address": "123 Main Street, Apartment 4B",
  "delivery_city": "Chennai",
  "delivery_state": "Tamil Nadu",
  "delivery_pincode": "600001",
  "payment_method": "COD",
  "notes": "Please deliver between 9 AM - 5 PM",
  "items": [
    {
      "product_id": 1,
      "config_id": 1,
      "quantity": 100,
      "size": "6mm",
      "purpose": "Commercial Kitchen",
      "sub_purpose": "Food Processing Dryer"
    }
  ]
}
```

#### Field Validations:
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `delivery_address` | ✅ Yes | text | - |
| `delivery_city` | ✅ Yes | string | Max 50 chars |
| `delivery_state` | ✅ Yes | string | Max 50 chars |
| `delivery_pincode` | ✅ Yes | string | Max 10 chars |
| `payment_method` | ❌ No | string | Max 50 chars |
| `notes` | ❌ No | text | - |
| `items` | ✅ Yes | array | Min 1 item |
| `items[].product_id` | ✅ Yes | integer | Must exist in products |
| `items[].config_id` | ❌ No | integer | Must exist in product_configurations |
| `items[].quantity` | ✅ Yes | integer | Min 1 |
| `items[].size` | ✅ Yes | string | Max 50 chars |
| `items[].purpose` | ✅ Yes | string | Max 100 chars |
| `items[].sub_purpose` | ❌ No | string | Max 100 chars |

#### Success Response (201 Created):
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order_id": 1,
    "order_number": "ES-20260414-0001",
    "user_id": 1,
    "total_amount": 1000.00,
    "delivery_fee": 150.00,
    "order_status": "pending",
    "payment_status": "pending",
    "payment_method": "COD",
    "delivery_address": "123 Main Street, Apartment 4B",
    "delivery_city": "Chennai",
    "delivery_state": "Tamil Nadu",
    "delivery_pincode": "600001",
    "notes": "Please deliver between 9 AM - 5 PM",
    "created_at": "2026-04-14T12:30:00.000Z",
    "items": [
      {
        "item_id": 1,
        "product_id": 1,
        "product_name": "Biomass Pellets",
        "config_id": 1,
        "quantity": 100,
        "unit_price": 8.50,
        "total_price": 850.00,
        "size": "6mm",
        "purpose": "Commercial Kitchen",
        "sub_purpose": "Food Processing Dryer"
      }
    ]
  }
}
```

#### Error Responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "delivery_address is required",
    "items array must contain at least one item"
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Product with ID 999 not found"
}
```

---

### 17. GET /api/orders/{id}
**Authentication:** Required 🔒  
**Purpose:** Get order details by ID

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### URL Parameters:
- `id` (integer, required): Order ID

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "order": {
      "order_id": 1,
      "order_number": "ES-20260414-0001",
      "user_id": 1,
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "9876543210",
      "user_type": "customer",
      "company_name": "ABC Industries",
      "gst_number": "29ABCDE1234F1Z5",
      "total_amount": 1000.00,
      "delivery_fee": 150.00,
      "order_status": "pending",
      "payment_status": "pending",
      "payment_method": "COD",
      "delivery_address": "123 Main Street, Apartment 4B",
      "delivery_city": "Chennai",
      "delivery_state": "Tamil Nadu",
      "delivery_pincode": "600001",
      "notes": "Please deliver between 9 AM - 5 PM",
      "created_at": "2026-04-14T12:30:00.000Z",
      "updated_at": "2026-04-14T12:30:00.000Z"
    },
    "items": [
      {
        "item_id": 1,
        "order_id": 1,
        "product_id": 1,
        "product_name": "Biomass Pellets",
        "product_type": "pellets",
        "description": "Premium quality biomass pellets",
        "config_id": 1,
        "quantity": 100,
        "unit_price": 8.50,
        "total_price": 850.00,
        "size": "6mm",
        "purpose": "Commercial Kitchen",
        "sub_purpose": "Food Processing Dryer",
        "created_at": "2026-04-14T12:30:00.000Z"
      }
    ]
  }
}
```

#### Error Responses:

**403 Forbidden:**
```json
{
  "success": false,
  "error": "You can only view your own orders"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### 18. PUT /api/orders/{id}/status
**Authentication:** Required 🔒  
**Purpose:** Update order status

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### URL Parameters:
- `id` (integer, required): Order ID

#### Request Body:
```json
{
  "order_status": "confirmed",
  "payment_status": "paid",
  "notes": "Payment received via UPI"
}
```

#### Valid Status Values:
- **order_status:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`
- **payment_status:** `pending`, `paid`, `failed`, `refunded`

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "order_id": 1,
    "order_number": "ES-20260414-0001",
    "order_status": "confirmed",
    "payment_status": "paid",
    "updated_at": "2026-04-14T13:45:00.000Z"
  }
}
```

#### Error Responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid order_status. Allowed values: pending, confirmed, processing, shipped, delivered, cancelled"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Only admin can update order status"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

## 📊 STATISTICS ENDPOINTS

### 19. GET /api/statistics/orders
**Authentication:** Required 🔒  
**Purpose:** Get order statistics

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Query Parameters:
```
?days=30                  // Number of days (default: 30)
&from_date=2026-04-01     // Start date (optional)
&to_date=2026-04-14       // End date (optional)
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "order_date": "2026-04-14",
      "total_orders": 5,
      "total_revenue": 5000.00,
      "avg_order_value": 1000.00,
      "delivered_orders": 2,
      "cancelled_orders": 0
    },
    {
      "order_date": "2026-04-13",
      "total_orders": 8,
      "total_revenue": 8500.00,
      "avg_order_value": 1062.50,
      "delivered_orders": 5,
      "cancelled_orders": 1
    }
  ],
  "summary": {
    "total_orders": 13,
    "total_revenue": 13500.00,
    "avg_order_value": 1038.46,
    "total_delivered": 7,
    "total_cancelled": 1
  }
}
```

---

### 20. GET /api/statistics/active-orders
**Authentication:** Required 🔒  
**Purpose:** Get active orders count and details

#### Request Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "active_orders_count": 15,
    "by_status": {
      "pending": 5,
      "confirmed": 4,
      "processing": 3,
      "shipped": 3
    },
    "orders": [
      {
        "order_id": 1,
        "order_number": "ES-20260414-0001",
        "customer_name": "John Doe",
        "email": "john@example.com",
        "phone": "9876543210",
        "user_type": "customer",
        "total_amount": 1000.00,
        "order_status": "pending",
        "payment_status": "pending",
        "created_at": "2026-04-14T12:30:00.000Z",
        "total_items": 1
      }
    ]
  }
}
```

---

## ⚠️ ERROR CODES REFERENCE

### HTTP Status Codes:

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation errors, missing fields |
| 401 | Unauthorized | Invalid/expired token, wrong credentials |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (email, phone) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server/database errors |

### Common Error Response Format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": ["Additional detail 1", "Additional detail 2"]
}
```

---

## 🔒 AUTHENTICATION NOTES

### JWT Token Structure:
```json
{
  "user_id": 1,
  "email": "john@example.com",
  "user_type": "customer",
  "iat": 1713096000,
  "exp": 1713700800
}
```

### Token Expiration:
- **Access Token:** 7 days (configurable in settings table)
- **Refresh Token:** 30 days

### Authorization Header Format:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 NOTES

1. **All timestamps** are in ISO 8601 format (UTC)
2. **All prices** are in INR (₹) with 2 decimal places
3. **Pagination** defaults: page=1, limit=10
4. **Soft deletes** are used (is_active flag)
5. **Order numbers** are auto-generated using stored procedure
6. **Delivery fee** is fetched from settings table (default: ₹150)

---

**Last Updated:** April 14, 2026  
**Database Schema:** schema_complete.sql  
**API Version:** 1.0.0