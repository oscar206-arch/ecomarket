const express = require('express');
const { queryOne, query } = require('../models/database');
const router = express.Router();

router.post('/subscribe', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const exists = await queryOne('SELECT id FROM newsletter WHERE email=?', [email]);
    if (exists) return res.status(409).json({ error: 'Already subscribed' });
    const code = 'ECO10-' + Math.random().toString(36).substr(2,6).toUpperCase();
    await query('INSERT INTO newsletter (name, email, discount_code) VALUES (?,?,?)', [name, email, code]);
    res.json({ success: true, discount_code: code });
  } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
