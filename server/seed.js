import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { getDb, runMigrations, closeDb, LARGE_DIR, THUMB_DIR, ensureDataDirs } from './db.js';

const __seedDir = path.dirname(fileURLToPath(import.meta.url));
const SEED_ASSETS_DIR = path.join(__seedDir, 'seed-assets');

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', bg: '#0f172a', accent: '#38bdf8', icon: 'circuit' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', bg: '#1e293b', accent: '#f59e0b', icon: 'home' },
  { name: 'Fashion', slug: 'fashion', bg: '#312e81', accent: '#f472b6', icon: 'shirt' },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors', bg: '#064e3b', accent: '#34d399', icon: 'sport' },
  { name: 'Books & Media', slug: 'books-media', bg: '#451a03', accent: '#fb923c', icon: 'book' },
  { name: 'Beauty & Care', slug: 'beauty-care', bg: '#4c0519', accent: '#fb7185', icon: 'spark' },
  { name: 'Toys & Hobbies', slug: 'toys-hobbies', bg: '#172554', accent: '#a78bfa', icon: 'cube' },
  { name: 'Armenian Crafts', slug: 'armenian-crafts', bg: '#431407', accent: '#f97316', icon: 'craft' },
];

const SELLERS = [
  { email: 'seller1@shuka.am', name: 'Davit Grigoryan', phone: '+374 91 223344', store_name: 'Yerevan Tech Hub' },
  { email: 'seller2@shuka.am', name: 'Narine Hakobyan', phone: '+374 93 445566', store_name: 'Ararat Home Studio' },
  { email: 'seller3@shuka.am', name: 'Armen Hovhannisyan', phone: '+374 77 667788', store_name: 'Vernissage Craft House' },
];

const BUYERS = [
  { email: 'buyer1@shuka.am', name: 'Ani Sargsyan', phone: '+374 94 112233' },
  { email: 'buyer2@shuka.am', name: 'Tigran Petrosyan', phone: '+374 98 556677' },
];

