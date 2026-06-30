import React from 'react';
import { useDarkMode } from '@/lib/DarkModeContext';

export default function Contact() {
  const { dark } = useDarkMode();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'Roboto, Inter, sans-serif' }}>
      <div style={{ maxWidth: 700, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Contact</h1>
        <p style={{ fontSize: '1rem', marginBottom: 18 }}>
          Want to reach out? Follow or message on Instagram:
        </p>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: dark ? '#e8d5ff' : '#7b2d6e' }}>
          @studycamellia
        </div>
        <p style={{ marginTop: 18, color: dark ? '#c0a0e0' : '#5A1A40' }}>
          (This is our public handle for updates, questions, and short support messages.)
        </p>
      </div>
    </div>
  );
}
