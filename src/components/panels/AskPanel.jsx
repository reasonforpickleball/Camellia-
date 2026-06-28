import React, { useState, useRef, useEffect } from 'react';
import { CamelliaLogoChatMini } from '../CamelliaLogo';
import { aiChat, isAIConfigured } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';
import ReactMarkdown from 'react-markdown';
import AIProgressBar, { useAIProgress } from '../AIProgressBar';

const tk = (ns, key) => `camellia_${ns}_${key}`;
const FONT = 'Arial, Helvetica, sans-serif';

function loadHistory(ns) {
  try {
    const saved = JSON.parse(localStorage.getItem(tk(ns, 'chat_history')) || 'null');
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  return [{ role: 'assistant', content: "Hi! I'm Camellia. I have your uploaded material loaded and I'm ready to help. Ask me anything!" }];
}

export default function AskPanel({ ns = 'default' }) {
  const { dark } = useDarkMode();
  const userName = localStorage.getItem('doomium_user_name') || 'You';
  const profilePic = localStorage.getItem('doomium_profile_pic');
  const textPrimary = dark ? '#e8d5ff' : '#2D1B0E';
  const textSecondary = dark ? '#c4a0e0' : '#9A8A7A';

  const [messages, setMessages] = useState(() => loadHistory(ns));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef();
  const { progress, active: progActive, startProgress, finishProgress } = useAIProgress();

  useEffect(() => {
    try { localStorage.setItem(tk(ns, 'chat_history'), JSON.stringify(messages)); } catch {}
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ns]);

  const getRawMaterial = () => localStorage.getItem(tk(ns, 'raw_material')) || '';

  const buildSystemPrompt = () => {
    const material = getRawMaterial();
    if (!material || material.length < 50) {
      return `You are Camellia, an expert AI study assistant. You help students understand concepts deeply. Be thorough, clear, and use examples. Format responses with markdown — use **bold**, bullet points, and headers where helpful.`;
    }
    return `You are Camellia, an expert AI study assistant. The student has uploaded the following study material:

--- STUDY MATERIAL START ---
${material.slice(0, 12000)}
--- STUDY MATERIAL END ---

Use this material as your primary knowledge source. When the student asks questions:
- Answer with depth and clarity
- Reference specific parts of the material
- Add helpful explanations beyond what's in the material when useful
- Use **bold**, bullet points, numbered lists, and headers (## ###) for clear formatting
- If the question is outside the material scope, still answer helpfully from your general knowledge`;
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    if (!isAIConfigured()) {
      setError('No AI key configured. Go to Settings to add your API key.');
      return;
    }
    setError('');
    setInput('');

    const newMessages = [...messages, { role: 'user', content: q }];
    setMessages(newMessages);
    setLoading(true);
    startProgress();

    // Build conversation for API (convert our format to API format)
    const systemPrompt = buildSystemPrompt();
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...newMessages
        .filter(m => m.role !== 'assistant' || m.content !== newMessages[0]?.content) // skip welcome
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }))
        .slice(-20), // keep last 20 for context
    ];

    try {
      const answer = await aiChat(apiMessages, { maxTokens: 1500 });
      finishProgress();
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (e) {
      finishProgress();
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleClear = () => {
    const fresh = [{ role: 'assistant', content: "Conversation cleared! I still have your material loaded. What would you like to know?" }];
    setMessages(fresh);
    localStorage.setItem(tk(ns, 'chat_history'), JSON.stringify(fresh));
  };

  const UserAvatar = () => profilePic
    ? <img src={profilePic} alt="you" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D1D1D1', flexShrink: 0 }} />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '80vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, color: textPrimary, fontFamily: FONT, margin: 0, flex: 1, textAlign: 'center' }}>Ask Camellia</h1>
        <button onClick={handleClear} style={{ background: 'none', border: '1px solid #E5D8C8', borderRadius: 8, padding: '5px 12px', fontFamily: FONT, fontSize: '0.75rem', color: '#9A8A7A', cursor: 'pointer' }}>Clear chat</button>
      </div>

      {!isAIConfigured() && (
        <div style={{ background: '#FFF8F0', border: '1.5px solid #E07B39', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontFamily: FONT, fontSize: '0.85rem', color: '#8B3A00' }}>
          <strong>No AI key configured.</strong> Go to Settings in the sidebar to add your API key.
        </div>
      )}

      {error && (
        <div style={{ background: '#FFF0F0', border: '1.5px solid #F44336', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontFamily: FONT, fontSize: '0.85rem', color: '#C62828' }}>{error}</div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 16, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 10 }}>
            {m.role === 'assistant' && <CamelliaLogoChatMini />}
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '72%', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginBottom: 4 }}>{m.role === 'user' ? userName : 'Camellia'}</span>
              <div className={m.role === 'user' ? 'bubble-user' : 'bubble-bot'}>
                {m.role === 'assistant' ? (
                  <div style={{ fontFamily: FONT, fontSize: '0.95rem', color: textPrimary, lineHeight: 1.7 }} className="prose-camellia">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p style={{ fontFamily: FONT, fontSize: '0.95rem', color: textPrimary, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                )}
              </div>
            </div>
            {m.role === 'user' && <UserAvatar />}
          </div>
        ))}
        {progActive && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 10, width: '100%' }}>
            <CamelliaLogoChatMini />
            <div className="bubble-bot" style={{ flex: 1, maxWidth: '60%' }}>
              <AIProgressBar progress={progress} label={null} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 8 }}>
        <textarea
          className="orange-input"
          rows={2}
          style={{ flex: 1, borderRadius: 16, fontFamily: FONT, resize: 'none' }}
          placeholder="Ask anything about your material..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button className="arrow-circle-btn" onClick={handleSend} disabled={loading || !input.trim()}>→</button>
      </div>
    </div>
  );
}
