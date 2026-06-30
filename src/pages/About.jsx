```jsx id="ojrkhw"
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

  const darkMode = useDarkMode();

  const dark = darkMode?.dark || false;

  const theme = darkMode?.theme || 'default';

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
        backgroundColor: backgroundColor,
        paddingBottom: '40px',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: '0',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '16px' : '18px 36px',
          backgroundColor: dark
            ? 'rgba(10,10,20,0.55)'
            : 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid ' + borderColor,
        }}
      >
        <img
          src={LOGO_WITH_TEXT}
          alt="Camellia"
          style={{
            height: isMobile ? '38px' : '46px',
            objectFit: 'contain',
          }}
        />

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '12px' : '20px',
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

      <section
        style={{
          padding: isMobile
            ? '70px 20px'
            : '110px 60px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? '3rem' : '5.5rem',
            lineHeight: 1,
            fontWeight: 900,
            color: accentColor,
            marginBottom: '24px',
          }}
        >
          Study Smarter
          <br />
          Not Longer
        </h1>

        <p
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            fontSize: '1.1rem',
            lineHeight: 1.9,
            color: textColor,
          }}
        >
          Camellia combines AI-powered learning tools,
          focus systems, and memory techniques into one
          modern platform designed to help students study
          effectively without distractions.
        </p>
      </section>

      <section
        style={{
          padding: isMobile ? '30px 20px' : '50px 60px',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : '1fr 1fr',
            gap: '24px',
          }}
        >
          {FEATURES.map((feature) => (
            <div
              key={feature}
              style={{
                backgroundColor: cardBackground,
                border: '1px solid ' + borderColor,
                borderRadius: '20px',
                padding: '26px',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: '12px',
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
                Built to improve focus, retention, and
                study efficiency while keeping everything
                inside one workspace.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? '40px 20px' : '70px 60px',
        }}
      >
        <div
          style={{
            maxWidth: '980px',
            margin: '0 auto',
            backgroundColor: cardBackground,
            border: '1px solid ' + borderColor,
            borderRadius: '24px',
            padding: isMobile ? '28px' : '48px',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '24px',
              color: accentColor,
              fontSize: isMobile ? '2rem' : '4rem',
              fontWeight: 900,
            }}
          >
            Why Camellia?
          </h2>

          <p
            style={{
              color: textColor,
              lineHeight: 2,
              fontSize: '1rem',
            }}
          >
            Camellia was built to eliminate the chaos of
            using multiple disconnected study apps.
            Instead of switching between flashcards,
            planners, AI tools, and notes, students can
            work inside one focused environment.
          </p>

          <p
            style={{
              color: textColor,
              lineHeight: 2,
              fontSize: '1rem',
            }}
          >
            The platform supports BYOK (Bring Your Own
            Key), allowing users to connect OpenAI,
            Anthropic, Groq, or Google AI safely while
            keeping API keys stored locally in the browser.
          </p>
        </div>
      </section>

      <section
        style={{
          padding: '60px 20px 90px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={onCreateAccount}
          style={{
            backgroundColor: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: '18px',
            padding: isMobile
              ? '16px 34px'
              : '18px 60px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {isReturning
            ? 'Continue Studying'
            : 'Create a Study Session'}
        </button>
      </section>

      <footer
        style={{
          padding: isMobile ? '24px 20px' : '28px 60px',
          borderTop: '1px solid ' + borderColor,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
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
          alt="Camellia"
          style={{
            height: '34px',
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
