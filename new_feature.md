# User Approval System Implementation Guide

## Overview

This document provides a complete implementation guide for adding an admin approval workflow to the EcoSudar application. When users sign up, their accounts will be set to "pending" status and require admin approval before they can log in.

### Workflow

1. **User Signs Up** → Account created with `approval_status = 'pending'` and `is_active = false`
2. **User Receives Email** → "Registration submitted, pending approval"
3. **Admin Reviews** → Admin logs into admin panel and sees pending users
4. **Admin Approves/Rejects** → 
   - **Approve**: User account activated, approval email sent
   - **Reject**: User notified with reason
5. **User Logs In** → Only approved users can log in

---

## Phase 1: Database Schema Changes

### SQL Migration Script

Run this SQL script on your MySQL database:

```sql
-- Add approval system columns to users table
ALTER TABLE users 
ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER is_active,
ADD COLUMN approved_at TIMESTAMP NULL AFTER approval_status,
ADD COLUMN approved_by INT NULL AFTER approved_at,
ADD COLUMN rejection_reason TEXT NULL AFTER approved_by;

-- Add index for faster queries
CREATE INDEX idx_approval_status ON users(approval_status);

-- Approve all existing users (one-time migration)
UPDATE users SET approval_status = 'approved', is_active = true WHERE approval_status = 'pending';
```

### Verification

After running the migration, verify the columns were added:

```sql
DESCRIBE users;
```

You should see the new columns:
- `approval_status` - ENUM('pending', 'approved', 'rejected')
- `approved_at` - TIMESTAMP NULL
- `approved_by` - INT NULL
- `rejection_reason` - TEXT NULL

---

## Phase 2: PHP Backend Changes

### 2.1 Modify AuthController.php

**File Location**: `controllers/AuthController.php`

#### Update the `register()` method:

```php
public function register(): void
{
    $data = Request::json();
    
    // Existing validation...
    $name = trim($data['name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $phone = trim($data['phone'] ?? '');
    $password = $data['password'] ?? '';
    $userType = $data['user_type'] ?? 'customer';
    
    // Validation checks...
    if (empty($name) || empty($email) || empty($phone) || empty($password)) {
        Response::error('All fields are required', 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        Response::error('Invalid email format', 400);
    }
    
    if (strlen($password) < 8) {
        Response::error('Password must be at least 8 characters', 400);
    }
    
    // Check if email already exists
    $existingUser = User::findByEmail($email);
    if ($existingUser) {
        Response::error('Email already registered', 409);
    }
    
    // Check if phone already exists
    $existingPhone = User::findByPhone($phone);
    if ($existingPhone) {
        Response::error('Phone number already registered', 409);
    }
    
    // Create user with pending approval status
    $userData = [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'user_type' => $userType,
        'approval_status' => 'pending',  // NEW: Set to pending
        'is_active' => false,             // NEW: Inactive until approved
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    try {
        $userId = User::create($userData);
        
        // Send pending approval email
        $this->sendPendingApprovalEmail($email, $name);
        
        // Return success without JWT token (user cannot login yet)
        Response::success([
            'message' => 'Registration submitted successfully. Your account is pending admin approval.',
            'user_id' => $userId,
            'approval_status' => 'pending'
        ], 201);
        
    } catch (Exception $e) {
        error_log('Registration error: ' . $e->getMessage());
        Response::error('Registration failed. Please try again.', 500);
    }
}
```

#### Update the `login()` method:

