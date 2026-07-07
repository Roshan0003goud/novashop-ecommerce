# NovaShop — E-Commerce Web Platform with Real-time Features

A full-stack e-commerce platform built with **Node.js, Express, MySQL, and Socket.IO**. It features JWT authentication, a 50+ item product catalog, cart management, a transactional checkout, and a real-time customer↔admin support chat (JavaScript + jQuery on the client).

> Independent Project · Arlington, Texas

**🔗 Live demo:** https://ecommerce-platform-production-8f71.up.railway.app
**💻 Source:** https://github.com/Roshan0003goud/novashop-ecommerce

Try it with the demo customer account **`customer@shop.dev` / `Password123!`** (or the admin **`admin@shop.dev` / `Admin123!`** to see the live support inbox). The app **auto-creates and seeds its database on first boot**, so it runs with zero manual setup in the cloud.

---

## Features

- **Authentication** — register/login with **JWT** (httpOnly cookie + Bearer header) and **bcrypt** password hashing. Role-based access (`customer` / `admin`).
- **Product catalog** — 50+ seeded products with search, category filter, sorting, and pagination via optimized SQL.
- **Cart management** — add / update quantity / remove, with stock checks and live totals.
- **Secure checkout** — transactional order placement (row locking, stock decrement, cart clear) so concurrent checkouts stay consistent.
- **Real-time chat** — **Socket.IO** support inbox. Customers get a chat widget; admins see a live inbox with presence, typing indicators, and persisted history.
- **REST API** — clean JSON endpoints backed by a pooled MySQL connection (handles 100+ concurrent simulated requests).

## Tech stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | HTML, CSS, JavaScript, jQuery, Socket.IO client |
| Backend    | Node.js, Express, Socket.IO                  |
| Database   | MySQL (mysql2, connection pooling)           |
| Security   | JWT (jsonwebtoken), bcryptjs                  |

## Project structure

```
ecommerce-platform/
├── server.js              # Express + Socket.IO entrypoint
├── config/db.js           # MySQL pool
├── middleware/auth.js     # JWT sign/verify + guards
├── routes/                # auth, products, cart, orders REST APIs
├── socket/chat.js         # real-time chat handlers
├── database/
│   ├── schema.sql         # tables
│   ├── setup.js           # apply schema
│   └── seed.js            # 50+ products + demo users
└── public/                # HTML/CSS/JS + jQuery frontend
```

## Getting started

### 1. Prerequisites
- Node.js 18+
- A running MySQL 8 server

### 2. Install
```bash
cd ecommerce-platform
npm install
cp .env.example .env      # then edit DB credentials + JWT_SECRET
```

### 3. Create schema & seed data
```bash
npm run db:setup    # creates the database and tables
npm run db:seed     # inserts 50+ products + demo users
```

### 4. Run
```bash
npm start           # or: npm run dev  (nodemon)
```
Open **http://localhost:3000**.

## Demo accounts (created by the seed script)

| Role     | Email               | Password       |
|----------|---------------------|----------------|
| Admin    | `admin@shop.dev`    | `Admin123!`    |
| Customer | `customer@shop.dev` | `Password123!` |

To see the real-time chat: log in as the **customer** in one browser and click the 💬 bubble; log in as the **admin** in another browser (or incognito) and reply from the support inbox.

## REST API reference

| Method | Endpoint                    | Auth      | Description                     |
|--------|-----------------------------|-----------|---------------------------------|
| POST   | `/api/auth/register`        | –         | Create account                  |
| POST   | `/api/auth/login`           | –         | Log in, returns JWT             |
| POST   | `/api/auth/logout`          | –         | Clear auth cookie               |
| GET    | `/api/auth/me`              | user      | Current user                    |
| GET    | `/api/products`             | –         | List (search/filter/sort/page)  |
| GET    | `/api/products/categories`  | –         | Category counts                 |
| GET    | `/api/products/:id`         | –         | Product detail                  |
| POST   | `/api/products`             | admin     | Create product                  |
| GET    | `/api/cart`                 | user      | Get cart + totals               |
| POST   | `/api/cart`                 | user      | Add item                        |
| PUT    | `/api/cart/:productId`      | user      | Set quantity (0 removes)        |
| DELETE | `/api/cart/:productId`      | user      | Remove item                     |
| POST   | `/api/orders/checkout`      | user      | Place order (transactional)     |
| GET    | `/api/orders`               | user      | Order history                   |
| GET    | `/api/orders/:id`           | user      | Order detail                    |

### Socket.IO events
`chat_message`, `typing`, `presence`, `history`, `join_room` (admin), `load_history` (customer). Every socket is authenticated with the JWT passed in the handshake.

## License
MIT
