/**
 * AIProgressBar — unified perceived-progress bar for all AI operations.
 *
 * Usage:
 *   const { progress, startProgress, finishProgress } = useAIProgress();
 *   <AIProgressBar progress={progress} />
 *
 * startProgress() → animates 0→95% while waiting
 * finishProgress() → snaps to 100% then hides
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDarkMode } from '../lib/DarkModeContext';

export function useAIProgress() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);
  const progressRef = useRef(0);

  const clearTimers = () => { clearTimeout(timerRef.current); };

  const tick = useCallback(() => {
    const p = progressRef.current;
    let increment;
    // Non-linear perceived-progress curve
    if (p < 15)      increment = 4 + Math.random() * 5;   // fast start
    else if (p < 40) increment = 2 + Math.random() * 3;   // quick to 40%
    else if (p < 65) increment = 0.8 + Math.random() * 1.5; // slow middle
    else if (p < 80) increment = 0.4 + Math.random() * 0.8; // crawl
    else if (p < 90) increment = 0.15 + Math.random() * 0.3; // near-stall
    else             increment = 0;                         // hold at 90-95

    const next = Math.min(p + increment, 93);
    progressRef.current = next;
    setProgress(next);

    // Variable tick speed — slows as bar approaches the hold zone
    const delay = p < 40 ? 120 : p < 70 ? 200 : p < 85 ? 350 : 600;
    timerRef.current = setTimeout(tick, delay + Math.random() * 80);
  }, []);

  const startProgress = useCallback(() => {
    clearTimers();
    progressRef.current = 0;
    setProgress(0);
    setActive(true);
    // Small delay before first tick so bar appears instantly at ~5%
    progressRef.current = 5;
    setProgress(5);
    timerRef.current = setTimeout(tick, 120);
  }, [tick]);

  const finishProgress = useCallback(() => {
    clearTimers();
    setProgress(100);
    setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 600);
  }, []);

  useEffect(() => () => clearTimers(), []);

  return { progress, active, startProgress, finishProgress };
}

export default function AIProgressBar({ progress, label = 'Generating…' }) {
  const { dark } = useDarkMode();

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        width: '100%',
        height: 5,
        borderRadius: 99,
        background: dark ? 'rgba(90,40,130,0.25)' : 'rgba(123,45,110,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: 99,
          background: dark
            ? 'linear-gradient(90deg, #9b4fc7, #c77dff)'
            : 'linear-gradient(90deg, #7b2d6e, #d068b8)',
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
      {label && (
        <p style={{
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: '0.78rem',
          color: dark ? '#a080c0' : '#9A8A7A',
          margin: '6px 0 0',
          textAlign: 'center',
        }}>{label}</p>
      )}
    </div>
  );
}
