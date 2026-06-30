import React, { useState, useEffect } from 'react';
import { CamelliaLogoSmall } from './CamelliaLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDarkMode, DarkModeToggle } from '@/lib/DarkModeContext';

const FEATURES = [
  { title: 'AI Coach', body: 'Analyze all your upcoming exams and gives you plans, stats, and predicted grades based on how you are doing.' },
  { title: 'AI Planner', body: 'Upload notes files to generate detailed study schedules.' },
  { title: 'Flashcards', body: 'AI generates flashcards about your topic for you to increase your readiness.' },
  { title: 'Ask Camellia', body: 'A built-in AI assistant that knows your notes and everything outside your notes to help you answer any questions you might have.' },
  { title: 'Yucca!', body: 'Educational dopamine to replace doomscrolling while actively and actually learning.' },
];

// Comparison table rows
const COMPARE = [
  'Stop Doomscrolling and Distractions',
  'Built-in AI study Planner and Quizzer',
  'Built-in Active Recall Logs',
  'Built-in Feynman Techniques Logs',
  'Built-in Cornell Notes Logs',
  'Everything Free Forever',
];

// New logos from NewLogosCA.zip
const LOGO_WITH_TEXT = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/407d67e21_3.png'; // flower + "camellia" text (big)
const LOGO_NO_TEXT = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/73e5dfbbe_2.png';   // flower only (small)
const LOGO_ICON = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/c2cb1a65a_1.png';     // yellow icon

export default function LandingPage({ onCreateAccount }) {
  const isReturning = localStorage.getItem('onboarding_complete') === 'true';
  const isMobile = useIsMobile();
  const { dark, theme } = useDarkMode();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // Supabase removed: no backend calls. Default to 0 users.
    setUserCount(0);
  }, []);

  // Inject animated gradient keyframes once
  React.useEffect(() => {
    const styleId = 'camellia-bg-anim';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        @keyframes bgShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .camellia-bg-light {
          background: linear-gradient(135deg, #FADCD0, #F5C9B0, #E8B890, #F0A080, #D4AB80, #FADCD0);
          background-size: 300% 300%;
          animation: bgShift 12s ease infinite;
        }
        .camellia-bg-dark {
          background: linear-gradient(135deg, #0d0a12, #1a0830, #120a1e, #2a0a40, #0a0814, #1a0830, #0d0a12);
          background-size: 400% 400%;
          animation: bgShift 15s ease infinite;
        }
        .camellia-bg-red {
          background: linear-gradient(135deg, #120508, #2e0808, #1e0505, #3d0a0a, #0a0204, #2e0808, #120508);
          background-size: 400% 400%;
          animation: bgShift 15s ease infinite;
        }
      `;
      document.head.appendChild(s);
    }
  }, []);



  const isRed = theme === 'red';
  const textMain = dark ? (isRed ? '#ffe8e8' : '#f0e6ff') : 'rgba(255,255,255,0.95)';
  const textSub = dark ? (isRed ? '#f0b8b8' : '#d0b8f0') : 'rgba(255,255,255,0.75)';
  const cardWhite = dark ? (isRed ? 'rgba(30,8,8,0.85)' : 'rgba(22,14,36,0.85)') : 'white';
  const cardBorder = dark ? (isRed ? 'rgba(180,40,40,0.4)' : 'rgba(90,40,130,0.4)') : '#E5D8C8';
  const featureBorder = dark ? (isRed ? '4px solid #ff6666' : '4px solid #c77dff') : '4px solid #7b2d6e';
  const accentColor = isRed ? '#cc3333' : '#7b2d6e';
  const accentLight = isRed ? '#ff8080' : (dark ? '#c77dff' : '#7b2d6e');

  return (
    <div className={theme === 'red' ? 'camellia-bg-red' : dark ? 'camellia-bg-dark' : 'camellia-bg-light'} style={{
      minHeight: '100vh',
      fontFamily: 'Roboto, Inter, sans-serif',
      overflowX: 'hidden',
    }}>
      {/* NAV — liquid glass */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 32px',
        margin: '16px 32px 0',
        borderRadius: 100,
        background: dark ? (isRed ? 'rgba(140,20,20,0.35)' : 'rgba(80,20,140,0.35)') : 'rgba(255,220,200,0.45)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: dark ? (isRed ? '1.5px solid rgba(255,80,80,0.4)' : '1.5px solid rgba(180,80,255,0.4)') : '1.5px solid rgba(255,200,170,0.7)',
        boxShadow: dark ? (isRed ? '0 8px 32px rgba(180,20,20,0.3), inset 0 1px 0 rgba(255,100,100,0.15)' : '0 8px 32px rgba(100,20,200,0.3), inset 0 1px 0 rgba(200,100,255,0.15)') : '0 8px 32px [...',
        position: 'sticky',
        top: 16,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={LOGO_WITH_TEXT} alt="Camellia" style={{ height: 44, objectFit: 'contain' }} />
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: dark ? '#e8d5ff' : '#5A1A40', cursor: 'pointer' }}>Home</span>
          <button
            onClick={onCreateAccount}
            style={{ fontSize: '1rem', fontWeight: 600, color: dark ? '#e8d5ff' : '#5A1A40', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {isReturning ? 'Go to Dashboard' : 'Create an Account'}
          </button>
          <DarkModeToggle />
        </nav>
      </header>

      {/* HERO SECTION — 2 col */}
      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, padding: '60px 60px 40px', alignItems: 'center' }}>
        {/* Left: big text + body */}
        <div>
          {/* Liquid glass "Trusted by" badge + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              background: dark ? (isRed ? 'rgba(140,20,20,0.4)' : 'rgba(80,20,140,0.4)') : 'rgba(255,200,170,0.55)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: dark ? (isRed ? '1.5px solid rgba(255,80,80,0.5)' : '1.5px solid rgba(180,80,255,0.5)') : '1.5px solid rgba(200,80,40,0.4)',
              borderRadius: 20,
              padding: '10px 24px',
              boxShadow: dark ? (isRed ? '0 4px 20px rgba(200,20,20,0.3)' : '0 4px 20px rgba(120,20,200,0.3)') : '0 4px 20px rgba(200,80,40,0.15)',
            }}>
              <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', color: dark ? (isRed ? '#ffb0b0' : '#d0b0ff') : '#7B1A2E', fontWeight: 600 }}>100% free</span>
              <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', fontWeight: 900, color: dark ? (isRed ? '#ff8888' : '#e8b8ff') : '#7B1A2E', lineHeight: 1.2, textAlign: 'center' }[...]
