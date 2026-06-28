import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

export default function StudyLoad({ load, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const r = 44, cx = 52, cy = 52;
  const circ = 2 * Math.PI * r;
  const pct = load.pct;
  const filled = (pct / 100) * circ;
  const loadColor = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e';

  // Show minutes for today's plan, hours for totals
  const plannedLabel = load.planned >= 60 ? `${(load.planned / 60).toFixed(1)}h` : `${load.planned}m`;
  const studiedLabel = load.studied >= 60 ? `${(load.studied / 60).toFixed(1)}h` : `${load.studied}m`;
  const remainingLabel = load.remaining >= 60 ? `${(load.remaining / 60).toFixed(1)}h` : `${load.remaining}m`;

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Study Load</p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: '0 0 14px' }}>
        {load.optimalWeeklyHours > 0 ? `Optimal: ${load.optimalWeeklyHours}h/week for your subjects` : 'Based on your subjects and exam schedule'}
      </p>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'} strokeWidth={14} />
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke={loadColor} strokeWidth={14}
              strokeDasharray={`${filled} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.2rem', color: loadColor }}>{pct}%</span>
            <span style={{ fontFamily: FONT, fontSize: '0.6rem', color: textSecondary }}>Done</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {[
            { label: "Today's plan", value: plannedLabel, color: '#7b2d6e' },
            { label: 'Studied', value: studiedLabel, color: '#22c55e' },
            { label: 'Remaining', value: remainingLabel, color: textSecondary },
            ...(load.totalStudiedHours > 0 ? [{ label: 'All-time', value: `${load.totalStudiedHours}h`, color: '#2AACB8' }] : []),
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, flex: 1 }}>{item.label}</span>
              <span style={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 700, color: textPrimary }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
