'use strict';

const express = require('express');
const { pool, query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/orders/checkout  { shipping_name, shipping_addr }
// Transactional: validates stock, creates order + items, decrements stock, clears cart.
router.post('/checkout', async (req, res) => {
  const { shipping_name, shipping_addr } = req.body || {};
  if (!shipping_name || !shipping_addr) {
    return res.status(400).json({ error: 'Shipping name and address are required.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock cart + product rows for a consistent checkout.
    const [items] = await conn.execute(
      `SELECT c.product_id, c.quantity, p.name, p.price, p.stock
       FROM cart_items c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ? FOR UPDATE`,
      [req.user.id]
    );

    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    for (const it of items) {
      if (it.stock < it.quantity) {
        await conn.rollback();
        return res.status(409).json({ error: `Insufficient stock for ${it.name}.` });
      }
    }

    const total = items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);

    const [orderRes] = await conn.execute(
      'INSERT INTO orders (user_id, total, status, shipping_name, shipping_addr) VALUES (?,?,?,?,?)',
      [req.user.id, total.toFixed(2), 'paid', shipping_name, shipping_addr]
    );
    const orderId = orderRes.insertId;

    for (const it of items) {
      await conn.execute(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?,?,?,?,?)',
        [orderId, it.product_id, it.name, it.price, it.quantity]
      );
      await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [
        it.quantity,
        it.product_id,
      ]);
    }

    await conn.execute('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    await conn.commit();

    res.status(201).json({ ok: true, order_id: orderId, total: Number(total.toFixed(2)) });
  } catch (err) {
    await conn.rollback();
    console.error('checkout error:', err.message);
    res.status(500).json({ error: 'Checkout failed.' });
  } finally {
    conn.release();
  }
});

// GET /api/orders  -> current user's order history
router.get('/', async (req, res) => {
  try {
    const orders = await query(
      'SELECT id, total, status, shipping_name, shipping_addr, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load orders.' });
  }
});

// GET /api/orders/:id  -> order with items (owner only)
router.get('/:id', async (req, res) => {
  try {
    const orders = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found.' });
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ order: orders[0], items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load order.' });
  }
});

module.exports = router;
