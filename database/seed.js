'use strict';

/**
 * Seeds the database with users and a 50+ item product catalog.
 * Idempotent: clears products/users before inserting.
 * (Catalog data lives in ./catalog.js, shared with the boot-time initializer.)
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { catalog, description, imageUrl } = require('./catalog');
require('dotenv').config();

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('Clearing existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['order_items', 'orders', 'cart_items', 'chat_messages', 'products', 'users']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // Users
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@shop.dev';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin123!';
    const adminHash = await bcrypt.hash(adminPass, 10);
    const custHash = await bcrypt.hash('Password123!', 10);

    await conn.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?), (?,?,?,?)',
      [
        'Store Admin', adminEmail, adminHash, 'admin',
        'Demo Customer', 'customer@shop.dev', custHash, 'customer',
      ]
    );
    console.log(`Seeded users. Admin: ${adminEmail} / ${adminPass}`);

    // Products
    let inserted = 0;
    for (let i = 0; i < catalog.length; i++) {
      const [name, category, price] = catalog[i];
      const stock = 20 + ((i * 7) % 80); // deterministic 20-99
      await conn.query(
        'INSERT INTO products (name, description, category, price, stock, image_url) VALUES (?,?,?,?,?,?)',
        [name, description(name, category), category, price, stock, imageUrl(name, category)]
      );
      inserted++;
    }
    console.log(`Seeded ${inserted} products.`);
    console.log('Seed complete.');
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
