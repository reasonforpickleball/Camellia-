/**
 * Coach Intelligence Engine — Camellia AI Tutor
 * Deterministic, local-first. No LLM dependency for core scoring.
 * Ingests ALL Camellia study data automatically — no manual input required.
 */

const tk = (ns, key) => `camellia_${ns}_${key}`;
const COACH_DB_KEY = 'camellia_coach_intel_db';
const COACH_SETUP_KEY = 'camellia_coach_setup_complete';
const COACH_ACTIVITY_KEY = 'camellia_coach_activity_log';

// ─── DB helpers ───────────────────────────────────────────────────────────────

export function loadIntelDB() {
  try {
    const raw = localStorage.getItem(COACH_DB_KEY);
    const db = raw ? JSON.parse(raw) : {};
    return {
      subjects: db.subjects || [],
      learningProfile: db.learningProfile || null,
      activityLog: db.activityLog || [],
      setupAnswers: db.setupAnswers || null,
      lastUpdated: db.lastUpdated || null,
    };
  } catch {
    return { subjects: [], learningProfile: null, activityLog: [], setupAnswers: null, lastUpdated: null };
  }
}

export function saveIntelDB(db) {
  db.lastUpdated = Date.now();
  localStorage.setItem(COACH_DB_KEY, JSON.stringify(db));
}

export function isCoachSetupComplete() {
  // Auto-complete: if there's ANY study data, skip setup
  const ns = getAllNamespaces();
  for (const n of ns) {
    if (
      localStorage.getItem(tk(n, 'raw_material')) ||
      localStorage.getItem(tk(n, 'recent_quizzes')) ||
      localStorage.getItem(tk(n, 'ai_questions')) ||
      localStorage.getItem(tk(n, 'flashcard_deck'))
    ) return true;
  }
  return localStorage.getItem(COACH_SETUP_KEY) === 'true';
}

export function markCoachSetupComplete(answers) {
  localStorage.setItem(COACH_SETUP_KEY, 'true');
  const db = loadIntelDB();
  db.setupAnswers = { ...(db.setupAnswers || {}), ...answers };
  saveIntelDB(db);
}

// ─── Namespace discovery ──────────────────────────────────────────────────────

