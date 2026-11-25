import 'dotenv/config';
import express, {NextFunction, Request, Response} from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {WebSocketServer, WebSocket} from 'ws';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {createServer as createViteServer} from 'vite';
import {
  Category,
  DEFAULT_FULL_STORE,
  FullStoreState,
  Order,
  OrderStatus,
  Product,
  PublicStoreState,
  ReviewItem,
  SiteSettings,
} from './src/types/store.ts';

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const STORE_FILE = path.resolve(DATA_DIR, 'store.json');
const AUTH_FILE = path.resolve(DATA_DIR, 'admin-auth.json');
const UPLOADS_DIR = path.resolve(ROOT_DIR, 'public', 'uploads');

fs.mkdirSync(DATA_DIR, {recursive: true});
fs.mkdirSync(UPLOADS_DIR, {recursive: true});

const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

interface AdminAuthRecord {
  salt: string;
  hash: string;
  createdAt: string;
}

// Initialize Supabase Admin Client (Service Role Key stays strictly server-side)
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

let supabaseAdmin: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  try {
    const parsed = new URL(SUPABASE_URL);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {persistSession: false, autoRefreshToken: false},
      });
    }
  } catch {
    supabaseAdmin = null;
  }
}

function loadStoreFromDisk(): FullStoreState {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<FullStoreState>;
      return {
        ...DEFAULT_FULL_STORE,
        ...parsed,
        siteSettings: {
          ...DEFAULT_FULL_STORE.siteSettings,
          ...(parsed.siteSettings || {}),
        },
        salesSeries: {
          ...DEFAULT_FULL_STORE.salesSeries,
          ...(parsed.salesSeries || {}),
        },
        products: Array.isArray(parsed.products) ? parsed.products : DEFAULT_FULL_STORE.products,
        categories: Array.isArray(parsed.categories)
          ? parsed.categories
          : DEFAULT_FULL_STORE.categories,
        orders: Array.isArray(parsed.orders) ? parsed.orders : DEFAULT_FULL_STORE.orders,
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : DEFAULT_FULL_STORE.reviews,
      };
    }
  } catch (err) {
    console.error('Failed to load store from disk, using defaults:', err);
  }
  const seeded = structuredClone(DEFAULT_FULL_STORE);
  fs.writeFileSync(STORE_FILE, JSON.stringify(seeded, null, 2), 'utf8');
  return seeded;
}

let storeState: FullStoreState = loadStoreFromDisk();

function toPublicStore(state: FullStoreState): PublicStoreState {
  return {
    products: state.products,
    categories: state.categories,
    siteSettings: state.siteSettings,
    reviews: state.reviews,
    updatedAt: state.updatedAt,
  };
}

function sanitizeImageUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

function sanitizeImageList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const clean = sanitizeImageUrl(item);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
      if (out.length >= 5) break;
    }
  }
  return out;
}

function sanitizeExternalUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function hashPassword(password: string, saltHex?: string): {salt: string; hash: string} {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return {salt, hash: derived};
}

