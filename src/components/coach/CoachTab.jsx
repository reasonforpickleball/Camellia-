import React, { useState, useEffect, useCallback } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';
import {
  isCoachSetupComplete,
  buildAllSubjects,
  inferLearningProfile,
  generatePriorityPlan,
  getWeakestTopics,
  getCoachAdvice,
  generatePracticeSets,
  getRecentActivity,
  getOverallReadiness,
  getStudyLoad,
  trackStudyHour,
} from '../../lib/coachIntelligence';
import { updateStudentModel, recordMasterySnapshot, recordSession, getAttentionModel, getKnowledgeGraphInsights, getConfidenceCalibration } from '../../lib/studentModelEngine';

import CoachSetup from './CoachSetup';
import ActionTab from './ActionTab';
import CoachHeader from './CoachHeader';
import PredictedReadiness from './PredictedReadiness';
import TodaysPriority from './TodaysPriority';
import CoachAdvicePanel from './CoachAdvicePanel';
import LearningProfile from './LearningProfile';
import TopicMastery from './TopicMastery';
import WeakestTopics from './WeakestTopics';
import DiagnosticSection from './DiagnosticSection';
import UpcomingExams from './UpcomingExams';
import StudyLoad from './StudyLoad';
import PracticeSets from './PracticeSets';
import RecentActivity from './RecentActivity';
import ExamPredictions from './ExamPredictions';
import ForgettingCurve from './ForgettingCurve';
import LearningVelocity from './LearningVelocity';
import ErrorMemoryPanel from './ErrorMemoryPanel';
import AttentionModel from './AttentionModel';
import CoachMemoryPanel from './CoachMemoryPanel';
import WeeklyReport from './WeeklyReport';
import { CamelliaLogoSmall } from '../CamelliaLogo';

const FONT = "'Roboto', Arial, sans-serif";

