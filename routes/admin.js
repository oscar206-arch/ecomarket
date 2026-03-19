const express = require('express');
const { query, queryOne } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// Dashboard stats
router.get('/stats', authenticateToken, adminOnly, async (req, res) => {
  try {
    const [orders]   = await query('SELECT COUNT(*) as c, COALESCE(SUM(total),0) as rev FROM orders');
    const [users]    = await query('SELECT COUNT(*) as c FROM users WHERE role != "admin"');
    const [products] = await query('SELECT COUNT(*) as c FROM products');
    const [reviews]  = await query('SELECT COUNT(*) as c FROM reviews');
    const recent     = await query('SELECT o.id, o.total, o.status, o.created_at, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 8');
    const topProducts= await query('SELECT p.name, SUM(oi.quantity) as sold FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.id ORDER BY sold DESC LIMIT 5');
    const salesByDay = await query('SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY day');
    res.json({ orders: orders.c, revenue: orders.rev, users: users.c, products: products.c, reviews: reviews.c, recent, topProducts, salesByDay });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Products CRUD
router.get('/products', authenticateToken, adminOnly, async (req, res) => {
  try { res.json(await query('SELECT * FROM products ORDER BY created_at DESC')); }
  catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/products', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock, carbon_kg, eco_badge, material, origin } = req.body;
    const r = await query('INSERT INTO products (name,description,price,category,image_url,stock,carbon_kg,eco_badge,material,origin) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [name,description,price,category,image_url,stock||0,carbon_kg||0,eco_badge,material,origin]);
    res.status(201).json({ id: r.insertId });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/products/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock, carbon_kg, eco_badge, material, origin } = req.body;
    await query('UPDATE products SET name=?,description=?,price=?,category=?,image_url=?,stock=?,carbon_kg=?,eco_badge=?,material=?,origin=? WHERE id=?',
      [name,description,price,category,image_url,stock,carbon_kg,eco_badge,material,origin,req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/products/:id', authenticateToken, adminOnly, async (req, res) => {
  try { await query('DELETE FROM products WHERE id=?', [req.params.id]); res.json({ success: true }); }
  catch(e) { res.status(500).json({ error: 'Failed' }); }
});

// Orders management
router.get('/orders', authenticateToken, adminOnly, async (req, res) => {
  try {
    const orders = await query('SELECT o.*, u.name as user_name, u.email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 50');
    res.json(orders);
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/orders/:id/status', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    await query('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

// Users management
router.get('/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    res.json(await query('SELECT id,name,email,role,eco_points,created_at FROM users ORDER BY created_at DESC'));
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;