function verifyPassword(password: string, salt: string, expectedHashHex: string): boolean {
  const {hash} = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHashHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readAdminAuthRecord(): AdminAuthRecord | null {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')) as AdminAuthRecord;
      if (parsed && parsed.salt && parsed.hash) return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'super_admin',
      exp: Date.now() + 24 * 60 * 60 * 1000,
      nonce: crypto.randomBytes(8).toString('hex'),
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'super_admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token || !verifySessionToken(token)) {
    res.status(401).json({error: 'Unauthorized admin session'});
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '4mb'}));

  // Serve uploaded assets securely
  app.use('/uploads', express.static(UPLOADS_DIR));

  const server = http.createServer(app);
  const wss = new WebSocketServer({server, path: '/ws'});

  const broadcastPublicStore = async (state: FullStoreState) => {
    const publicPayload = toPublicStore(state);
    const wsMessage = JSON.stringify({type: 'store:update', payload: publicPayload});

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(wsMessage);
      }
    });

    // Also broadcast admin update to authenticated/admin listeners via WS event tag
    const adminSyncMessage = JSON.stringify({type: 'admin:refresh', updatedAt: state.updatedAt});
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(adminSyncMessage);
      }
    });

    if (supabaseAdmin) {
      try {
        // 1. Broadcast over Supabase Realtime channel (works immediately even before tables are created)
        const channel = supabaseAdmin.channel('persona-realtime');
        await channel.send({
          type: 'broadcast',
          event: 'store_sync',
          payload: publicPayload,
        });
        await supabaseAdmin.removeChannel(channel);
      } catch {
        // Ignore transient broadcast error; WS already synced
      }

      try {
        // 2. Persist to Supabase table if user created `persona_store_state`
        await supabaseAdmin.from('persona_store_state').upsert({
          id: 'main',
          payload: state,
          updated_at: state.updatedAt,
        });
      } catch {
        // Table may not exist yet; disk persistence remains authoritative
      }
    }
  };

  // Attempt initial load from Supabase if table exists
  if (supabaseAdmin) {
    try {
      const {data, error} = await supabaseAdmin
        .from('persona_store_state')
        .select('payload')
        .eq('id', 'main')
        .maybeSingle();
      if (!error && data && data.payload && typeof data.payload === 'object') {
        storeState = {
          ...DEFAULT_FULL_STORE,
          ...(data.payload as FullStoreState),
        };
        fs.writeFileSync(STORE_FILE, JSON.stringify(storeState, null, 2), 'utf8');
      }
    } catch {
      // Table not created yet — silently continue with disk store
    }
  }

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({type: 'store:update', payload: toPublicStore(storeState)}));
  });

  const commitStoreUpdate = async (mutator: (draft: FullStoreState) => void) => {
    const next = structuredClone(storeState);
    mutator(next);
    next.updatedAt = new Date().toISOString();
    storeState = next;
    fs.writeFileSync(STORE_FILE, JSON.stringify(storeState, null, 2), 'utf8');
    await broadcastPublicStore(storeState);
    return storeState;
  };

  // ---------- Public APIs ----------
  app.get('/api/public-config', (_req, res) => {
    res.json({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    });
  });

  app.get('/api/store', (_req, res) => {
    res.json(toPublicStore(storeState));
  });

  app.post('/api/visitors/hit', async (_req, res) => {
    const updated = await commitStoreUpdate((draft) => {
      draft.siteSettings.statsVisitors += 1;
    });
    res.json({visitors: updated.siteSettings.statsVisitors});
  });

  app.post('/api/orders', async (req, res) => {
    const {productId, customerName, customerPhone, quantity} = req.body as {
      productId?: string;
      customerName?: string;
      customerPhone?: string;
      quantity?: number;
    };

    const product = storeState.products.find((p) => p.id === productId);
    if (!product) {
      res.status(400).json({error: 'Invalid product selected'});
      return;
    }

    const cleanName = typeof customerName === 'string' ? customerName.trim().slice(0, 80) : '';
    const cleanPhone = typeof customerPhone === 'string' ? customerPhone.trim().slice(0, 30) : '';
    const qty = Number.isFinite(Number(quantity)) ? Math.max(1, Math.min(20, Math.floor(Number(quantity)))) : 1;

    if (!cleanName || !cleanPhone) {
      res.status(400).json({error: 'Customer name and phone are required'});
      return;
    }

    const unitPrice = Math.max(0, Number(product.newPrice) || 0);
    const totalAmount = unitPrice * qty;

    let createdOrder: Order | null = null;
    await commitStoreUpdate((draft) => {
      const nextNum = 1001 + draft.orders.length;
      createdOrder = {
        id: `ord-${Date.now()}`,
        orderNumber: `#${nextNum}`,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        customerName: cleanName,
        customerPhone: cleanPhone,
        quantity: qty,
        amount: totalAmount,
        dateLabel: 'আজ',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      draft.orders.unshift(createdOrder);
      draft.siteSettings.statsTotalSell += qty;

      const targetProduct = draft.products.find((p) => p.id === product.id);
      if (targetProduct && targetProduct.stock > 0) {
        targetProduct.stock = Math.max(0, targetProduct.stock - qty);
      }

      const lastDaily = draft.salesSeries.daily[draft.salesSeries.daily.length - 1];
      if (lastDaily) {
        lastDaily.sales += qty;
        lastDaily.revenue += totalAmount;
      }
    });

    res.status(201).json({order: createdOrder});
  });

  // ---------- Admin Auth APIs ----------
  app.get('/api/admin/auth-status', (req, res) => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    const record = readAdminAuthRecord();
    const token = extractBearerToken(req);
    res.json({
      needsSetup: !envPasscode && !record,
      usesEnvPasscode: Boolean(envPasscode),
      authenticated: token ? verifySessionToken(token) : false,
      supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_KEY),
      supabaseClientReady: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
      supabaseAdminReady: Boolean(supabaseAdmin),
    });
  });

  app.post('/api/admin/claim', (req, res) => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode || readAdminAuthRecord()) {
      res.status(403).json({error: 'Admin password is already configured'});
      return;
    }
    const {password} = req.body as {password?: string};
    if (typeof password !== 'string' || password.trim().length < 4) {
      res.status(400).json({error: 'Password must be at least 4 characters'});
      return;
    }
    const {salt, hash} = hashPassword(password.trim());
    const record: AdminAuthRecord = {
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(record, null, 2), 'utf8');
    res.status(201).json({token: createSessionToken()});
  });

  app.post('/api/admin/login', (req, res) => {
    const {password} = req.body as {password?: string};
    if (typeof password !== 'string' || !password) {
      res.status(400).json({error: 'Password is required'});
      return;
    }
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      const a = Buffer.from(password);
      const b = Buffer.from(envPasscode);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(401).json({error: 'Invalid admin password'});
        return;
      }
      res.json({token: createSessionToken()});
      return;
    }

    const record = readAdminAuthRecord();
    if (!record || !verifyPassword(password, record.salt, record.hash)) {
      res.status(401).json({error: 'Invalid admin password'});
      return;
    }
    res.json({token: createSessionToken()});
  });

  // ---------- Protected Admin APIs ----------
  app.get('/api/admin/state', requireAdmin, (_req, res) => {
    const totalRevenue = storeState.orders.reduce(
      (sum, ord) => (ord.status !== 'pending' ? sum + ord.amount : sum + ord.amount),
      0,
    );
    res.json({
      ...storeState,
      summary: {
        totalProducts: storeState.products.length,
        totalOrders: storeState.orders.length,
        totalVisitors: storeState.siteSettings.statsVisitors,
        totalSell: storeState.siteSettings.statsTotalSell,
        totalRevenue,
        rating: storeState.siteSettings.statsRating,
      },
      supabaseStatus: {
        urlConfigured: Boolean(SUPABASE_URL),
        anonKeyConfigured: Boolean(SUPABASE_ANON_KEY),
        serviceRoleConfigured: Boolean(SUPABASE_SERVICE_KEY),
        connected: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && supabaseAdmin),
      },
    });
  });

  // Upload image securely (base64 PNG/JPEG/WEBP/GIF up to 2MB)
  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    const {dataUrl} = req.body as {dataUrl?: string};
    if (typeof dataUrl !== 'string') {
      res.status(400).json({error: 'Invalid image payload'});
      return;
    }
    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({error: 'Only PNG, JPG, WEBP, or GIF images are allowed'});
      return;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      res.status(400).json({error: 'Image size must be 2MB or less'});
      return;
    }
    const safeFilename = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const resolvedPath = path.resolve(UPLOADS_DIR, safeFilename);
    if (!resolvedPath.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(400).json({error: 'Invalid upload path'});
      return;
    }
    fs.writeFileSync(resolvedPath, buffer);
    res.status(201).json({url: `/uploads/${safeFilename}`});
  });

  // Products CRUD
  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    const body = req.body as Partial<Product>;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    if (!name) {
      res.status(400).json({error: 'Product name is required'});
      return;
    }
    const category =
      storeState.categories.find((c) => c.id === body.categoryId) || storeState.categories[0];

    const oldPrice = Math.max(0, Number(body.oldPrice) || 0);
    const newPrice = Math.max(0, Number(body.newPrice) || 0);
    const stock = Math.max(0, Math.floor(Number(body.stock) || 0));

    let created: Product | null = null;
    await commitStoreUpdate((draft) => {
      const codeNum = String(draft.products.length + 1).padStart(2, '0');
      const sanitizedImages = sanitizeImageList(body.images);
      const primaryImage = sanitizedImages[0] || sanitizeImageUrl(body.imageUrl);
      const finalImages =
        sanitizedImages.length > 0 ? sanitizedImages : primaryImage ? [primaryImage] : [];
      created = {
        id: `prod-${Date.now()}`,
        code: codeNum,
        name,
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
        oldPrice,
        newPrice,
        stock,
        imageUrl: primaryImage,
        images: finalImages,
        demoUrl: sanitizeExternalUrl(body.demoUrl),
        previewVariant: body.previewVariant || 'ecommerce',
        year: typeof body.year === 'string' && body.year.trim() ? body.year.trim().slice(0, 30) : '2025',
        deliveryTime:
          typeof body.deliveryTime === 'string' && body.deliveryTime.trim()
            ? body.deliveryTime.trim().slice(0, 40)
            : '2 Days Delivery',
        stack: Array.isArray(body.stack)
          ? body.stack.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
          : ['React', 'Tailwind CSS'],
        summary:
          typeof body.summary === 'string' && body.summary.trim()
            ? body.summary.trim().slice(0, 260)
            : 'Custom digital solution engineered for modern businesses.',
        description:
          typeof body.description === 'string' && body.description.trim()
            ? body.description.trim().slice(0, 1200)
            : 'Responsive, high-speed web and application build with full support.',
        features: Array.isArray(body.features) && body.features.length > 0
          ? body.features.map((f) => String(f).trim()).filter(Boolean).slice(0, 6)
          : ['Mobile & Desktop Responsive', 'Fast Performance', 'WhatsApp Integration'],
        featuredOnHome: Boolean(body.featuredOnHome),
        createdAt: new Date().toISOString(),
      };
      draft.products.unshift(created);
    });

    res.status(201).json({product: created});
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const productId = req.params.id;
    const existing = storeState.products.find((p) => p.id === productId);
    if (!existing) {
      res.status(404).json({error: 'Product not found'});
      return;
    }

    const body = req.body as Partial<Product>;
    let updatedProduct: Product | null = null;
    await commitStoreUpdate((draft) => {
      const target = draft.products.find((p) => p.id === productId);
      if (!target) return;

      if (typeof body.name === 'string' && body.name.trim()) {
        target.name = body.name.trim().slice(0, 120);
      }
      if (typeof body.categoryId === 'string') {
        const cat = draft.categories.find((c) => c.id === body.categoryId);
        if (cat) {
          target.categoryId = cat.id;
          target.categoryName = cat.name;
          target.categorySlug = cat.slug;
        }
      }
      if (body.oldPrice !== undefined) target.oldPrice = Math.max(0, Number(body.oldPrice) || 0);
      if (body.newPrice !== undefined) target.newPrice = Math.max(0, Number(body.newPrice) || 0);
      if (body.stock !== undefined) target.stock = Math.max(0, Math.floor(Number(body.stock) || 0));
      if (Array.isArray(body.images)) {
        const sanitizedImages = sanitizeImageList(body.images);
        target.images = sanitizedImages;
        target.imageUrl = sanitizedImages[0] || '';
      } else if (body.imageUrl !== undefined) {
        const single = sanitizeImageUrl(body.imageUrl);
        target.imageUrl = single;
        target.images = single ? [single] : [];
      }
      if (body.demoUrl !== undefined) target.demoUrl = sanitizeExternalUrl(body.demoUrl);
      if (body.previewVariant) target.previewVariant = body.previewVariant;
      if (typeof body.year === 'string') target.year = body.year.trim().slice(0, 30);
      if (typeof body.deliveryTime === 'string') {
        target.deliveryTime = body.deliveryTime.trim().slice(0, 40);
      }
      if (typeof body.summary === 'string') target.summary = body.summary.trim().slice(0, 260);
      if (typeof body.description === 'string') {
        target.description = body.description.trim().slice(0, 1200);
      }
      if (typeof body.featuredOnHome === 'boolean') target.featuredOnHome = body.featuredOnHome;
      if (Array.isArray(body.stack)) {
        target.stack = body.stack.map((s) => String(s).trim()).filter(Boolean).slice(0, 6);
      }
      if (Array.isArray(body.features)) {
        target.features = body.features.map((f) => String(f).trim()).filter(Boolean).slice(0, 6);
      }

      updatedProduct = target;
    });

    res.json({product: updatedProduct});
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const productId = req.params.id;
    await commitStoreUpdate((draft) => {
      draft.products = draft.products.filter((p) => p.id !== productId);
    });
    res.json({deleted: true});
  });

  // Categories CRUD
  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    const {name, slug} = req.body as {name?: string; slug?: string};
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 60) : '';
    if (!cleanName) {
      res.status(400).json({error: 'Category name is required'});
      return;
    }
    const cleanSlug =
      (typeof slug === 'string' && slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')) ||
      cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      `cat-${Date.now()}`;

    let created: Category | null = null;
    await commitStoreUpdate((draft) => {
      created = {
        id: `cat-${Date.now()}`,
        name: cleanName,
        slug: cleanSlug,
      };
      draft.categories.push(created);
    });
    res.status(201).json({category: created});
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    const catId = req.params.id;
    if (storeState.categories.length <= 1) {
      res.status(400).json({error: 'At least one category must remain'});
      return;
    }
    await commitStoreUpdate((draft) => {
      draft.categories = draft.categories.filter((c) => c.id !== catId);
    });
    res.json({deleted: true});
  });

  // Orders Management
  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const orderId = req.params.id;
    const {status} = req.body as {status?: OrderStatus};
    if (status !== 'completed' && status !== 'processing' && status !== 'pending') {
      res.status(400).json({error: 'Invalid order status'});
      return;
    }
    let updatedOrder: Order | null = null;
    await commitStoreUpdate((draft) => {
      const target = draft.orders.find((o) => o.id === orderId);
      if (target) {
        target.status = status;
        updatedOrder = target;
      }
    });
    if (!updatedOrder) {
      res.status(404).json({error: 'Order not found'});
      return;
    }
    res.json({order: updatedOrder});
  });

  app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const orderId = req.params.id;
    await commitStoreUpdate((draft) => {
      draft.orders = draft.orders.filter((o) => o.id !== orderId);
    });
    res.json({deleted: true});
  });

  // Site Settings, Banner, Logo & Discount Controls
  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const body = req.body as Partial<SiteSettings>;
    await commitStoreUpdate((draft) => {
      const s = draft.siteSettings;
      if (typeof body.brandName === 'string' && body.brandName.trim()) {
        s.brandName = body.brandName.trim().slice(0, 40);
      }
      if (body.logoUrl !== undefined) s.logoUrl = sanitizeImageUrl(body.logoUrl);
      if (typeof body.heroEyebrow === 'string') s.heroEyebrow = body.heroEyebrow.trim().slice(0, 60);
      if (typeof body.heroTitleLine1 === 'string') {
        s.heroTitleLine1 = body.heroTitleLine1.trim().slice(0, 40);
      }
      if (typeof body.heroTitleLine2 === 'string') {
        s.heroTitleLine2 = body.heroTitleLine2.trim().slice(0, 40);
      }
      if (typeof body.heroSubtitle === 'string') {
        s.heroSubtitle = body.heroSubtitle.trim().slice(0, 120);
      }
      if (body.bannerImageUrl !== undefined) {
        const sanitized = sanitizeImageUrl(body.bannerImageUrl);
        s.bannerImageUrl =
          sanitized || '/assets/aistudio/file_000000000f24820899c550a2115ccca0_a16ac199.png';
      }
      if (typeof body.whatsappNumber === 'string') {
        s.whatsappNumber = body.whatsappNumber.replace(/[^0-9]/g, '').slice(0, 20);
      }
      if (typeof body.displayPhone === 'string') {
        s.displayPhone = body.displayPhone.trim().slice(0, 30);
      }
      if (typeof body.locationText === 'string') {
        s.locationText = body.locationText.trim().slice(0, 100);
      }
      if (typeof body.footerCopyright === 'string') {
        s.footerCopyright = body.footerCopyright.trim().slice(0, 120);
      }
      if (typeof body.footerBadge === 'string') {
        s.footerBadge = body.footerBadge.trim().slice(0, 80);
      }
      if (body.statsRating !== undefined) {
        s.statsRating = Math.min(5, Math.max(0, Number(body.statsRating) || 0));
      }
      if (body.statsVisitors !== undefined) {
        s.statsVisitors = Math.max(0, Math.floor(Number(body.statsVisitors) || 0));
      }
      if (body.statsTotalSell !== undefined) {
        s.statsTotalSell = Math.max(0, Math.floor(Number(body.statsTotalSell) || 0));
      }
      if (body.statsMusicVideos !== undefined) {
        s.statsMusicVideos = Math.max(0, Math.floor(Number(body.statsMusicVideos) || 0));
      }
      if (body.globalDiscountPercent !== undefined) {
        const pct = Math.min(90, Math.max(0, Math.floor(Number(body.globalDiscountPercent) || 0)));
        s.globalDiscountPercent = pct;
        if (pct > 0) {
          draft.products.forEach((p) => {
            const base = p.oldPrice > 0 ? p.oldPrice : p.newPrice;
            p.oldPrice = base;
            p.newPrice = Math.max(0, Math.round(base * (1 - pct / 100)));
          });
        }
      }
    });
    res.json({siteSettings: storeState.siteSettings});
  });

  // Reviews Management
  app.post('/api/admin/reviews', requireAdmin, async (req, res) => {
    const {author, rating, comment} = req.body as Partial<ReviewItem>;
    if (typeof author !== 'string' || !author.trim()) {
      res.status(400).json({error: 'Author is required'});
      return;
    }
    let created: ReviewItem | null = null;
    await commitStoreUpdate((draft) => {
      created = {
        id: `rev-${Date.now()}`,
        author: author.trim().slice(0, 60),
        rating: Math.min(5, Math.max(1, Number(rating) || 5)),
        comment: typeof comment === 'string' ? comment.trim().slice(0, 300) : '',
        date: 'আজ',
      };
      draft.reviews.unshift(created);
      const avg =
        draft.reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, draft.reviews.length);
      draft.siteSettings.statsRating = Number(avg.toFixed(1));
    });
    res.status(201).json({review: created});
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
    const revId = req.params.id;
    await commitStoreUpdate((draft) => {
      draft.reviews = draft.reviews.filter((r) => r.id !== revId);
    });
    res.json({deleted: true});
  });

  // ---------- Vite Dev / Production Static Serving ----------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