// 44 realistic local marketplace products in AMD across 3 sellers and 8 categories
const PRODUCTS = [
  // Seller 0: Yerevan Tech Hub (Electronics, Books & Media, Toys & Hobbies)
  { seller: 0, cat: 'electronics', title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', price: 145000, stock: 7, desc: 'Industry-leading active noise cancellation, 30-hour battery life, multipoint Bluetooth connection, and crystal-clear call microphones. Includes travel case and USB-C charging cable.' },
  { seller: 0, cat: 'electronics', title: 'Logitech MX Master 3S Ergonomic Wireless Mouse', price: 42000, stock: 12, desc: 'Quiet tactile clicks, 8000 DPI sensor that tracks even on glass, MagSpeed electromagnetic scroll wheel, and multi-device Flow support across Windows, macOS, and Linux.' },
  { seller: 0, cat: 'electronics', title: 'Keychron K2 Pro QMK/VIA Mechanical Keyboard', price: 54000, stock: 5, desc: 'Compact 75% wireless mechanical keyboard with hot-swappable tactile brown switches, aluminum frame, PBT keycaps, and Mac/Windows layout switches.' },
  { seller: 0, cat: 'electronics', title: 'Anker 737 Power Bank 24,000mAh 140W USB-C', price: 58000, stock: 9, desc: 'High-capacity laptop and phone power bank with smart digital wattage display and bi-directional 140W fast charging. Airline safe.' },
  { seller: 0, cat: 'electronics', title: 'Samsung T7 Shield 2TB Rugged Portable SSD', price: 79000, stock: 6, desc: 'IP65 dust and water resistant portable solid state drive with read speeds up to 1,050 MB/s. Ideal for video editing, photo backups, and developers.' },
  { seller: 0, cat: 'electronics', title: 'Apple AirTag 4-Pack Bluetooth Item Tracker', price: 46000, stock: 14, desc: 'Keep track of keys, backpacks, and luggage with Precision Finding and the Find My network. Replaceable CR2032 battery lasts over a year.' },
  { seller: 0, cat: 'electronics', title: 'TP-Link Deco XE75 Wi-Fi 6E Mesh System (2-Pack)', price: 112000, stock: 3, desc: 'Tri-band Wi-Fi 6E mesh router covering up to 500 sq meters with seamless roaming and gigabit ethernet ports for fast Yerevan fiber connections.' },
  { seller: 0, cat: 'electronics', title: 'JBL Charge 5 Waterproof Portable Bluetooth Speaker', price: 69000, stock: 8, desc: 'Bold JBL Original Pro Sound with dedicated tweeter and dual bass radiators, IP67 waterproof rating, and 20 hours of playtime with built-in powerbank.' },
  { seller: 0, cat: 'electronics', title: 'UGREEN Revodok Pro 9-in-1 USB-C Docking Hub', price: 24500, stock: 19, desc: '4K 60Hz HDMI, 100W Power Delivery pass-through, Gigabit Ethernet, SD/TF card readers, and 10Gbps USB ports in a brushed aluminum chassis.' },
  { seller: 0, cat: 'electronics', title: 'Xiaomi Smart Monitor Light Bar with Wireless Dial', price: 19500, stock: 15, desc: 'Asymmetric optical design illuminates your desk without screen glare. Includes magnetic rotary controller to adjust brightness and color temperature.' },
  { seller: 0, cat: 'electronics', title: 'Raspberry Pi 5 8GB Starter Developer Kit', price: 59000, stock: 2, desc: 'Quad-core Cortex-A76 2.4GHz board with active cooler, official 27W USB-C power supply, micro-HDMI cable, and protective case.' },
  { seller: 0, cat: 'electronics', title: 'Kindle Paperwhite 16GB E-Reader (Glare-Free 6.8")', price: 74000, stock: 4, desc: 'Waterproof e-reader with adjustable warm front light, 300 ppi crisp text display, USB-C charging, and up to 10 weeks of battery life.' },
  { seller: 0, cat: 'books-media', title: 'Designing Data-Intensive Applications — Martin Kleppmann', price: 21000, stock: 8, desc: 'Essential engineering guide to reliable, scalable, and maintainable distributed systems, databases, replication, partitioning, and stream processing. Paperback edition.' },
  { seller: 0, cat: 'books-media', title: 'Clean Architecture — Robert C. Martin (Paperback)', price: 16500, stock: 11, desc: 'A practical craftsman guide to software structure, modular boundaries, SOLID design principles, and building systems that last.' },
  { seller: 0, cat: 'toys-hobbies', title: 'DJI Mini 4K Camera Drone Fly More Bundle', price: 189000, stock: 2, desc: 'Under-249g foldable drone shooting stabilized 4K video with 3-axis gimbal, Level-5 wind resistance, and 31-minute flight time.' },

  // Seller 1: Ararat Home Studio (Home & Kitchen, Beauty & Care, Sports & Outdoors)
  { seller: 1, cat: 'home-kitchen', title: 'DeLonghi Dedica Arte Espresso Coffee Machine', price: 138000, stock: 4, desc: 'Slim 15cm stainless steel pump espresso maker with 15-bar pressure, My LatteArt steam wand for silky microfoam, and metal tamper included.' },
  { seller: 1, cat: 'home-kitchen', title: 'Ninja Air Fryer MAX PRO 6.2L Digital Crisp', price: 68000, stock: 10, desc: 'Six cooking functions including Max Crisp, Air Fry, Roast, Bake, Reheat, and Dehydrate. Non-stick dishwasher-safe crisper plate.' },
  { seller: 1, cat: 'home-kitchen', title: 'Traditional Hammered Copper Armenian Jazve (450ml)', price: 14500, stock: 22, desc: 'Thick solid copper coffee pot lined with food-safe tin and fitted with a heat-resistant walnut handle for rich traditional Armenian coffee.' },
  { seller: 1, cat: 'home-kitchen', title: 'Bialetti Moka Express 6-Cup Stovetop Espresso Maker', price: 18000, stock: 16, desc: 'Classic Italian octagonal aluminum coffee maker delivering rich aromatic espresso on gas or electric stoves in minutes.' },
  { seller: 1, cat: 'home-kitchen', title: 'Philips Hue White & Color Ambiance Smart Bulb Kit', price: 49000, stock: 6, desc: 'Two E27 smart LED bulbs with Hue Bridge supporting 16 million colors, warm sunrise routines, and voice control.' },
  { seller: 1, cat: 'home-kitchen', title: 'Cast Iron Dutch Oven Pot 5.2L — Matte Terracotta', price: 44000, stock: 5, desc: 'Heavy-duty enameled cast iron casserole for slow-braised khashlama, sourdough bread baking, and stews. Oven safe up to 260°C.' },
  { seller: 1, cat: 'home-kitchen', title: 'Xiaomi Smart Air Purifier 4 Compact (HEPA H13)', price: 47000, stock: 9, desc: 'Whisper-quiet 20dB sleep mode air purifier removing 99.97% of dust, pollen, and PM2.5 particles in bedrooms and studios.' },
  { seller: 1, cat: 'home-kitchen', title: 'Minimalist Ceramic Pour-Over Coffee Dripper Set', price: 12500, stock: 18, desc: 'Hand-glazed matte white V60 dripper with 600ml borosilicate glass carafe and 100 unbleached paper filters.' },
  { seller: 1, cat: 'beauty-care', title: 'Nairian Wild Rosehip Revitalizing Facial Serum (30ml)', price: 24000, stock: 13, desc: 'Locally crafted in Armenia using highland botanical oils and cold-pressed rosehip extract to deeply hydrate and brighten skin.' },
  { seller: 1, cat: 'beauty-care', title: 'Philips Sonicare ProtectiveClean Electric Toothbrush', price: 36000, stock: 11, desc: 'Built-in pressure sensor protects gums while sonic technology delivers 62,000 gentle brush movements per minute. Includes travel case.' },
  { seller: 1, cat: 'beauty-care', title: 'La Roche-Posay Anthelios UVMune 400 SPF50+ Fluid', price: 13500, stock: 25, desc: 'Ultra-lightweight invisible sun protection fluid for sensitive skin, non-greasy and sweat resistant for sunny Yerevan summers.' },
  { seller: 1, cat: 'beauty-care', title: 'Armenian Apricot Kernel Cold-Pressed Body Oil (200ml)', price: 8900, stock: 20, desc: '100% pure cold-pressed Ararat Valley apricot kernel oil rich in vitamins A and E for fast-absorbing daily skin nourishment.' },
  { seller: 1, cat: 'sports-outdoors', title: 'Manduka PROlite Non-Slip Yoga Mat (4.7mm, Deep Sea)', price: 39000, stock: 7, desc: 'High-density closed-cell cushioning prevents moisture absorption and provides steady grip on wood or tile floors.' },
  { seller: 1, cat: 'sports-outdoors', title: 'Osprey Talon 22L Daypack Hiking Backpack', price: 62000, stock: 4, desc: 'Lightweight ventilated AirScape backpanel pack designed for Dilijan trails and Mount Aragats day hikes, with hydration sleeve and pole attachments.' },
  { seller: 1, cat: 'sports-outdoors', title: 'Hydro Flask 946ml Wide Mouth Insulated Steel Bottle', price: 21500, stock: 16, desc: 'TempShield double-wall vacuum insulation keeps drinks ice-cold for 24 hours or piping hot for 12 hours. Powder-coated grip finish.' },

  // Seller 2: Vernissage Craft House (Armenian Crafts, Fashion, Books, Toys, Sports)
  { seller: 2, cat: 'armenian-crafts', title: 'Hand-Carved Apricot Wood Duduk with 2 Reeds (Key of A)', price: 48000, stock: 5, desc: 'Concert-grade Armenian duduk crafted from aged 8-year Ararat apricot wood by master luthiers. Includes two tuned reeds and velvet carrying pouch.' },
  { seller: 2, cat: 'armenian-crafts', title: 'Handcrafted Walnut Wood Armenian Backgammon (Nardi)', price: 56000, stock: 3, desc: 'Full-size 50cm carved walnut wood nardi board featuring traditional geometric eternity symbols, weighted wooden checkers, and brass latches.' },
  { seller: 2, cat: 'armenian-crafts', title: 'Hand-Painted Pomegranate Ceramic Serving Platter (32cm)', price: 19000, stock: 11, desc: 'Lead-free glazed stoneware platter hand-painted in Dilijan with deep ruby pomegranate motifs. Microwave and dishwasher safe.' },
  { seller: 2, cat: 'armenian-crafts', title: 'Handwoven Wool Armenian Rug Runner (80x150 cm)', price: 95000, stock: 2, desc: 'Natural vegetable-dyed highland wool kilim rug woven on a traditional wooden loom with classic Lori geometric diamond patterns.' },
  { seller: 2, cat: 'armenian-crafts', title: 'Sterling Silver 925 Armenian Eternity Ring (Arevakhach)', price: 17500, stock: 14, desc: 'Oxidized 925 sterling silver band engraved with the traditional Armenian eternity wheel motif. Adjustable sizing.' },
  { seller: 2, cat: 'armenian-crafts', title: 'Gyumri Black Clay Wine Pitcher (Karas) with 4 Cups', price: 27000, stock: 6, desc: 'Traditional smoked black terracotta wine carafe and four matching goblets handcrafted in Gyumri, naturally keeping Areni wine cool.' },
  { seller: 2, cat: 'fashion', title: 'Full-Grain Leather Everyday Tote Bag — Cognac Brown', price: 49000, stock: 5, desc: 'Handmade in Yerevan from vegetable-tanned Italian leather with padded 15-inch laptop sleeve, YKK brass zipper, and reinforced straps.' },
  { seller: 2, cat: 'fashion', title: 'Merino Wool Oversized Knit Scarf — Warm Oatmeal', price: 18500, stock: 12, desc: 'Soft 100% breathable merino wool winter scarf with clean ribbed edges. Warm without bulk for crisp mountain evenings.' },
  { seller: 2, cat: 'fashion', title: 'Minimalist Linen Button-Down Shirt — Sand Beige', price: 23000, stock: 9, desc: 'Pre-washed 100% European flax linen shirt tailored for relaxed breathable comfort in warm weather.' },
  { seller: 2, cat: 'fashion', title: 'Polarized Classic Tortoise Sunglasses (UV400)', price: 15500, stock: 0, desc: 'Lightweight acetate frame with scratch-resistant polarized lenses blocking 100% of UVA/UVB glare. Currently sold out — restocking soon.' },
  { seller: 2, cat: 'books-media', title: 'Armenian Architecture: A Visual Heritage Hardcover', price: 29000, stock: 7, desc: 'Large-format photography book documenting monasteries, tuff stonework, and modernist landmarks across Yerevan and the regions.' },
  { seller: 2, cat: 'books-media', title: 'Lavash: The Bread That Launched 1,000 Meals (Cookbook)', price: 17000, stock: 10, desc: 'Richly illustrated cookbook celebrating Armenian culinary traditions, regional recipes, stories, and village bread-making craft.' },
  { seller: 2, cat: 'toys-hobbies', title: 'Magnetic Travel Wooden Chess Set (28x28 cm)', price: 16000, stock: 15, desc: 'Foldable handcrafted beechwood chess board with felted magnetic Staunton pieces and individual storage compartments.' },
  { seller: 2, cat: 'toys-hobbies', title: '1000-Piece Mount Ararat & Khor Virap Art Jigsaw Puzzle', price: 9500, stock: 18, desc: 'Thick linen-finish glare-free puzzle pieces printed with vibrant sunset artwork of Mount Ararat. Includes reference poster.' },
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapTitle(title, maxChars = 22) {
  const words = title.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === 2) break;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur && lines.length < 3) lines.push(cur);
  return lines;
}

