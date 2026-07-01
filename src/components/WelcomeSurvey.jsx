import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../lib/DarkModeContext';

export default function WelcomeSurvey({ onComplete }) {
  const { dark } = useDarkMode();
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowDone(true), 15000);
    return () => clearTimeout(t);
  }, []);

  const handleDone = () => {
    localStorage.setItem('camellia_survey_complete', 'true');
    onComplete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 420, minWidth: 0, background: dark ? '#160e24' : 'white', color: dark ? '#e8d5ff' : '#2D1B0E', padding: '28px 28px 24px' }}>
        <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12, textAlign: 'center' }}>Last Thing: Survey</h3>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: dark ? '1.5px solid rgba(90,40,130,0.5)' : '1.5px solid #E5D8C8' }}>
          <iframe
            src="https://forms.gle/phafb7Q1spwKgHCg8"
            title="Camellia Survey"
            width="100%"
            height="360"
            style={{ border: 'none', display: 'block' }}
          >Loading…</iframe>
        </div>
        {showDone && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={handleDone} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '10px 32px', fontFamily: 'Inter', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