export function getAllNamespaces() {
  const ns = ['default'];
  try {
    const topics = JSON.parse(localStorage.getItem('doomium_topics') || '[]');
    topics.forEach(t => {
      if (!t) return;
      // Convert topic name to the namespace format used by TopicWorkspace
      const topicNs = `topic_${t.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
      if (!ns.includes(topicNs)) ns.push(topicNs);
    });
  } catch {}
  return ns;
}

// ─── Exam date parsing — reads planner text + goal + metadata ─────────────────

export function parseExamDateFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  // MM/DD/YYYY or MM/DD/YY or MM-DD-YYYY
  const slashMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    const dt = new Date(year, parseInt(m) - 1, parseInt(d));
    if (!isNaN(dt.getTime()) && dt.getTime() > Date.now()) return dt.getTime();
  }

  // "in N days/weeks"
  const relMatch = t.match(/in\s+(\d+)\s*(day|week)/i);
  if (relMatch) {
    const n = parseInt(relMatch[1]);
    const mult = relMatch[2].startsWith('week') ? 7 : 1;
    if (n > 0 && n < 365) return Date.now() + n * mult * 86400000;
  }

  // "N days" standalone
  const dayMatch = t.match(/(\d+)\s*days?\s*(?:until|before|left|to|away)/i);
  if (dayMatch) {
    const n = parseInt(dayMatch[1]);
    if (n > 0 && n < 365) return Date.now() + n * 86400000;
  }

  // "Month Day" like "June 15" or "Jun 15" or "june 15th"
  const monthMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i);
  if (monthMatch) {
    const yearPart = monthMatch[3] || new Date().getFullYear();
    const parsed = new Date(`${monthMatch[1]} ${monthMatch[2]}, ${yearPart}`);
    if (!isNaN(parsed.getTime())) {
      if (parsed.getTime() > Date.now()) return parsed.getTime();
      // try next year
      const nextYear = new Date(`${monthMatch[1]} ${monthMatch[2]}, ${parseInt(yearPart) + 1}`);
      if (!isNaN(nextYear.getTime())) return nextYear.getTime();
    }
  }

  // ISO date YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const parsed = new Date(isoMatch[0]);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) return parsed.getTime();
  }

  return null;
}

// Read exam date for a namespace from ALL sources in priority order
export function getExamDateForNs(ns, setupAnswers) {
  // 1. Direct setup answer (ISO date string from date input)
  const setupKey = `${ns}_examDate`;
  if (setupAnswers?.[setupKey]) {
    const dt = new Date(setupAnswers[setupKey]).getTime();
    if (dt > Date.now()) return dt;
  }

  // 2. Planner goal text
  const goal = localStorage.getItem(tk(ns, 'planner_goal')) || '';
  const fromGoal = parseExamDateFromText(goal);
  if (fromGoal) return fromGoal;

  // 3. Planner notes text (first 3000 chars)
  const notes = (localStorage.getItem(tk(ns, 'notes')) || '').slice(0, 3000);
  const fromNotes = parseExamDateFromText(notes);
  if (fromNotes) return fromNotes;

  // 4. Raw material text (first 2000 chars)
  const raw = (localStorage.getItem(tk(ns, 'raw_material')) || '').slice(0, 2000);
  const fromRaw = parseExamDateFromText(raw);
  if (fromRaw) return fromRaw;

  // 5. Legacy coachEngine exam date
  try {
    const coachData = JSON.parse(localStorage.getItem('camellia_coach_data') || '{}');
    const legacyTopic = coachData?.topics?.find(t => t.ns === ns || t.name === ns);
    if (legacyTopic?.examDate && legacyTopic.examDate > Date.now()) return legacyTopic.examDate;
  } catch {}

  return null;
}

// ─── Data ingestion — reads all Camellia data ─────────────────────────────────

function getQuizData(ns) {
  try {
    const quizzes = JSON.parse(localStorage.getItem(tk(ns, 'recent_quizzes')) || '[]');
    if (!quizzes.length) return { accuracy: null, count: 0, trend: 'none', scores: [], recentErrors: 0 };
    const scores = quizzes.map(q => q.total > 0 ? Math.round((q.score / q.total) * 100) : 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    let trend = 'none';
    if (scores.length >= 4) {
      const recent = scores.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const older = scores.slice(2, 5).reduce((a, b) => a + b, 0) / Math.min(3, scores.slice(2, 5).length);
      if (recent - older > 6) trend = 'improving';
      else if (older - recent > 6) trend = 'declining';
      else trend = 'stable';
    }
    // Estimate recent errors: questions missed in last quiz
    const lastQuiz = quizzes[0];
    const recentErrors = lastQuiz ? (lastQuiz.total - lastQuiz.score) : 0;
    return { accuracy: avg, count: quizzes.length, trend, scores, recentErrors };
  } catch { return { accuracy: null, count: 0, trend: 'none', scores: [], recentErrors: 0 }; }
}

function getYuccaData(ns) {
  try {
    const stats = JSON.parse(localStorage.getItem(tk(ns, 'yucca_stats')) || 'null');
    if (!stats) return { masteryPct: null, gamesPlayed: 0, avgAccuracy: null };
    const modes = ['blitz', 'sprint', 'mile'];
    const played = modes.reduce((s, m) => s + (stats[m]?.played || 0), 0);
    if (!played) return { masteryPct: null, gamesPlayed: 0, avgAccuracy: null };
    const masterySum = modes.reduce((s, m) => s + (stats[m]?.mastery || 0), 0);
    const accuracySum = modes.reduce((s, m) => s + (stats[m]?.accuracy || 0), 0);
    const activeModes = modes.filter(m => stats[m]?.played > 0).length;
    return {
      masteryPct: Math.round((masterySum / modes.length / 10) * 100),
      gamesPlayed: played,
      avgAccuracy: activeModes > 0 ? Math.round(accuracySum / activeModes) : null,
    };
  } catch { return { masteryPct: null, gamesPlayed: 0, avgAccuracy: null }; }
}

function getFlashcardData(ns) {
  try {
    const deck = JSON.parse(localStorage.getItem(tk(ns, 'flashcard_deck')) || 'null');
    if (!Array.isArray(deck) || !deck.length) return { cardCount: 0, hasNotes: false, retentionPct: null };
    const hasNotes = deck.some(c => c.notes && c.notes.trim().length > 5);
    // If cards have performance data, compute retention
    const rated = deck.filter(c => c.rating);
    const retentionPct = rated.length > 3
      ? Math.round(rated.filter(c => c.rating === 'easy' || c.rating === 'good').length / rated.length * 100)
      : null;
    return { cardCount: deck.length, hasNotes, retentionPct };
  } catch { return { cardCount: 0, hasNotes: false, retentionPct: null }; }
}

function getActiveRecallData(ns) {
  try {
    const data = localStorage.getItem(tk(ns, 'activerecall_tabs')) || localStorage.getItem(`camellia_${ns}_ar_sessions`);
    if (!data) return { sessions: 0 };
    const parsed = JSON.parse(data);
    const sessions = Array.isArray(parsed) ? parsed.length : (parsed?.sessions || 0);
    return { sessions };
  } catch { return { sessions: 0 }; }
}

function getFeynmanData(ns) {
  try {
    const data = localStorage.getItem(tk(ns, 'feynman_notes')) || localStorage.getItem(`camellia_${ns}_feynman`);
    return { hasNotes: !!(data && data.length > 50) };
  } catch { return { hasNotes: false }; }
}

function getCornellData(ns) {
  try {
    const data = localStorage.getItem(tk(ns, 'cornell_tabs'));
    return { hasNotes: !!(data && data.length > 50) };
  } catch { return { hasNotes: false }; }
}

function getTimerSessions(ns) {
  try {
    const sessions = parseInt(localStorage.getItem('doomium_total_sessions') || '0');
    const minutes = parseFloat(localStorage.getItem('doomium_total_minutes') || '0');
    return { sessions, minutes };
  } catch { return { sessions: 0, minutes: 0 }; }
}

// ─── Mastery computation ──────────────────────────────────────────────────────

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function daysSince(ts) { return ts ? (Date.now() - ts) / 86400000 : 999; }
function daysUntil(ts) { return ts ? (ts - Date.now()) / 86400000 : null; }

export function computeSubjectMastery(subject) {
  const { quizAccuracy, yuccaMasteryPct, diagnosticScore, flashcardCount, flashcardRetention, lastReviewed, halfLife = 10 } = subject;

  // Forgetting decay
  const days = daysSince(lastReviewed);
  const decay = Math.exp(-days / halfLife);

  // Weighted blend of available signals
  const parts = [];
  if (quizAccuracy !== null) parts.push({ v: quizAccuracy, w: 0.40 });
  if (yuccaMasteryPct !== null) parts.push({ v: yuccaMasteryPct, w: 0.25 });
  if (diagnosticScore !== null) parts.push({ v: diagnosticScore, w: 0.25 });
  if (flashcardRetention !== null) parts.push({ v: flashcardRetention, w: 0.15 });
  else if (flashcardCount > 0) parts.push({ v: Math.min(100, flashcardCount * 4), w: 0.10 });

  let base = parts.length > 0
    ? parts.reduce((s, p) => s + p.v * p.w, 0) / parts.reduce((s, p) => s + p.w, 0)
    : 30;

  return clamp(Math.round(base * (0.5 + 0.5 * decay)), 0, 100);
}

export function predictExamScore(subject) {
  const mastery = computeSubjectMastery(subject);
  const du = daysUntil(subject.examDate);
  let projected = mastery;
  if (du !== null && du > 0) projected = clamp(mastery + Math.min(du * 1.0, 20), 0, 97);
  if (subject.quizTrend === 'improving') projected = clamp(projected + 5, 0, 97);
  if (subject.quizTrend === 'declining') projected = clamp(projected - 8, 0, 97);
  return Math.round(projected);
}

export function getReadinessLabel(score) {
  if (score >= 87) return { letter: 'A', color: '#22c55e' };
  if (score >= 75) return { letter: 'B+', color: '#4ade80' };
  if (score >= 65) return { letter: 'B', color: '#a3e635' };
  if (score >= 55) return { letter: 'C+', color: '#f59e0b' };
  if (score >= 45) return { letter: 'C', color: '#fb923c' };
  return { letter: 'D', color: '#ef4444' };
}

export function predictForgettingDate(subject) {
  const { lastReviewed, halfLife = 10 } = subject;
  if (!lastReviewed) return null;
  const currentMastery = computeSubjectMastery(subject);
  if (currentMastery <= 0) return Date.now();
  const ratio = currentMastery / 40;
  if (ratio <= 0) return Date.now();
  const daysToForget = halfLife * Math.log(ratio);
  if (!isFinite(daysToForget) || daysToForget <= 0) return Date.now();
  return lastReviewed + daysToForget * 86400000;
}

// ─── Build subject list from all data ─────────────────────────────────────────

export function buildAllSubjects() {
  const namespaces = getAllNamespaces();
  const db = loadIntelDB();
  const setupAnswers = db.setupAnswers || {};
  const subjects = [];

  for (const ns of namespaces) {
    const hasAny = !!(
      localStorage.getItem(tk(ns, 'raw_material')) ||
      localStorage.getItem(tk(ns, 'planner_filename')) ||
      localStorage.getItem(tk(ns, 'recent_quizzes')) ||
      localStorage.getItem(tk(ns, 'ai_questions')) ||
      localStorage.getItem(tk(ns, 'flashcard_deck')) ||
      localStorage.getItem(tk(ns, 'notes')) ||
      localStorage.getItem(tk(ns, 'yucca_stats'))
    );
    if (!hasAny) continue;

    const goal = localStorage.getItem(tk(ns, 'planner_goal')) || '';
    const filename = localStorage.getItem(tk(ns, 'planner_filename')) || '';
    // Strip academic prefixes — keep only the core subject name
    const cleanSubjectName = (raw) => raw
      .replace(/\b(AP|Honors?|IB|AICE|Dual\s+Enrollment|DE|Advanced|Accelerated|College\s+Prep|CP)\b[\s:]*/gi, '')
      .replace(/,.*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    const cleanNs = ns.replace(/^topic_/, '').replace(/_/g, ' ');
    const rawName = ns === 'default'
      ? (filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/-/g, ' ') || goal.split(' ').slice(0, 3).join(' ') || 'Main Subject')
      : (goal.split(' ').slice(0, 4).join(' ') || cleanNs);
    const name = cleanSubjectName(rawName) || rawName;

    // Auto-detect exam date from all sources
    const examDate = getExamDateForNs(ns, setupAnswers);

    const quiz = getQuizData(ns);
    const yucca = getYuccaData(ns);
    const flash = getFlashcardData(ns);
    const ar = getActiveRecallData(ns);
    const feynman = getFeynmanData(ns);
    const cornell = getCornellData(ns);

    // Diagnostic score from coach DB
    const diagRecord = db.subjects.find(s => s.ns === ns);
    const diagnosticScore = diagRecord?.diagnosticScore ?? null;
    const lastReviewed = diagRecord?.lastReviewed
      ?? (quiz.count > 0 ? Date.now() - (quiz.scores.length * 86400000 * 0.5) : null);
    const halfLife = diagRecord?.halfLife ?? 10;
    const sessionCount = diagRecord?.sessionCount ?? 0;

    const subject = {
      ns, name, goal, examDate,
      quizAccuracy: quiz.accuracy,
      quizCount: quiz.count,
      quizTrend: quiz.trend,
      quizScores: quiz.scores,
      recentErrors: quiz.recentErrors,
      yuccaMasteryPct: yucca.masteryPct,
      yuccaGames: yucca.gamesPlayed,
      yuccaAccuracy: yucca.avgAccuracy,
      flashcardCount: flash.cardCount,
      flashcardHasNotes: flash.hasNotes,
      flashcardRetention: flash.retentionPct,
      activeRecallSessions: ar.sessions,
      hasFeynman: feynman.hasNotes,
      hasCornell: cornell.hasNotes,
      hasNotes: !!(localStorage.getItem(tk(ns, 'notes')) || localStorage.getItem(tk(ns, 'schedule'))),
      diagnosticScore,
      lastReviewed,
      halfLife,
      sessionCount,
    };

    subject.masteryScore = computeSubjectMastery(subject);
    subject.predictedScore = predictExamScore(subject);
    subject.forgettingDate = predictForgettingDate(subject);

    // Auto-dismiss topics whose exam has passed — remove from planner entirely
    const dismissedExams = (() => { try { return JSON.parse(localStorage.getItem('camellia_dismissed_exams') || '[]'); } catch { return []; } })();
    if (dismissedExams.includes(ns)) continue;
    if (subject.examDate && subject.examDate < Date.now()) {
      // Exam passed — add to dismissed list so it no longer appears in the planner
      const updated = [...dismissedExams, ns];
      localStorage.setItem('camellia_dismissed_exams', JSON.stringify(updated));
      continue; // skip this subject entirely
    }

    subjects.push(subject);
  }

  return subjects;
}

// ─── Learning Profile inference ───────────────────────────────────────────────

export function inferLearningProfile(subjects) {
  const totalMins = parseFloat(localStorage.getItem('doomium_total_minutes') || '0');
  const sessions = parseInt(localStorage.getItem('doomium_total_sessions') || '0');
  const streak = parseInt(localStorage.getItem('doomium_streak') || '0');
  const quizzes = parseInt(localStorage.getItem('doomium_total_quizzes') || '0');

  const avgSessionLen = sessions > 0 ? Math.round(totalMins / sessions) : 25;
  // Attention span: drops ~18% before session ends
  const attentionSpan = Math.max(10, Math.round(avgSessionLen * 0.82));

  // Best study time: from hour-of-day activity logs
  const hourLog = (() => { try { return JSON.parse(localStorage.getItem('camellia_hour_log') || '{}'); } catch { return {}; } })();
  let bestHour = -1;
  let maxActivity = 0;
  for (const [h, count] of Object.entries(hourLog)) {
    if (count > maxActivity) { maxActivity = count; bestHour = parseInt(h); }
  }

  let bestStudyTime = 'Not enough data yet';
  if (bestHour >= 0) {
    const ampm = bestHour >= 12 ? 'PM' : 'AM';
    const h12 = bestHour % 12 || 12;
    const endH = (bestHour + 2) % 24;
    const endAmpm = endH >= 12 ? 'PM' : 'AM';
    const endH12 = endH % 12 || 12;
    bestStudyTime = `${h12}:00 ${ampm} – ${endH12}:00 ${endAmpm}`;
  }

  // Strongest learning style — infer from usage patterns
  const hasFlashcards = subjects.some(s => s.flashcardCount > 5);
  const hasYucca = subjects.some(s => s.yuccaGames > 2);
  const hasQuizzes = subjects.some(s => s.quizCount > 2);
  const hasActiveRecall = subjects.some(s => s.activeRecallSessions > 0);
  const hasFeynman = subjects.some(s => s.hasFeynman);
  const hasCornell = subjects.some(s => s.hasCornell);

  let learningStyle = 'Building profile...';
  const signals = [];
  if (hasActiveRecall || hasFeynman) signals.push('Active Recall');
  if (hasYucca && hasQuizzes) signals.push('Gamified Quizzing');
  if (hasFlashcards) signals.push('Spaced Repetition');
  if (hasCornell) signals.push('Structured Notes');
  if (signals.length >= 2) learningStyle = signals.slice(0, 2).join(' + ');
  else if (signals.length === 1) learningStyle = signals[0];
  else if (hasQuizzes) learningStyle = 'Quiz-Based Learning';

  // Avg forgetting period
  const avgHalfLife = subjects.length > 0
    ? Math.round(subjects.reduce((s, sub) => s + (sub.halfLife || 10), 0) / subjects.length)
    : 10;

  // Procrastination score: sessions started near exam deadlines
  const cramSessions = subjects.filter(s => {
    const du = daysUntil(s.examDate);
    return du !== null && du >= 0 && du <= 3 && s.quizCount > 0;
  }).length;
  const procrastinationScore = Math.min(100, cramSessions * 25 + (streak === 0 ? 20 : 0));

  // Consistency score
  const totalDays = Math.max(1, Math.round(totalMins / (avgSessionLen || 25)));
  const studyDays = Math.min(totalDays, sessions);
  const consistency = Math.min(100, Math.round(
    (streak > 0 ? Math.min(streak * 6, 35) : 0) +
    (sessions > 0 ? Math.min(sessions * 2, 35) : 0) +
    (quizzes > 0 ? Math.min(quizzes * 3, 30) : 0)
  ));

  // Weakest topics for display
  const weakTopics = subjects
    .filter(s => s.masteryScore < 60)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 3)
    .map(s => s.name);

  return {
    bestStudyTime,
    learningStyle,
    weakTopics,
    attentionSpan,
    avgForgettingDays: avgHalfLife,
    consistency,
    procrastinationScore,
    totalStudyHours: Math.round(totalMins / 60 * 10) / 10,
    streak,
    sessions,
    quizzes,
    hasEnoughData: totalMins > 0 || subjects.length > 0,
  };
}

// ─── Priority plan generation ─────────────────────────────────────────────────

export function generatePriorityPlan(subjects) {
  if (!subjects.length) return [];

  const scored = subjects.map(s => {
    const du = daysUntil(s.examDate);
    let priority = 100 - s.masteryScore;

    if (du !== null && du >= 0) {
      if (du <= 1) priority += 60;
      else if (du <= 3) priority += 45;
      else if (du <= 7) priority += 30;
      else if (du <= 14) priority += 15;
    }

    if (s.quizTrend === 'declining') priority += 22;
    if (s.quizAccuracy !== null && s.quizAccuracy < 55) priority += 20;
    if (s.recentErrors > 3) priority += 10;

    const forgetsIn = s.forgettingDate ? daysUntil(s.forgettingDate) : null;
    if (forgetsIn !== null && forgetsIn <= 2) priority += 30;
    else if (forgetsIn !== null && forgetsIn <= 5) priority += 18;
    else if (forgetsIn !== null && forgetsIn <= 10) priority += 8;

    if (s.quizCount === 0 && s.yuccaGames === 0) priority += 20;

    return { ...s, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);

  return scored.slice(0, 3).map(s => {
    const du = daysUntil(s.examDate);
    const forgetsIn = s.forgettingDate ? daysUntil(s.forgettingDate) : null;

    let mins = 30;
    if (du !== null && du <= 1) mins = 90;
    else if (du !== null && du <= 3) mins = 60;
    else if (du !== null && du <= 7) mins = 45;
    else if (s.masteryScore < 35) mins = 45;
    else if (s.masteryScore >= 75) mins = 20;

    const reasons = [];
    if (du !== null && du >= 0 && du <= 14) {
      reasons.push(`Exam in ${Math.round(du)} day${Math.round(du) !== 1 ? 's' : ''}`);
    }
    if (s.quizAccuracy !== null && s.quizAccuracy < 60) {
      reasons.push(`Quiz avg ${s.quizAccuracy}% — needs improvement`);
    }
    if (forgetsIn !== null && forgetsIn <= 5) {
      reasons.push(`Predicted to forget in ${Math.round(Math.max(0, forgetsIn))} day${Math.round(forgetsIn) !== 1 ? 's' : ''}`);
    }
    if (s.quizTrend === 'declining') reasons.push('Scores declining over recent sessions');
    if (s.recentErrors > 3) reasons.push(`${s.recentErrors} questions missed last session`);
    if (s.quizCount === 0 && s.yuccaGames === 0) reasons.push('No performance data yet — needs calibration');
    if (reasons.length === 0) reasons.push(`Mastery at ${s.masteryScore}% — scheduled for review`);

    let mode = 'Active Recall Quiz';
    if (s.masteryScore < 35) mode = 'Re-read + Summarize';
    else if (s.masteryScore < 60) mode = 'Focused Practice';
    else if (s.masteryScore >= 75) mode = 'Exam Simulation';

    // Predicted impact
    const impactPct = Math.min(15, Math.round(mins / 4));
    const impact = `${s.name} readiness ${s.masteryScore}% → ~${Math.min(100, s.masteryScore + impactPct)}%`;

    return { ...s, mins, reason: reasons[0], allReasons: reasons, mode, impact };
  });
}

// ─── Weakest topics across all subjects ──────────────────────────────────────

export function getWeakestTopics(subjects) {
  return subjects
    .map(s => {
      const du = daysUntil(s.examDate);
      const examWeight = du !== null && du >= 0 && du <= 14 ? 2.0 : du !== null && du <= 30 ? 1.5 : 1.0;
      const recentErrorWeight = s.recentErrors > 0 ? 1 + s.recentErrors * 0.1 : 1;
      const impact = examWeight * (1 - s.masteryScore / 100) * recentErrorWeight;
      const impactLabel = impact > 1.2 ? 'Critical' : impact > 0.7 ? 'High' : impact > 0.4 ? 'Medium' : 'Low';
      const impactColor = impactLabel === 'Critical' ? '#dc2626' : impactLabel === 'High' ? '#ef4444' : impactLabel === 'Medium' ? '#f59e0b' : '#22c55e';
      return { name: s.name, score: s.masteryScore, impact: impactLabel, impactColor, impactNum: impact, examIn: du !== null ? Math.round(du) : null };
    })
    .sort((a, b) => b.impactNum - a.impactNum)
    .slice(0, 5);
}

// ─── Coach advice ─────────────────────────────────────────────────────────────

export function getCoachAdvice(subjects) {
  const advice = [];

  subjects.forEach(s => {
    const du = daysUntil(s.examDate);
    const forgetsIn = s.forgettingDate ? daysUntil(s.forgettingDate) : null;

    // Forgetting alert
    if (forgetsIn !== null && forgetsIn <= 4 && forgetsIn >= 0) {
      advice.push({
        icon: '!',
        title: `Review ${s.name} Now`,
        reason: `You'll likely forget this material in ${Math.round(forgetsIn)} day${Math.round(forgetsIn) !== 1 ? 's' : ''} based on your last review.`,
        urgency: 'high',
      });
    }

    // Low mastery
    if (s.masteryScore < 45 && s.quizCount > 0) {
      advice.push({
        icon: '#',
        title: `Study ${s.name}`,
        reason: `Mastery is ${s.masteryScore}% — well below the passing threshold. ${s.quizAccuracy !== null ? `Quiz avg: ${s.quizAccuracy}%.` : ''}`,
        urgency: 'high',
      });
    }

    // Quiz declining
    if (s.quizTrend === 'declining' && s.quizCount >= 3) {
      advice.push({
        icon: '-',
        title: `${s.name} scores dropping`,
        reason: `Your last ${Math.min(s.quizCount, 3)} quizzes show a declining trend. Switch from passive review to active recall.`,
        urgency: 'medium',
      });
    }

    // Near exam + low mastery
    if (du !== null && du >= 0 && du <= 7 && s.masteryScore < 70) {
      advice.push({
        icon: '>',
        title: `${s.name} exam in ${Math.round(du)} days`,
        reason: `Currently at ${s.masteryScore}% mastery. Run an exam simulation to identify remaining weak points.`,
        urgency: 'high',
      });
    }

    // No data yet
    if (s.quizCount === 0 && s.yuccaGames === 0 && s.flashcardCount === 0) {
      advice.push({
        icon: '?',
        title: `Calibrate ${s.name}`,
        reason: `No performance data yet. Take a quick quiz to let the Coach measure your baseline mastery.`,
        urgency: 'medium',
      });
    }

    // Recent errors
    if (s.recentErrors >= 5) {
      advice.push({
        icon: 'X',
        title: `Review ${s.name} mistakes`,
        reason: `You missed ${s.recentErrors} questions in your last session. Go over those concepts before moving on.`,
        urgency: 'medium',
      });
    }
  });

  // Remove duplicates by title, prioritize by urgency
  const seen = new Set();
  const urgencyRank = (u) => u === 'high' ? 0 : u === 'medium' ? 1 : 2;
  return advice
    .filter(a => { if (seen.has(a.title)) return false; seen.add(a.title); return true; })
    .sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency))
    .slice(0, 4);
}

