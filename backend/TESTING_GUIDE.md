# 🧪 Testing Guide - EcoSudar Backend

Your backend server is now running! Here's how to test all 23 endpoints.

## ✅ Server Status

```
✅ Server Running: http://localhost:3000
✅ Health Check: http://localhost:3000/health
✅ Total Endpoints: 23
✅ Proxying to: https://api.ecosudar.com/api
```

---

## 🎯 Testing Methods

### **Option 1: Using VS Code REST Client Extension** (Recommended)

1. **Install Extension:**
   - Open VS Code Extensions (Ctrl+Shift+X)
   - Search for "REST Client"
   - Install by Huachao Mao

2. **Open Test File:**
   - Open `backend/test-endpoints.http`
   - Click "Send Request" above any endpoint
   - View response in split pane

3. **Update Token:**
   - After login, copy the token from response
   - Replace `@token = YOUR_TOKEN_HERE` at the top
   - Now you can test protected endpoints

### **Option 2: Using cURL (Command Line)**

Open a new terminal and run these commands:

#### **Test Health Check:**
```bash
curl http://localhost:3000/health
```

#### **Test Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"phone\":\"9876543210\",\"password\":\"password123\",\"user_type\":\"customer\"}"
```

#### **Test Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"9876543210\",\"password\":\"password123\"}"
```

#### **Test Protected Endpoint (Replace TOKEN):**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### **Option 3: Using Postman**

1. Import the test file:
   - Open Postman
   - Click Import
   - Select `backend/test-endpoints.http`
   - Or manually create requests

2. Set up environment:
   - Create variable `baseUrl` = `http://localhost:3000`
   - Create variable `token` = (paste token after login)

### **Option 4: Using Browser (GET requests only)**

Open these URLs in your browser:

- Health Check: http://localhost:3000/health
- Get Products: http://localhost:3000/api/products
- Get Single Product: http://localhost:3000/api/products/1

---

## 📋 Test Workflow

### **Step 1: Test Health Check**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "EcoSudar API Proxy is running",
  "timestamp": "2026-04-14T...",
  "apiBaseUrl": "https://api.ecosudar.com/api"
}
```

### **Step 2: Test Public Endpoints (No Auth Required)**

#### Get All Products:
```bash
curl http://localhost:3000/api/products
```

**Expected:** Will try to fetch from Hostinger API. If Hostinger backend is not ready, you'll get a connection error (which is expected).

### **Step 3: Test Authentication Flow**

#### 1. Register:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"phone\":\"9876543210\",\"password\":\"password123\",\"user_type\":\"customer\"}"
```

#### 2. Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"9876543210\",\"password\":\"password123\"}"
```

**Expected Response (if Hostinger backend is ready):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "..."
  }
}
```

#### 3. Copy the token and test protected endpoint:
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### **Step 4: Test Protected Endpoints**

All these require the token from login:

```bash
# Get current user
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get user by ID
curl http://localhost:3000/api/users/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all orders
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get statistics
curl http://localhost:3000/api/statistics/active-orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 What to Expect

### **If Hostinger Backend is NOT Ready:**

You'll see errors like:
```json
{
  "success": false,
  "message": "Network error",
  "data": null
}
```

**This is NORMAL!** The proxy is working correctly. It's trying to connect to `https://api.ecosudar.com/api` which doesn't exist yet.

### **If Hostinger Backend IS Ready:**

You'll see actual responses from your PHP backend:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 📊 Endpoint Testing Checklist

### **Public Endpoints (No Token Required):**
- [ ] GET /health
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] POST /api/auth/refresh
- [ ] POST /api/auth/forgot-password
- [ ] POST /api/auth/verify-otp
- [ ] GET /api/products
- [ ] GET /api/products/:id
- [ ] GET /api/products/:id/configurations

### **Protected Endpoints (Token Required):**
- [ ] POST /api/auth/logout
- [ ] GET /api/auth/me
- [ ] POST /api/auth/reset-password
- [ ] GET /api/users/:id
- [ ] GET /api/users/email/:email
- [ ] PUT /api/users/:id
- [ ] PUT /api/users/:id/password
- [ ] DELETE /api/users/:id
- [ ] GET /api/users/:userId/orders
- [ ] GET /api/orders
- [ ] POST /api/orders
- [ ] GET /api/orders/:id
- [ ] PUT /api/orders/:id/status
- [ ] GET /api/statistics/orders
- [ ] GET /api/statistics/active-orders

---

## 🐛 Troubleshooting

### **Server Not Starting:**
```bash
# Check if port 3000 is already in use
netstat -ano | findstr :3000

# Kill the process if needed
taskkill /PID <PID> /F

# Restart server
cd backend
npm start
```

### **CORS Errors:**
- Add your app's origin to `.env`:
  ```
  ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.1.100:8081
  ```

### **Connection Timeout:**
- This is expected if Hostinger backend is not ready
- The proxy is working correctly
- Implement the PHP backend on Hostinger to get real responses

### **Rate Limit Errors:**
- Wait for the rate limit window to reset
- Or adjust limits in `.env`:
  ```
  RATE_LIMIT_MAX_REQUESTS=1000
  ```

---

## 📝 Server Logs

Watch the terminal where you ran `npm start`. You'll see:

```
[API Request] POST /auth/register
[API Response] 201 /auth/register
```

Or errors:
```
[API Error] No response received ECONNREFUSED
```

---

## 🎯 Next Steps

1. **Test all public endpoints** (products, register, login)
2. **Verify proxy is working** (you should see connection attempts in logs)
3. **Implement PHP backend on Hostinger** using:
   - `API_ENDPOINTS_SPECIFICATION.md` (endpoint specs)
   - `database/schema_complete.sql` (database schema)
4. **Once Hostinger backend is ready**, test again and you'll get real responses!

---

## 📞 Quick Reference

| What | URL |
|------|-----|
| Health Check | http://localhost:3000/health |
| Register | POST http://localhost:3000/api/auth/register |
| Login | POST http://localhost:3000/api/auth/login |
| Products | GET http://localhost:3000/api/products |
| Test File | backend/test-endpoints.http |
| Server Logs | Terminal where you ran `npm start` |

---

**Your backend proxy is ready! Start testing! 🚀**