import React from 'react';
import { getAllVelocities } from '../../lib/studentModelEngine';

const FONT = "'Roboto', Arial, sans-serif";

export default function LearningVelocity({ subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const velocities = getAllVelocities(subjects);

  function velColor(v) {
    if (v.velocity > 1.5) return '#22c55e';
    if (v.velocity > 0.5) return '#4ade80';
    if (v.velocity >= 0) return '#f59e0b';
    return '#ef4444';
  }

  function velIcon(v) {
    if (v.velocity > 1.5) return '++';
    if (v.velocity > 0.5) return '+';
    if (v.velocity >= 0) return '=';
    return '-';
  }

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Learning Velocity</p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginBottom: 14 }}>
        How fast you're improving — slowest subjects receive extra attention
      </p>

      {velocities.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontStyle: 'italic' }}>
          Study multiple sessions to measure velocity.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {velocities.map((v, i) => (
            <div key={v.ns} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              background: v.needsAttention ? (dark ? 'rgba(239,68,68,0.08)' : '#FEF2F2') : (dark ? 'rgba(255,255,255,0.02)' : '#F9FAFB'),
              borderRadius: 8,
              border: v.needsAttention ? `1px solid rgba(239,68,68,0.3)` : `1px solid ${borderCol}`,
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, color: velColor(v), minWidth: 18, textAlign: 'center' }}>{velIcon(v)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: textPrimary, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0 }}>{v.label}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: velColor(v), margin: 0 }}>{v.deltaLabel}</p>
                <p style={{ fontFamily: FONT, fontSize: '0.65rem', color: textSecondary, margin: 0 }}>mastery</p>
              </div>
              {v.needsAttention && (
                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 6, padding: '2px 6px' }}>Needs attention</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