```php
public function login(): void
{
    $data = Request::json();
    $identifier = strtolower(trim($data['email'] ?? $data['phone'] ?? ''));
    $password = $data['password'] ?? '';
    
    if (empty($identifier) || empty($password)) {
        Response::error('Email/phone and password are required', 400);
    }
    
    // Find user by email or phone
    $user = filter_var($identifier, FILTER_VALIDATE_EMAIL)
        ? User::findByEmail($identifier)
        : User::findByPhone($identifier);
    
    if (!$user) {
        Response::error('Invalid credentials', 401);
    }
    
    // NEW: Check approval status BEFORE password verification
    if ($user['approval_status'] === 'pending') {
        Response::error(
            'Your account is pending admin approval. You will receive an email once approved.',
            403
        );
    }
    
    if ($user['approval_status'] === 'rejected') {
        $reason = $user['rejection_reason'] ?? 'No reason provided';
        Response::error(
            "Your registration was not approved. Reason: {$reason}",
            403
        );
    }
    
    // Check if account is active
    if (!$user['is_active']) {
        Response::error('Your account is inactive. Please contact support.', 403);
    }
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        Response::error('Invalid credentials', 401);
    }
    
    // Generate JWT tokens (existing code)
    $payload = [
        'user_id' => $user['user_id'],
        'email' => $user['email'],
        'user_type' => $user['user_type'],
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ];
    
    $token = JWT::encode($payload);
    $refreshToken = JWT::encode([
        'user_id' => $user['user_id'],
        'type' => 'refresh',
        'exp' => time() + (30 * 24 * 60 * 60) // 30 days
    ]);
    
    Response::success([
        'message' => 'Login successful',
        'token' => $token,
        'refresh_token' => $refreshToken,
        'user' => [
            'user_id' => $user['user_id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'user_type' => $user['user_type']
        ]
    ]);
}
```

#### Add email helper methods to AuthController:

```php
/**
 * Send pending approval email to user
 */
private function sendPendingApprovalEmail(string $email, string $name): void
{
    $subject = "Registration Received - Pending Approval";
    $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>EcoSudar</h1>
                </div>
                <div class='content'>
                    <h2>Hello {$name},</h2>
                    <p>Thank you for registering with EcoSudar!</p>
                    <p>Your account is currently <strong>pending admin approval</strong>. You will receive an email notification once your account has been reviewed and approved.</p>
                    <p>This process typically takes <strong>24-48 hours</strong>.</p>
                    <p>If you have any questions, please don't hesitate to contact our support team.</p>
                </div>
                <div class='footer'>
                    <p>Best regards,<br>EcoSudar Team</p>
                    <p>&copy; " . date('Y') . " EcoSudar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    ";
    
    $this->sendEmail($email, $subject, $message);
}

/**
 * Send approval email to user
 */
private function sendApprovalEmail(string $email, string $name): void
{
    $subject = "Account Approved - Welcome to EcoSudar!";
    $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🎉 Welcome to EcoSudar!</h1>
                </div>
                <div class='content'>
                    <h2>Hello {$name},</h2>
                    <p><strong>Great news!</strong> Your EcoSudar account has been approved.</p>
                    <p>You can now log in to the app using your registered email and password.</p>
                    <p style='text-align: center;'>
                        <a href='#' class='button'>Open EcoSudar App</a>
                    </p>
                    <p>Welcome aboard! We're excited to have you as part of our community.</p>
                </div>
                <div class='footer'>
                    <p>Best regards,<br>EcoSudar Team</p>
                    <p>&copy; " . date('Y') . " EcoSudar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    ";
    
    $this->sendEmail($email, $subject, $message);
}

/**
 * Send rejection email to user
 */
private function sendRejectionEmail(string $email, string $name, string $reason): void
{
    $subject = "Registration Status Update";
    $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .reason-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>EcoSudar</h1>
                </div>
                <div class='content'>
                    <h2>Hello {$name},</h2>
                    <p>Thank you for your interest in EcoSudar.</p>
                    <p>Unfortunately, we are unable to approve your registration at this time.</p>
                    <div class='reason-box'>
                        <strong>Reason:</strong><br>
                        {$reason}
                    </div>
                    <p>If you have any questions or would like to discuss this decision, please contact our support team.</p>
                </div>
                <div class='footer'>
                    <p>Best regards,<br>EcoSudar Team</p>
                    <p>&copy; " . date('Y') . " EcoSudar. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    ";
    
    $this->sendEmail($email, $subject, $message);
}

/**
 * Send email using configured mail system
 */
private function sendEmail(string $to, string $subject, string $message): void
{
    // Configure email headers
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: EcoSudar <noreply@ecosudar.com>',
        'Reply-To: support@ecosudar.com',
        'X-Mailer: PHP/' . phpversion()
    ];
    
    // Send email
    $success = mail($to, $subject, $message, implode("\r\n", $headers));
    
    if (!$success) {
        error_log("Failed to send email to: {$to}");
    }
}
```