export default function CoachTab() {
  const { dark } = useDarkMode();
  const [setupDone, setSetupDone] = useState(isCoachSetupComplete);
  const [subjects, setSubjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [practiceSets, setPracticeSets] = useState([]);
  const [activity, setActivity] = useState([]);
  const [overallReadiness, setOverallReadiness] = useState(0);
  const [load, setLoad] = useState({ planned: 0, studied: 0, remaining: 0, pct: 0 });
  const [activeSection, setActiveSection] = useState('action');
  const [showEditModal, setShowEditModal] = useState(false);

  const reload = useCallback(() => {
    const subs = buildAllSubjects();
    setSubjects(subs);
    setProfile(inferLearningProfile(subs));
    setPlan(generatePriorityPlan(subs));
    setWeakTopics(getWeakestTopics(subs));
    setAdvice(getCoachAdvice(subs));
    setPracticeSets(generatePracticeSets(subs));
    setActivity(getRecentActivity());
    setOverallReadiness(getOverallReadiness(subs));
    setLoad(getStudyLoad(subs));
    // Update the persistent student model
    updateStudentModel(subs);
    subs.forEach(s => recordMasterySnapshot(s.ns, s.masteryScore));
  }, []);

  useEffect(() => {
    if (setupDone) {
      reload();
      trackStudyHour();
      // Record session for attention model
      const sessions = parseInt(localStorage.getItem('doomium_total_sessions') || '0');
      const totalMins = parseFloat(localStorage.getItem('doomium_total_minutes') || '0');
      const avgMins = sessions > 0 ? totalMins / sessions : 25;
      recordSession(Math.round(avgMins), new Date().getHours(), 70);
    }
  }, [setupDone, reload]);

  const handleSetupComplete = () => { setSetupDone(true); };

  const textPrimary = dark ? '#f0e8ff' : '#1a1a2e';
  const textSecondary = dark ? '#9080b0' : '#6B7280';
  const tabBg = dark ? 'rgba(18,12,30,0.8)' : 'rgba(255,255,255,0.7)';
  const tabBorder = dark ? 'rgba(70,30,110,0.5)' : '#E5E7EB';

  if (!setupDone) {
    return <CoachSetup onComplete={handleSetupComplete} />;
  }

  const TABS = [
    { id: 'action', label: 'Action Items' },
    { id: 'overview', label: 'Stats Report' },
    { id: 'predictions', label: 'Predictions' },
    { id: 'memory', label: 'Memory' },
    { id: 'terminal', label: 'Proficiency Graphs' },
    { id: 'report', label: 'Week Report' },
  ];

  // Edit modal: re-open setup
  const handleEditOpen = () => setShowEditModal(true);
  const handleEditClose = () => setShowEditModal(false);
  const handleReset = () => {
    localStorage.removeItem('camellia_coach_setup_complete');
    setSetupDone(false);
    setShowEditModal(false);
  };

  return (
    <div style={{ maxWidth: '100%', fontFamily: FONT }}>

      {/* Header */}
      <CoachHeader subjects={subjects} overallReadiness={overallReadiness} dark={dark} />

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: tabBg, border: `1px solid ${tabBorder}`, borderRadius: 12, padding: 4, width: 'fit-content', backdropFilter: 'blur(12px)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)} style={{
            padding: '8px 18px', border: 'none', borderRadius: 8, cursor: 'pointer',
            background: activeSection === t.id ? '#7b2d6e' : 'transparent',
            color: activeSection === t.id ? 'white' : textSecondary,
            fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── ACTION TAB ── */}
      {activeSection === 'action' && <ActionTab />}

      {/* ── OVERVIEW TAB ── */}
      {activeSection === 'overview' && <>
        {/* Row 1: Predicted Readiness + Today's Priority + Coach Advice */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 16, marginBottom: 16 }}>
          <PredictedReadiness subjects={subjects} overallReadiness={overallReadiness} dark={dark} />
          <TodaysPriority plan={plan} subjects={subjects} dark={dark} />
          <CoachAdvicePanel advice={advice} dark={dark} />
        </div>

        {/* Row 2: Learning Profile + Performance Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <LearningProfile profile={profile} dark={dark} />
          <PerformanceOverview subjects={subjects} dark={dark} />
        </div>

        {/* Row 3: Topic Mastery + Weakest Topics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16, marginBottom: 16 }}>
          <TopicMastery subjects={subjects} dark={dark} />
          <WeakestTopics topics={weakTopics} dark={dark} />
        </div>

        {/* Row 4: Diagnostic + Upcoming Exams + Study Load */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 16, marginBottom: 16 }}>
          <DiagnosticSection subjects={subjects} dark={dark} onDiagComplete={reload} />
          <UpcomingExams subjects={subjects} dark={dark} />
          <StudyLoad load={load} dark={dark} />
        </div>

        {/* Row 5: Practice Sets */}
        <div style={{ marginBottom: 16 }}>
          <PracticeSets sets={practiceSets} dark={dark} />
        </div>

        {/* Row 6: Recent Activity */}
        <div style={{ marginBottom: 16 }}>
          <RecentActivity activity={activity} subjects={subjects} dark={dark} />
        </div>
      </>}

      {/* ── PREDICTIONS TAB ── */}
      {activeSection === 'predictions' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <ExamPredictions subjects={subjects} dark={dark} />
          <ForgettingCurve subjects={subjects} dark={dark} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <LearningVelocity subjects={subjects} dark={dark} />
          <AttentionModel dark={dark} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <ErrorMemoryPanel subjects={subjects} dark={dark} />
        </div>
      </>}

      {/* ── MEMORY TAB ── */}
      {activeSection === 'memory' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <CoachMemoryPanel dark={dark} />
          <KnowledgeGraphPanel subjects={subjects} dark={dark} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <ConfidencePanel subjects={subjects} dark={dark} />
          <AttentionModel dark={dark} />
        </div>
      </>}

      {/* ── MASTERY TERMINAL TAB ── */}
      {activeSection === 'terminal' && (
        <MasteryTerminal subjects={subjects} dark={dark} />
      )}

      {/* ── WEEKLY REPORT TAB ── */}
      {activeSection === 'report' && (
        <div style={{ marginBottom: 16 }}>
          <WeeklyReport subjects={subjects} dark={dark} />
        </div>
      )}

      {/* Edit / Reset / Backup options */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', paddingBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleEditOpen}
          style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, cursor: 'pointer', textDecoration: 'underline' }}
        >Edit coach preferences</button>
        <span style={{ color: textSecondary, fontSize: '0.72rem' }}>|</span>
        <button
          onClick={() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('camellia_') || k.startsWith('doomium_'))) data[k] = localStorage.getItem(k);
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'camellia_backup.json'; a.click();
          }}
          style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '5px 14px', fontFamily: FONT, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
        >Export Data</button>
        <label style={{ background: dark ? 'rgba(30,10,46,0.6)' : 'white', color: dark ? '#c4a0e0' : '#7b2d6e', border: `1.5px solid ${dark ? 'rgba(90,40,130,0.5)' : '#7b2d6e'}`, borderRadius: 8, padding: '5px 14px', fontFamily: FONT, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>
          Import Data
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
              try {
                const data = JSON.parse(ev.target.result);
                Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
                alert('Data restored! Refreshing...');
                window.location.reload();
              } catch { alert('Invalid backup file.'); }
            };
            reader.readAsText(file);
          }} />
        </label>
        <span style={{ color: textSecondary, fontSize: '0.72rem' }}>|</span>
        <button
          onClick={handleReset}
          style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: '0.72rem', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline' }}
        >Reset all coach data</button>
      </div>

      {/* Edit modal: re-open setup wizard */}
      {showEditModal && (
        <CoachSetup onComplete={() => { setShowEditModal(false); reload(); }} />
      )}
    </div>
  );
}

