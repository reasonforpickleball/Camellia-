```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDarkMode, DarkModeToggle } from '@/lib/DarkModeContext';

const LOGO_WITH_TEXT =
  'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/407d67e21_3.png';

const LOGO_NO_TEXT =
  'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/73e5dfbbe_2.png';

const COMPARE = [
  'Stop Doomscrolling and Distractions',
  'Built-in AI Study Planner and Quizzer',
  'Built-in Active Recall Logs',
  'Built-in Feynman Techniques Logs',
  'Built-in Cornell Notes Logs',
  'Everything Free Forever',
];

export default function About() {
  const isMobile = useIsMobile();
  const { dark, theme } = useDarkMode();

  const isRed = theme === 'red';

  const isReturning =
    localStorage.getItem('onboarding_complete') === 'true';

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
          background: linear-gradient(
            135deg,
            #FADCD0,
            #F5C9B0,
            #E8B890,
            #F0A080,
            #D4AB80,
            #FADCD0
          );

          background-size: 300% 300%;
          animation: bgShift 12s ease infinite;
        }

        .camellia-bg-dark {
          background: linear-gradient(
            135deg,
            #0d0a12,
            #1a0830,
            #120a1e,
            #2a0a40,
            #0a0814,
            #1a0830,
            #0d0a12
          );

          background-size: 400% 400%;
          animation: bgShift 15s ease infinite;
        }

        .camellia-bg-red {
          background: linear-gradient(
            135deg,
            #120508,
            #2e0808,
            #1e0505,
            #3d0a0a,
            #0a0204,
            #2e0808,
            #120508
          );

          background-size: 400% 400%;
          animation: bgShift 15s ease infinite;
        }
      `;

      document.head.appendChild(s);
    }
  }, []);

  const accentLight = isRed
    ? '#ff8080'
    : dark
    ? '#c77dff'
    : '#7b2d6e';

  const cardWhite = dark
    ? isRed
      ? 'rgba(30,8,8,0.85)'
      : 'rgba(22,14,36,0.85)'
    : 'white';

  const cardBorder = dark
    ? isRed
      ? 'rgba(180,40,40,0.4)'
      : 'rgba(90,40,130,0.4)'
    : '#E5D8C8';

  const onCreateAccount = () => {
    window.location.href = '/signup';
  };

  return (
    <div
      className={
        theme === 'red'
          ? 'camellia-bg-red'
          : dark
          ? 'camellia-bg-dark'
          : 'camellia-bg-light'
      }
      style={{
        minHeight: '100vh',
        fontFamily: 'Roboto, Inter, sans-serif',
        overflowX: 'hidden',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '12px 20px' : '12px 32px',
          margin: isMobile ? '16px 16px 0' : '16px 32px 0',
          borderRadius: 100,
          background: dark
            ? isRed
              ? 'rgba(140,20,20,0.35)'
              : 'rgba(80,20,140,0.35)'
            : 'rgba(255,220,200,0.45)',
          backdropFilter: 'blur(24px)',
          border: dark
            ? isRed
              ? '1.5px solid rgba(255,80,80,0.4)'
              : '1.5px solid rgba(180,80,255,0.4)'
            : '1.5px solid rgba(255,200,170,0.7)',
          position: 'sticky',
          top: 16,
          zIndex: 100,
        }}
      >
        <img
          src={LOGO_WITH_TEXT}
          alt="Camellia"
          style={{ height: 42 }}
        />

        <nav
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: dark ? '#fff' : '#5A1A40',
              fontWeight: 600,
            }}
          >
            Home
          </Link>

          <Link
            to="/about"
            style={{
              textDecoration: 'none',
              color: accentLight,
              fontWeight: 700,
            }}
          >
            About
          </Link>

          <Link
            to="/contact"
            style={{
              textDecoration: 'none',
              color: dark ? '#fff' : '#5A1A40',
              fontWeight: 600,
            }}
          >
            Contact
          </Link>

          <DarkModeToggle />
        </nav>
      </header>

      {/* HERO */}
      <section
        style={{
          padding: isMobile ? '60px 20px' : '80px 60px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: 900,
            color: accentLight,
            lineHeight: 0.95,
            marginBottom: 24,
          }}
        >
          camellia
        </h1>

        <p
          style={{
            maxWidth: 760,
            margin: '0 auto',
            fontSize: '1.1rem',
            lineHeight: 1.8,
            color: dark ? '#e8d5ff' : '#3A1020',
          }}
        >
          Camellia is an AI-powered study platform designed to
          help students focus, retain information, and stop
          distractions while studying.
        </p>
      </section>

      {/* COMPARISON */}
      <section
        style={{
          padding: isMobile ? '40px 20px' : '60px',
        }}
      >
        <div
          style={{
            background: cardWhite,
            borderRadius: 18,
            overflow: 'hidden',
            border: `1px solid ${cardBorder}`,
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              padding: '16px 20px',
              fontWeight: 700,
            }}
          >
            <div />
            <div>Camellia</div>
            <div>Forest</div>
          </div>

          {COMPARE.map((item, i) => (
            <div
              key={item}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                padding: '16px 20px',
                borderTop:
                  i !== 0
                    ? `1px solid ${cardBorder}`
                    : 'none',
              }}
            >
              <span>{item}</span>

              <span
                style={{
                  color: '#00aa55',
                  fontWeight: 700,
                }}
              >
                ✓
              </span>

              <span
                style={{
                  color: i === 0 ? '#00aa55' : '#cc2222',
                  fontWeight: 700,
                }}
              >
                {i === 0 ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section
        style={{
          padding: isMobile ? '40px 20px' : '60px',
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : '1fr 1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              color: accentLight,
              lineHeight: 1,
              marginBottom: 24,
              fontWeight: 900,
            }}
          >
            fullscreen focused
          </h2>

          <p
            style={{
              lineHeight: 1.8,
              color: dark ? '#ddd' : '#333',
            }}
          >
            Every time you leave fullscreen during a study
            session, Camellia interrupts you with recall
            questions based on your study material to help
            reinforce memory and stop distractions.
          </p>
        </div>

        <div
          style={{
            background: cardWhite,
            borderRadius: 20,
            padding: 24,
            border: `1px solid ${cardBorder}`,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: accentLight,
            }}
          >
            Included Study Systems
          </h3>

          <ul
            style={{
              lineHeight: 2,
              paddingLeft: 20,
            }}
          >
            <li>Active Recall</li>
            <li>Feynman Technique</li>
            <li>Cornell Notes</li>
            <li>Flashcards</li>
            <li>Mind Maps</li>
            <li>AI Quizzes</li>
            <li>Essay Generator</li>
            <li>Podcast Summaries</li>
          </ul>
        </div>
      </section>

      {/* BYOK */}
      <section
        style={{
          padding: isMobile ? '40px 20px' : '60px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(2rem, 5vw, 4rem)',
            color: accentLight,
            marginBottom: 24,
            fontWeight: 900,
          }}
        >
          BYOK
        </h2>

        <p
          style={{
            maxWidth: 760,
            margin: '0 auto',
            lineHeight: 1.8,
            color: dark ? '#ddd' : '#333',
          }}
        >
          Bring Your Own Key lets you connect your own AI
          provider such as OpenAI, Anthropic, Google AI,
          or Groq. Your key stays in your browser and is
          never stored on a server.
        </p>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '60px 20px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={onCreateAccount}
          style={{
            background: accentLight,
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: isMobile
              ? '16px 34px'
              : '18px 60px',
            fontSize: '1.1rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow:
              '0 10px 28px rgba(123,45,110,0.35)',
          }}
        >
          {isReturning
            ? 'Continue Studying ↵'
            : 'Create a Study Session ↵'}
        </button>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 40px',
          background: dark
            ? 'rgba(0,0,0,0.35)'
            : 'rgba(90,26,64,0.08)',
        }}
      >
        <span
          style={{
            color: dark ? '#d0b0ff' : '#5A1A40',
            fontSize: '0.9rem',
          }}
        >
          Camellia 2026 — built in Temple City, California
        </span>

        <img
          src={LOGO_NO_TEXT}
          alt="Camellia"
          style={{
            height: 36,
          }}
        />

        <span
          style={{
            color: dark ? '#d0b0ff' : '#5A1A40',
            fontSize: '0.9rem',
          }}
        >
          Make studying tools accessible to all
        </span>
      </footer>
    </div>
  );
}
```