### 2.2 Update AdminUserController.php

**File Location**: `controllers/admin/AdminUserController.php`

Add these new methods:

```php
/**
 * Get all pending users
 * GET /admin/users/pending
 */
public function pending(): void
{
    try {
        $db = Database::getInstance();
        
        $query = "
            SELECT 
                user_id,
                name,
                email,
                phone,
                user_type,
                company_name,
                address,
                city,
                state,
                pincode,
                gst_number,
                udyam_number,
                approval_status,
                created_at
            FROM users
            WHERE approval_status = 'pending'
            ORDER BY created_at DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $pendingUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success([
            'users' => $pendingUsers,
            'count' => count($pendingUsers)
        ]);
        
    } catch (Exception $e) {
        error_log('Error fetching pending users: ' . $e->getMessage());
        Response::error('Failed to fetch pending users', 500);
    }
}

/**
 * Approve a user
 * POST /admin/users/{id}/approve
 */
public function approve(int $id): void
{
    try {
        $adminUser = Request::user();
        $adminId = $adminUser['user_id'];
        
        $db = Database::getInstance();
        
        // First, get user details for email
        $userQuery = "SELECT user_id, name, email, approval_status FROM users WHERE user_id = ?";
        $userStmt = $db->prepare($userQuery);
        $userStmt->execute([$id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            Response::error('User not found', 404);
        }
        
        if ($user['approval_status'] === 'approved') {
            Response::error('User is already approved', 400);
        }
        
        // Update user status
        $updateQuery = "
            UPDATE users 
            SET 
                approval_status = 'approved',
                is_active = true,
                approved_at = NOW(),
                approved_by = ?
            WHERE user_id = ?
        ";
        
        $updateStmt = $db->prepare($updateQuery);
        $success = $updateStmt->execute([$adminId, $id]);
        
        if (!$success) {
            Response::error('Failed to approve user', 500);
        }
        
        // Send approval email
        require_once ROOT_PATH . '/controllers/AuthController.php';
        $authController = new AuthController();
        $reflection = new ReflectionClass($authController);
        $method = $reflection->getMethod('sendApprovalEmail');
        $method->setAccessible(true);
        $method->invoke($authController, $user['email'], $user['name']);
        
        Response::success([
            'message' => 'User approved successfully',
            'user_id' => $id
        ]);
        
    } catch (Exception $e) {
        error_log('Error approving user: ' . $e->getMessage());
        Response::error('Failed to approve user', 500);
    }
}

/**
 * Reject a user
 * POST /admin/users/{id}/reject
 */
public function reject(int $id): void
{
    try {
        $data = Request::json();
        $reason = trim($data['reason'] ?? 'No reason provided');
        
        if (empty($reason)) {
            Response::error('Rejection reason is required', 400);
        }
        
        $db = Database::getInstance();
        
        // First, get user details for email
        $userQuery = "SELECT user_id, name, email, approval_status FROM users WHERE user_id = ?";
        $userStmt = $db->prepare($userQuery);
        $userStmt->execute([$id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            Response::error('User not found', 404);
        }
        
        if ($user['approval_status'] === 'rejected') {
            Response::error('User is already rejected', 400);
        }
        
        // Update user status
        $updateQuery = "
            UPDATE users 
            SET 
                approval_status = 'rejected',
                is_active = false,
                rejection_reason = ?
            WHERE user_id = ?
        ";
        
        $updateStmt = $db->prepare($updateQuery);
        $success = $updateStmt->execute([$reason, $id]);
        
        if (!$success) {
            Response::error('Failed to reject user', 500);
        }
        
        // Send rejection email
        require_once ROOT_PATH . '/controllers/AuthController.php';
        $authController = new AuthController();
        $reflection = new ReflectionClass($authController);
        $method = $reflection->getMethod('sendRejectionEmail');
        $method->setAccessible(true);
        $method->invoke($authController, $user['email'], $user['name'], $reason);
        
        Response::success([
            'message' => 'User rejected successfully',
            'user_id' => $id
        ]);
        
    } catch (Exception $e) {
        error_log('Error rejecting user: ' . $e->getMessage());
        Response::error('Failed to reject user', 500);
    }
}
```

