import React, { useState } from 'react';
import { CamelliaLogoSmall, LOGO_ICON } from './CamelliaLogo';
import { testAIConnection } from '../lib/aiClient';

const SCREENS = ['name', 'goal', 'nonneg', 'picture', 'wish', 'paywall', 'aisetup'];

export default function Onboarding({ onComplete, onHome }) {
  const [screen, setScreen] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [nn1, setNn1] = useState('');
  const [nn2, setNn2] = useState('');
  const [nn3, setNn3] = useState('');
  const [visible, setVisible] = useState(true);
  const [groqKey, setGroqKey] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiError, setAiError] = useState('');

  const goNext = () => {
    setVisible(false);
    setTimeout(() => { setScreen(s => s + 1); setVisible(true); }, 280);
  };

  const handleNameEnter = () => {
    if (!name.trim()) return;
    localStorage.setItem('doomium_user_name', name.trim());
    goNext();
  };

  const handleGoalEnter = () => {
    if (!goal.trim()) return;
    localStorage.setItem('doomium_user_goal', goal.trim());
    goNext();
  };

  const handleNnEnter = () => {
    if (!nn1.trim() || !nn2.trim() || !nn3.trim()) return;
    localStorage.setItem('doomium_nn1', nn1.trim());
    localStorage.setItem('doomium_nn2', nn2.trim());
    localStorage.setItem('doomium_nn3', nn3.trim());
    goNext();
  };

  const handlePay = () => {
    localStorage.setItem('onboarding_complete', 'true');
    goNext();
  };

  const handleEnterDashboard = async () => {
    if (!groqKey.trim()) {
      setAiError('Paste your Groq API key first, you need it to enter the dashboard.');
      return;
    }
    setAiTesting(true);
    setAiError('');
    try {
      await testAIConnection('groq', groqKey.trim(), 'llama-3.1-8b-instant');
      localStorage.setItem('camellia_ai_provider', 'groq');
      localStorage.setItem('camellia_ai_key', groqKey.trim());
      localStorage.setItem('camellia_ai_model', 'llama-3.1-8b-instant');
      setAiTesting(false);
      setVisible(false);
      setTimeout(() => onComplete(), 350);
    } catch (err) {
      setAiTesting(false);
      setAiError(err.message || 'That key did not work, double check it and try again.');
    }
  };

  const handleKeyDown = (e, fn) => { if (e.key === 'Enter') fn(); };

  const baseStyle = {
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.28s ease',
    width: '100%',
    height: '100%',
    position: 'absolute',
    inset: 0,
  };

  const warmBg = {
    background: 'linear-gradient(135deg, #FADCD0 0%, #F5D5C0 30%, #EEC9B0 55%, #D4C4A8 80%, #C8C0A0 100%)',
  };

  if (screen === 0) return (
    <div style={{ ...warmBg, minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', background: 'rgba(247,240,232,0.85)', borderBottom: '1px solid rgba(200,180,160,0.3)' }}>
        <CamelliaLogoSmall />
        <nav style={{ display: 'flex', gap: 32, marginLeft: 12 }}>
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', color: '#4A3525', cursor: 'pointer' }} onClick={onHome}>Home</span>
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', cursor: 'pointer' }}>Create an Account</span>
        </nav>
      </header>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
        <h1 style={{ fontSize: '3.2rem', fontWeight: 300, color: '#5A4A3A', fontFamily: 'Inter', marginBottom: '2.5rem' }}>What is my name?</h1>
        <input
          className="underline-input"
          style={{ maxWidth: '75%' }}
          placeholder="(ex. Jane Doe)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => handleKeyDown(e, handleNameEnter)}
          autoFocus
        />
        <div style={{ marginTop: 20 }}>
          <button className="enter-btn" onClick={handleNameEnter}>Enter ↵</button>
        </div>
      </div>
      <footer style={{ padding: '12px 24px', background: 'rgba(247,240,220,0.7)', textAlign: 'center', fontFamily: 'Inter', fontSize: '0.9rem', color: '#4A3525' }}>
        Camellia 2026, built in Temple City, California
      </footer>
    </div>
  );

  if (screen === 1) return (
    <div style={{ ...warmBg, minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', background: 'rgba(247,240,232,0.85)', borderBottom: '1px solid rgba(200,180,160,0.3)' }}>
        <CamelliaLogoSmall />
        <nav style={{ display: 'flex', gap: 32, marginLeft: 12 }}>
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', color: '#4A3525', cursor: 'pointer' }} onClick={onHome}>Home</span>
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', cursor: 'pointer' }}>Create an Account</span>
        </nav>
      </header>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
        <h1 style={{ fontSize: '3.2rem', fontWeight: 300, color: '#5A4A3A', fontFamily: 'Inter', marginBottom: '2.5rem' }}>What is my goal?</h1>
        <input
          className="underline-input"
          style={{ maxWidth: '85%' }}
          placeholder="(ex. I want to go to UC Davis.)"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => handleKeyDown(e, handleGoalEnter)}
          autoFocus
        />
        <div style={{ marginTop: 20 }}>
          <button className="enter-btn" onClick={handleGoalEnter}>Enter ↵</button>
        </div>
      </div>
      <footer style={{ padding: '12px 24px', background: 'rgba(247,240,220,0.7)', textAlign: 'center', fontFamily: 'Inter', fontSize: '0.9rem', color: '#4A3525' }}>
        Camellia 2026, built in Temple City, California
      </footer>
    </div>
  );

  if (screen === 2) return (
    <div style={{ ...warmBg, minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', background: 'rgba(247,240,232,0.85)', borderBottom: '1px solid rgba(200,180,160,0.3)' }}>
        <CamelliaLogoSmall />
        <nav style={{ display: 'flex', gap: 32, marginLeft: 12 }}>
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', color: '#4A3525', cursor: 'pointer' }} onClick={onHome}>Home</span>
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', cursor: 'pointer' }}>Create an Account</span>
        </nav>
      </header>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 8% 20px', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 300, color: '#5A4A3A', fontFamily: 'Inter', marginBottom: '2rem' }}>What are 3 non-negotiables for my goal?</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '90%' }}>
          <input className="underline-input-sm" placeholder="(ex. study 25 mins at 9pm 6 days a week.)" value={nn1} onChange={e => setNn1(e.target.value)} autoFocus />
          <input className="underline-input-sm" placeholder="(ex. put away my phone from 9-9:25pm.)" value={nn2} onChange={e => setNn2(e.target.value)} />
          <input className="underline-input-sm" placeholder="(ex. finish all homework on time for a week.)" value={nn3} onChange={e => setNn3(e.target.value)} onKeyDown={e => handleKeyDown(e, handleNnEnter)} />
        </div>
        <div style={{ marginTop: 28 }}>
          <button className="enter-btn" onClick={handleNnEnter}>Enter ↵</button>
        </div>
      </div>
      <footer style={{ padding: '12px 24px', background: 'rgba(247,240,220,0.7)', textAlign: 'center', fontFamily: 'Inter', fontSize: '0.9rem', color: '#4A3525' }}>
        Camellia 2026, built in Temple City, California
      </footer>
    </div>
  );

  if (screen === 3) return (
    <div style={{ background: '#1E1E1E', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
      <p style={{ color: 'white', fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, marginBottom: '4rem', letterSpacing: '0.02em' }}>Picture yourself when your goal is reached</p>
      <button className="charcoal-pill-btn" onClick={goNext}>done</button>
    </div>
  );

  if (screen === 4) return (
    <div style={{ background: '#1E1E1E', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
      <p style={{ color: 'white', fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, marginBottom: '4rem', letterSpacing: '0.02em' }}>Do you wish it would happen?</p>
      <button className="charcoal-pill-btn" onClick={goNext}>yes</button>
    </div>
  );

  if (screen === 5) return (
    <div style={{ background: '#1E1E1E', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease', padding: '40px' }}>
      <div style={{ textAlign: 'center', color: 'white', fontFamily: 'Inter', maxWidth: 600 }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Here in Camellia, we have a paywall.</p>
        <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.4rem' }}>Payment methods: time + complete focus</p>
        <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.5rem' }}>Merchandise: one step closer to your goal</p>
        <p style={{ fontSize: '0.9rem', fontWeight: 300, marginBottom: '2.5rem', opacity: 0.85 }}>remove any personal device away from your vicinity except for this one to start studying</p>
      </div>
      <button className="charcoal-pill-btn" onClick={handlePay}>pay</button>
    </div>
  );

  if (screen === 6) return (
    <div style={{ background: '#181818', minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease', fontFamily: 'Inter' }}>
      {/* Left: Groq setup instructions */}
      <div style={{ padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <img src={LOGO_ICON} alt="Camellia" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 12 }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', letterSpacing: '2px' }}>•••</span>
          <div style={{ background: '#F0472E', borderRadius: 12, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Inter' }}>Groq</span>
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Quick Setup. 1 minute</p>
        <p style={{ color: 'white', fontSize: '0.82rem', margin: '0 0 10px' }}>
          Go to <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>console.groq.com</a>
        </p>
        <ul style={{ color: 'white', fontSize: '0.78rem', lineHeight: 1.7, margin: '0 0 14px', paddingLeft: 16, listStyle: 'disc' }}>
          <li>Create an account with your Google/Github account</li>
          <li>Create an API Key and name it Camellia, set expiration date depending on your needs</li>
          <li>Copy and paste your private API key below (starts with gsk...)</li>
        </ul>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12, marginBottom: 12 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', lineHeight: 1.7, margin: 0 }}>
            You will be able to change your API key to other providers in settings afterwards.<br />
            Never share future paid API keys with malicious software or individuals.<br />
            Groq and Grok are not the same company.
          </p>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 12, marginBottom: 12 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', lineHeight: 1.5, margin: '0 0 6px' }}>
            Camellia is an independent website and is not affiliated with, sponsored by, or endorsed by Groq, LLC.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', lineHeight: 1.7, margin: 0 }}>
            Privacy Policy: <a href="https://groq.com/privacy-policy" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>https://groq.com/privacy-policy</a><br />
            Developer Legal & Data Notices: <a href="https://console.groq.com/docs/legal" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>https://console.groq.com/docs/legal</a>
          </p>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 14 }}>
          <p style={{ color: 'white', fontSize: '0.78rem', margin: '0 0 12px' }}>Congrats! You have your own free AI provider. Enter your API key below.</p>
          <p style={{ color: 'white', fontSize: '0.78rem', fontWeight: 600, margin: '0 0 6px' }}>Groq API key</p>
          <input
            type="text"
            value={groqKey}
            onChange={e => setGroqKey(e.target.value)}
            placeholder="gsk_..."
            style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: 8, padding: '9px 14px', color: 'white', fontFamily: 'Inter', fontSize: '0.82rem', outline: 'none', marginBottom: 10, width: '100%', maxWidth: 260, boxSizing: 'border-box' }}
          />
          {aiError && <p style={{ color: '#ff8080', fontSize: '0.75rem', margin: '0 0 10px' }}>{aiError}</p>}
          <button
            onClick={handleEnterDashboard}
            disabled={aiTesting}
            style={{ background: '#F3EEF8', color: '#2D1B0E', border: '1.5px solid #ddd', borderRadius: 10, padding: '10px 28px', fontSize: '0.85rem', fontWeight: 500, cursor: aiTesting ? 'not-allowed' : 'pointer', fontFamily: 'Inter', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e8e0f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#F3EEF8'}
          >
            {aiTesting ? 'Verifying key…' : 'Enter Dashboard →'}
          </button>
        </div>
      </div>

      {/* Right: Why do I need this */}
      <div style={{ background: '#0f0f0f', padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ color: 'white', fontFamily: 'Inter', fontWeight: 800, fontSize: '1.7rem', margin: '0 0 14px', textAlign: 'center' }}>Why do I need this?</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', lineHeight: 1.7, textAlign: 'center', margin: '0 0 20px' }}>
          To keep Camellia free and secure, we use a system called BYOK (Bring Your Own Key). By connecting your own developer's key to Groq's AI provider, we can ensure data privacy and you gaining absolute control over your own data.
        </p>
        <ul style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', lineHeight: 1.7, margin: '0 0 20px', paddingLeft: 18, maxWidth: 380, alignSelf: 'center', listStyle: 'disc' }}>
          <li><strong>No middleman:</strong> This key gives you direct access to Groq's high speed AI hardware, bypassing the costly middleman markups.</li>
          <li><strong>Control:</strong> Because your data is only stored and handled with your key, no one would be able to read or access your privacy.</li>
          <li><strong>Zero Cost:</strong> Groq introduced free-tier AI developer's key for website building. No payment or cards needed.</li>
        </ul>
        <video
          src="https://media.base44.com/videos/public/6a36d7f24a9a8c3a2c9b47d9/d9fbbc4fa_GroqTutorial.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{ width: '100%', maxWidth: 380, alignSelf: 'center', height: 'auto', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', objectFit: 'contain' }}
        />
      </div>
    </div>
  );

  return null;
}
