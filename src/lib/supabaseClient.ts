import {createClient, SupabaseClient} from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null | undefined;
let initPromise: Promise<SupabaseClient | null> | null = null;

function createSupabaseFromPair(url?: string, anonKey?: string): SupabaseClient | null {
  const cleanUrl = url?.trim() || '';
  const cleanKey = anonKey?.trim() || '';
  if (!cleanUrl || !cleanKey) return null;

  try {
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return createClient(cleanUrl, cleanKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch {
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const client = createSupabaseFromPair(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
  if (client) {
    cachedClient = client;
    return client;
  }
  return null;
}

export async function initSupabaseClient(): Promise<SupabaseClient | null> {
  const syncClient = getSupabaseClient();
  if (syncClient) return syncClient;
  if (cachedClient === null) return null;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const res = await fetch('/api/public-config');
        if (res.ok) {
          const data = (await res.json()) as {
            supabaseUrl?: string;
            supabaseAnonKey?: string;
          };
          const runtimeClient = createSupabaseFromPair(data.supabaseUrl, data.supabaseAnonKey);
          cachedClient = runtimeClient;
          return runtimeClient;
        }
      } catch {
        // Ignore network error
      }
      cachedClient = null;
      return null;
    })();
  }
  return initPromise;
}

export function isSupabaseClientConfigured(): boolean {
  return getSupabaseClient() !== null;
}
