import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getStats, getWeeklyActivity } from '../../lib/stats';
import { useDarkMode } from '../../lib/DarkModeContext';
import useTourStep from '../../hooks/useTourStep';
import { setTourStep, finishTour } from '../../lib/tourStore';
import TourPointer from '../TourPointer';
import StudyProgressTracker from '../StudyProgressTracker';
import {
  buildSubjectsFromSessions,
  generateDailyPlan,
  getDiagnosticTasks,
  recordTaskComplete,
  predictExamReadiness,
  getWeakestPattern,
  computeMastery,
  getSubjectReadiness,
} from '../../lib/coachEngine';
import { generatePriorityPlan, buildAllSubjects } from '../../lib/coachIntelligence';
import DiagnosticQuiz from './DiagnosticQuiz';
import CoachTab from '../coach/CoachTab';

const FONT = "'Roboto', Arial, sans-serif";
const COLORS = ['#E53935', '#9575CD', '#CD9575', '#F9C22E'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function daysUntilLabel(ts) {
  if (!ts) return null;
  const d = Math.round((ts - Date.now()) / 86400000);
  if (d < 0) return 'Past';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `${d} days`;
}

function MasteryDots({ score }) {
  // Dotted progress — like "Math ........ 87%"
  const pct = Math.round(score);
  const color = pct >= 70 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden', margin: '0 10px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color, minWidth: 38, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function PriorityTaskRow({ task, idx, onComplete, dark, textPrimary, textSecondary, borderCol }) {
  const [done, setDone] = useState(false);
  const mins = task.timeMin || parseInt(task.time) || 20;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 0',
      borderBottom: `1px solid ${borderCol}`,
      opacity: done ? 0.45 : 1,
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: done ? '#22c55e' : (dark ? 'rgba(123,45,110,0.3)' : '#f3e8ff'),
        border: `2px solid ${done ? '#22c55e' : '#7b2d6e'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem',
        color: done ? 'white' : '#7b2d6e',
        cursor: 'pointer', flexShrink: 0,
      }} onClick={() => { if (!done) { setDone(true); onComplete(task.topicId); } }}>
        {done ? '+' : idx + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: FONT, fontWeight: 700, fontSize: '1rem',
            color: done ? textSecondary : textPrimary,
            textDecoration: done ? 'line-through' : 'none',
          }}>{task.topicName}</span>
          <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}>({mins} min)</span>
          {task.examDate && (
            <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
              Exam: {daysUntilLabel(task.examDate)}
            </span>
          )}
          {task.isDiagnostic && (
            <span style={{ fontFamily: FONT, fontSize: '0.68rem', background: '#f59e0b', color: 'white', borderRadius: 8, padding: '1px 7px' }}>Diagnostic</span>
          )}
        </div>
        <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary, margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
          {task.reason}
        </p>
        {task.recommendedMode && !task.isDiagnostic && (
          <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: dark ? '#c77dff' : '#7b2d6e', fontWeight: 600 }}>
            → {task.recommendedMode.label}
          </span>
        )}
      </div>
      <button
        onClick={() => { if (!done) { setDone(true); onComplete(task.topicId); } }}
        style={{
          background: done ? 'transparent' : '#7b2d6e', color: done ? '#22c55e' : 'white',
          border: done ? 'none' : 'none', borderRadius: 8, padding: done ? '0' : '7px 14px',
          fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', cursor: done ? 'default' : 'pointer',
          flexShrink: 0,
        }}
      >{done ? 'Done' : 'Mark Done'}</button>
    </div>
  );
}

export default function StatsPanel({ onTopicClick }) {
  const { dark } = useDarkMode();
  const userName = localStorage.getItem('doomium_user_name') || 'Student';
  const userGoal = localStorage.getItem('doomium_user_goal') || '';

  const [profilePic, setProfilePic] = useState(localStorage.getItem('doomium_profile_pic') || null);
  const [showPicModal, setShowPicModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [topicColor, setTopicColor] = useState('#E8A0D0');
  const [topics, setTopics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('doomium_topics') || '[]'); } catch { return []; }
  });
  const [newTopic, setNewTopic] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [picFile, setPicFile] = useState(null);
  const picInputRef = useRef();
  const tourStep = useTourStep();
  const plusBtnRef = useRef(null);
  const lastTopicRef = useRef(null);
  const coachTabRef = useRef(null);

  const PALETTE = [
    '#3333CC','#7733CC','#9999DD','#2E7D00','#55BB00','#99DD55','#006699','#1188CC',
    '#22AAFF','#CC0044','#CC3366','#FF6699','#CC4400','#EE7700','#FFAA44','#887700',
    '#DDCC00','#000000','#444444','#888888','#AAAAAA','#CCCCCC','#EEEEEE','#FFFFFF',
  ];

  // ── Coach data ────────────────────────────────────────────────────────────
  const [coachSubjects, setCoachSubjects] = useState(() => buildSubjectsFromSessions());
  // Load checked-off items from localStorage
  const [checkedTasks, setCheckedTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('camellia_dashboard_checked') || '[]'); } catch { return []; }
  });
  // Coach plan from the intelligence engine
  const [coachPlan, setCoachPlan] = useState(() => {
    const subs = buildAllSubjects();
    return generatePriorityPlan(subs).filter(t => {
      const key = t.ns + '_' + t.name;
      const checked = JSON.parse(localStorage.getItem('camellia_dashboard_checked') || '[]');
      return !checked.includes(key);
    });
  });

  const reloadCoach = useCallback(() => {
    const subs = buildSubjectsFromSessions();
    setCoachSubjects(subs);
    const checked = JSON.parse(localStorage.getItem('camellia_dashboard_checked') || '[]');
    const plan = generatePriorityPlan(buildAllSubjects());
    setCoachPlan(plan.filter(t => !checked.includes(t.ns + '_' + t.name)));
  }, []);

  const handleCoachComplete = (task) => {
    const key = task.ns + '_' + task.name;
    const updated = [...checkedTasks, key];
    setCheckedTasks(updated);
    localStorage.setItem('camellia_dashboard_checked', JSON.stringify(updated));
    recordTaskComplete(task.topicId || task.ns, 4);
    reloadCoach();
  };

  // Stats
  const stats = getStats();
  const weeklyActivity = getWeeklyActivity();
  const maxMins = Math.max(...weeklyActivity.map(w => w.mins), 1);

  const topicColors = (() => { try { return JSON.parse(localStorage.getItem('doomium_topic_colors') || '{}'); } catch { return {}; } })();

  const saveTopics = (t) => { setTopics(t); localStorage.setItem('doomium_topics', JSON.stringify(t)); };
  const removeTopic = (i) => saveTopics(topics.filter((_, idx) => idx !== i));
  const createTopic = () => {
    if (!newTopic.trim()) return;
    const existing = (() => { try { return JSON.parse(localStorage.getItem('doomium_topic_colors') || '{}'); } catch { return {}; } })();
    existing[newTopic.trim()] = topicColor;
    localStorage.setItem('doomium_topic_colors', JSON.stringify(existing));
    saveTopics([...topics, newTopic.trim()]);
    setNewTopic(''); setTopicColor('#E8A0D0'); setShowTopicModal(false);
    if (tourStep === 1) setTourStep(2);
  };

  const handlePicFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { setProfilePic(e.target.result); localStorage.setItem('doomium_profile_pic', e.target.result); setPicFile(file.name); };
    reader.readAsDataURL(file);
  };

  // Derived coach data
  const readiness = getSubjectReadiness(coachSubjects);
  const nextExam = coachSubjects.reduce((min, s) => (!s.examDate ? min : (!min || s.examDate < min) ? s.examDate : min), null);
  const daysToExam = nextExam ? Math.round((nextExam - Date.now()) / 86400000) : null;
  const hasMaterial = coachSubjects.length > 0 || buildAllSubjects().length > 0;

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'coach'

  const textPrimary = dark ? '#e8d5ff' : '#2D1B0E';
  const textSecondary = dark ? '#c4a0e0' : '#7A6A5A';
  const borderCol = dark ? 'rgba(90,40,130,0.35)' : 'rgba(229,216,200,0.7)';
  const cardBg = dark ? 'rgba(22,14,36,0.7)' : 'rgba(255,255,255,0.65)';
  const glassStyle = { backdropFilter: 'blur(20px) saturate(150%)', boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 20px rgba(180,140,120,0.1)' };

  const liveStats = [
    { value: String(stats.streak), label: 'Day Streak' },
    { value: String(stats.hoursSaved), label: 'Hours Studied' },
    { value: String(stats.sessions), label: 'Sessions' },
    { value: String(stats.quizzes), label: 'Quizzes' },
  ];

  return (
    <div className="fade-in" style={{ maxWidth: activeTab === 'coach' ? '100%' : 860, margin: '0 auto' }}>

      {/* ── Tab switcher ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: dark ? 'rgba(22,14,36,0.6)' : 'rgba(255,255,255,0.6)', border: `1px solid ${borderCol}`, borderRadius: 14, padding: 4, width: 'fit-content', backdropFilter: 'blur(12px)' }}>
        {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'coach', label: 'Coach' }].map(t => (
          <button key={t.id} ref={t.id === 'coach' ? coachTabRef : null} onClick={() => { setActiveTab(t.id); if (t.id === 'coach' && tourStep === 6) finishTour(); }} style={{
            padding: '9px 22px', border: 'none', borderRadius: 10, cursor: 'pointer',
            background: activeTab === t.id ? '#7b2d6e' : 'transparent',
            color: activeTab === t.id ? 'white' : textSecondary,
            fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Coach Tab ── */}
      {activeTab === 'coach' && <CoachTab />}

      {/* ── Dashboard Tab ── */}
      {activeTab === 'dashboard' && <>

      {/* ── Hero greeting ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowPicModal(true)}>
            {profilePic ? (
              <img src={profilePic} alt="profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${dark ? '#7b2d6e' : '#e8d8f0'}` }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: dark ? '#2a1040' : '#E8D8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${dark ? '#7b2d6e' : '#c4a0d8'}` }}>
                <svg width="44" height="44" viewBox="0 0 70 70" fill="none">
                  <circle cx="35" cy="25" r="16" fill={dark ? '#6a3a8a' : '#A080C0'} />
                  <path d="M5 62 Q5 44 35 44 Q65 44 65 62" fill={dark ? '#6a3a8a' : '#A080C0'} />
                </svg>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, background: '#7b2d6e', borderRadius: '50%',             display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'white' }}>Edit</div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary, margin: '0 0 2px' }}>{getGreeting()},</p>
            <h1 style={{ fontFamily: FONT, fontWeight: 900, fontSize: '2rem', color: textPrimary, margin: '0 0 4px', lineHeight: 1.1 }}>{userName}.</h1>
            {userGoal && <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, margin: 0, fontStyle: 'italic' }}>{userGoal}</p>}
          </div>
          {daysToExam !== null && daysToExam >= 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '2rem', color: '#ef4444', margin: 0, lineHeight: 1 }}>{daysToExam}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>days to exam</p>
            </div>
          )}
        </div>

        {/* Streak banner */}
        {stats.streak > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: dark ? 'rgba(123,45,110,0.2)' : 'rgba(123,45,110,0.08)', border: `1.5px solid ${dark ? 'rgba(199,125,255,0.4)' : '#c4a0d8'}`, borderRadius: 20, padding: '6px 16px' }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: dark ? '#c77dff' : '#7b2d6e' }}>{stats.streak} day streak</span>
            <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary }}>·</span>
            <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary }}>{stats.hoursSaved}h studied</span>
          </div>
        )}
      </div>

      {/* ── Academic readiness panel ── */}
      {hasMaterial && readiness.length > 0 && (
        <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 18, padding: '22px 28px', marginBottom: 24, ...glassStyle }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 2px' }}>Predicted Readiness</h2>
              <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: 0 }}>Based on quiz scores, spaced repetition, and Yucca performance</p>
            </div>
            <button onClick={() => setShowDiagnostic(true)} style={{ background: dark ? 'rgba(123,45,110,0.3)' : '#f3e8ff', color: dark ? '#c77dff' : '#7b2d6e', border: `1.5px solid ${dark ? 'rgba(123,45,110,0.5)' : '#c4a0d8'}`, borderRadius: 10, padding: '6px 14px', fontFamily: FONT, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
              Run Diagnostic
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {readiness.map(r => (
              <div key={r.subject} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto auto', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: FONT, fontSize: '0.88rem', color: textPrimary, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</span>
                <MasteryDots score={r.avg} />
                {r.readiness && (
                  <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: r.avg >= 70 ? '#22c55e' : r.avg >= 45 ? '#f59e0b' : '#ef4444', fontWeight: 700, flexShrink: 0 }}>{r.readiness.label}</span>
                )}
                {r.examDate && (
                  <span style={{ fontFamily: FONT, fontSize: '0.68rem', color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>Exam {daysUntilLabel(r.examDate)}</span>
                )}
              </div>
            ))}
          </div>
          {coachPlan.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${borderCol}` }}>
              <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary, margin: 0 }}>
                Complete today's {coachPlan.length} task{coachPlan.length !== 1 ? 's' : ''} to raise your overall readiness.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Today's priority plan (from Coach) ── */}
      <div style={{ background: cardBg, border: `1.5px solid ${dark ? 'rgba(123,45,110,0.5)' : '#E8D8F0'}`, borderRadius: 18, padding: '22px 28px', marginBottom: 24, ...glassStyle }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 2px' }}>
            Today's Priority
          </h2>
          <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: 0 }}>Recommended by your Coach. Check off tasks as you complete them.</p>
        </div>

        {!hasMaterial ? (
          <div style={{ padding: '20px 0' }}>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: textPrimary, margin: '0 0 6px', fontWeight: 600 }}>Your academic advisor is ready.</p>
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: '0 0 14px', lineHeight: 1.6 }}>
              Upload your material in the <strong>AI Study Planner</strong> and the Coach will build your daily plan here.
            </p>
          </div>
        ) : coachPlan.length === 0 ? (
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: '#22c55e', fontWeight: 700, margin: '0 0 6px' }}>All tasks complete for today.</p>
            <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, margin: '0 0 12px' }}>Great work. Come back tomorrow for your next review.</p>
          </div>
        ) : (
          <div>
            {coachPlan.map((task, i) => (
              <div key={task.ns + i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 0',
                borderBottom: i < coachPlan.length - 1 ? `1px solid ${borderCol}` : 'none',
              }}>
                <button onClick={() => handleCoachComplete(task)} style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: '#7b2d6e', border: 'none', color: 'white',
                  fontFamily: FONT, fontWeight: 900, fontSize: '0.75rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: textPrimary, margin: '0 0 3px' }}>
                    {task.name} <span style={{ fontWeight: 400, fontSize: '0.8rem', color: textSecondary }}>({task.mins} min)</span>
                  </p>
                  <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, margin: '0 0 2px', lineHeight: 1.5 }}>{task.reason}</p>
                  {task.impact && <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: dark ? '#c77dff' : '#7b2d6e', margin: 0, fontWeight: 600 }}>{task.impact}</p>}
                </div>
                <button onClick={() => handleCoachComplete(task)} style={{
                  background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8,
                  padding: '6px 14px', fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem',
                  cursor: 'pointer', flexShrink: 0,
                }}>Done</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── All subjects overview ── */}
      {hasMaterial && coachSubjects.length > 0 && (
        <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 18, padding: '22px 28px', marginBottom: 24, ...glassStyle }}>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 16px' }}>All Subjects</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {coachSubjects.map(s => {
              const mastery = Math.round(computeMastery(s));
              const r = predictExamReadiness(s);
              const pattern = getWeakestPattern(s);
              const masteryColor = mastery >= 70 ? '#22c55e' : mastery >= 45 ? '#f59e0b' : '#ef4444';
              return (
                <div key={s.ns} style={{ paddingBottom: 16, borderBottom: `1px solid ${borderCol}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, flex: 1 }}>{s.name}</span>
                    {s.examDate && !s.examDateStale && (
                      <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>Exam: {daysUntilLabel(s.examDate)}</span>
                    )}
                    <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, background: masteryColor, color: 'white', borderRadius: 8, padding: '2px 9px' }}>{mastery}%</span>
                    <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: masteryColor, fontWeight: 600 }}>{r.label}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${mastery}%`, background: masteryColor, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: pattern ? 6 : 0 }}>
                    {s.quizAccuracy !== null && (
                      <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>
                        Quiz avg: <strong style={{ color: s.quizAccuracy < 60 ? '#ef4444' : '#22c55e' }}>{s.quizAccuracy}%</strong>
                        {s.quizTrend && s.quizTrend !== 'none' && <span style={{ marginLeft: 4, color: s.quizTrend === 'improving' ? '#22c55e' : '#ef4444' }}>({s.quizTrend})</span>}
                      </span>
                    )}
                    {s.yuccaMasteryPct !== null && (
                      <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>
                        Yucca: <strong style={{ color: s.yuccaMasteryPct < 50 ? '#ef4444' : '#22c55e' }}>{s.yuccaMasteryPct}%</strong>
                      </span>
                    )}
                    {s.quizCount > 0 && <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>{s.quizCount} quizzes</span>}
                  </div>
                  {pattern && (
                    <div style={{ background: dark ? 'rgba(245,158,11,0.08)' : '#fffbeb', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 10px' }}>
                      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#92400e', margin: 0 }}>Warning: {pattern}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stats + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {liveStats.map(s => (
            <div key={s.label} style={{ background: cardBg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${borderCol}`, ...glassStyle }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.5rem', color: dark ? '#c77dff' : '#2D1B0E', margin: 0 }}>{s.value}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div style={{ background: cardBg, borderRadius: 14, padding: '16px', border: `1px solid ${borderCol}`, ...glassStyle }}>
          <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', color: dark ? '#c77dff' : '#5A4A3A', marginBottom: 10 }}>Weekly Activity</p>
          <div style={{ display: 'flex', gap: 8, height: 120, alignItems: 'flex-end' }}>
            {weeklyActivity.map((week, i) => {
              const h = maxMins > 0 ? (week.mins / maxMins) * 100 : 4;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: FONT, fontSize: '0.6rem', color: COLORS[i % COLORS.length], fontWeight: 700 }}>{week.mins}m</span>
                  <div style={{ width: '100%', height: Math.max(h, 4), background: COLORS[i % COLORS.length], borderRadius: '3px 3px 0 0' }} />
                  <span style={{ fontFamily: FONT, fontSize: '0.6rem', color: textSecondary }}>{week.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Study Tabs ── */}
      <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 18, padding: '22px 28px', marginBottom: 24, ...glassStyle }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 2px' }}>Study Tabs</h2>
            <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: 0 }}>Each tab has its own workspace, AI tools, and coach tracking</p>
          </div>
        </div>
        <StudyProgressTracker topics={topics} dark={dark} textSecondary={textSecondary} borderCol={borderCol} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          {topics.map((t, i) => (
            <div key={i} ref={i === topics.length - 1 ? lastTopicRef : null} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
              onClick={() => { if (tourStep === 2) setTourStep(3); onTopicClick && onTopicClick(t); }}>
              <span onClick={e => { e.stopPropagation(); removeTopic(i); }}
                style={{ position: 'absolute', top: -4, right: -4, color: 'red', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', zIndex: 2, background: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</span>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: topicColors[t] || '#E8A0D0', opacity: 0.85, transition: 'transform 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
              />
              <span style={{ fontSize: '0.78rem', fontFamily: FONT, color: textPrimary, marginTop: 6, textAlign: 'center', maxWidth: 72 }}>{t}</span>
            </div>
          ))}
          <button ref={plusBtnRef} onClick={() => setShowTopicModal(true)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'none', border: 'none', fontSize: '1.6rem', color: '#7b2d6e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300 }}>+</button>
        </div>
      </div>

      {tourStep === 1 && <TourPointer anchorRef={plusBtnRef} step={1} text="Welcome! Create a study tab to get started!" placement="right" />}
      {tourStep === 2 && <TourPointer anchorRef={lastTopicRef} step={2} text="Click on the Study Tab tab to start learning!" placement="right" />}
      {tourStep === 6 && activeTab === 'dashboard' && <TourPointer anchorRef={coachTabRef} step={6} text="Now check your stats over at Coach!" placement="bottom" />}

      {/* ── Modals (always rendered, outside tab condition) ── */}
      {showDiagnostic && (
        <DiagnosticQuiz
          ns={(() => {
            const nsList = ['default', ...((()=>{try{return JSON.parse(localStorage.getItem('doomium_topics')||'[]');}catch{return[];}})())
              .map(t=>`topic_${t.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')}`)];
            return nsList.find(n => localStorage.getItem(`camellia_${n}_raw_material`)) || coachSubjects[0]?.ns || 'default';
          })()}
          onComplete={reloadCoach}
          onClose={() => { setShowDiagnostic(false); reloadCoach(); }}
        />
      )}

      {/* ── End dashboard tab ── */}
      </>}

      {showTopicModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowTopicModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ background: dark ? 'rgba(22,14,36,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', border: `1px solid ${borderCol}` }}>
            <button onClick={() => setShowTopicModal(false)} style={{ position: 'absolute', top: 14, right: 18, color: 'red', background: 'none', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>x</button>
            <h3 style={{ fontFamily: FONT, fontWeight: 600, fontSize: '1.2rem', textAlign: 'center', marginBottom: 24, color: dark ? '#e8d5ff' : '#2D1B0E' }}>Name your Study Tab!</h3>
            <input className="orange-input" style={{ border: '2px solid #7b2d6e', marginTop: 0, marginBottom: 20, borderRadius: 24 }}
              placeholder="(ex. Chem Unit 3)" value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTopic()} autoFocus />
            <label style={{ fontFamily: FONT, fontSize: '0.9rem', color: dark ? '#c77dff' : '#7b2d6e', fontWeight: 600, display: 'block', marginBottom: 10 }}>Pick a color:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => setTopicColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: topicColor === c ? '3px solid #7b2d6e' : '2px solid #E5D8C8', boxSizing: 'border-box' }} />
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={createTopic} style={{ background: topicColor, color: ['#FFFFFF','#EEEEEE','#CCCCCC','#AAAAAA','#FFAA44','#DDCC00'].includes(topicColor) ? '#2D1B0E' : 'white', border: 'none', borderRadius: 20, padding: '12px 40px', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Create!</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPicModal && (
        <div className="modal-overlay" onClick={() => setShowPicModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ background: dark ? 'rgba(22,14,36,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', border: `1px solid ${borderCol}` }}>
            <button onClick={() => setShowPicModal(false)} style={{ position: 'absolute', top: 14, right: 18, color: 'red', background: 'none', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>exit</button>
            <h3 style={{ fontFamily: FONT, fontWeight: 600, fontSize: '1.2rem', textAlign: 'center', marginBottom: 24, color: dark ? '#e8d5ff' : '#2D1B0E' }}>Profile Picture</h3>
            <div className={`drop-zone${dragOver ? ' drag-over' : ''}`} style={{ border: '2px solid #7b2d6e' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handlePicFile(e.dataTransfer.files[0]); }}
              onClick={() => picInputRef.current?.click()}>
              <input ref={picInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePicFile(e.target.files[0])} />
              <button style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: 'Inter', fontSize: '0.9rem', cursor: 'pointer', pointerEvents: 'none' }}>Add File</button>
              <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: '#9A8A7A', marginTop: 8 }}>Or drag it here</p>
              {picFile && <p style={{ fontFamily: 'Inter', fontSize: '0.78rem', color: '#7b2d6e', marginTop: 4 }}>{picFile}</p>}
              <p onClick={e => { e.stopPropagation(); setPicFile(null); setProfilePic(null); localStorage.removeItem('doomium_profile_pic'); }}
                style={{ position: 'absolute', bottom: 10, right: 14, fontFamily: 'Space Mono', fontSize: '0.75rem', color: '#7b2d6e', cursor: 'pointer', fontStyle: 'italic' }}>remove files</p>
            </div>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={() => setShowPicModal(false)} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 20, padding: '12px 40px', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
