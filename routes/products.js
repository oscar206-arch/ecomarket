const express = require('express');
const { query, queryOne } = require('../models/database');
const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, maxPrice } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') { sql += ' AND category = ?'; params.push(category); }
    if (search)    { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (maxPrice)  { sql += ' AND price <= ?'; params.push(Number(maxPrice)); }

    const orderMap = { price_asc: 'price ASC', price_desc: 'price DESC', rating: 'rating DESC', eco: 'carbon_kg ASC' };
    sql += ` ORDER BY ${orderMap[sort] || 'created_at DESC'}`;

    const products = await query(sql, params);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const rows = await query('SELECT DISTINCT category FROM products ORDER BY category');
    res.json(['All', ...rows.map(r => r.category)]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
