import React, { useState } from 'react';
import { getAllNamespaces } from '../../lib/coachIntelligence';
import DiagnosticQuiz from '../panels/DiagnosticQuiz';
import { saveDiagnosticScore } from '../../lib/coachIntelligence';

const FONT = "'Roboto', Arial, sans-serif";

export default function DiagnosticSection({ subjects, dark, onDiagComplete }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedNs, setSelectedNs] = useState(null);

  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB';
  const textPrimary = dark ? '#e8d5ff' : '#1a1a2e';
  const textSecondary = dark ? '#a080c0' : '#6B7280';
  const chipBg = dark ? 'rgba(30,10,46,0.6)' : '#F3F4F6';

  const nsOptions = subjects.length > 0 ? subjects : [{ ns: 'default', name: 'Main Subject' }];

  const handleComplete = (pct) => {
    if (selectedNs) saveDiagnosticScore(selectedNs, pct);
    if (onDiagComplete) onDiagComplete();
  };

  return (
    <>
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(20px)' }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: '0 0 6px' }}>Diagnostic Exams</p>
        <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary, margin: '0 0 16px', lineHeight: 1.55 }}>
          Take a 25-question diagnostic on any topic.<br />
          I'll pinpoint your exact weakness and create a plan.
        </p>

        <button
          onClick={() => { setSelectedNs(nsOptions[0]?.ns || 'default'); setShowQuiz(true); }}
          style={{ display: 'block', width: '100%', padding: '12px', background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 14 }}
        >
          Start Diagnostic (25 Qs)
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {nsOptions.map(s => (
            <button key={s.ns}
              onClick={() => { setSelectedNs(s.ns); setShowQuiz(true); }}
              style={{ padding: '5px 14px', background: selectedNs === s.ns ? '#7b2d6e' : chipBg, color: selectedNs === s.ns ? 'white' : textSecondary, border: `1px solid ${dark ? 'rgba(90,40,130,0.4)' : '#E5E7EB'}`, borderRadius: 20, fontFamily: FONT, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >{s.name}</button>
          ))}
        </div>

        <p style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, margin: 0, fontStyle: 'italic' }}>Each diagnostic adapts to your level in real-time</p>
      </div>

      {showQuiz && (
        <DiagnosticQuiz
          ns={selectedNs || 'default'}
          onComplete={handleComplete}
          onClose={() => { setShowQuiz(false); if (onDiagComplete) onDiagComplete(); }}
        />
      )}
    </>
  );
}
