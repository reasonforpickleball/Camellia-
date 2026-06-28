/**
 * StudentModelEngine — Persistent Academic Memory & Prediction Engine
 * Builds a long-term personal model for each student that improves with every interaction.
 * All data is local-first, persisted indefinitely in localStorage.
 */

const MODEL_KEY = 'camellia_student_model';
const ERRORS_KEY = 'camellia_error_memory';
const VELOCITY_KEY = 'camellia_velocity_log';
const ATTENTION_KEY = 'camellia_attention_log';
const WEEKLY_KEY = 'camellia_weekly_snapshots';

const tk = (ns, key) => `camellia_${ns}_${key}`;

// ─── Persistence ──────────────────────────────────────────────────────────────

export function loadStudentModel() {
  try {
    const raw = localStorage.getItem(MODEL_KEY);
    const m = raw ? JSON.parse(raw) : {};
    return {
      subjects: m.subjects || {},       // keyed by ns
      globalProfile: m.globalProfile || {},
      coachMemory: m.coachMemory || {
        avoidedSubjects: [],
        lovedSubjects: [],
        stressSubjects: [],
        strongMethods: [],
        weakHabits: [],
        behaviorPatterns: [],
      },
      lastUpdated: m.lastUpdated || null,
    };
  } catch {
    return { subjects: {}, globalProfile: {}, coachMemory: { avoidedSubjects: [], lovedSubjects: [], stressSubjects: [], strongMethods: [], weakHabits: [], behaviorPatterns: [] }, lastUpdated: null };
  }
}

function saveStudentModel(model) {
  model.lastUpdated = Date.now();
  localStorage.setItem(MODEL_KEY, JSON.stringify(model));
}

function loadErrorMemory() {
  try { return JSON.parse(localStorage.getItem(ERRORS_KEY) || '{}'); } catch { return {}; }
}
function saveErrorMemory(m) { localStorage.setItem(ERRORS_KEY, JSON.stringify(m)); }

function loadVelocityLog() {
  try { return JSON.parse(localStorage.getItem(VELOCITY_KEY) || '{}'); } catch { return {}; }
}
function saveVelocityLog(v) { localStorage.setItem(VELOCITY_KEY, JSON.stringify(v)); }

