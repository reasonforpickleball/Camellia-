import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDarkMode } from '../lib/DarkModeContext';
import { finishTour } from '../lib/tourStore';

// Like TourPointer, but spotlights MULTIPLE anchors at once using a single
// shared dim overlay (avoids the "double darkening" that happens when two
// separate full-screen overlays stack on top of each other).
export default function TourMultiPointer({ anchors, text, step, tooltipPlacement }) {
  const { dark } = useDarkMode();
  const [rects, setRects] = useState(null);

  useEffect(() => {
    setRects(null);
    const update = () => {
      const rs = anchors.map(a => {
        const el = a.ref.current;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width, height: r.height, placement: a.placement || 'bottom' };
      });
      if (rs.every(Boolean)) setRects(rs);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const id = setInterval(update, 150);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      clearInterval(id);
    };
  }, [anchors, step]);

  if (!rects) return null;

  const tipAnchor = rects[rects.length - 1];
  const placement = tooltipPlacement || tipAnchor.placement;
  let top, left, transformStyle = 'none';
  if (placement === 'bottom') { top = tipAnchor.top + tipAnchor.height + 14; left = tipAnchor.left; }
  else if (placement === 'top') { top = tipAnchor.top - 14; left = tipAnchor.left; transformStyle = 'translateY(-100%)'; }
  else if (placement === 'right') { top = tipAnchor.top; left = tipAnchor.left + tipAnchor.width + 14; }
  else { top = tipAnchor.top; left = tipAnchor.left - 14; transformStyle = 'translateX(-100%)'; }

  // When translateX(-100%)/translateY(-100%) is applied, the box extends backwards
  // from (left, top), so the clamp range must shift accordingly or it clips off-screen.
  const TIP_W = 300, TIP_H = 160, MARGIN = 10;
  const flipX = transformStyle.includes('translateX');
  const flipY = transformStyle.includes('translateY');
  left = Math.max(flipX ? TIP_W + MARGIN : MARGIN, Math.min(left, flipX ? window.innerWidth - MARGIN : window.innerWidth - TIP_W - MARGIN));
  top = Math.max(flipY ? TIP_H + MARGIN : MARGIN, Math.min(top, flipY ? window.innerHeight - MARGIN : window.innerHeight - TIP_H - MARGIN));

  const maskId = `tour-multi-mask-${step}`;

  return createPortal(
    <>
      <svg style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rects.map((r, i) => (
              <rect key={i} x={r.left - 6} y={r.top - 6} width={r.width + 12} height={r.height + 12} rx="12" fill="black" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask={`url(#${maskId})`} />
        {rects.map((r, i) => (
          <rect key={i} x={r.left - 6} y={r.top - 6} width={r.width + 12} height={r.height + 12} rx="12" fill="none" stroke="#7b2d6e" strokeWidth="3" />
        ))}
      </svg>
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