// ─── Practice sets ────────────────────────────────────────────────────────────

export function generatePracticeSets(subjects) {
  const sets = [];
  subjects.forEach(s => {
    const du = daysUntil(s.examDate);
    const hasContent = s.quizCount > 0 || s.flashcardCount > 0 || s.yuccaGames > 0 ||
      !!localStorage.getItem(`camellia_${s.ns}_raw_material`);

    // Weakness Repair — low mastery
    if (s.masteryScore < 60) {
      const qCount = Math.max(10, Math.min(25, Math.round(60 - s.masteryScore / 2)));
      const whyScore = s.quizAccuracy !== null ? ` Your quiz average is ${s.quizAccuracy}%.` : '';
      const whyTrend = s.quizTrend === 'declining' ? ' Scores have been dropping recently.' : '';
      const whyErrors = s.recentErrors > 2 ? ` You missed ${s.recentErrors} questions last session.` : '';
      sets.push({
        title: s.name,
        type: 'Weakness Repair',
        questions: qCount,
        estMins: Math.round(qCount * 0.7),
        color: '#ef4444',
        ns: s.ns,
        canStart: hasContent,
        reason: `Your mastery is ${s.masteryScore}% — below passing threshold.${whyScore}${whyTrend}${whyErrors} This set targets your weakest areas to close the gap fast.`,
      });
    }

    // Quick Review — solid mastery, needs spaced repetition
    if (s.masteryScore >= 60) {
      const forgetsIn = s.forgettingDate ? daysUntil(s.forgettingDate) : null;
      const whyForget = forgetsIn !== null && forgetsIn <= 7 ? ` You're predicted to forget this material in ${Math.round(Math.max(0, forgetsIn))} days.` : '';
      sets.push({
        title: s.name,
        type: 'Spaced Review',
        questions: 15,
        estMins: 12,
        color: '#22c55e',
        ns: s.ns,
        canStart: true,
        reason: `You're at ${s.masteryScore}% mastery — strong, but needs maintenance.${whyForget} This 15-question review locks in retention using spaced repetition.`,
      });
    }

    // Exam Simulation — exam coming up
    if (du !== null && du >= 0 && du <= 14) {
      const readinessGap = Math.max(0, 80 - s.masteryScore);
      const gapMsg = readinessGap > 0 ? ` You need ${readinessGap}% more mastery to hit an A.` : ' You are on track for an A.';
      sets.push({
        title: `${s.name} Exam Sim`,
        type: 'Exam Simulation',
        questions: 25,
        estMins: 35,
        color: '#7b2d6e',
        ns: s.ns,
        canStart: hasContent,
        reason: `Your ${s.name} exam is in ${Math.round(du)} day${du !== 1 ? 's' : ''}.${gapMsg} This full 25-question simulation mimics real exam pressure to find final weak spots.`,
      });
    }

    // Speed Challenge — never played Yucca / build fluency
    if (s.yuccaGames === 0 && hasContent) {
      sets.push({
        title: s.name,
        type: 'Speed Challenge',
        questions: 20,
        estMins: 10,
        color: '#f59e0b',
        ns: s.ns,
        canStart: hasContent,
        reason: `You've never done a speed drill on ${s.name}. Timed practice forces instant recall, which is exactly what exams demand. Your ${s.masteryScore}% mastery needs to be fast, not just accurate.`,
      });
    }
  });
  return sets.slice(0, 6);
}

