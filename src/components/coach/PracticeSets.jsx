import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

export default function PracticeSets({ sets, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Personalized Practice Sets</p>
          <span style={{ fontSize: '0.7rem', color: textSecondary }}>ⓘ</span>
        </div>
      </div>

      {sets.length === 0 ? (
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: 0 }}>
            Practice sets are generated automatically from your quiz results and diagnostic scores. Upload material and take a quiz to unlock them.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {sets.map((s, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 14, padding: '16px', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: textPrimary, margin: 0, lineHeight: 1.3 }}>{s.title}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0 }}>{s.type}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0 }}>{s.questions} Questions</p>
              <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: '0 0 6px' }}>Est. {s.estMins} min</p>
              <button style={{
                background: s.canStart ? s.color : (dark ? 'rgba(90,40,130,0.3)' : '#E5E7EB'),
                color: s.canStart ? 'white' : textSecondary,
                border: 'none', borderRadius: 8, padding: '7px 0',
                fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem',
                cursor: s.canStart ? 'pointer' : 'not-allowed', width: '100%',
              }}>
                {s.canStart ? 'Start' : 'Need more data'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
