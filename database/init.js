'use strict';

/**
 * Boot-time database initializer.
 * Ensures all tables exist and seeds demo data if the catalog is empty.
 * Safe to run on every startup — table creation uses IF NOT EXISTS and
 * seeding only happens when the products table has no rows. This lets the
 * app work on a fresh cloud database (e.g. Railway MySQL) with zero manual steps.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { catalog, description, imageUrl } = require('./catalog');

// Pull just the CREATE TABLE statements from schema.sql (skip CREATE DATABASE / USE,
// since a managed cloud database already exists and may forbid those).
function tableStatements() {
  const raw = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Drop line comments so statements don't start with a "-- ..." line.
  const cleaned = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => /^CREATE TABLE/i.test(s));
}

async function ensureReady() {
  const conn = await pool.getConnection();
  try {
    for (const stmt of tableStatements()) {
      await conn.query(stmt);
    }

    const [rows] = await conn.query('SELECT COUNT(*) AS n FROM products');
    if (rows[0].n > 0) {
      // One-time image migration: refresh any legacy/mismatched image URLs
      // (e.g. old random stock photos) with on-brand product tiles.
      const [stale] = await conn.query(
        "SELECT id, name, category FROM products WHERE image_url IS NULL OR image_url NOT LIKE 'data:image/svg%'"
      );
      for (const p of stale) {
        await conn.query('UPDATE products SET image_url = ? WHERE id = ?', [
          imageUrl(p.name, p.category),
          p.id,
        ]);
      }
      if (stale.length) console.log(`✓ Refreshed ${stale.length} product images`);
      return { created: false, products: rows[0].n, imagesFixed: stale.length };
    }

    // Empty catalog -> seed demo users + products.
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@shop.dev';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin123!';
    const adminHash = await bcrypt.hash(adminPass, 10);
    const custHash = await bcrypt.hash('Password123!', 10);

    await conn.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?), (?,?,?,?)
       ON DUPLICATE KEY UPDATE email = email`,
      [
        'Store Admin', adminEmail, adminHash, 'admin',
        'Demo Customer', 'customer@shop.dev', custHash, 'customer',
      ]
    );

    for (let i = 0; i < catalog.length; i++) {
      const [name, category, price] = catalog[i];
      const stock = 20 + ((i * 7) % 80);
      await conn.query(
        'INSERT INTO products (name, description, category, price, stock, image_url) VALUES (?,?,?,?,?,?)',
        [name, description(name, category), category, price, stock, imageUrl(name, category)]
      );
    }

    return { created: true, products: catalog.length };
  } finally {
    conn.release();
  }
}

module.exports = { ensureReady };
