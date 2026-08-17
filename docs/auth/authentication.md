# Authentication Module

**Base URL**: `https://api.ecosudar.com/api`  
**Prefix**: `/auth`  
**Auth Required**: No (unless noted)

---

## Overview

The Eco Sudar authentication system is built on a **stateless dual-JWT** architecture. No PHP sessions are used. Every client (mobile app, website, admin panel) authenticates using short-lived **Access Tokens** and long-lived **Refresh Tokens**.

### Token Expiry by Client Type

To differentiate between browser sessions and mobile app sessions, the client must send a header `X-Client-Type` during login.

| Client | Header | Access Token | Refresh Token |
|--------|--------|-------------|---------------|
| Mobile App | `X-Client-Type: app` | 30 days | 180 days |
| Website / Admin | `X-Client-Type: web` (or absent) | 1 day | 7 days |

---

## Endpoints

---

### 1. `POST /auth/register`

Register a new customer account.

**Headers**
```
Content-Type: application/json
```

**Request Body**
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh@example.com",
  "phone": "9876543210",
  "password": "MyPassword@123"
}
```

**Success Response** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "<access_token>",
    "refresh_token": "<refresh_token>",
    "user": {
      "user_id": 42,
      "name": "Rajesh Kumar",
      "email": "rajesh@example.com",
      "phone": "9876543210",
      "user_type": "customer",
      "is_active": true,
      "created_at": "2026-04-22T14:30:00Z"
    }
  }
}
```

**Error Responses**

| Status | Message |
|--------|---------|
| `422` | Validation failed (missing/invalid fields) |
| `409` | Email or phone already registered |

---

### 2. `POST /auth/login`

Login with email and password. Returns access + refresh token pair.

**Headers**
```
Content-Type: application/json
X-Client-Type: app        ← send this for mobile app (30-day token)
                           ← omit for website/admin (1-day token)
```

**Request Body**
```json
{
  "email": "rajesh@example.com",
  "password": "MyPassword@123"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<access_token>",
    "refresh_token": "<refresh_token>",
    "user": {
      "user_id": 42,
      "name": "Rajesh Kumar",
      "email": "rajesh@example.com",
      "phone": "9876543210",
      "user_type": "customer",
      "company_name": null,
      "address": null,
      "city": null,
      "state": null,
      "pincode": null,
      "gst_number": null,
      "is_active": true,
      "created_at": "2026-04-22T14:30:00Z"
    }
  }
}
```

> **Admin Login Note**: The admin panel (`eco-sudar-control`) verifies `user.user_type === "admin"` after login. Any non-admin account is rejected at the UI level even if credentials are valid.

**Error Responses**

| Status | Message |
|--------|---------|
| `401` | Invalid credentials |
| `403` | Account is inactive |
| `429` | Too many login attempts (5 per 15 min per IP) |

---

### 3. `POST /auth/logout`

Revokes the current access token and optionally the refresh token. **Requires Auth.**

