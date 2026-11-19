# Shuka — Armenia Local Marketplace

Full-stack Amazon-style local marketplace for Armenia (prices in **AMD**, **Cash on Delivery**, Yerevan & all 10 Marzer), built as a single Node.js + Express + React/Vite + SQLite (`better-sqlite3`) application.

## One-Command Local Start

```bash
npm install && npm run build && npm start
```

Open **http://localhost:3000** — on first start, SQLite migrations (`server/migrations/001_init.sql`) and seed data (8 categories, 3 sellers, 44 products with WebP thumbnails/large images, 2 demo buyers) run automatically.

### Seeded Demo Accounts (password: `shuka123`)
- **Sellers:** `seller1@shuka.am` (Yerevan Tech Hub), `seller2@shuka.am` (Ararat Home Studio), `seller3@shuka.am` (Vernissage Craft House)
- **Buyers:** `buyer1@shuka.am`, `buyer2@shuka.am`

## Verification & Maintenance Commands

```bash
# Run all 9 Break-It tests + full Teacher Demo E2E test
npm run test:break-it

# Run numbered SQL migrations manually
npm run migrate

# Create a consistent SQLite backup via VACUUM INTO
npm run backup
```

## Deploying to Render.com

1. Push this repo to GitHub.
2. On Render, create a **Blueprint** (auto-reads `render.yaml`) or a **Web Service**:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
   - **Persistent Disk:** Mount at `/var/data` (or omit for free-tier demo where `DATA_DIR=./data` initializes cleanly on boot)
   - **Env Vars:** `NODE_ENV=production`, `DATA_DIR=/var/data` (or `./data` on Free plan), `COOKIE_SECURE=true`, `SESSION_SECRET=<random-32-char-secret>`
