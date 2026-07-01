import React, { useState } from 'react';
import { aiAsk, isAIConfigured, parseAIJson, getTaskModel } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';
import AIProgressBar, { useAIProgress } from '../AIProgressBar';

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

// ── Full-screen Results with per-question review ───────────────────────────────

function FullResults({ results, questions, dark, onClose }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [followUpQ, setFollowUpQ] = useState('');
  const [followUpAns, setFollowUpAns] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [activeFollowUp, setActiveFollowUp] = useState(null);

  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);
  const scoreColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = pct >= 80 ? 'Strong' : pct >= 60 ? 'Developing' : pct >= 40 ? 'Needs Work' : 'Foundational';

  const missedIndices = results.map((r, i) => (!r.correct ? i : null)).filter(i => i !== null);

  const textPrimary = dark ? '#f0e8ff' : '#1a1a2e';
  const textSecondary = dark ? '#9080b0' : '#6B7280';
  const pageBg = dark ? 'linear-gradient(135deg, #0d0a12 0%, #120a1e 100%)' : 'linear-gradient(135deg, #FADCD0 0%, #FDF3EE 100%)';
  const cardGlass = dark
    ? 'rgba(30,15,50,0.7)'
    : 'rgba(255,255,255,0.65)';
  const borderCol = dark ? 'rgba(123,45,110,0.4)' : 'rgba(200,180,220,0.5)';

  const handleFollowUp = async (qIdx) => {
    if (!followUpQ.trim() || followUpLoading) return;
    setFollowUpLoading(true);
    try {
      const q = questions[qIdx];
      const ans = await aiAsk(
        `You are a helpful study tutor. Answer the student's follow-up question clearly and concisely.`,
        `Original question: "${q.q}"\nCorrect answer: "${q.options[q.correct]}"\nStudent follow-up: "${followUpQ}"\n\nGive a clear, educational answer in 2-4 sentences.`,
        { maxTokens: 300, model: getTaskModel('quiz_followup') }
      );
      setFollowUpAns(ans);
    } catch {
      setFollowUpAns('Could not get an answer. Please try again.');
    }
    setFollowUpLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: pageBg,
      overflowY: 'auto',
      fontFamily: FONT,
    }}>
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
          <div style={{
            background: scoreColor, color: 'white', borderRadius: 12,
            padding: '6px 18px', fontWeight: 900, fontSize: '1.4rem',
          }}>{pct}%</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: textPrimary }}>{scoreLabel} — {correct}/{total} correct</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: textSecondary }}>Review your mistakes below</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10,
          padding: '10px 24px', fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
        }}>Done, update my plan</button>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* Missed areas summary */}
        {missedIndices.length > 0 && (
          <div style={{
            backdropFilter: 'blur(20px) saturate(160%)',
            background: cardGlass,
            border: `1.5px solid rgba(239,68,68,0.35)`,
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 28,
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 20px rgba(180,140,120,0.15)',
          }}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: '#ef4444', margin: '0 0 12px' }}>
              Main Areas to Review ({missedIndices.length} missed)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {missedIndices.map(i => (
                <span key={i} onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} style={{
                  background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
                  borderRadius: 8, padding: '4px 12px', fontFamily: FONT, fontSize: '0.78rem',
                  color: '#ef4444', fontWeight: 600, cursor: 'pointer',
                }}>
                  Q{i + 1}: {questions[i]?.q?.slice(0, 40)}...
                </span>
              ))}
            </div>
          </div>
        )}

        {/* All questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q, i) => {
            const result = results[i];
            if (!result) return null;
            const isOpen = expandedIdx === i;
            const isCorrect = result.correct;
            const selectedIdx = result.selectedIdx;

            return (
              <div key={i} style={{
                backdropFilter: 'blur(20px) saturate(160%)',
                background: cardGlass,
                border: `1.5px solid ${isCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(180,140,120,0.12)',
              }}>
                {/* Question header */}
                <div
                  onClick={() => setExpandedIdx(isOpen ? null : i)}
                  style={{
                    padding: '16px 20px', cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: isCorrect ? '#22c55e' : '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '0.8rem', color: 'white',
                  }}>{isCorrect ? '+' : 'X'}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: FONT, fontSize: '0.7rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Q{i + 1}</span>
                    <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.95rem', color: textPrimary, margin: '2px 0 0', lineHeight: 1.45 }}>{q.q}</p>
                  </div>
                  <span style={{ color: textSecondary, fontSize: '0.8rem', flexShrink: 0, marginTop: 4 }}>{isOpen ? 'hide' : 'show'}</span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${borderCol}` }}>
                    {/* Options */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14, marginBottom: 16 }}>
                      {q.options.map((opt, oi) => {
                        const isCor = oi === q.correct;
                        const isSel = oi === selectedIdx;
                        const bg = isCor
                          ? 'rgba(34,197,94,0.18)'
                          : (isSel && !isCor ? 'rgba(239,68,68,0.14)' : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'));
                        const border = isCor
                          ? '2px solid #22c55e'
                          : (isSel && !isCor ? '2px solid #ef4444' : `1.5px solid ${borderCol}`);
                        return (
                          <div key={oi} style={{ borderRadius: 10, padding: '10px 14px', background: bg, border }}>
                            <span style={{ fontFamily: FONT, fontWeight: isCor ? 700 : 400, fontSize: '0.88rem', color: isCor ? '#22c55e' : (isSel && !isCor ? '#ef4444' : textPrimary) }}>
                              {isCor && '+ '}{isSel && !isCor && 'X '}{opt}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Correct answer callout */}
                    <div style={{
                      background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.35)',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                    }}>
                      <p style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: '#22c55e', margin: '0 0 2px' }}>Correct answer:</p>
                      <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textPrimary, margin: 0 }}>{q.options[q.correct]}</p>
                      {q.explanation && <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, margin: '6px 0 0', lineHeight: 1.55 }}>{q.explanation}</p>}
                    </div>

                    {/* Follow-up box */}
                    <div style={{
                      backdropFilter: 'blur(12px)',
                      background: dark ? 'rgba(123,45,110,0.12)' : 'rgba(123,45,110,0.06)',
                      border: `1.5px solid ${dark ? 'rgba(123,45,110,0.4)' : 'rgba(123,45,110,0.2)'}`,
                      borderRadius: 10, padding: '12px 14px',
                    }}>
                      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', color: dark ? '#c77dff' : '#7b2d6e', margin: '0 0 8px' }}>Have a follow-up question?</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={activeFollowUp === i ? followUpQ : ''}
                          onChange={e => { setActiveFollowUp(i); setFollowUpQ(e.target.value); setFollowUpAns(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleFollowUp(i)}
                          placeholder="Ask anything about this question..."
                          style={{
                            flex: 1, border: `1.5px solid ${dark ? '#6d3b8a' : '#d0b0e0'}`, borderRadius: 8,
                            padding: '8px 12px', fontFamily: FONT, fontSize: '0.85rem',
                            background: dark ? '#0d0a12' : '#f8f4ff', color: textPrimary, outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => handleFollowUp(i)}
                          disabled={followUpLoading || !followUpQ.trim() || activeFollowUp !== i}
                          style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                        >
                          {followUpLoading && activeFollowUp === i ? '...' : 'Ask'}
                        </button>
                      </div>
                      {followUpAns && activeFollowUp === i && (
                        <div style={{ marginTop: 10, padding: '10px 12px', background: dark ? 'rgba(40,20,60,0.6)' : 'rgba(243,232,255,0.7)', borderRadius: 8 }}>
                          <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textPrimary, margin: 0, lineHeight: 1.6 }}>{followUpAns}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onClose} style={{
          marginTop: 32, width: '100%', padding: '16px',
          background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 14,
          fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
        }}>
          Close and update my coach plan
        </button>
      </div>
    </div>
  );
}

// ── Main DiagnosticQuiz — Full-screen ─────────────────────────────────────────

export default function DiagnosticQuiz({ ns = 'default', onComplete, onClose }) {
  const { dark } = useDarkMode();
  const { progress, active: progActive, startProgress, finishProgress } = useAIProgress();
  const [phase, setPhase] = useState('intro'); // 'intro' | 'loading' | 'quiz' | 'results'
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [genError, setGenError] = useState('');

  const textPrimary = dark ? '#f0e8ff' : '#1a1a2e';
  const textSecondary = dark ? '#9080b0' : '#6B7280';
  const pageBg = dark ? 'linear-gradient(135deg, #0d0a12 0%, #120a1e 100%)' : 'linear-gradient(135deg, #FADCD0 0%, #FDF3EE 100%)';
  const borderCol = dark ? 'rgba(90,40,130,0.4)' : 'rgba(200,180,220,0.5)';

  // Pad a question set to 25 by re-using questions in different formats
  const padQuestions = (valid) => {
    if (valid.length >= 25) return valid.slice(0, 25).map(shuffleOptions);
    const padded = [...valid];
    let i = 0;
    while (padded.length < 25) {
      const src = valid[i % valid.length];
      // Rotate correct answer position to make it feel different
      const rotated = {
        ...src,
        q: src.q,
        options: [...src.options.slice(1), src.options[0]],
        correct: src.correct === 0 ? src.options.length - 1 : src.correct - 1,
      };
      padded.push(rotated);
      i++;
    }
    return padded.map(shuffleOptions);
  };

  // Build basic true/false questions from raw text when no AI is available
  const buildLocalQuestions = (text) => {
    const sentences = text
      .split(/[.!?]\s+/)
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(s => s.length > 30 && s.length < 200 && /[a-zA-Z]{4,}/.test(s));
    const qs = [];
    for (let i = 0; i < sentences.length && qs.length < 10; i++) {
      const stmt = sentences[i];
      // Distractor: swap a key word with a nearby word
      const words = stmt.split(' ');
      if (words.length < 5) continue;
      const swapIdx = Math.floor(words.length * 0.6);
      const wrongWords = ['incorrectly', 'never', 'always', 'opposite'];
      const wrongWord = wrongWords[qs.length % wrongWords.length];
      const distractorStmt = [...words.slice(0, swapIdx), wrongWord, ...words.slice(swapIdx + 1)].join(' ');
      qs.push({
        q: `Which of the following is true according to your material?`,
        options: [stmt, distractorStmt, `None of the above`, `Both are partially correct`],
        correct: 0,
        explanation: `From your notes: "${stmt}"`,
      });
    }
    return qs;
  };

  const generateQuestions = async () => {
    // Collect raw material across all namespaces
    let rawMaterial = localStorage.getItem(`camellia_${ns}_raw_material`) || '';
    if (!rawMaterial || rawMaterial.length < 50) {
      const allNs = ['default'];
      try {
        const tabs = JSON.parse(localStorage.getItem('doomium_topics') || '[]');
        tabs.forEach(t => {
          if (!t) return;
          const topicNs = `topic_${t.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
          if (!allNs.includes(topicNs)) allNs.push(topicNs);
        });
      } catch {}
      for (const n of allNs) {
        const m = localStorage.getItem(`camellia_${n}_raw_material`) || '';
        if (m.length > rawMaterial.length) rawMaterial = m;
      }
    }

    // Pre-existing AI questions (from planner generation)
    const existingQs = (() => {
      try { return JSON.parse(localStorage.getItem(`camellia_${ns}_ai_questions`) || '[]'); } catch { return []; }
    })();

    // No material at all
    if (!rawMaterial || rawMaterial.length < 50) {
      if (existingQs.length >= 5) {
        setQuestions(padQuestions(existingQs));
        setCurrent(0); setSelected(null); setResults([]);
        setPhase('quiz');
        return;
      }
      setGenError('No study material found. Upload material in the AI Study Planner tab first.');
      return;
    }

    // If no AI key, build local questions from raw text — always works on first try
    if (!isAIConfigured()) {
      const localQs = buildLocalQuestions(rawMaterial);
      const seed = existingQs.length >= 5 ? [...localQs, ...existingQs] : (localQs.length >= 5 ? localQs : existingQs);
      if (seed.length >= 3) {
        setQuestions(padQuestions(seed));
        setCurrent(0); setSelected(null); setResults([]);
        setPhase('quiz');
        return;
      }
      setGenError('Add an AI key in Settings for best results, or upload more material.');
      return;
    }

    setPhase('loading');
    setGenError('');
    startProgress();
    try {
      const raw = await aiAsk(
        `You are an expert diagnostic quiz creator. Generate exactly 25 multiple-choice questions spanning easy, medium, and hard difficulty. Return ONLY a valid JSON array, no prose, no markdown, no explanation outside the JSON.`,
        `Generate 25 multiple-choice questions from this material.\n\nMATERIAL:\n${rawMaterial.slice(0, 12000)}\n\nRespond with ONLY a JSON array (no markdown fences, no other text): [{"q":"question","options":["A","B","C","D"],"correct":0,"explanation":"brief explanation"}]`,
        { maxTokens: 5000, model: getTaskModel('diagnostic_quiz') }
      );
      let parsed = null;
      try { parsed = parseAIJson(raw); } catch {}
      if (!Array.isArray(parsed)) {
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) { try { parsed = JSON.parse(match[0]); } catch {} }
      }
      let valid = Array.isArray(parsed)
        ? parsed.filter(q => q.q && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number')
        : [];
      if (valid.length < 5 && existingQs.length >= 5) valid = [...valid, ...existingQs];
      if (valid.length < 5) valid = [...valid, ...buildLocalQuestions(rawMaterial)];
      finishProgress();
      if (valid.length < 3) {
        setGenError('Could not generate enough questions. Please try again or add more material.');
        setPhase('intro');
        return;
      }
      setQuestions(padQuestions(valid));
      setCurrent(0); setSelected(null); setResults([]);
      setPhase('quiz');
    } catch (e) {
      finishProgress();
      // Always fall back — never strand the user on an error screen
      const fallback = existingQs.length >= 3 ? existingQs : buildLocalQuestions(rawMaterial);
      if (fallback.length >= 3) {
        setQuestions(padQuestions(fallback));
        setCurrent(0); setSelected(null); setResults([]);
        setPhase('quiz');
        return;
      }
      setGenError('Could not generate questions. Please add more study material or configure an AI key in Settings.');
      setPhase('intro');
    }
  };

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
  };

  const handleNext = () => {
    const q = questions[current];
    const newResults = [...results, { correct: selected === q.correct, selectedIdx: selected, questionIdx: current }];
    if (current + 1 >= questions.length) {
      const pct = Math.round((newResults.filter(r => r.correct).length / newResults.length) * 100);
      const tk = (k) => `camellia_${ns}_${k}`;
      const existing = JSON.parse(localStorage.getItem(tk('recent_quizzes')) || '[]');
      const now = new Date();
      const date = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}/${String(now.getFullYear()).slice(2)}`;
      const updated = [{ label: 'Diagnostic', score: newResults.filter(r => r.correct).length, total: newResults.length, date }, ...existing].slice(0, 10);
      localStorage.setItem(tk('recent_quizzes'), JSON.stringify(updated));
      setResults(newResults);
      setPhase('results');
      if (onComplete) onComplete(pct);
    } else {
      setResults(newResults);
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  // Results
  if (phase === 'results') {
    return <FullResults results={results} questions={questions} dark={dark} onClose={onClose} />;
  }

  // Loading
  if (phase === 'loading') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: pageBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          backdropFilter: 'blur(24px) saturate(160%)',
          background: dark ? 'rgba(30,15,50,0.8)' : 'rgba(255,255,255,0.7)',
          border: `1.5px solid ${borderCol}`,
          borderRadius: 16, padding: '28px 32px', maxWidth: 400, width: '90vw', textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.1rem', color: textPrimary, marginBottom: 24 }}>Generating your diagnostic...</p>
          <AIProgressBar progress={progress} label="Building 25 questions from your material" />
        </div>
      </div>
    );
  }

  // Quiz
  if (phase === 'quiz') {
    const q = questions[current];
    const pctDone = ((current) / questions.length) * 100;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: pageBg,
        display: 'flex', flexDirection: 'column',
        fontFamily: FONT,
      }}>
        {/* Progress bar */}
        <div style={{
          padding: '14px 24px',
          backdropFilter: 'blur(20px)',
          background: dark ? 'rgba(13,10,18,0.85)' : 'rgba(253,243,238,0.85)',
          borderBottom: `1px solid ${borderCol}`,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, flexShrink: 0, fontWeight: 600 }}>Q{current + 1} / {questions.length}</span>
          <div style={{ flex: 1, height: 7, background: dark ? '#2a1f3d' : '#e0d0e8', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pctDone}%`, background: '#7b2d6e', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: '#7b2d6e', fontWeight: 700, flexShrink: 0 }}>Diagnostic</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: textSecondary, fontFamily: FONT, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>Exit</button>
        </div>

        {/* Question */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 24px 24px', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.2rem', color: textPrimary, lineHeight: 1.4, margin: '0 0 20px', textAlign: 'center' }}>{q.q}</p>

          {selected === null ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} style={{
                  background: ANS_COLORS[i], color: 'white', border: 'none',
                  borderRadius: 14, minHeight: 72, padding: '12px 16px',
                  fontFamily: FONT, fontWeight: 600, fontSize: '1rem',
                  cursor: 'pointer', textAlign: 'center', lineHeight: 1.4,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  transition: 'filter 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.filter = ''}
                >{opt}</button>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {q.options.map((opt, i) => {
                  const isCor = i === q.correct;
                  const isSel = i === selected;
                  const bg = isCor ? 'rgba(34,197,94,0.2)' : (isSel && !isCor ? 'rgba(239,68,68,0.15)' : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'));
                  const border = isCor ? '2px solid #22c55e' : (isSel && !isCor ? '2px solid #ef4444' : `1.5px solid ${borderCol}`);
                  return (
                    <div key={i} style={{ borderRadius: 14, padding: '14px 18px', background: bg, border }}>
                      <span style={{ fontFamily: FONT, fontWeight: isCor ? 700 : 500, fontSize: '0.97rem', color: isCor ? '#22c55e' : (isSel && !isCor ? '#ef4444' : textPrimary), lineHeight: 1.4 }}>
                        {isCor && '+ '}{isSel && !isCor && 'X '}{opt}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleNext} style={{
                width: '100%', padding: '16px',
                background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 14,
                fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(123,45,110,0.35)',
              }}>
                {current + 1 >= questions.length ? 'See Results' : 'Next Question'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Intro — also full screen
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
    }}>
      <div style={{
        backdropFilter: 'blur(24px) saturate(160%)',
        background: dark ? 'rgba(30,15,50,0.75)' : 'rgba(255,255,255,0.65)',
        border: `1.5px solid ${borderCol}`,
        borderRadius: 20, padding: '28px 32px',
        width: '90vw', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>X</button>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.4rem', color: textPrimary, margin: '0 0 6px' }}>Knowledge Diagnostic</h2>
          <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: 0, lineHeight: 1.5 }}>
            25 questions · ~10 minutes · personalizes your coach plan
          </p>
        </div>
        <div style={{
          background: dark ? 'rgba(123,45,110,0.15)' : 'rgba(123,45,110,0.07)',
          border: `1.5px solid ${dark ? 'rgba(123,45,110,0.4)' : 'rgba(123,45,110,0.2)'}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        }}>
          <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: dark ? '#c4a0e0' : '#7b2d6e', margin: 0, lineHeight: 1.6 }}>
            Generated from your uploaded material. No penalty for wrong answers.
          </p>
        </div>
        {genError && (
          <div style={{ background: 'rgba(244,67,54,0.1)', border: '1.5px solid #F44336', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontFamily: FONT, fontSize: '0.82rem', color: '#C62828' }}>{genError}</div>
        )}
        <button onClick={generateQuestions} style={{
          width: '100%', padding: '14px',
          background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 12,
          fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(123,45,110,0.4)',
        }}>
          Start Diagnostic
        </button>
      </div>
    </div>
  );
}
