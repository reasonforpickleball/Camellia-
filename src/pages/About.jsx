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

      {/* HERO SECTION */}
      <section style={{ padding: '60px 60px 40px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'Roboto, sans-serif', fontWeight: 900,
          fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          lineHeight: 0.95, color: accentLight,
          marginBottom: 24, letterSpacing: '-0.02em',
          textTransform: 'lowercase',
        }}>
          About Camellia<br />— the missing pieces
        </h1>
        <div style={{ width: 'clamp(60px, 20%, 120px)', height: 3, background: dark ? '#c77dff' : '#7b2d6e', margin: '24px auto 32px' }} />
        <p style={{ fontSize: '1.1rem', color: dark ? textSub : '#3A1020', lineHeight: 1.8, maxWidth: 800, margin: '0 auto 0', fontWeight: 500 }}>
          Camellia is designed to understand the student. Built with privacy, accessibility, and free forever in mind.
        </p>
      </section>

      {/* WHY DIFFERENT SECTION */}
      <section style={{ padding: isMobile ? '40px 20px' : '60px 60px' }}>
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: accentLight, textAlign: 'center', marginBottom: 32, letterSpacing: '-0.02em' }}>
          why we're different
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
          {[
            { title: 'Privacy First', desc: 'Your data stays on YOUR device. Nowhere else. We can\'t access it, sell it, or store it.' },
            { title: 'Forever Free', desc: 'No paywall, no hidden costs, no subscription trap. Everything included, always.' },
            { title: 'Scientifically Proven', desc: 'Built on evidence-based study methods: Active Recall, Spaced Repetition, and more.' }
          ].map(item => (
            <div key={item.title} style={{
              background: cardWhite,
              borderRadius: 16,
              padding: '32px 24px',
              boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
              border: `1.5px solid ${cardBorder}`,
              transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = dark ? '0 16px 40px rgba(0,0,0,0.6)' : '0 16px 40px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)';
            }}
            >
              <h3 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: accentLight, marginBottom: 12 }}>{item.title}</h3>
              <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.95rem', color: dark ? textSub : '#3A1020', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={{ padding: isMobile ? '40px 20px' : '60px 60px', background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: accentLight, textAlign: 'center', marginBottom: 32, letterSpacing: '-0.02em' }}>
          built for every study method
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
          {['Active Recall', 'Spaced Repetition', 'Feynman Technique', 'Cornell Notes'].map(method => (
            <div key={method} style={{
              background: cardWhite,
              borderRadius: 16,
              padding: '24px 20px',
              boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
              border: `1.5px solid ${cardBorder}`,
              transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = dark ? '0 16px 40px rgba(0,0,0,0.6)' : '0 16px 40px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)';
            }}
            >
              <p style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: accentLight, margin: 0 }}>{method}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DETAILS SECTION */}
      <section style={{ padding: isMobile ? '40px 20px' : '60px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: '2rem', color: accentLight, marginBottom: 24, letterSpacing: '-0.02em' }}>
            The story
          </h2>
          <div style={{ display: 'grid', gap: 20 }}>
            {[
              { title: 'Why I built this', body: 'During freshman finals, I was frustrated that there were no free AI study tools that brought everything together in one place while curbing my urge to scroll. So I started researching how to build this product.' },
              { title: 'Your data, your control', body: 'Your data ONLY stays in your browser cache and with the AI provider YOU chose. Nowhere else. Clear your cookies, clear your cache — it\'s gone. Camellia never stores anything on our servers.' },
              { title: 'BYOK: Bring Your Own Key', body: 'Choose your AI provider in 2 minutes. OpenAI, Anthropic, Google AI (free tier available), or Groq. Your API key stays in your browser. We never touch it.' },
            ].map(item => (
              <div key={item.title} style={{
                background: dark ? (isRed ? 'rgba(30,8,8,0.5)' : 'rgba(22,14,36,0.5)') : 'rgba(255,255,255,0.7)',
                border: `1.5px solid ${cardBorder}`,
                borderRadius: 16,
                padding: '28px 32px',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = dark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '';
              }}
              >
                <h3 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: accentLight, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontFamily: 'Roboto, sans-serif', fontSize: '1rem', color: dark ? textSub : '#2A1020', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{ padding: isMobile ? '40px 20px' : '60px 60px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 900, fontSize: '2rem', color: accentLight, marginBottom: 16, letterSpacing: '-0.02em' }}>
          Ready to study smarter?
        </h2>
        <p style={{ fontSize: '1rem', color: dark ? textSub : '#3A1020', lineHeight: 1.7, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
          Start your free study session. No sign-up required. No payment. Ever.
        </p>
        <button
          onClick={() => window.location.hash = '#create-account'}
          style={{
            background: 'rgba(123,45,110,0.9)', color: 'white',
            border: '2px solid rgba(200,130,255,0.4)',
            borderRadius: 20, padding: '18px 48px',
            fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
            fontFamily: 'Roboto, sans-serif',
            boxShadow: '0 8px 32px rgba(123,45,110,0.45)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(123,45,110,0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(123,45,110,0.45)'; }}
        >
          Start Studying ↵
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 60px', background: dark ? 'rgba(0,0,0,0.35)' : 'rgba(90,26,64,0.1)', borderTop: dark ? (isRed ? '1px solid rgba(180,40,40,0.2)' : '1px solid rgba(90,40,130,0.2)') : '1px solid rgba(200,100,50,0.2)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <span style={{ fontSize: '0.85rem', color: dark ? '#d0b0ff' : '#5A1A40', fontWeight: 500, fontFamily: 'Roboto, sans-serif' }}>Camellia 2026, built in Temple City, California</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <img src={LOGO_NO_TEXT} alt="Camellia" style={{ height: 32, objectFit: 'contain' }} />
        </div>
        <span style={{ fontSize: '0.85rem', color: dark ? '#d0b0ff' : '#5A1A40', fontWeight: 500, fontFamily: 'Roboto, sans-serif' }}>Make studying tools accessible to all</span>
      </footer>
    </div>
  );
}
