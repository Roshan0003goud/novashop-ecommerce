'use strict';

const express = require('express');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/products?search=&category=&sort=&page=&limit=
// Optimized listing with filtering, sorting, and pagination.
router.get('/', async (req, res) => {
  try {
    const { search = '', category = '', sort = 'newest' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (search) {
      where.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sortMap = {
      newest: 'created_at DESC',
      price_asc: 'price ASC',
      price_desc: 'price DESC',
      name: 'name ASC',
    };
    const orderSql = sortMap[sort] || sortMap.newest;

    const countRows = await query(`SELECT COUNT(*) AS total FROM products ${whereSql}`, params);
    const total = countRows[0].total;

    // LIMIT/OFFSET inlined as validated integers (mysql2 placeholders can't bind LIMIT reliably).
    const items = await query(
      `SELECT id, name, description, category, price, stock, image_url
       FROM products ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('list products error:', err.message);
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const rows = await query(
      'SELECT category, COUNT(*) AS count FROM products GROUP BY category ORDER BY category'
    );
    res.json({ categories: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load categories.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load product.' });
  }
});

// POST /api/products  (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, category, price, stock, image_url } = req.body || {};
    if (!name || !category || price == null) {
      return res.status(400).json({ error: 'name, category, and price are required.' });
    }
    const result = await query(
      'INSERT INTO products (name, description, category, price, stock, image_url) VALUES (?,?,?,?,?,?)',
      [name, description || null, category, price, stock || 0, image_url || null]
    );
    const rows = await query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ product: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

module.exports = router;
