import React, { useState } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';

export default function TimerPanel({ onStart, isConfigured, shakeRef, pomRunning, pomSecsLeft, pomInterval, pomConfig, pomPhase, fmt }) {
  const { dark } = useDarkMode();
  const [studyMin, setStudyMin] = useState(25);
  const [restMin, setRestMin] = useState(5);
  const [repeat, setRepeat] = useState(4);
  const [shaking, setShaking] = useState(false);
  const [lockMsg, setLockMsg] = useState('');

  const triggerShake = () => {
    setShaking(true);
    setLockMsg('Camellia Lock: Please upload your study material in AI Study Planner first, then start your session.');
    setTimeout(() => setShaking(false), 600);
    setTimeout(() => setLockMsg(''), 3500);
  };

  if (shakeRef) shakeRef.current = triggerShake;

  const handleStart = () => {
    if (!studyMin || studyMin < 1) return;
    onStart({ studyMin: Number(studyMin), restMin: Number(restMin), repeat: Number(repeat) });
  };

  // If timer is running, show the active timer display (no config changes allowed)
  if (pomRunning) {
    const secsLeft = pomSecsLeft || 0;
    const totalSec = (pomPhase === 'study' ? (pomConfig?.studyMin || 25) : (pomConfig?.restMin || 5)) * 60;
    const progress = totalSec > 0 ? (secsLeft / totalSec) : 0;
    const circumference = 2 * Math.PI * 90;
    const dashOffset = circumference * (1 - progress);

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }}>
        <h2 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.4rem', color: dark ? '#c77dff' : '#7b2d6e', marginBottom: 8 }}>
          {pomPhase === 'study' ? 'Study Session' : 'Break Time'}
        </h2>
        <p style={{ fontFamily: 'Inter', fontSize: '0.9rem', color: dark ? '#a080c0' : '#9A8A7A', marginBottom: 32 }}>
          Interval {pomInterval} of {pomConfig?.repeat}
        </p>

        {/* Circular progress */}
        <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 32 }}>
          <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="110" cy="110" r="90" fill="none" stroke={dark ? '#2a1f3d' : '#F0E8E0'} strokeWidth="12" />
            <circle
              cx="110" cy="110" r="90" fill="none"
              stroke={pomPhase === 'study' ? '#c77dff' : '#2AACB8'}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: '2.4rem', color: dark ? '#f0e6ff' : '#2D1B0E', margin: 0, lineHeight: 1 }}>
              {fmt ? fmt(secsLeft) : `${String(Math.floor(secsLeft/60)).padStart(2,'0')}:${String(secsLeft%60).padStart(2,'0')}`}
            </p>
            <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: dark ? '#a080c0' : '#9A8A7A', margin: 0 }}>remaining</p>
          </div>
        </div>

        <div style={{ background: dark ? 'rgba(42,31,61,0.8)' : '#F2EAE0', borderRadius: 12, padding: '16px 28px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Inter', fontSize: '0.9rem', color: dark ? '#d0b0f0' : '#5A4A3A', margin: 0 }}>
            {pomPhase === 'study'
              ? `Stay focused — ${pomConfig?.restMin} min break coming after this interval`
              : `Relax! Back to study in ${Math.floor(secsLeft / 60)}m ${secsLeft % 60}s`
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#7b2d6e', fontFamily: 'Inter', marginBottom: '2rem' }}>Study Mode</h1>

      {lockMsg && (
        <div style={{ background: 'rgba(123,45,110,0.08)', border: '1.5px solid #7b2d6e', borderRadius: 10, padding: '12px 18px', marginBottom: 16, color: '#7b2d6e', fontFamily: 'Inter', fontSize: '0.9rem', maxWidth: 700 }}>
          {lockMsg}
        </div>
      )}

      <div className={`timer-card${shaking ? ' shake' : ''}`} style={{ maxWidth: '100%', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 28 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.4rem', color: '#7A6A5A', fontFamily: 'Inter', marginBottom: 8 }}>study</p>
            <input className="timer-input" type="number" min={1} max={120} value={studyMin} onChange={e => setStudyMin(e.target.value)} style={{ fontSize: '2.8rem' }} />
            <p style={{ fontSize: '0.75rem', color: '#A09080', marginTop: 4, fontFamily: 'Inter' }}>minutes</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.4rem', color: '#7A6A5A', fontFamily: 'Inter', marginBottom: 8 }}>rest</p>
            <input className="timer-input" type="number" min={1} max={60} value={restMin} onChange={e => setRestMin(e.target.value)} style={{ fontSize: '2.8rem' }} />
            <p style={{ fontSize: '0.75rem', color: '#A09080', marginTop: 4, fontFamily: 'Inter' }}>minutes</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: '1.4rem', color: '#7A6A5A', fontFamily: 'Inter', marginBottom: 8 }}>repeat</p>
          <input className="timer-input" type="number" min={1} max={20} value={repeat} onChange={e => setRepeat(e.target.value)} style={{ maxWidth: 180, fontSize: '2.5rem' }} />
        </div>
        <button
          onClick={handleStart}
          style={{ width: '100%', padding: '18px', background: '#7b2d6e', border: 'none', borderRadius: 12, color: 'white', fontSize: '1.3rem', cursor: 'pointer', fontFamily: 'Inter', transition: 'opacity 0.2s' }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >▶</button>
      </div>
      <p style={{ marginTop: 18, fontSize: '0.85rem', color: '#8A7A6A', fontFamily: 'Inter', maxWidth: 700 }}>
        The Pomodoro Technique is recommended: 25 mins study, 5 mins rest, repeat 4 times.
      </p>
    </div>
  );
}
