'use strict';

// Shared product catalog (50+ items) used by both the seed script and
// the auto-initializer that runs on first boot in cloud deployments.
const catalog = [
  // Electronics
  ['Wireless Noise-Cancelling Headphones', 'Electronics', 199.99],
  ['Bluetooth Portable Speaker', 'Electronics', 59.99],
  ['4K Action Camera', 'Electronics', 149.99],
  ['Mechanical Gaming Keyboard', 'Electronics', 89.99],
  ['Ergonomic Wireless Mouse', 'Electronics', 34.99],
  ['27" QHD Monitor', 'Electronics', 279.99],
  ['USB-C Fast Charger 65W', 'Electronics', 24.99],
  ['Smartwatch Fitness Tracker', 'Electronics', 129.99],
  ['1080p Webcam with Ring Light', 'Electronics', 45.99],
  ['Portable SSD 1TB', 'Electronics', 109.99],
  ['Wireless Earbuds Pro', 'Electronics', 79.99],
  ['Smart Home Hub', 'Electronics', 64.99],
  // Home & Kitchen
  ['Stainless Steel French Press', 'Home & Kitchen', 29.99],
  ['Non-Stick Cookware Set (10pc)', 'Home & Kitchen', 119.99],
  ['Robot Vacuum Cleaner', 'Home & Kitchen', 219.99],
  ['Electric Kettle 1.7L', 'Home & Kitchen', 39.99],
  ['Memory Foam Pillow (2-pack)', 'Home & Kitchen', 44.99],
  ['Ceramic Dinnerware Set', 'Home & Kitchen', 74.99],
  ['LED Desk Lamp with USB', 'Home & Kitchen', 27.99],
  ['Air Purifier HEPA', 'Home & Kitchen', 139.99],
  ['Cast Iron Skillet 12"', 'Home & Kitchen', 34.99],
  ['Bamboo Cutting Board Set', 'Home & Kitchen', 22.99],
  // Apparel
  ['Classic Cotton T-Shirt', 'Apparel', 18.99],
  ['Slim-Fit Denim Jeans', 'Apparel', 49.99],
  ['Waterproof Rain Jacket', 'Apparel', 79.99],
  ['Merino Wool Sweater', 'Apparel', 89.99],
  ['Athletic Running Shorts', 'Apparel', 24.99],
  ['Leather Belt', 'Apparel', 32.99],
  ['Wool Blend Beanie', 'Apparel', 16.99],
  ['Canvas Sneakers', 'Apparel', 54.99],
  // Books
  ['The Pragmatic Programmer', 'Books', 39.99],
  ['Clean Code', 'Books', 34.99],
  ['Designing Data-Intensive Applications', 'Books', 44.99],
  ['Atomic Habits', 'Books', 19.99],
  ['Sapiens: A Brief History', 'Books', 21.99],
  ['The Midnight Library', 'Books', 14.99],
  // Sports & Outdoors
  ['Yoga Mat Non-Slip', 'Sports & Outdoors', 25.99],
  ['Adjustable Dumbbell Set', 'Sports & Outdoors', 149.99],
  ['Insulated Water Bottle 32oz', 'Sports & Outdoors', 19.99],
  ['Camping Tent 4-Person', 'Sports & Outdoors', 129.99],
  ['Resistance Bands Set', 'Sports & Outdoors', 21.99],
  ['Trail Running Backpack', 'Sports & Outdoors', 64.99],
  ['Foam Roller', 'Sports & Outdoors', 27.99],
  // Beauty & Health
  ['Vitamin C Serum', 'Beauty & Health', 23.99],
  ['Electric Toothbrush', 'Beauty & Health', 49.99],
  ['Hair Dryer Ionic', 'Beauty & Health', 59.99],
  ['Sunscreen SPF 50', 'Beauty & Health', 14.99],
  ['Facial Cleansing Brush', 'Beauty & Health', 34.99],
  // Toys & Games
  ['Wooden Building Blocks (100pc)', 'Toys & Games', 29.99],
  ['Strategy Board Game', 'Toys & Games', 39.99],
  ['1000-Piece Jigsaw Puzzle', 'Toys & Games', 17.99],
  ['Remote Control Car', 'Toys & Games', 44.99],
  ['STEM Robotics Kit', 'Toys & Games', 69.99],
];

