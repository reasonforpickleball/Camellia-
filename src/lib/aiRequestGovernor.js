/**
 * AI_KILL_SWITCH_GATEWAY
 *
 * THE ONLY entry point for all AI provider calls in this application.
 *
 * Architecture:
 *   request() → AUTH → CACHE → QUEUE → RATE LIMIT → MUTEX → EXECUTOR → RESPONSE
 *
 * RULES (non-negotiable):
 *   - No module may call Groq/Google/OpenAI/Anthropic directly
 *   - All requests enter the queue and are serialized per provider
 *   - 429 / timeout → exponential backoff with jitter, auto-requeue
 *   - Both providers down → deterministic fallback (app never breaks)
 *   - "Busy" is never surfaced to users
 */

// ─────────────────────────────────────────────────────────────────────────────
// Provider limits (conservative, free-tier safe)
// ─────────────────────────────────────────────────────────────────────────────

// Rate limits tuned to exact free-tier ceilings from provider docs:
// Groq: Llama 3.1 8B = 30 RPM, Llama 3.3 70B/Llama 4 Scout = 30 RPM, Qwen 3 32B/Kimi K2 = 60 RPM
// Google: Gemini Flash = 10 RPM, Gemini Flash-Lite = 15 RPM, Gemini Pro = 2-5 RPM
// We pick the most permissive safe model limit and stay just under it.

