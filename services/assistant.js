'use strict';

/**
 * NovaShop AI support assistant.
 *
 * generateReply(userText) returns an assistant answer string.
 *   • If ANTHROPIC_API_KEY is set, it asks Claude (with the live product catalog
 *     as context) for a natural answer.
 *   • Otherwise it falls back to a built-in rule-based responder that still
 *     answers common questions using real data from the MySQL catalog.
 *
 * This means the support chat always replies instantly, and upgrades to full
 * AI the moment an API key is provided — no code change needed.
 */
const { query } = require('../config/db');

const ASSISTANT_NAME = 'NovaShop Assistant';

// Lazily create the Claude client only when a key exists.
let anthropic = null;
function getClient() {
  if (anthropic) return anthropic;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropic = new Anthropic();
    return anthropic;
  } catch (err) {
    console.error('Anthropic SDK not available:', err.message);
    return null;
  }
}

// Small, cached catalog summary for grounding answers.
let catalogCache = { at: 0, text: '' };
async function catalogSummary() {
  if (Date.now() - catalogCache.at < 60000 && catalogCache.text) return catalogCache.text;
  try {
    const rows = await query(
      'SELECT name, category, price, stock FROM products ORDER BY category, name'
    );
    const text = rows
      .map((p) => `- ${p.name} (${p.category}) — $${Number(p.price).toFixed(2)}, ${p.stock > 0 ? p.stock + ' in stock' : 'sold out'}`)
      .join('\n');
    catalogCache = { at: Date.now(), text };
    return text;
  } catch {
    return '';
  }
}

async function claudeReply(userText, userName) {
  const client = getClient();
  if (!client) return null;
  const catalog = await catalogSummary();
  const system =
    `You are ${ASSISTANT_NAME}, the friendly support agent for an online store called NovaShop. ` +
    `Answer only questions about NovaShop: products, prices, stock, how to order, shipping, returns, payment, and accounts. ` +
    `Keep replies short (1-3 sentences) and helpful. To buy an item, tell customers to click the "+" on a product to add it to their cart, then open the cart and check out. ` +
    `Shipping is free over $50. Returns are accepted within 30 days. Checkout is a demo, so no real card is charged. ` +
    `If a customer explicitly asks for a human/agent, tell them you're connecting them to a NovaShop team member.\n\n` +
    `Current product catalog:\n${catalog}`;

  const resp = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: String(userText).slice(0, 1000) }],
  });
  const block = (resp.content || []).find((b) => b.type === 'text');
  return block ? block.text.trim() : null;
}

// ---- Rule-based fallback (no API key required) ----
function has(text, ...words) {
  return words.some((w) => text.includes(w));
}

async function findProducts(text) {
  // Pull candidate keywords (>=4 chars) and search the catalog.
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  if (!words.length) return [];
  const likes = words.map(() => 'name LIKE ?').join(' OR ');
  const params = words.map((w) => `%${w}%`);
  try {
    return await query(
      `SELECT name, price, stock FROM products WHERE ${likes} LIMIT 3`,
      params
    );
  } catch {
    return [];
  }
}

const STOPWORDS = new Set([
  'this', 'that', 'have', 'want', 'need', 'your', 'with', 'from', 'about',
  'please', 'thanks', 'where', 'when', 'what', 'much', 'does', 'they', 'them',
  'product', 'products', 'item', 'items', 'order', 'orders', 'shop', 'store',
]);

async function ruleReply(userText, userName) {
  const text = String(userText || '').toLowerCase().trim();
  const first = userName ? userName.split(' ')[0] : 'there';

  if (has(text, 'human', 'agent', 'representative', 'real person', 'someone')) {
    return `Sure — I'm connecting you to a NovaShop team member. In the meantime, is there anything I can help with?`;
  }
  if (has(text, 'hi', 'hello', 'hey', 'good morning', 'good evening') && text.length < 20) {
    return `Hi ${first}! 👋 Welcome to NovaShop. I can help you find products, place an order, or answer questions about shipping and returns. What are you looking for?`;
  }
  if (has(text, 'ship', 'delivery', 'deliver', 'arrive')) {
    return `We offer free shipping on all orders over $50, and most orders arrive within a few business days. 🚚`;
  }
  if (has(text, 'return', 'refund', 'exchange')) {
    return `No problem — we accept returns within 30 days for a full refund. Just let us know which order you'd like to return.`;
  }
  if (has(text, 'pay', 'payment', 'card', 'checkout', 'secure')) {
    return `Checkout is quick and secure. Add items to your cart, open the cart, and click "Proceed to checkout". (This is a demo store, so no real card is charged.) 🔒`;
  }
  if (has(text, 'track', 'my order', 'status of')) {
    return `You can view all your orders and their status on the "Orders" page in the top menu once you're signed in.`;
  }

  // How to buy / where to get — the exact question from the screenshot.
  if (has(text, 'where', 'how do i', 'how to', 'get the', 'buy', 'purchase', 'add to cart')) {
    const matches = await findProducts(text);
    if (matches.length) {
      const p = matches[0];
      return `You can order the ${p.name} right here — it's $${Number(p.price).toFixed(2)}${p.stock > 0 ? '' : ' (currently sold out)'}. ` +
        `Just click the "+" button on its card to add it to your cart, then open the cart and check out. 🛒`;
    }
    return `To buy anything on NovaShop, click the "+" button on a product to add it to your cart, then open your cart (top-right) and click "Proceed to checkout". Want me to help you find a specific product?`;
  }

  // Product lookup ("do you have X", "price of X", or just a product name)
  const matches = await findProducts(text);
  if (matches.length) {
    const lines = matches
      .map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)} (${p.stock > 0 ? p.stock + ' in stock' : 'sold out'})`)
      .join('\n');
    return `Here's what I found:\n${lines}\nClick the "+" on a product to add it to your cart. 🛒`;
  }

  return `I'm happy to help, ${first}! I can help you find products, place an order, or answer questions about shipping, returns, and payment. Could you tell me a bit more about what you need?`;
}

async function generateReply(userText, opts = {}) {
  // Try Claude; fall back to rules on any error or missing key.
  try {
    const ai = await claudeReply(userText, opts.userName);
    if (ai) return { text: ai, source: 'ai' };
  } catch (err) {
    console.error('assistant AI error:', err.message);
  }
  const text = await ruleReply(userText, opts.userName);
  return { text, source: 'rules' };
}

module.exports = { generateReply, ASSISTANT_NAME };