import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

function timeAgo(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

const TYPE_LABELS = {
  quiz: 'Q',
  yucca: 'Y',
  flashcard: 'F',
  study: 'S',
  diagnostic: 'D',
  planner: 'P',
};

const TYPE_COLORS = {
  quiz: '#7b2d6e',
  yucca: '#E07B39',
  flashcard: '#2AACB8',
  study: '#22c55e',
  diagnostic: '#f59e0b',
  planner: '#a78bfa',
};

export default function RecentActivity({ activity, subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  // Generate activity from real data if log is empty
  const displayActivity = activity.length > 0 ? activity : subjects.flatMap(s => {
    const items = [];
    if (s.quizCount > 0) items.push({ type: 'quiz', payload: { subject: s.name, score: s.quizAccuracy }, ts: Date.now() - 3600000 });
    if (s.yuccaGames > 0) items.push({ type: 'yucca', payload: { subject: s.name, score: s.yuccaMasteryPct }, ts: Date.now() - 7200000 });
    if (s.flashcardCount > 0) items.push({ type: 'flashcard', payload: { subject: s.name, count: s.flashcardCount }, ts: Date.now() - 10800000 });
    return items;
  }).slice(0, 5);

  return (
    <div>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: '0 0 14px' }}>Recent Activity</p>
      {displayActivity.length === 0 ? (
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px', backdropFilter: 'blur(20px)' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: 0 }}>No activity yet. Start studying to see your history here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {displayActivity.map((a, i) => {
            const icon = TYPE_LABELS[a.type] || 'A';
            const color = TYPE_COLORS[a.type] || '#7b2d6e';
            const title = a.type === 'quiz' ? `Quiz – ${a.payload?.subject || 'Subject'}`
              : a.type === 'yucca' ? `Yucca Session – ${a.payload?.subject || 'Subject'}`
              : a.type === 'flashcard' ? `Flashcards – ${a.payload?.subject || 'Subject'}`
              : a.type === 'study' ? `Study Session – ${a.payload?.subject || 'Subject'}`
              : a.type === 'diagnostic' ? `Diagnostic – ${a.payload?.subject || 'Subject'}`
              : a.payload?.subject || 'Activity';
            const subtitle = a.payload?.score != null ? `Score: ${a.payload.score}%`
              : a.payload?.count ? `Reviewed ${a.payload.count} cards`
              : '';
            return (
              <div key={i} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color, fontFamily: FONT }}>{icon}</div>
                  <p style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.3 }}>{title}</p>
                </div>
                {subtitle && <p style={{ fontFamily: FONT, fontSize: '0.72rem', color, margin: '0 0 2px', fontWeight: 600 }}>{subtitle}</p>}
                <p style={{ fontFamily: FONT, fontSize: '0.68rem', color: textSecondary, margin: 0 }}>{timeAgo(a.ts)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
