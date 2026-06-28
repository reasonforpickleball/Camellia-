import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

export default function UpcomingExams({ subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const exams = subjects
    .filter(s => s.examDate && s.examDate > Date.now())
    .sort((a, b) => a.examDate - b.examDate)
    .slice(0, 5)
    .map(s => {
      const days = Math.round((s.examDate - Date.now()) / 86400000);
      const d = new Date(s.examDate);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd2 = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      const date = `${mm}/${dd2}/${yyyy}`;
      const urgencyColor = days <= 7 ? '#ef4444' : days <= 14 ? '#f59e0b' : (dark ? '#c77dff' : '#7b2d6e');
      return { ...s, days, date, urgencyColor };
    });

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: '0 0 14px' }}>Upcoming Exams</p>

      {exams.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary }}>
          No exam dates set. Add them during Coach setup or in the planner goal field.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exams.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < exams.length - 1 ? `1px solid ${dark ? 'rgba(90,40,130,0.2)' : '#F3F4F6'}` : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.urgencyColor, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: FONT, fontSize: '0.85rem', fontWeight: 700, color: textPrimary, margin: 0 }}>{e.name} Final</p>
                <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0 }}>{e.date}</p>
              </div>
              <span style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: e.urgencyColor, flexShrink: 0 }}>{e.days} days</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
