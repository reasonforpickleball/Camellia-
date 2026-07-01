import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';
import { aiAsk, isAIConfigured } from '../../lib/aiClient';

const FONT = "'Roboto', Arial, sans-serif";
const ANS_COLORS = ['#C2185B', '#7b2d6e', '#E07B39', '#5C3D2E'];

function shuffleOptions(q) {
  const indices = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return { ...q, options: indices.map(i => q.options[i]), correct: indices.indexOf(q.correct) };
}

// ── Mini Ask Camellia chat (inline, post-practice) ────────────────────────────
function MiniAskCamellia({ dark, ns }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'I reviewed your wrong answers. Ask me anything about the topics you missed!' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textPrimary = dark ? '#f0e8ff' : '#1a1a2e';
  const textSecondary = dark ? '#9080b0' : '#6B7280';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : 'rgba(200,180,220,0.5)';
  const cardBg = dark ? 'rgba(22,14,36,0.9)' : 'rgba(255,255,255,0.95)';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const rawMaterial = localStorage.getItem(`camellia_${ns}_raw_material`) || '';

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => `${m.role === 'user' ? 'Student' : 'Camellia'}: ${m.content}`).join('\n');
      const context = rawMaterial ? `\n\nSTUDY MATERIAL CONTEXT:\n${rawMaterial.slice(0, 4000)}` : '';
      const reply = await aiAsk(
        `You are Camellia, a friendly study tutor. The student just finished a practice session and is reviewing their wrong answers. Help them understand the concepts they missed. Be concise, clear, and encouraging.${context}`,
        history,
        { maxTokens: 400 }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an issue. Check your AI key in Settings.' }]);
    }
    setLoading(false);
  };

  if (!isAIConfigured()) return null;

  return (
    <div style={{ background: cardBg, border: `1.5px solid ${dark ? 'rgba(123,45,110,0.5)' : 'rgba(123,45,110,0.25)'}`, borderRadius: 16, padding: '18px 20px', backdropFilter: 'blur(16px)', marginTop: 24 }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#7b2d6e', margin: '0 0 12px' }}>Ask Camellia about what you missed</p>
      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: m.role === 'user' ? '#7b2d6e' : (dark ? 'rgba(40,20,60,0.7)' : '#F3E8FF'),
              color: m.role === 'user' ? 'white' : textPrimary,
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '9px 13px', maxWidth: '80%',
              fontFamily: FONT, fontSize: '0.85rem', lineHeight: 1.5,
              border: m.role === 'assistant' ? `1px solid ${borderCol}` : 'none',
            }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary, fontStyle: 'italic' }}>Camellia is thinking...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about a concept you missed..."
          style={{ flex: 1, border: `1.5px solid ${borderCol}`, borderRadius: 8, padding: '9px 12px', fontFamily: FONT, fontSize: '0.85rem', background: dark ? '#0d0a12' : 'white', color: textPrimary, outline: 'none' }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Ask</button>
      </div>
    </div>
  );
}

