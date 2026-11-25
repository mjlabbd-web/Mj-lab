import {useCallback, useEffect, useState} from 'react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_REVIEWS,
  DEFAULT_SITE_SETTINGS,
  PublicStoreState,
} from '../types/store';
import {initSupabaseClient} from '../lib/supabaseClient';

const INITIAL_PUBLIC_STATE: PublicStoreState = {
  products: DEFAULT_PRODUCTS,
  categories: DEFAULT_CATEGORIES,
  siteSettings: DEFAULT_SITE_SETTINGS,
  reviews: DEFAULT_REVIEWS,
  updatedAt: '',
};

export function useRealtimeStore() {
  const [store, setStore] = useState<PublicStoreState>(INITIAL_PUBLIC_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const data = (await res.json()) as PublicStoreState;
        setStore(data);
      }
    } catch {
      // Fallback to initial defaults
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void fetchStore();
  }, [fetchStore]);

  // 1. Express WebSocket real-time sync (gracefully stops retry on serverless Workers where Supabase Realtime handles live sync)
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let unmounted = false;
    let failedAttempts = 0;

    const connect = () => {
      if (unmounted || failedAttempts >= 2) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        return;
      }

      socket.onopen = () => {
        failedAttempts = 0;
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string;
            payload?: PublicStoreState;
          };
          if (msg.type === 'store:update' && msg.payload) {
            setStore(msg.payload);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onclose = () => {
        failedAttempts += 1;
        if (!unmounted && failedAttempts < 2) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, []);

  // 2. Supabase Realtime channel sync (active automatically via build-time VITE_* or runtime /api/public-config)
  useEffect(() => {
    let active = true;
    let activeChannel: ReturnType<
      NonNullable<Awaited<ReturnType<typeof initSupabaseClient>>>['channel']
    > | null = null;
    let supabaseRef: Awaited<ReturnType<typeof initSupabaseClient>> = null;

    void initSupabaseClient().then((supabase) => {
      if (!active || !supabase) return;
      supabaseRef = supabase;
      activeChannel = supabase
        .channel('persona-realtime')
        .on('broadcast', {event: 'store_sync'}, ({payload}) => {
          if (payload && typeof payload === 'object') {
            setStore(payload as PublicStoreState);
          }
        })
        .on(
          'postgres_changes',
          {event: '*', schema: 'public', table: 'persona_store_state'},
          () => {
            void fetchStore();
          },
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (supabaseRef && activeChannel) {
        void supabaseRef.removeChannel(activeChannel);
      }
    };
  }, [fetchStore]);

  // 3. Re-sync when tab regains focus
  useEffect(() => {
    const onFocus = () => {
      void fetchStore();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchStore]);

  return {store, isLoaded, refetch: fetchStore};
}
