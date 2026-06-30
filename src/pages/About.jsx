```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useDarkMode,
  DarkModeToggle,
} from '@/lib/DarkModeContext';

const LOGO_WITH_TEXT =
  'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/407d67e21_3.png';

const LOGO_NO_TEXT =
  'https://media.base44.com/images/public/6a36d7f24a9a8c3a2c9b47d9/73e5dfbbe_2.png';

const FEATURES = [
  'AI Study Planner',
  'Active Recall',
  'Feynman Technique',
  'Cornell Notes',
  'Flashcards',
  'Mind Maps',
  'Essay Generator',
  'Podcast Summaries',
];

export default function About() {
  const isMobile = useIsMobile();

  const { dark, theme } = useDarkMode();

  const isRed = theme === 'red';

  const accentColor = isRed
    ? '#ff8080'
    : dark
    ? '#c77dff'
    : '#7b2d6e';

  const textColor = dark ? '#f5ecff' : '#3A1020';

  const cardBackground = dark
    ? 'rgba(20, 12, 32, 0.85)'
    : 'rgba(255,255,255,0.92)';

  const borderColor = dark
    ? 'rgba(180,80,255,0.25)'
    : 'rgba(123,45,110,0.15)';

  const isReturning =
    localStorage.getItem('onboarding_complete') === 'true';

  const onCreateAccount = () => {
    window.location.href = '/signup';
  };

  React.useEffect(() => {
    const styleId = 'camellia-about-page-styles';

    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');

    style.id = styleId;

    style.innerHTML = `
      @keyframes bgShift {
        0% {
          background-position: 0% 50%;
        }

        50% {
          background-position: 100% 50%;
        }

        100% {
          background-position: 0% 50%;
        }
      }

      .camellia-light {
        background:
          linear-gradient(
            135deg,
            #FADCD0,
            #F5C9B0,
            #E8B890,
            #F0A080,
            #D4AB80
          );

        background-size: 300% 300%;
        animation: bgShift 12s ease infinite;
      }

      .camellia-dark {
        background:
          linear-gradient(
            135deg,
            #0d0a12,
            #1a0830,
            #120a1e,
            #2a0a40,
            #0a0814
          );

        background-size: 400% 400%;
        animation: bgShift 15s ease infinite;
      }

      .camellia-red {
        background:
          linear-gradient(
            135deg,
            #120508,
            #2e0808,
            #1e0505,
            #3d0a0a,
            #0a0204
          );

        background-size: 400% 400%;
        animation: bgShift 15s ease infinite;
      }
    `;

    document.head.appendChild(style);
  }, []);

  const backgroundClass = isRed
    ? 'camellia-red'
    : dark
    ? 'camellia-dark'
    : 'camellia-light';

  return (
    <div
      className={backgroundClass}
      style={{
        minHeight: '100vh',
        overflowX: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '16px' : '18px 36px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(18px)',
          background: dark
            ? 'rgba(10,10,20,0.45)'
            : 'rgba(255,255,255,0.3)',
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <img
          src={LOGO_WITH_TEXT}
          alt="Camellia"
          style={{
            height: isMobile ? 38 : 46,
            objectFit: 'contain',
          }}
        />

        <nav
          style={{
            display: 'flex',
            gap: isMobile ? 12 : 20,
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              color: textColor,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Home
          </Link>

          <Link
            to="/about"
            style={{
              color: accentColor,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            About
          </Link>

          <Link
            to="/contact"
            style={{
              color: textColor,
              textDecoration: 'none',
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
          padding: isMobile ? '70px 20px' : '120px 60px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            fontWeight: 900,
            lineHeight: 0.9,
            color: accentColor,
            marginBottom: 28,
          }}
        >
          study smarter
          <br />
          not longer
        </h1>

        <p
          style={{
            maxWidth: 780,
            margin: '0 auto',
            fontSize: '1.1rem',
            lineHeight: 1.9,
            color: textColor,
          }}
        >
          Camellia is an AI-powered study platform built to
          stop distractions, improve memory retention, and
          combine powerful evidence-based learning systems
          into one workspace.
        </p>
      </section>

      {/* FEATURES */}
      <section
        style={{
          padding: isMobile ? '40px 20px' : '60px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'repeat(2, 1fr)',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {FEATURES.map((feature) => (
            <div
              key={feature}
              style={{
                background: cardBackground,
                border: `1px solid ${borderColor}`,
                borderRadius: 20,
                padding: 24,
                backdropFilter: 'blur(16px)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: accentColor,
                  fontSize: '1.2rem',
                }}
              >
                {feature}
              </h3>

              <p
                style={{
                  marginTop: 12,
                  color: textColor,
                  lineHeight: 1.7,
                }}
              >
                Powerful tools designed to help students
                retain information faster and stay focused.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section
        style={{
          padding: isMobile ? '40px 20px' : '80px 60px',
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            background: cardBackground,
            border: `1px solid ${borderColor}`,
            borderRadius: 24,
            padding: isMobile ? 28 : 50,
            backdropFilter: 'blur(16px)',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              color: accentColor,
              marginTop: 0,
              marginBottom: 24,
            }}
          >
            why camellia?
          </h2>

          <p
            style={{
              color: textColor,
              lineHeight: 2,
              fontSize: '1rem',
            }}
          >
            Camellia was created to solve a problem most
            students experience every day: endless
            distractions while studying. Instead of using
            separate apps for notes, flashcards, quizzes,
            and planning, Camellia combines everything into
            one focused environment powered by AI.
          </p>

          <p
            style={{
              color: textColor,
              lineHeight: 2,
              fontSize: '1rem',
            }}
          >
            The platform also supports BYOK (Bring Your Own
            Key), allowing students to connect their own AI
            provider while keeping API keys stored locally
            in the browser.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '60px 20px 100px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={onCreateAccount}
          style={{
            background: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: 18,
            padding: isMobile
              ? '16px 36px'
              : '18px 64px',
            fontSize: '1.1rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow:
              '0 14px 36px rgba(123,45,110,0.35)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform =
              'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform =
              'translateY(0px)';
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
          padding: isMobile ? '24px 20px' : '28px 60px',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          style={{
            color: textColor,
            fontSize: '0.9rem',
          }}
        >
          Camellia 2026
        </span>

        <img
          src={LOGO_NO_TEXT}
          alt="Camellia Logo"
          style={{
            height: 34,
          }}
        />

        <span
          style={{
            color: textColor,
            fontSize: '0.9rem',
          }}
        >
          Built in California
        </span>
      </footer>
    </div>
  );
}
```
