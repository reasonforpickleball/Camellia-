import React from 'react';
import { predictExamOutcome, getSubjectModel } from '../../lib/studentModelEngine';

const FONT = "'Roboto', Arial, sans-serif";

export default function ExamPredictions({ subjects, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';

  const predictions = subjects
    .filter(s => s.examDate || s.quizCount > 0)
    .map(s => {
      const subModel = getSubjectModel(s.ns);
      const outcome = predictExamOutcome(s, subModel);
      const du = s.examDate ? Math.round((s.examDate - Date.now()) / 86400000) : null;
      return { ...outcome, name: s.name, examIn: du };
    })
    .sort((a, b) => {
      const aEx = a.examIn !== null ? a.examIn : 999;
      const bEx = b.examIn !== null ? b.examIn : 999;
      return aEx - bEx;
    });

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <span style={{ fontSize: '1rem' }}>🎯</span>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Exam Predictions</p>
      </div>

      {predictions.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontStyle: 'italic' }}>
          Take quizzes to generate exam predictions.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {predictions.map((p, i) => (
            <div key={i} style={{
              background: dark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
              border: `1px solid ${borderCol}`,
              borderRadius: 10, padding: '12px 14px',
              borderLeft: `4px solid ${p.riskColor}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: textPrimary, margin: '0 0 2px' }}>{p.name}</p>
                  {p.examIn !== null && (
                    <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: 0 }}>
                      Exam {p.examIn <= 0 ? 'today' : `in ${p.examIn} day${p.examIn !== 1 ? 's' : ''}`}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.4rem', color: p.riskColor, margin: 0, lineHeight: 1 }}>{p.score}%</p>
                  <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: p.riskColor, margin: '2px 0 0' }}>Grade {p.grade}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700,
                  background: p.confidence === 'High' ? 'rgba(34,197,94,0.15)' : p.confidence === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(156,163,175,0.15)',
                  color: p.confidence === 'High' ? '#22c55e' : p.confidence === 'Medium' ? '#f59e0b' : textSecondary,
                  borderRadius: 6, padding: '2px 8px',
                }}>Confidence: {p.confidence}</span>
                <span style={{
                  fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700,
                  background: `${p.riskColor}18`,
                  color: p.riskColor,
                  borderRadius: 6, padding: '2px 8px',
                }}>Risk: {p.risk}</span>
              </div>
              {p.calibration && (
                <p style={{ fontFamily: FONT, fontSize: '0.68rem', color: p.calibration.type === 'overconfident' ? '#ef4444' : '#f59e0b', margin: '6px 0 0', fontStyle: 'italic' }}>
                  {p.calibration.type === 'overconfident' ? '⚠ Tendency to overestimate' : '💪 You underestimate yourself here'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
