const express = require('express');
const { query, queryOne } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const orders = await query('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    const enriched = await Promise.all(orders.map(async order => {
      const items = await query(`SELECT oi.quantity, oi.price, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`, [order.id]);
      return { ...order, items };
    }));
    res.json(enriched);
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { shipping_address, carbon_offset=0, coupon_code } = req.body;
    const cartItems = await query(`SELECT c.quantity, p.id as product_id, p.price, p.stock FROM cart c JOIN products p ON c.product_id=p.id WHERE c.user_id=?`, [req.user.id]);
    if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });

    let subtotal = cartItems.reduce((s,i) => s + parseFloat(i.price)*i.quantity, 0);
    let discount = 0;

    if (coupon_code) {
      const coupon = await queryOne('SELECT * FROM coupons WHERE code=? AND uses_left>0', [coupon_code.toUpperCase()]);
      if (coupon) {
        discount = coupon.type === 'percent' ? subtotal*coupon.value/100 : Math.min(coupon.value, subtotal);
        await query('UPDATE coupons SET uses_left=uses_left-1 WHERE id=?', [coupon.id]);
      }
    }

    const total = subtotal - discount + parseFloat(carbon_offset);
    const tracking = 'TRK' + Date.now().toString().slice(-8);
    const r = await query('INSERT INTO orders (user_id,total,shipping_address,carbon_offset,coupon_code,discount_amount,status,tracking_number) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, total, shipping_address, carbon_offset, coupon_code||null, discount, 'processing', tracking]);
    const orderId = r.insertId;

    for (const item of cartItems) {
      await query('INSERT INTO order_items (order_id,product_id,quantity,price) VALUES (?,?,?,?)', [orderId, item.product_id, item.quantity, item.price]);
      await query('UPDATE products SET stock=stock-? WHERE id=?', [item.quantity, item.product_id]);
    }

    const ecoPoints = Math.floor(subtotal) * 2;
    await query('UPDATE users SET eco_points=eco_points+? WHERE id=?', [ecoPoints, req.user.id]);
    await query('DELETE FROM cart WHERE user_id=?', [req.user.id]);

    res.status(201).json({ success:true, order_id:orderId, total, tracking_number:tracking, eco_points_earned:ecoPoints, discount });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await queryOne('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const items = await query(`SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`, [order.id]);
    res.json({ ...order, items });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;