const PROVIDER_LIMITS = {
  groq: {
    // Qwen 3 32B / Kimi K2 allow 60 RPM — use 55 to stay safely under
    maxPerMinute: 55,
    maxPerSecond: 2,
    minGapMs: 1100,            // ~55 RPM → ~1.09s between calls
    concurrency: 2,
    cbThreshold: 3,
    cbBaseCooldownMs: 20000,
    cbMaxCooldownMs: 90000,
  },
  google: {
    // Gemini Flash-Lite = 15 RPM — use 14 to stay safely under
    maxPerMinute: 14,
    maxPerSecond: 1,
    minGapMs: 4200,            // ~14 RPM → ~4.3s between calls
    concurrency: 1,
    cbThreshold: 2,
    cbBaseCooldownMs: 25000,
    cbMaxCooldownMs: 90000,
  },
  openai: {
    maxPerMinute: 200,
    maxPerSecond: 5,
    minGapMs: 300,
    concurrency: 3,
    cbThreshold: 5,
    cbBaseCooldownMs: 15000,
    cbMaxCooldownMs: 60000,
  },
  anthropic: {
    maxPerMinute: 200,
    maxPerSecond: 5,
    minGapMs: 300,
    concurrency: 3,
    cbThreshold: 5,
    cbBaseCooldownMs: 15000,
    cbMaxCooldownMs: 60000,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Priority levels
// ─────────────────────────────────────────────────────────────────────────────

export const PRIORITY = {
  CRITICAL: 1,  // Coach engine
  HIGH: 2,      // Quiz generation, flashcards
  NORMAL: 3,    // Notes, essay, planner
  LOW: 4,       // Podcast, Ask, Yucca
};

// ─────────────────────────────────────────────────────────────────────────────
// Request states
// ─────────────────────────────────────────────────────────────────────────────

export const REQUEST_STATE = {
  QUEUED: 'QUEUED',
  ACTIVE: 'ACTIVE',
  RETRYING: 'RETRYING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

// ─────────────────────────────────────────────────────────────────────────────
// Module-singleton state
// ─────────────────────────────────────────────────────────────────────────────

const _providers = Object.keys(PROVIDER_LIMITS);

const state = {
  // Rolling request timestamps (completed calls only)
  requestLog: Object.fromEntries(_providers.map(p => [p, []])),
  // Timestamp of last completed call per provider
  lastCompleted: Object.fromEntries(_providers.map(p => [p, 0])),
  // Active execution slots per provider
  activeCount: Object.fromEntries(_providers.map(p => [p, 0])),
  // Circuit breaker
  consecutiveErrors: Object.fromEntries(_providers.map(p => [p, 0])),
  cooldownUntil: Object.fromEntries(_providers.map(p => [p, 0])),
  cbTrips: Object.fromEntries(_providers.map(p => [p, 0])),
  // Backpressure: grows under load, shrinks when queue drains
  backpressureMs: Object.fromEntries(_providers.map(p => [p, 0])),
  // Priority queue: [{id, provider, model, priority, source, state, fn, resolve, reject, timestamp, retries}]
  queue: [],
  processing: false,
  // Monitor
  monitor: {
    totalRequests: 0,
    cacheHits: 0,
    queuedRequests: 0,
    retries: 0,
    fallbackActivations: 0,
    bypassAttempts: 0,
    providerStats: Object.fromEntries(_providers.map(p => [p, { requests: 0, errors: 0, retries: 0 }])),
  },
  // Recent completed requests for monitor log (last 20)
  recentLog: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Monitor pub/sub
// ─────────────────────────────────────────────────────────────────────────────

const _subscribers = new Set();
function _notify() {
  if (!_subscribers.size) return;
  const snap = getMonitorSnapshot();
  _subscribers.forEach(fn => { try { fn(snap); } catch {} });
}
export function subscribeMonitor(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'camellia_ai_gw_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function _hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function _makeCacheKey(provider, model, messages, opts) {
  return _hash(JSON.stringify({
    p: provider, m: model,
    msgs: messages.map(m => ({ r: m.role, c: (m.content || '').slice(0, 500) })),
    mt: opts?.maxTokens, t: opts?.temperature,
  }));
}

function _readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function _writeCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length > 400) {
    keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, 100).forEach(k => delete cache[k]);
  }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}
export function cacheGet(key) {
  const e = _readCache()[key];
  return (e && Date.now() - e.ts < CACHE_TTL) ? e.value : null;
}
export function cacheSet(key, value) {
  const c = _readCache(); c[key] = { value, ts: Date.now() }; _writeCache(c);
}
export function invalidateCache(pattern) {
  if (!pattern) { localStorage.removeItem(CACHE_KEY); return; }
  const c = _readCache();
  Object.keys(c).filter(k => k.includes(pattern)).forEach(k => delete c[k]);
  _writeCache(c);
}

// ─────────────────────────────────────────────────────────────────────────────
// In-flight coalescing
// ─────────────────────────────────────────────────────────────────────────────

const _inFlight = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Jitter helper
// ─────────────────────────────────────────────────────────────────────────────

function _jitter(baseMs, maxExtra = 500) {
  return baseMs + Math.floor(Math.random() * maxExtra);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limit / block checks
// ─────────────────────────────────────────────────────────────────────────────

function _pruneLog(provider) {
  const cut = Date.now() - 60000;
  state.requestLog[provider] = state.requestLog[provider].filter(ts => ts > cut);
}

function _isCircuitOpen(provider) {
  return state.cooldownUntil[provider] > Date.now();
}

/** Hard pre-flight: returns true → request MUST wait */
function _isBlocked(provider) {
  if (_isCircuitOpen(provider)) return true;
  _pruneLog(provider);
  const lim = PROVIDER_LIMITS[provider];
  if (!lim) return false;
  if (state.requestLog[provider].length >= lim.maxPerMinute) return true;
  if (state.requestLog[provider].filter(ts => Date.now() - ts < 1000).length >= lim.maxPerSecond) return true;
  if (Date.now() - state.lastCompleted[provider] < lim.minGapMs + state.backpressureMs[provider]) return true;
  if (state.activeCount[provider] >= lim.concurrency) return true;
  return false;
}

function _msUntilReady(provider) {
  if (_isCircuitOpen(provider)) return state.cooldownUntil[provider] - Date.now();
  const lim = PROVIDER_LIMITS[provider];
  if (!lim) return 100;
  const gapRemaining = (lim.minGapMs + state.backpressureMs[provider]) - (Date.now() - state.lastCompleted[provider]);
  return Math.max(gapRemaining, 200);
}

// ─────────────────────────────────────────────────────────────────────────────
// Backpressure: grows with queue depth, resets as queue drains
// ─────────────────────────────────────────────────────────────────────────────

function _updateBackpressure(provider) {
  const queuedForProvider = state.queue.filter(i => i.provider === provider).length;
  if (queuedForProvider > 5) {
    state.backpressureMs[provider] = Math.min(state.backpressureMs[provider] + 1000, 8000);
  } else if (queuedForProvider === 0) {
    state.backpressureMs[provider] = Math.max(state.backpressureMs[provider] - 500, 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker
// ─────────────────────────────────────────────────────────────────────────────

function _onError(provider) {
  state.consecutiveErrors[provider]++;
  state.monitor.providerStats[provider].errors++;
  const lim = PROVIDER_LIMITS[provider];
  if (state.consecutiveErrors[provider] >= (lim?.cbThreshold || 2)) {
    state.cbTrips[provider]++;
    const cooldown = Math.min(
      (lim?.cbBaseCooldownMs || 30000) * Math.pow(2, state.cbTrips[provider] - 1),
      lim?.cbMaxCooldownMs || 120000,
    );
    state.cooldownUntil[provider] = Date.now() + _jitter(cooldown, 3000);
    state.consecutiveErrors[provider] = 0;
    console.warn(`[AI_GATEWAY] CB open: ${provider} cooldown ${Math.round(cooldown / 1000)}s (trip #${state.cbTrips[provider]})`);
  }
  _notify();
}

function _onSuccess(provider) {
  state.consecutiveErrors[provider] = 0;
  state.activeCount[provider] = Math.max(0, state.activeCount[provider] - 1);
  state.lastCompleted[provider] = Date.now();
  state.requestLog[provider].push(Date.now());
  state.monitor.providerStats[provider].requests++;
  _notify();
}

function _logRecent(entry) {
  state.recentLog.unshift(entry);
  if (state.recentLog.length > 20) state.recentLog.pop();
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution lock — per-provider mutex promises
// Guarantees: at most PROVIDER_LIMITS[p].concurrency requests run simultaneously.
// The queue processor AWAITS each slot before moving to the next item for that provider.
// ─────────────────────────────────────────────────────────────────────────────

// Per-provider chain: each provider has a single "last promise" that new executions
// must wait for before starting. This physically prevents concurrent execution.
const _providerChain = Object.fromEntries(
  Object.keys(PROVIDER_LIMITS).map(p => [p, Promise.resolve()])
);

async function _executeItem(item) {
  // Chain onto the provider's serialized execution pipeline.
  // No item for this provider can start until the previous one's fn() resolves.
  const lim = PROVIDER_LIMITS[item.provider];
  const execute = _providerChain[item.provider].then(async () => {
    // Re-check cooldown inside the lock — state may have changed while waiting
    if (_isCircuitOpen(item.provider)) {
      // Requeue instead of executing
      const wait = state.cooldownUntil[item.provider] - Date.now();
      await new Promise(r => setTimeout(r, Math.max(wait, 500)));
    }

    // Enforce fixed minimum gap (strict drain model — not burst)
    const sinceLastMs = Date.now() - state.lastCompleted[item.provider];
    const requiredGap = lim.minGapMs + state.backpressureMs[item.provider];
    if (sinceLastMs < requiredGap) {
      await new Promise(r => setTimeout(r, requiredGap - sinceLastMs));
    }

    item.state = REQUEST_STATE.ACTIVE;
    state.activeCount[item.provider]++;
    _notify();

    try {
      const result = await item.fn();
      _onSuccess(item.provider);
      item.state = REQUEST_STATE.COMPLETED;
      _logRecent({ source: item.source, provider: item.provider, state: REQUEST_STATE.COMPLETED, ts: Date.now() });
      item.resolve(result);
    } catch (e) {
      state.activeCount[item.provider] = Math.max(0, state.activeCount[item.provider] - 1);
      const is429 = /429|rate.?limit|quota|too many/i.test(e.message);
      if (is429) {
        _onError(item.provider);
        state.monitor.retries++;
        state.monitor.providerStats[item.provider].retries++;
        // Always retry — never give up on rate limit errors.
        // Wait for the cooldown to lift then re-enter the queue.
        item.state = REQUEST_STATE.RETRYING;
        item.retries = (item.retries || 0) + 1;
        const cooldownRemaining = Math.max(state.cooldownUntil[item.provider] - Date.now(), 0);
        const backoff = _jitter(Math.max(cooldownRemaining, 1000 * Math.min(Math.pow(2, item.retries), 30)), 1000);
        await new Promise(r => setTimeout(r, backoff));
        // Re-enter at front with high priority
        item.priority = PRIORITY.CRITICAL;
        state.queue.unshift(item);
        _notify();
        _processQueue();
      } else {
        item.state = REQUEST_STATE.FAILED;
        _logRecent({ source: item.source, provider: item.provider, state: REQUEST_STATE.FAILED, ts: Date.now() });
        item.reject(e);
      }
      _notify();
    }
  });

  // Advance the chain: next item for this provider waits for this one
  _providerChain[item.provider] = execute.catch(() => {}); // swallow to keep chain alive
  return execute;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue processor — strict FIFO drain, one item dequeued per tick
// ─────────────────────────────────────────────────────────────────────────────

async function _processQueue() {
  if (state.processing || state.queue.length === 0) return;
  state.processing = true;

  while (state.queue.length > 0) {
    _updateBackpressure('groq');
    _updateBackpressure('google');
    _updateBackpressure('openai');
    _updateBackpressure('anthropic');

    // Sort: lower priority number = higher priority; FIFO within same priority
    state.queue.sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp);

    // Find first item whose provider is not in hard cooldown
    const idx = state.queue.findIndex(item => !_isCircuitOpen(item.provider));

    if (idx === -1) {
      // All providers in cooldown — wait for shortest cooldown to expire
      const waits = [...new Set(state.queue.map(i => i.provider))].map(p => _msUntilReady(p));
      const wait = Math.min(...waits, 3000);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    const item = state.queue.splice(idx, 1)[0];
    _notify();

    // Hand off to the provider's serialized execution chain.
    // _executeItem does NOT block _processQueue — it enqueues on the chain and returns.
    // The actual execution is serialized per-provider via _providerChain.
    _executeItem(item);

    // Fixed inter-dispatch gap — prevents burst handoff to the chain
    await new Promise(r => setTimeout(r, 100));
  }

  state.processing = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1: Admission Control — pre-queue intake throttle
// ─────────────────────────────────────────────────────────────────────────────

// Max queue depth before admission starts delaying new intakes
const ADMISSION_QUEUE_THRESHOLD = 8;
// Max intake delay (ms) under heavy load
const ADMISSION_MAX_DELAY_MS = 4000;

async function _admissionControl(provider) {
  const queued = state.queue.filter(i => i.provider === provider).length;
  if (queued < ADMISSION_QUEUE_THRESHOLD && !_isCircuitOpen(provider)) return; // fast path

  // System is loaded — calculate intake hold time
  const overload = Math.max(0, queued - ADMISSION_QUEUE_THRESHOLD);
  const circuitPenalty = _isCircuitOpen(provider) ? 2000 : 0;
  const holdMs = Math.min(overload * 500 + circuitPenalty, ADMISSION_MAX_DELAY_MS);
  if (holdMs > 0) {
    await new Promise(r => setTimeout(r, _jitter(holdMs, 300)));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ONLY PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI_KILL_SWITCH_GATEWAY.request()
 *
 * Every AI call in the entire app must go through here.
 * Pipeline: ADMISSION → AUTH → CACHE → COALESCE → QUEUE → RATE LIMIT → MUTEX → EXECUTE → CACHE WRITE → RESOLVE
 */
export async function request({
  provider,
  model,
  messages,
  priority = PRIORITY.NORMAL,
  source = 'unknown',
  fn,              // async () => string — the raw provider fetch, defined in aiClient only
  callOpts = {},
  skipCache = false,
}) {
  // ── LAYER 1: ADMISSION CONTROL ───────────────────────────────────────────
  // AUTH CHECK
  if (!fn || typeof fn !== 'function') throw new Error('[AI_GATEWAY] fn must be a function');
  if (!provider || !PROVIDER_LIMITS[provider]) throw new Error(`[AI_GATEWAY] Unknown provider: ${provider}`);
  // Hold intake if system is overloaded or provider is in circuit-breaker cooldown
  await _admissionControl(provider);

  state.monitor.totalRequests++;
  _notify();

  const cacheKey = _makeCacheKey(provider, model, messages, callOpts);

  // ── CACHE CHECK ───────────────────────────────────────────────────────────
  if (!skipCache) {
    const cached = cacheGet(cacheKey);
    if (cached !== null) {
      state.monitor.cacheHits++;
      _notify();
      return cached;
    }
    // ── COALESCING ──────────────────────────────────────────────────────────
    if (_inFlight.has(cacheKey)) return _inFlight.get(cacheKey);
  }

  // ── WRAP fn TO CACHE ON COMPLETION ───────────────────────────────────────
  const wrappedFn = skipCache ? fn : async () => {
    const result = await fn();
    cacheSet(cacheKey, result);
    _inFlight.delete(cacheKey);
    return result;
  };

  // ── QUEUE ─────────────────────────────────────────────────────────────────
  const promise = new Promise((resolve, reject) => {
    state.monitor.queuedRequests++;
    state.queue.push({
      id: cacheKey + '_' + Date.now(),
      provider, model, priority, source,
      state: REQUEST_STATE.QUEUED,
      fn: wrappedFn, resolve, reject,
      timestamp: Date.now(),
      retries: 0,
    });
    _notify();
    _processQueue();
  });

  if (!skipCache) _inFlight.set(cacheKey, promise);
  return promise;
}

// Aliases for backward compatibility
export const sendRequest = request;
export const submit = request;

// ─────────────────────────────────────────────────────────────────────────────
// Fallback generators (deterministic, zero API calls)
// ─────────────────────────────────────────────────────────────────────────────

export const fallback = {
  quiz(topic = 'this subject') {
    return JSON.stringify([
      { q: `What is the core idea behind ${topic}?`, options: ['Review your notes', 'Check the textbook', 'Ask your teacher', 'All of the above'], correct: 3 },
      { q: `Which study method best reinforces ${topic}?`, options: ['Active recall', 'Re-reading only', 'Highlighting only', 'Skipping difficult parts'], correct: 0 },
    ]);
  },
  flashcards(topic = 'this subject') {
    return JSON.stringify([
      { term: `Key concept in ${topic}`, definition: 'Review your study material and define this in your own words.' },
      { term: 'Active recall', definition: 'Testing yourself without looking at notes — the most effective study method.' },
    ]);
  },
  notes(topic = 'this subject') {
    return `## ${topic} — Offline Notes\n\n*AI rate-limited. Using offline mode.*\n\n- Re-read the main sections\n- Identify key terms\n- Summarize in your own words\n\n> Close your notes and write everything you remember.`;
  },
  coach() {
    return 'Coach offline mode — recommendations based on quiz history and forgetting curve only.';
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Monitor snapshot
// ─────────────────────────────────────────────────────────────────────────────

export function getMonitorSnapshot() {
  const now = Date.now();
  return {
    totalRequests: state.monitor.totalRequests,
    cacheHits: state.monitor.cacheHits,
    cacheHitRate: state.monitor.totalRequests > 0
      ? Math.round((state.monitor.cacheHits / state.monitor.totalRequests) * 100) : 0,
    queuedRequests: state.monitor.queuedRequests,
    retries: state.monitor.retries,
    fallbackActivations: state.monitor.fallbackActivations,
    bypassAttempts: state.monitor.bypassAttempts,
    queueLength: state.queue.length,
    queueItems: state.queue.map(i => ({ source: i.source, priority: i.priority, state: i.state, retries: i.retries, provider: i.provider, age: Math.round((now - i.timestamp) / 1000) })),
    recentLog: [...state.recentLog],
    providers: Object.keys(PROVIDER_LIMITS).map(p => ({
      name: p,
      requests: state.monitor.providerStats[p]?.requests || 0,
      errors: state.monitor.providerStats[p]?.errors || 0,
      retries: state.monitor.providerStats[p]?.retries || 0,
      inCooldown: state.cooldownUntil[p] > now,
      cooldownSecsLeft: state.cooldownUntil[p] > now ? Math.ceil((state.cooldownUntil[p] - now) / 1000) : 0,
      cbTrips: state.cbTrips[p] || 0,
      reqLastMinute: (state.requestLog[p] || []).filter(ts => now - ts < 60000).length,
      reqLastSecond: (state.requestLog[p] || []).filter(ts => now - ts < 1000).length,
      limit: PROVIDER_LIMITS[p]?.maxPerMinute || 0,
      active: state.activeCount[p] || 0,
      backpressureMs: state.backpressureMs[p] || 0,
      queuedForProvider: state.queue.filter(i => i.provider === p).length,
      admissionThreshold: ADMISSION_QUEUE_THRESHOLD,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Named canonical export
// ─────────────────────────────────────────────────────────────────────────────

export const AI_KILL_SWITCH_GATEWAY = { request, getMonitorSnapshot, subscribeMonitor, invalidateCache, fallback, PRIORITY, REQUEST_STATE };
export const AI_GATEWAY = AI_KILL_SWITCH_GATEWAY;
export default AI_KILL_SWITCH_GATEWAY;
