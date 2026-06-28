import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

const URGENCY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const URGENCY_BG = { high: 'rgba(239,68,68,0.08)', medium: 'rgba(245,158,11,0.08)', low: 'rgba(34,197,94,0.08)' };

export default function CoachAdvicePanel({ advice, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: '0 0 14px' }}>Coach's Advice</p>
      {advice.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary }}>Complete a quiz or study session to get personalized advice.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {advice.map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '12px 14px',
              background: dark ? 'rgba(30,10,46,0.5)' : URGENCY_BG[a.urgency],
              border: `1.5px solid ${URGENCY_COLORS[a.urgency]}30`,
              borderLeft: `3px solid ${URGENCY_COLORS[a.urgency]}`,
              borderRadius: 10,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${URGENCY_COLORS[a.urgency]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: URGENCY_COLORS[a.urgency] }} />
              </div>
              <div>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: textPrimary, margin: '0 0 2px' }}>{a.title}</p>
                <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: 0, lineHeight: 1.5 }}>Reason: {a.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
