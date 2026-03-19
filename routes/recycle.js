const express = require('express');
const { query, queryOne } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const POINTS = { electronics:50, clothing:20, plastic:10, glass:10, paper:5, metal:15, other:8 };

router.get('/types', (req, res) => {
  res.json([
    { type:'electronics', label:'Electronics & Gadgets', points:50, icon:'📱', desc:'Phones, laptops, batteries' },
    { type:'clothing',    label:'Clothing & Textiles',   points:20, icon:'👕', desc:'Clothes, shoes, fabric' },
    { type:'plastic',     label:'Plastic Items',         points:10, icon:'♻️', desc:'Bottles, containers, packaging' },
    { type:'glass',       label:'Glass',                 points:10, icon:'🫙', desc:'Bottles, jars, glass items' },
    { type:'paper',       label:'Paper & Cardboard',     points:5,  icon:'📦', desc:'Boxes, books, documents' },
    { type:'metal',       label:'Metal',                 points:15, icon:'🔧', desc:'Cans, tools, appliances' },
    { type:'other',       label:'Other',                 points:8,  icon:'🌿', desc:'Any other recyclable item' },
  ]);
});

router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { item_description, item_type, pickup_date, address } = req.body;
    if (!item_description || !item_type || !pickup_date || !address)
      return res.status(400).json({ error: 'All fields required' });

    const pts = POINTS[item_type] || 8;
    const result = await query(
      `INSERT INTO recycle_requests
         (user_id, item_description, item_type, pickup_date, address, eco_points_awarded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, item_description, item_type, pickup_date, address, pts]
    );
    await query('UPDATE users SET eco_points = eco_points + ? WHERE id = ?', [pts, req.user.id]);
    res.status(201).json({
      success: true, request_id: result.insertId, eco_points_awarded: pts,
      message: `Pickup scheduled for ${pickup_date}. You earned ${pts} eco points!`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM recycle_requests WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const row = await queryOne(
      'SELECT COUNT(*) AS total, COALESCE(SUM(eco_points_awarded),0) AS pts FROM recycle_requests'
    );
    res.json({
      total_requests:       row.total,
      total_points_awarded: row.pts,
      kg_diverted:          (row.total * 2.3).toFixed(1),
      trees_saved:          Math.floor(row.total * 0.4)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;