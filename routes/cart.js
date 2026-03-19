const express = require('express');
const { query, queryOne } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET /api/cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await query(`
      SELECT c.id, c.quantity,
             p.id AS product_id, p.name, p.price, p.image_url, p.carbon_kg, p.stock
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?`, [req.user.id]);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /api/cart
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    const existing = await queryOne(
      'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );
    if (existing) {
      await query('UPDATE cart SET quantity = quantity + ? WHERE id = ?', [quantity, existing.id]);
    } else {
      await query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [req.user.id, product_id, quantity]);
    }
    res.json({ success: true, message: 'Added to cart' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// PUT /api/cart/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity <= 0) {
      await query('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    } else {
      await query('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
        [quantity, req.params.id, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// DELETE /api/cart/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// DELETE /api/cart  (clear all)
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