### 2.3 Update index.php Routes

**File Location**: `index.php`

Add these routes in the Admin Users section (around line 150):

```php
// Admin Users - Add these new routes
$router->get('/admin/users/pending',        [AdminUserController::class, 'pending'],  'admin');
$router->post('/admin/users/{id}/approve',  [AdminUserController::class, 'approve'],  'admin');
$router->post('/admin/users/{id}/reject',   [AdminUserController::class, 'reject'],   'admin');
```

**Important**: Place these routes BEFORE the existing `/admin/users` route to avoid route conflicts.

---


## Phase 4: Frontend Mobile App Changes

### 4.1 Update auth.tsx

**File**: `app/(tabs)/auth.tsx`

Update the `handleSignUp` function to show pending approval message:

```typescript
const handleSignUp = async () => {
  // ... existing validation ...
  
  try {
    const ok = await signUp(suName, suEmail, suPhone, suPassword);
    if (ok) {
      // Show pending approval message instead of navigating back
      showAlert(
        'Registration Submitted!',
        'Your account is pending admin approval. You will receive an email notification once your account has been reviewed and approved. This process typically takes 24-48 hours.'
      );
      
      // Clear form
      setSuName('');
      setSuEmail('');
      setSuPhone('');
      setSuPassword('');
      setSuConfirm('');
      setIsEmailVerified(false);
      
      // Switch to sign in tab
      setTab('signin');
    } else {
      showAlert('Sign Up Failed', 'Please check your details and try again.');
    }
  } catch (error: any) {
    // ... existing error handling ...
  }
};
```

Update the `handleSignIn` function to handle approval status errors:

```typescript
const handleSignIn = async () => {
  if (!siEmail || !siPassword) {
    showAlert('Missing Fields', 'Please enter email and password');
    return;
  }
  if (!validateEmail(siEmail)) {
    showAlert('Invalid Email', 'Please enter a valid email address (e.g. name@example.com)');
    return;
  }
  
  try {
    const ok = await signIn(siEmail, siPassword);
    if (ok) {
      router.back();
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Sign in failed';
    
    // Check for approval status errors
    if (errorMessage.toLowerCase().includes('pending admin approval')) {
      showAlert(
        'Account Pending Approval',
        'Your account is awaiting admin approval. You will receive an email notification once your account has been approved.'
      );
    } else if (errorMessage.toLowerCase().includes('not approved')) {
      showAlert('Registration Not Approved', errorMessage);
    } else {
      showAlert('Sign In Failed', errorMessage);
    }
  }
};
```

Add an informational note below the sign-in form:

```typescript
// In the sign-in form section, after the submit button:
<View style={styles.switchRow}>
  <Text style={styles.switchText}>Don't have an account? </Text>
  <Pressable onPress={() => setTab('signup')}>
    <Text style={styles.switchLink}>Sign Up</Text>
  </Pressable>
</View>

{/* Add this new info note */}
<View style={styles.infoNote}>
  <Text style={styles.infoText}>
    ℹ️ New accounts require admin approval before login
  </Text>
</View>
```

Add the corresponding styles:

```typescript
infoNote: {
  marginTop: Spacing.md,
  padding: Spacing.sm,
  backgroundColor: '#e3f2fd',
  borderRadius: Radius.sm,
  borderLeftWidth: 3,
  borderLeftColor: '#2196f3',
},
infoText: {
  fontSize: FontSize.xs,
  color: '#1976d2',
  textAlign: 'center',
},
```

### 4.2 Update AuthContext.tsx

**File**: `contexts/AuthContext.tsx`

Update the `signUp` function to handle the new response format:

