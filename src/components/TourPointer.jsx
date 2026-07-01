import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDarkMode } from '../lib/DarkModeContext';
import { finishTour } from '../lib/tourStore';

// Spotlight coachmark: dims the whole screen except a highlighted ring around
// the anchor element, with a small tooltip box carrying the step text.
export default function TourPointer({ anchorRef, text, step, placement = 'bottom' }) {
  const { dark } = useDarkMode();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    setPos(null);
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    // Anchor element may mount slightly after this effect runs (e.g. after a tab switch),
    // so keep polling frequently to pick it up and track any layout shifts.
    const id = setInterval(update, 150);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      clearInterval(id);
    };
  }, [anchorRef, step]);

  if (!pos) return null;

  let top, left, transformStyle = 'none';
  if (placement === 'bottom') { top = pos.top + pos.height + 14; left = pos.left; }
  else if (placement === 'top') { top = pos.top - 14; left = pos.left; transformStyle = 'translateY(-100%)'; }
  else if (placement === 'right') { top = pos.top; left = pos.left + pos.width + 14; }
  else { top = pos.top; left = pos.left - 14; transformStyle = 'translateX(-100%)'; }

  // Keep the tooltip box (~300px wide, ~160px tall) fully inside the viewport.
  // When translateX(-100%)/translateY(-100%) is applied, the box extends backwards
  // from (left, top), so the clamp range must shift accordingly or it clips off-screen.
  const TIP_W = 300, TIP_H = 160, MARGIN = 10;
  const flipX = transformStyle.includes('translateX');
  const flipY = transformStyle.includes('translateY');
  left = Math.max(flipX ? TIP_W + MARGIN : MARGIN, Math.min(left, flipX ? window.innerWidth - MARGIN : window.innerWidth - TIP_W - MARGIN));
  top = Math.max(flipY ? TIP_H + MARGIN : MARGIN, Math.min(top, flipY ? window.innerHeight - MARGIN : window.innerHeight - TIP_H - MARGIN));

  return createPortal(
    <>
      <div style={{
        position: 'fixed', zIndex: 9999, pointerEvents: 'none',
        top: pos.top - 6, left: pos.left - 6, width: pos.width + 12, height: pos.height + 12,
        borderRadius: 12, border: '3px solid #7b2d6e',
        boxShadow: '0 0 0 4000px rgba(0,0,0,0.5)',
        transition: 'all 0.25s ease',
      }} />
      <div style={{
        position: 'fixed', zIndex: 10000, top, left, transform: transformStyle,
        maxWidth: 280,
        background: dark ? 'rgba(30,10,46,0.95)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px) saturate(160%)',
        border: `1.5px solid ${dark ? 'rgba(199,125,255,0.5)' : '#7b2d6e'}`,
        borderRadius: 12, padding: '14px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        color: dark ? '#e8d5ff' : '#2D1B0E',
        fontFamily: 'Inter', fontSize: '0.85rem', lineHeight: 1.5,
      }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.72rem', color: dark ? '#a080c0' : '#9A8A7A' }}>({step}/6)</p>
        <p style={{ margin: 0, fontWeight: 500 }}>{text}</p>
        <button onClick={finishTour} style={{ marginTop: 10, background: 'none', border: 'none', color: dark ? '#a080c0' : '#9A8A7A', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Skip tour</button>
      </div>
    </>,
    document.body
  );
}
