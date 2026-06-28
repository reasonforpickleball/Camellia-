import React, { useEffect, useState } from 'react';

const ROASTS = [
  "dawg go back to fullscreen\nwe all know you're too cooked to pass this class without studying",
  "dawg go back to fullscreen\nif you gonna open Camellia just to do nothing, you better just scroll all day",
  "go back. right now.\nyou think your future self is proud of this moment?",
  "dawg go back to fullscreen\nyou came this far just to quit? seriously?",
];

export default function EscapeOverlay({ countdown, onReturnFullscreen, userName, userGoal, nn1, nn2, nn3 }) {
  const [roastIdx] = useState(() => Math.floor(Math.random() * ROASTS.length));
  const roast = ROASTS[roastIdx];

  return (
    <div className="escape-overlay">
      <div style={{ textAlign: 'center', maxWidth: 700, padding: '0 24px' }}>
        <p style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: '1.1rem', color: '#2AACB8', marginBottom: 24, lineHeight: 1.6 }}>
          Stuck? Go to "Ask a Question" tab — pop quiz in {countdown} seconds
        </p>
        <p style={{ fontFamily: 'Space Mono', fontSize: '1rem', color: '#5A8A90', lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: 32 }}>
          {roast}
        </p>
        <p style={{ fontFamily: 'Space Mono', fontSize: '0.9rem', color: '#7A9A9A', marginBottom: 8 }}>guess which genius said this:</p>
        <p style={{ fontFamily: 'Inter', fontStyle: 'italic', fontSize: '1rem', color: '#4A3525', marginBottom: 4 }}>{userName}</p>
        <p style={{ fontFamily: 'Inter', fontStyle: 'italic', fontSize: '0.95rem', color: '#7b2d6e', marginBottom: 4 }}>{userGoal}</p>
        {nn1 && <p style={{ fontFamily: 'Inter', fontStyle: 'italic', fontSize: '0.85rem', color: '#6A8A6A' }}>{nn1}</p>}
        {nn2 && <p style={{ fontFamily: 'Inter', fontStyle: 'italic', fontSize: '0.85rem', color: '#6A8A6A' }}>{nn2}</p>}
        {nn3 && <p style={{ fontFamily: 'Inter', fontStyle: 'italic', fontSize: '0.85rem', color: '#6A8A6A' }}>{nn3}</p>}

        <button
          onClick={onReturnFullscreen}
          style={{ marginTop: 32, background: '#2AACB8', color: 'white', border: 'none', borderRadius: 12, padding: '12px 32px', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
        >
          Return to Fullscreen
        </button>
      </div>
    </div>
  );
}
