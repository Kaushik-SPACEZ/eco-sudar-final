const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all products with sizes
router.get('/', async (req, res) => {
  try {
    const { category, is_active = 'true' } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (is_active === 'true') {
      query += ' AND is_active = TRUE';
    }

    query += ' ORDER BY name';

    const [products] = await pool.query(query, params);

    // Get sizes for each product
    for (let product of products) {
      const [sizes] = await pool.query(
        'SELECT id, size, price, is_available FROM product_sizes WHERE product_id = ? AND is_available = TRUE ORDER BY price',
        [product.id]
      );
      product.sizes = sizes;
    }

    res.json({
      success: true,
      data: { products, count: products.length }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching products' 
    });
  }
});

// Get single product with sizes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await pool.query(
      'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    const product = products[0];

    // Get sizes
    const [sizes] = await pool.query(
      'SELECT id, size, price, is_available FROM product_sizes WHERE product_id = ? ORDER BY price',
      [id]
    );

    product.sizes = sizes;

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching product' 
    });
  }
});

// Get product categories
router.get('/meta/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT DISTINCT category FROM products WHERE is_active = TRUE AND category IS NOT NULL ORDER BY category'
    );

    res.json({
      success: true,
      data: { categories: categories.map(c => c.category) }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching categories' 
    });
  }
});

module.exports = router;