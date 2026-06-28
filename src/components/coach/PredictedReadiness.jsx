import React from 'react';
import { getReadinessLabel } from '../../lib/coachIntelligence';
const FONT = "'Roboto', Arial, sans-serif";

export default function PredictedReadiness({ subjects, overallReadiness, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const overall = getReadinessLabel(overallReadiness);

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Predicted Readiness</p>
        <span style={{ fontSize: '0.7rem', color: textSecondary }}>ⓘ</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {subjects.map(s => {
          const label = getReadinessLabel(s.masteryScore);
          return (
            <div key={s.ns}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontFamily: FONT, fontSize: '0.88rem', color: textPrimary, fontWeight: 500 }}>{s.name}</span>
                <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: label.color }}>{s.masteryScore}%</span>
              </div>
              <div style={{ height: 7, background: dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.masteryScore}%`, background: label.color, borderRadius: 4, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {subjects.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary }}>Overall Readiness</span>
          <span style={{ fontFamily: FONT, fontSize: '1rem', fontWeight: 800, color: overall.color }}>{overallReadiness}%</span>
        </div>
      )}
    </div>
  );
}
