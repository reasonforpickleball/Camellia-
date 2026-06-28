import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { markCoachSetupComplete, getAllNamespaces, getExamDateForNs } from '../../lib/coachIntelligence';

const FONT = "'Roboto', Arial, sans-serif";

const STEPS = [
  { id: 'welcome', title: 'Ready to meet your Coach?', subtitle: 'Welcome to the BEST part of the site, here you will learn how you study and what you should study.' },
  { id: 'subjects', title: 'Subjects' },
  { id: 'exams', title: 'Dates' },
  { id: 'habits', title: 'Study Habits' },
  { id: 'goals', title: 'Your goals' },
];

// Format a timestamp as MM/DD/YYYY for display
function formatDateMMDDYYYY(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// Parse MM/DD/YYYY string into timestamp
function parseDateMMDDYYYY(str) {
  if (!str) return null;
  const clean = str.replace(/[^0-9\/]/g, '');
  const parts = clean.split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts.map(Number);
  if (!mm || !dd || !yyyy || yyyy < 2024) return null;
  const dt = new Date(yyyy, mm - 1, dd);
  return isNaN(dt.getTime()) ? null : dt.getTime();
}

export default function CoachSetup({ onComplete }) {
  const [step, setStep] = useState(0);

  // Pre-fill with saved preferences if they exist
  const savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem('camellia_coach_prefs') || 'null'); } catch { return null; }
  })();

  const [answers, setAnswers] = useState(savedPrefs || { studyHours: 2, bestTime: 'evening', sessionLength: 30, targetGrade: 'A', studyDays: 5, examDates: {}, challenge: '', motivation: '' });

  const namespaces = getAllNamespaces();
  const subjectNames = namespaces.map(ns => {
    const filename = localStorage.getItem(`camellia_${ns}_planner_filename`) || '';
    const goal = localStorage.getItem(`camellia_${ns}_planner_goal`) || '';
    const rawName = ns === 'default'
      ? (filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ') || goal.split(' ').slice(0, 3).join(' ') || 'Main Subject')
      : ns;
    // Auto-detect exam date from planner
    const autoDate = getExamDateForNs(ns, {});
    return { ns, name: rawName, autoDate };
  }).filter(s => {
    return localStorage.getItem(`camellia_${s.ns}_raw_material`) ||
           localStorage.getItem(`camellia_${s.ns}_recent_quizzes`) ||
           localStorage.getItem(`camellia_${s.ns}_flashcard_deck`) ||
           localStorage.getItem(`camellia_${s.ns}_ai_questions`);
  });

  // Initialize exam dates: prefer previously saved dates, then auto-detected
  const [examInputs, setExamInputs] = useState(() => {
    const init = {};
    subjectNames.forEach(s => {
      // Check saved prefs first
      const savedKey = `${s.ns}_examDate`;
      if (savedPrefs && savedPrefs[savedKey]) {
        // savedPrefs stores ISO date string YYYY-MM-DD
        const [yyyy, mm, dd] = savedPrefs[savedKey].split('-');
        if (yyyy && mm && dd) { init[s.ns] = `${mm}/${dd}/${yyyy}`; return; }
      }
      // Fallback to auto-detected
      if (s.autoDate) init[s.ns] = formatDateMMDDYYYY(s.autoDate);
    });
    return init;
  });

  const set = (key, val) => setAnswers(a => ({ ...a, [key]: val }));

  const finish = () => {
    const flat = { ...answers };
    // Persist exam dates as timestamps
    Object.entries(examInputs).forEach(([ns, raw]) => {
      const ts = parseDateMMDDYYYY(raw);
      if (ts) flat[`${ns}_examDate`] = new Date(ts).toISOString().split('T')[0];
    });
    // Save preferences for pre-fill on next edit
    localStorage.setItem('camellia_coach_prefs', JSON.stringify(flat));
    markCoachSetupComplete(flat);
    onComplete();
  };

  const dark = document.documentElement.classList.contains('dark');
  const cardBg = dark ? 'rgba(22,14,36,0.97)' : 'white';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const border = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const accent = '#7b2d6e';

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${dark ? 'rgba(90,40,130,0.5)' : '#D1D5DB'}`,
    background: dark ? 'rgba(30,10,46,0.6)' : '#F9FAFB',
    color: textPrimary, fontFamily: FONT, fontSize: '0.95rem', outline: 'none',
    boxSizing: 'border-box',
  };

  const pillBtn = (active) => ({
    padding: '8px 18px', borderRadius: 20,
    background: active ? accent : (dark ? 'rgba(30,10,46,0.5)' : '#F3F4F6'),
    color: active ? 'white' : textSecondary,
    border: `1.5px solid ${active ? accent : border}`,
    fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
  });

  const handleExamInput = (ns, raw) => {
    // Auto-format as user types: insert slashes
    let digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setExamInputs(prev => ({ ...prev, [ns]: formatted }));
  };

  const renderStep = () => {
    switch (STEPS[step].id) {
      case 'welcome':
        return (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: '1rem', color: textSecondary, lineHeight: 1.8, marginBottom: 24 }}>
              Over time, your Coach will know:<br />
              - When you study best<br />
              - Which topics you forget fastest<br />
              - What score you're predicted to get<br />
              - Exactly what to study next and why
            </p>
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: dark ? '#7050a0' : '#9CA3AF', margin: 0 }}>
              Takes about 2 minutes. All data stays on your device.
            </p>
          </div>
        );

      case 'subjects':
        return (
          <div>
            <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
              I found these study tabs. What is your goal this semester? <em>*Girl, you better not disappoint me.</em>
            </p>
            {subjectNames.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {subjectNames.map(s => (
                  <div key={s.ns} style={{ padding: '8px 16px', borderRadius: 20, background: dark ? 'rgba(123,45,110,0.2)' : '#f3e8ff', border: `1.5px solid ${accent}`, fontFamily: FONT, fontSize: '0.88rem', color: dark ? '#c77dff' : accent, fontWeight: 600 }}>
                    {s.name}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '14px 16px', borderRadius: 10, background: dark ? 'rgba(30,10,46,0.4)' : '#F9FAFB', border: `1px solid ${border}`, marginBottom: 16 }}>
                <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, margin: 0 }}>
                  No study tabs yet. Create them on the home screen and the Coach will pick them up automatically.
                </p>
              </div>
            )}
            <div>
              <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 8 }}>Goal this semester</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['A+', 'A', 'B+', 'B', 'C+', 'C'].map(g => (
                  <button key={g} style={pillBtn(answers.targetGrade === g)} onClick={() => set('targetGrade', g)}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'exams':
        return (
          <div>
            <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, marginBottom: 8, lineHeight: 1.6 }}>
              AI detected these dates from your planner. Confirm or adjust.
            </p>
            <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: dark ? '#7050a0' : '#9CA3AF', marginBottom: 18 }}>
              Format: MM/DD/YYYY
            </p>
            {subjectNames.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {subjectNames.map(s => (
                  <div key={s.ns}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: FONT, fontSize: '0.88rem', fontWeight: 600, color: textPrimary, minWidth: 130 }}>{s.name}</span>
                      <input
                        type="text"
                        placeholder="MM/DD/YYYY"
                        maxLength={10}
                        style={{ ...inputStyle, width: 160 }}
                        value={examInputs[s.ns] || ''}
                        onChange={e => handleExamInput(s.ns, e.target.value)}
                      />
                      {s.autoDate && !examInputs[s.ns] && (
                        <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: dark ? '#7b5a9a' : '#9CA3AF', fontStyle: 'italic' }}>
                          Auto: {formatDateMMDDYYYY(s.autoDate)}
                        </span>
                      )}
                      {examInputs[s.ns] && parseDateMMDDYYYY(examInputs[s.ns]) && (
                        <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>OK</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 6 }}>Next major exam</label>
                <input
                  type="text"
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  style={inputStyle}
                  value={examInputs['default'] || ''}
                  onChange={e => handleExamInput('default', e.target.value)}
                />
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 8 }}>How many days per week do you study?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[3, 4, 5, 6, 7].map(d => (
                  <button key={d} style={pillBtn(answers.studyDays === d)} onClick={() => set('studyDays', d)}>{d}</button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'habits':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 8 }}>When do you study? (You better not choose late night..)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['night', 'Late Night']].map(([v, l]) => (
                  <button key={v} style={pillBtn(answers.bestTime === v)} onClick={() => set('bestTime', v)}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 8 }}>Typical session (Live up to it)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[20, 30, 45, 60, 90].map(m => (
                  <button key={m} style={pillBtn(answers.sessionLength === m)} onClick={() => set('sessionLength', m)}>{m}m</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 8 }}>Hours available per day (no excuses)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6].map(h => (
                  <button key={h} style={pillBtn(answers.studyHours === h)} onClick={() => set('studyHours', h)}>{h}h</button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 8 }}>Why are you terrible at?</label>
              <textarea
                rows={3} style={{ ...inputStyle, resize: 'none' }}
                placeholder="e.g. I always cram before exams and forget everything..."
                value={answers.challenge || ''}
                onChange={e => set('challenge', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 600, color: textSecondary, display: 'block', marginBottom: 8 }}>What keeps you from giving up?</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Getting into college', 'GPA improvement', 'Understanding the subject', 'Passing the class', 'Future career'].map(m => (
                  <button key={m} style={pillBtn(answers.motivation === m)} onClick={() => set('motivation', m)}>{m}</button>
                ))}
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  const isLast = step === STEPS.length - 1;

  const modal = (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.82)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      padding: '16px',
      boxSizing: 'border-box',
      pointerEvents: 'all',
    }}>
      <div style={{
        background: cardBg,
        borderRadius: 24,
        padding: '40px 40px 32px',
        maxWidth: 560,
        width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        position: 'relative',
        maxHeight: '85vh',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 4, background: i === step ? accent : (i < step ? accent + '80' : (dark ? 'rgba(90,40,130,0.3)' : '#E5E7EB')), transition: 'all 0.3s' }} />
          ))}
        </div>

        <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.5rem', color: textPrimary, margin: '0 0 8px', textAlign: 'center' }}>{STEPS[step].title}</h2>
        {STEPS[step].subtitle && (
          <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary, margin: '0 0 24px', textAlign: 'center', lineHeight: 1.65 }}>{STEPS[step].subtitle}</p>
        )}

        <div style={{ minHeight: 180 }}>{renderStep()}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{ background: 'none', border: 'none', color: step === 0 ? 'transparent' : textSecondary, fontFamily: FONT, fontSize: '0.88rem', cursor: step === 0 ? 'default' : 'pointer', fontWeight: 600 }}
          >← Back</button>
          <button
            onClick={() => isLast ? finish() : setStep(s => s + 1)}
            style={{ background: accent, color: 'white', border: 'none', borderRadius: 12, padding: '12px 32px', fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
          >{isLast ? 'Start Coaching →' : 'Continue →'}</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
