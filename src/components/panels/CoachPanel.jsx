import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';
import DiagnosticQuiz from './DiagnosticQuiz';
import {
  buildSubjectsFromSessions,
  generateDailyPlan,
  getDiagnosticTasks,
  recordTaskComplete,
  getSubjectReadiness,
  computeMastery,
  computeScoreBreakdown,
  exportCoachData,
  importCoachData,
  logEvent,
  getReview,
  predictExamReadiness,
  getWeakestPattern,
} from '../../lib/coachEngine';

const FONT = "'Roboto', Arial, sans-serif";

function daysSinceLabel(ts) {
  if (!ts) return 'Never';
  const d = Math.round((Date.now() - ts) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function daysUntilLabel(ts) {
  if (!ts) return null;
  const d = Math.round((ts - Date.now()) / 86400000);
  if (d < 0) return 'Past';
  if (d === 0) return 'Today';
  return `${d}d`;
}

function MasteryBar({ score, color }) {
  return (
    <div style={{ height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${score}%`, background: color || '#7b2d6e', borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  );
}

function ScoreBadge({ score }) {
  const bg = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#22c55e';
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: bg, color: 'white', borderRadius: 8, padding: '1px 8px', flexShrink: 0 }}>
      {score}%
    </span>
  );
}

// ── Explanation Trace Panel ──────────────────────────────────────────────────

function ScoreBreakdownPanel({ breakdown, dark }) {
  if (!breakdown) return null;
  const bg = dark ? 'rgba(10,4,20,0.85)' : 'rgba(248,244,255,0.95)';
  const borderCol = dark ? 'rgba(90,40,130,0.5)' : '#ddd0f5';
  const textPrimary = dark ? '#e8d5ff' : '#2D1B0E';
  const textSecondary = dark ? '#a080c0' : '#7A6A5A';

  return (
    <div style={{ background: bg, border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: dark ? '#c77dff' : '#7b2d6e', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score Breakdown</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {breakdown.signals.map((sig, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: sig.direction === 'negative' ? '#ef4444' : '#22c55e', flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, flex: 1 }}>{sig.label}</span>
            <span style={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, color: textPrimary, flexShrink: 0 }}>{sig.value}</span>
            <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: sig.direction === 'negative' ? '#ef4444' : '#22c55e', flexShrink: 0, width: 36, textAlign: 'right' }}>
              {sig.direction === 'negative' ? '-' : '+'}{sig.contribution}
            </span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${borderCol}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 700, color: textPrimary }}>Priority score</span>
        <span style={{ fontFamily: FONT, fontSize: '0.88rem', fontWeight: 700, color: dark ? '#c77dff' : '#7b2d6e' }}>{breakdown.priority}/100</span>
      </div>
      {breakdown.contradiction && (
        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: dark ? 'rgba(245,158,11,0.12)' : '#fffbeb', border: '1px solid #f59e0b' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#b45309', margin: 0 }}>
            Conflicting signals detected — quiz and Yucca performance diverge by more than 30%. Increase sample size before trusting either alone.
          </p>
        </div>
      )}
      {breakdown.examOverride && (
        <div style={{ marginTop: 6, padding: '5px 10px', borderRadius: 7, background: dark ? 'rgba(239,68,68,0.12)' : '#fff1f1', border: '1px solid #ef4444' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#dc2626', margin: 0, fontWeight: 700 }}>
            EXAM OVERRIDE — forced to top priority regardless of mastery score.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onComplete, dark }) {
  const [done, setDone] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const cardBg = dark ? 'rgba(22,14,36,0.85)' : 'white';
  const border = task.isDiagnostic
    ? (dark ? '1.5px dashed rgba(245,158,11,0.6)' : '1.5px dashed #f59e0b')
    : (dark ? '1.5px solid rgba(123,45,110,0.5)' : '1.5px solid #E8D8F0');
  const textColor = done ? (dark ? '#6a4a7a' : '#ccc') : (dark ? '#e8d5ff' : '#2D1B0E');
  const textSecondary = dark ? '#a080c0' : '#7A6A5A';

  const mode = task.recommendedMode;

  return (
    <div style={{ background: cardBg, border, borderRadius: 14, padding: '16px 20px', marginBottom: 12, opacity: done ? 0.55 : 1, transition: 'opacity 0.3s', backdropFilter: 'blur(16px)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: textColor, textDecoration: done ? 'line-through' : 'none' }}>
              {task.topicName}
            </span>
            <span style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary }}>({task.time})</span>
            {!task.isDiagnostic && <ScoreBadge score={task.masteryScore} />}
            {task.isDiagnostic && (
              <span style={{ fontFamily: FONT, fontSize: '0.7rem', background: '#f59e0b', color: 'white', borderRadius: 8, padding: '1px 8px' }}>Diagnostic</span>
            )}
            {task.examDate && !task.examDateStale && (
              <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
                Exam: {daysUntilLabel(task.examDate)}
              </span>
            )}
            {task.examDateStale && (
              <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic' }}>
                (exam date stale)
              </span>
            )}
          </div>

          {/* Stats row */}
          {!task.isDiagnostic && (
            <div style={{ display: 'flex', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
              {task.quizAccuracy !== null && (
                <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary }}>
                  Quiz: <strong style={{ color: task.quizAccuracy < 60 ? '#ef4444' : '#22c55e' }}>{task.quizAccuracy}%</strong>
                  {task.quizTrend && task.quizTrend !== 'none' && (
                    <span style={{ color: task.quizTrend === 'improving' ? '#22c55e' : task.quizTrend === 'declining' ? '#ef4444' : textSecondary, marginLeft: 4 }}>
                      {task.quizTrend === 'improving' ? '(up)' : task.quizTrend === 'declining' ? '(down)' : ''}
                    </span>
                  )}
                  {task.quizCount > 0 && <span style={{ opacity: 0.65, marginLeft: 4 }}>({task.quizCount})</span>}
                </span>
              )}
              {task.yuccaMasteryPct !== null && (
                <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary }}>
                  Yucca: <strong style={{ color: task.yuccaMasteryPct < 50 ? '#ef4444' : '#22c55e' }}>{task.yuccaMasteryPct}%</strong>
                </span>
              )}
            </div>
          )}

          {/* Reason */}
          <p style={{ fontFamily: FONT, fontSize: '0.82rem', fontStyle: 'italic', color: textSecondary, margin: '0 0 8px', lineHeight: 1.5 }}>
            {task.reason}
          </p>

          {/* Recommended mode pill */}
          {mode && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: dark ? 'rgba(123,45,110,0.2)' : '#f3e8ff', border: `1px solid ${dark ? 'rgba(123,45,110,0.5)' : '#c4a0e0'}`, borderRadius: 20, padding: '3px 10px', marginBottom: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: dark ? '#c77dff' : '#7b2d6e' }}>{mode.label}</span>
              <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: dark ? '#a080c0' : '#9A8A7A' }}>{mode.desc}</span>
            </div>
          )}

          {/* Trace toggle */}
          {task.breakdown && (
            <button
              onClick={() => setShowTrace(s => !s)}
              style={{ background: 'none', border: 'none', padding: 0, fontFamily: FONT, fontSize: '0.72rem', color: dark ? '#8060a0' : '#b090d0', cursor: 'pointer', textDecoration: 'underline', marginTop: 2 }}
            >
              {showTrace ? 'Hide score trace' : 'Show score trace'}
            </button>
          )}

          {showTrace && <ScoreBreakdownPanel breakdown={task.breakdown} dark={dark} />}
        </div>

        {/* Action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {!done ? (
            <button
              onClick={() => { setDone(true); onComplete(task.topicId); }}
              style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >Mark Done</button>
          ) : (
            <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#22c55e', fontWeight: 700 }}>Done</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export default function CoachPanel() {
  const { dark } = useDarkMode();
  const [subjects, setSubjects] = useState([]);
  const [plan, setPlan] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [readiness, setReadiness] = useState([]);
  const [showImportConfirm, setShowImportConfirm] = useState(null);
  const [importJson, setImportJson] = useState(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const importRef = useRef();

  const load = useCallback(() => {
    const subs = buildSubjectsFromSessions();
    setSubjects(subs);
    const dailyPlan = generateDailyPlan(subs);
    setPlan(dailyPlan);
    setDiagnostics(getDiagnosticTasks(subs));
    setReadiness(getSubjectReadiness(subs));
  }, []);

  useEffect(() => {
    load();
    logEvent('planViewed', { timestamp: Date.now() });
  }, [load]);

  const handleComplete = (topicId) => {
    recordTaskComplete(topicId, 4);
    load();
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImportJson(ev.target.result); setShowImportConfirm('merge'); };
    reader.readAsText(file);
  };

  const handleImportConfirm = (mode) => {
    try { importCoachData(importJson, mode); load(); setShowImportConfirm(null); setImportJson(null); }
    catch { alert('Invalid backup file.'); }
  };

  const textPrimary = dark ? '#e8d5ff' : '#2D1B0E';
  const textSecondary = dark ? '#c4a0e0' : '#7A6A5A';
  const cardBg = dark ? 'rgba(22,14,36,0.75)' : 'rgba(255,255,255,0.8)';
  const borderCol = dark ? 'rgba(90,40,130,0.35)' : '#E5D8C8';
  const glass = { backdropFilter: 'blur(16px) saturate(150%)' };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const nextExam = subjects.reduce((min, s) => {
    if (!s.examDate) return min;
    if (!min || s.examDate < min) return s.examDate;
    return min;
  }, null);
  const totalTime = plan.reduce((s, t) => s + (t.timeMin || parseInt(t.time) || 0), 0);

  // Check if any study material exists in any namespace
  const hasMaterialAnywhere = (() => {
    const nsList = ['default'];
    try { JSON.parse(localStorage.getItem('doomium_topics') || '[]').forEach(t => { if (t && !nsList.includes(t)) nsList.push(t); }); } catch {}
    return nsList.some(ns =>
      localStorage.getItem(`camellia_${ns}_raw_material`) ||
      localStorage.getItem(`camellia_${ns}_planner_filename`) ||
      localStorage.getItem(`camellia_${ns}_recent_quizzes`)
    );
  })();

  const noMaterial = !hasMaterialAnywhere;

  // Show diagnostics in the plan slot when there's material but no real plan
  const allTasks = plan.length > 0 ? plan : (diagnostics.length > 0 ? diagnostics : []);

  return (
    <div className="fade-in" style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 16, padding: '20px 24px', marginBottom: 20, ...glass }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.4rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 4px' }}>Today's Study Plan</h2>
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: 0 }}>{today}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowDiagnostic(true)}
              style={{ background: dark ? 'rgba(123,45,110,0.25)' : '#f3e8ff', color: dark ? '#c77dff' : '#7b2d6e', border: `1.5px solid ${dark ? 'rgba(123,45,110,0.5)' : '#c4a0e0'}`, borderRadius: 10, padding: '7px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >Run Diagnostic</button>
            {nextExam && (
              <div style={{ textAlign: 'center', background: dark ? 'rgba(239,68,68,0.15)' : '#fff1f1', border: '1.5px solid #ef4444', borderRadius: 10, padding: '6px 14px' }}>
                <p style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Exam</p>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: '#ef4444', margin: 0 }}>{daysUntilLabel(nextExam)}</p>
              </div>
            )}
            {totalTime > 0 && (
              <div style={{ textAlign: 'center', background: dark ? 'rgba(123,45,110,0.2)' : '#f3e8ff', border: '1.5px solid #7b2d6e', borderRadius: 10, padding: '6px 14px' }}>
                <p style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#7b2d6e', fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</p>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: dark ? '#c77dff' : '#7b2d6e', margin: 0 }}>{totalTime} min</p>
              </div>
            )}
          </div>
        </div>

        {/* Readiness bars */}
        {readiness.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {readiness.map(r => (
              <div key={r.subject} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, flexShrink: 0, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</span>
                <MasteryBar score={r.avg} color={r.avg >= 70 ? '#22c55e' : r.avg >= 40 ? '#f59e0b' : '#ef4444'} />
                <span style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: textPrimary, flexShrink: 0, width: 36, textAlign: 'right' }}>{r.avg}%</span>
                {r.readiness && (
                  <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, flexShrink: 0, width: 60, textAlign: 'right', fontStyle: 'italic' }}>{r.readiness.label}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Priority tasks */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: dark ? '#c77dff' : '#4A3525', margin: 0 }}>
            Priority Tasks {allTasks.length > 0 && `(${allTasks.length})`}
          </h3>
          {plan.length === 0 && diagnostics.length > 0 && (
            <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic' }}>No history yet — showing diagnostic tasks</span>
          )}
        </div>

        {noMaterial ? (
          <div style={{ background: cardBg, border: `2px dashed ${borderCol}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', ...glass }}>
            <p style={{ fontFamily: FONT, fontSize: '1rem', color: textPrimary, marginBottom: 8 }}>No study material found yet.</p>
            <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, margin: 0 }}>
              Go to <strong>AI Study Planner</strong>, upload your material and generate your plan. The coach will automatically build your daily tasks from quiz scores, Yucca performance, and exam dates.
            </p>
          </div>
        ) : allTasks.length === 0 ? (
          <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', ...glass }}>
            <p style={{ fontFamily: FONT, fontSize: '1rem', color: textPrimary, margin: '0 0 8px' }}>All subjects are well-mastered.</p>
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: '0 0 16px' }}>Come back tomorrow for your next review session.</p>
            <button onClick={() => setShowDiagnostic(true)} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: FONT, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
              Run Knowledge Diagnostic
            </button>
          </div>
        ) : (
          allTasks.map(task => (
            <TaskCard key={task.topicId} task={task} onComplete={handleComplete} dark={dark} />
          ))
        )}
      </div>

      {/* All subjects overview with readiness + pattern */}
      {subjects.length > 0 && (
        <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 16, padding: '20px 24px', marginBottom: 20, ...glass }}>
          <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 14px' }}>All Subjects</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {subjects.map(s => {
              const mastery = Math.round(computeMastery(s));
              const review = getReview(s.ns);
              const daysToNext = review.nextReview ? Math.max(0, Math.round((review.nextReview - Date.now()) / 86400000)) : 0;
              const readinessInfo = predictExamReadiness(s);
              const pattern = getWeakestPattern(s);

              return (
                <div key={s.ns} style={{ borderBottom: `1px solid ${borderCol}`, paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: textPrimary, margin: 0, flex: 1 }}>{s.name}</p>
                    {s.examDate && !s.examDateStale && (
                      <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>Exam: {daysUntilLabel(s.examDate)}</span>
                    )}
                    <ScoreBadge score={mastery} />
                    {s.examDate && (
                      <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, fontStyle: 'italic' }}>
                        Predicted: {readinessInfo.label}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <MasteryBar score={mastery} color={mastery >= 70 ? '#22c55e' : mastery >= 40 ? '#f59e0b' : '#ef4444'} />
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: pattern ? 4 : 0 }}>
                    <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>Last reviewed: {daysSinceLabel(s.lastReviewed)}</span>
                    <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>Next review: {daysToNext === 0 ? 'Now' : `in ${daysToNext}d`}</span>
                    {s.quizAccuracy !== null && <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>Quiz avg: {s.quizAccuracy}%</span>}
                    {s.yuccaMasteryPct !== null && <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>Yucca: {s.yuccaMasteryPct}%</span>}
                  </div>
                  {pattern && (
                    <div style={{ background: dark ? 'rgba(245,158,11,0.08)' : '#fffbeb', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 10px' }}>
                      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#92400e', margin: 0 }}>Weakness: {pattern}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How the coach works */}
      <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 16, padding: '16px 24px', marginBottom: 20, ...glass }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 6px' }}>How Priorities Are Calculated</p>
        <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary, lineHeight: 1.65, margin: '0 0 6px' }}>
          Each subject gets a priority score (0–100) based on four signals in strict hierarchy:
        </p>
        <ol style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
          <li><strong style={{ color: textPrimary }}>Exam proximity</strong> — hard override if exam is within 2 days</li>
          <li><strong style={{ color: textPrimary }}>Quiz accuracy</strong> — below 60% adds heavy urgency</li>
          <li><strong style={{ color: textPrimary }}>Forgetting curve</strong> — Ebbinghaus decay since last review</li>
          <li><strong style={{ color: textPrimary }}>Yucca mastery</strong> — performance under time pressure</li>
        </ol>
        <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, lineHeight: 1.65, margin: '6px 0 0' }}>
          Weights adapt over sessions via feedback loop. Contradictory signals are flagged. Tap "Show score trace" on any task to see the exact breakdown.
        </p>
      </div>

      {/* Data & Backup */}
      <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 16, padding: '16px 24px', ...glass }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 10px' }}>Data & Backup</p>
        <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, margin: '0 0 12px' }}>All data is stored only on this device.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={exportCoachData} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>Export JSON</button>
          <button onClick={() => importRef.current?.click()} style={{ background: dark ? 'rgba(30,10,46,0.6)' : 'white', color: dark ? '#c4a0e0' : '#7b2d6e', border: `1.5px solid ${dark ? 'rgba(90,40,130,0.5)' : '#7b2d6e'}`, borderRadius: 8, padding: '8px 18px', fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>Import JSON</button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
        </div>
      </div>

      {showDiagnostic && (
        <div className="modal-overlay" onClick={() => setShowDiagnostic(false)}>
          <div onClick={e => e.stopPropagation()}>
            <DiagnosticQuiz
              ns={subjects[0]?.ns || 'default'}
              onComplete={() => { load(); }}
              onClose={() => { setShowDiagnostic(false); load(); }}
            />
          </div>
        </div>
      )}

      {showImportConfirm && (
        <div className="modal-overlay" onClick={() => setShowImportConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ background: dark ? 'rgba(18,10,30,0.97)' : 'white', maxWidth: 400 }}>
            <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', marginBottom: 12, color: dark ? '#e8d5ff' : '#2D1B0E' }}>Import Data</h3>
            <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: dark ? '#c4a0e0' : '#7A6A5A', marginBottom: 20 }}>Merge with existing data, or replace all?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleImportConfirm('merge')} style={{ flex: 1, background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontFamily: FONT, fontWeight: 600, cursor: 'pointer' }}>Merge</button>
              <button onClick={() => handleImportConfirm('replace')} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontFamily: FONT, fontWeight: 600, cursor: 'pointer' }}>Replace All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
