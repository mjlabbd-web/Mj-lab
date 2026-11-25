import {createClient, SupabaseClient} from '@supabase/supabase-js';
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
} from './src/types/store';

interface AssetFetcher {
  fetch(input: Request | string): Promise<Response>;
}

export interface WorkerEnv {
  ASSETS: AssetFetcher;
  VITE_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_PASSCODE?: string;
  SESSION_SECRET?: string;
}

interface AdminAuthRecord {
  salt: string;
  hash: string;
  createdAt: string;
}

interface UploadRecord {
  mimeType: string;
  base64: string;
}

const textEncoder = new TextEncoder();
let ephemeralSessionSecret: string | null = null;
let memoryFallbackStore: FullStoreState = structuredClone(DEFAULT_FULL_STORE);
let memoryFallbackAuth: AdminAuthRecord | null = null;

function getSessionSecret(env: WorkerEnv): string {
  const configured = env.SESSION_SECRET?.trim();
  if (configured) return configured;
  if (!ephemeralSessionSecret) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    ephemeralSessionSecret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return ephemeralSessionSecret;
}

function resolveSupabaseKeys(env: WorkerEnv) {
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim();
  const anonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return {url, anonKey, serviceKey};
}

function getSupabaseAdmin(env: WorkerEnv): SupabaseClient | null {
  const {url, serviceKey} = resolveSupabaseKeys(env);
  if (!url || !serviceKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return createClient(url, serviceKey, {
      auth: {persistSession: false, autoRefreshToken: false},
    });
  } catch {
    return null;
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function hashPassword(password: string, existingSaltHex?: string): Promise<{salt: string; hash: string}> {
  const saltBytes = existingSaltHex
    ? new Uint8Array(existingSaltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes, (b) => b.toString(16).padStart(2, '0')).join('');

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  const hashHex = Array.from(new Uint8Array(derivedBits), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  return {salt: saltHex, hash: hashHex};
}

async function verifyPassword(password: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  const {hash} = await hashPassword(password, saltHex);
  return constantTimeEqual(textEncoder.encode(hash), textEncoder.encode(expectedHashHex));
}

async function createSessionToken(env: WorkerEnv): Promise<string> {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(8));
  const nonce = Array.from(nonceBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const payload = toBase64Url(
    textEncoder.encode(
      JSON.stringify({
        role: 'super_admin',
        exp: Date.now() + 24 * 60 * 60 * 1000,
        nonce,
      }),
    ),
  );
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(getSessionSecret(env)),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

async function verifySessionToken(token: string, env: WorkerEnv): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(getSessionSecret(env)),
      {name: 'HMAC', hash: 'SHA-256'},
      false,
      ['sign'],
    );
    const expectedSig = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload)),
    );
    const actualSig = fromBase64Url(sig);
    if (!constantTimeEqual(actualSig, expectedSig)) return false;

    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as {
      role?: string;
      exp?: number;
    };
    return (
      decoded.role === 'super_admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now()
    );
  } catch {
    return false;
  }
}

