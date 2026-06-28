import React from 'react';

export default function BreakScreen({ display, interval, totalIntervals }) {
  return (
    <div className="break-screen">
      <p style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '1rem', color: '#5A7A8A', marginBottom: 12, letterSpacing: '0.04em' }}>
        Interval ({interval}/{totalIntervals})
      </p>
      <p style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: '3rem', color: '#2AACB8', letterSpacing: '0.04em' }}>
        {display}
      </p>
    </div>
  );
}
