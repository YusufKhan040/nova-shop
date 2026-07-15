const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'nova-shop.db');
const dataDir = path.dirname(databasePath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(databasePath);
const SECRET = process.env.SESSION_SECRET || 'replace-this-before-deployment';
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be set in production.');

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price REAL NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0), emoji TEXT NOT NULL, color TEXT NOT NULL, image TEXT NOT NULL DEFAULT '', description TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, order_code TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, customer_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL, postal_code TEXT NOT NULL, payment_method TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending', status TEXT NOT NULL DEFAULT 'placed', subtotal REAL NOT NULL, shipping REAL NOT NULL, total REAL NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id));
  CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, product_name TEXT NOT NULL, unit_price REAL NOT NULL, quantity INTEGER NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(product_id) REFERENCES products(id));
  CREATE TABLE IF NOT EXISTS product_reviews (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, customer_name TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(product_id) REFERENCES products(id));
  CREATE TABLE IF NOT EXISTS cart_items (user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, product_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(product_id) REFERENCES products(id));
  CREATE TABLE IF NOT EXISTS wishlist_items (user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, product_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(product_id) REFERENCES products(id));
`);
if (!db.prepare("SELECT COUNT(*) AS count FROM pragma_table_info('products') WHERE name = 'image'").get().count) db.exec("ALTER TABLE products ADD COLUMN image TEXT NOT NULL DEFAULT ''");

function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function matchesPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}
function tokenFor(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function getUser(req) {
  const header = req.headers.authorization || '';
  const [payload, signature] = header.replace('Bearer ', '').split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (session.exp < Date.now()) return null;
    return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(session.id) || null;
  } catch { return null; }
}
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (!count) {
    const insert = db.prepare('INSERT INTO products (name, category, price, stock, emoji, color, image, description, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    [
      ['Orbit Headphones', 'Audio', 89.99, 18, '🎧', '#dbeafe', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85', 'Wireless comfort with deep, clear sound.', 1],
      ['Canvas Daypack', 'Accessories', 54, 23, '🎒', '#fef3c7', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85', 'A practical everyday bag built to go anywhere.', 1],
      ['Ceramic Pour Set', 'Home', 42.5, 15, '☕', '#fce7f3', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85', 'Brew slower mornings with a hand-finished set.', 1],
      ['Studio Lamp', 'Home', 76, 9, '💡', '#ede9fe', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85', 'Warm, adjustable light for focused evenings.', 0],
      ['Everyday Sneakers', 'Fashion', 68, 31, '👟', '#dcfce7', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', 'Cushioned, versatile sneakers for daily wear.', 1],
      ['Steel Bottle', 'Accessories', 28, 40, '🧴', '#e0f2fe', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85', 'A durable insulated bottle that stays cold.', 0]
    ].forEach(product => insert.run(...product));
  }
  const productImages = [
    [1, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85'], [2, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85'], [3, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85'], [4, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85'], [5, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85'], [6, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85']
  ];
  productImages.forEach(([id, image]) => db.prepare("UPDATE products SET image = ? WHERE id = ? AND image = ''").run(image, id));
  const addProduct = db.prepare('INSERT INTO products (name, category, price, stock, emoji, color, image, description, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const existingProduct = db.prepare('SELECT id FROM products WHERE name = ?');
  const expandedCatalogue = [
    ['Sunday Alarm Clock', 'Home', 36, 25, '⏰', '#e9e2d0', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85', 'A quiet, considered clock for unrushed mornings.', 0],
    ['Pocket Film Camera', 'Tech', 119, 12, '📷', '#d8d4cb', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85', 'A compact camera for keeping everyday memories close.', 1],
    ['Focus Desk Mat', 'Office', 32, 34, '⌨️', '#d7e3df', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85', 'Soft vegan-leather surface for a calmer workday.', 0],
    ['Field Notes Set', 'Office', 16, 50, '📓', '#f5e1a8', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85', 'Three tactile notebooks for ideas worth keeping.', 0],
    ['Linen Throw', 'Home', 64, 14, '🧶', '#e8d6c6', 'https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fit=crop&w=900&q=85', 'Washed linen texture for your favourite corner.', 1],
    ['Amber Candle', 'Wellness', 24, 28, '🕯️', '#ead0b1', 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85', 'Warm cedar and orange blossom for slower evenings.', 0],
    ['Daily Ritual Set', 'Wellness', 48, 20, '🧴', '#e3eee5', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85', 'Gentle essentials for a simple daily reset.', 1],
    ['Classic Sunglasses', 'Fashion', 39, 22, '🕶️', '#d9d7d1', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85', 'Timeless frames with comfortable all-day wear.', 0],
    ['Wool Cap', 'Fashion', 27, 31, '🧢', '#e1d4bf', 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85', 'A softly structured cap for cooler days.', 0],
    ['Analog Watch', 'Accessories', 95, 8, '⌚', '#e0ddcf', 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85', 'A clean, reliable timepiece with a leather strap.', 1],
    ['Travel Pouch', 'Travel', 22, 42, '🧳', '#d5e1e5', 'https://images.unsplash.com/photo-1553531889-56cd4e7b7c12?auto=format&fit=crop&w=900&q=85', 'Keeps small travel essentials together and easy to find.', 0],
    ['Weekender Bag', 'Travel', 82, 16, '👜', '#e5d4bf', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85', 'Roomy carry-on companion for weekends away.', 1],
    ['Portable Speaker', 'Tech', 58, 19, '🔊', '#d9e1ed', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85', 'Rich sound in a compact, take-anywhere shape.', 0],
    ['Reading Lamp', 'Home', 68, 11, '💡', '#f2dfbf', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85', 'A focused pool of warm light for your evening read.', 0],
    ['Waterproof Journal', 'Travel', 19, 37, '📔', '#c8d9d2', 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=85', 'Built to hold plans, sketches, and passing thoughts.', 0],
    ['Insulated Tumbler', 'Wellness', 31, 26, '🥤', '#dce8e8', 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=900&q=85', 'Keeps your tea or coffee at just the right temperature.', 0]
  ];
  expandedCatalogue.forEach(product => { if (!existingProduct.get(product[0])) addProduct.run(...product); });
  db.prepare("UPDATE products SET image = ? WHERE name = 'Travel Pouch'").run('https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85');
  const reviewCount = db.prepare('SELECT COUNT(*) AS count FROM product_reviews WHERE product_id = ?');
  const addReview = db.prepare('INSERT INTO product_reviews (product_id, customer_name, rating, title, body) VALUES (?, ?, ?, ?, ?)');
  db.prepare('SELECT id, name FROM products').all().forEach(product => {
    if (!reviewCount.get(product.id).count) {
      addReview.run(product.id, 'Mia R.', 5, 'Exactly what I wanted', `The ${product.name} feels even better in person. It has quickly become part of my daily routine.`);
      addReview.run(product.id, 'Daniel K.', 5, 'Thoughtful and well made', 'Beautifully finished, useful, and delivered quickly. I would happily recommend it.');
    }
  });
  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@novashop.local');
  if (!admin) db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run('Store Admin', 'admin@novashop.local', passwordHash('Admin@12345'));
}
seedDatabase();

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid request data.')); } });
  });
}
function clean(value, max = 160) { return String(value || '').trim().slice(0, max); }
function requireUser(req, res) { const user = getUser(req); if (!user) send(res, 401, { error: 'Please sign in to continue.' }); return user; }
function requireAdmin(req, res) { const user = requireUser(req, res); if (!user) return null; if (user.role !== 'admin') { send(res, 403, { error: 'Admin access required.' }); return null; } return user; }
function productRows(where = 'active = 1', args = []) { return db.prepare(`SELECT id, name, category, price, stock, emoji, color, image, description, featured FROM products WHERE ${where} ORDER BY featured DESC, id DESC`).all(...args); }
function galleryFor(product) {
  // Each gallery intentionally stays tied to this product's own photograph.
  // The additional views are focused crops of the same item, never photos of another product.
  const source = product.image || '';
  const separator = source.includes('?') ? '&' : '?';
  return source ? [
    `${source}${separator}view=full&w=1200&h=900&fit=contain`,
    `${source}${separator}view=detail&w=1200&h=900&fit=crop&crop=entropy`,
    `${source}${separator}view=material&w=1200&h=900&fit=crop&crop=edges`
  ] : [];
}

async function api(req, res, url) {
  const route = url.pathname;
  if (req.method === 'GET' && route === '/health') return send(res, 200, { status: 'ok', database: 'connected' });
  if (req.method === 'GET' && route === '/api/products') {
    const search = clean(url.searchParams.get('search'), 60).toLowerCase(); const category = clean(url.searchParams.get('category'), 50);
    let sql = 'active = 1'; const args = [];
    if (category && category !== 'All') { sql += ' AND category = ?'; args.push(category); }
    if (search) { sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
    return send(res, 200, productRows(sql, args));
  }
  if (req.method === 'GET' && /^\/api\/products\/\d+$/.test(route)) {
    const product = db.prepare('SELECT id, name, category, price, stock, emoji, color, image, description, featured FROM products WHERE id = ? AND active = 1').get(Number(route.split('/').pop()));
    if (!product) return send(res, 404, { error: 'Product not found.' });
    const reviews = db.prepare('SELECT customer_name, rating, title, body, created_at FROM product_reviews WHERE product_id = ? ORDER BY id DESC').all(product.id);
    return send(res, 200, { product: { ...product, images: galleryFor(product) }, reviews });
  }
  if (req.method === 'POST' && route === '/api/auth/register') {
    const input = await body(req); const name = clean(input.name); const email = clean(input.email, 120).toLowerCase(); const password = String(input.password || '');
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return send(res, 400, { error: 'Enter a name, valid email, and a password of at least 8 characters.' });
    try { const result = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, passwordHash(password)); const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid); return send(res, 201, { user, token: tokenFor(user) }); } catch { return send(res, 409, { error: 'An account with that email already exists.' }); }
  }
  if (req.method === 'POST' && route === '/api/auth/login') {
    const input = await body(req); const user = db.prepare('SELECT * FROM users WHERE email = ?').get(clean(input.email, 120).toLowerCase());
    if (!user || !matchesPassword(String(input.password || ''), user.password_hash)) return send(res, 401, { error: 'Incorrect email or password.' });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role }; return send(res, 200, { user: safeUser, token: tokenFor(safeUser) });
  }
  if (req.method === 'GET' && route === '/api/me') { const user = requireUser(req, res); return user && send(res, 200, { user }); }
  if (req.method === 'GET' && route === '/api/cart') {
    const user = requireUser(req, res); if (!user) return;
    const items = db.prepare('SELECT product_id AS id, quantity FROM cart_items WHERE user_id = ? ORDER BY updated_at DESC').all(user.id);
    return send(res, 200, { items });
  }
  if (req.method === 'PUT' && route === '/api/cart') {
    const user = requireUser(req, res); if (!user) return; const input = await body(req);
    if (!Array.isArray(input.items)) return send(res, 400, { error: 'Cart items are required.' });
    try {
      db.exec('BEGIN IMMEDIATE'); db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(user.id);
      const add = db.prepare('INSERT INTO cart_items (user_id, product_id, quantity, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
      for (const requested of input.items.slice(0, 50)) { const product = db.prepare('SELECT stock FROM products WHERE id = ? AND active = 1').get(Number(requested.id)); const quantity = Math.max(1, Math.min(20, Number(requested.quantity) || 1)); if (product && product.stock >= quantity) add.run(user.id, Number(requested.id), quantity); }
      db.exec('COMMIT'); return send(res, 200, { success: true });
    } catch (error) { try { db.exec('ROLLBACK'); } catch {} return send(res, 400, { error: error.message }); }
  }
  if (req.method === 'GET' && route === '/api/wishlist') {
    const user = requireUser(req, res); if (!user) return;
    const items = db.prepare('SELECT product_id AS id FROM wishlist_items WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    return send(res, 200, { items: items.map(item => item.id) });
  }
  if (req.method === 'PUT' && route === '/api/wishlist') {
    const user = requireUser(req, res); if (!user) return; const input = await body(req);
    if (!Array.isArray(input.items)) return send(res, 400, { error: 'Wishlist items are required.' });
    try {
      db.exec('BEGIN IMMEDIATE'); db.prepare('DELETE FROM wishlist_items WHERE user_id = ?').run(user.id);
      const add = db.prepare('INSERT OR IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)');
      input.items.slice(0, 100).forEach(id => { if (db.prepare('SELECT id FROM products WHERE id = ? AND active = 1').get(Number(id))) add.run(user.id, Number(id)); });
      db.exec('COMMIT'); return send(res, 200, { success: true });
    } catch (error) { try { db.exec('ROLLBACK'); } catch {} return send(res, 400, { error: error.message }); }
  }
  if (req.method === 'GET' && route === '/api/orders') { const user = requireUser(req, res); if (!user) return; const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(user.id); const items = db.prepare('SELECT product_name, unit_price, quantity FROM order_items WHERE order_id = ?'); return send(res, 200, orders.map(order => ({ ...order, items: items.all(order.id) }))); }
  if (req.method === 'POST' && route === '/api/orders') {
    const user = requireUser(req, res); if (!user) return; const input = await body(req); const delivery = input.delivery || {}; const required = ['name', 'phone', 'address', 'city', 'postalCode'];
    if (required.some(key => !clean(delivery[key]))) return send(res, 400, { error: 'Complete all delivery details.' });
    if (!Array.isArray(input.items) || !input.items.length) return send(res, 400, { error: 'Your bag is empty.' });
    try {
      db.exec('BEGIN IMMEDIATE'); let subtotal = 0; const items = [];
      for (const requested of input.items) { const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(requested.id)); const quantity = Math.max(1, Math.min(20, Number(requested.quantity) || 1)); if (!product || product.stock < quantity) throw new Error(`${product?.name || 'An item'} is no longer available in that quantity.`); subtotal += product.price * quantity; items.push({ product, quantity }); }
      const shipping = subtotal >= 75 ? 0 : 7.5; const total = subtotal + shipping; const code = `NOVA-${Date.now().toString().slice(-8)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const result = db.prepare('INSERT INTO orders (order_code, user_id, customer_name, email, phone, address, city, postal_code, payment_method, payment_status, subtotal, shipping, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(code, user.id, clean(delivery.name), user.email, clean(delivery.phone, 30), clean(delivery.address, 300), clean(delivery.city), clean(delivery.postalCode, 20), input.paymentMethod === 'cod' ? 'cash_on_delivery' : 'demo_card', input.paymentMethod === 'cod' ? 'pending' : 'paid_demo', subtotal, shipping, total);
      const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)'); const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?'); items.forEach(({ product, quantity }) => { addItem.run(result.lastInsertRowid, product.id, product.name, product.price, quantity); updateStock.run(quantity, product.id); }); db.exec('COMMIT'); return send(res, 201, { orderCode: code, total, message: 'Your order has been placed.' });
    } catch (error) { try { db.exec('ROLLBACK'); } catch {} return send(res, 400, { error: error.message }); }
  }
  if (route.startsWith('/api/admin')) {
    if (!requireAdmin(req, res)) return;
    if (req.method === 'GET' && route === '/api/admin/dashboard') { const stats = db.prepare("SELECT (SELECT COUNT(*) FROM orders) AS orders, (SELECT COALESCE(SUM(total), 0) FROM orders) AS revenue, (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers, (SELECT COUNT(*) FROM products WHERE stock <= 5) AS lowStock").get(); const orders = db.prepare('SELECT order_code, customer_name, total, status, created_at FROM orders ORDER BY id DESC LIMIT 12').all(); return send(res, 200, { stats, orders, products: productRows('1 = 1') }); }
    if (req.method === 'POST' && route === '/api/admin/products') { const p = await body(req); const name = clean(p.name); const category = clean(p.category); const price = Number(p.price); const stock = Number(p.stock); if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return send(res, 400, { error: 'Enter valid product information.' }); const result = db.prepare('INSERT INTO products (name, category, price, stock, emoji, color, image, description, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, category, price, stock, clean(p.emoji, 4) || '🛍️', clean(p.color, 20) || '#e5e7eb', clean(p.image, 500), clean(p.description, 300) || 'New store product.', p.featured ? 1 : 0); return send(res, 201, { id: result.lastInsertRowid }); }
    if (req.method === 'PATCH' && /^\/api\/admin\/products\/\d+$/.test(route)) { const id = Number(route.split('/').pop()); const p = await body(req); const stock = Number(p.stock); if (!Number.isInteger(stock) || stock < 0) return send(res, 400, { error: 'Stock must be zero or more.' }); db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, id); return send(res, 200, { success: true }); }
  }
  return send(res, 404, { error: 'API route not found.' });
}
function serveFile(res, pathname) { const file = pathname === '/' ? 'index.html' : pathname.slice(1); const target = path.resolve(publicDir, file); if (!target.startsWith(`${publicDir}${path.sep}`) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return send(res, 404, 'Page not found', 'text/plain'); const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' }; return send(res, 200, fs.readFileSync(target), types[path.extname(target)] || 'application/octet-stream'); }
const server = http.createServer((req, res) => { const url = new URL(req.url, `http://${req.headers.host}`); if (url.pathname === '/health' || url.pathname.startsWith('/api/')) api(req, res, url).catch(error => { console.error(error); send(res, 500, { error: 'Something went wrong. Please try again.' }); }); else serveFile(res, url.pathname); });
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. In Command Prompt run: set PORT=3001 && npm start` : error); process.exit(1); });
server.listen(PORT, () => console.log(`Nova Shop is running at http://localhost:${PORT}`));
