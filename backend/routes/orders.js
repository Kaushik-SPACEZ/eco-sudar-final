const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Generate order number
const generateOrderNumber = () => {
  return 'ES-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

// Create order
router.post('/', optionalAuth, [
  body('product_id').isInt().withMessage('Valid product ID is required'),
  body('size').trim().notEmpty().withMessage('Size is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('customer.type').isIn(['customer', 'dealer']).withMessage('Invalid customer type'),
  body('customer.name').trim().notEmpty().withMessage('Customer name is required'),
  body('customer.phone').trim().notEmpty().withMessage('Phone is required'),
  body('customer.address').trim().notEmpty().withMessage('Address is required'),
  body('customer.city').trim().notEmpty().withMessage('City is required'),
  body('customer.pincode').trim().notEmpty().withMessage('Pincode is required')
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { product_id, size, quantity, purpose, sub_purpose, customer } = req.body;
    const userId = req.user ? req.user.id : null;

    await connection.beginTransaction();

    // Get product price
    const [products] = await connection.query(
      'SELECT p.name, ps.price FROM products p JOIN product_sizes ps ON p.id = ps.product_id WHERE p.id = ? AND ps.size = ? AND p.is_active = TRUE AND ps.is_available = TRUE',
      [product_id, size]
    );

    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Product or size not available' 
      });
    }

    const unitPrice = products[0].price;
    const subtotal = unitPrice * quantity;
    const deliveryFee = 150;
    const total = subtotal + deliveryFee;

    // Insert or get customer
    let customerId;
    const [existingCustomers] = await connection.query(
      'SELECT id FROM customers WHERE phone = ? AND type = ?',
      [customer.phone, customer.type]
    );

    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
      // Update customer info
      await connection.query(
        'UPDATE customers SET name = ?, email = ?, address = ?, city = ?, pincode = ?, business_name = ?, contact_person = ?, udyam_number = ?, gst_number = ? WHERE id = ?',
        [customer.name, customer.email || null, customer.address, customer.city, customer.pincode, 
         customer.businessName || null, customer.contactPerson || null, customer.udyamNumber || null, 
         customer.gstNumber || null, customerId]
      );
    } else {
      const [customerResult] = await connection.query(
        'INSERT INTO customers (user_id, type, name, email, phone, address, city, pincode, business_name, contact_person, udyam_number, gst_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, customer.type, customer.name, customer.email || null, customer.phone, customer.address, 
         customer.city, customer.pincode, customer.businessName || null, customer.contactPerson || null, 
         customer.udyamNumber || null, customer.gstNumber || null]
      );
      customerId = customerResult.insertId;
    }

    // Create order
    const orderNumber = generateOrderNumber();
    const [orderResult] = await connection.query(
      'INSERT INTO orders (order_number, user_id, customer_id, product_id, size, quantity, purpose, sub_purpose, unit_price, subtotal, delivery_fee, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [orderNumber, userId, customerId, product_id, size, quantity, purpose || null, sub_purpose || null, 
       unitPrice, subtotal, deliveryFee, total]
    );

    const orderId = orderResult.insertId;

    // Add status history
    await connection.query(
      'INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)',
      [orderId, 'pending', userId]
    );

    await connection.commit();

    // Fetch complete order details
    const [orderDetails] = await connection.query(
      `SELECT o.*, p.name as product_name, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [orderId]
    );

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order: orderDetails[0] }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating order' 
    });
  } finally {
    connection.release();
  }
});

// Get all orders (with optional user filter)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT o.*, p.name as product_name, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN customers c ON o.customer_id = c.id
    `;
    const params = [];

    const conditions = [];
    if (userId) {
      conditions.push('o.user_id = ?');
      params.push(userId);
    }
    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [orders] = await pool.query(query, params);

    res.json({
      success: true,
      data: { orders, count: orders.length }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching orders' 
    });
  }
});

// Get single order
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    let query = `
      SELECT o.*, p.name as product_name, p.description as product_description,
             c.type as customer_type, c.name as customer_name, c.email as customer_email,
             c.phone as customer_phone, c.address as customer_address, c.city as customer_city,
             c.pincode as customer_pincode, c.business_name, c.contact_person, c.udyam_number, c.gst_number
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `;
    const params = [id];

    if (userId) {
      query += ' AND o.user_id = ?';
      params.push(userId);
    }

    const [orders] = await pool.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Get status history
    const [history] = await pool.query(
      'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: { order: orders[0], history }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching order' 
    });
  }
});

// Update order status (requires authentication)
router.patch('/:id/status', authenticateToken, [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    await connection.beginTransaction();

    // Update order status
    const [result] = await connection.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Add to status history
    await connection.query(
      'INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES (?, ?, ?, ?)',
      [id, status, notes || null, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating order status' 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;