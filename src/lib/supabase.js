// Safe Supabase stub for local/dev when you want to disable real Supabase calls.
// Non-destructive: returns empty results and null user by default.
// Usage: import { supabase } from '@/lib/supabase';

function makeThenable(resultFactory) {
  // A thenable object that can also be chained with eq()/maybeSingle()/select()
  const chain = {
    then: (onFulfilled, onRejected) => Promise.resolve(resultFactory()).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(resultFactory()).catch(onRejected),
    finally: (onFinally) => Promise.resolve(resultFactory()).finally(onFinally),
    // chainable no-ops
    eq() { return chain; },
    maybeSingle: async () => {
      const r = await resultFactory();
      return { data: null, error: null };
    },
  };
  return chain;
}

function makeQuery(tableName) {
  return {
    select(_cols) {
      return makeThenable(() => ({ data: [], error: null }));
    },
    upsert(_payload, _opts) {
      // return an object that provides select()
      return {
        select: () => makeThenable(() => ({ data: [], error: null })),
      };
    },
    // convenience: support direct then() on the from() return value
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
    },
  };
}

export const supabase = {
  // auth.getUser() -> { data: { user }, error }
  auth: {
    async getUser() {
      // If you want to simulate an authenticated user during development,
      // set window.__STUB_SUPABASE_FAKE_USER__ = { id: 'some-id', email: 'me@example.com' }
      if (typeof window !== 'undefined' && window.__STUB_SUPABASE_FAKE_USER__) {
        return { data: { user: window.__STUB_SUPABASE_FAKE_USER__ }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    // other auth helpers can be added here if needed
  },

  // from(table) returns a chainable query stub
  from(tableName) {
    if (typeof console !== 'undefined') {
      console.warn(`[supabase-stub] called .from(${String(tableName)}) — returning safe empty results`);
    }
    return makeQuery(tableName);
  },

  // For safety, include a generic rpc stub in case code calls it
  rpc(_fn, _args) {
    return Promise.resolve({ data: null, error: null });
  },
};

// Inform runtime that the stub is active (only in browser)
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  console.info('[supabase-stub] Supabase calls have been disabled by src/lib/supabase.js');
}
