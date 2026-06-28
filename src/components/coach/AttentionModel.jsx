import React from 'react';
import { getAttentionModel } from '../../lib/studentModelEngine';

const FONT = "'Roboto', Arial, sans-serif";

export default function AttentionModel({ dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const accent = dark ? '#c77dff' : '#7b2d6e';

  const model = getAttentionModel();

  const metrics = [
    { label: 'Ideal session length', value: `${model.idealSessionMins} minutes`, icon: '⏱' },
    { label: 'Focus drops at', value: `${model.focusDropMinute} minutes`, icon: '📉' },
    { label: 'Retention drops at', value: `${model.retentionDropMinute} minutes`, icon: '🧠' },
    { label: 'Best break frequency', value: model.bestBreakFrequency, icon: '☕' },
    { label: 'Best study window', value: model.bestStudyWindow, icon: '🌙' },
  ];

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '1rem' }}>🎯</span>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Attention Model</p>
        </div>
        <span style={{
          fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700,
          background: `${model.burnoutRiskColor}18`, color: model.burnoutRiskColor,
          borderRadius: 6, padding: '3px 8px',
        }}>
          Burnout Risk: {model.burnoutRisk}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: model.insight ? 12 : 0 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i < metrics.length - 1 ? `1px solid ${borderCol}` : 'none' }}>
            <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}>{m.icon} {m.label}</span>
            <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: accent }}>{m.value}</span>
          </div>
        ))}
      </div>

      {model.insight && (
        <div style={{ background: dark ? 'rgba(123,45,110,0.15)' : '#F5F3FF', border: `1px solid ${dark ? 'rgba(123,45,110,0.4)' : '#DDD6FE'}`, borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
          <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: accent, margin: 0, fontStyle: 'italic' }}>💡 {model.insight}</p>
        </div>
      )}
    </div>
  );
}