// ── Wrong answer review screen ────────────────────────────────────────────────
function WrongAnswerReview({ results, questions, dark, onClose, setTitle, ns }) {
  const textPrimary = dark ? '#f0e8ff' : '#1a1a2e';
  const textSecondary = dark ? '#9080b0' : '#6B7280';
  const pageBg = dark ? 'linear-gradient(135deg, #0d0a12 0%, #120a1e 100%)' : 'linear-gradient(135deg, #FADCD0 0%, #FDF3EE 100%)';
  const cardBg = dark ? 'rgba(30,15,50,0.75)' : 'rgba(255,255,255,0.85)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : 'rgba(200,180,220,0.5)';

  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);
  const scoreColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const wrongOnes = results.map((r, i) => ({ ...r, q: questions[i] })).filter(r => !r.correct);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: pageBg, overflowY: 'auto', fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(20px) saturate(160%)',
        background: dark ? 'rgba(13,10,18,0.9)' : 'rgba(253,243,238,0.9)',
        borderBottom: `1px solid ${borderCol}`,
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: scoreColor, color: 'white', borderRadius: 12, padding: '6px 18px', fontWeight: 900, fontSize: '1.4rem' }}>{pct}%</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: textPrimary }}>{setTitle} — {correct}/{total} correct</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: textSecondary }}>
              {wrongOnes.length === 0 ? 'Perfect score! Nothing to review.' : `${wrongOnes.length} wrong answer${wrongOnes.length !== 1 ? 's' : ''} to review below`}
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>Done</button>
      </div>

      <div style={{ maxWidth: 740, margin: '0 auto', padding: '32px 24px 60px' }}>
        {wrongOnes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</p>
            <p style={{ fontFamily: FONT, fontSize: '1.2rem', fontWeight: 700, color: textPrimary }}>Perfect! No mistakes to review.</p>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: '#ef4444', marginBottom: 20 }}>Wrong Answers — Study These</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {wrongOnes.map((r, i) => {
                const q = r.q;
                const yourAnswer = q.options[r.selectedIdx];
                const rightAnswer = q.options[q.correct];
                return (
                  <div key={i} style={{ background: cardBg, border: '2px solid rgba(239,68,68,0.4)', borderRadius: 16, padding: '20px 24px', backdropFilter: 'blur(16px)' }}>
                    <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.97rem', color: textPrimary, margin: '0 0 14px', lineHeight: 1.45 }}>{q.q}</p>

                    {/* Your answer */}
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.45)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                      <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your answer</span>
                      <p style={{ fontFamily: FONT, fontSize: '0.92rem', color: '#ef4444', margin: '4px 0 0', fontWeight: 600 }}>✗ {yourAnswer}</p>
                    </div>

                    {/* Correct answer */}
                    <div style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.45)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                      <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Correct answer</span>
                      <p style={{ fontFamily: FONT, fontSize: '0.92rem', color: '#22c55e', margin: '4px 0 0', fontWeight: 700 }}>✓ {rightAnswer}</p>
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div style={{ background: dark ? 'rgba(123,45,110,0.15)' : 'rgba(123,45,110,0.07)', border: `1px solid ${dark ? 'rgba(123,45,110,0.4)' : 'rgba(123,45,110,0.2)'}`, borderRadius: 10, padding: '10px 14px' }}>
                        <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: dark ? '#c77dff' : '#7b2d6e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why</span>
                        <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textPrimary, margin: '4px 0 0', lineHeight: 1.6 }}>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <MiniAskCamellia dark={dark} ns={ns} />

        <button onClick={onClose} style={{ marginTop: 32, width: '100%', padding: '16px', background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 14, fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          Close and return to dashboard
        </button>
      </div>
    </div>
  );
}