// ── Inline: Mastery Terminal ──────────────────────────────────────────────────

function MasteryTerminal({ subjects, dark }) {
  const [selectedNs, setSelectedNs] = useState(subjects[0]?.ns || 'default');
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const COLORS = ['#7b2d6e', '#E07B39', '#2AACB8', '#22c55e', '#f59e0b'];

  const subject = subjects.find(s => s.ns === selectedNs) || subjects[0];
  const quizScores = subject?.quizScores?.slice().reverse() || [];
  const masteryHistory = (() => {
    try {
      const raw = localStorage.getItem('camellia_velocity_log');
      const log = raw ? JSON.parse(raw) : {};
      return (log[selectedNs] || []).map(s => ({ ts: s.ts, mastery: Math.round(s.mastery) }));
    } catch { return []; }
  })();

  // Chart dims
  const W = 500, H = 180, padX = 36, padY = 12;
  const cW = W - padX * 2, cH = H - padY * 2;

  function makeLine(data, key, maxVal = 100) {
    if (data.length < 2) return null;
    return data.map((d, i) => {
      const x = padX + (i / (data.length - 1)) * cW;
      const y = padY + cH - (d[key] / maxVal) * cH;
      return `${x},${y}`;
    }).join(' ');
  }

  const quizLine = makeLine(quizScores.map((v, i) => ({ v, i })), 'v');
  const masteryLine = makeLine(masteryHistory, 'mastery');

  // Stats
  const avgQuiz = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : null;
  const latestMastery = masteryHistory.length > 0 ? masteryHistory[masteryHistory.length - 1].mastery : subject?.masteryScore || null;
  const trend = quizScores.length >= 3
    ? (quizScores[quizScores.length - 1] - quizScores[0] > 5 ? 'up' : quizScores[0] - quizScores[quizScores.length - 1] > 5 ? 'down' : 'stable')
    : 'no data';
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#f59e0b';

  const yGridLines = [0, 25, 50, 75, 100];

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '22px 26px', marginBottom: 14, backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.1rem', color: textPrimary, margin: '0 0 3px' }}>Mastery Terminal</p>
            <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: 0 }}>Quiz performance vs mastery trajectory — updated after every quiz</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {subjects.map((s, i) => (
              <button key={s.ns} onClick={() => setSelectedNs(s.ns)} style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: selectedNs === s.ns ? COLORS[i % COLORS.length] : (dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'),
                color: selectedNs === s.ns ? 'white' : textSecondary,
                fontFamily: FONT, fontWeight: 600, fontSize: '0.75rem',
              }}>{s.name}</button>
            ))}
          </div>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { label: 'Avg Quiz', value: avgQuiz !== null ? `${avgQuiz}%` : '—' },
            { label: 'Current Mastery', value: latestMastery !== null ? `${latestMastery}%` : '—' },
            { label: 'Quizzes Taken', value: quizScores.length },
            { label: 'Trend', value: trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : trend === 'stable' ? 'Stable' : 'No data', color: trendColor },
          ].map((stat, i) => (
            <div key={i} style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#F9FAFB', border: `1px solid ${borderCol}`, borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
              <p style={{ fontFamily: FONT, fontSize: '0.62rem', color: textSecondary, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.05rem', color: stat.color || textPrimary, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        {quizScores.length === 0 && masteryHistory.length === 0 ? (
          <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dark ? 'rgba(255,255,255,0.02)' : '#F9FAFB', borderRadius: 12, border: `1px dashed ${borderCol}` }}>
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, textAlign: 'center' }}>Take a quiz to start plotting your mastery over time.</p>
          </div>
        ) : (
          <>
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
              {/* Grid */}
              {yGridLines.map(v => {
                const y = padY + cH - (v / 100) * cH;
                return (
                  <g key={v}>
                    <line x1={padX} y1={y} x2={padX + cW} y2={y} stroke={dark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'} strokeWidth={1} />
                    <text x={padX - 5} y={y + 4} textAnchor="end" fontSize="9" fill={dark ? '#6b4a8a' : '#9CA3AF'}>{v}</text>
                  </g>
                );
              })}
              {/* Axes */}
              <line x1={padX} y1={padY} x2={padX} y2={padY + cH} stroke={dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'} strokeWidth={1} />
              <line x1={padX} y1={padY + cH} x2={padX + cW} y2={padY + cH} stroke={dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'} strokeWidth={1} />

              {/* Mastery line (purple) */}
              {masteryLine && (
                <>
                  <polyline points={masteryLine} fill="none" stroke="#7b2d6e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
                  {masteryHistory.map((d, i) => {
                    const x = padX + (i / (masteryHistory.length - 1)) * cW;
                    const y = padY + cH - (d.mastery / 100) * cH;
                    return <circle key={i} cx={x} cy={y} r={3} fill="#7b2d6e" />;
                  })}
                </>
              )}

              {/* Quiz scores line (orange) */}
              {quizLine && (
                <>
                  <polyline points={quizLine} fill="none" stroke="#E07B39" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  {quizScores.map((v, i) => {
                    const x = padX + (i / (quizScores.length - 1)) * cW;
                    const y = padY + cH - (v / 100) * cH;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={4.5} fill="#E07B39" />
                        <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill={dark ? '#f0d0a0' : '#C85C1A'} fontWeight="700">{v}%</text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#E07B39" strokeWidth="2.5" /></svg>
                <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>Quiz scores</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#7b2d6e" strokeWidth="2.5" strokeDasharray="5 2" /></svg>
                <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>Mastery trend</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* All subjects comparison */}
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 26px', backdropFilter: 'blur(20px)' }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: '0 0 14px' }}>All Subjects — Current Mastery</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {subjects.length === 0 ? (
            <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary }}>No subjects tracked yet.</p>
          ) : subjects.map((s, i) => {
            const color = COLORS[i % COLORS.length];
            const mastery = s.masteryScore || 0;
            return (
              <div key={s.ns}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT, fontSize: '0.85rem', color: textPrimary, fontWeight: 600 }}>{s.name}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {s.quizAccuracy !== null && <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>Quiz avg: <strong>{s.quizAccuracy}%</strong></span>}
                    <span style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{mastery}%</span>
                  </div>
                </div>
                <div style={{ height: 8, background: dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${mastery}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Inline: Performance Overview ──────────────────────────────────────────────

function PerformanceOverview({ subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const COLORS = ['#22c55e', '#f59e0b', '#a78bfa', '#2AACB8', '#E07B39'];
  const width = 340, height = 140, padX = 30, padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const lines = subjects.slice(0, 4).map((s, si) => {
    const scores = s.quizScores?.slice().reverse() || [];
    if (scores.length < 2) return null;
    const pts = scores.map((v, i) => {
      const x = padX + (i / (scores.length - 1)) * chartW;
      const y = padY + chartH - (v / 100) * chartH;
      return `${x},${y}`;
    });
    return { pts: pts.join(' '), color: COLORS[si], name: s.name };
  }).filter(Boolean);

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: '0 0 12px' }}>Performance Overview</p>
      {lines.length === 0 ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, textAlign: 'center' }}>Take quizzes to see performance trends here.</p>
        </div>
      ) : (
        <>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            {[0, 25, 50, 75, 100].map(v => {
              const y = padY + chartH - (v / 100) * chartH;
              return <g key={v}><line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke={dark ? 'rgba(255,255,255,0.05)' : '#F3F4F6'} strokeWidth={1} /><text x={padX - 4} y={y + 4} textAnchor="end" fontSize="9" fill={dark ? '#6b4a8a' : '#9CA3AF'}>{v}</text></g>;
            })}
            {lines.map((l, i) => <polyline key={i} points={l.pts} fill="none" stroke={l.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />)}
            {lines.map((l, i) => l.pts.split(' ').filter(pt => pt.includes(',')).map((pt, j) => { const [x, y] = pt.split(','); return <circle key={j} cx={parseFloat(x)} cy={parseFloat(y)} r={3.5} fill={l.color} />; }))}
          </svg>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            {lines.map((l, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} /><span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>{l.name}</span></div>)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Inline: Knowledge Graph Panel ─────────────────────────────────────────────

function KnowledgeGraphPanel({ subjects, dark }) {

  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const insights = getKnowledgeGraphInsights(subjects);

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Knowledge Graph</p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginBottom: 14 }}>Subject dependencies — why you might be struggling</p>
      {insights.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontStyle: 'italic' }}>No dependency gaps detected.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.map((ins, i) => (
            <div key={i} style={{ background: dark ? 'rgba(245,158,11,0.08)' : '#FFFBEB', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.8rem', color: textPrimary, margin: '0 0 4px' }}>{ins.subject}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: '#92400e', margin: 0 }}>{ins.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline: Confidence Calibration Panel ──────────────────────────────────────

function ConfidencePanel({ subjects, dark }) {

  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const calibrations = getConfidenceCalibration(subjects);

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Confidence Model</p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginBottom: 14 }}>Predicted vs. actual — detecting over/underconfidence</p>
      {calibrations.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontStyle: 'italic' }}>Complete more sessions to calibrate your confidence model.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {calibrations.map((c, i) => (
            <div key={i} style={{ background: dark ? 'rgba(255,255,255,0.02)' : '#F9FAFB', border: `1px solid ${borderCol}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: textPrimary, margin: 0 }}>{c.name}</p>
                <span style={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, color: c.type === 'overconfident' ? '#ef4444' : c.type === 'underconfident' ? '#f59e0b' : '#22c55e', background: c.type === 'overconfident' ? 'rgba(239,68,68,0.12)' : c.type === 'underconfident' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)', borderRadius: 6, padding: '2px 8px' }}>
                  {c.type === 'overconfident' ? 'Overconfident' : c.type === 'underconfident' ? 'Underconfident' : 'Calibrated'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><p style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, margin: '0 0 2px' }}>Predicted</p><p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>{c.avgPredicted}%</p></div>
                <div><p style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, margin: '0 0 2px' }}>Actual</p><p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>{c.avgActual}%</p></div>
                <div><p style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, margin: '0 0 2px' }}>Gap</p><p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: c.delta > 0 ? '#22c55e' : '#ef4444', margin: 0 }}>{c.delta > 0 ? '+' : ''}{c.delta}%</p></div>
              </div>
              {c.message && <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: '6px 0 0', fontStyle: 'italic' }}>{c.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
