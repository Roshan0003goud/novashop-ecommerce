'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Build pool config from either a connection URL (Railway/PaaS style) or
 * discrete DB_* environment variables (local dev). A URL wins when present.
 */
function buildConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  }
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_platform',
  };
}

/**
 * Shared MySQL connection pool.
 * Pooling lets the app comfortably handle many concurrent requests
 * (used during load testing with 100+ simulated requests).
 */
const pool = mysql.createPool({
  ...buildConfig(),
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  namedPlaceholders: true,
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, testConnection };