// ── Main PracticeSession ──────────────────────────────────────────────────────
export default function PracticeSession({ practiceSet, onClose }) {
  const { dark } = useDarkMode();
  const [phase, setPhase] = useState('loading'); // 'loading' | 'quiz' | 'review'
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const textPrimary = dark ? '#f0e8ff' : '#1a1a2e';
  const textSecondary = dark ? '#9080b0' : '#6B7280';
  const pageBg = dark ? 'linear-gradient(135deg, #0d0a12 0%, #120a1e 100%)' : 'linear-gradient(135deg, #FADCD0 0%, #FDF3EE 100%)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : 'rgba(200,180,220,0.5)';

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = () => {
    const { ns, questions: targetCount } = practiceSet;

    // Load from AI-generated questions first, then build from raw text
    let pool = [];
    try { pool = JSON.parse(localStorage.getItem(`camellia_${ns}_ai_questions`) || '[]'); } catch {}

    // Also check all namespaces if pool is thin
    if (pool.length < 5) {
      const allNs = ['default'];
      try {
        const topics = JSON.parse(localStorage.getItem('doomium_topics') || '[]');
        topics.forEach(t => {
          const n = `topic_${t.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
          if (!allNs.includes(n)) allNs.push(n);
        });
      } catch {}
      for (const n of allNs) {
        try {
          const q = JSON.parse(localStorage.getItem(`camellia_${n}_ai_questions`) || '[]');
          if (q.length > pool.length) pool = q;
        } catch {}
      }
    }

    if (pool.length === 0) {
      // Build from raw text as last resort
      const raw = localStorage.getItem(`camellia_${ns}_raw_material`) || '';
      if (raw.length < 30) {
        setError('No questions available. Upload material and run the AI Study Planner first.');
        setPhase('error');
        return;
      }
      pool = buildLocalQuestions(raw);
    }

    if (pool.length === 0) {
      setError('Could not build questions from your material. Try the AI Study Planner first.');
      setPhase('error');
      return;
    }

    // Shuffle and pad to targetCount
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const padded = [];
    let i = 0;
    while (padded.length < targetCount) {
      padded.push(shuffled[i % shuffled.length]);
      i++;
    }
    setQuestions(padded.map(shuffleOptions));
    setPhase('quiz');
  };

  const buildLocalQuestions = (text) => {
    const sentences = text.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 30 && s.length < 200);
    const qs = [];
    for (let i = 0; i < sentences.length && qs.length < 15; i++) {
      const stmt = sentences[i];
      const words = stmt.split(' ');
      if (words.length < 5) continue;
      const swapIdx = Math.floor(words.length * 0.6);
      const wrongWords = ['incorrectly', 'never', 'always', 'opposite'];
      const distractorStmt = [...words.slice(0, swapIdx), wrongWords[qs.length % 4], ...words.slice(swapIdx + 1)].join(' ');
      qs.push({ q: 'Which statement is true?', options: [stmt, distractorStmt, 'None of the above', 'Both are correct'], correct: 0, explanation: `From your material: "${stmt}"` });
    }
    return qs;
  };

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
  };

  const handleNext = () => {
    const q = questions[current];
    const newResults = [...results, { correct: selected === q.correct, selectedIdx: selected }];
    if (current + 1 >= questions.length) {
      // Save quiz result
      const pct = Math.round((newResults.filter(r => r.correct).length / newResults.length) * 100);
      const tk = (k) => `camellia_${practiceSet.ns}_${k}`;
      const existing = JSON.parse(localStorage.getItem(tk('recent_quizzes')) || '[]');
      const now = new Date();
      const date = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}/${String(now.getFullYear()).slice(2)}`;
      const updated = [{ label: practiceSet.type, score: newResults.filter(r => r.correct).length, total: newResults.length, date }, ...existing].slice(0, 10);
      localStorage.setItem(tk('recent_quizzes'), JSON.stringify(updated));
      setResults(newResults);
      setPhase('review');
    } else {
      setResults(newResults);
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  if (phase === 'review') {
    return <WrongAnswerReview results={results} questions={questions} dark={dark} onClose={onClose} setTitle={practiceSet.title} ns={practiceSet.ns} />;
  }

  if (phase === 'error') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ background: dark ? 'rgba(30,15,50,0.85)' : 'rgba(255,255,255,0.9)', border: `1.5px solid ${borderCol}`, borderRadius: 20, padding: '32px', maxWidth: 440, width: '90vw', textAlign: 'center' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: '#ef4444', marginBottom: 12 }}>No questions available</p>
          <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary, marginBottom: 24 }}>{error}</p>
          <button onClick={onClose} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontFamily: FONT, fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: FONT, color: textSecondary }}>Loading questions...</p>
      </div>
    );
  }

  const q = questions[current];
  const pctDone = (current / questions.length) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: pageBg, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      {/* Progress bar */}
      <div style={{
        padding: '14px 24px',
        backdropFilter: 'blur(20px)',
        background: dark ? 'rgba(13,10,18,0.85)' : 'rgba(253,243,238,0.85)',
        borderBottom: `1px solid ${borderCol}`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase' }}>{practiceSet.type}</span>
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textPrimary, fontWeight: 700 }}>{practiceSet.title}</span>
        </div>
        <div style={{ flex: 1, height: 7, background: dark ? '#2a1f3d' : '#e0d0e8', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctDone}%`, background: practiceSet.color, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, fontWeight: 600, flexShrink: 0 }}>Q{current + 1}/{questions.length}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: textSecondary, fontFamily: FONT, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>Exit</button>
      </div>

      {/* Question */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 24px 24px', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.2rem', color: textPrimary, lineHeight: 1.4, margin: '0 0 24px' }}>{q.q}</p>

        {selected === null ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(i)} style={{
                background: ANS_COLORS[i], color: 'white', border: 'none',
                borderRadius: 14, minHeight: 72, padding: '12px 16px',
                fontFamily: FONT, fontWeight: 600, fontSize: '1rem',
                cursor: 'pointer', textAlign: 'center', lineHeight: 1.4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = ''}
              >{opt}</button>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {q.options.map((opt, i) => {
                const isCor = i === q.correct;
                const isSel = i === selected;
                const bg = isCor ? 'rgba(34,197,94,0.2)' : (isSel && !isCor ? 'rgba(239,68,68,0.15)' : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'));
                const border = isCor ? '2px solid #22c55e' : (isSel && !isCor ? '2px solid #ef4444' : `1.5px solid ${borderCol}`);
                return (
                  <div key={i} style={{ borderRadius: 14, padding: '14px 18px', background: bg, border }}>
                    <span style={{ fontFamily: FONT, fontWeight: isCor ? 700 : 500, fontSize: '0.97rem', color: isCor ? '#22c55e' : (isSel && !isCor ? '#ef4444' : textPrimary), lineHeight: 1.4 }}>
                      {isCor && '✓ '}{isSel && !isCor && '✗ '}{opt}
                    </span>
                  </div>
                );
              })}
            </div>
            {q.explanation && (
              <div style={{ background: dark ? 'rgba(123,45,110,0.15)' : 'rgba(123,45,110,0.07)', border: `1px solid ${dark ? 'rgba(123,45,110,0.35)' : 'rgba(123,45,110,0.2)'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: dark ? '#c77dff' : '#7b2d6e', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why</p>
                <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textPrimary, margin: 0, lineHeight: 1.6 }}>{q.explanation}</p>
              </div>
            )}
            <button onClick={handleNext} style={{
              width: '100%', padding: '16px',
              background: practiceSet.color, color: 'white', border: 'none', borderRadius: 14,
              fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
            }}>
              {current + 1 >= questions.length ? 'See Results' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
