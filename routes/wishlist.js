const express = require('express');
const { query, queryOne } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await query(`
      SELECT w.id, p.id as product_id, p.name, p.price, p.image_url, p.category, p.rating, p.eco_badge
      FROM wishlist w JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ? ORDER BY w.created_at DESC`, [req.user.id]);
    res.json(items);
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id', authenticateToken, async (req, res) => {
  try {
    const exists = await queryOne('SELECT id FROM wishlist WHERE user_id=? AND product_id=?', [req.user.id, req.params.id]);
    if (exists) {
      await query('DELETE FROM wishlist WHERE id=?', [exists.id]);
      res.json({ wishlisted: false });
    } else {
      await query('INSERT INTO wishlist (user_id, product_id) VALUES (?,?)', [req.user.id, req.params.id]);
      res.json({ wishlisted: true });
    }
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/check/:id', authenticateToken, async (req, res) => {
  try {
    const exists = await queryOne('SELECT id FROM wishlist WHERE user_id=? AND product_id=?', [req.user.id, req.params.id]);
    res.json({ wishlisted: !!exists });
  } catch(e) { res.status(500).json({ wishlisted: false }); }
});

module.exports = router;
