import React, { useState, useEffect, useRef } from 'react';
import { incrementQuizzes } from '../../lib/stats';
import { aiAsk, isAIConfigured, parseAIJson, getTaskModel } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';
import AIProgressBar, { useAIProgress } from '../AIProgressBar';
import useTourStep from '../../hooks/useTourStep';
import { setTourStep } from '../../lib/tourStore';
import TourPointer from '../TourPointer';

function shuffleQuestion(q) {
  if (q.type !== 'mc') return q;
  const indices = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return { ...q, options: indices.map(i => q.options[i]), correct: indices.indexOf(q.correct) };
}

const ANS_COLORS = ['#C2185B', '#7b2d6e', '#E07B39', '#5C3D2E'];
const tk = (ns, key) => `camellia_${ns}_${key}`;
const FONT = "'Roboto', Arial, Helvetica, sans-serif";

function loadMCQuestions(ns) {
  try { return JSON.parse(localStorage.getItem(tk(ns, 'ai_questions')) || '[]'); } catch { return []; }
}
function loadRecentQuizzes(ns) {
  try { return JSON.parse(localStorage.getItem(tk(ns, 'recent_quizzes')) || '[]'); } catch { return []; }
}
function saveRecentQuiz(ns, score, total) {
  const prev = loadRecentQuizzes(ns);
  const now = new Date();
  const date = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}/${String(now.getFullYear()).slice(2)}`;
  const updated = [{ label: `Quiz ${prev.length + 1}`, score, total, date }, ...prev].slice(0, 10);
  localStorage.setItem(tk(ns, 'recent_quizzes'), JSON.stringify(updated));
  return updated;
}

function CSlider({ min, max, value, onChange, label, dark }) {
  const pct = ((value - min) / (max - min)) * 100;
  const thumbOffset = 18 - (pct / 100) * 36;
  const trackBg = dark ? '#6d3b8a' : '#7b2d6e';
  const thumbBorder = dark ? '#c77dff' : '#7b2d6e';
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: dark ? '#c4a8e0' : '#8A7A6A', textAlign: 'center', marginBottom: 10 }}>{label}: <strong style={{ color: dark ? '#e0b8ff' : '#7b2d6e' }}>{value}</strong></p>
      <div style={{ position: 'relative', height: 36, padding: '0 18px' }}>
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2, height: '100%' }}
        />
        <div style={{ position: 'absolute', left: 18, right: 18, top: 0, bottom: 0, borderRadius: 18, background: trackBg, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: `calc(${pct}% + ${thumbOffset}px)`, top: 0, bottom: 0, width: 36, height: 36, borderRadius: '50%', background: dark ? '#1e0a2e' : 'white', border: `3px solid ${thumbBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: thumbBorder, pointerEvents: 'none', zIndex: 1 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function QuizzesPanel({ ns = 'default' }) {
  const { dark } = useDarkMode();
  const { progress: genProgress, active: genProgActive, startProgress: startGenProgress, finishProgress: finishGenProgress } = useAIProgress();
  const { progress: gradeProgress, active: gradeProgActive, startProgress: startGradeProgress, finishProgress: finishGradeProgress } = useAIProgress();
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [mcPct, setMcPct] = useState(60);
  const [fitbPct, setFitbPct] = useState(20);
  // essay pct = 100 - mc - fitb
  const essayPct = Math.max(0, 100 - mcPct - fitbPct);

  const [quizActive, setQuizActive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [openAnswer, setOpenAnswer] = useState('');
  const [feedback, setFeedback] = useState(null); // { correct, explanation, followUp, followUpAnswer, followUpLoading }
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [finished, setFinished] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState(() => loadRecentQuizzes(ns));
  const [noMaterial, setNoMaterial] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [aiGrading, setAiGrading] = useState(false);
  const [followUpQ, setFollowUpQ] = useState('');
  const [followUpAns, setFollowUpAns] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  // Spaced repetition: missed questions come back later
  const missedRef = useRef([]);
  const tourStep = useTourStep();
  const startQuizBtnRef = useRef(null);

  useEffect(() => { setRecentQuizzes(loadRecentQuizzes(ns)); }, [ns]);

  const generateFreshQuestions = async () => {
    const rawMaterial = localStorage.getItem(tk(ns, 'raw_material')) || '';
    if (!rawMaterial || rawMaterial.length < 50) { setNoMaterial(true); return; }
    if (!isAIConfigured()) { setGenError('No AI key configured, go to Settings.'); return; }
    setGenerating(true); setGenError(''); setNoMaterial(false);
    startGenProgress();
    try {
      // Compute exact counts — must sum to exactly totalQuestions
      const mcCount = Math.round(totalQuestions * mcPct / 100);
      const fitbCount = Math.round(totalQuestions * fitbPct / 100);
      const essayCount = Math.max(0, totalQuestions - mcCount - fitbCount);
      // Request a few extra per type so we can trim to exact count
      const BUFFER = 3;

      let allQuestions = [];

      // Generate MC — one type failing shouldn't abort the other types
      if (mcCount > 0) {
        try {
          const raw = await aiAsk(
            `You are an expert quiz creator. Generate high-quality multiple choice questions that test genuine understanding. NEVER ask about file metadata.`,
            `Generate EXACTLY ${mcCount + BUFFER} multiple choice questions from this material. You MUST return exactly ${mcCount + BUFFER} items.\n\nMATERIAL:\n${rawMaterial.slice(0, 10000)}\n\nReturn ONLY JSON array (no other text): [{"type":"mc","q":"question","options":["A","B","C","D"],"correct":0}]`,
            { maxTokens: Math.min(4000, 220 * (mcCount + BUFFER)), model: getTaskModel('quiz_gen') }
          );
          const parsed = parseAIJson(raw);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(q => q.q && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number');
            allQuestions.push(...valid.slice(0, mcCount).map(q => ({ ...q, type: 'mc' })));
          }
        } catch {}
      }

      // Generate Fill-in-the-blank
      if (fitbCount > 0) {
        try {
          const raw = await aiAsk(
            `You are an expert quiz creator. Generate fill-in-the-blank questions where the student writes a short answer (1-5 words). Focus on key terms, definitions, and important facts.`,
            `Generate EXACTLY ${fitbCount + BUFFER} fill-in-the-blank questions from this material. You MUST return exactly ${fitbCount + BUFFER} items.\n\nMATERIAL:\n${rawMaterial.slice(0, 10000)}\n\nReturn ONLY JSON array (no other text): [{"type":"fitb","q":"The ___ is responsible for...","answer":"correct short answer","hint":"optional context"}]`,
            { maxTokens: Math.min(3000, 150 * (fitbCount + BUFFER)), model: getTaskModel('quiz_gen') }
          );
          const parsed = parseAIJson(raw);
          if (Array.isArray(parsed)) {
            allQuestions.push(...parsed.filter(q => q.q && q.answer).slice(0, fitbCount).map(q => ({ ...q, type: 'fitb' })));
          }
        } catch {}
      }

      // Generate Essay
      if (essayCount > 0) {
        try {
          const raw = await aiAsk(
            `You are an expert quiz creator. Generate open-ended essay questions that require critical thinking and deep understanding of the material.`,
            `Generate EXACTLY ${essayCount + BUFFER} essay questions from this material. You MUST return exactly ${essayCount + BUFFER} items.\n\nMATERIAL:\n${rawMaterial.slice(0, 10000)}\n\nReturn ONLY JSON array (no other text): [{"type":"essay","q":"question requiring detailed explanation","keyPoints":["point1","point2","point3"]}]`,
            { maxTokens: Math.min(3000, 180 * (essayCount + BUFFER)), model: getTaskModel('quiz_gen') }
          );
          const parsed = parseAIJson(raw);
          if (Array.isArray(parsed)) {
            allQuestions.push(...parsed.filter(q => q.q).slice(0, essayCount).map(q => ({ ...q, type: 'essay' })));
          }
        } catch {}
      }

      if (allQuestions.length === 0) { setGenError('Could not generate questions. Please try again.'); finishGenProgress(); setGenerating(false); return; }

      // Trim to EXACTLY totalQuestions
      const trimmed = allQuestions.slice(0, totalQuestions);

      // Save MC questions for future use
      const mcOnly = trimmed.filter(q => q.type === 'mc');
      if (mcOnly.length > 0) localStorage.setItem(tk(ns, 'ai_questions'), JSON.stringify(mcOnly));

      // Shuffle all
      const shuffled = trimmed.sort(() => Math.random() - 0.5).map(shuffleQuestion);
      finishGenProgress();
      startQuizWith(shuffled);
    } catch (e) {
      finishGenProgress();
      setGenError('Something went wrong. Please try again.');
    }
    setGenerating(false);
  };

  const startQuizWith = (qs) => {
    setQuestions(qs);
    scoreRef.current = 0;
    missedRef.current = [];
    setCurrent(0); setSelected(null); setOpenAnswer(''); setFeedback(null); setScore(0); setFinished(false);
    setQuizActive(true);
  };

  const startQuiz = () => {
    // Always generate fresh to honour exact question count
    generateFreshQuestions();
  };

  const gradeOpenAnswer = async (q, userAnswer) => {
    setAiGrading(true);
    startGradeProgress();
    try {
      const keyPoints = q.keyPoints ? `Key points expected: ${q.keyPoints.join(', ')}` : '';
      const correctAnswer = q.answer ? `Correct answer: ${q.answer}` : '';
      const raw = await aiAsk(
        `You are a strict but fair teacher grading a student's answer. Be honest, encouraging, and educational.`,
        `Question: "${q.q}"\nStudent's answer: "${userAnswer}"\n${correctAnswer}\n${keyPoints}\n\nReturn ONLY JSON: {"correct": true/false, "score": 0-100, "explanation": "detailed explanation of what is right/wrong and the correct answer", "summary": "one sentence verdict"}`,
        { maxTokens: 500, model: getTaskModel('quiz_grade') }
      );
      const result = parseAIJson(raw);
      const isCorrect = result.correct || result.score >= 60;
      if (isCorrect) { scoreRef.current += 1; setScore(scoreRef.current); }
      else { missedRef.current.push({ ...q, _missed: true }); }
      finishGradeProgress();
      setFeedback({ correct: isCorrect, explanation: result.explanation, summary: result.summary });
    } catch {
      finishGradeProgress();
      const isCorrect = q.answer ? userAnswer.toLowerCase().includes(q.answer.toLowerCase().slice(0, 5)) : false;
      if (isCorrect) { scoreRef.current += 1; setScore(scoreRef.current); }
      setFeedback({ correct: isCorrect, explanation: isCorrect ? 'Good answer!' : `The expected answer was: ${q.answer || 'see key points'}` });
    }
    setAiGrading(false);
  };

  const handleMCAnswer = async (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = idx === questions[current].correct;
    if (isCorrect) { scoreRef.current += 1; setScore(scoreRef.current); }
    else { missedRef.current.push({ ...questions[current], _missed: true }); }

    // AI analysis for MC
    setAiGrading(true);
    startGradeProgress();
    try {
      const q = questions[current];
      const raw = await aiAsk(
        `You are a study coach. Briefly explain why an answer is correct or incorrect.`,
        `Question: "${q.q}"\nCorrect answer: "${q.options[q.correct]}"\nStudent chose: "${q.options[idx]}"\nIs correct: ${isCorrect}\n\nReturn ONLY JSON: {"explanation": "2-3 sentence explanation of why the correct answer is right and what concept it tests"}`,
        { maxTokens: 300, model: getTaskModel('quiz_explain') }
      );
      const result = parseAIJson(raw);
      finishGradeProgress();
      setFeedback({ correct: isCorrect, explanation: result.explanation });
    } catch {
      finishGradeProgress();
      setFeedback({ correct: isCorrect, explanation: isCorrect ? 'Correct! Well done.' : `The correct answer was: ${questions[current].options[questions[current].correct]}` });
    }
    setAiGrading(false);
  };

  const handleOpenSubmit = async () => {
    if (!openAnswer.trim() || aiGrading) return;
    await gradeOpenAnswer(questions[current], openAnswer.trim());
  };

  const handleNext = () => {
    const nextIdx = current + 1;
    // Quiz length is fixed to the number of questions the user set, regardless of right/wrong answers
    const qs = questions;

    if (nextIdx >= qs.length) {
      const updated = saveRecentQuiz(ns, scoreRef.current, qs.length);
      setRecentQuizzes(updated);
      incrementQuizzes();
      setFinished(true);
      if (tourStep === 5) setTourStep(6);
    } else {
      setCurrent(nextIdx);
      setSelected(null);
      setOpenAnswer('');
      setFeedback(null);
      setFollowUpQ('');
      setFollowUpAns('');
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQ.trim() || followUpLoading) return;
    setFollowUpLoading(true);
    try {
      const q = questions[current];
      const ans = await aiAsk(
        `You are a helpful study tutor. Answer the student's follow-up question clearly and concisely.`,
        `Original question: "${q.q}"\nStudent follow-up: "${followUpQ}"\n\nGive a clear, educational answer in 2-4 sentences.`,
        { maxTokens: 300, model: getTaskModel('quiz_followup') }
      );
      setFollowUpAns(ans);
    } catch (e) {
      setFollowUpAns('Could not get an answer. Please try again.');
    }
    setFollowUpLoading(false);
  };

  const bg = dark ? 'linear-gradient(135deg, #0d0a12 0%, #120a1e 100%)' : '#FDF3EE';
  const cardBg = dark ? '#160e24' : 'white';
  const textPrimary = dark ? '#e8d5ff' : '#2D1B0E';
  const textSecondary = dark ? '#a080c0' : '#8A7A6A';
  const borderCol = dark ? '#3a1f5a' : '#E5D8C8';

  if (quizActive) {
    if (finished) return (
      <div className="fade-in" style={{ textAlign: 'center', paddingTop: 80, background: dark ? '#0d0a12' : 'transparent', minHeight: '100vh' }}>
        <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '2rem', color: dark ? '#c77dff' : '#2D1B0E', marginBottom: 12 }}>Quiz Complete!</h2>
        <p style={{ fontFamily: FONT, fontSize: '1.2rem', color: dark ? '#e8d5ff' : '#5A4A3A', marginBottom: 32 }}>Score: {score} / {questions.length}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => setQuizActive(false)} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontFamily: FONT, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Back to Quiz Generator</button>
          <button onClick={generateFreshQuestions} disabled={generating} style={{ background: dark ? '#3a1f5a' : '#5C3D2E', color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontFamily: FONT, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>New Questions</button>
        </div>
      </div>
    );

    const q = questions[current];
    const qType = q.type || 'mc';

    return (
      <div className="fade-in" style={{ minHeight: '100vh', background: bg, position: 'relative', paddingBottom: 40 }}>
        <button onClick={() => setQuizActive(false)} style={{ position: 'absolute', top: 16, right: 24, color: 'red', fontWeight: 700, fontFamily: FONT, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>exit</button>

        <div style={{ padding: '50px 40px 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textSecondary, marginBottom: 4 }}>
            Question {current + 1}/{questions.length}
            {q._spaced && <span style={{ marginLeft: 8, background: '#7b2d6e', color: 'white', borderRadius: 8, padding: '1px 8px', fontSize: '0.72rem' }}>Review</span>}
          </p>
          <div style={{ display: 'inline-block', background: qType === 'mc' ? '#7b2d6e22' : qType === 'fitb' ? '#E07B3922' : '#4CAF5022', borderRadius: 8, padding: '2px 12px', marginBottom: 10 }}>
            <span style={{ fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700, color: qType === 'mc' ? '#7b2d6e' : qType === 'fitb' ? '#E07B39' : '#2E7D32' }}>
              {qType === 'mc' ? 'Multiple Choice' : qType === 'fitb' ? 'Fill in the Blank' : 'Essay'}
            </span>
          </div>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.6rem', color: textPrimary, marginBottom: 24, maxWidth: 700, margin: '0 auto 24px' }}>{q.q}</h2>
        </div>

        {/* MC */}
        {qType === 'mc' && !feedback && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {q.options.map((opt, i) => (
              <button key={i} className="ans-btn" style={{ background: ANS_COLORS[i], borderRadius: 0, minHeight: 120, fontSize: '1.1rem' }} onClick={() => handleMCAnswer(i)}>{opt}</button>
            ))}
          </div>
        )}

        {/* Fill-in-blank / Essay input */}
        {(qType === 'fitb' || qType === 'essay') && !feedback && (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
            {qType === 'fitb' && q.hint && (
              <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, marginBottom: 8, fontStyle: 'italic' }}>Hint: {q.hint}</p>
            )}
            <textarea
              value={openAnswer}
              onChange={e => setOpenAnswer(e.target.value)}
              placeholder={qType === 'fitb' ? 'Type your answer...' : 'Write your essay answer here...'}
              style={{
                width: '100%', minHeight: qType === 'essay' ? 180 : 60,
                border: `2px solid ${dark ? '#6d3b8a' : '#7b2d6e'}`,
                borderRadius: 12, padding: '14px 16px',
                fontFamily: FONT, fontSize: '1rem', lineHeight: 1.6,
                color: dark ? '#e8d5ff' : '#2D1B0E',
                background: dark ? '#1e0a2e' : 'white',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleOpenSubmit}
              disabled={!openAnswer.trim() || aiGrading}
              style={{
                marginTop: 14, width: '100%', padding: '14px',
                background: aiGrading ? (dark ? '#3a1f5a' : '#E5D8C8') : '#7b2d6e',
                color: aiGrading ? textSecondary : 'white',
                border: 'none', borderRadius: 12, fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: aiGrading ? 'not-allowed' : 'pointer',
              }}
            >
              {aiGrading ? 'Grading…' : 'Submit Answer'}
            </button>
          </div>
        )}

        {/* MC selected but grading */}
        {qType === 'mc' && selected !== null && gradeProgActive && !feedback && (
          <div style={{ maxWidth: 400, margin: '24px auto', padding: '0 24px' }}>
            <AIProgressBar progress={gradeProgress} label={null} />
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>
            <div style={{
              borderRadius: 16, padding: '28px 32px', marginBottom: 16,
              background: feedback.correct
                ? (dark ? 'rgba(93,214,44,0.15)' : 'rgba(93,214,44,0.12)')
                : (dark ? 'rgba(255,61,61,0.15)' : 'rgba(255,61,61,0.12)'),
              border: `2px solid ${feedback.correct ? '#4CAF50' : '#F44336'}`,
            }}>
              <p style={{ fontSize: '1.8rem', fontWeight: 900, color: feedback.correct ? '#39B711' : '#FF2222', fontFamily: FONT, marginBottom: 8 }}>
                {feedback.correct ? 'Correct!' : 'Incorrect'}
              </p>
              {qType === 'mc' && !feedback.correct && (
                <p style={{ fontFamily: FONT, fontSize: '0.95rem', color: textPrimary, marginBottom: 8 }}>
                  Correct answer: <strong>{questions[current].options[questions[current].correct]}</strong>
                </p>
              )}
              {feedback.explanation && (
                <p style={{ fontFamily: FONT, fontSize: '0.92rem', color: textPrimary, lineHeight: 1.6, margin: 0 }}>{feedback.explanation}</p>
              )}
            </div>

            {/* Follow-up question box */}
            <div style={{ background: dark ? '#1e0a2e' : 'white', border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.88rem', color: dark ? '#c77dff' : '#7b2d6e', marginBottom: 8 }}>Have a follow-up question?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={followUpQ}
                  onChange={e => setFollowUpQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFollowUp()}
                  placeholder="Ask anything about this question..."
                  style={{
                    flex: 1, border: `1.5px solid ${dark ? '#6d3b8a' : '#E5D8C8'}`, borderRadius: 8,
                    padding: '8px 12px', fontFamily: FONT, fontSize: '0.88rem',
                    background: dark ? '#0d0a12' : '#F8F4EE', color: textPrimary, outline: 'none',
                  }}
                />
                <button onClick={handleFollowUp} disabled={followUpLoading || !followUpQ.trim()} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {followUpLoading ? '...' : 'Ask'}
                </button>
              </div>
              {followUpAns && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: dark ? '#2a0f3e' : '#F8F4EE', borderRadius: 8 }}>
                  <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textPrimary, margin: 0, lineHeight: 1.6 }}>{followUpAns}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              style={{ width: '100%', padding: '14px', background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 12, fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
            >
              Next Question →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Lobby
  return (
    <div className="fade-in" style={{ color: textPrimary }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 600, fontFamily: FONT, marginBottom: 8, textAlign: 'center', color: dark ? '#c77dff' : '#4A3525' }}>Camellia Quiz Generator</h1>
      <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, textAlign: 'center', marginBottom: 28 }}>Missed questions automatically return in a different format for spaced repetition.</p>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <CSlider dark={dark} min={5} max={30} value={totalQuestions} onChange={setTotalQuestions} label="Total Questions" />

        <div style={{ background: dark ? '#160e24' : '#F8F4EE', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: `1px solid ${borderCol}` }}>
          <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: dark ? '#c77dff' : '#4A3525', marginBottom: 14 }}>Question Type Mix</p>
          <CSlider dark={dark} min={0} max={100} value={mcPct} onChange={v => { setMcPct(v); if (v + fitbPct > 100) setFitbPct(100 - v); }} label="Multiple Choice %" />
          <CSlider dark={dark} min={0} max={100} value={fitbPct} onChange={v => { setFitbPct(v); if (mcPct + v > 100) setMcPct(100 - v); }} label="Fill in the Blank %" />
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[{label: 'Multiple Choice', pct: mcPct, color: '#7b2d6e'}, {label: 'Fill in Blank', pct: fitbPct, color: '#E07B39'}, {label: 'Essay', pct: essayPct, color: '#4CAF50'}].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color }} />
                <span style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary }}>{t.label}: <strong style={{ color: t.color }}>{Math.round(totalQuestions * t.pct / 100)}</strong></span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, textAlign: 'center', marginTop: 6 }}>Essay = {essayPct}%</p>
        </div>

        {noMaterial && (
          <div style={{ background: '#FFF0E8', border: '1.5px solid #E07B39', borderRadius: 10, padding: '12px 18px', marginBottom: 16, fontFamily: FONT, fontSize: '0.9rem', color: '#8B3A00' }}>
            No material uploaded yet. Go to <strong>AI Study Planner</strong> and upload your notes first.
          </div>
        )}
        {genError && (
          <div style={{ background: '#FFF0F0', border: '1.5px solid #F44336', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontFamily: FONT, fontSize: '0.85rem', color: '#C62828' }}>{genError}</div>
        )}

        {genProgActive && (
          <div style={{ marginBottom: 20 }}>
            <AIProgressBar progress={genProgress} label="Generating…" />
          </div>
        )}

        {tourStep === 5 && <TourPointer anchorRef={startQuizBtnRef} step={5} text="Try taking a quiz on your material here!" placement="bottom" />}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
          <button ref={startQuizBtnRef} onClick={startQuiz} disabled={generating} style={{ background: dark ? '#3a1f5a' : '#3D2B1F', color: 'white', border: 'none', borderRadius: 12, padding: '16px 36px', fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
            {generating ? 'Generating…' : 'Start Quiz'}
          </button>
          <button onClick={generateFreshQuestions} disabled={generating} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 12, padding: '16px 28px', fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', cursor: generating ? 'not-allowed' : 'pointer' }}>
            {generating ? 'Generating…' : 'Regenerate Questions'}
          </button>
        </div>

        <div style={{ background: dark ? '#160e24' : '#FFF5E8', borderRadius: 12, padding: '20px 24px', border: `1px solid ${borderCol}` }}>
          <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '1rem', color: dark ? '#c77dff' : '#5A4A3A', marginBottom: 16 }}>Recent Quizzes ({recentQuizzes.length})</p>
          {recentQuizzes.length === 0 ? (
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, textAlign: 'center' }}>No quizzes taken yet, start one above!</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {recentQuizzes.slice(0, 8).map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div>
                    <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: dark ? '#e8d5ff' : '#4A3525', margin: 0 }}>{q.label}</p>
                    <p style={{ fontFamily: FONT, fontSize: '0.68rem', color: textSecondary, margin: 0 }}>{q.date}</p>
                  </div>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: 'white', background: '#7b2d6e', borderRadius: 12, padding: '2px 10px' }}>{q.score}/{q.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
