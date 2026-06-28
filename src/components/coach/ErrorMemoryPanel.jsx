import React from 'react';
import { getTopErrors } from '../../lib/studentModelEngine';

const FONT = "'Roboto', Arial, sans-serif";

export default function ErrorMemoryPanel({ subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const errors = getTopErrors(subjects);

  // Build insight messages from quiz data
  const insights = [];
  subjects.forEach(s => {
    if ((s.recentErrors || 0) >= 3 && s.quizCount >= 3) {
      insights.push({
        subject: s.name,
        message: `You've missed questions about ${s.name} in ${Math.min(s.quizCount, 7)} of your last ${s.quizCount} sessions.`,
        severity: s.recentErrors >= 5 ? 'high' : 'medium',
      });
    }
    if (s.quizTrend === 'declining' && s.quizCount >= 4) {
      insights.push({
        subject: s.name,
        message: `Repeated errors in ${s.name} — your scores have been declining over 4+ sessions.`,
        severity: 'high',
      });
    }
    if (s.yuccaMasteryPct !== null && s.yuccaMasteryPct < 40 && s.yuccaGames >= 3) {
      insights.push({
        subject: s.name,
        message: `Consistently struggling with ${s.name} under time pressure (Yucca score: ${s.yuccaMasteryPct}%).`,
        severity: 'medium',
      });
    }
  });

  const allInsights = insights.slice(0, 5);
  const hasData = allInsights.length > 0 || errors.length > 0;

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Error Memory</p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginBottom: 14 }}>
        The Coach remembers your mistakes longer than you do
      </p>

      {!hasData ? (
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontStyle: 'italic' }}>
          Complete more quizzes to build your error memory.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allInsights.map((insight, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: insight.severity === 'high' ? (dark ? 'rgba(239,68,68,0.08)' : '#FEF2F2') : (dark ? 'rgba(245,158,11,0.08)' : '#FFFBEB'),
              border: `1px solid ${insight.severity === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              borderRadius: 8, padding: '10px 12px',
            }}>
              <span style={{ flexShrink: 0, fontWeight: 700, fontSize: '0.78rem', color: insight.severity === 'high' ? '#ef4444' : '#f59e0b' }}>{insight.severity === 'high' ? 'X' : '!'}</span>
              <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textPrimary, margin: 0, lineHeight: 1.5 }}>{insight.message}</p>
            </div>
          ))}
          {errors.slice(0, 4).map((e, i) => (
            <div key={`err${i}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px',
              background: dark ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
              border: `1px solid ${borderCol}`, borderRadius: 8,
            }}>
              <div>
                <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: textPrimary, fontWeight: 600 }}>{e.concept}</span>
                <span style={{ fontFamily: FONT, fontSize: '0.68rem', color: textSecondary, marginLeft: 6 }}>— {e.subject}</span>
              </div>
              <span style={{ fontFamily: FONT, fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', borderRadius: 6, padding: '1px 7px' }}>
                ×{e.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