**Headers**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body** *(optional — include to also revoke refresh token)*
```json
{
  "refresh_token": "<refresh_token>"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

> **How it works**: The access token's SHA-256 hash is inserted into the `revoked_tokens` table. Even if the JWT hasn't mathematically expired, the `AuthMiddleware` will reject it on every subsequent request.

---

### 4. `GET /auth/me`

Returns the currently authenticated user's profile. **Requires Auth.**

**Headers**
```
Authorization: Bearer <access_token>
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "user_id": 42,
    "name": "Rajesh Kumar",
    "email": "rajesh@example.com",
    "phone": "9876543210",
    "user_type": "customer",
    "company_name": null,
    "address": null,
    "city": null,
    "state": null,
    "pincode": null,
    "gst_number": null,
    "is_active": true,
    "created_at": "2026-04-22T14:30:00Z"
  }
}
```

**Error Responses**

| Status | Message |
|--------|---------|
| `401` | Authorization token required |
| `401` | Token is invalid or has expired |
| `401` | Token has been revoked |

---

### 5. `POST /auth/refresh`

Exchange a valid refresh token for a new access + refresh token pair. The old refresh token is **deleted and rotated** — it cannot be reused.

**Headers**
```
Content-Type: application/json
X-Client-Type: app      ← must match the original client type for correct expiry
```

**Request Body**
```json
{
  "refresh_token": "<refresh_token>"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "token": "<new_access_token>",
    "refresh_token": "<new_refresh_token>"
  }
}
```

**Error Responses**

| Status | Message |
|--------|---------|
| `401` | Refresh token is invalid or expired |
| `401` | Refresh token not found or expired |
| `401` | User not found or inactive |

---

### 6. `POST /auth/forgot-password`

Sends a 6-digit OTP to the user's registered email or phone.

**Headers**
```
Content-Type: application/json
```

**Request Body** *(send either email or phone, not both)*
```json
{ "email": "rajesh@example.com" }
```
```json
{ "phone": "9876543210" }
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "identifier": "rajesh@example.com",
    "identifier_type": "email",
    "otp_expires_at": "2026-04-22T14:40:00.000Z",
    "retry_after_seconds": 60
  }
}
```

**Error Responses**

| Status | Message |
|--------|---------|
| `400` | Phone or email is required |
| `400` | Invalid phone number / email format |
| `404` | No account found with this email/phone |
| `403` | Account is inactive |

---

### 7. `POST /auth/verify-otp`

Verify the OTP received via email/SMS. Returns a short-lived `reset_token` for password reset.

**Headers**
```
Content-Type: application/json
```

**Request Body**
```json
{
  "identifier": "rajesh@example.com",
  "otp": "485920",
  "purpose": "password_reset"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "reset_token": "<short_lived_jwt>",
    "expires_at": "2026-04-22T14:40:00.000Z"
  }
}
```

**Error Responses**

| Status | Message |
|--------|---------|
| `401` | Invalid OTP code |
| `401` | OTP has expired |
| `429` | Too many failed attempts |

---

### 8. `POST /auth/reset-password`

Set a new password using the `reset_token` obtained from `/auth/verify-otp`.

**Headers**
```
Authorization: Bearer <reset_token>
Content-Type: application/json
```

**Request Body**
```json
{
  "new_password": "NewPassword@456",
  "confirm_password": "NewPassword@456"
}
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "user_id": 42,
    "email": "rajesh@example.com"
  }
}
```

> **Security Note**: The `reset_token` is immediately blacklisted in `revoked_tokens` after a successful reset to prevent reuse.

**Error Responses**

| Status | Message |
|--------|---------|
| `401` | Invalid or expired reset token |
| `400` | Passwords do not match |
| `400` | Password must be at least 6 characters |

---

### 9. `POST /auth/send-otp`

Send a pre-registration OTP to verify email/phone **before** creating an account. Also returns whether the account already exists.

**Headers**
```
Content-Type: application/json
```

**Request Body**
```json
{ "phone": "9876543210" }
```
```json
{ "email": "newuser@example.com" }
```

**Success Response** `200 OK`
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "identifier": "9876543210",
    "type": "phone",
    "purpose": "phone_verification",
    "expires_in": 600,
    "user_exists": false
  }
}
```

> If `user_exists` is `true`, the mobile app should redirect to the Login screen instead of continuing signup.

---

## Token Internals

### JWT Payload Structure *(Access Token)*
```json
{
  "jti": "e54ff34307415138208...",  ← unique token ID
  "sub": 42,                         ← user_id
  "type": "access",
  "client": "app",                   ← "app" or "web"
  "iat": 1745000000,                 ← issued at (unix)
  "exp": 1747592000,                 ← expires at (unix)
  "nbf": 1745000000                  ← not before (unix)
}
```

### Database Tables

**`refresh_tokens`** — Stores active refresh tokens
```
user_id     → links to users table
token_hash  → SHA-256 of the raw refresh token
expires_at  → 7 days (web) / 180 days (app)  ← matched per client type
created_at
```
> `storeRefreshToken()` accepts the expiry as a parameter from `issueTokenPair()` — it does **not** hardcode the app expiry for all clients.

**`revoked_tokens`** — Blacklisted access tokens (after logout)
```
token_hash  → SHA-256 of the revoked token
expired_at  → original JWT expiry
created_at
```

**`otp_verifications`** — OTP records for password reset / verification
```
user_id         → nullable (pre-registration OTPs have no user yet)
identifier      → email or phone number
identifier_type → "email" or "phone"
otp_code        → 6-digit code
purpose         → "password_reset", "phone_verification", "email_verification"
expires_at      → 10 minutes from creation
attempts        → number of failed attempts
max_attempts    → 5
is_used         → boolean, marked true after success
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5 attempts / 15 minutes per IP |
| `POST /auth/register` | 3 attempts / 1 hour per IP |
| All other endpoints | 100 requests / 60 seconds per IP |

---

## Security Checklist

- [x] Passwords stored as bcrypt hashes (`cost: 12`)
- [x] JWT signed with `HMAC-SHA256` using a 64-char secret
- [x] Access tokens are stateless (no DB lookup needed per request)
- [x] Refresh tokens are stored as SHA-256 hashes (never raw)
- [x] Refresh tokens rotate on every use (old token deleted)
- [x] Logout blacklists the access token immediately
- [x] Reset tokens are single-use (blacklisted after password change)
- [x] OTPs expire in 10 minutes with 5 max attempts
- [x] Rate limiting on login and register endpoints
- [x] Admin accounts cannot be deactivated via the API
- [x] `register()` passes `$request` to `issueTokenPair()` so mobile/web detection works on registration too
- [x] Refresh token DB expiry is per-client (7d web / 180d app), not hardcoded app default
