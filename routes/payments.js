const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { all, get } = require('../models/database');

const router = express.Router();

// POST /api/payments/create-intent
// In production, this would use Stripe: stripe.paymentIntents.create(...)
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    // Simulate payment intent creation
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`;

    res.json({
      client_secret: clientSecret,
      payment_intent_id: paymentIntentId,
      amount,
      currency: 'usd'
    });
  } catch (err) {
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// POST /api/payments/confirm
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { payment_intent_id, card_number, expiry, cvv } = req.body;

    // Basic validation
    if (!payment_intent_id) {
      return res.status(400).json({ error: 'Payment intent required' });
    }

    // Simulate payment processing
    // In production: stripe.paymentIntents.confirm(payment_intent_id)
    const isDeclined = card_number && card_number.startsWith('4000000000000002');
    
    if (isDeclined) {
      return res.status(402).json({ error: 'Card declined. Please try another card.' });
    }

    res.json({
      success: true,
      payment_intent_id,
      status: 'succeeded',
      message: 'Payment processed successfully'
    });
  } catch (err) {
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
});

// GET /api/payments/methods
router.get('/methods', authenticateToken, async (req, res) => {
  // Return saved payment methods (simulated)
  res.json([
    { id: 'pm_demo', brand: 'visa', last4: '4242', expiry: '12/27' }
  ]);
});

module.exports = router;
