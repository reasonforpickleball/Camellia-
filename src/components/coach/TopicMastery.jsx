import React from 'react';
import { getOverallReadiness } from '../../lib/coachIntelligence';
const FONT = "'Roboto', Arial, sans-serif";

export default function TopicMastery({ subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const overall = getOverallReadiness(subjects);
  const strong = subjects.filter(s => s.masteryScore >= 70).map(s => s.name);
  const medium = subjects.filter(s => s.masteryScore >= 45 && s.masteryScore < 70).map(s => s.name);
  const weak = subjects.filter(s => s.masteryScore < 45).map(s => s.name);

  // Donut chart
  const r = 54, cx = 68, cy = 68;
  const circ = 2 * Math.PI * r;
  const filled = (overall / 100) * circ;

  const masteryColor = overall >= 70 ? '#22c55e' : overall >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: '0 0 16px' }}>Topic Mastery</p>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Donut */}
        <div style={{ position: 'relative', width: 136, height: 136, flexShrink: 0 }}>
          <svg width="136" height="136" viewBox="0 0 136 136">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'} strokeWidth={18} />
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke={masteryColor} strokeWidth={18}
              strokeDasharray={`${filled} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.5rem', color: masteryColor }}>{overall}%</span>
            <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: textSecondary, textAlign: 'center', lineHeight: 1.3 }}>Average<br />Mastery</span>
          </div>
        </div>

        {/* Category lists */}
        <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {strong.length > 0 && (
            <div>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color: '#22c55e', margin: '0 0 4px' }}>Strong</p>
              {strong.map(s => <p key={s} style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, margin: '1px 0' }}>- {s}</p>)}
            </div>
          )}
          {medium.length > 0 && (
            <div>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color: '#f59e0b', margin: '0 0 4px' }}>Medium</p>
              {medium.map(s => <p key={s} style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, margin: '1px 0' }}>- {s}</p>)}
            </div>
          )}
          {weak.length > 0 && (
            <div>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color: '#ef4444', margin: '0 0 4px' }}>Weak</p>
              {weak.map(s => <p key={s} style={{ fontFamily: FONT, fontSize: '0.78rem', color: '#ef4444', margin: '1px 0' }}>- {s}</p>)}
            </div>
          )}
          {subjects.length === 0 && (
            <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary }}>No subjects yet.</p>
          )}
        </div>
      </div>

      <p style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, margin: '14px 0 0', fontStyle: 'italic' }}>
        Based on quizzes, Yucca, and study sessions
      </p>
    </div>
  );
}