// ─── Recent activity log ──────────────────────────────────────────────────────

export function logActivity(type, payload) {
  const log = (() => { try { return JSON.parse(localStorage.getItem(COACH_ACTIVITY_KEY) || '[]'); } catch { return []; } })();
  log.unshift({ type, payload, ts: Date.now() });
  localStorage.setItem(COACH_ACTIVITY_KEY, JSON.stringify(log.slice(0, 50)));
}

export function getRecentActivity() {
  // Merge explicit log with inferred events from study data
  const explicit = (() => { try { return JSON.parse(localStorage.getItem(COACH_ACTIVITY_KEY) || '[]'); } catch { return []; } })();

  // Infer activities from quiz and yucca data
  const inferred = [];
  const ns = getAllNamespaces();
  for (const n of ns) {
    try {
      const quizzes = JSON.parse(localStorage.getItem(tk(n, 'recent_quizzes')) || '[]');
      quizzes.slice(0, 3).forEach((q, i) => {
        const pct = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
        inferred.push({
          type: 'quiz',
          payload: { subject: n === 'default' ? 'Main Subject' : n, score: pct, questions: q.total, label: q.label },
          ts: Date.now() - (i + 1) * 3600000 * 2,
        });
      });
    } catch {}

    try {
      const stats = JSON.parse(localStorage.getItem(tk(n, 'yucca_stats')) || 'null');
      if (stats) {
        const modes = ['blitz', 'sprint', 'mile'];
        modes.forEach(m => {
          if (stats[m]?.played > 0) {
            inferred.push({
              type: 'yucca',
              payload: { subject: n === 'default' ? 'Main Subject' : n, mode: m, played: stats[m].played },
              ts: Date.now() - 7200000,
            });
          }
        });
      }
    } catch {}
  }

  // Sessions
  const sessions = parseInt(localStorage.getItem('doomium_total_sessions') || '0');
  if (sessions > 0) {
    inferred.push({ type: 'session', payload: { count: sessions }, ts: Date.now() - 3600000 });
  }

  const combined = [...explicit, ...inferred]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 15);

  return combined;
}