function description(name, category) {
  return `${name} — a top-rated ${category.toLowerCase()} pick. Quality materials, backed by a 30-day return policy and fast shipping.`;
}

// Per-category color pair + icon, so each product image is on-brand and its
// category is instantly recognizable.
const CATEGORY_STYLE = {
  'Electronics': ['#4f46e5', '#7c3aed', '🎧'],
  'Home & Kitchen': ['#0ea5e9', '#0e7490', '🍳'],
  'Apparel': ['#ec4899', '#be185d', '👕'],
  'Books': ['#f59e0b', '#b45309', '📚'],
  'Sports & Outdoors': ['#10b981', '#047857', '🏕️'],
  'Beauty & Health': ['#a855f7', '#7c3aed', '🧴'],
  'Toys & Games': ['#f97316', '#c2410c', '🧸'],
};

// A few product-specific icons for extra polish (falls back to category icon).
const PRODUCT_ICON = {
  keyboard: '⌨️', mouse: '🖱️', monitor: '🖥️', webcam: '📷', camera: '📷',
  speaker: '🔊', earbud: '🎧', headphone: '🎧', watch: '⌚', ssd: '💾',
  charger: '🔌', hub: '🏠', kettle: '🫖', press: '☕', vacuum: '🧹',
  cookware: '🍳', skillet: '🍳', pillow: '🛏️', dinnerware: '🍽️', lamp: '💡',
  purifier: '🌬️', 'cutting board': '🔪', 't-shirt': '👕', jeans: '👖',
  jacket: '🧥', sweater: '🧶', shorts: '🩳', belt: '📏', beanie: '🧢',
  sneaker: '👟', yoga: '🧘', dumbbell: '🏋️', bottle: '🥤', tent: '⛺',
  band: '💪', backpack: '🎒', roller: '🧴', serum: '🧪', toothbrush: '🪥',
  dryer: '💨', sunscreen: '🧴', brush: '🧽', blocks: '🧱', 'board game': '🎲',
  puzzle: '🧩', car: '🚗', robot: '🤖', book: '📖',
};

function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function pickIcon(name, fallback) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(PRODUCT_ICON)) {
    if (lower.includes(key)) return PRODUCT_ICON[key];
  }
  return fallback;
}

function wrapName(name, maxChars = 16, maxLines = 3) {
  const words = name.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

/**
 * Build a clean SVG "product tile" as a data URI. The image always shows the
 * product's own name + category icon, so images never look mismatched, load
 * instantly, and need no external image host.
 */
function imageUrl(name, category) {
  const [c1, c2, catIcon] = CATEGORY_STYLE[category] || ['#4f46e5', '#7c3aed', '🛍️'];
  const icon = pickIcon(name, catIcon);
  const lines = wrapName(name);
  const startY = 452 - (lines.length - 1) * 21;
  const nameSvg = lines
    .map((ln, i) => `<tspan x="300" dy="${i === 0 ? 0 : 42}">${xmlEscape(ln)}</tspan>`)
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="600" height="600" fill="url(#g)"/>` +
    `<circle cx="300" cy="225" r="130" fill="#ffffff" opacity="0.14"/>` +
    `<text x="300" y="258" font-size="140" text-anchor="middle">${icon}</text>` +
    `<text x="300" y="${startY}" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${nameSvg}</text>` +
    `<text x="300" y="556" font-size="20" font-family="Arial, Helvetica, sans-serif" fill="#ffffff" opacity="0.8" text-anchor="middle" letter-spacing="2">${xmlEscape(category.toUpperCase())}</text>` +
    `</svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

module.exports = { catalog, description, imageUrl };