function loadAttentionLog() {
  try { return JSON.parse(localStorage.getItem(ATTENTION_KEY) || '[]'); } catch { return []; }
}
function saveAttentionLog(l) { localStorage.setItem(ATTENTION_KEY, JSON.stringify(l.slice(-100))); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function daysSince(ts) { return ts ? (Date.now() - ts) / 86400000 : 999; }
function daysUntil(ts) { return ts ? (ts - Date.now()) / 86400000 : null; }

// ─── FORGETTING MODEL ─────────────────────────────────────────────────────────

/**
 * Personalized Ebbinghaus forgetting curve.
 * halfLife is per-subject and personalizes over time.
 */
export function computeRetentionAt(mastery, lastReviewed, halfLife, daysFromNow = 0) {
  if (!lastReviewed || mastery <= 0) return 0;
  const totalDays = daysSince(lastReviewed) + daysFromNow;
  return clamp(mastery * Math.exp(-totalDays / halfLife), 0, 100);
}

export function getForgettingProfile(subjectModel, currentMastery) {
  const halfLife = subjectModel?.halfLife || 10;
  const lastReviewed = subjectModel?.lastReviewed || Date.now();

  const today = Math.round(computeRetentionAt(currentMastery, lastReviewed, halfLife, 0));
  const in3 = Math.round(computeRetentionAt(currentMastery, lastReviewed, halfLife, 3));
  const in7 = Math.round(computeRetentionAt(currentMastery, lastReviewed, halfLife, 7));
  const in14 = Math.round(computeRetentionAt(currentMastery, lastReviewed, halfLife, 14));

  // Days until retention drops below 50%
  const daysToForget = halfLife * Math.log(Math.max(currentMastery / 50, 0.01));
  const daysLeft = Math.max(0, daysToForget - daysSince(lastReviewed));
  const forgettingProbIn5 = clamp(Math.round((1 - computeRetentionAt(currentMastery, lastReviewed, halfLife, 5) / 100) * 100), 0, 100);

  return {
    retentionToday: today,
    retentionIn3: in3,
    retentionIn7: in7,
    retentionIn14: in14,
    daysUntilForgotten: Math.round(daysLeft),
    forgettingProbIn5Days: forgettingProbIn5,
    halfLife,
  };
}

// ─── EXAM PREDICTION ENGINE ───────────────────────────────────────────────────

export function predictExamOutcome(subject, subjectModel) {
  const mastery = subject.masteryScore || 35;
  const du = daysUntil(subject.examDate);
  const quizTrend = subject.quizTrend || 'none';
  const quizAccuracy = subject.quizAccuracy;
  const halfLife = subjectModel?.halfLife || 10;
  const lastReviewed = subjectModel?.lastReviewed || null;

  // Base: current mastery + decay-adjusted projection
  let projected = mastery;

  // If time remains, apply learning gain projection
  if (du !== null && du > 0) {
    const hoursPerDay = 1.5;
    const gainPerHour = 1.2;
    const maxGain = Math.min(du * hoursPerDay * gainPerHour, 25);
    projected = clamp(mastery + maxGain, 0, 97);
  }

  // Apply forgetting decay if no recent review
  if (lastReviewed) {
    const decayFactor = Math.exp(-daysSince(lastReviewed) / halfLife);
    projected = clamp(projected * (0.7 + 0.3 * decayFactor), 0, 97);
  }

  // Trend adjustment
  if (quizTrend === 'improving') projected = clamp(projected + 6, 0, 97);
  if (quizTrend === 'declining') projected = clamp(projected - 10, 0, 97);

  // Confidence based on data quality
  const dataPoints = (subject.quizCount || 0) + (subject.yuccaGames || 0) + (subject.flashcardCount > 0 ? 1 : 0);
  const confidence = dataPoints >= 6 ? 'High' : dataPoints >= 3 ? 'Medium' : 'Low';

  // Grade prediction
  const score = Math.round(projected);
  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  // Risk level
  const risk = score >= 75 ? 'Low' : score >= 60 ? 'Medium' : 'High';
  const riskColor = risk === 'Low' ? '#22c55e' : risk === 'Medium' ? '#f59e0b' : '#ef4444';

  // Confidence calibration: compare predicted vs actual quiz
  let calibration = null;
  if (quizAccuracy !== null && subjectModel?.predictedAccuracy != null) {
    const diff = quizAccuracy - subjectModel.predictedAccuracy;
    if (diff < -10) calibration = { type: 'overconfident', delta: Math.abs(diff) };
    else if (diff > 10) calibration = { type: 'underconfident', delta: diff };
  }

  return { score, grade, confidence, risk, riskColor, calibration };
}

// ─── LEARNING VELOCITY ENGINE ─────────────────────────────────────────────────

export function recordMasterySnapshot(ns, mastery) {
  const log = loadVelocityLog();
  if (!log[ns]) log[ns] = [];
  log[ns].push({ ts: Date.now(), mastery });
  // Keep last 60 snapshots per subject
  log[ns] = log[ns].slice(-60);
  saveVelocityLog(log);
}

export function getLearningVelocity(ns) {
  const log = loadVelocityLog();
  const snaps = (log[ns] || []).filter(s => s.mastery != null);
  if (snaps.length < 2) return { velocity: 0, label: 'No data yet', deltaLabel: '+0%', period: 0, trend: 'none' };

  const recent = snaps[snaps.length - 1];
  const start = snaps[Math.max(0, snaps.length - 10)];
  const periodDays = Math.max(1, (recent.ts - start.ts) / 86400000);
  const delta = recent.mastery - start.mastery;
  const velocityPerDay = delta / periodDays;

  const label = delta > 0
    ? `+${Math.round(delta)}% mastery over ${Math.round(periodDays)} day${Math.round(periodDays) !== 1 ? 's' : ''}`
    : delta < -2
      ? `${Math.round(delta)}% mastery over ${Math.round(periodDays)} day${Math.round(periodDays) !== 1 ? 's' : ''}`
      : `Stable over ${Math.round(periodDays)} day${Math.round(periodDays) !== 1 ? 's' : ''}`;

  const trend = velocityPerDay > 1 ? 'fast' : velocityPerDay > 0.2 ? 'steady' : velocityPerDay < -0.5 ? 'declining' : 'slow';

  return {
    velocity: Math.round(velocityPerDay * 10) / 10,
    label,
    deltaLabel: `${delta >= 0 ? '+' : ''}${Math.round(delta)}%`,
    delta: Math.round(delta),
    period: Math.round(periodDays),
    trend,
    needsAttention: velocityPerDay < 0.3 && snaps.length >= 5,
  };
}

export function getAllVelocities(subjects) {
  return subjects.map(s => ({
    ns: s.ns,
    name: s.name,
    mastery: s.masteryScore,
    ...getLearningVelocity(s.ns),
  })).sort((a, b) => a.velocity - b.velocity); // slowest first
}

// ─── ERROR MEMORY SYSTEM ──────────────────────────────────────────────────────

export function recordError(ns, concept, errorType = 'missed') {
  const mem = loadErrorMemory();
  if (!mem[ns]) mem[ns] = {};
  if (!mem[ns][concept]) mem[ns][concept] = { count: 0, errorType, sessions: [], lastSeen: null };
  mem[ns][concept].count += 1;
  mem[ns][concept].lastSeen = Date.now();
  mem[ns][concept].sessions.push(Date.now());
  mem[ns][concept].sessions = mem[ns][concept].sessions.slice(-20);
  saveErrorMemory(mem);
}

export function getErrorMemory(ns) {
  const mem = loadErrorMemory();
  const nsErrors = mem[ns] || {};
  return Object.entries(nsErrors)
    .map(([concept, data]) => ({
      concept,
      count: data.count,
      errorType: data.errorType,
      lastSeen: data.lastSeen,
      recentSessions: data.sessions?.length || 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function getTopErrors(subjects) {
  const all = [];
  subjects.forEach(s => {
    const errors = getErrorMemory(s.ns);
    errors.forEach(e => all.push({ ...e, subject: s.name, ns: s.ns }));
  });
  return all.sort((a, b) => b.count - a.count).slice(0, 8);
}

// Infer errors from quiz data
export function inferErrorsFromQuizzes(ns) {
  try {
    const quizzes = JSON.parse(localStorage.getItem(tk(ns, 'recent_quizzes')) || '[]');
    quizzes.forEach(q => {
      if (q.wrongConcepts && Array.isArray(q.wrongConcepts)) {
        q.wrongConcepts.forEach(c => recordError(ns, c, 'quiz_miss'));
      }
      // Fallback: high error count
      if (q.total && q.score !== undefined) {
        const missed = q.total - q.score;
        if (missed >= 3 && q.label) recordError(ns, q.label || 'Unnamed concept', 'repeated');
      }
    });
  } catch {}
}

// ─── ATTENTION MODEL ──────────────────────────────────────────────────────────

export function recordSession(durationMins, hour, performanceAfter) {
  const log = loadAttentionLog();
  log.push({ ts: Date.now(), durationMins, hour, performanceAfter });
  saveAttentionLog(log);
}

export function getAttentionModel() {
  const log = loadAttentionLog();
  if (log.length < 3) {
    return {
      idealSessionMins: 25,
      focusDropMinute: 34,
      burnoutRisk: 'Low',
      bestBreakFrequency: 'Every 25 minutes',
      bestStudyHour: null,
      bestStudyWindow: 'Not enough data yet',
      retentionDropMinute: 42,
      insight: null,
    };
  }

  // Optimal session length: find where performance starts dropping
  const byDuration = [...log].sort((a, b) => a.durationMins - b.durationMins);
  const shortSessions = byDuration.filter(s => s.durationMins <= 30);
  const longSessions = byDuration.filter(s => s.durationMins > 30);
  const shortPerf = shortSessions.length > 0 ? shortSessions.reduce((s, l) => s + (l.performanceAfter || 70), 0) / shortSessions.length : 75;
  const longPerf = longSessions.length > 0 ? longSessions.reduce((s, l) => s + (l.performanceAfter || 65), 0) / longSessions.length : 65;

  const avgDuration = log.reduce((s, l) => s + l.durationMins, 0) / log.length;
  const idealSessionMins = Math.round(clamp(
    shortPerf > longPerf ? avgDuration * 0.75 : avgDuration,
    15, 60
  ));
  const focusDropMinute = Math.round(idealSessionMins * 1.2);
  const retentionDropMinute = Math.round(idealSessionMins * 1.5);

  // Burnout risk: sessions > 3h in last 3 days
  const recent3Days = log.filter(s => daysSince(s.ts) <= 3);
  const totalRecentMins = recent3Days.reduce((s, l) => s + l.durationMins, 0);
  const burnoutRisk = totalRecentMins > 300 ? 'High' : totalRecentMins > 150 ? 'Medium' : 'Low';

  // Best study hour
  const hourBuckets = {};
  log.forEach(s => {
    if (s.hour == null) return;
    if (!hourBuckets[s.hour]) hourBuckets[s.hour] = { perf: 0, count: 0 };
    hourBuckets[s.hour].perf += (s.performanceAfter || 70);
    hourBuckets[s.hour].count += 1;
  });
  let bestHour = null, bestHourPerf = 0;
  Object.entries(hourBuckets).forEach(([h, data]) => {
    const avg = data.perf / data.count;
    if (avg > bestHourPerf) { bestHourPerf = avg; bestHour = parseInt(h); }
  });

  let bestStudyWindow = 'Not enough data yet';
  if (bestHour !== null) {
    const fmt = h => { const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; return `${h12}:00 ${ampm}`; };
    bestStudyWindow = `${fmt(bestHour)} – ${fmt((bestHour + 2) % 24)}`;
  }

  return {
    idealSessionMins,
    focusDropMinute,
    burnoutRisk,
    burnoutRiskColor: burnoutRisk === 'High' ? '#ef4444' : burnoutRisk === 'Medium' ? '#f59e0b' : '#22c55e',
    bestBreakFrequency: `Every ${Math.round(idealSessionMins * 0.8)} minutes`,
    bestStudyHour: bestHour,
    bestStudyWindow,
    retentionDropMinute,
    insight: bestHour !== null ? `You perform ${Math.round(bestHourPerf - 65)}% better during ${bestStudyWindow} study sessions.` : null,
  };
}

// ─── CONFIDENCE MODEL ─────────────────────────────────────────────────────────

export function recordPrediction(ns, predicted, actual) {
  const model = loadStudentModel();
  if (!model.subjects[ns]) model.subjects[ns] = {};
  const sub = model.subjects[ns];
  if (!sub.predictionHistory) sub.predictionHistory = [];
  sub.predictionHistory.push({ predicted, actual, ts: Date.now() });
  sub.predictionHistory = sub.predictionHistory.slice(-20);
  saveStudentModel(model);
}

export function getConfidenceCalibration(subjects) {
  const model = loadStudentModel();
  const results = [];

  subjects.forEach(s => {
    const sub = model.subjects[s.ns] || {};
    const history = sub.predictionHistory || [];
    if (history.length < 3) return;

    const avgPredicted = Math.round(history.reduce((acc, h) => acc + h.predicted, 0) / history.length);
    const avgActual = Math.round(history.reduce((acc, h) => acc + h.actual, 0) / history.length);
    const delta = avgActual - avgPredicted;

    let type = 'calibrated';
    let message = null;
    if (delta < -10) {
      type = 'overconfident';
      message = `You consistently predict ${avgPredicted}% but score ${avgActual}% in ${s.name}.`;
    } else if (delta > 10) {
      type = 'underconfident';
      message = `You underestimate yourself in ${s.name} by ${delta}%.`;
    }

    results.push({ ns: s.ns, name: s.name, avgPredicted, avgActual, delta, type, message });
  });

  return results;
}

// ─── KNOWLEDGE GRAPH ──────────────────────────────────────────────────────────

const DEPENDENCY_MAP = {
  'derivatives': ['limits', 'functions', 'algebra'],
  'integrals': ['derivatives', 'limits', 'functions'],
  'limits': ['functions', 'algebra'],
  'cell division': ['dna', 'chromosomes', 'meiosis', 'cell biology'],
  'meiosis': ['dna', 'chromosomes', 'genetics'],
  'mitosis': ['cell biology', 'dna', 'chromosomes'],
  'electrochemistry': ['oxidation', 'reduction', 'electrons', 'chemistry basics'],
  'thermodynamics': ['energy', 'heat', 'entropy', 'physics basics'],
  'genetics': ['dna', 'rna', 'protein synthesis'],
  'evolution': ['natural selection', 'genetics', 'population biology'],
  'market equilibrium': ['supply', 'demand', 'economics basics'],
  'monetary policy': ['inflation', 'interest rates', 'macroeconomics'],
};

export function getKnowledgeGraphInsights(subjects) {
  const insights = [];
  const subjectNames = subjects.map(s => s.name.toLowerCase());

  subjects.forEach(s => {
    if (s.masteryScore >= 65) return;

    // Find matching dependencies
    const nameLower = s.name.toLowerCase();
    for (const [topic, deps] of Object.entries(DEPENDENCY_MAP)) {
      if (nameLower.includes(topic) || topic.includes(nameLower.split(' ')[0])) {
        const weakDeps = deps.filter(dep => {
          const match = subjects.find(sub => sub.name.toLowerCase().includes(dep) || dep.includes(sub.name.toLowerCase()));
          return match && match.masteryScore < 60;
        });
        if (weakDeps.length > 0) {
          insights.push({
            subject: s.name,
            missing: weakDeps,
            message: `${s.name} depends on: ${weakDeps.join(', ')}. Strengthen these first.`,
          });
        }
        break;
      }
    }
  });

  return insights.slice(0, 4);
}

// ─── COACH MEMORY ─────────────────────────────────────────────────────────────

export function updateCoachMemory(subjects) {
  const model = loadStudentModel();
  const mem = model.coachMemory;

  const totalMins = parseFloat(localStorage.getItem('doomium_total_minutes') || '0');
  const sessions = parseInt(localStorage.getItem('doomium_total_sessions') || '0');
  const streak = parseInt(localStorage.getItem('doomium_streak') || '0');

  // Detect avoided subjects: low session count relative to peers
  const avgSessions = subjects.length > 0
    ? subjects.reduce((s, sub) => s + (sub.quizCount || 0), 0) / subjects.length
    : 0;
  mem.avoidedSubjects = subjects
    .filter(s => (s.quizCount || 0) < avgSessions * 0.3 && subjects.length > 1)
    .map(s => s.name);

  // Loved subjects: high engagement + high mastery
  mem.lovedSubjects = subjects
    .filter(s => s.masteryScore >= 70 && (s.quizCount || 0) >= avgSessions * 1.2)
    .map(s => s.name);

  // Stress subjects: low mastery + high quiz count (trying but failing)
  mem.stressSubjects = subjects
    .filter(s => s.masteryScore < 50 && (s.quizCount || 0) > 2)
    .map(s => s.name);

  // Strong methods
  const methods = [];
  if (subjects.some(s => s.flashcardRetention > 70)) methods.push('flashcards');
  if (subjects.some(s => s.yuccaMasteryPct > 60)) methods.push('gamified quizzing (Yucca)');
  if (subjects.some(s => s.hasFeynman)) methods.push('Feynman technique');
  if (subjects.some(s => s.hasCornell)) methods.push('Cornell notes');
  mem.strongMethods = methods;

  // Weak habits
  const habits = [];
  if (streak === 0) habits.push('inconsistent daily study');
  if (sessions > 0 && totalMins / sessions < 15) habits.push('very short sessions');
  const cramSubjects = subjects.filter(s => {
    const du = daysUntil(s.examDate);
    return du !== null && du <= 3 && s.quizCount > 0;
  });
  if (cramSubjects.length > 0) habits.push('last-minute cramming');
  mem.weakHabits = habits;

  // Behavior patterns
  const patterns = [];
  if (mem.avoidedSubjects.length > 0) {
    patterns.push(`You tend to avoid ${mem.avoidedSubjects.slice(0, 2).join(' and ')} until the week before exams.`);
  }
  if (mem.lovedSubjects.length > 0) {
    patterns.push(`You show strong engagement with ${mem.lovedSubjects.slice(0, 2).join(' and ')}.`);
  }
  const flashSubject = subjects.find(s => s.flashcardRetention > 65);
  if (flashSubject) {
    patterns.push(`You remember ${flashSubject.name} best when using flashcards.`);
  }
  const hourLog = (() => { try { return JSON.parse(localStorage.getItem('camellia_hour_log') || '{}'); } catch { return {}; } })();
  const eveningActivity = (hourLog[18] || 0) + (hourLog[19] || 0) + (hourLog[20] || 0) + (hourLog[21] || 0);
  const morningActivity = (hourLog[8] || 0) + (hourLog[9] || 0) + (hourLog[10] || 0);
  if (eveningActivity > morningActivity * 1.5 && eveningActivity > 2) {
    patterns.push('You perform better during evening study sessions.');
  }
  mem.behaviorPatterns = patterns.slice(0, 4);

  model.coachMemory = mem;
  saveStudentModel(model);
  return mem;
}

export function getCoachMemory() {
  const model = loadStudentModel();
  return model.coachMemory;
}

// ─── WEEKLY REPORT ────────────────────────────────────────────────────────────

export function generateWeeklyReport(subjects) {
  const snapshots = (() => { try { return JSON.parse(localStorage.getItem(WEEKLY_KEY) || '[]'); } catch { return []; } })();

  // Save this week's snapshot
  const thisWeek = {
    ts: Date.now(),
    subjects: subjects.map(s => ({ ns: s.ns, name: s.name, mastery: s.masteryScore, quizCount: s.quizCount || 0 })),
    totalMins: parseFloat(localStorage.getItem('doomium_total_minutes') || '0'),
    streak: parseInt(localStorage.getItem('doomium_streak') || '0'),
  };
  const newSnapshots = [...snapshots.filter(s => daysSince(s.ts) <= 56), thisWeek].slice(-8);
  localStorage.setItem(WEEKLY_KEY, JSON.stringify(newSnapshots));

  const lastWeek = snapshots[snapshots.length - 1];

  // Compute deltas
  const improved = [], declined = [];
  if (lastWeek) {
    subjects.forEach(s => {
      const prev = lastWeek.subjects?.find(p => p.ns === s.ns);
      if (prev) {
        const delta = s.masteryScore - prev.mastery;
        if (delta >= 5) improved.push({ name: s.name, delta: `+${delta}%` });
        if (delta <= -5) declined.push({ name: s.name, delta: `${delta}%` });
      }
    });
  }

  // Risks
  const risks = subjects
    .filter(s => {
      const du = daysUntil(s.examDate);
      return (du !== null && du >= 0 && du <= 14 && s.masteryScore < 65) || s.masteryScore < 40;
    })
    .map(s => {
      const du = daysUntil(s.examDate);
      return du !== null ? `${s.name} exam in ${Math.round(du)} days at ${s.masteryScore}% mastery` : `${s.name} at ${s.masteryScore}% mastery`;
    });

  // Wins
  const wins = [];
  const streak = parseInt(localStorage.getItem('doomium_streak') || '0');
  if (streak >= 3) wins.push(`${streak}-day study streak`);
  improved.forEach(i => wins.push(`${i.name} improved ${i.delta}`));
  if (subjects.some(s => s.masteryScore >= 80)) wins.push(`Strong mastery in ${subjects.filter(s => s.masteryScore >= 80).map(s => s.name).join(', ')}`);

  // Next week focus
  const nextWeekFocus = subjects
    .sort((a, b) => {
      const da = daysUntil(a.examDate), db = daysUntil(b.examDate);
      const urgA = (da !== null && da <= 14 ? 50 : 0) + (100 - a.masteryScore);
      const urgB = (db !== null && db <= 14 ? 50 : 0) + (100 - b.masteryScore);
      return urgB - urgA;
    })
    .slice(0, 2)
    .map(s => s.name);

  // Predicted outcomes
  const predictions = subjects
    .filter(s => s.examDate)
    .map(s => {
      const outcome = predictExamOutcome(s, {});
      return { name: s.name, score: outcome.score, grade: outcome.grade, risk: outcome.risk, riskColor: outcome.riskColor };
    });

  return {
    improved,
    declined,
    risks,
    wins,
    predictions,
    nextWeekFocus,
    hasLastWeek: !!lastWeek,
    totalSubjects: subjects.length,
    studiedThisWeek: Math.round((thisWeek.totalMins - (lastWeek?.totalMins || 0)) / 60 * 10) / 10,
  };
}

// ─── FULL MODEL UPDATE — call after every interaction ────────────────────────

export function updateStudentModel(subjects) {
  const model = loadStudentModel();

  subjects.forEach(s => {
    if (!model.subjects[s.ns]) model.subjects[s.ns] = {};
    const sub = model.subjects[s.ns];

    // Update mastery snapshot for velocity
    const prevMastery = sub.masteryScore;
    sub.masteryScore = s.masteryScore;
    sub.lastReviewed = s.lastReviewed || sub.lastReviewed || null;

    // Adapt half-life based on quiz trend
    if (!sub.halfLife) sub.halfLife = 10;
    if (s.quizTrend === 'improving' && s.quizCount > 3) sub.halfLife = clamp(sub.halfLife + 0.5, 5, 25);
    if (s.quizTrend === 'declining') sub.halfLife = clamp(sub.halfLife - 0.5, 3, 25);
    if (s.flashcardRetention > 75) sub.halfLife = clamp(sub.halfLife + 0.3, 5, 25);

    // Learning velocity snapshot
    if (prevMastery != null && Math.abs(s.masteryScore - prevMastery) > 0.5) {
      recordMasterySnapshot(s.ns, s.masteryScore);
    }

    // Store predicted accuracy for confidence calibration
    if (s.predictedScore != null) sub.predictedAccuracy = s.predictedScore;

    // Infer errors from quiz data
    inferErrorsFromQuizzes(s.ns);

    // Estimated hours required for mastery
    const hoursNeeded = Math.max(0, Math.round((90 - s.masteryScore) / 8));
    sub.estimatedHoursToMastery = hoursNeeded;

    // Confidence score (how reliable is the model for this subject)
    const dataPoints = (s.quizCount || 0) + (s.yuccaGames || 0) + (s.flashcardCount > 0 ? 1 : 0) + (s.activeRecallSessions > 0 ? 1 : 0);
    sub.confidenceScore = clamp(Math.round(dataPoints * 12), 0, 100);

    // Recovery rate: speed of mastery gain after a drop
    if (prevMastery && prevMastery < s.masteryScore && prevMastery < 50) {
      sub.recoveryRate = clamp((s.masteryScore - prevMastery) / Math.max(daysSince(sub.lastReviewed), 1), 0, 10);
    }
  });

  saveStudentModel(model);
  updateCoachMemory(subjects);
  return model;
}

export function getSubjectModel(ns) {
  const model = loadStudentModel();
  return model.subjects[ns] || {};
}

export function getFullStudentModel() {
  return loadStudentModel();
}