function extractBearerToken(request: Request): string {
  const header = request.headers.get('Authorization') || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return '';
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

function toPublicStore(state: FullStoreState): PublicStoreState {
  return {
    products: state.products,
    categories: state.categories,
    siteSettings: state.siteSettings,
    reviews: state.reviews,
    updatedAt: state.updatedAt,
  };
}

async function loadStore(supabaseAdmin: SupabaseClient | null): Promise<FullStoreState> {
  if (supabaseAdmin) {
    try {
      const {data, error} = await supabaseAdmin
        .from('persona_store_state')
        .select('payload')
        .eq('id', 'main')
        .maybeSingle();
      if (!error && data && data.payload && typeof data.payload === 'object') {
        const parsed = data.payload as Partial<FullStoreState>;
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
    } catch {
      // Table not ready yet
    }
  }
  return structuredClone(memoryFallbackStore);
}

async function saveAndBroadcastStore(
  supabaseAdmin: SupabaseClient | null,
  nextState: FullStoreState,
): Promise<void> {
  nextState.updatedAt = new Date().toISOString();
  memoryFallbackStore = structuredClone(nextState);

  if (!supabaseAdmin) return;

  try {
    await supabaseAdmin.from('persona_store_state').upsert({
      id: 'main',
      payload: nextState,
      updated_at: nextState.updatedAt,
    });
  } catch {
    // Ignore if table not created yet
  }

  try {
    const channel = supabaseAdmin.channel('persona-realtime');
    await channel.send({
      type: 'broadcast',
      event: 'store_sync',
      payload: toPublicStore(nextState),
    });
    await supabaseAdmin.removeChannel(channel);
  } catch {
    // Ignore transient broadcast error
  }
}

async function loadAdminAuth(supabaseAdmin: SupabaseClient | null): Promise<AdminAuthRecord | null> {
  if (supabaseAdmin) {
    try {
      const {data, error} = await supabaseAdmin
        .from('persona_store_state')
        .select('payload')
        .eq('id', 'admin-auth')
        .maybeSingle();
      if (!error && data && data.payload && typeof data.payload === 'object') {
        const rec = data.payload as AdminAuthRecord;
        if (rec.salt && rec.hash) return rec;
      }
    } catch {
      // Ignore
    }
  }
  return memoryFallbackAuth;
}

async function saveAdminAuth(
  supabaseAdmin: SupabaseClient | null,
  record: AdminAuthRecord,
): Promise<void> {
  memoryFallbackAuth = record;
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('persona_store_state').upsert({
      id: 'admin-auth',
      payload: record,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Ignore
  }
}

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    const {url: supabaseUrl, anonKey: supabaseAnonKey, serviceKey} = resolveSupabaseKeys(env);
    const supabaseAdmin = getSupabaseAdmin(env);

    // Serve uploaded images stored in Supabase
    if (method === 'GET' && pathname.startsWith('/uploads/')) {
      const fileId = pathname.slice('/uploads/'.length);
      if (/^[a-zA-Z0-9_.-]+$/.test(fileId) && supabaseAdmin) {
        try {
          const {data} = await supabaseAdmin
            .from('persona_store_state')
            .select('payload')
            .eq('id', `upload_${fileId}`)
            .maybeSingle();
          if (data?.payload && typeof data.payload === 'object') {
            const rec = data.payload as UploadRecord;
            if (
              rec.base64 &&
              (rec.mimeType === 'image/png' ||
                rec.mimeType === 'image/jpeg' ||
                rec.mimeType === 'image/webp' ||
                rec.mimeType === 'image/gif')
            ) {
              const binary = atob(rec.base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              return new Response(bytes, {
                status: 200,
                headers: {
                  'Content-Type': rec.mimeType,
                  'Cache-Control': 'public, max-age=31536000, immutable',
                  'X-Content-Type-Options': 'nosniff',
                },
              });
            }
          }
        } catch {
          // Fall through to ASSETS
        }
      }
      return env.ASSETS.fetch(request);
    }

    // ---------- Public APIs ----------
    if (method === 'GET' && pathname === '/api/public-config') {
      return jsonResponse({
        supabaseUrl,
        supabaseAnonKey,
      });
    }

    if (method === 'GET' && pathname === '/api/store') {
      const current = await loadStore(supabaseAdmin);
      return jsonResponse(toPublicStore(current));
    }

    if (method === 'POST' && pathname === '/api/visitors/hit') {
      const next = await loadStore(supabaseAdmin);
      next.siteSettings.statsVisitors += 1;
      await saveAndBroadcastStore(supabaseAdmin, next);
      return jsonResponse({visitors: next.siteSettings.statsVisitors});
    }

    if (method === 'POST' && pathname === '/api/orders') {
      const body = await readJsonBody<{
        productId?: string;
        customerName?: string;
        customerPhone?: string;
        quantity?: number;
      }>(request);
      if (!body) return jsonResponse({error: 'Invalid JSON payload'}, 400);

      const next = await loadStore(supabaseAdmin);
      const product = next.products.find((p) => p.id === body.productId);
      if (!product) return jsonResponse({error: 'Invalid product selected'}, 400);

      const cleanName =
        typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 80) : '';
      const cleanPhone =
        typeof body.customerPhone === 'string' ? body.customerPhone.trim().slice(0, 30) : '';
      const qty = Number.isFinite(Number(body.quantity))
        ? Math.max(1, Math.min(20, Math.floor(Number(body.quantity))))
        : 1;

      if (!cleanName || !cleanPhone) {
        return jsonResponse({error: 'Customer name and phone are required'}, 400);
      }

      const unitPrice = Math.max(0, Number(product.newPrice) || 0);
      const totalAmount = unitPrice * qty;
      const nextNum = 1001 + next.orders.length;

      const createdOrder: Order = {
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

      next.orders.unshift(createdOrder);
      next.siteSettings.statsTotalSell += qty;
      if (product.stock > 0) {
        product.stock = Math.max(0, product.stock - qty);
      }
      const lastDaily = next.salesSeries.daily[next.salesSeries.daily.length - 1];
      if (lastDaily) {
        lastDaily.sales += qty;
        lastDaily.revenue += totalAmount;
      }

      await saveAndBroadcastStore(supabaseAdmin, next);
      return jsonResponse({order: createdOrder}, 201);
    }

    // ---------- Admin Auth APIs ----------
    if (method === 'GET' && pathname === '/api/admin/auth-status') {
      const envPasscode = env.ADMIN_PASSCODE?.trim();
      const record = await loadAdminAuth(supabaseAdmin);
      const token = extractBearerToken(request);
      const authenticated = token ? await verifySessionToken(token, env) : false;
      return jsonResponse({
        needsSetup: !envPasscode && !record,
        usesEnvPasscode: Boolean(envPasscode),
        authenticated,
        supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey && serviceKey),
        supabaseClientReady: Boolean(supabaseUrl && supabaseAnonKey),
        supabaseAdminReady: Boolean(supabaseAdmin),
      });
    }

    if (method === 'POST' && pathname === '/api/admin/claim') {
      const envPasscode = env.ADMIN_PASSCODE?.trim();
      const existing = await loadAdminAuth(supabaseAdmin);
      if (envPasscode || existing) {
        return jsonResponse({error: 'Admin password is already configured'}, 403);
      }
      const body = await readJsonBody<{password?: string}>(request);
      if (!body || typeof body.password !== 'string' || body.password.trim().length < 4) {
        return jsonResponse({error: 'Password must be at least 4 characters'}, 400);
      }
      const {salt, hash} = await hashPassword(body.password.trim());
      await saveAdminAuth(supabaseAdmin, {
        salt,
        hash,
        createdAt: new Date().toISOString(),
      });
      const token = await createSessionToken(env);
      return jsonResponse({token}, 201);
    }

    if (method === 'POST' && pathname === '/api/admin/login') {
      const body = await readJsonBody<{password?: string}>(request);
      if (!body || typeof body.password !== 'string' || !body.password) {
        return jsonResponse({error: 'Password is required'}, 400);
      }
      const envPasscode = env.ADMIN_PASSCODE?.trim();
      if (envPasscode) {
        const ok = constantTimeEqual(
          textEncoder.encode(body.password),
          textEncoder.encode(envPasscode),
        );
        if (!ok) return jsonResponse({error: 'Invalid admin password'}, 401);
        return jsonResponse({token: await createSessionToken(env)});
      }

      const record = await loadAdminAuth(supabaseAdmin);
      if (!record || !(await verifyPassword(body.password, record.salt, record.hash))) {
        return jsonResponse({error: 'Invalid admin password'}, 401);
      }
      return jsonResponse({token: await createSessionToken(env)});
    }

    // ---------- Protected Admin APIs ----------
    if (pathname.startsWith('/api/admin/')) {
      const token = extractBearerToken(request);
      if (!token || !(await verifySessionToken(token, env))) {
        return jsonResponse({error: 'Unauthorized admin session'}, 401);
      }

      if (method === 'GET' && pathname === '/api/admin/state') {
        const current = await loadStore(supabaseAdmin);
        const totalRevenue = current.orders.reduce((sum, ord) => sum + ord.amount, 0);
        return jsonResponse({
          ...current,
          summary: {
            totalProducts: current.products.length,
            totalOrders: current.orders.length,
            totalVisitors: current.siteSettings.statsVisitors,
            totalSell: current.siteSettings.statsTotalSell,
            totalRevenue,
            rating: current.siteSettings.statsRating,
          },
          supabaseStatus: {
            urlConfigured: Boolean(supabaseUrl),
            anonKeyConfigured: Boolean(supabaseAnonKey),
            serviceRoleConfigured: Boolean(serviceKey),
            connected: Boolean(supabaseUrl && supabaseAnonKey && supabaseAdmin),
          },
        });
      }

      if (method === 'POST' && pathname === '/api/admin/upload') {
        const body = await readJsonBody<{dataUrl?: string}>(request);
        if (!body || typeof body.dataUrl !== 'string') {
          return jsonResponse({error: 'Invalid image payload'}, 400);
        }
        const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(
          body.dataUrl,
        );
        if (!match) {
          return jsonResponse({error: 'Only PNG, JPG, WEBP, or GIF images are allowed'}, 400);
        }
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        const approxBytes = Math.floor((match[2].length * 3) / 4);
        if (approxBytes > 2 * 1024 * 1024) {
          return jsonResponse({error: 'Image size must be 2MB or less'}, 400);
        }

        const randBytes = crypto.getRandomValues(new Uint8Array(4));
        const randHex = Array.from(randBytes, (b) => b.toString(16).padStart(2, '0')).join('');
        const safeFilename = `img_${Date.now()}_${randHex}.${ext}`;

        if (!supabaseAdmin) {
          return jsonResponse(
            {error: 'Configure Supabase secrets so image uploads persist on Workers'},
            400,
          );
        }

        await supabaseAdmin.from('persona_store_state').upsert({
          id: `upload_${safeFilename}`,
          payload: {mimeType, base64: match[2]} satisfies UploadRecord,
          updated_at: new Date().toISOString(),
        });
        return jsonResponse({url: `/uploads/${safeFilename}`}, 201);
      }

      if (method === 'POST' && pathname === '/api/admin/products') {
        const body = await readJsonBody<Partial<Product>>(request);
        if (!body) return jsonResponse({error: 'Invalid JSON payload'}, 400);
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
        if (!name) return jsonResponse({error: 'Product name is required'}, 400);

        const next = await loadStore(supabaseAdmin);
        const category =
          next.categories.find((c) => c.id === body.categoryId) || next.categories[0];

        const created: Product = {
          id: `prod-${Date.now()}`,
          code: String(next.products.length + 1).padStart(2, '0'),
          name,
          categoryId: category.id,
          categoryName: category.name,
          categorySlug: category.slug,
          oldPrice: Math.max(0, Number(body.oldPrice) || 0),
          newPrice: Math.max(0, Number(body.newPrice) || 0),
          stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
          imageUrl: sanitizeImageUrl(body.imageUrl),
          demoUrl: sanitizeExternalUrl(body.demoUrl),
          previewVariant: body.previewVariant || 'ecommerce',
          year:
            typeof body.year === 'string' && body.year.trim()
              ? body.year.trim().slice(0, 30)
              : '২০২৫',
          deliveryTime:
            typeof body.deliveryTime === 'string' && body.deliveryTime.trim()
              ? body.deliveryTime.trim().slice(0, 40)
              : '২ দিনে ডেলিভারি',
          stack: Array.isArray(body.stack)
            ? body.stack.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
            : ['রিয়েক্ট', 'টেলউইন্ড'],
          summary:
            typeof body.summary === 'string' && body.summary.trim()
              ? body.summary.trim().slice(0, 260)
              : 'আধুনিক ব্যবসার জন্য কাস্টম ডিজিটাল সলিউশন।',
          description:
            typeof body.description === 'string' && body.description.trim()
              ? body.description.trim().slice(0, 1200)
              : 'মোবাইল ও ডেস্কটপ রেসপন্সিভ ডিজাইনসহ সম্পূর্ণ ওয়েব ও অ্যাপ সমাধান।',
          features:
            Array.isArray(body.features) && body.features.length > 0
              ? body.features.map((f) => String(f).trim()).filter(Boolean).slice(0, 6)
              : ['রেসপন্সিভ ডিজাইন', 'দ্রুতগতির পারফরম্যান্স', 'হোয়াটসঅ্যাপ ইন্টিগ্রেশন'],
          featuredOnHome: Boolean(body.featuredOnHome),
          createdAt: new Date().toISOString(),
        };

        next.products.unshift(created);
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({product: created}, 201);
      }

      if (method === 'PUT' && pathname.startsWith('/api/admin/products/')) {
        const productId = pathname.slice('/api/admin/products/'.length);
        const body = await readJsonBody<Partial<Product>>(request);
        if (!body) return jsonResponse({error: 'Invalid JSON payload'}, 400);

        const next = await loadStore(supabaseAdmin);
        const target = next.products.find((p) => p.id === productId);
        if (!target) return jsonResponse({error: 'Product not found'}, 404);

        if (typeof body.name === 'string' && body.name.trim()) {
          target.name = body.name.trim().slice(0, 120);
        }
        if (typeof body.categoryId === 'string') {
          const cat = next.categories.find((c) => c.id === body.categoryId);
          if (cat) {
            target.categoryId = cat.id;
            target.categoryName = cat.name;
            target.categorySlug = cat.slug;
          }
        }
        if (body.oldPrice !== undefined) target.oldPrice = Math.max(0, Number(body.oldPrice) || 0);
        if (body.newPrice !== undefined) target.newPrice = Math.max(0, Number(body.newPrice) || 0);
        if (body.stock !== undefined) target.stock = Math.max(0, Math.floor(Number(body.stock) || 0));
        if (body.imageUrl !== undefined) target.imageUrl = sanitizeImageUrl(body.imageUrl);
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

        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({product: target});
      }

      if (method === 'DELETE' && pathname.startsWith('/api/admin/products/')) {
        const productId = pathname.slice('/api/admin/products/'.length);
        const next = await loadStore(supabaseAdmin);
        next.products = next.products.filter((p) => p.id !== productId);
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({deleted: true});
      }

      if (method === 'POST' && pathname === '/api/admin/categories') {
        const body = await readJsonBody<{name?: string; slug?: string}>(request);
        const cleanName = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
        if (!cleanName) return jsonResponse({error: 'Category name is required'}, 400);

        const cleanSlug =
          (typeof body?.slug === 'string' &&
            body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')) ||
          cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
          `cat-${Date.now()}`;

        const next = await loadStore(supabaseAdmin);
        const created: Category = {
          id: `cat-${Date.now()}`,
          name: cleanName,
          slug: cleanSlug,
        };
        next.categories.push(created);
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({category: created}, 201);
      }

      if (method === 'DELETE' && pathname.startsWith('/api/admin/categories/')) {
        const catId = pathname.slice('/api/admin/categories/'.length);
        const next = await loadStore(supabaseAdmin);
        if (next.categories.length <= 1) {
          return jsonResponse({error: 'At least one category must remain'}, 400);
        }
        next.categories = next.categories.filter((c) => c.id !== catId);
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({deleted: true});
      }

      if (method === 'PATCH' && pathname.startsWith('/api/admin/orders/')) {
        const orderId = pathname.slice('/api/admin/orders/'.length);
        const body = await readJsonBody<{status?: OrderStatus}>(request);
        if (
          body?.status !== 'completed' &&
          body?.status !== 'processing' &&
          body?.status !== 'pending'
        ) {
          return jsonResponse({error: 'Invalid order status'}, 400);
        }
        const next = await loadStore(supabaseAdmin);
        const target = next.orders.find((o) => o.id === orderId);
        if (!target) return jsonResponse({error: 'Order not found'}, 404);
        target.status = body.status;
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({order: target});
      }

      if (method === 'DELETE' && pathname.startsWith('/api/admin/orders/')) {
        const orderId = pathname.slice('/api/admin/orders/'.length);
        const next = await loadStore(supabaseAdmin);
        next.orders = next.orders.filter((o) => o.id !== orderId);
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({deleted: true});
      }

      if (method === 'PUT' && pathname === '/api/admin/settings') {
        const body = await readJsonBody<Partial<SiteSettings>>(request);
        if (!body) return jsonResponse({error: 'Invalid JSON payload'}, 400);

        const next = await loadStore(supabaseAdmin);
        const s = next.siteSettings;
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
            next.products.forEach((p) => {
              const base = p.oldPrice > 0 ? p.oldPrice : p.newPrice;
              p.oldPrice = base;
              p.newPrice = Math.max(0, Math.round(base * (1 - pct / 100)));
            });
          }
        }

        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({siteSettings: next.siteSettings});
      }

      if (method === 'POST' && pathname === '/api/admin/reviews') {
        const body = await readJsonBody<Partial<ReviewItem>>(request);
        if (!body || typeof body.author !== 'string' || !body.author.trim()) {
          return jsonResponse({error: 'Author is required'}, 400);
        }
        const next = await loadStore(supabaseAdmin);
        const created: ReviewItem = {
          id: `rev-${Date.now()}`,
          author: body.author.trim().slice(0, 60),
          rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
          comment: typeof body.comment === 'string' ? body.comment.trim().slice(0, 300) : '',
          date: 'আজ',
        };
        next.reviews.unshift(created);
        const avg = next.reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, next.reviews.length);
        next.siteSettings.statsRating = Number(avg.toFixed(1));
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({review: created}, 201);
      }

      if (method === 'DELETE' && pathname.startsWith('/api/admin/reviews/')) {
        const revId = pathname.slice('/api/admin/reviews/'.length);
        const next = await loadStore(supabaseAdmin);
        next.reviews = next.reviews.filter((r) => r.id !== revId);
        await saveAndBroadcastStore(supabaseAdmin, next);
        return jsonResponse({deleted: true});
      }

      return jsonResponse({error: 'Not found'}, 404);
    }

    // Static SPA & asset serving via Cloudflare Workers Assets
    return env.ASSETS.fetch(request);
  },
};
