# 🌿 EcoMarket — Sustainable E-Commerce Platform

A full-stack eco-friendly e-commerce platform built with:
- **Frontend**: HTML, CSS, Vanilla JavaScript (SPA)
- **Backend**: Node.js + Express
- **Database**: MySQL (via mysql2)

---

## ✨ Features

| Area | What's included |
|------|----------------|
| 🛍️ Shop | Product grid, filtering, search, sorting, product detail pages |
| 🛒 Cart | Slide-out drawer, quantity control, real-time totals |
| 👤 Auth | Register, login, JWT-protected routes, profile page |
| 📦 Orders | Place orders, order history, Eco Points rewards |
| 🌍 Carbon Calc | Annual footprint calculator with breakdown & tips |
| ♻️ Recycle | Schedule pickups, earn Eco Points, community stats |
| 💳 Payments | Simulated payment flow (drop-in Stripe when ready) |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- MySQL 8+ running locally (or remote)

### 2. Clone & install
```bash
git clone <your-repo>
cd ecomarket
npm install
```

### 3. Configure the database
```bash
cp .env.example .env
# Open .env and set your MySQL credentials
```

### 4. Run
```bash
node server.js
# or for auto-reload:
npx nodemon server.js
```

On first run, the app will:
1. Create the `ecomarket` database if it doesn't exist
2. Create all tables
3. Seed 8 eco-friendly products
4. Create a demo user

### 5. Open
Visit **http://localhost:3000**

Demo account: `demo@ecomarket.com` / `demo1234`

---

## 📁 Project Structure

```
ecomarket/
├── server.js              # Express app + route mounting
├── .env.example           # DB config template
├── models/
│   └── database.js        # MySQL pool, schema init, seed
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── routes/
│   ├── auth.js            # Register, login, profile
│   ├── products.js        # Product list, detail, categories
│   ├── cart.js            # Cart CRUD
│   ├── orders.js          # Order placement & history
│   ├── payments.js        # Payment intent + confirm (simulated)
│   ├── carbon.js          # Carbon footprint calculator
│   └── recycle.js         # Recycling program & pickup scheduling
└── public/
    ├── index.html         # Single-page app shell
    ├── css/styles.css     # Full stylesheet (organic luxury theme)
    └── js/app.js          # All frontend logic
```

---

## 🌱 Going to Production

1. **Real payments** — replace `routes/payments.js` stubs with Stripe SDK calls
2. **Environment** — set strong `JWT_SECRET` and `DB_PASSWORD` in environment variables
3. **HTTPS** — run behind nginx or use a platform like Railway / Render
4. **Email** — add Nodemailer for order confirmations
