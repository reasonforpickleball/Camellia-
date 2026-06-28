import React, { useState, useEffect } from 'react';
import { CamelliaLogoSmall } from './CamelliaLogo';
import { base44 } from '@/api/base44Client';

const SCREENS = ['name', 'goal', 'nonneg', 'picture', 'wish', 'paywall', 'aisetup'];

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [nn1, setNn1] = useState('');
  const [nn2, setNn2] = useState('');
  const [nn3, setNn3] = useState('');
  const [visible, setVisible] = useState(true);

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

  const handlePay = async () => {
    // Only count once per browser
    const alreadyCounted = localStorage.getItem('camellia_counted_global');
    if (!alreadyCounted) {
      try {
        const records = await base44.entities.OnboardingCount.list();
        if (records && records.length > 0) {
          await base44.entities.OnboardingCount.update(records[0].id, { count: (records[0].count || 0) + 1 });
        } else {
          await base44.entities.OnboardingCount.create({ count: 1 });
        }
        localStorage.setItem('camellia_counted_global', 'true');
      } catch {}
    }
    localStorage.setItem('onboarding_complete', 'true');
    goNext();
  };

  const handleEnterDashboard = () => {
    setVisible(false);
    setTimeout(() => onComplete(), 350);
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
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', color: '#4A3525', cursor: 'pointer' }}>Home</span>
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
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', color: '#4A3525', cursor: 'pointer' }}>Home</span>
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
          <span style={{ fontFamily: 'Inter', fontSize: '1rem', color: '#4A3525', cursor: 'pointer' }}>Home</span>
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
    <div style={{ background: '#1E1E1E', minHeight: '100vh', display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease', fontFamily: 'Inter' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <CamelliaLogoSmall />
        <h1 style={{ color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>AI Setup</h1>
      </header>

      {/* Body — two equal columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: instructions */}
        <div style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 20px' }}>Quick Setup · Under 1 Minute</p>
          <p style={{ color: 'white', fontSize: '1rem', lineHeight: 1.8, margin: '0 0 24px', fontWeight: 400 }}>
            Look, I know it sounds complicated but this is very simple, takes less than one minute, stay with me.
          </p>
          <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', lineHeight: 1.9 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Go to <span style={{ color: '#F55036', fontWeight: 700 }}>Groq.com</span> on your phone</p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 20, listStyle: 'disc' }}>
              <li>Click on <strong>"Free API Key"</strong> under Developers in the sidebar</li>
              <li>Create an account with your spare Google/Github account</li>
              <li>Create an API Key and name it <strong>Camellia</strong>, set expiration date depending on your needs</li>
              <li>Copy and send API Key to your current device and click <strong>"Done"</strong></li>
            </ul>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
              Congrats! You have your own free AI provider. Plug this API key in our settings once you create your first study tab in the next page.
            </p>
          </div>
          <button
            onClick={handleEnterDashboard}
            style={{ background: '#F3EEF8', color: '#2D1B0E', border: '1.5px solid #ddd', borderRadius: 12, padding: '14px 40px', fontSize: '1.05rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter', alignSelf: 'flex-start', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e8e0f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#F3EEF8'}
          >
            Enter Dashboard →
          </button>
        </div>

        {/* Right: looping video */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'rgba(0,0,0,0.3)' }}>
          <video
            src="https://media.base44.com/videos/public/6a36d7f24a9a8c3a2c9b47d9/d9fbbc4fa_GroqTutorial.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: '70vh', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  );

  return null;
}
