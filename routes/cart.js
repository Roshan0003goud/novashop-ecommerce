'use strict';

const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All cart routes require a logged-in user.
router.use(authenticate);

// GET /api/cart  -> items joined with product data + totals
router.get('/', async (req, res) => {
  try {
    const items = await query(
      `SELECT c.id AS cart_id, c.quantity, p.id AS product_id, p.name, p.price,
              p.image_url, p.stock, (p.price * c.quantity) AS line_total
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    const subtotal = items.reduce((sum, i) => sum + Number(i.line_total), 0);
    res.json({ items, subtotal: Number(subtotal.toFixed(2)), count: items.length });
  } catch (err) {
    console.error('get cart error:', err.message);
    res.status(500).json({ error: 'Failed to load cart.' });
  }
});

// POST /api/cart  { product_id, quantity } -> upsert (add to existing)
router.post('/', async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body || {};
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    if (!product_id) return res.status(400).json({ error: 'product_id is required.' });

    const prod = await query('SELECT id, stock FROM products WHERE id = ?', [product_id]);
    if (!prod.length) return res.status(404).json({ error: 'Product not found.' });
    if (prod[0].stock < qty) return res.status(409).json({ error: 'Not enough stock.' });

    await query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [req.user.id, product_id, qty]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('add cart error:', err.message);
    res.status(500).json({ error: 'Failed to add to cart.' });
  }
});

// PUT /api/cart/:productId  { quantity } -> set exact quantity
router.put('/:productId', async (req, res) => {
  try {
    const qty = parseInt(req.body.quantity, 10);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ error: 'quantity must be a non-negative integer.' });
    }
    if (qty === 0) {
      await query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [
        req.user.id,
        req.params.productId,
      ]);
    } else {
      await query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [
        qty,
        req.user.id,
        req.params.productId,
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart.' });
  }
});

// DELETE /api/cart/:productId
router.delete('/:productId', async (req, res) => {
  try {
    await query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [
      req.user.id,
      req.params.productId,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item.' });
  }
});

module.exports = router;