// ─── Track study hour for best-time inference ─────────────────────────────────

export function trackStudyHour() {
  const h = new Date().getHours();
  const log = (() => { try { return JSON.parse(localStorage.getItem('camellia_hour_log') || '{}'); } catch { return {}; } })();
  log[h] = (log[h] || 0) + 1;
  localStorage.setItem('camellia_hour_log', JSON.stringify(log));
}

// ─── Save diagnostic score ────────────────────────────────────────────────────

export function saveDiagnosticScore(ns, score) {
  const db = loadIntelDB();
  let sub = db.subjects.find(s => s.ns === ns);
  if (!sub) { sub = { ns }; db.subjects.push(sub); }
  sub.diagnosticScore = score;
  sub.lastDiagnostic = Date.now();
  sub.lastReviewed = Date.now();
  saveIntelDB(db);
}

export function recordSubjectReview(ns) {
  const db = loadIntelDB();
  let sub = db.subjects.find(s => s.ns === ns);
  if (!sub) { sub = { ns }; db.subjects.push(sub); }
  sub.lastReviewed = Date.now();
  sub.sessionCount = (sub.sessionCount || 0) + 1;
  saveIntelDB(db);
  logActivity('review', { ns, ts: Date.now() });
}

// ─── Overall readiness ────────────────────────────────────────────────────────

