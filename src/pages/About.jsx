```jsx id="safeabout"
import React from 'react';

export default function About() {
  const features = [
    'AI Study Planner',
    'Flashcards',
    'Mind Maps',
    'Essay Generator',
    'Cornell Notes',
    'Focus Sessions',
    'Memory Training',
    'Podcast Summaries',
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f7dfd3',
        fontFamily: 'Arial, sans-serif',
        color: '#2b1b1b',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          padding: '20px',
          borderBottom: '1px solid #d6b9b0',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            color: '#7b2d6e',
          }}
        >
          Camellia
        </h1>

        <div>
          <a
            href="/"
            style={{
              marginRight: '20px',
              textDecoration: 'none',
              color: '#2b1b1b',
              fontWeight: 'bold',
            }}
          >
            Home
          </a>

          <a
            href="/about"
            style={{
              textDecoration: 'none',
              color: '#7b2d6e',
              fontWeight: 'bold',
            }}
          >
            About
          </a>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '56px',
            marginBottom: '20px',
            color: '#7b2d6e',
          }}
        >
          Study Smarter
        </h2>

        <p
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            fontSize: '18px',
            lineHeight: '1.8',
          }}
        >
          Camellia is an AI-powered study platform built
          to help students focus better, remember more,
          and organize everything in one workspace.
        </p>
      </section>

      {/* FEATURES */}
      <section
        style={{
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          {features.map(function (feature) {
            return (
              <div
                key={feature}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #e7d1cb',
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: '#7b2d6e',
                  }}
                >
                  {feature}
                </h3>

                <p
                  style={{
                    lineHeight: '1.6',
                  }}
                >
                  Built to improve focus, retention,
                  productivity, and learning efficiency.
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ABOUT */}
      <section
        style={{
          padding: '60px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            padding: '40px',
            borderRadius: '20px',
            border: '1px solid #e7d1cb',
          }}
        >
          <h2
            style={{
              color: '#7b2d6e',
              marginTop: 0,
            }}
          >
            Why Camellia?
          </h2>

          <p
            style={{
              lineHeight: '1.9',
            }}
          >
            Camellia was designed to remove distractions
            and simplify studying. Instead of using many
            disconnected apps, students can use one clean
            workspace for notes, planning, memory systems,
            and AI assistance.
          </p>

          <p
            style={{
              lineHeight: '1.9',
            }}
          >
            The platform supports modern AI workflows and
            gives students a focused environment for deep
            learning and productivity.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          textAlign: 'center',
          padding: '40px 20px 80px',
        }}
      >
        <button
          onClick={function () {
            window.location.href = '/signup';
          }}
          style={{
            backgroundColor: '#7b2d6e',
            color: '#ffffff',
            border: 'none',
            padding: '18px 40px',
            fontSize: '18px',
            borderRadius: '14px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Create a Study Session
        </button>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: '1px solid #d6b9b0',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <p
          style={{
            margin: 0,
          }}
        >
          Camellia 2026
        </p>
      </footer>
    </div>
  );
}
```
