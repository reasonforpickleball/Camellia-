import React, { useState } from 'react';
import { getAIConfig, isAIConfigured, testAIConnection, runAITestSuite } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';
import { exportCoachData } from '../../lib/coachEngine';

const FONT = "'Roboto', Arial, sans-serif";

const PROVIDERS = [
  {
    id: 'openai', label: 'OpenAI', sub: 'GPT-4o, GPT-4o Mini...', color: '#10A37F', free: false,
    keyUrl: 'https://platform.openai.com/api-keys', keyLabel: 'platform.openai.com/api-keys', placeholder: 'sk-...',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Best quality)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster, cheaper)' },
    ],
  },
  {
    id: 'anthropic', label: 'Anthropic', sub: 'Claude Sonnet, Haiku...', color: '#D97706', free: false,
    keyUrl: 'https://console.anthropic.com/settings/keys', keyLabel: 'console.anthropic.com', placeholder: 'sk-ant-...',
    models: [
      { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (Best quality)' },
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Balanced)' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude Haiku 3.5 (Fastest)' },
    ],
  },
  {
    id: 'google', label: 'Google AI Studio', sub: 'Gemini Flash-Lite — 15 RPM free', color: '#4285F4', free: true,
    keyUrl: 'https://aistudio.google.com/app/apikey', keyLabel: 'aistudio.google.com', placeholder: 'AIza...',
    models: [
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite — 15 RPM (Fastest, Free)' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — 10 RPM (Fast & Free)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — 5 RPM (Most powerful)' },
    ],
  },
  {
    id: 'groq', label: 'Groq', sub: 'Llama, Qwen, Kimi — 60 RPM free', color: '#F55036', free: true,
    keyUrl: 'https://console.groq.com/keys', keyLabel: 'console.groq.com/keys', placeholder: 'gsk_...',
    models: [
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant — 30 RPM (Fastest)' },
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile — 30 RPM (Smart)' },
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B — 30 RPM (Balanced)' },
      { value: 'qwen/qwen3-32b', label: 'Qwen 3 32B — 60 RPM (Best Groq speed)' },
      { value: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 Instruct — 60 RPM (High quality)' },
    ],
  },
];

