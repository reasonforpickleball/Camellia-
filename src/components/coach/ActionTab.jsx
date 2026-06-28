import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';
import {
  buildAllSubjects,
  inferLearningProfile,
  generatePriorityPlan,
  getOverallReadiness,
  getReadinessLabel,
} from '../../lib/coachIntelligence';
import { aiAsk, isAIConfigured } from '../../lib/aiClient';

const FONT = "'Roboto', Arial, sans-serif";

function daysUntil(ts) {
  if (!ts) return null;
  return Math.round((ts - Date.now()) / 86400000);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

// Glass card wrapper
function GlassCard({ children, dark, accent, style = {}, theme }) {
  const isRed = theme === 'red';
  const bg = dark ? (isRed ? 'rgba(30,5,5,0.72)' : 'rgba(28,14,46,0.72)') : 'rgba(255,255,255,0.60)';
  const border = accent
    ? `1.5px solid ${accent}55`
    : (dark ? (isRed ? '1px solid rgba(180,20,20,0.35)' : '1px solid rgba(123,45,110,0.35)') : '1px solid rgba(200,180,220,0.55)');
  return (
    <div style={{
      backdropFilter: 'blur(24px) saturate(160%)',
      WebkitBackdropFilter: 'blur(24px) saturate(160%)',
      background: bg,
      border,
      borderRadius: 20,
      boxShadow: dark
        ? '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,140,255,0.08)'
        : '0 8px 32px rgba(180,140,120,0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ title, color }) {
  return (
    <p style={{
      fontFamily: FONT, fontSize: '0.62rem', fontWeight: 800,
      letterSpacing: '0.16em', textTransform: 'uppercase',
      color: color || '#7b2d6e', margin: '0 0 14px',
    }}>{title}</p>
  );
}

export default function ActionTab() {
  const { dark, theme } = useDarkMode();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiMotto, setAiMotto] = useState('');
  // Load cached subject names from localStorage so they don't regenerate on every tab switch
  const [aiSubjectNames, setAiSubjectNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem('camellia_ai_subject_names') || '{}'); } catch { return {}; }
  });

  const firstName = (localStorage.getItem('doomium_user_name') || 'Student').split(' ')[0];
  const isRed = theme === 'red';
  const textPrimary = dark ? (isRed ? '#ffe8e8' : '#f0e8ff') : '#12091e';
  const textSecondary = dark ? (isRed ? '#cc8888' : '#9878c0') : '#5a4a72';
  const divider = dark ? (isRed ? 'rgba(180,20,20,0.25)' : 'rgba(123,45,110,0.25)') : 'rgba(180,140,200,0.2)';
  const accentColor = isRed ? '#cc2222' : '#7b2d6e';
  const accentLight = isRed ? '#ff6666' : (dark ? '#c77dff' : '#7b2d6e');

  useEffect(() => {
    const subjects = buildAllSubjects();
    const profile = inferLearningProfile(subjects);
    const plan = generatePriorityPlan(subjects);
    const overall = getOverallReadiness(subjects);

    const sorted = [...subjects].sort((a, b) => {
      const da = a.examDate ? daysUntil(a.examDate) : 999;
      const db2 = b.examDate ? daysUntil(b.examDate) : 999;
      if (da !== db2) return da - db2;
      return a.masteryScore - b.masteryScore;
    });

    const nearest = sorted.find(s => s.examDate && daysUntil(s.examDate) >= 0);

    const trending = subjects.find(s => s.quizTrend !== 'none');
    const trendStr = trending
      ? trending.quizTrend === 'improving' ? '+3% this week' : trending.quizTrend === 'declining' ? '-2% this week' : 'Stable this week'
      : null;

    // Observations
    const obs = [];
    subjects.forEach(s => {
      const du = daysUntil(s.forgettingDate);
      if (du !== null && du >= 0 && du <= 3) {
        obs.push(`You are predicted to forget ${s.name} material in ${du === 0 ? 'less than a day' : `${du} day${du !== 1 ? 's' : ''}`}. Review it tonight.`);
      }
    });
    const streak = parseInt(localStorage.getItem('doomium_streak') || '0');
    if (streak >= 3) obs.push(`You have completed ${streak} study days in a row. Keep it going.`);

    const hourLog = (() => { try { return JSON.parse(localStorage.getItem('camellia_hour_log') || '{}'); } catch { return {}; } })();
    let bestHour = -1, maxAct = 0;
    for (const [h, c] of Object.entries(hourLog)) { if (c > maxAct) { maxAct = c; bestHour = parseInt(h); } }
    if (bestHour >= 0) {
      const h12 = bestHour % 12 || 12, ampm = bestHour >= 12 ? 'PM' : 'AM';
      const end = (bestHour + 2) % 24, endH12 = end % 12 || 12, endAmpm = end >= 12 ? 'PM' : 'AM';
      obs.push(`You study best between ${h12}:00 ${ampm} and ${endH12}:00 ${endAmpm}.`);
    }
    subjects.forEach(s => {
      if (s.lastReviewed) {
        const daysSince = Math.round((Date.now() - s.lastReviewed) / 86400000);
        if (daysSince >= 7) obs.push(`You have not opened ${s.name} in ${daysSince} days.`);
      }
    });
    subjects.forEach(s => {
      if (s.flashcardCount > 5 && s.quizAccuracy && s.quizAccuracy >= 70) {
        obs.push(`You perform significantly better on ${s.name} quizzes after flashcard sessions.`);
      }
    });

    // Study actions
    const actions = [];
    sorted.forEach(s => {
      const du = s.examDate ? daysUntil(s.examDate) : null;
      const forgetsIn = s.forgettingDate ? daysUntil(s.forgettingDate) : null;
      if (forgetsIn !== null && forgetsIn <= 2) {
        actions.push({ subject: s.name, reason: `Predicted forgetting event in ${forgetsIn <= 0 ? 'less than a day' : `${forgetsIn} day${forgetsIn !== 1 ? 's' : ''}`}.` });
      } else if (s.quizCount === 0 && s.flashcardCount === 0) {
        actions.push({ subject: s.name, reason: `No quiz data yet. Take a diagnostic to calibrate your starting point.` });
      } else if (s.masteryScore < 50) {
        actions.push({ subject: s.name, reason: `Mastery is at ${s.masteryScore}%, below the minimum needed to retain exam material.` });
      } else if (s.quizTrend === 'declining') {
        actions.push({ subject: s.name, reason: `Quiz scores have been declining over recent sessions. Switch to active recall.` });
      } else if (du !== null && du <= 7) {
        actions.push({ subject: s.name, reason: `Exam is in ${du} day${du !== 1 ? 's' : ''}. Run a full practice test.` });
      }
    });

    // Next exam briefing
    let examBriefing = null;
    if (nearest) {
      const label = getReadinessLabel(nearest.masteryScore);
      const toA = Math.max(0, 87 - nearest.masteryScore);
      const minsNeeded = Math.round(toA * 3);
      const quizzesNeeded = Math.ceil(toA / 8);
      const du = daysUntil(nearest.examDate);
      examBriefing = {
        name: nearest.name,
        daysAway: du,
        readiness: nearest.masteryScore,
        predictedGrade: label.letter,
        confidence: Math.round(Math.min(95, 50 + nearest.masteryScore * 0.5)),
        toA: toA > 0 ? [
          `Complete ${quizzesNeeded} full practice quiz${quizzesNeeded !== 1 ? 'zes' : ''}`,
          `Study ${minsNeeded} more minutes on weak topics`,
          toA > 20 ? 'Focus on your lowest-scoring topic first' : 'Review your recent mistakes',
        ] : ['You are on track for an A. Maintain your current pace.'],
        goalMet: toA <= 0,
      };
    }

    // Enrich subject display names from goal text
    const namedSubjects = sorted.map(s => {
      const goal = localStorage.getItem(`camellia_${s.ns}_planner_goal`) || '';
      const displayName = goal && goal.length < 60 && goal.length > 3 ? goal : s.name;
      return { ...s, displayName };
    });

    setBriefing({
      subjects: namedSubjects,
      sorted: namedSubjects,
      plan: plan.map(p => {
        const goal = localStorage.getItem(`camellia_${p.ns}_planner_goal`) || '';
        const displayName = goal && goal.length < 60 && goal.length > 3 ? goal : p.name;
        return { ...p, displayName };
      }),
      profile, overall, nearest, trendStr,
      obs: obs.slice(0, 5),
      actions: actions.slice(0, 5),
      examBriefing,
      weakTopics: profile?.weakTopics || [],
      streak,
    });

    // AI motto — uses user's own API key
    if (subjects.length > 0 && isAIConfigured()) {
      const subSummary = subjects.map(s => `${s.name}: ${s.masteryScore}% mastery`).join(', ');
      const nearExam = nearest ? `nearest exam: ${nearest.name} in ${daysUntil(nearest.examDate)} days` : 'no exam date set';
      aiAsk(
        `You are a private tutor writing one motivational closing sentence for a student's daily study briefing. It MUST be specific to their data, never generic. Write ONE sentence (max 14 words). Direct, punchy, and personal. Do not start with "You". No em-dashes. Use commas instead if needed.`,
        `Student data: ${subSummary}. ${nearExam}. Streak: ${streak} days. Overall readiness: ${overall}%.`,
        { maxTokens: 60 }
      ).then(text => {
        if (text) setAiMotto(text.replace(/^["']|["']$/g, '').trim());
      }).catch(() => {
        if (nearest) setAiMotto(`${nearest.name} in ${daysUntil(nearest.examDate)} days, make today count.`);
        else if (streak > 0) setAiMotto(`${streak} days in a row. Don't stop now.`);
        else setAiMotto('Start the session. Everything else follows.');
      });

      // AI-identify real subject names — skip if already cached
      const cachedNames = (() => { try { return JSON.parse(localStorage.getItem('camellia_ai_subject_names') || '{}'); } catch { return {}; } })();
      subjects.forEach(s => {
        if (cachedNames[s.ns]) return; // already identified, don't re-run
        const raw = (localStorage.getItem(`camellia_${s.ns}_raw_material`) || '').slice(0, 1500);
        if (!raw || raw.length < 100) return;
        aiAsk(
          `Identify the specific academic subject and topic from this study material. Be concise, like "AP Chemistry, Thermodynamics" or "World History, WWI Causes". Max 8 words, return only the name.`,
          `MATERIAL:\n${raw}`,
          { maxTokens: 30 }
        ).then(name => {
          name = name.replace(/^["']|["']$/g, '').trim();
          if (name && name.length > 2 && name.length < 80) {
            setAiSubjectNames(prev => {
              const updated = { ...prev, [s.ns]: name };
              localStorage.setItem('camellia_ai_subject_names', JSON.stringify(updated));
              return updated;
            });
          }
        }).catch(() => {});
      });
    } else if (subjects.length > 0) {
      if (nearest) setAiMotto(`${nearest.name} in ${daysUntil(nearest.examDate)} days, make today count.`);
      else if (streak > 0) setAiMotto(`${streak} days in a row. Don't stop now.`);
      else setAiMotto('Start the session. Everything else follows.');
    } else {
      setAiMotto('Upload your material and let the Coach build your plan.');
    }

    setLoading(false);
  }, []);

  // Merge AI names into briefing
  const displayName = (s) => aiSubjectNames[s.ns] || s.displayName || s.name;

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary }}>Building...</p>
      </div>
    );
  }

  if (!briefing || briefing.subjects.length === 0) {
    return (
      <div style={{ padding: '48px 0', maxWidth: 600 }}>
        <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.8rem', color: textPrimary, marginBottom: 14 }}>{getGreeting()}, {firstName}.</p>
        <p style={{ fontFamily: FONT, fontSize: '1rem', color: textSecondary, lineHeight: 1.85 }}>
          Open a study tab, go to <strong>AI Study Planner</strong>, upload your notes, and return here for your briefing.
        </p>
      </div>
    );
  }

  const { subjects, sorted, plan, profile, overall, nearest, trendStr, obs, actions, examBriefing, weakTopics, streak } = briefing;
  const totalPlanMins = plan.reduce((s, t) => s + (t.mins || 0), 0);
  const predictedOverall = Math.min(99, overall + Math.round(totalPlanMins / 12));

  return (
    <div style={{ fontFamily: FONT, paddingBottom: 40, maxWidth: 860, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.1rem', color: accentLight, margin: '0 0 4px', fontStyle: 'italic', letterSpacing: '0.01em' }}>
          Discipline + Direction &gt; Talent
        </p>
      </div>

      {/* ── EXAM STATUS + READINESS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        <GlassCard dark={dark} theme={theme} accent={accentColor} style={{ padding: '24px 28px' }}>
          <SectionLabel title="Exam Status" color={accentColor} />
          {nearest ? (
            <>
              <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.25rem', color: textPrimary, margin: '0 0 6px', lineHeight: 1.3 }}>
                {displayName(nearest)} in {daysUntil(nearest.examDate)} day{daysUntil(nearest.examDate) !== 1 ? 's' : ''}.
              </p>
              {sorted.filter(s => s.examDate && daysUntil(s.examDate) >= 0).slice(1, 3).map((s, i) => (
                <p key={i} style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, margin: '4px 0 0', paddingLeft: 12 }}>
                  {displayName(s)}, {daysUntil(s.examDate)}d
                </p>
              ))}
            </>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: '0.92rem', color: textSecondary, margin: 0 }}>No exam dates detected. Add them in your planner.</p>
          )}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${divider}` }}>
            <span style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary }}>Overall readiness: </span>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1rem', color: overall >= 70 ? '#22c55e' : overall >= 50 ? '#f59e0b' : '#ef4444' }}>{overall}%</span>
            {trendStr && <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}> ({trendStr})</span>}
          </div>
        </GlassCard>

        <GlassCard dark={dark} theme={theme} style={{ padding: '24px 28px' }}>
          <SectionLabel title="Predicted Readiness" color={accentColor} />
          <div style={{ fontFamily: "'Space Mono', monospace", lineHeight: 2.1 }}>
            {sorted.map((s, i) => {
              const pct = s.masteryScore;
              const col = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
              const label = displayName(s);
              const dots = '·'.repeat(10);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
                  <span style={{ minWidth: 0, flex: 1, fontSize: '0.85rem', color: textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                  <span style={{ color: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)', letterSpacing: 3, fontSize: '0.85rem' }}>{dots}</span>
                  <span style={{ fontWeight: 800, color: col, marginLeft: 10, minWidth: 42, fontSize: '0.88rem' }}>{pct}%</span>
                  {s.examDate && <span style={{ fontSize: '0.68rem', color: textSecondary, marginLeft: 8 }}>{daysUntil(s.examDate)}d</span>}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* ── OBSERVATIONS ── */}
      {obs.length > 0 && (
        <GlassCard dark={dark} theme={theme} style={{ padding: '24px 28px', marginBottom: 20 }}>
          <SectionLabel title="What I Have Noticed" color={accentColor} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {obs.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, flexShrink: 0, marginTop: 7 }} />
                <p style={{ fontFamily: FONT, fontSize: '0.97rem', color: textPrimary, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{o}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── TODAY'S PRIORITY ── */}
      <GlassCard dark={dark} theme={theme} accent={accentColor} style={{ padding: '24px 28px', marginBottom: 20 }}>
        <SectionLabel title="Today's Priority" color={accentColor} />
        {plan.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: '0.95rem', color: textSecondary, margin: 0 }}>All subjects are well-maintained. Come back tomorrow for your next review.</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {plan.map((task, i) => (
                <div key={i} style={{
                  padding: '18px 0',
                  borderBottom: i < plan.length - 1 ? `1px solid ${divider}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: accentColor, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT, fontWeight: 900, fontSize: '0.9rem',
                    }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.05rem', color: textPrimary, margin: '0 0 4px' }}>
                        {displayName(task)}, {task.mins} min
                      </p>
                      <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: '0 0 3px', lineHeight: 1.5 }}>
                        Why: {task.reason}
                      </p>
                      <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: accentLight, margin: 0, fontWeight: 600 }}>
                        Impact: {task.impact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPlanMins > 0 && (
              <div style={{
                marginTop: 16, padding: '14px 18px',
                backdropFilter: 'blur(12px)',
                background: dark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.07)',
                border: '1.5px solid rgba(34,197,94,0.3)',
                borderRadius: 12,
              }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: '#22c55e', margin: '0 0 6px' }}>
                  If you complete today's plan ({totalPlanMins} min):
                </p>
                {plan.map((task, i) => (
                  <p key={i} style={{ fontFamily: FONT, fontSize: '0.85rem', color: textPrimary, margin: '0 0 2px', paddingLeft: 12 }}>
                    {displayName(task)} rises to ~{Math.min(99, task.masteryScore + Math.round(task.mins / 4))}%
                  </p>
                ))}
                <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textPrimary, margin: '2px 0 0', paddingLeft: 12 }}>
                  Overall readiness rises to ~{predictedOverall}%
                </p>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* ── STUDY ACTIONS ── */}
      {actions.length > 0 && (
        <GlassCard dark={dark} theme={theme} style={{ padding: '24px 28px', marginBottom: 20 }}>
          <SectionLabel title="Study Actions" color={accentColor} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {actions.map((a, i) => (
              <div key={i} style={{
                padding: '16px 0',
                borderBottom: i < actions.length - 1 ? `1px solid ${divider}` : 'none',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : accentColor,
                  flexShrink: 0, marginTop: 8,
                }} />
                <div>
                  <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: textPrimary, margin: '0 0 4px' }}>Study {a.subject}</p>
                  <p style={{ fontFamily: FONT, fontSize: '0.87rem', color: textSecondary, margin: 0, lineHeight: 1.55 }}>Reason: {a.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── LEARNING PROFILE + NEXT EXAM ── */}
      <div style={{ display: 'grid', gridTemplateColumns: profile ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>

        {profile && (
          <GlassCard dark={dark} theme={theme} style={{ padding: '24px 28px' }}>
            <SectionLabel title="Your Learning Profile" color={accentColor} />
            {[
              profile.bestStudyTime !== 'Not enough data yet' && { label: 'Best study time', value: profile.bestStudyTime },
              profile.learningStyle !== 'Building profile...' && { label: 'Learning style', value: profile.learningStyle },
              profile.attentionSpan > 0 && { label: 'Attention span', value: `${profile.attentionSpan} minutes` },
              profile.avgForgettingDays > 0 && { label: 'Avg forgetting period', value: `${profile.avgForgettingDays} days` },
            ].filter(Boolean).map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: `1px solid ${divider}` }}>
                <span style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary }}>{row.label}</span>
                <span style={{ fontFamily: FONT, fontSize: '0.88rem', fontWeight: 700, color: textPrimary }}>{row.value}</span>
              </div>
            ))}
            {weakTopics.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weakest subjects</p>
                {weakTopics.map((t, i) => (
                  <p key={i} style={{ fontFamily: FONT, fontSize: '0.88rem', color: '#ef4444', margin: '0 0 3px', paddingLeft: 8 }}>- {t}</p>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {examBriefing && (
          <GlassCard dark={dark} theme={theme} accent="#ef4444" style={{ padding: '24px 28px' }}>
            <SectionLabel title={`Next Exam, ${examBriefing.name}`} color={accentColor} />
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: '0 0 14px' }}>
              {examBriefing.daysAway} day{examBriefing.daysAway !== 1 ? 's' : ''} away
            </p>
            {[
              { label: 'Current readiness', value: `${examBriefing.readiness}%`, col: examBriefing.readiness >= 70 ? '#22c55e' : examBriefing.readiness >= 50 ? '#f59e0b' : '#ef4444' },
              { label: 'Predicted grade', value: examBriefing.predictedGrade },
              { label: 'Confidence', value: `${examBriefing.confidence}%` },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${divider}` }}>
                <span style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary }}>{row.label}</span>
                <span style={{ fontFamily: FONT, fontSize: '0.9rem', fontWeight: 800, color: row.col || textPrimary }}>{row.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: textPrimary, margin: '0 0 8px' }}>
                {examBriefing.goalMet ? 'On track for an A:' : 'To reach an A:'}
              </p>
              {examBriefing.toA.map((item, i) => (
                <p key={i} style={{ fontFamily: FONT, fontSize: '0.87rem', color: textSecondary, margin: '0 0 4px', paddingLeft: 10 }}>- {item}</p>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      {/* ── DAILY MOTTO ── */}
      <GlassCard dark={dark} theme={theme} accent={accentColor} style={{ padding: '22px 28px' }}>
        <p style={{
          fontFamily: FONT, fontSize: '1.1rem', fontWeight: 700,
          color: accentLight, lineHeight: 1.55, margin: 0,
          fontStyle: 'italic',
        }}>
          {aiMotto || '...'}
        </p>
      </GlassCard>

    </div>
  );
}
