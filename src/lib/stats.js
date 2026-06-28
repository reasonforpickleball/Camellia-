// Stats tracking helpers — all stored in localStorage

export function incrementSessions() {
  const n = parseInt(localStorage.getItem('doomium_total_sessions') || '0') + 1;
  localStorage.setItem('doomium_total_sessions', String(n));
  updateStreak();
  recordWeeklySession();
  return n;
}

export function addStudyMinutes(mins) {
  const n = parseFloat(localStorage.getItem('doomium_total_minutes') || '0') + mins;
  localStorage.setItem('doomium_total_minutes', String(n));
}

export function incrementQuizzes() {
  const n = parseInt(localStorage.getItem('doomium_total_quizzes') || '0') + 1;
  localStorage.setItem('doomium_total_quizzes', String(n));
  return n;
}

export function updateStreak() {
  const today = new Date().toDateString();
  const lastDay = localStorage.getItem('doomium_last_study_day');
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  let streak = parseInt(localStorage.getItem('doomium_streak') || '0');

  if (lastDay === today) return streak; // already counted today
  if (lastDay === yesterday) streak += 1;
  else streak = 1; // broke streak or first day

  localStorage.setItem('doomium_streak', String(streak));
  localStorage.setItem('doomium_last_study_day', today);
  return streak;
}

export function getStats() {
  const totalMins = parseFloat(localStorage.getItem('doomium_total_minutes') || '0');
  return {
    streak: parseInt(localStorage.getItem('doomium_streak') || '0'),
    hoursSaved: Math.round(totalMins / 60 * 10) / 10,
    sessions: parseInt(localStorage.getItem('doomium_total_sessions') || '0'),
    quizzes: parseInt(localStorage.getItem('doomium_total_quizzes') || '0'),
  };
}

// Weekly activity: returns array of 4 weeks { label, mins }
export function getWeeklyActivity() {
  try {
    return JSON.parse(localStorage.getItem('doomium_weekly_activity') || 'null') || buildEmptyWeeks();
  } catch {
    return buildEmptyWeeks();
  }
}

function buildEmptyWeeks() {
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weeks.push({ label, mins: 0 });
  }
  return weeks;
}

export function recordWeekMinutes(mins) {
  const weeks = getWeeklyActivity();
  // always add to current (last) week
  weeks[weeks.length - 1].mins = (weeks[weeks.length - 1].mins || 0) + mins;
  localStorage.setItem('doomium_weekly_activity', JSON.stringify(weeks));
}

// Background active-minute tracking — call every 60s while the app is open
export function tickMinuteSpent() {
  const n = Number(localStorage.getItem('camellia_minutes_spent') || 0) + 1;
  localStorage.setItem('camellia_minutes_spent', String(n));
  // also count toward current week activity so the chart reflects real usage
  const weeks = getWeeklyActivity();
  weeks[weeks.length - 1].mins = (weeks[weeks.length - 1].mins || 0) + 1;
  localStorage.setItem('doomium_weekly_activity', JSON.stringify(weeks));
  return n;
}

export function getMinutesSpent() {
  return Number(localStorage.getItem('camellia_minutes_spent') || 0);
}

// Weekly streak tracking (at least 1 session per week)
export function recordWeeklySession() {
  const weekKey = getWeekKey(new Date());
  const weeks = getActiveWeeks();
  if (!weeks.includes(weekKey)) {
    weeks.push(weekKey);
    localStorage.setItem('camellia_active_weeks', JSON.stringify(weeks.slice(-10)));
  }
}

function getWeekKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function getConsecutiveWeeks(weeks) {
  if (weeks.length < 2) return weeks.length;
  const sorted = [...weeks].sort();
  let max = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diffDays <= 8) { current++; max = Math.max(max, current); }
    else current = 1;
  }
  return max;
}

export function getActiveWeeks() {
  try { return JSON.parse(localStorage.getItem('camellia_active_weeks') || '[]'); } catch { return []; }
}

export function getWeekStreakInfo() {
  const weeks = getActiveWeeks();
  const consecutive = getConsecutiveWeeksCurrent(weeks);
  const badgeDismissed = parseInt(localStorage.getItem('camellia_badge_dismissed') || '0');
  return { consecutive, badgeDismissed };
}

// Returns consecutive weeks ENDING at the current week (not historical max)
function getConsecutiveWeeksCurrent(weeks) {
  if (weeks.length === 0) return 0;
  const sorted = [...weeks].sort().reverse(); // newest first
  const currentWeek = getWeekKey(new Date());
  // Find how many consecutive weeks back from now
  let count = 0;
  let expected = currentWeek;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] === expected) {
      count++;
      // Go back one week
      const d = new Date(expected);
      d.setDate(d.getDate() - 7);
      expected = getWeekKey(d);
    } else {
      break;
    }
  }
  return count;
}

export function dismissStreakBadge(weeks) {
  localStorage.setItem('camellia_badge_dismissed', String(weeks));
}
