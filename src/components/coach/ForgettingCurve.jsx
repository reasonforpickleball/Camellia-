import React from 'react';
import { getForgettingProfile, getSubjectModel } from '../../lib/studentModelEngine';

const FONT = "'Roboto', Arial, sans-serif";

function RetentionBar({ label, value, dark }) {
  const color = value >= 70 ? '#22c55e' : value >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: dark ? '#a080c0' : '#6B7280', minWidth: 44 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

export default function ForgettingCurve({ subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const profiles = subjects.map(s => {
    const subModel = getSubjectModel(s.ns);
    const fp = getForgettingProfile(subModel, s.masteryScore);
    return { name: s.name, ns: s.ns, ...fp };
  }).sort((a, b) => a.forgettingProbIn5Days - b.forgettingProbIn5Days).reverse();

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: '1rem' }}>🧠</span>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Forgetting Curve</p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginBottom: 14 }}>
        Predicted retention over time based on your review history
      </p>

      {profiles.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontStyle: 'italic' }}>
          Study more sessions to build your forgetting model.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {profiles.slice(0, 4).map(p => (
            <div key={p.ns} style={{ paddingBottom: 12, borderBottom: `1px solid ${borderCol}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: textPrimary, margin: 0 }}>{p.name}</p>
                <span style={{
                  fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700,
                  background: p.forgettingProbIn5Days >= 60 ? 'rgba(239,68,68,0.15)' : p.forgettingProbIn5Days >= 35 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                  color: p.forgettingProbIn5Days >= 60 ? '#ef4444' : p.forgettingProbIn5Days >= 35 ? '#f59e0b' : '#22c55e',
                  borderRadius: 6, padding: '2px 8px',
                }}>
                  {p.forgettingProbIn5Days}% chance forgotten in 5 days
                </span>
              </div>
              <RetentionBar label="Today" value={p.retentionToday} dark={dark} />
              <RetentionBar label="3 days" value={p.retentionIn3} dark={dark} />
              <RetentionBar label="7 days" value={p.retentionIn7} dark={dark} />
              <RetentionBar label="14 days" value={p.retentionIn14} dark={dark} />
              {p.daysUntilForgotten <= 7 && (
                <p style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#ef4444', margin: '6px 0 0', fontWeight: 600 }}>
                  ⏰ Review within {p.daysUntilForgotten} day{p.daysUntilForgotten !== 1 ? 's' : ''} to retain this material
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
