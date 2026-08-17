# Admin API Endpoints

All admin endpoints must be prefixed with `https://api.ecosudar.com/api` and STRICTLY require an `Authorization: Bearer <token>` associated with an Account identified as `"user_type": "admin"`. 

The `AdminMiddleware` protects these routes heavily. Any non-admin user pinging these routes will be automatically rejected with `403 Forbidden`.

## 1. User & Operations Management
*   **`GET /admin/users`** - Paginated fetch of the entire global user base (Customers, Dealers). 
    *   *Parameters*: `?page=x &limit=y &user_type=dealer &search=name`
*   **`PUT /admin/users/{id}/status`** - Activate or deactivate a user account manually (Blocks logins).

## 2. Product Management
*   **`POST /admin/products`** - Create a completely new Product.
*   **`PUT /admin/products/{id}`** - Edit product metadata (name, description, active flag).
*   **`DELETE /admin/products/{id}`** - Delete an entire product from the store catalog globally.

## 3. Product Config & Pricing Management
*   **`GET /admin/products/{id}/configurations`** - Read arrays of pricing variables mapped to specific purposes globally.
*   **`POST /admin/products/{id}/configurations`** - Apply a new physical size/price rule to the core product.
*   **`PUT /admin/products/{id}/configurations/{cid}`** - Update a specific size pricing structure.
*   **`DELETE /admin/products/{id}/configurations/{cid}`** - Delete a pricing configuration dynamically.

## 4. Invoice Processing
*   **`GET /admin/invoices`** - Admin dashboard global pagination feed for all active invoice histories.
*   **`POST /admin/invoices`** - Formally generate a completely new GST/Sales Invoice tied to a user.
*   **`GET /admin/invoices/{id}/download`** - Native generation block prompting a hard PDF download file for the selected Invoice.

## 5. Quote Requests
*   **`GET /admin/quote-requests`** - View all global Quote Generation Logs submitted by mobile app or Web Calculator users.
*   **`POST /admin/quote-requests`** - Admin shortcut to insert quotes manually into the system.
*   **`GET /admin/quote-requests/{id}`** - Read detailed data for one request.
*   **`PUT /admin/quote-requests/{id}`** - Standard PUT request to update the log status (`pending, sent, closed`). 

## 6. Support Queries
*   **`GET /admin/queries`** - Access the live pagination feed counting all customer `Contact Us` form messages.
*   **`GET /admin/queries/{id}`** - Read full inquiry details.
*   **`PUT /admin/queries/{id}/reply`** - Post an official response or shift query status arrays (`pending, resolved, closed`).

## 7. Global Settings
*   **`GET /admin/settings`** - Native endpoint that fetches backend-stored application settings templates.
*   **`PUT /admin/settings`** - Change universal states configuration directly affecting application performance algorithms.
