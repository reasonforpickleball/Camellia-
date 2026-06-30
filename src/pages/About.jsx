import React from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDarkMode, DarkModeToggle } from '@/lib/DarkModeContext';

const LOGO_WITH_TEXT = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/407d67e21_3.png';
const LOGO_NO_TEXT = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/73e5dfbbe_2.png';

export default function About() {
  const isMobile = useIsMobile();
  const { dark, theme } = useDarkMode();
  const isRed = theme === 'red';
  const isReturning = localStorage.getItem('onboarding_complete') === 'true';

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

  const accentLight = isRed ? '#ff8080' : (dark ? '#c77dff' : '#7b2d6e');
  const textMain = dark ? (isRed ? '#ffe8e8' : '#f0e6ff') : 'rgba(255,255,255,0.95)';
  const textSub = dark ? (isRed ? '#f0b8b8' : '#d0b8f0') : 'rgba(255,255,255,0.75)';
  const cardWhite = dark ? (isRed ? 'rgba(30,8,8,0.85)' : 'rgba(22,14,36,0.85)') : 'white';
  const cardBorder = dark ? (isRed ? 'rgba(180,40,40,0.4)' : 'rgba(90,40,130,0.4)') : '#E5D8C8';

  return (
    <div className={theme === 'red' ? 'camellia-bg-red' : dark ? 'camellia-bg-dark' : 'camellia-bg-light'} style={{
      minHeight: '100vh',
      fontFamily: 'Roboto, Inter, sans-serif',
      overflowX: 'hidden',
    }}>
      {/* HEADER */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 32px',
        margin: '16px 32px 0',
        borderRadius: 100,
        background: dark ? (isRed ? 'rgba(140,20,20,0.35)' : 'rgba(80,20,140,0.35)') : 'rgba(255,220,200,0.45)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: dark ? (isRed ? '1.5px solid rgba(255,80,80,0.4)' : '1.5px solid rgba(180,80,255,0.4)') : '1.5px solid rgba(255,200,170,0.7)',
        boxShadow: dark ? (isRed ? '0 8px 32px rgba(180,20,20,0.3), inset 0 1px 0 rgba(255,100,100,0.15)' : '0 8px 32px rgba(100,20,200,0.3), inset 0 1px 0 rgba(200,100,255,0.15)') : '0 8px 32px rgba(200,100,40,0.2), inset 0 1px 0 rgba(255,200,150,0.2)',
        position: 'sticky',
        top: 16,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO_WITH_TEXT} alt="Camellia" style={{ height: 44, objectFit: 'contain' }} />
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: '1rem', fontWeight: 600, color: dark ? '#e8d5ff' : '#5A1A40', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)' }} onMouseEnter={e => e.currentTarget.style.color = accentLight} onMouseLeave={e => e.currentTarget.style.color = dark ? '#e8d5ff' : '#5A1A40'}>Home</Link>
          <Link to="/about" style={{ fontSize: '1rem', fontWeight: 600, color: accentLight, cursor: 'pointer', textDecoration: 'none', opacity: 0.9 }}>About</Link>
          <Link to="/contact" style={{ fontSize: '1rem', fontWeight: 600, color: dark ? '#e8d5ff' : '#5A1A40', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)' }} onMouseEnter={e => e.currentTarget.style.color = accentLight} onMouseLeave={e => e.currentTarget.style.color = dark ? '#e8d5ff' : '#5A1A40'}>Contact</Link>
          <DarkModeToggle />
        </nav>
      </header>

   import React, { useState, useEffect } from 'react';
import { CamelliaLogoSmall } from './CamelliaLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDarkMode, DarkModeToggle } from '@/lib/DarkModeContext';
import { supabase } from '@/lib/supabase';

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

  const { dark, theme } = useDarkMode();

  useEffect(() => {

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
 
      {/* LAZER FOCUSED SECTION */}
      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, padding: '60px 60px', alignItems: 'center', background: 'rgba(255,255,255,0.08)' }}>
        {/* Left: pop quiz + planner mockups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pop quiz mockup */}
          <div style={{ background: '#FDECC8', borderRadius: 12, padding: '16px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2D1B0E', marginBottom: 8, lineHeight: 1.5, textAlign: 'center', fontFamily: 'Roboto, sans-serif' }}>
              POP QUIZ — You left full screen. Camellia rewarded you with a pop quiz on your material. Remember your goals!<br />
              <span style={{ fontStyle: 'italic' }}>"I want to go to UC Davis."</span> — You
            </p>
            <div style={{ background: '#E07B39', borderRadius: 20, height: 10, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#E07B39' }}>3</div>
            </div>
            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2D1B0E', textAlign: 'center', marginBottom: 12 }}>Why did Romeo flee to Mantua?</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 4 }}>
              {['He was banished by the prince.', 'He never went to Mantua.'].map((o, i) => (
                <button key={o} style={{ background: i === 0 ? '#C2185B' : '#E8A598', color: 'white', border: 'none', borderRadius: 6, padding: '10px 8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter' }}>{o}</button>
              ))}
            </div>
          </div>
          {/* Planner mockup */}
          <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 60, background: '#F5EDE0', borderRadius: 8, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['To Do', 'Feynman', 'Active recall', 'Ask', 'AI Study Planner'].map(l => (
                <div key={l} style={{ fontSize: '0.4rem', color: '#8A7A6A' }}>{l}</div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2D1B0E', marginBottom: 6 }}>Camellia AI Study Planner</p>
              <div style={{ background: '#F0E4D4', borderRadius: 6, height: 24, marginBottom: 6, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                <p style={{ fontSize: '0.5rem', color: '#8A7A6A' }}>Work goal and due date...</p>
              </div>
              <div style={{ background: '#F0E4D4', borderRadius: 6, height: 32, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '0.48rem', color: '#8A7A6A' }}>Add File or drag here</p>
              </div>
              <div style={{ background: '#E07B39', borderRadius: 12, height: 18, width: '80%', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '40%', top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: 'white', border: '2px solid #E07B39', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 700, color: '#E07B39' }}>5</div>
              </div>
            </div>
            <div style={{ background: '#5C3D2E', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', flexShrink: 0 }}>→</div>
          </div>
        </div>

        {/* Right: LAZER FOCUSED text */}
        <div>
          <h2 style={{
            fontFamily: 'Roboto, sans-serif', fontWeight: 900,
            fontSize: 'clamp(3rem, 5vw, 5.5rem)',
            lineHeight: 0.9, color: accentLight,
            marginBottom: 24, letterSpacing: '-0.02em',
          }}>
            fullscreen<br />focused
          </h2>
          <p style={{ fontSize: '1rem', color: dark ? 'rgba(230,210,255,0.88)' : '#3A1020', lineHeight: 1.7, fontWeight: 500, maxWidth: 380 }}>
            Every time you exit full screen during a study session, you will be rewarded with three extra questions, and one more for each you missed! If that doesn't stop you from getting distracted, you're cooked.
          </p>
        </div>
      </section>

      {/* BRIDGE SECTION + COMPARISON TABLE */}
      <section style={{ padding: '60px 60px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 60, alignItems: 'center' }}>
        <div>
          <p style={{
            fontFamily: 'Roboto, sans-serif', fontWeight: 900,
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
            color: dark ? (isRed ? '#ffe8e8' : '#f0e6ff') : '#3A1020', lineHeight: 1.4, textAlign: 'center',
          }}>
            We are the only program in the world that bridge the crucial gap between controlling endless scrolling and studying efficiently with scientific tools proven by experts.
          </p>
        </div>
        {/* Comparison table */}
        <div style={{ background: cardWhite, borderRadius: 16, overflow: 'hidden', boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)', border: dark ? `1px solid ${cardBorder}` : 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '14px 20px', borderBottom: `1px solid ${dark ? 'rgba(90,40,130,0.3)' : 'rgba(90,30,50,0.15)'}` }}>
            <div />
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: dark ? '#f0e6ff' : '#3A1020', textAlign: 'center', paddingRight: 24 }}>Camellia</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: dark ? '#f0e6ff' : '#3A1020', textAlign: 'center', minWidth: 60 }}>Forest</div>
          </div>
          {COMPARE.map((row, i) => (
            <div key={row} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '13px 20px', borderBottom: i < COMPARE.length - 1 ? `1px solid ${dark ? 'rgba(90,40,130,0.2)' : 'rgba(90,30,50,0.1)'}` : 'none', background: i % 2 === 0 ? 'transparent' : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,230,220,0.3)') }}>
              <span style={{ fontSize: '0.88rem', fontFamily: 'Roboto, sans-serif', color: dark ? '#d0b0ff' : '#3A1020' }}>{row}</span>
              <div style={{ display: 'flex', justifyContent: 'center', paddingRight: 24 }}>
                <span style={{ color: '#7b2d6e', fontSize: '1rem' }}>✓</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', minWidth: 60 }}>
                {i === 0 ? <span style={{ color: '#7b2d6e', fontSize: '1rem' }}>✓</span> : <span style={{ color: '#CC0000', fontSize: '1rem' }}>✗</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 STUDY METHODS SECTION */}
      <section style={{ padding: '60px 60px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 60, alignItems: 'center', background: dark ? 'rgba(60,10,100,0.2)' : 'rgba(200,80,40,0.07)' }}>
        {/* Active Recall mockup */}
        <div style={{ background: dark ? '#1a0a2e' : 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
          <div style={{ background: dark ? '#120a1e' : '#F2EAE0', padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', borderBottom: dark ? '1px solid rgba(90,40,130,0.4)' : '1px solid #E5D8C8' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Tutorial', 'Notebook 1', 'Recall 1', '+'].map(t => (
                <span key={t} style={{ fontSize: '0.7rem', color: t === 'Tutorial' ? (dark ? '#e8d5ff' : '#2D1B0E') : (dark ? '#a080c0' : '#8A7A6A'), background: t === 'Tutorial' ? (dark ? 'rgba(180,80,255,0.15)' : 'rgba(45,27,14,0.08)') : 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'Roboto, sans-serif', border: t === 'Tutorial' ? (dark ? '1px solid rgba(180,80,255,0.4)' : '1px solid #2D1B0E') : 'none' }}>{t}</span>
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dark ? '#e8d5ff' : '#2D1B0E', fontFamily: 'Roboto, sans-serif' }}>24:59</span>
          </div>
          <div style={{ padding: '28px 28px', minHeight: 220, background: dark ? '#1a0a2e' : 'white' }}>
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.82rem', color: dark ? '#d0b0f0' : '#2D1B0E', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{`Welcome to active recall,

• On the "Notebook 1" page, write the first part of your notes from a lesson or textbook. Then, click the "Recall 1" page.

• On "Recall 1," write all you remember using only your memory.

• After you dump everything you got from your mind into the page, click back on "Notebook" to see what you missed.

• Click the plus button, put the points you missed in "Notebook 2", as well as the next session of your notes, and repeat the process.

Congrats! You've learned active recall.`}</p>
          </div>
        </div>
        {/* Right: big text */}
        <div>
          <h2 style={{
            fontFamily: 'Roboto, sans-serif', fontWeight: 900,
            fontSize: 'clamp(3rem, 5vw, 5rem)',
            lineHeight: 0.92, color: accentLight,
            marginBottom: 24, letterSpacing: '-0.02em',
          }}>
            10 study<br />methods<br />on 1 site
          </h2>
          <p style={{ fontSize: '1rem', color: dark ? 'rgba(230,210,255,0.88)' : '#3A1020', lineHeight: 1.7, fontWeight: 500, maxWidth: 380 }}>
            This is a sample of what your active recall interface will look like, our other interfaces are Feynman, Active recall, Cornell Notes, Flashcard Deck, Quizzes, Ask a question, Yucca, Essay, Mind Map, and Podcast. I really recommend BYOKing OpenAI for the podcast quality, but if you're stingy like me, then stick with the tacky browser TTS podcast using free Groq.
          </p>
        </div>
      </section>

      {/* AI PROVIDERS SECTION */}
      <section style={{ padding: isMobile ? '40px 20px' : '60px 60px', background: dark ? 'rgba(60,10,100,0.25)' : 'rgba(200,80,40,0.1)' }}>
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: accentLight, textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em', textTransform: 'lowercase' }}>
          byok (bring your own key)
        </h2>
        <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', color: dark ? 'rgba(230,210,255,0.88)' : '#3A1020', textAlign: 'center', marginBottom: 36, fontWeight: 500, maxWidth: 700, margin: '0 auto 36px' }}>
          Now this is the part I am most proud of. So, basically you spend two minutes of your precious time, setting up an API key - 4 options, 2 paid &amp; 2 for free - then you plug it in to Camellia, and TA-DA! Your AI is set for life. (Unless the AI companies go bankrupt.)
        </p>
        {/* Mockup card */}
        <div style={{ maxWidth: 700, margin: '0 auto', background: cardWhite, borderRadius: 20, boxShadow: dark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.14)', overflow: 'hidden', border: dark ? `1px solid ${cardBorder}` : 'none' }}>
          {/* Panel header */}
          <div style={{ background: dark ? 'rgba(14,6,26,0.9)' : '#F8F4EE', borderBottom: `1.5px solid ${cardBorder}`, padding: '16px 24px' }}>
            <p style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: dark ? '#f0e6ff' : '#2D1B0E', margin: 0 }}>Settings — AI Provider</p>
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.8rem', color: dark ? '#c0a0e0' : '#7A6A5A', margin: '3px 0 0' }}>Your API key is stored only in your browser — never sent to any server.</p>
          </div>
          {/* 4 provider cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, padding: '20px 24px 16px' }}>
            {[
              { label: 'OpenAI', sub: 'GPT-4o, Mini…', color: '#10A37F', free: false },
              { label: 'Anthropic', sub: 'Claude Opus…', color: '#D97706', free: false },
              { label: 'Google AI', sub: 'Gemini Flash…', color: '#4285F4', free: true },
              { label: 'Groq', sub: 'Llama, Mixtral…', color: '#F55036', free: true },
            ].map((p, i) => (
              <div key={p.label} style={{
                padding: '12px 12px', borderRadius: 10, position: 'relative', cursor: 'default',
                border: i === 2 ? `2px solid ${p.color}` : `2px solid ${cardBorder}`,
                background: i === 2 ? p.color + '18' : (dark ? 'rgba(30,10,46,0.5)' : 'white'),
              }}>
                {p.free && (
                  <span style={{ position: 'absolute', top: 6, right: 6, background: '#7b2d6e', color: 'white', fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px', borderRadius: 8, fontFamily: 'Inter' }}>FREE</span>
                )}
                <p style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: i === 2 ? p.color : (dark ? '#f0e6ff' : '#2D1B0E'), margin: '0 0 3px' }}>{p.label}</p>
                <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.7rem', color: dark ? '#c0a0e0' : '#7A6A5A', margin: 0 }}>{p.sub}</p>
              </div>
            ))}
          </div>
          {/* Fake input row */}
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ background: '#F0FDF4', border: '1.5px solid #22C55E', borderRadius: 8, padding: '8px 14px', marginBottom: 10 }}>
              <p style={{ fontFamily: 'Inter', fontSize: '0.78rem', color: '#166534', margin: 0, fontWeight: 600 }}>Google AI Studio offers a generous free tier — no billing required to start.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ flex: 1, background: dark ? 'rgba(14,6,26,0.8)' : '#F8F4EE', border: `1.5px solid ${cardBorder}`, borderRadius: 8, padding: '9px 14px' }}>
                <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.82rem', color: dark ? '#f0e6ff' : '#2D1B0E' }}>ilovecamellia<span style={{ letterSpacing: '0.05em' }}>••••••••••••••</span></span>
              </div>
              <div style={{ background: '#7b2d6e', borderRadius: 8, padding: '9px 16px' }}>
                <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: 'white' }}>Save</span>
              </div>

            </div>
            <div style={{ background: dark ? 'rgba(80,20,120,0.25)' : '#f3e8ff', border: `1px solid ${dark ? 'rgba(160,80,255,0.5)' : '#c77dff'}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
              <span style={{ fontFamily: 'Inter', fontSize: '0.85rem', color: dark ? '#c77dff' : '#7b2d6e', fontWeight: 700 }}>Your AI is connected and ready to go!</span>
            </div>
          </div>
        </div>
      </section>

      {/* FREE? SECTION */}
      <section style={{ padding: isMobile ? '40px 20px' : '60px 60px', background: dark ? 'rgba(40,10,70,0.3)' : 'rgba(245,235,255,0.5)' }}>
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: accentLight, textAlign: 'center', marginBottom: 32, letterSpacing: '-0.02em', textTransform: 'lowercase' }}>
          free?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 40, maxWidth: 1000, margin: '0 auto', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', color: dark ? 'rgba(230,210,255,0.88)' : '#3A1020', lineHeight: 1.85, margin: '0 0 18px' }}>
              Hey, it's me, founder of Camellia! I am sure you are pretty skeptical about giving your data away to random free services. To be honest, I would be too. What would this even be free? So I'll tell you exactly why! Let's start with the basics.
            </p>
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', color: dark ? 'rgba(230,210,255,0.88)' : '#3A1020', lineHeight: 1.85, margin: '0 0 18px' }}>
              During freshman finals, I was frustrated that there were no free AI Study options that brought everything together in one place while curbing my urge to scroll. So I started researching in the summer and discovered a thing called BYOK, which lets users plug in their own AI. Since individual students usually don't use much PPM compared to entire companies, they can get it for free. And if individuals can do it for free, the host does not have to pay for an AI, thus an AI Study website is theoretically possible for free!
            </p>
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', color: dark ? 'rgba(230,210,255,0.88)' : '#3A1020', lineHeight: 1.85, margin: '0 0 18px' }}>
              Now, I know nothing about coding… The only thing I coded was a scratch project in sixth grade! So I learned how to use Claude and Base 44 while designing my logos and graphs on Canva. Then use Docs to draft ideas and functions. All on a school Chromebook with a cracked corner (see photo). As you can tell, there is no cost for that, nor is there any hosting, since I am using a Cloudflare subdomain. Thus, you do not need to pay! (Well, of course, if you want to plug in a premium AI, you will need to pay on your own with the provider)
            </p>
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', color: accentLight, fontWeight: 700, margin: 0 }}>Have Fun!</p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <img
              src="https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/2e5fec993_image.png"
              alt="School Chromebook with cracked corner"
              style={{ width: isMobile ? '100%' : 320, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', objectFit: 'cover', display: 'block', imageRendering: 'crisp-edges', filter: 'contrast(1.08) saturate(1.05)' }}
            />
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.72rem', color: dark ? '#a080c0' : '#7A6A5A', fontStyle: 'italic', textAlign: 'center', marginTop: 8, maxWidth: 320 }}>
              picture of my desk, and the lovely Chromebook screen I broke during Geo - interested in donating a Mac for me :)
            </p>
            <img
              src="https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/60c05077f_image.png"
              alt="random capybara"
              style={{ width: isMobile ? '100%' : 320, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', objectFit: 'cover', display: 'block', marginTop: 12 }}
            />
            <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.72rem', color: dark ? '#a080c0' : '#7A6A5A', fontStyle: 'italic', textAlign: 'center', marginTop: 8, maxWidth: 320 }}>
              random capybara
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 60px 40px', textAlign: 'center' }}>
        <button
          onClick={onCreateAccount}
          style={{
            background: 'rgba(123,45,110,0.85)', color: 'white', border: '1.5px solid rgba(200,130,255,0.3)',
            borderRadius: 14, padding: isMobile ? '16px 36px' : '18px 64px',
            fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 800, cursor: 'pointer',
            fontFamily: 'Roboto, sans-serif',
            boxShadow: '0 6px 24px rgba(123,45,110,0.35)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(123,45,110,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 24px rgba(123,45,110,0.35)'; }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0) scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; }}
        >
          {isReturning ? 'Continue Studying ↵' : 'Create a Study Session ↵'}
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 60px', background: dark ? 'rgba(0,0,0,0.35)' : 'rgba(90,26,64,0.1)' }}>
        <span style={{ fontSize: '0.85rem', color: dark ? '#d0b0ff' : '#5A1A40', fontWeight: 500, fontFamily: 'Roboto, sans-serif' }}>Camellia 2026, built in Temple City, California</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <img src={LOGO_NO_TEXT} alt="Camellia" style={{ height: 32, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.65rem', color: dark ? '#c0a0e0' : '#7b2d6e', fontWeight: 600 }}>{userCount}</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: dark ? '#d0b0ff' : '#5A1A40', fontWeight: 500, fontFamily: 'Roboto, sans-serif' }}>Make studying tools accessible to all people and backgrounds</span>
