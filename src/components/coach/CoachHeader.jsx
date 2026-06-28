import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function daysUntilLabel(ts) {
  if (!ts) return null;
  const d = Math.round((ts - Date.now()) / 86400000);
  if (d < 0) return null;
  if (d === 0) return 'today';
  return `in ${d} day${d !== 1 ? 's' : ''}`;
}

export default function CoachHeader({ subjects, overallReadiness, dark }) {
  const userName = localStorage.getItem('doomium_user_name') || 'Student';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const nextExam = subjects.reduce((min, s) => (!s.examDate ? min : (!min || s.examDate < min) ? s.examDate : min), null);
  const daysToExam = nextExam ? Math.max(0, Math.round((nextExam - Date.now()) / 86400000)) : null;

  const insightLines = [];
  if (subjects.length > 0) {
    insightLines.push(`I've analyzed your performance, study habits, and upcoming exams.`);
    insightLines.push(`Here's exactly what you need to do to succeed.`);
  } else {
    insightLines.push(`Upload your study material to get your personalized coaching plan.`);
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: FONT, fontWeight: 900, fontSize: '2.2rem', color: textPrimary, margin: 0, lineHeight: 1.1 }}>
            {getGreeting()}, {userName}.
          </h1>
        </div>
        {daysToExam !== null && (
          <div style={{ textAlign: 'center', background: daysToExam <= 7 ? 'rgba(239,68,68,0.12)' : 'rgba(123,45,110,0.12)', border: `1.5px solid ${daysToExam <= 7 ? '#ef4444' : '#7b2d6e'}`, borderRadius: 14, padding: '10px 18px', flexShrink: 0 }}>
            <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.8rem', color: daysToExam <= 7 ? '#ef4444' : (dark ? '#c77dff' : '#7b2d6e'), margin: 0, lineHeight: 1 }}>{daysToExam}</p>
            <p style={{ fontFamily: FONT, fontSize: '0.68rem', color: daysToExam <= 7 ? '#ef4444' : textSecondary, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>days to exam</p>
          </div>
        )}
      </div>
      {insightLines.map((line, i) => (
        <p key={i} style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary, margin: '2px 0 0', lineHeight: 1.5 }}>{line}</p>
      ))}
    </div>
  );
}
