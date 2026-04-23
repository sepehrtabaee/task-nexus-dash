import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      lock: typeof navigator !== 'undefined' && navigator.locks
        ? (name, _timeout, fn) => navigator.locks.request(name, fn)
        : undefined,
    },
  }
);
