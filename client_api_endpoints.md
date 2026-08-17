# Client-Side API Endpoints

All client requests (except where noted) should be prefixed with `https://api.ecosudar.com/api` and specify `"Content-Type": "application/json"`. endpoints explicitly marked `(Auth Required)` need an `Authorization: Bearer <token>` header.

## 1. Authentication
*   **`POST /auth/login`** (Public) - Login with email and password. Returns access and refresh tokens.
*   **`POST /auth/register`** (Public) - Register a new customer account.
*   **`POST /auth/forgot-password`** (Public) - Request password reset link to email.
*   **`POST /auth/reset-password`** (Public) - Submit new password using a reset token.
*   **`POST /auth/refresh`** (Public) - Supply a valid refresh token in the header to receive a fresh access token.
*   **`POST /auth/logout`** (Auth Required) - Revokes the access token ending the session.
*   **`GET /auth/me`** (Auth Required) - Verify token and return current logged-in user profile.

## 2. User Profile Management
*   **`GET /users/{id}`** (Auth Required) - Fetch profile for a specific user ID.
*   **`GET /users/email/{email}`** (Auth Required) - Look up a user profile by exact email string.
*   **`PUT /users/{id}`** (Auth Required) - Update user profile fields (name, phone, address, etc).
*   **`PUT /users/{id}/password`** (Auth Required) - Update account password.
*   **`DELETE /users/{id}`** (Auth Required) - Deactivate/Delete user profile.
*   **`GET /users/{userId}/orders`** (Auth Required) - Get paginated list of all past and current orders for a user.

## 3. Product Catalog
*   **`GET /products`** (Public) - Fetch paginated list of active products.
*   **`GET /products/{id}`** (Public) - Get full details for a single product.
*   **`GET /products/{id}/configurations`** (Public) - Get specific pricing arrays (sizes, sub-purposes).
*   **`GET /products/{id}/price?size=X`** (Public) - Retrieve direct calculated price for a size variation.
*   **`GET /products/{id}/sizes`** (Public) - Return a distinct array of available physical dimensions/sizes for a product.

## 4. Ordering System
*   **`GET /orders`** (Auth Required) - Fetch paginated array of logged-in user's orders.
*   **`POST /orders`** (Auth Required) - Submit a new eCommerce order.
*   **`GET /orders/{id}`** (Auth Required) - Get receipt details for a specific order.
*   **`PUT /orders/{id}/status`** (Auth Required) - Used natively to cancel or progress a user's own order if allowed.

## 5. Contact & Support
*   **`POST /queries`** (Public - Auth Optional) - Submit a contact request ticket. (Accepts: `name`, `email`, `message`)
*   **`POST /quotes`** (Auth Required) - Submit a quote request natively from the active Savings Calculator. (Accepts: `name`, `email`, `phone`, `message`)

## 6. Personal Analytics
*   **`GET /statistics/orders`** (Auth Required) - Retrieve numerical lifetime stats for user orders.
*   **`GET /statistics/active-orders`** (Auth Required) - Calculate pending real-time shipments.
