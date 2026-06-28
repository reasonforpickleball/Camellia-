import React, { useState, useEffect } from 'react';
import { getWeekStreakInfo, dismissStreakBadge } from '../lib/stats';

const FONT = "'Roboto', Arial, Helvetica, sans-serif";

// New badge URLs from NewBadgesCA.zip
// 1.png = 2-week streak, 2.png = 3-week streak, 3.png = 4-week streak
const BADGE_URLS = {
  2: 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/0852a631d_1.png',
  3: 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/2e9be4203_2.png',
  4: 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/688f47433_3.png',
};

export default function StreakBadgePopup() {
  const [show, setShow] = useState(false);
  const [weekStreak, setWeekStreak] = useState(0);

  useEffect(() => {
    const { consecutive, badgeDismissed } = getWeekStreakInfo();
    // Show badge for 2, 3, or 4+ consecutive weeks if not yet dismissed for this level
    if (consecutive >= 2 && badgeDismissed < consecutive) {
      // Cap at 4 (we have 3 badges: 2, 3, 4+)
      const level = Math.min(consecutive, 4);
      setWeekStreak(level);
      setShow(true);
    }
  }, []);

  if (!show || weekStreak < 2) return null;

  const badgeUrl = BADGE_URLS[weekStreak];
  const streakLabel = `${weekStreak} week streak`;

  const handleDismiss = () => {
    dismissStreakBadge(weekStreak);
    setShow(false);
  };

  // Download: create a link that opens the image in a new tab (since cross-origin download needs user gesture)
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = badgeUrl;
    a.download = `camellia-${weekStreak}-week-streak-badge.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 24,
          padding: '36px 32px',
          maxWidth: 400,
          width: '90vw',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none',
            fontSize: '1.3rem', cursor: 'pointer', color: '#9A8A7A',
            lineHeight: 1,
          }}
        >×</button>

        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎉</div>
        <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.25rem', color: '#4A3525', marginBottom: 8 }}>
          Congrats on completing your {streakLabel}!
        </h3>
        <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: '#7A6A5A', lineHeight: 1.6, marginBottom: 20 }}>
          If you enjoy our website, please share your badge below to help us reach more people!
        </p>

        {/* Badge image displayed directly — no redirect */}
        <div style={{ marginBottom: 20 }}>
          <img
            src={badgeUrl}
            alt={`${streakLabel} badge`}
            style={{
              width: '100%', maxWidth: 280, height: 'auto',
              borderRadius: 16,
              display: 'block', margin: '0 auto 14px',
            }}
          />
          <button
            onClick={handleDownload}
            style={{
              background: '#7b2d6e', color: 'white', border: 'none',
              borderRadius: 12, padding: '10px 28px',
              fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            Download Badge
          </button>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            background: 'none', border: '1.5px solid #E5D8C8',
            borderRadius: 10, padding: '8px 24px',
            fontFamily: FONT, fontSize: '0.85rem', color: '#9A8A7A', cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
