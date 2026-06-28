import React, { useState } from 'react';
import { generateWeeklyReport } from '../../lib/studentModelEngine';

const FONT = "'Roboto', Arial, sans-serif";

export default function WeeklyReport({ subjects, dark }) {
  const [open, setOpen] = useState(false);
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const accent = dark ? '#c77dff' : '#7b2d6e';

  if (!open) {
    return (
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '16px 22px', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: textPrimary, margin: 0 }}>Weekly Coach Report</p>
            <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0 }}>What improved, what declined, what's next</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{ background: accent, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
          View Report
        </button>
      </div>
    );
  }

  const report = generateWeeklyReport(subjects);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '22px 26px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.2rem', color: textPrimary, margin: '0 0 2px' }}>Weekly Report</p>
          <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: 0 }}>{dateStr}</p>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '0.9rem', fontFamily: FONT, fontWeight: 700 }}>Close</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* Wins */}
        <Section title="Biggest Wins" color="#22c55e" items={report.wins} empty="Keep studying to record wins!" dark={dark} borderCol={borderCol} textPrimary={textPrimary} textSecondary={textSecondary} />
        <Section title="Biggest Risks" color="#ef4444" items={report.risks} empty="No critical risks this week." dark={dark} borderCol={borderCol} textPrimary={textPrimary} textSecondary={textSecondary} />
        <Section title="Improved" color="#4ade80" items={report.improved.map(i => `${i.name} ${i.delta}`)} empty={report.hasLastWeek ? 'No notable improvements this week.' : 'First report — check back next week!'} dark={dark} borderCol={borderCol} textPrimary={textPrimary} textSecondary={textSecondary} />
        <Section title="Declined" color="#f59e0b" items={report.declined.map(i => `${i.name} ${i.delta}`)} empty="Nothing declined this week." dark={dark} borderCol={borderCol} textPrimary={textPrimary} textSecondary={textSecondary} />
      </div>

      {/* Exam predictions */}
      {report.predictions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: textPrimary, marginBottom: 8 }}>Predicted Exam Outcomes</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {report.predictions.map((p, i) => (
              <div key={i} style={{ background: `${p.riskColor}14`, border: `1.5px solid ${p.riskColor}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 110 }}>
                <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textPrimary, fontWeight: 600, margin: '0 0 2px' }}>{p.name}</p>
                <p style={{ fontFamily: FONT, fontSize: '1.1rem', fontWeight: 900, color: p.riskColor, margin: '0 0 2px' }}>{p.score}%</p>
                <p style={{ fontFamily: FONT, fontSize: '0.62rem', color: p.riskColor, margin: 0 }}>Risk: {p.risk}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next week focus */}
      {report.nextWeekFocus.length > 0 && (
        <div style={{ background: dark ? 'rgba(123,45,110,0.15)' : '#F5F3FF', border: `1.5px solid ${dark ? 'rgba(123,45,110,0.4)' : '#DDD6FE'}`, borderRadius: 10, padding: '12px 16px' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: accent, margin: '0 0 6px' }}>Focus Next Week</p>
          <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textPrimary, margin: 0 }}>
            Prioritize: <strong>{report.nextWeekFocus.join(' and ')}</strong>.
            {report.studiedThisWeek > 0 && ` You studied ${report.studiedThisWeek}h this week.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, color, items, empty, dark, borderCol, textPrimary, textSecondary }) {
  return (
    <div style={{ background: dark ? 'rgba(255,255,255,0.02)' : '#F9FAFB', border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color, margin: '0 0 8px' }}>{title}</p>
      {items.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0, fontStyle: 'italic' }}>{empty}</p>
      ) : (
        items.map((item, i) => (
          <p key={i} style={{ fontFamily: FONT, fontSize: '0.75rem', color: textPrimary, margin: '0 0 4px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color, flexShrink: 0, fontWeight: 700 }}>-</span>{item}
          </p>
        ))
      )}
    </div>
  );
}
