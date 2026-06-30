import React, { useState, useEffect } from 'react';
import { CamelliaLogoSmall } from './CamelliaLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDarkMode, DarkModeToggle } from '@/lib/DarkModeContext';

const FEATURES = [
  { title: 'AI Coach', body: 'Analyze your upcoming exams and get plans, stats, and predicted grades.' },
  { title: 'AI Planner', body: 'Upload notes to generate detailed study schedules.' },
  { title: 'Flashcards', body: 'AI-generated flashcards for active recall.' },
  { title: 'Ask Camellia', body: 'A built-in assistant that helps answer questions about your notes.' },
  { title: 'Yucca!', body: 'Educational dopamine to replace doomscrolling.' },
];

const COMPARE = [
  'Stop Doomscrolling and Distractions',
  'Built-in AI study Planner and Quizzer',
  'Built-in Active Recall Logs',
  'Built-in Feynman Techniques Logs',
  'Built-in Cornell Notes Logs',
  'Everything Free Forever',
];

const LOGO_WITH_TEXT = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/407d67e21_3.png';
const LOGO_NO_TEXT = 'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/73e5dfbbe_2.png';

export default function LandingPage({ onCreateAccount }) {
  const isReturning = typeof window !== 'undefined' && localStorage.getItem('onboarding_complete') === 'true';
  const isMobile = useIsMobile();
  const { dark, theme } = useDarkMode();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // Supabase removed: default to 0 users in the landing UI.
    setUserCount(0);
  }, []);

  // simple animated backgrounds injected once
  useEffect(() => {
    const styleId = 'camellia-bg-anim';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        @keyframes bgShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .camellia-bg-light { background: linear-gradient(135deg, #FADCD0, #F5C9B0, #E8B890); background-size: 300% 300%; animation: bgShift 12s ease infinite; }
        .camellia-bg-dark { background: linear-gradient(135deg, #0d0a12, #1a0830, #120a1e); background-size: 400% 400%; animation: bgShift 15s ease infinite; }
        .camellia-bg-red { background: linear-gradient(135deg, #120508, #2e0808, #1e0505); background-size: 400% 400%; animation: bgShift 15s ease infinite; }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const isRed = theme === 'red';
  const accentLight = isRed ? '#ff8080' : (dark ? '#c77dff' : '#7b2d6e');
  const cardWhite = dark ? (isRed ? 'rgba(30,8,8,0.85)' : 'rgba(22,14,36,0.85)') : 'white';
  const cardBorder = dark ? (isRed ? 'rgba(180,40,40,0.4)' : 'rgba(90,40,130,0.4)') : '#E5D8C8';

  return (
    <div className={theme === 'red' ? 'camellia-bg-red' : dark ? 'camellia-bg-dark' : 'camellia-bg-light'} style={{ minHeight: '100vh', fontFamily: 'Roboto, Inter, sans-serif', overflowX: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px', margin: '16px 32px 0', borderRadius: 100, background: dark ? 'rgba(80,20,140,0.35)' : 'rgba(255,220,200,0.45)', backdropFilter: 'blur(24px) saturate(180%)', position: 'sticky', top: 16, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={LOGO_WITH_TEXT} alt="Camellia" style={{ height: 44, objectFit: 'contain' }} />
        </div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: dark ? '#e8d5ff' : '#5A1A40', cursor: 'pointer' }}>Home</span>
          <button onClick={onCreateAccount} style={{ fontSize: '1rem', fontWeight: 600, color: dark ? '#e8d5ff' : '#5A1A40', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {isReturning ? 'Go to Dashboard' : 'Create an Account'}
          </button>
          <DarkModeToggle />
        </nav>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, padding: '60px 60px 40px', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: dark ? 'rgba(80,20,140,0.35)' : 'rgba(255,200,170,0.55)', borderRadius: 20, padding: '10px 24px' }}>
              <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', color: dark ? '#d0b0ff' : '#7B1A2E', fontWeight: 600 }}>100% free</span>
              <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', fontWeight: 900, color: dark ? '#e8b8ff' : '#7B1A2E', lineHeight: 1.2, textAlign: 'center' }}>camellia</span>
              <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', color: dark ? '#d0b0ff' : '#7B1A2E', fontWeight: 600 }}>ever</span>
            </div>
            <button onClick={onCreateAccount} style={{ background: 'rgba(123,45,110,0.9)', color: 'white', border: '2px solid rgba(200,130,255,0.4)', borderRadius: 20, padding: '20px 48px', fontSize: '1.35rem', fontWeight: 900, cursor: 'pointer' }}>
              {isReturning ? 'Continue Studying ↵' : 'Create a Study Session ↵'}
            </button>
          </div>

          <h1 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: 'clamp(3.5rem, 7vw, 6rem)', lineHeight: 0.92, color: accentLight, marginBottom: 24, textTransform: 'lowercase' }}>
            they don't know you<br />like i know you
          </h1>
          <p style={{ fontSize: '1rem', color: dark ? 'rgba(230,210,255,0.88)' : '#3A1020', lineHeight: 1.75, maxWidth: 440, fontWeight: 500 }}>
            <strong>I am not like them.</strong> Camellia is designed to understand the student. Built-in study tools and BYOK AI provider options keep your data local to your device.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 420, background: '#1a1a2e', borderRadius: 16, padding: '10px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
            <div style={{ background: dark ? '#1a1020' : '#F5EDE0', borderRadius: 10, minHeight: 260, display: 'flex' }}>
              <div style={{ width: 80, background: dark ? '#120a1c' : '#F0E4D4', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <img src={LOGO_NO_TEXT} alt="Camellia" style={{ width: 36, height: 36, objectFit: 'contain', marginBottom: 6 }} />
                {['Timer', 'To-do list', 'Feynman', 'Active recall', 'Cornell Notes', 'AI Planner', 'Ask Camellia'].map(l => (
                  <div key={l} style={{ fontSize: '0.5rem', color: dark ? '#c0a0e0' : '#8A7A6A', padding: '2px 4px', fontFamily: 'Roboto, sans-serif' }}>{l}</div>
                ))}
              </div>
              <div style={{ flex: 1, padding: '12px 14px', position: 'relative' }}>
                <p style={{ fontSize: '0.55rem', fontWeight: 700, color: dark ? '#e8d5ff' : '#2D1B0E', marginBottom: 4, fontFamily: 'Roboto, sans-serif' }}>Unit 3: Stoichiometry &amp; Gas Laws</p>
                <p style={{ fontSize: '0.5rem', color: dark ? '#c4a0e0' : '#4A3525', fontWeight: 700, marginBottom: 2, fontFamily: 'Roboto, sans-serif' }}>The Mole Concept</p>
              </div>
            </div>
            <div style={{ height: 8, background: '#2a2a3e', borderRadius: '0 0 6px 6px', marginTop: 4 }} />
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? '40px 20px' : '60px 60px' }}>
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: accentLight, textAlign: 'center', marginBottom: 32 }}>the complete study suite</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: cardWhite, borderRadius: 16, padding: '24px 20px', boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)', borderTop: `4px solid ${accentLight}` }}>
              <p style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#7b2d6e', marginBottom: 10 }}>{f.title}</p>
              <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.9rem', color: dark ? '#d0b0ff' : '#3A1020', lineHeight: 1.6, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 60px', background: dark ? 'rgba(0,0,0,0.35)' : 'rgba(90,26,64,0.1)' }}>
        <span style={{ fontSize: '0.85rem', color: dark ? '#d0b0ff' : '#5A1A40', fontWeight: 500, fontFamily: 'Roboto, sans-serif' }}>Camellia 2026, built in Temple City, California</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <img src={LOGO_NO_TEXT} alt="Camellia" style={{ height: 32, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.65rem', color: dark ? '#c0a0e0' : '#7b2d6e', fontWeight: 600 }}>{userCount}</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: dark ? '#d0b0ff' : '#5A1A40', fontWeight: 500, fontFamily: 'Roboto, sans-serif' }}>Make studying tools accessible to all people and backgrounds</span>
      </footer>
    </div>
  );
}