export default function SettingsPanel() {
  const { dark } = useDarkMode();
  const [profileName, setProfileName] = useState(() => localStorage.getItem('doomium_user_name') || '');
  const [profileGoal, setProfileGoal] = useState(() => localStorage.getItem('doomium_user_goal') || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [provider, setProvider] = useState(() => localStorage.getItem('camellia_ai_provider') || 'groq');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('camellia_ai_key') || '');
  const [model, setModel] = useState(() => localStorage.getItem('camellia_ai_model') || 'llama-3.1-8b-instant');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [suiteResults, setSuiteResults] = useState(null);
  const [runningTests, setRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  const currentProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  const textPrimary = dark ? '#e8d5ff' : '#4A3525';
  const textSecondary = dark ? '#a080c0' : '#9A8A7A';
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'white';
  const cardBorder = dark ? '1.5px solid rgba(90,40,130,0.4)' : '1.5px solid #E5D8C8';
  const inputBg = dark ? 'rgba(30,10,46,0.7)' : 'white';
  const inputBorder = dark ? '1.5px solid rgba(90,40,130,0.5)' : '1.5px solid #E5D8C8';
  const glassStyle = { backdropFilter: 'blur(20px) saturate(150%)', WebkitBackdropFilter: 'blur(20px) saturate(150%)' };

  const handleProviderChange = (p) => {
    const providerObj = PROVIDERS.find(pr => pr.id === p);
    setProvider(p);
    setModel(providerObj?.models[0]?.value || '');
    setTestResult(null);
    setSuiteResults(null);
  };

  const handleSave = () => {
    localStorage.setItem('camellia_ai_provider', provider);
    localStorage.setItem('camellia_ai_key', apiKey.trim());
    localStorage.setItem('camellia_ai_model', model);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null); setSuiteResults(null);
    try {
      const resp = await testAIConnection(provider, apiKey.trim(), model);
      setTestResult({ ok: true, msg: resp.trim() });
    } catch (e) { setTestResult({ ok: false, msg: e.message }); }
    setTesting(false);
  };

  const runTests = async () => {
    setRunningTests(true); setSuiteResults(null); setTestResult(null); setTestProgress(0);
    const interval = setInterval(() => setTestProgress(p => Math.min(p + 1, 9)), 800);
    try {
      const { runAITestSuite } = await import('../../lib/aiClient');
      const results = await runAITestSuite(provider, apiKey.trim(), model);
      clearInterval(interval); setTestProgress(10); setSuiteResults(results);
    } catch (e) {
      clearInterval(interval); setSuiteResults([{ name: 'Suite error', ok: false, msg: e.message }]);
    }
    setRunningTests(false);
  };

  const handleClearAll = () => {
    if (!confirm('Clear all Camellia data? This will erase all your study sessions, notes, flashcards, and chat history from this browser. Cannot be undone.')) return;
    const keep = ['doomium_user_name', 'doomium_user_goal', 'doomium_profile_pic', 'camellia_ai_key', 'camellia_ai_provider', 'camellia_ai_model', 'onboarding_complete'];
    Object.keys(localStorage).filter(k => !keep.includes(k)).forEach(k => localStorage.removeItem(k));
    alert('Study data cleared.');
  };

  const suitePassCount = suiteResults ? suiteResults.filter(r => r.ok).length : 0;
  const allPassed = suiteResults && suitePassCount === suiteResults.length;

  const handleSaveProfile = () => {
    localStorage.setItem('doomium_user_name', profileName.trim());
    localStorage.setItem('doomium_user_goal', profileGoal.trim());
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleExportAll = () => {
    const data = {};
    Object.keys(localStorage).forEach(k => { data[k] = localStorage.getItem(k); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'camellia-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAll = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
        setImportMsg('Data restored! Reloading...');
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportMsg('Could not read that file, make sure it is a Camellia backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '2rem', color: dark ? '#c77dff' : '#4A3525', marginBottom: 8 }}>Settings</h1>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary, marginBottom: 32 }}>
        Configure your AI provider. Your API key is stored only in this browser, never sent to Camellia's servers.
      </p>

      {/* Edit profile */}
      <div style={{ background: cardBg, border: cardBorder, borderRadius: 14, padding: '24px 28px', marginBottom: 20, ...glassStyle }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: textPrimary, marginBottom: 16 }}>Edit Profile</p>
        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: textPrimary, marginBottom: 4 }}>Name</p>
        <input value={profileName} onChange={e => setProfileName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: inputBorder, borderRadius: 8, fontFamily: FONT, fontSize: '0.9rem', color: textPrimary, background: inputBg, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: textPrimary, marginBottom: 4 }}>Goal</p>
        <input value={profileGoal} onChange={e => setProfileGoal(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: inputBorder, borderRadius: 8, fontFamily: FONT, fontSize: '0.9rem', color: textPrimary, background: inputBg, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
        <button onClick={handleSaveProfile} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
          {profileSaved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Provider selector */}
      <div style={{ background: cardBg, border: cardBorder, borderRadius: 14, padding: '24px 28px', marginBottom: 20, ...glassStyle }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: textPrimary, marginBottom: 16 }}>AI Provider</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => handleProviderChange(p.id)} style={{
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', position: 'relative',
              border: provider === p.id ? `2px solid ${p.color}` : (dark ? '2px solid rgba(90,40,130,0.4)' : '2px solid #E5D8C8'),
              background: provider === p.id ? p.color + '18' : (dark ? 'rgba(30,10,46,0.5)' : 'white'),
              transition: 'all 0.2s',
            }}>
              {p.free && <span style={{ position: 'absolute', top: 8, right: 8, background: '#7b2d6e', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: FONT }}>FREE</span>}
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: provider === p.id ? p.color : textPrimary, margin: '0 0 3px' }}>{p.label}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary, margin: 0 }}>{p.sub}</p>
            </button>
          ))}
        </div>

        {currentProvider.free && (
          <div style={{ background: dark ? 'rgba(80,20,120,0.2)' : '#f3e8ff', border: '1.5px solid #7b2d6e', borderRadius: 8, padding: '8px 14px', marginBottom: 16 }}>
            <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: dark ? '#c77dff' : '#7b2d6e', margin: 0, fontWeight: 600 }}>
              {currentProvider.id === 'google' ? 'Google AI Studio offers a generous free tier, no billing required to start.' : 'Groq is completely free with high rate limits on Llama & Mixtral models.'}
            </p>
          </div>
        )}

        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: textPrimary, marginBottom: 8 }}>Model</p>
        <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: inputBorder, borderRadius: 8, fontFamily: FONT, fontSize: '0.9rem', color: textPrimary, background: inputBg, marginBottom: 20, outline: 'none' }}>
          {currentProvider.models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: textPrimary, marginBottom: 4 }}>API Key</p>
        <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, marginBottom: 8 }}>
          Get your key at <a href={currentProvider.keyUrl} target="_blank" rel="noreferrer" style={{ color: currentProvider.color }}>{currentProvider.keyLabel}</a>
        </p>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={currentProvider.placeholder}
            style={{ width: '100%', padding: '10px 44px 10px 14px', border: inputBorder, borderRadius: 8, fontFamily: FONT, fontSize: '0.9rem', color: textPrimary, background: inputBg, outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={() => setShowKey(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, fontSize: '1rem' }}>
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleSave} style={{ flex: 1, minWidth: 120, background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}>
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          <button onClick={handleTest} disabled={testing || !apiKey.trim()} style={{ padding: '12px 16px', background: testing ? (dark ? 'rgba(40,20,60,0.5)' : '#E5D8C8') : (dark ? 'rgba(30,10,46,0.6)' : 'white'), border: `1.5px solid ${dark ? 'rgba(90,40,130,0.6)' : '#7b2d6e'}`, borderRadius: 10, fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: dark ? '#c4a0e0' : '#7b2d6e', cursor: testing || !apiKey.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {testing ? 'Testing...' : 'Quick Test'}
          </button>
          <button onClick={runTests} disabled={runningTests || !apiKey.trim()} style={{ padding: '12px 16px', background: runningTests ? (dark ? 'rgba(40,20,60,0.5)' : '#E5D8C8') : (dark ? 'rgba(14,8,24,0.8)' : '#1a1a1a'), border: 'none', borderRadius: 10, fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: runningTests ? textSecondary : 'white', cursor: runningTests || !apiKey.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            {runningTests ? `Running ${testProgress}/10...` : 'Run 10 Tests'}
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: testResult.ok ? (dark ? 'rgba(34,197,94,0.1)' : '#F0FCF4') : (dark ? 'rgba(244,67,54,0.1)' : '#FFF0F0'), border: `1.5px solid ${testResult.ok ? '#4CAF50' : '#F44336'}` }}>
            <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: testResult.ok ? '#4CAF50' : '#F44336', margin: 0 }}>
              {testResult.ok ? '[OK] ' : '[Error] '}{testResult.msg}
            </p>
          </div>
        )}

        {suiteResults && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Test Suite Results: {suitePassCount}/{suiteResults.length} passed</p>
              {allPassed && <span style={{ background: '#7b2d6e', color: 'white', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, fontFamily: FONT }}>100% PASSED</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suiteResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 8, background: r.ok ? (dark ? 'rgba(80,20,120,0.15)' : '#f3e8ff') : (dark ? 'rgba(244,67,54,0.08)' : '#FFF5F5'), border: `1px solid ${r.ok ? (dark ? 'rgba(160,80,255,0.4)' : '#c77dff') : '#FECACA'}` }}>
                  <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{r.ok ? '✓' : '✗'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FONT, fontSize: '0.8rem', fontWeight: 700, color: r.ok ? (dark ? '#c77dff' : '#7b2d6e') : '#F44336', margin: '0 0 2px' }}>Test {i + 1}: {r.name}</p>
                    <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: r.ok ? (dark ? '#a080d0' : '#7b2d6e') : '#F44336', margin: 0, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div style={{ background: isAIConfigured() ? (dark ? 'rgba(120,40,200,0.15)' : '#f3e8ff') : (dark ? 'rgba(120,40,200,0.08)' : '#f3e8ff'), border: `1.5px solid ${isAIConfigured() ? '#7b2d6e' : (dark ? 'rgba(120,60,200,0.5)' : '#7b2d6e')}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: isAIConfigured() ? (dark ? '#c77dff' : '#7b2d6e') : (dark ? '#a070d0' : '#7b2d6e'), margin: 0 }}>
          {isAIConfigured() ? `✓ AI configured: ${currentProvider.label} / ${model}` : 'No API key saved, all AI features require a key to work.'}
        </p>
      </div>

      {/* Privacy note */}
      <div style={{ background: dark ? 'rgba(22,14,36,0.6)' : '#F8F4EE', border: dark ? '1px solid rgba(90,40,130,0.3)' : 'none', borderRadius: 12, padding: '16px 20px', marginBottom: 20, ...glassStyle }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#4A3525', marginBottom: 6 }}>Privacy &amp; Data</p>
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, lineHeight: 1.65, margin: 0 }}>
          Your API key is saved only on your local browser. Camellia does not have access to any of your materials or keys.
        </p>
      </div>

      {/* Coach data export */}
      <div style={{ background: dark ? 'rgba(22,14,36,0.6)' : '#F8F4EE', border: dark ? '1px solid rgba(90,40,130,0.3)' : 'none', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#4A3525', marginBottom: 6 }}>Coach Data Export</p>
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: dark ? '#a080c0' : '#9A8A7A', marginBottom: 10 }}>Download all Coach topics, review records, and events as a JSON backup.</p>
        <button onClick={exportCoachData} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
          Export Coach Data
        </button>
      </div>

      {/* Full data export/import */}
      <div style={{ background: dark ? 'rgba(22,14,36,0.6)' : '#F8F4EE', border: dark ? '1px solid rgba(90,40,130,0.3)' : 'none', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#4A3525', marginBottom: 6 }}>Full Backup (Everything)</p>
        <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: dark ? '#a080c0' : '#9A8A7A', marginBottom: 10 }}>Export or restore your entire Camellia data: profile, notes, flashcards, quizzes, coach data, and AI settings.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleExportAll} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            Export Everything
          </button>
          <label style={{ background: dark ? 'rgba(30,10,46,0.6)' : 'white', border: `1.5px solid ${dark ? 'rgba(90,40,130,0.6)' : '#7b2d6e'}`, borderRadius: 8, padding: '8px 18px', fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', color: dark ? '#c4a0e0' : '#7b2d6e', cursor: 'pointer' }}>
            Import Backup
            <input type="file" accept="application/json" onChange={handleImportAll} style={{ display: 'none' }} />
          </label>
        </div>
        {importMsg && <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: dark ? '#c77dff' : '#7b2d6e', marginTop: 8 }}>{importMsg}</p>}
      </div>

      {/* Danger zone */}
      <div style={{ background: dark ? 'rgba(198,40,40,0.08)' : '#FFF5F5', border: '1.5px solid #FFCDD2', borderRadius: 12, padding: '16px 20px' }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: '#C62828', marginBottom: 8 }}>Danger Zone</p>
        <button onClick={handleClearAll} style={{ background: '#C62828', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
          Clear All Study Data
        </button>
      </div>
    </div>
  );
}
