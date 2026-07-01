import React from 'react';
import { buildAllSubjects } from '../lib/coachIntelligence';

const FONT = "'Roboto', Arial, sans-serif";
const nsForTopic = (t) => `topic_${t.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;

export default function StudyProgressTracker({ topics, dark, textSecondary, borderCol }) {
  if (!topics || topics.length === 0) return null;

  const subjects = buildAllSubjects();
  const subjectByNs = {};
  subjects.forEach(s => { subjectByNs[s.ns] = s; });

  const nodes = topics.map(t => {
    const s = subjectByNs[nsForTopic(t)];
    if (!s) return { name: t, status: 'not_started' };
    return { name: t, status: s.masteryScore >= 70 ? 'mastered' : 'in_progress' };
  });

  const counts = {
    mastered: nodes.filter(n => n.status === 'mastered').length,
    in_progress: nodes.filter(n => n.status === 'in_progress').length,
    not_started: nodes.filter(n => n.status === 'not_started').length,
  };
  const total = nodes.length;
  const notStartedColor = dark ? '#4a3a5e' : '#d8cce0';

  return (
    <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${borderCol}` }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
        {counts.mastered > 0 && <div style={{ width: `${(counts.mastered / total) * 100}%`, background: '#22c55e' }} />}
        {counts.in_progress > 0 && <div style={{ width: `${(counts.in_progress / total) * 100}%`, background: '#f59e0b' }} />}
        {counts.not_started > 0 && <div style={{ width: `${(counts.not_started / total) * 100}%`, background: notStartedColor }} />}
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          Mastered: <strong style={{ color: '#22c55e' }}>{counts.mastered}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          In Progress: <strong style={{ color: '#f59e0b' }}>{counts.in_progress}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: notStartedColor, display: 'inline-block' }} />
          Not Started: <strong style={{ color: textSecondary }}>{counts.not_started}</strong>
        </span>
      </div>
    </div>
  );
}
