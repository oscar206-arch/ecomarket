const express = require('express');
const { query } = require('../models/database');
const router = express.Router();

const TRANSPORT = { car:0.21, bus:0.089, train:0.041, plane:0.255, bike:0, walk:0 };
const DIET      = { vegan:1500, vegetarian:1700, flexitarian:2500, omnivore:3300, high_meat:4500 };
const HOME      = { electricity_kwh: 0.233, gas_m3: 2.04 };

router.post('/calculate', (req, res) => {
  try {
    const { transport, distance_km, diet, electricity_kwh, gas_m3, household_size = 1 } = req.body;
    let total = 0;
    const breakdown = {};

    if (transport && distance_km) {
      const v = (TRANSPORT[transport] || 0) * Number(distance_km) * 365;
      breakdown.transport = Math.round(v); total += v;
    }
    if (diet) {
      const v = DIET[diet] || 2500;
      breakdown.diet = Math.round(v); total += v;
    }
    if (electricity_kwh) {
      const v = HOME.electricity_kwh * Number(electricity_kwh) * 12;
      breakdown.electricity = Math.round(v); total += v;
    }
    if (gas_m3) {
      const v = HOME.gas_m3 * Number(gas_m3) * 12;
      breakdown.gas = Math.round(v); total += v;
    }

    const per = total / Number(household_size);
    const global_avg = 4000;
    const tips = [];
    if ((breakdown.transport||0) > 1000) tips.push('Switch to public transport to cut emissions by up to 75%');
    if ((breakdown.diet||0) > 2000)      tips.push('Reducing meat 3×/week could save 0.5 tonnes CO₂ annually');
    if ((breakdown.electricity||0) > 1000) tips.push('Switch to a renewable energy provider or install solar');
    if (per < 3000) tips.push('Great work! Share your eco habits with friends and family 🌍');
    tips.push('Shopping sustainably reduces demand for high-carbon manufacturing');

    res.json({
      total_kg:        Math.round(per),
      total_tonnes:    (per / 1000).toFixed(2),
      breakdown,
      comparison:      per > global_avg ? 'above' : 'below',
      diff_pct:        Math.abs(Math.round((per - global_avg) / global_avg * 100)),
      global_avg_kg:   global_avg,
      tips,
      offset_cost_usd: (per * 0.015).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: 'Calculation failed' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const rows = await query('SELECT id, name, carbon_kg FROM products ORDER BY carbon_kg ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch carbon data' });
  }
});

router.post('/offset', (req, res) => {
  const { kg } = req.body;
  res.json({
    success: true,
    kg_offset: kg,
    cost_usd: (kg * 0.015).toFixed(2),
    trees_equivalent: Math.round(kg / 21),
    project: 'Amazon Rainforest Conservation — Acre State, Brazil',
    certificate_id: `ECO-${Date.now()}`
  });
});

module.exports = router;
