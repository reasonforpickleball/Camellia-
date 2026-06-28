import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

export default function WeakestTopics({ topics, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Weakest Topics <span style={{ fontWeight: 400, color: textSecondary, fontSize: '0.78rem' }}>(Focus Now)</span></p>
      </div>

      {topics.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary }}>Take a quiz to identify weak spots.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px 12px', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}></span>
            <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact</span>
            <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Score</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topics.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '0 12px' }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: '0.88rem', fontWeight: 600, color: textPrimary, margin: '0 0 3px' }}>{t.name}</p>
                  <div style={{ height: 5, background: dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.score}%`, background: t.impactColor, borderRadius: 3, transition: 'width 0.6s' }} />
                  </div>
                </div>
                <span style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: t.impactColor, flexShrink: 0, textAlign: 'right' }}>{t.impact}</span>
                <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: textPrimary, flexShrink: 0, minWidth: 36, textAlign: 'right' }}>{t.score}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