export function getOverallReadiness(subjects) {
  if (!subjects.length) return 0;
  // Weight by exam proximity
  let totalWeight = 0;
  let weightedSum = 0;
  subjects.forEach(s => {
    const du = daysUntil(s.examDate);
    const weight = du !== null && du >= 0 && du <= 14 ? 2 : 1;
    weightedSum += s.masteryScore * weight;
    totalWeight += weight;
  });
  return Math.round(weightedSum / totalWeight);
}

// ─── Study load computation ───────────────────────────────────────────────────

export function getStudyLoad(subjects) {
  const plan = generatePriorityPlan(subjects);
  const plannedMins = plan.reduce((s, t) => s + t.mins, 0);
  const totalMins = parseFloat(localStorage.getItem('doomium_total_minutes') || '0');
  const sessions = parseInt(localStorage.getItem('doomium_total_sessions') || '0');

  // Today studied: rough estimate based on session history
  const avgSessionLen = sessions > 0 ? totalMins / sessions : 0;
  const todayStudied = Math.min(plannedMins, avgSessionLen);
  const remaining = Math.max(0, plannedMins - todayStudied);
  const pct = plannedMins > 0 ? Math.round((todayStudied / plannedMins) * 100) : 0;

  // Optimal weekly hours based on subjects and exam proximity
  const urgentSubjects = subjects.filter(s => {
    const du = daysUntil(s.examDate);
    return du !== null && du >= 0 && du <= 14;
  }).length;
  const optimalWeeklyHours = Math.min(40, subjects.length * 2 + urgentSubjects * 3);

  return {
    planned: Math.round(plannedMins),
    studied: Math.round(todayStudied),
    remaining: Math.round(remaining),
    pct: Math.min(100, pct),
    optimalWeeklyHours,
    totalStudiedHours: Math.round(totalMins / 60 * 10) / 10,
  };
}