```typescript
const signUp = async (
  name: string, 
  email: string, 
  phone: string, 
  password: string,
  userType: 'customer' | 'dealer' = 'customer'
): Promise<boolean> => {
  setIsLoading(true);
  try {
    const response = await api.auth.register({
      name,
      email,
      phone,
      password,
      user_type: userType,
    });
    
    if (response.success) {
      // Note: User is NOT logged in automatically
      // They must wait for admin approval
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  } catch (error: any) {
    console.error('[Auth] Registration error:', error.response?.data || error.message);
    setIsLoading(false);
    throw error; // Re-throw error so auth.tsx can catch it
  }
};
```

Update the `signIn` function to handle approval status errors:

```typescript
const signIn = async (identifier: string, password: string): Promise<boolean> => {
  setIsLoading(true);
  try {
    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    const credentials = isEmail 
      ? { email: identifier, password }
      : { phone: identifier, password };

    const response = await api.auth.login(credentials);
    
    if (response.success && response.data) {
      const { user: apiUser, token, refresh_token } = response.data;
      
      // Store token
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('refresh_token', refresh_token);
      
      // Convert API user to local user format
      const localUser: User = {
        id: apiUser.user_id.toString(),
        name: apiUser.name,
        email: apiUser.email,
        phone: apiUser.phone,
        user_type: apiUser.user_type,
      };
      
      setUser(localUser);
      await AsyncStorage.setItem('auth_user', JSON.stringify(localUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  } catch (error: any) {
    console.error('[Auth] Login error:', error.response?.data || error.message);
    setIsLoading(false);
    throw error; // Re-throw so auth.tsx can handle approval status errors
  }
};
```

---

## Phase 5: Testing Guide

### 5.1 Database Testing

1. **Verify schema changes**:
```sql
DESCRIBE users;
SELECT * FROM users LIMIT 1;
```

2. **Check existing users are approved**:
```sql
SELECT user_id, name, email, approval_status, is_active FROM users;
```

### 5.2 Backend Testing

#### Test 1: User Registration (Pending Status)

```bash
curl -X POST https://api.ecosudar.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "Test@123",
    "user_type": "customer"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Registration submitted successfully. Your account is pending admin approval.",
  "data": {
    "user_id": 123,
    "approval_status": "pending"
  }
}
```

#### Test 2: Login with Pending Status

```bash
curl -X POST https://api.ecosudar.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Your account is pending admin approval. You will receive an email once approved."
}
```

#### Test 3: Get Pending Users (Admin)

```bash
curl -X GET https://api.ecosudar.com/api/admin/users/pending \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "user_id": 123,
        "name": "Test User",
        "email": "test@example.com",
        "phone": "9876543210",
        "user_type": "customer",
        "approval_status": "pending",
        "created_at": "2024-01-15 10:30:00"
      }
    ],
    "count": 1
  }
}
```

#### Test 4: Approve User (Admin)

```bash
curl -X POST https://api.ecosudar.com/api/admin/users/123/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "user_id": 123
  }
}
```

#### Test 5: Login After Approval

```bash
curl -X POST https://api.ecosudar.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123"
  }'
```

**Expected Response**: Should return JWT token and user data.

#### Test 6: Reject User (Admin)

```bash
curl -X POST https://api.ecosudar.com/api/admin/users/124/reject \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Invalid business information provided"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "User rejected successfully",
  "data": {
    "user_id": 124
  }
}
```

### 5.3 Admin Panel Testing

1. **Open admin panel**: Navigate to `admin-panel/index.html`
2. **Login**: Use admin credentials
3. **View pending users**: Should see list of pending registrations
4. **Approve user**: Click approve button, verify email sent
5. **Reject user**: Click reject, enter reason, verify email sent
6. **Refresh**: Click refresh button to reload list

### 5.4 Mobile App Testing

1. **Sign up new user**: Fill form and submit
2. **Verify pending message**: Should see "pending approval" alert
3. **Try to login**: Should be blocked with pending message
4. **Admin approves**: Use admin panel to approve
5. **Login again**: Should now work successfully
6. **Test rejection**: Sign up another user, reject from admin panel
7. **Try to login**: Should see rejection message with reason

