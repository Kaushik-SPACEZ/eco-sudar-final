# EcoSudar Backend API

Node.js/Express backend API for the EcoSudar mobile application with MySQL database.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL database (Hostinger or any MySQL server)
- npm or pnpm

### Installation

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` file with your Hostinger MySQL credentials:
```env
PORT=3000
NODE_ENV=production

# Your Hostinger MySQL Database Details
DB_HOST=your-hostinger-mysql-host.com
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=ecosudar_db
DB_PORT=3306

# Generate a secure random string for JWT_SECRET
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Add your app's URL after deployment
ALLOWED_ORIGINS=http://localhost:8081,exp://localhost:8081,https://your-app-domain.com
```

4. **Set up database:**

Login to your Hostinger MySQL database (via phpMyAdmin or MySQL client) and run:
```bash
mysql -u your_user -p your_database < database/schema.sql
```

Or copy the contents of `database/schema.sql` and execute in phpMyAdmin.

5. **Start the server:**

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Products
- `GET /api/products` - Get all products with sizes
- `GET /api/products/:id` - Get single product
- `GET /api/products/meta/categories` - Get product categories

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders (filtered by user if authenticated)
- `GET /api/orders/:id` - Get single order details
- `PATCH /api/orders/:id/status` - Update order status (requires authentication)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📦 Deployment to Hostinger

### Option 1: Using Node.js Hosting (if available)

1. Upload backend folder to your Hostinger account
2. Install dependencies: `npm install --production`
3. Set up environment variables in Hostinger control panel
4. Start the server: `npm start`

### Option 2: Using VPS/Cloud Hosting

1. **Upload files via FTP/SFTP:**
   - Upload the entire `backend` folder to your server

2. **SSH into your server:**
```bash
ssh your-username@your-server-ip
```

3. **Navigate to backend directory:**
```bash
cd /path/to/backend
```

4. **Install dependencies:**
```bash
npm install --production
```

5. **Set up PM2 (Process Manager):**
```bash
npm install -g pm2
pm2 start server.js --name ecosudar-api
pm2 save
pm2 startup
```

6. **Configure Nginx (reverse proxy):**

Create Nginx config file:
```nginx
server {
    listen 80;
    server_name your-api-domain.com;

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

7. **Enable SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d your-api-domain.com
```

## 🗄️ Database Schema

The database includes the following tables:
- `users` - User accounts
- `products` - Product catalog
- `product_sizes` - Product size variations and pricing
- `customers` - Customer information (both regular and dealers)
- `orders` - Order records
- `order_status_history` - Order status tracking

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | production |
| DB_HOST | MySQL host | mysql.hostinger.com |
| DB_USER | Database user | u123456_ecosudar |
| DB_PASSWORD | Database password | your_password |
| DB_NAME | Database name | u123456_ecosudar_db |
| DB_PORT | MySQL port | 3306 |
| JWT_SECRET | JWT signing key | random_secure_string |
| JWT_EXPIRES_IN | Token expiry | 7d |
| ALLOWED_ORIGINS | CORS origins | http://localhost:8081 |

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## 🧪 Testing the API

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

Test signup:
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

## 🔒 Security Features

- Helmet.js for security headers
- CORS protection
- JWT authentication
- Password hashing with bcrypt
- SQL injection prevention (parameterized queries)
- Input validation with express-validator

## 📞 Support

For issues or questions, please contact the development team.

## 📄 License

Private - All rights reserved