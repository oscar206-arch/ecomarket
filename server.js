const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes    = require('./routes/cart');
const orderRoutes   = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const carbonRoutes  = require('./routes/carbon');
const recycleRoutes = require('./routes/recycle');
const wishlistRoutes= require('./routes/wishlist');
const reviewRoutes  = require('./routes/reviews');
const adminRoutes   = require('./routes/admin');
const couponRoutes  = require('./routes/coupons');
const newsletterRoutes = require('./routes/newsletter');
const { initDB }    = require('./models/database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/carbon',     carbonRoutes);
app.use('/api/recycle',    recycleRoutes);
app.use('/api/wishlist',   wishlistRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/coupons',    couponRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🌿 EcoMarket running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});

module.exports = app;
