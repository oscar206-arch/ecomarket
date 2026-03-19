const express = require('express');
const { query, queryOne } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/:productId', async (req, res) => {
  try {
    const reviews = await query(`
      SELECT r.*, u.name as user_name FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? ORDER BY r.created_at DESC`, [req.params.productId]);
    const avg = reviews.length ? (reviews.reduce((s,r) => s+r.rating,0)/reviews.length).toFixed(1) : 0;
    res.json({ reviews, average: avg, total: reviews.length });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:productId', authenticateToken, async (req, res) => {
  try {
    const { rating, title, body } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    const existing = await queryOne('SELECT id FROM reviews WHERE user_id=? AND product_id=?', [req.user.id, req.params.productId]);
    if (existing) return res.status(409).json({ error: 'You already reviewed this product' });
    await query('INSERT INTO reviews (product_id, user_id, rating, title, body) VALUES (?,?,?,?,?)',
      [req.params.productId, req.user.id, rating, title, body]);
    // Update product rating
    const stats = await queryOne('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE product_id=?', [req.params.productId]);
    await query('UPDATE products SET rating=?, reviews=? WHERE id=?',
      [parseFloat(stats.avg).toFixed(1), stats.cnt, req.params.productId]);
    res.status(201).json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
