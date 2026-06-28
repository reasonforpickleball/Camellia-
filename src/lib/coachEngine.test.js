/**
 * Unit tests for Coach Engine — mastery formula & SM-2 logic.
 * Run in browser console or Node by importing the pure functions.
 *
 * Usage: import and call runCoachTests() — returns { passed, failed, results }
 */

import { _computeMastery, _applyReview, _clamp } from './coachEngine';

// Tiny test harness (no external deps)
function test(name, fn) {
  try {
    fn();
    return { name, ok: true, msg: 'passed' };
  } catch (e) {
    return { name, ok: false, msg: e.message };
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function approxEqual(a, b, tol = 1) {
  assert(Math.abs(a - b) <= tol, `Expected ~${b}, got ${a}`);
}

// ── Mastery formula tests ───────────────────────────────────────────────────

const masteryTests = [
  test('Mastery: perfect accuracy, reviewed today → ~100', () => {
    const topic = { correctCount: 10, totalCount: 10, errorRate: 0, lastReviewed: Date.now(), halfLife: 10 };
    approxEqual(_computeMastery(topic), 100, 2);
  }),

  test('Mastery: perfect accuracy, 10 days ago (half-life=10) → ~50', () => {
    const topic = { correctCount: 10, totalCount: 10, errorRate: 0, lastReviewed: Date.now() - 10 * 86400000, halfLife: 10 };
    approxEqual(_computeMastery(topic), 50, 5);
  }),

  test('Mastery: 50% accuracy, reviewed today → 50', () => {
    const topic = { correctCount: 5, totalCount: 10, errorRate: 0, lastReviewed: Date.now(), halfLife: 10 };
    approxEqual(_computeMastery(topic), 50, 2);
  }),

  test('Mastery: high error rate penalizes score', () => {
    const topic = { correctCount: 10, totalCount: 10, errorRate: 0.5, lastReviewed: Date.now(), halfLife: 10 };
    const score = _computeMastery(topic);
    assert(score < 80, `Expected score < 80, got ${score}`);
  }),

  test('Mastery: never reviewed → 0 (no answers)', () => {
    const topic = { correctCount: 0, totalCount: 0, errorRate: 0, lastReviewed: null, halfLife: 10 };
    approxEqual(_computeMastery(topic), 0, 1);
  }),

  test('Mastery: clamped to [0, 100]', () => {
    const topic = { correctCount: 100, totalCount: 100, errorRate: 0, lastReviewed: Date.now(), halfLife: 10 };
    const score = _computeMastery(topic);
    assert(score >= 0 && score <= 100, `Score out of range: ${score}`);
  }),
];

// ── SM-2 interval tests ─────────────────────────────────────────────────────

// We test applyReview by calling it with a mock record & checking intervals.
// We patch the global localStorage with a minimal mock for testing.
function withMockStorage(fn) {
  const store = {};
  const orig = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: k => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: k => { delete store[k]; },
  };
  try { return fn(store); } finally { globalThis.localStorage = orig; }
}

const sm2Tests = [
  test('SM-2: quality < 3 → reset repetition=0, interval=1', () => {
    withMockStorage(() => {
      const record = _applyReview('topic1', 2);
      assert(record.repetition === 0, `repetition should be 0, got ${record.repetition}`);
      assert(record.intervalDays === 1, `interval should be 1, got ${record.intervalDays}`);
    });
  }),

  test('SM-2: quality=5, first review → interval=1, rep=1', () => {
    withMockStorage(() => {
      const record = _applyReview('topic2', 5);
      assert(record.repetition === 1, `rep should be 1, got ${record.repetition}`);
      assert(record.intervalDays === 1, `interval should be 1, got ${record.intervalDays}`);
    });
  }),

  test('SM-2: quality=5, second review → interval=6, rep=2', () => {
    withMockStorage(store => {
      // Pre-populate a rep=1 record
      const db = { topics: [], reviews: [{ reviewId: 'rev_t3', topicId: 'topic3', intervalDays: 1, nextReview: Date.now(), easiness: 2.5, repetition: 1 }], events: [] };
      store['camellia_coach_db'] = JSON.stringify(db);
      const record = _applyReview('topic3', 5);
      assert(record.repetition === 2, `rep should be 2, got ${record.repetition}`);
      assert(record.intervalDays === 6, `interval should be 6, got ${record.intervalDays}`);
    });
  }),

  test('SM-2: quality=5, third review → interval = round(6 * easiness)', () => {
    withMockStorage(store => {
      const db = { topics: [], reviews: [{ reviewId: 'rev_t4', topicId: 'topic4', intervalDays: 6, nextReview: Date.now(), easiness: 2.5, repetition: 2 }], events: [] };
      store['camellia_coach_db'] = JSON.stringify(db);
      const record = _applyReview('topic4', 5);
      assert(record.repetition === 3, `rep should be 3, got ${record.repetition}`);
      assert(record.intervalDays === 15, `interval should be 15 (6*2.5), got ${record.intervalDays}`);
    });
  }),

  test('SM-2: quality=3 → easiness stays >= 1.3', () => {
    withMockStorage(store => {
      const db = { topics: [], reviews: [{ reviewId: 'rev_t5', topicId: 'topic5', intervalDays: 6, nextReview: Date.now(), easiness: 1.31, repetition: 2 }], events: [] };
      store['camellia_coach_db'] = JSON.stringify(db);
      const record = _applyReview('topic5', 3);
      assert(record.easiness >= 1.3, `easiness should be >= 1.3, got ${record.easiness}`);
    });
  }),

  test('SM-2: quality=5 increases easiness', () => {
    withMockStorage(store => {
      const db = { topics: [], reviews: [{ reviewId: 'rev_t6', topicId: 'topic6', intervalDays: 1, nextReview: Date.now(), easiness: 2.5, repetition: 1 }], events: [] };
      store['camellia_coach_db'] = JSON.stringify(db);
      const record = _applyReview('topic6', 5);
      assert(record.easiness > 2.5, `easiness should increase, got ${record.easiness}`);
    });
  }),

  test('SM-2: quality=0 → reset regardless of previous state', () => {
    withMockStorage(store => {
      const db = { topics: [], reviews: [{ reviewId: 'rev_t7', topicId: 'topic7', intervalDays: 30, nextReview: Date.now(), easiness: 2.8, repetition: 5 }], events: [] };
      store['camellia_coach_db'] = JSON.stringify(db);
      const record = _applyReview('topic7', 0);
      assert(record.repetition === 0, `should reset rep to 0, got ${record.repetition}`);
      assert(record.intervalDays === 1, `should reset interval to 1, got ${record.intervalDays}`);
    });
  }),
];

// ── clamp tests ──────────────────────────────────────────────────────────────

const clampTests = [
  test('clamp: value in range', () => { assert(_clamp(50, 0, 100) === 50); }),
  test('clamp: value below min', () => { assert(_clamp(-5, 0, 100) === 0); }),
  test('clamp: value above max', () => { assert(_clamp(150, 0, 100) === 100); }),
];

// ── Runner ───────────────────────────────────────────────────────────────────

export function runCoachTests() {
  const all = [...masteryTests, ...sm2Tests, ...clampTests];
  const passed = all.filter(r => r.ok).length;
  const failed = all.filter(r => !r.ok).length;
  console.group(`Coach Engine Tests: ${passed}/${all.length} passed`);
  all.forEach(r => {
    if (r.ok) console.log(`  ✓ ${r.name}`);
    else console.error(`  ✗ ${r.name}: ${r.msg}`);
  });
  console.groupEnd();
  return { passed, failed, results: all };
}
