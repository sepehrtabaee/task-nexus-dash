import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      lock: typeof navigator !== 'undefined' && navigator.locks
        ? async (name, acquireTimeout, fn) => {
            if (!acquireTimeout || acquireTimeout < 0) {
              return navigator.locks.request(name, fn);
            }
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), acquireTimeout);
            return navigator.locks
              .request(name, { signal: controller.signal }, fn)
              .finally(() => clearTimeout(timer));
          }
        : undefined,
    },
  }
);
