'use strict';

require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const { testConnection } = require('./config/db');
const { ensureReady } = require('./database/init');
const { initChat } = require('./socket/chat');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Static frontend ---
app.use(express.static(path.join(__dirname, 'public')));

// SPA-ish fallback: serve index for unknown non-API GET routes.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Real-time chat ---
initChat(io);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await testConnection();
    console.log('✓ MySQL connection OK');
    // Auto-create tables + seed demo data on a fresh database (no manual steps needed).
    const init = await ensureReady();
    console.log(
      init.created
        ? `✓ Database initialized and seeded (${init.products} products)`
        : `✓ Database ready (${init.products} products)`
    );
  } catch (err) {
    console.error('✗ Database setup failed:', err.message);
    console.error('  Check your DB_* settings in .env (or Railway variables).');
  }
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log('   Real-time chat (Socket.IO) is active.\n');
  });
}

start();

module.exports = { app, server };
