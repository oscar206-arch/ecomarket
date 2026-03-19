const express = require('express');
const { queryOne, query } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { code, order_total } = req.body;
    const coupon = await queryOne('SELECT * FROM coupons WHERE code = ?', [code.toUpperCase()]);
    if (!coupon)              return res.status(404).json({ error: 'Invalid coupon code' });
    if (coupon.uses_left <= 0) return res.status(400).json({ error: 'Coupon has expired' });
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
                              return res.status(400).json({ error: 'Coupon has expired' });
    if (order_total < coupon.min_order)
                              return res.status(400).json({ error: `Minimum order $${coupon.min_order} required` });
    const discount = coupon.type === 'percent'
      ? (order_total * coupon.value / 100).toFixed(2)
      : Math.min(coupon.value, order_total).toFixed(2);
    res.json({ valid: true, code: coupon.code, type: coupon.type, value: coupon.value, discount: parseFloat(discount) });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
