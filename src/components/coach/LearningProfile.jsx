import React from 'react';
const FONT = "'Roboto', Arial, sans-serif";

function ProfileRow({ label, value, valueColor, dark }) {
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, borderBottom: `1px solid ${dark ? 'rgba(90,40,130,0.2)' : '#F3F4F6'}` }}>
      <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary }}>{label}:</span>
      <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: valueColor || (dark ? '#c77dff' : '#7b2d6e'), textAlign: 'right', maxWidth: '55%' }}>{value}</span>
    </div>
  );
}

export default function LearningProfile({ profile, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  if (!profile) return null;

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Your Learning Profile</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ProfileRow label="Best study time" value={profile.bestStudyTime} dark={dark} />
        <ProfileRow label="Strongest learning style" value={profile.learningStyle} dark={dark} />
        {profile.weakTopics.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, borderBottom: `1px solid ${dark ? 'rgba(90,40,130,0.2)' : '#F3F4F6'}` }}>
            <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary }}>Weakest topics:</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              {profile.weakTopics.map((t, i) => (
                <span key={i} style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        <ProfileRow label="Attention span" value={`${profile.attentionSpan} minutes`} dark={dark} />
        <ProfileRow label="Average forgetting period" value={`${profile.avgForgettingDays} days`} dark={dark} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary }}>Consistency score:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 80, height: 6, background: dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${profile.consistency}%`, background: profile.consistency >= 70 ? '#22c55e' : profile.consistency >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
            </div>
            <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: dark ? '#c77dff' : '#7b2d6e' }}>{profile.consistency}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
