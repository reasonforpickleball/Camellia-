```jsx id="wlfbrt"
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

  const textColor = dark ? '#f3ecff' : '#3A1020';

  const backgroundColor = isRed
    ? '#120508'
    : dark
    ? '#120a1e'
    : '#f7dfd3';

  const cardBackground = dark
    ? 'rgba(25,18,38,0.88)'
    : 'rgba(255,255,255,0.92)';

  const borderColor = dark
    ? 'rgba(180,80,255,0.25)'
    : 'rgba(123,45,110,0.15)';

  const isReturning =
    localStorage.getItem('onboarding_complete') === 'true';

  const onCreateAccount = () => {
    window.location.href = '/signup';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        overflowX: 'hidden',
        fontFamily: 'Inter, sans-serif',
        background: backgroundColor,
        backgroundImage: dark
          ? 'radial-gradient(circle at top left, rgba(140,80,255,0.2), transparent 40%)'
          : 'radial-gradient(circle at top left, rgba(255,180,140,0.35), transparent 40%)',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '16px' : '18px 36px',
          backdropFilter: 'blur(16px)',
          background: dark
            ? 'rgba(10,10,20,0.55)'
            : 'rgba(255,255,255,0.45)',
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
            alignItems: 'center',
            gap: isMobile ? 12 : 20,
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
          padding: isMobile ? '80px 20px' : '120px 60px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            lineHeight: 0.9,
            fontWeight: 900,
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
            maxWidth: 760,
            margin: '0 auto',
            fontSize: '1.08rem',
            lineHeight: 1.9,
            color: textColor,
          }}
        >
          Camellia combines focus tools, AI study systems,
          and distraction prevention into one modern learning
          platform designed for students.
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
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'repeat(2, 1fr)',
            gap: 24,
          }}
        >
          {FEATURES.map((feature) => (
            <div
              key={feature}
              style={{
                background: cardBackground,
                border: `1px solid ${borderColor}`,
                borderRadius: 20,
                padding: 26,
                backdropFilter: 'blur(14px)',
                boxShadow: dark
                  ? '0 10px 30px rgba(0,0,0,0.4)'
                  : '0 10px 30px rgba(0,0,0,0.08)',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  color: accentColor,
                  fontSize: '1.2rem',
                }}
              >
                {feature}
              </h3>

              <p
                style={{
                  margin: 0,
                  lineHeight: 1.7,
                  color: textColor,
                }}
              >
                Designed to improve retention, focus, and
                study efficiency while reducing distractions.
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
            maxWidth: 980,
            margin: '0 auto',
            background: cardBackground,
            border: `1px solid ${borderColor}`,
            borderRadius: 24,
            padding: isMobile ? 28 : 48,
            backdropFilter: 'blur(16px)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 24,
              color: accentColor,
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              fontWeight: 900,
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
            Camellia was created to help students stay
            focused while studying. Instead of juggling
            multiple apps for planning, notes, quizzes,
            flashcards, and AI tools, everything exists in
            one distraction-resistant workspace.
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
            providers like OpenAI, Anthropic, Groq, or
            Google AI while keeping keys stored locally in
            the browser.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '70px 20px 100px',
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
            fontSize: '1.08rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: '0.2s ease',
            boxShadow:
              '0 14px 36px rgba(123,45,110,0.35)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform =
              'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform =
              'translateY(0)';
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
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
