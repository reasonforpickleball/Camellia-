/**
 * Coach Engine v2 — deterministic, local-first, no LLM.
 *
 * Key upgrades over v1:
 *  1. Explanation trace: every task carries a full score breakdown
 *  2. Conflict resolution: strict priority hierarchy (exam > weakness > decay > engagement)
 *  3. Feedback loop: tracks task completions + quiz deltas, adjusts signal weights
 *  4. Daily plan constraints: max 5 tasks, 120 min cap, no overload unless exam < 7d
 *  5. Adaptive difficulty shaping: recommends mode based on mastery band
 *  6. Cached mastery: only recomputed when underlying data changes
 *  7. Edge-case hardened: zero history, single subject, contradictory signals, stale dates
 */

const STORE_KEY = 'camellia_coach_db';
const CACHE_KEY = 'camellia_coach_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Helpers ─────────────────────────────────────────────────────────────────

export function _clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function daysSince(ts) {
  if (!ts) return 999;
  return (Date.now() - ts) / 86400000;
}

function daysUntil(ts) {
  if (!ts) return null;
  return (ts - Date.now()) / 86400000;
}

function addDays(ts, days) {
  return ts + days * 86400000;
}

// ── Persistence ──────────────────────────────────────────────────────────────

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const db = raw ? JSON.parse(raw) : {};
    return {
      topics: db.topics || [],
      reviews: db.reviews || [],
      events: db.events || [],
      // v2: feedback loop weights per subject
      weights: db.weights || {},
      // v2: past quiz snapshots for delta detection
      quizSnapshots: db.quizSnapshots || {},
    };
  } catch {
    return { topics: [], reviews: [], events: [], weights: {}, quizSnapshots: {} };
  }
}

function saveDB(db) {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

export function getDB() { return loadDB(); }

// ── Mastery cache ────────────────────────────────────────────────────────────

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}

