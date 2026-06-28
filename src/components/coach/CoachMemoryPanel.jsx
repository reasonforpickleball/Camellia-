import React from 'react';
import { getCoachMemory } from '../../lib/studentModelEngine';

const FONT = "'Roboto', Arial, sans-serif";

export default function CoachMemoryPanel({ dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const accent = dark ? '#c77dff' : '#7b2d6e';

  const mem = getCoachMemory();

  const sections = [
    mem.behaviorPatterns?.length > 0 && { title: '# Patterns', items: mem.behaviorPatterns, color: accent },
    mem.avoidedSubjects?.length > 0 && { title: '- Avoided', items: mem.avoidedSubjects.map(s => `You tend to avoid ${s}`), color: '#f59e0b' },
    mem.lovedSubjects?.length > 0 && { title: '+ Strongest', items: mem.lovedSubjects.map(s => `High engagement with ${s}`), color: '#22c55e' },
    mem.stressSubjects?.length > 0 && { title: '! Struggling', items: mem.stressSubjects.map(s => `${s} is causing difficulty`), color: '#ef4444' },
    mem.strongMethods?.length > 0 && { title: '* Best Methods', items: [`You learn best with: ${mem.strongMethods.join(', ')}`], color: '#4ade80' },
    mem.weakHabits?.length > 0 && { title: '! Weak Habits', items: mem.weakHabits, color: '#fb923c' },
  ].filter(Boolean);

  const hasMemory = sections.length > 0;

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Coach Memory</p>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginBottom: 14 }}>
        Everything the Coach has learned about how you study
      </p>

      {!hasMemory ? (
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontStyle: 'italic' }}>
          Keep studying — your Coach is building your profile.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map((sec, i) => (
            <div key={i}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: sec.color, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sec.title}</p>
              {sec.items.map((item, j) => (
                <div key={j} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4,
                  background: dark ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                  border: `1px solid ${borderCol}`, borderRadius: 7, padding: '7px 10px',
                }}>
                  <span style={{ color: sec.color, flexShrink: 0, fontSize: '0.7rem', marginTop: 2 }}>▸</span>
                  <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textPrimary, margin: 0, lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