### 5.5 Email Testing

Check that emails are sent for:
- ✅ Registration submitted (pending approval)
- ✅ Account approved
- ✅ Account rejected

---

## Phase 6: Deployment Checklist

### 6.1 Database

- [ ] Run ALTER TABLE migration on production database
- [ ] Verify columns added successfully
- [ ] Update existing users to 'approved' status
- [ ] Create database backup before migration

### 6.2 PHP Backend

- [ ] Update `AuthController.php` with new methods
- [ ] Update `AdminUserController.php` with approval methods
- [ ] Add new routes to `admin.php`
- [ ] Configure email settings (SMTP)
- [ ] Test all endpoints on staging environment
- [ ] Deploy to production

### 6.3 Admin Panel

- [ ] Update API_BASE_URL in `api.js` to production URL
- [ ] Upload admin panel files to server
- [ ] Test admin login
- [ ] Test approve/reject functionality
- [ ] Secure admin panel (HTTPS, authentication)

### 6.4 Mobile App

- [ ] Update `auth.tsx` with new error handling
- [ ] Update `AuthContext.tsx` with new logic
- [ ] Test on iOS and Android
- [ ] Build and deploy new app version

### 6.5 Documentation

- [ ] Update API documentation with new endpoints
- [ ] Document admin panel usage
- [ ] Create user guide for approval process
- [ ] Update README with new features

---

## API Endpoints Reference

### New Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users/pending` | Admin | Get all pending user registrations |
| POST | `/admin/users/{id}/approve` | Admin | Approve a user registration |
| POST | `/admin/users/{id}/reject` | Admin | Reject a user registration |

### Modified Endpoints

| Method | Endpoint | Changes |
|--------|----------|---------|
| POST | `/auth/register` | Now sets `approval_status='pending'` and `is_active=false` |
| POST | `/auth/login` | Now checks approval status before allowing login |

---

## Troubleshooting

### Issue: Users can't login after approval

**Solution**: Check that `is_active` is set to `true` when approving:
```sql
UPDATE users SET is_active = true WHERE user_id = ?;
```

### Issue: Emails not sending

**Solution**: 
1. Check PHP mail configuration
2. Verify SMTP settings
3. Check server logs for email errors
4. Test with a simple mail() call

### Issue: Admin can't access pending users

**Solution**:
1. Verify admin has correct `user_type = 'admin'`
2. Check JWT token is valid
3. Verify AdminMiddleware is working
4. Check database permissions

### Issue: Existing users can't login

**Solution**: Run this SQL to approve all existing users:
```sql
UPDATE users 
SET approval_status = 'approved', is_active = true 
WHERE approval_status = 'pending';
```

---

## Security Considerations

1. **Admin Authentication**: Ensure only users with `user_type='admin'` can access approval endpoints
2. **Rate Limiting**: Add rate limiting to prevent abuse of registration endpoint
3. **Email Validation**: Verify email addresses are valid before sending
4. **SQL Injection**: Use prepared statements (already implemented)
5. **XSS Protection**: Escape HTML in admin panel (already implemented)
6. **HTTPS**: Ensure all API calls use HTTPS in production
7. **Token Expiry**: Set appropriate JWT expiry times
8. **Audit Logging**: Log all approval/rejection actions with admin ID

---

## Future Enhancements

1. **Bulk Actions**: Approve/reject multiple users at once
2. **Email Notifications to Admin**: Alert admin when new user registers
3. **User Details View**: Show full user profile before approval
4. **Approval History**: Track who approved/rejected and when
5. **Auto-Approval Rules**: Automatically approve users meeting certain criteria
6. **SMS Notifications**: Send SMS in addition to email
7. **Dashboard Analytics**: Show approval statistics and trends
8. **User Communication**: Allow admin to message users before approval

---

## Support

For issues or questions:
- Email: support@ecosudar.com
- Documentation: https://docs.ecosudar.com
- GitHub Issues: https://github.com/ecosudar/issues

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Author**: EcoSudar Development Team