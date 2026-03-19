const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || 'root',
  database:           process.env.DB_NAME     || 'ecocart',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function initDB() {
  const raw = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root'
  });
  await raw.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'ecocart'}\``);
  await raw.end();

  await query(`CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(180) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  DEFAULT 'customer',
    eco_points  INT          DEFAULT 0,
    referral_code VARCHAR(30) UNIQUE,
    referred_by INT          DEFAULT NULL,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
  )`);

  await query(`CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    details     TEXT,
    price       DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) DEFAULT NULL,
    category    VARCHAR(80),
    image_url   TEXT,
    images      TEXT,
    stock       INT          DEFAULT 0,
    carbon_kg   DECIMAL(6,2) DEFAULT 0,
    eco_badge   VARCHAR(80),
    eco_score   VARCHAR(2)   DEFAULT 'A',
    material    VARCHAR(120),
    origin      VARCHAR(80),
    rating      DECIMAL(3,1) DEFAULT 4.5,
    reviews     INT          DEFAULT 0,
    is_featured TINYINT      DEFAULT 0,
    is_new      TINYINT      DEFAULT 0,
    is_sale     TINYINT      DEFAULT 0,
    tags        TEXT,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
  )`);

  await query(`CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_wish (user_id, product_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS orders (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    total            DECIMAL(10,2),
    status           VARCHAR(40) DEFAULT 'pending',
    shipping_address TEXT,
    payment_intent   VARCHAR(120),
    carbon_offset    DECIMAL(6,2) DEFAULT 0,
    coupon_code      VARCHAR(30),
    discount_amount  DECIMAL(10,2) DEFAULT 0,
    tracking_number  VARCHAR(60),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT,
    price DECIMAL(10,2),
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS reviews (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id    INT NOT NULL,
    rating     INT NOT NULL,
    title      VARCHAR(120),
    body       TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
  )`);

  await query(`CREATE TABLE IF NOT EXISTS coupons (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    type        VARCHAR(20) DEFAULT 'percent',
    value       DECIMAL(10,2) NOT NULL,
    min_order   DECIMAL(10,2) DEFAULT 0,
    uses_left   INT DEFAULT 100,
    expires_at  DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await query(`CREATE TABLE IF NOT EXISTS newsletter (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(120),
    email      VARCHAR(180) UNIQUE NOT NULL,
    discount_code VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await query(`CREATE TABLE IF NOT EXISTS recycle_requests (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    user_id            INT NOT NULL,
    item_description   TEXT,
    item_type          VARCHAR(60),
    pickup_date        DATE,
    address            TEXT,
    status             VARCHAR(40) DEFAULT 'pending',
    eco_points_awarded INT DEFAULT 0,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Seed default coupon
  const coupon = await queryOne('SELECT id FROM coupons WHERE code = ?', ['ECO10']);
  if (!coupon) {
    await query(`INSERT INTO coupons (code, type, value, min_order, uses_left)
                 VALUES ('ECO10', 'percent', 10, 0, 999)`);
    await query(`INSERT INTO coupons (code, type, value, min_order, uses_left)
                 VALUES ('SAVE20', 'percent', 20, 50, 500)`);
    await query(`INSERT INTO coupons (code, type, value, min_order, uses_left)
                 VALUES ('FLAT5', 'fixed', 5, 30, 200)`);
  }

  // Seed demo admin user
  const admin = await queryOne('SELECT id FROM users WHERE email = ?', ['admin@ecomarket.com']);
  if (!admin) {
    const hash = await bcrypt.hash('admin1234', 10);
    await query(`INSERT INTO users (name, email, password, role, eco_points, referral_code)
                 VALUES (?, ?, ?, 'admin', 0, ?)`,
      ['Admin', 'admin@ecomarket.com', hash, 'ADMIN001']);
  }

  console.log('✅ Database ready');
}

module.exports = { pool, query, queryOne, initDB };