function setCache(key, value) {
  const c = getCache();
  c[key] = { value, ts: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

function getCachedMastery(ns) {
  const c = getCache();
  const entry = c[`mastery_${ns}`];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.value;
}

function invalidateMastery(ns) {
  const c = getCache();
  delete c[`mastery_${ns}`];
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

// ── Namespace discovery ──────────────────────────────────────────────────────

function getStudyNamespaces() {
  const ns = ['default'];
  try {
    const topics = JSON.parse(localStorage.getItem('doomium_topics') || '[]');
    topics.forEach(t => { if (t && !ns.includes(t)) ns.push(t); });
  } catch {}
  return ns;
}

function tk(ns, key) {
  return `camellia_${ns}_${key}`;
}

// ── Exam date parsing ────────────────────────────────────────────────────────

function parseExamDateFromGoal(goal) {
  if (!goal) return null;

  // "N days" / "in N days" / "N days until exam"
  const dayMatch = goal.match(/(?:in\s+)?(\d+)\s*days?\s*(?:until|before|left|to\s*(?:the\s*)?exam)?/i)
    || goal.match(/(?:until|in)\s*(\d+)\s*days?/i);
  if (dayMatch) {
    const n = parseInt(dayMatch[1]);
    if (n > 0 && n < 365) return Date.now() + n * 86400000;
  }

  // Calendar date
  try {
    const parsed = new Date(goal);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) return parsed.getTime();
  } catch {}

  return null;
}

// Validate exam date — reject stale dates (past or > 2 years out)
function validateExamDate(ts) {
  if (!ts) return null;
  const now = Date.now();
  if (ts < now - 86400000) return null; // yesterday or older = stale
  if (ts > now + 730 * 86400000) return null; // > 2 years = probably garbage
  return ts;
}

// ── Performance data readers ─────────────────────────────────────────────────

function getQuizPerformance(ns) {
  try {
    const recent = JSON.parse(localStorage.getItem(tk(ns, 'recent_quizzes')) || '[]');
    if (!recent.length) return { accuracy: null, quizCount: 0, avgScore: null, trend: 'none', recent3Avg: null };

    const scores = recent.slice(0, 10).map(q => q.total > 0 ? (q.score / q.total) * 100 : 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Trend: compare last 3 vs previous 3
    let trend = 'none';
    if (scores.length >= 4) {
      const recentHalf = scores.slice(0, Math.min(3, scores.length));
      const olderHalf = scores.slice(Math.min(3, scores.length));
      const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
      if (recentAvg - olderAvg > 8) trend = 'improving';
      else if (olderAvg - recentAvg > 8) trend = 'declining';
      else trend = 'stable';
    }

    const recent3 = scores.slice(0, 3);
    const recent3Avg = recent3.length ? Math.round(recent3.reduce((a, b) => a + b, 0) / recent3.length) : null;

    return { accuracy: Math.round(avg), quizCount: recent.length, avgScore: Math.round(avg), trend, recent3Avg };
  } catch {
    return { accuracy: null, quizCount: 0, avgScore: null, trend: 'none', recent3Avg: null };
  }
}

function getYuccaPerformance(ns) {
  try {
    const stats = JSON.parse(localStorage.getItem(tk(ns, 'yucca_stats')) || 'null');
    if (!stats) return { masteryAvg: null, gamesPlayed: 0, masteryPct: null };
    const modes = ['blitz', 'sprint', 'mile'];
    const played = modes.reduce((s, m) => s + (stats[m]?.played || 0), 0);
    if (played === 0) return { masteryAvg: null, gamesPlayed: 0, masteryPct: null };
    const masterySum = modes.reduce((s, m) => s + (stats[m]?.mastery || 0), 0);
    const masteryAvg = masterySum / modes.length; // 0-10
    return { masteryAvg, gamesPlayed: played, masteryPct: Math.round((masteryAvg / 10) * 100) };
  } catch {
    return { masteryAvg: null, gamesPlayed: 0, masteryPct: null };
  }
}

// ── Feedback-loop weights ────────────────────────────────────────────────────
// Per-subject adaptive weights for quiz vs yucca signal.
// Starts at default and nudges when outcomes diverge from predictions.

const DEFAULT_WEIGHTS = { quiz: 0.6, yucca: 0.4 };

function getWeights(ns) {
  const db = loadDB();
  return db.weights[ns] || { ...DEFAULT_WEIGHTS };
}

function updateWeights(ns, quizDelta, yuccaDelta) {
  // If quiz improved significantly but yucca didn't track it, reduce yucca weight slightly
  const db = loadDB();
  const w = db.weights[ns] || { ...DEFAULT_WEIGHTS };
  if (Math.abs(quizDelta) > 10 && Math.abs(yuccaDelta) < 1) {
    w.quiz = _clamp(w.quiz + 0.05, 0.3, 0.85);
    w.yucca = 1 - w.quiz;
  } else if (Math.abs(yuccaDelta) > 1 && Math.abs(quizDelta) < 5) {
    w.yucca = _clamp(w.yucca + 0.05, 0.15, 0.7);
    w.quiz = 1 - w.yucca;
  }
  db.weights[ns] = w;
  saveDB(db);
}

// ── Combined performance score ────────────────────────────────────────────────

function computePerformanceScore(ns, weights) {
  const quiz = getQuizPerformance(ns);
  const yucca = getYuccaPerformance(ns);
  const w = weights || getWeights(ns);

  const parts = [];
  if (quiz.avgScore !== null) parts.push({ val: quiz.avgScore, w: w.quiz });
  if (yucca.masteryPct !== null) parts.push({ val: yucca.masteryPct, w: w.yucca });

  if (parts.length === 0) return null;
  const totalW = parts.reduce((s, p) => s + p.w, 0);
  return Math.round(parts.reduce((s, p) => s + p.val * p.w, 0) / totalW);
}

// ── Build subjects from planner sessions ─────────────────────────────────────

export function buildSubjectsFromSessions() {
  const namespaces = getStudyNamespaces();
  const subjects = [];
  const db = loadDB();

  for (const ns of namespaces) {
    const hasMaterial = !!(
      localStorage.getItem(tk(ns, 'raw_material')) ||
      localStorage.getItem(tk(ns, 'planner_filename')) ||
      localStorage.getItem(tk(ns, 'recent_quizzes')) ||
      localStorage.getItem(tk(ns, 'ai_questions')) ||
      localStorage.getItem(tk(ns, 'flashcard_deck'))
    );
    if (!hasMaterial) continue;

    const goal = localStorage.getItem(tk(ns, 'planner_goal')) || '';
    const filename = localStorage.getItem(tk(ns, 'planner_filename')) || '';
    const name = ns === 'default'
      ? (filename.replace(/\.[^.]+$/, '') || 'Main Subject')
      : ns;

    const rawExamDate = parseExamDateFromGoal(goal);
    const examDate = validateExamDate(rawExamDate);

    const weights = getWeights(ns);
    const perfScore = computePerformanceScore(ns, weights);
    const quizData = getQuizPerformance(ns);
    const yuccaData = getYuccaPerformance(ns);

    const topicRecord = db.topics.find(t => t.topicId === ns);
    const reviewRecord = db.reviews.find(r => r.topicId === ns);
    const lastReviewed = topicRecord?.lastReviewed || reviewRecord?.lastReviewed || null;
    const halfLife = topicRecord?.halfLife || 10;

    subjects.push({
      ns,
      name,
      goal,
      examDate,
      examDateStale: rawExamDate !== null && examDate === null, // flag stale
      perfScore,
      quizAccuracy: quizData.accuracy,
      quizCount: quizData.quizCount,
      quizTrend: quizData.trend,
      recent3Avg: quizData.recent3Avg,
      yuccaMastery: yuccaData.masteryAvg,
      yuccaMasteryPct: yuccaData.masteryPct,
      yuccaGames: yuccaData.gamesPlayed,
      lastReviewed,
      halfLife,
      correctCount: topicRecord?.correctCount || 0,
      totalCount: topicRecord?.totalCount || 0,
      errorRate: topicRecord?.errorRate || 0,
    });
  }

  return subjects;
}

// ── Mastery formula (Ebbinghaus + quiz + yucca + error penalty) ──────────────

export function _computeMastery(topic) {
  // Use cache if available
  const cached = getCachedMastery(topic.ns);
  if (cached !== null) return cached;

  const days = daysSince(topic.lastReviewed);
  const halfLife = topic.halfLife || 10;
  const recallDecay = Math.exp(-days / halfLife);

  // Base score: prefer live quiz+yucca blend, fall back to completion record
  let baseScore;
  if (topic.perfScore !== null && topic.perfScore !== undefined) {
    baseScore = topic.perfScore;
  } else if (topic.totalCount > 0) {
    baseScore = (topic.correctCount / topic.totalCount) * 100;
  } else {
    // Zero history: start neutral-low so coach still offers tasks
    baseScore = 35;
  }

  const errorPenalty = (topic.errorRate || 0) * 50;
  const mastery = _clamp(baseScore * recallDecay - errorPenalty, 0, 100);

  setCache(`mastery_${topic.ns}`, mastery);
  return mastery;
}

export function computeMastery(topic) {
  return _computeMastery(topic);
}

// ── Score breakdown (explanation trace) ─────────────────────────────────────
// Returns a structured breakdown showing exactly why a subject got its priority.

export function computeScoreBreakdown(subject) {
  const mastery = _computeMastery(subject);
  const days = Math.min(daysSince(subject.lastReviewed), 30);
  const du = daysUntil(subject.examDate);

  // ── Signal scores (each contributes to final priority, higher = more urgent) ──

  // 1. Quiz weakness signal: low accuracy → high urgency
  const quizScore = subject.quizAccuracy !== null
    ? _clamp(100 - subject.quizAccuracy, 0, 100)
    : 30; // no data → assume moderate
  const quizWeight = subject.quizCount > 0 ? 25 : 10;

  // 2. Forgetting curve: days since last review
  const decayScore = _clamp((days / 30) * 100, 0, 100);
  const decayWeight = 20;

  // 3. Low Yucca mastery signal
  const yuccaScore = subject.yuccaMasteryPct !== null
    ? _clamp(100 - subject.yuccaMasteryPct, 0, 100)
    : 20;
  const yuccaWeight = subject.yuccaGames > 0 ? 20 : 5;

  // 4. Exam proximity (hard override — most weight if exam soon)
  let examScore = 0;
  let examWeight = 0;
  let examOverride = false;
  if (du !== null && du >= 0) {
    if (du <= 2) { examScore = 100; examWeight = 50; examOverride = true; }
    else if (du <= 7) { examScore = _clamp((1 - du / 7) * 100, 0, 100); examWeight = 40; examOverride = du <= 3; }
    else if (du <= 30) { examScore = _clamp((1 - du / 30) * 50, 0, 50); examWeight = 25; }
  }

  // 5. Engagement gap: hasn't been touched in a while
  const engagementScore = subject.quizCount === 0 && subject.yuccaGames === 0
    ? 40 : 0;
  const engagementWeight = 10;

  const totalWeight = quizWeight + decayWeight + yuccaWeight + examWeight + engagementWeight;
  const rawPriority = (
    quizScore * quizWeight +
    decayScore * decayWeight +
    yuccaScore * yuccaWeight +
    examScore * examWeight +
    engagementScore * engagementWeight
  ) / totalWeight;

  // Conflict resolution: if exam override, clamp minimum priority to 70
  const finalPriority = examOverride
    ? Math.max(rawPriority, 70)
    : rawPriority;

  // Contradiction detection: high quiz but low yucca or vice versa
  const contradiction = subject.quizAccuracy !== null && subject.yuccaMasteryPct !== null
    && Math.abs(subject.quizAccuracy - subject.yuccaMasteryPct) > 30;

  const breakdown = {
    mastery: Math.round(mastery),
    priority: Math.round(finalPriority),
    examOverride,
    contradiction,
    signals: [
      {
        label: 'Quiz accuracy',
        value: subject.quizAccuracy !== null ? `${subject.quizAccuracy}%` : 'No data',
        contribution: Math.round(quizScore * quizWeight / totalWeight),
        direction: quizScore > 50 ? 'negative' : 'positive',
        detail: subject.quizCount > 0
          ? `${subject.quizCount} quiz${subject.quizCount !== 1 ? 'zes' : ''} taken${subject.quizTrend !== 'none' ? `, trend: ${subject.quizTrend}` : ''}`
          : 'No quizzes taken yet',
      },
      {
        label: 'Forgetting curve',
        value: days >= 999 ? 'Never reviewed' : `${Math.round(days)}d since review`,
        contribution: Math.round(decayScore * decayWeight / totalWeight),
        direction: days > 7 ? 'negative' : 'positive',
        detail: `Ebbinghaus half-life: ${subject.halfLife}d`,
      },
      {
        label: 'Yucca mastery',
        value: subject.yuccaMasteryPct !== null ? `${subject.yuccaMasteryPct}%` : 'No data',
        contribution: Math.round(yuccaScore * yuccaWeight / totalWeight),
        direction: yuccaScore > 50 ? 'negative' : 'positive',
        detail: subject.yuccaGames > 0 ? `${subject.yuccaGames} game${subject.yuccaGames !== 1 ? 's' : ''} played` : 'No Yucca sessions yet',
      },
      ...(du !== null && du >= 0 ? [{
        label: 'Exam proximity',
        value: du <= 1 ? `${Math.round(du * 24)}h` : `${Math.round(du)}d`,
        contribution: Math.round(examScore * examWeight / totalWeight),
        direction: 'negative',
        detail: examOverride ? 'HARD OVERRIDE — exam is imminent' : 'Exam approaching',
      }] : []),
      ...(engagementScore > 0 ? [{
        label: 'Engagement gap',
        value: 'No activity recorded',
        contribution: Math.round(engagementScore * engagementWeight / totalWeight),
        direction: 'negative',
        detail: 'No quizzes or Yucca sessions',
      }] : []),
    ],
  };

  return breakdown;
}

// ── Adaptive difficulty shaping ───────────────────────────────────────────────

function getRecommendedMode(mastery) {
  if (mastery < 50) return { mode: 'guided', label: 'Guided Recall', desc: 'Focus on understanding — re-read notes, then summarize in your own words.' };
  if (mastery < 75) return { mode: 'recall', label: 'Active Recall Quiz', desc: 'Take a quiz without looking at notes first. Aim for 70%+.' };
  return { mode: 'simulation', label: 'Exam Simulation', desc: 'Mixed questions under time pressure. Treat it like the real exam.' };
}

// ── Priority scoring (uses breakdown to avoid recomputation) ─────────────────

function computePriority(subject) {
  const breakdown = computeScoreBreakdown(subject);
  return breakdown.priority;
}

// ── Daily plan generator ──────────────────────────────────────────────────────

const MAX_TASKS = 5;
const DEFAULT_TIME_CAP_MIN = 120;
const EXAM_OVERRIDE_TIME_CAP_MIN = 180;

export function generateDailyPlan(subjects) {
  if (!subjects || subjects.length === 0) return [];

  // Score all subjects
  const scored = subjects.map(s => {
    const breakdown = computeScoreBreakdown(s);
    return { ...s, breakdown, priority: breakdown.priority, masteryScore: breakdown.mastery };
  });

  // Conflict resolution hierarchy:
  // 1. Exam in ≤2 days → force to top
  // 2. Sort by priority score
  const examImminent = scored.filter(s => {
    const du = daysUntil(s.examDate);
    return du !== null && du >= 0 && du <= 2;
  });
  const rest = scored
    .filter(s => !examImminent.includes(s))
    .sort((a, b) => b.priority - a.priority);

  const ordered = [...examImminent, ...rest];

  // Has any imminent exam?
  const hasImminentExam = examImminent.length > 0;
  const timeCap = hasImminentExam ? EXAM_OVERRIDE_TIME_CAP_MIN : DEFAULT_TIME_CAP_MIN;

  const tasks = [];
  let totalMin = 0;

  for (const s of ordered) {
    if (tasks.length >= MAX_TASKS) break;
    if (totalMin >= timeCap) break;

    // Skip subjects that are well mastered AND no upcoming exam
    const du = daysUntil(s.examDate);
    const examSoon = du !== null && du >= 0 && du <= 7;
    if (s.masteryScore >= 85 && !examSoon) continue;

    // Determine time allocation
    let time = 30;
    if (examSoon && du <= 2) time = 60;
    else if (examSoon && du <= 7) time = 45;
    else if (s.masteryScore < 30) time = 45;
    else if (s.masteryScore >= 70) time = 20;

    // Don't exceed cap
    if (totalMin + time > timeCap) {
      time = timeCap - totalMin;
      if (time < 10) break;
    }

    // No subject overload unless exam < 7d
    if (!examSoon && tasks.some(t => t.topicId === s.ns)) continue;

    const mode = getRecommendedMode(s.masteryScore);
    const reason = buildReason(s, du);

    tasks.push({
      topicId: s.ns,
      topicName: s.name,
      ns: s.ns,
      masteryScore: s.masteryScore,
      examDate: s.examDate,
      examDateStale: s.examDateStale,
      time: `${time} min`,
      timeMin: time,
      reason,
      quizAccuracy: s.quizAccuracy,
      quizCount: s.quizCount,
      quizTrend: s.quizTrend,
      yuccaMastery: s.yuccaMastery,
      yuccaMasteryPct: s.yuccaMasteryPct,
      breakdown: s.breakdown,
      recommendedMode: mode,
      contradiction: s.breakdown.contradiction,
    });

    totalMin += time;
  }

  return tasks;
}

function buildReason(s, du) {
  const parts = [];
  if (s.quizAccuracy !== null && s.quizAccuracy < 60) parts.push(`Quiz avg ${s.quizAccuracy}% — below threshold`);
  if (s.yuccaMasteryPct !== null && s.yuccaMasteryPct < 50) parts.push(`Yucca mastery ${s.yuccaMasteryPct}% — low`);
  const ds = Math.round(daysSince(s.lastReviewed));
  if (ds > 7 && ds < 999) parts.push(`${ds} days since last review`);
  if (s.masteryScore < 50) parts.push(`Mastery at ${s.masteryScore}%`);
  if (du !== null && du >= 0 && du < 14) parts.push(`Exam in ${Math.round(du)} day${Math.round(du) !== 1 ? 's' : ''}`);
  if (s.breakdown.contradiction) parts.push(`Conflicting signals — quiz and Yucca diverge`);
  if (parts.length === 0) parts.push(`Mastery ${s.masteryScore}% — due for review`);
  return parts.join('. ') + '.';
}

// ── Predicted exam readiness ─────────────────────────────────────────────────
// Returns a plain-language predicted grade range, not a fake precise number.

export function predictExamReadiness(subject) {
  const mastery = _computeMastery(subject);
  const du = daysUntil(subject.examDate);
  const daysLeft = du !== null && du >= 0 ? du : null;

  // Adjust for study time remaining (rough projection)
  let projectedMastery = mastery;
  if (daysLeft !== null && daysLeft > 0) {
    // Assume ~2% mastery gain per additional study day, capped
    projectedMastery = _clamp(mastery + daysLeft * 1.5, 0, 95);
  }

  const quizTrend = subject.quizTrend;
  if (quizTrend === 'declining') projectedMastery = _clamp(projectedMastery - 8, 0, 95);
  if (quizTrend === 'improving') projectedMastery = _clamp(projectedMastery + 5, 0, 95);

  if (projectedMastery >= 85) return { label: 'A / A−', band: 'high', confidence: 'moderate' };
  if (projectedMastery >= 70) return { label: 'B+ / B', band: 'mid-high', confidence: 'moderate' };
  if (projectedMastery >= 55) return { label: 'B− / C+', band: 'mid', confidence: 'low' };
  if (projectedMastery >= 40) return { label: 'C / C−', band: 'low-mid', confidence: 'low' };
  return { label: 'D or below', band: 'low', confidence: 'low' };
}

// ── Weakest pattern detection ─────────────────────────────────────────────────

export function getWeakestPattern(subject) {
  const patterns = [];
  if (subject.quizTrend === 'declining') patterns.push('Scores dropping over recent sessions');
  if (subject.quizAccuracy !== null && subject.quizAccuracy < 50) patterns.push('Consistently low quiz accuracy');
  if (subject.yuccaMasteryPct !== null && subject.yuccaMasteryPct < 40) patterns.push('Low performance under time pressure (Yucca)');
  const ds = daysSince(subject.lastReviewed);
  if (ds > 14 && ds < 999) patterns.push('Long gaps between review sessions');
  if (subject.breakdown?.contradiction) patterns.push('Inconsistent across quiz types — may be guessing on MC');
  if (patterns.length === 0) return null;
  return patterns[0]; // most prominent
}

// ── Subject readiness aggregate ───────────────────────────────────────────────

export function getSubjectReadiness(subjects) {
  return subjects.map(s => ({
    subject: s.name,
    avg: Math.round(_computeMastery(s)),
    examDate: s.examDate,
    quizAccuracy: s.quizAccuracy,
    yuccaMasteryPct: s.yuccaMasteryPct,
    quizTrend: s.quizTrend,
    readiness: predictExamReadiness(s),
    weakestPattern: getWeakestPattern(s),
  })).sort((a, b) => b.avg - a.avg);
}

// ── SM-2 Spaced Repetition ───────────────────────────────────────────────────

export function getReview(topicId) {
  const db = loadDB();
  return db.reviews.find(r => r.topicId === topicId) || {
    reviewId: `rev_${topicId}`,
    topicId,
    intervalDays: 1,
    nextReview: Date.now(),
    easiness: 2.5,
    repetition: 0,
  };
}

export function _applyReview(topicId, quality) {
  const db = loadDB();
  let record = db.reviews.find(r => r.topicId === topicId);
  if (!record) {
    record = { reviewId: `rev_${topicId}`, topicId, intervalDays: 1, nextReview: Date.now(), easiness: 2.5, repetition: 0 };
    db.reviews.push(record);
  }

  if (quality < 3) {
    record.repetition = 0;
    record.intervalDays = 1;
  } else {
    record.repetition += 1;
    if (record.repetition === 1) record.intervalDays = 1;
    else if (record.repetition === 2) record.intervalDays = 6;
    else record.intervalDays = Math.round(record.intervalDays * record.easiness);
    record.easiness += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    if (record.easiness < 1.3) record.easiness = 1.3;
  }
  record.nextReview = addDays(Date.now(), record.intervalDays);
  record.lastReviewed = Date.now();
  saveDB(db);
  return record;
}

export function applyReview(topicId, quality) {
  return _applyReview(topicId, quality);
}

// ── Feedback loop: record task completion + detect quiz improvement ────────────

export function recordTaskComplete(topicId, quality = 4) {
  const db = loadDB();
  let topic = db.topics.find(t => t.topicId === topicId);
  if (!topic) {
    topic = { topicId, lastReviewed: null, correctCount: 0, totalCount: 0, halfLife: 10, errorRate: 0 };
    db.topics.push(topic);
  }

  // Snapshot current quiz score before marking done
  const quizData = getQuizPerformance(topicId);
  const prevSnapshot = db.quizSnapshots[topicId] || null;
  const quizDelta = prevSnapshot && quizData.accuracy !== null
    ? quizData.accuracy - prevSnapshot
    : 0;
  db.quizSnapshots[topicId] = quizData.accuracy;

  const yuccaData = getYuccaPerformance(topicId);
  const prevYuccaSnapshot = db.quizSnapshots[`yucca_${topicId}`] || null;
  const yuccaDelta = prevYuccaSnapshot && yuccaData.masteryPct !== null
    ? yuccaData.masteryPct - prevYuccaSnapshot
    : 0;
  db.quizSnapshots[`yucca_${topicId}`] = yuccaData.masteryPct;

  topic.lastReviewed = Date.now();
  topic.correctCount = (topic.correctCount || 0) + (quality >= 3 ? 1 : 0);
  topic.totalCount = (topic.totalCount || 0) + 1;

  // Adjust half-life based on performance trend
  if (quality >= 4 && quizDelta > 5) topic.halfLife = Math.min(topic.halfLife + 1, 21);
  if (quality <= 2 || quizDelta < -5) topic.halfLife = Math.max(topic.halfLife - 1, 3);

  saveDB(db);

  // Adjust signal weights if quiz and yucca diverged
  if (quizDelta !== 0 || yuccaDelta !== 0) {
    updateWeights(topicId, quizDelta, yuccaDelta);
  }

  invalidateMastery(topicId);
  _applyReview(topicId, quality);
  logEvent('taskCompleted', { topicId, quality, quizDelta, yuccaDelta });
}

// ── Day-1 diagnostic: does coach work with zero history? ────────────────────
// Returns a "starter" task for subjects with no data at all.

export function getDiagnosticTasks(subjects) {
  return subjects
    .filter(s => s.quizCount === 0 && s.yuccaGames === 0)
    .slice(0, 2)
    .map(s => ({
      topicId: s.ns,
      topicName: s.name,
      ns: s.ns,
      masteryScore: 35,
      time: '20 min',
      timeMin: 20,
      reason: 'No quiz or Yucca data yet. Take a diagnostic quiz to calibrate your study plan.',
      isDiagnostic: true,
      recommendedMode: { mode: 'guided', label: 'Diagnostic', desc: 'Run a quick quiz to calibrate your plan.' },
      breakdown: null,
    }));
}

// ── Analytics / events ───────────────────────────────────────────────────────

export function logEvent(type, payload) {
  const db = loadDB();
  db.events = db.events || [];
  db.events.push({
    eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    type,
    payload,
  });
  if (db.events.length > 2000) db.events = db.events.slice(-2000);
  saveDB(db);
}

// ── Export / Import ───────────────────────────────────────────────────────────

export function exportCoachData() {
  const db = loadDB();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `camellia-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCoachData(jsonString, mode = 'merge') {
  const incoming = JSON.parse(jsonString);
  if (mode === 'replace') { saveDB(incoming); return; }
  const db = loadDB();
  for (const t of (incoming.topics || [])) {
    const idx = db.topics.findIndex(x => x.topicId === t.topicId);
    if (idx >= 0) db.topics[idx] = t; else db.topics.push(t);
  }
  for (const r of (incoming.reviews || [])) {
    const idx = db.reviews.findIndex(x => x.topicId === r.topicId);
    if (idx >= 0) db.reviews[idx] = r; else db.reviews.push(r);
  }
  db.events = [...(db.events || []), ...(incoming.events || [])];
  saveDB(db);
}

// ── Legacy compatibility ──────────────────────────────────────────────────────

export function getTopics() { return loadDB().topics; }

export function upsertTopic(topic) {
  const db = loadDB();
  const idx = db.topics.findIndex(t => t.topicId === topic.topicId);
  if (idx >= 0) db.topics[idx] = { ...db.topics[idx], ...topic }; else db.topics.push(topic);
  saveDB(db);
}

export function deleteTopic(topicId) {
  const db = loadDB();
  db.topics = db.topics.filter(t => t.topicId !== topicId);
  db.reviews = db.reviews.filter(r => r.topicId !== topicId);
  saveDB(db);
}
