import React, { useState } from 'react';
import { recordSubjectReview } from '../../lib/coachIntelligence';
const FONT = "'Roboto', Arial, sans-serif";

const NUM_COLORS = ['#7b2d6e', '#E07B39', '#2AACB8'];

function daysUntil(ts) {
  if (!ts) return null;
  return Math.round((ts - Date.now()) / 86400000);
}

export default function TodaysPriority({ plan, subjects, dark }) {
  const [done, setDone] = useState([]);
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const rowBg = dark ? 'rgba(30,10,46,0.4)' : 'rgba(243,232,255,0.4)';

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Estimate score improvement if all tasks done
  const lowestSubject = plan.length > 0 ? plan.reduce((a, b) => a.masteryScore < b.masteryScore ? a : b) : null;
  const scoreImprovement = plan.length > 0 ? Math.min(15, Math.round(plan.length * 3.2)) : 0;

  const markDone = (ns) => {
    setDone(d => [...d, ns]);
    recordSubjectReview(ns);
  };

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Today's Priority</p>
        <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary }}>{today}</span>
      </div>

      {plan.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, margin: 0 }}>
          Upload material in AI Study Planner to get your personalized plan.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {plan.map((task, i) => {
              const isDone = done.includes(task.ns);
              const du = daysUntil(task.examDate);
              return (
                <div key={task.ns} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isDone ? 'rgba(34,197,94,0.08)' : rowBg, borderRadius: 10, opacity: isDone ? 0.6 : 1, transition: 'all 0.2s', cursor: 'pointer' }}
                  onClick={() => !isDone && markDone(task.ns)}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? '#22c55e' : NUM_COLORS[i % 3], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: '0.78rem', color: 'white', flexShrink: 0 }}>
                    {isDone ? '+' : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: textPrimary, margin: 0, textDecoration: isDone ? 'line-through' : 'none' }}>
                      {task.name}
                      {du !== null && du >= 0 && <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#ef4444', fontWeight: 400, marginLeft: 6 }}>· exam {du === 0 ? 'today' : `in ${du}d`}</span>}
                    </p>
                    <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0, fontStyle: 'italic' }}>{task.reason}</p>
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: dark ? '#c77dff' : '#7b2d6e', flexShrink: 0 }}>{task.mins} min</span>
                </div>
              );
            })}
          </div>
          {lowestSubject && (
            <div style={{ padding: '10px 14px', background: dark ? 'rgba(123,45,110,0.12)' : '#F5F0FF', borderRadius: 8, borderLeft: `3px solid #7b2d6e` }}>
              <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, margin: 0 }}>
                If you complete today's plan,{' '}
                <strong style={{ color: dark ? '#c77dff' : '#7b2d6e' }}>
                  {lowestSubject.name} score rises to {Math.min(100, lowestSubject.masteryScore + scoreImprovement)}%
                </strong>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