function renderArtworkSvg(product, catMeta, variantIdx) {
  const palettes = [
    { bg1: catMeta.bg, bg2: '#0f172a', accent: catMeta.accent },
    { bg1: '#1e293b', bg2: catMeta.bg, accent: '#f59e0b' },
  ];
  const pal = palettes[variantIdx % palettes.length];
  const lines = wrapTitle(product.title, 24);
  const priceLabel = `${product.price.toLocaleString('en-US')} AMD`;

  // Clean geometric centerpiece shape per category
  const shapes = {
    circuit: `<rect x="285" y="135" width="230" height="160" rx="22" fill="none" stroke="${pal.accent}" stroke-width="6"/>
              <circle cx="400" cy="215" r="46" fill="${pal.accent}" opacity="0.22"/>
              <circle cx="400" cy="215" r="22" fill="${pal.accent}"/>
              <line x1="250" y1="185" x2="285" y2="185" stroke="${pal.accent}" stroke-width="5"/>
              <line x1="250" y1="245" x2="285" y2="245" stroke="${pal.accent}" stroke-width="5"/>
              <line x1="515" y1="185" x2="550" y2="185" stroke="${pal.accent}" stroke-width="5"/>
              <line x1="515" y1="245" x2="550" y2="245" stroke="${pal.accent}" stroke-width="5"/>`,
    home: `<path d="M295 225 L400 135 L505 225 L505 310 L295 310 Z" fill="${pal.accent}" opacity="0.18" stroke="${pal.accent}" stroke-width="6"/>
           <rect x="372" y="235" width="56" height="75" rx="6" fill="${pal.accent}"/>`,
    shirt: `<path d="M320 145 L365 130 Q400 160 435 130 L480 145 L515 200 L470 220 L460 190 L460 315 L340 315 L340 190 L330 220 L285 200 Z" fill="${pal.accent}" opacity="0.24" stroke="${pal.accent}" stroke-width="6"/>`,
    sport: `<circle cx="400" cy="220" r="82" fill="${pal.accent}" opacity="0.2" stroke="${pal.accent}" stroke-width="6"/>
            <path d="M335 245 L385 180 L425 225 L465 165" fill="none" stroke="${pal.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
    book: `<rect x="310" y="135" width="180" height="175" rx="14" fill="${pal.accent}" opacity="0.2" stroke="${pal.accent}" stroke-width="6"/>
           <line x1="350" y1="135" x2="350" y2="310" stroke="${pal.accent}" stroke-width="6"/>
           <line x1="375" y1="185" x2="462" y2="185" stroke="${pal.accent}" stroke-width="5" stroke-linecap="round"/>
           <line x1="375" y1="215" x2="445" y2="215" stroke="${pal.accent}" stroke-width="5" stroke-linecap="round"/>`,
    spark: `<polygon points="400,125 426,194 495,220 426,246 400,315 374,246 305,220 374,194" fill="${pal.accent}" opacity="0.25" stroke="${pal.accent}" stroke-width="6"/>`,
    cube: `<polygon points="400,130 490,178 490,270 400,318 310,270 310,178" fill="${pal.accent}" opacity="0.2" stroke="${pal.accent}" stroke-width="6"/>
           <polyline points="310,178 400,224 490,178" fill="none" stroke="${pal.accent}" stroke-width="5"/>
           <line x1="400" y1="224" x2="400" y2="318" stroke="${pal.accent}" stroke-width="5"/>`,
    craft: `<circle cx="400" cy="222" r="82" fill="${pal.accent}" opacity="0.18" stroke="${pal.accent}" stroke-width="6"/>
            <polygon points="400,152 460,222 400,292 340,222" fill="${pal.accent}" opacity="0.45" stroke="${pal.accent}" stroke-width="4"/>
            <circle cx="400" cy="222" r="22" fill="#ffffff" opacity="0.9"/>`,
  };

  const titleSvg = lines
    .map(
      (ln, idx) =>
        `<text x="400" y="${418 + idx * 36}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="700" fill="#f8fafc">${escapeXml(ln)}</text>`
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${pal.bg1}"/>
        <stop offset="100%" stop-color="${pal.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#g)"/>
    <circle cx="110" cy="95" r="140" fill="${pal.accent}" opacity="0.08"/>
    <circle cx="710" cy="520" r="170" fill="${pal.accent}" opacity="0.09"/>
    <rect x="44" y="38" width="220" height="36" rx="18" fill="${pal.accent}" opacity="0.22"/>
    <text x="154" y="62" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" fill="${pal.accent}">${escapeXml(catMeta.name.toUpperCase())}</text>
    ${shapes[catMeta.icon] || shapes.cube}
    ${titleSvg}
    <rect x="295" y="520" width="210" height="42" rx="21" fill="${pal.accent}"/>
    <text x="400" y="547" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(priceLabel)}</text>
  </svg>`;
}

async function generateSeedImage(product, catMeta, fileStem, variantIdx = 0, productNumber = 1) {
  ensureDataDirs();
  const filename = `${fileStem}.webp`;
  const largeAbs = path.join(LARGE_DIR, filename);
  const thumbAbs = path.join(THUMB_DIR, filename);

  const realAsset = path.join(SEED_ASSETS_DIR, `prod-${String(productNumber).padStart(2, '0')}.webp`);
  if (fs.existsSync(realAsset)) {
    if (variantIdx === 0) {
      await sharp(realAsset).resize(800, 600, { fit: 'cover' }).webp({ quality: 84 }).toFile(largeAbs);
      await sharp(realAsset).resize(400, 400, { fit: 'cover' }).webp({ quality: 80 }).toFile(thumbAbs);
    } else {
      // Secondary detail close-up crop for multi-image product gallery
      await sharp(realAsset)
        .extract({ left: 100, top: 75, width: 600, height: 450 })
        .resize(800, 600, { fit: 'cover' })
        .webp({ quality: 84 })
        .toFile(largeAbs);
      await sharp(largeAbs).resize(400, 400, { fit: 'cover' }).webp({ quality: 80 }).toFile(thumbAbs);
    }
    return `/uploads/large/${filename}`;
  }

  const svgBuf = Buffer.from(renderArtworkSvg(product, catMeta, variantIdx));
  await sharp(svgBuf).resize(800, 600).webp({ quality: 84 }).toFile(largeAbs);
  await sharp(svgBuf).resize(400, 400, { fit: 'cover' }).webp({ quality: 80 }).toFile(thumbAbs);
  return `/uploads/large/${filename}`;
}

export async function seedDatabase(db) {
  runMigrations(db);
  const existingCats = db.prepare('SELECT COUNT(*) AS cnt FROM categories').get().cnt;
  if (existingCats > 0) {
    return { skipped: true };
  }

  const passwordHash = await bcrypt.hash('shuka123', 10);
  const baseTime = Date.now() - 1000 * 60 * 60 * 24 * 12;

  // Insert categories, sellers, buyers first
  const catIds = new Map();
  const sellerIds = [];
  const buyerIds = [];

  const insertCat = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  const insertUser = db.prepare(
    `INSERT INTO users (email, password_hash, name, phone, store_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const c of CATEGORIES) {
      const info = insertCat.run(c.name, c.slug);
      catIds.set(c.slug, Number(info.lastInsertRowid));
    }
    for (let i = 0; i < SELLERS.length; i++) {
      const s = SELLERS[i];
      const info = insertUser.run(
        s.email,
        passwordHash,
        s.name,
        s.phone,
        s.store_name,
        new Date(baseTime - (10 - i) * 86400000).toISOString()
      );
      sellerIds.push(Number(info.lastInsertRowid));
    }
    for (let i = 0; i < BUYERS.length; i++) {
      const b = BUYERS[i];
      const info = insertUser.run(
        b.email,
        passwordHash,
        b.name,
        b.phone,
        null,
        new Date(baseTime - (5 - i) * 86400000).toISOString()
      );
      buyerIds.push(Number(info.lastInsertRowid));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // Generate crisp local WebP images outside SQLite transaction
  const catMetaBySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
  const imagePathsPerProduct = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const meta = catMetaBySlug.get(p.cat);
    const paths = [];
    const p1 = await generateSeedImage(p, meta, `shuka-v2-prod-${i + 1}-a`, 0, i + 1);
    paths.push(p1);
    if (i % 3 === 0) {
      const p2 = await generateSeedImage(p, meta, `shuka-v2-prod-${i + 1}-b`, 1, i + 1);
      paths.push(p2);
    }
    imagePathsPerProduct.push(paths);
  }

  // Insert products, images, sample delivered orders & reviews
  const insertProduct = db.prepare(
    `INSERT INTO products (seller_id, category_id, title, description, price_amd, stock, is_published, rating_avg, rating_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)`
  );
  const insertImage = db.prepare(
    'INSERT INTO product_images (product_id, file_path, position) VALUES (?, ?, ?)'
  );

  const productIds = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let i = 0; i < PRODUCTS.length; i++) {
      const p = PRODUCTS[i];
      const ts = new Date(baseTime + i * 3600000 * 5).toISOString();
      const info = insertProduct.run(
        sellerIds[p.seller],
        catIds.get(p.cat),
        p.title,
        p.desc,
        p.price,
        p.stock,
        ts,
        ts
      );
      const pid = Number(info.lastInsertRowid);
      productIds.push(pid);
      imagePathsPerProduct[i].forEach((imgPath, pos) => {
        insertImage.run(pid, imgPath, pos);
      });
    }

    // Seed 2 realistic delivered multi-seller orders + reviews so ratings and seller overview are alive
    const sampleDeliveries = [
      {
        buyerIdx: 0,
        recipient: 'Ani Sargsyan',
        phone: '+374 94 112233',
        region: 'Yerevan',
        city: 'Yerevan',
        street: '14 Abovyan St',
        apartment: 'Apt 12',
        note: 'Call 15 minutes before arrival',
        key: 'seed-order-1',
        daysAgo: 5,
        items: [
          { prodIdx: 0, qty: 1, rating: 5, review: 'Amazing sound quality and very comfortable for long workdays.' },
          { prodIdx: 17, qty: 1, rating: 5, review: 'Authentic hammered copper jazve — brews rich Armenian coffee.' },
          { prodIdx: 30, qty: 1, rating: 4, review: 'Warm tone and great craftsmanship, delivered carefully packed.' },
        ],
      },
      {
        buyerIdx: 1,
        recipient: 'Tigran Petrosyan',
        phone: '+374 98 556677',
        region: 'Kotayk',
        city: 'Abovyan',
        street: '8 Hanrapetutyan St',
        apartment: 'Apt 4',
        note: 'Leave at building entrance reception',
        key: 'seed-order-2',
        daysAgo: 3,
        items: [
          { prodIdx: 1, qty: 1, rating: 5, review: 'Super quiet clicks and effortless scrolling across two laptops.' },
          { prodIdx: 2, qty: 1, rating: 4, review: 'Solid aluminum keyboard, tactile switches feel crisp.' },
          { prodIdx: 15, qty: 1, rating: 5, review: 'Compact espresso machine that heats up fast every morning.' },
          { prodIdx: 31, qty: 1, rating: 5, review: 'Gorgeous carved walnut backgammon board, everyone loved it.' },
        ],
      },
    ];

    const insertOrder = db.prepare(
      `INSERT INTO orders (buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertSellerOrder = db.prepare(
      `INSERT INTO seller_orders (order_id, seller_id, status, subtotal_amd, updated_at)
       VALUES (?, ?, 'delivered', ?, ?)`
    );
    const insertOrderItem = db.prepare(
      `INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity)
       VALUES (?, ?, ?, ?, ?)`
    );
    const insertHistory = db.prepare(
      `INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    const insertReview = db.prepare(
      `INSERT INTO reviews (product_id, buyer_id, rating, body, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const d of sampleDeliveries) {
      const createdTs = new Date(Date.now() - d.daysAgo * 86400000).toISOString();
      const confirmedTs = new Date(Date.now() - (d.daysAgo - 0.5) * 86400000).toISOString();
      const shippedTs = new Date(Date.now() - (d.daysAgo - 1) * 86400000).toISOString();
      const deliveredTs = new Date(Date.now() - (d.daysAgo - 1.5) * 86400000).toISOString();

      let total = 0;
      const bySeller = new Map();
      for (const it of d.items) {
        const prod = PRODUCTS[it.prodIdx];
        const sid = sellerIds[prod.seller];
        const lineTotal = prod.price * it.qty;
        total += lineTotal;
        if (!bySeller.has(sid)) bySeller.set(sid, { subtotal: 0, items: [] });
        bySeller.get(sid).subtotal += lineTotal;
        bySeller.get(sid).items.push(it);
      }

      const oInfo = insertOrder.run(
        buyerIds[d.buyerIdx],
        d.recipient,
        d.phone,
        d.region,
        d.city,
        d.street,
        d.apartment,
        d.note,
        total,
        d.key,
        createdTs
      );
      const oid = Number(oInfo.lastInsertRowid);

      for (const [sid, grp] of bySeller.entries()) {
        const soInfo = insertSellerOrder.run(oid, sid, grp.subtotal, deliveredTs);
        const soid = Number(soInfo.lastInsertRowid);
        insertHistory.run(soid, null, 'placed', buyerIds[d.buyerIdx], createdTs);
        insertHistory.run(soid, 'placed', 'confirmed', sid, confirmedTs);
        insertHistory.run(soid, 'confirmed', 'shipped', sid, shippedTs);
        insertHistory.run(soid, 'shipped', 'delivered', sid, deliveredTs);

        for (const it of grp.items) {
          const prod = PRODUCTS[it.prodIdx];
          const pid = productIds[it.prodIdx];
          insertOrderItem.run(soid, pid, prod.title, prod.price, it.qty);
          insertReview.run(pid, buyerIds[d.buyerIdx], it.rating, it.review, deliveredTs);
        }
      }
    }

    // Recompute product ratings
    db.exec(`
      UPDATE products
      SET rating_avg = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.product_id = products.id), 0),
          rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id)
    `);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    skipped: false,
    categories: CATEGORIES.length,
    sellers: SELLERS.length,
    buyers: BUYERS.length,
    products: PRODUCTS.length,
  };
}

export async function seedIfEmpty(db) {
  return seedDatabase(db);
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const db = getDb();
  const res = await seedDatabase(db);
  console.log('Seed result:', res);
  closeDb();
}
