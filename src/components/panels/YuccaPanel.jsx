import React, { useState, useEffect, useRef } from 'react';
import { aiAsk, isAIConfigured, parseAIJson, getTaskModel } from '../../lib/aiClient';

const ANS_COLORS = ['#C2185B', '#E8A598', '#E07B39', '#5C3D2E'];
const tk = (ns, key) => `camellia_${ns}_${key}`;

// Modes: goalSec = total game time, startSec = seconds you start each question with, wrongPenalty = secs lost per wrong, correctBonus = secs gained per correct
const MODES = {
  blitz:  { label: 'BLITZ',  color: '#C2185B', goalSec: 120, startSec: 30, wrongPenalty: 10, correctBonus: 5,
    desc: '2 minutes on the clock. Each question gives you 30s. Wrong = -10s next question. Correct = +5s next question.' },
  sprint: { label: 'SPRINT', color: '#2196F3', goalSec: 60,  startSec: 15, wrongPenalty: 5,  correctBonus: 5,
    desc: '1 minute on the clock. Each question gives you 15s. Wrong = -5s next question. Correct = +5s next question.' },
  mile:   { label: 'MILE',   color: '#7B5E8B', goalSec: null, startSec: 15, wrongPenalty: 10, correctBonus: 5,
    desc: 'Set your mile time as the game clock. Each question gives you 15s. Wrong = -10s next question. Correct = +5s next question.' },
};

const EMPTY_STATS = { blitz: { played: 0, trained: 0, mastery: 0 }, sprint: { played: 0, trained: 0, mastery: 0 }, mile: { played: 0, trained: 0, mastery: 0 } };

function loadYuccaStats(ns) {
  try { return JSON.parse(localStorage.getItem(tk(ns, 'yucca_stats')) || 'null') || EMPTY_STATS; }
  catch { return EMPTY_STATS; }
}
function saveYuccaStats(ns, stats) { localStorage.setItem(tk(ns, 'yucca_stats'), JSON.stringify(stats)); }

function getMaterialQuestions(ns) {
  try {
    const ai = JSON.parse(localStorage.getItem(tk(ns, 'ai_questions')) || '[]');
    if (Array.isArray(ai) && ai.length >= 3) return [...ai].sort(() => Math.random() - 0.5);
  } catch {}
  return [];
}
function getMaterialLabel(ns) {
  return localStorage.getItem(tk(ns, 'planner_filename'))?.replace(/\.[^.]+$/, '') || 'Your Study Material';
}
function hasMaterial(ns) {
  return !!(localStorage.getItem(tk(ns, 'raw_material')) || localStorage.getItem(tk(ns, 'planner_filename')));
}
function shuffleOptions(q) {
  const indices = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return { ...q, options: indices.map(i => q.options[i]), correct: indices.indexOf(q.correct) };
}

const FONT = 'Arial, Helvetica, sans-serif';

export default function YuccaPanel({ ns = 'default' }) {
  const [materialLoaded, setMaterialLoaded] = useState(() => hasMaterial(ns));
  const [activeGame, setActiveGame] = useState(null);
  const [mileModal, setMileModal] = useState(false);
  const [mileTime, setMileTime] = useState('');
  const [rulesModal, setRulesModal] = useState(false);
  const [stats, setStats] = useState(() => loadYuccaStats(ns));
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const materialLabel = getMaterialLabel(ns);

  useEffect(() => {
    setMaterialLoaded(hasMaterial(ns));
    setStats(loadYuccaStats(ns));
  }, [ns]);

  // Game state
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [perQSecs, setPerQSecs] = useState(30); // current question's time limit
  const [perQLeft, setPerQLeft] = useState(30); // countdown for current question
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [gameOver, setGameOver] = useState(null); // 'won' | 'lost_time'

  const perQTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const activeGameRef = useRef(null);
  const feedbackRef = useRef(null);
  const gameOverRef = useRef(null);
  const perQLeftRef = useRef(30);
  const perQSecsRef = useRef(30);

  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { activeGameRef.current = activeGame; }, [activeGame]);
  useEffect(() => { perQLeftRef.current = perQLeft; }, [perQLeft]);
  useEffect(() => { perQSecsRef.current = perQSecs; }, [perQSecs]);

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const fmtSecs = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

  const stopTimers = () => { clearInterval(perQTimerRef.current); };

  const startPerQCountdown = (secs) => {
    clearInterval(perQTimerRef.current);
    perQLeftRef.current = secs;
    setPerQLeft(secs);
    perQTimerRef.current = setInterval(() => {
      if (feedbackRef.current !== null || gameOverRef.current !== null) return;
      const next = perQLeftRef.current - 1;
      perQLeftRef.current = next;
      setPerQLeft(next);
      if (next <= 0) {
        clearInterval(perQTimerRef.current);
        gameOverRef.current = 'lost_time';
        setGameOver('lost_time');
      }
    }, 1000);
  };

  const generateQuestions = async () => {
    const rawMaterial = localStorage.getItem(tk(ns, 'raw_material')) || '';
    if (!rawMaterial || rawMaterial.length < 50) { setGenError('No study material. Go to AI Study Planner and upload your notes first.'); return; }
    if (!isAIConfigured()) { setGenError('No AI key configured. Go to Settings.'); return; }
    setGenerating(true); setGenError('');
    try {
      const raw = await aiAsk(
        'You are an expert quiz creator. Generate high-quality multiple choice questions from study material.',
        `Generate 20 multiple choice questions.\n\nMATERIAL:\n${rawMaterial.slice(0, 12000)}\n\nReturn ONLY a JSON array: [{"q":"question","options":["A","B","C","D"],"correct":0}]`,
        { maxTokens: 3000, model: getTaskModel('yucca_quiz') }
      );
      const parsed = parseAIJson(raw);
      const valid = Array.isArray(parsed) ? parsed.filter(q => q.q && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number') : [];
      if (valid.length > 0) { localStorage.setItem(tk(ns, 'ai_questions'), JSON.stringify(valid)); setGenError(''); }
      else setGenError('AI returned no valid questions. Try again.');
    } catch (e) { setGenError('AI error: ' + e.message); }
    setGenerating(false);
  };

  const startGame = (mode, mileSecs = null) => {
    stopTimers();
    let pool = getMaterialQuestions(ns);
    if (pool.length === 0) { setGenError('No questions yet. Click "Generate Questions" below to create some first.'); return; }
    const m = MODES[mode];
    const initialPerQ = m.startSec;
    const shuffled = pool.map(shuffleOptions);

    setQuestions(shuffled);
    setQIdx(0);
    setSelected(null);
    feedbackRef.current = null; setFeedback(null);
    gameOverRef.current = null; setGameOver(null);
    activeGameRef.current = mode; setActiveGame(mode);
    perQSecsRef.current = initialPerQ; setPerQSecs(initialPerQ);
    startTimeRef.current = Date.now();
    startPerQCountdown(initialPerQ);
  };

  const handleAnswer = (idx) => {
    if (selected !== null || gameOver !== null) return;
    clearInterval(perQTimerRef.current);
    setSelected(idx);
    const isCorrect = idx === questions[qIdx].correct;
    const m = MODES[activeGameRef.current];
    feedbackRef.current = isCorrect ? 'correct' : 'incorrect';
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // Adjust next question's time
    let nextSecs = isCorrect
      ? Math.min(perQSecsRef.current + m.correctBonus, 99)
      : Math.max(perQSecsRef.current - m.wrongPenalty, 1);
    perQSecsRef.current = nextSecs;
    setPerQSecs(nextSecs);
  };

  const handleNext = () => {
    if (gameOver !== null) { exitGame(); return; }
    const nextIdx = (qIdx + 1) % questions.length;
    setQIdx(nextIdx);
    setSelected(null);
    feedbackRef.current = null; setFeedback(null);
    // Start countdown with the updated perQSecs
    startPerQCountdown(perQSecsRef.current);
  };

  const exitGame = () => {
    stopTimers();
    const elapsed = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
    const mode = activeGameRef.current || 'blitz';
    const newStats = {
      ...stats,
      [mode]: { played: stats[mode].played + 1, trained: stats[mode].trained + elapsed, mastery: Math.min(stats[mode].mastery + 1, 10) },
    };
    setStats(newStats);
    saveYuccaStats(ns, newStats);
    activeGameRef.current = null; setActiveGame(null);
    gameOverRef.current = null; setGameOver(null);
    feedbackRef.current = null; setFeedback(null);
    setSelected(null);
  };

  useEffect(() => () => stopTimers(), []);

  // ACTIVE GAME SCREEN
  if (activeGame) {
    const q = questions[qIdx];

    if (gameOver === 'won') return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'linear-gradient(135deg, #5DD62C 0%, #A8E063 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={exitGame}>
        <p style={{ fontFamily: FONT, fontSize: '3.5rem', fontWeight: 900, color: 'white', marginBottom: 16 }}>You Won!</p>
        <p style={{ fontFamily: FONT, fontSize: '1.3rem', color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>You answered all questions in time!</p>
        <p style={{ fontFamily: FONT, fontSize: '1rem', color: 'rgba(255,255,255,0.75)' }}>Click anywhere to return</p>
      </div>
    );

    if (gameOver === 'lost_time') return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'linear-gradient(135deg, #FF3D3D 0%, #FF9800 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={exitGame}>
        <p style={{ fontFamily: FONT, fontSize: '3.5rem', fontWeight: 900, color: 'white', marginBottom: 16 }}>Time Ran Out!</p>
        <p style={{ fontFamily: FONT, fontSize: '1.3rem', color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>You had {fmtTime(perQLeft)} left for that question.</p>
        <p style={{ fontFamily: FONT, fontSize: '1rem', color: 'rgba(255,255,255,0.75)' }}>Wrong answers reduce your time for the next question. Right answers give it back!</p>
        <p style={{ fontFamily: FONT, fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>Click anywhere to return</p>
      </div>
    );

    const m = MODES[activeGame];
    const timePct = Math.max(0, (perQLeft / (perQSecsRef.current || m.startSec)) * 100);

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0a12 100%)', display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 32px', textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Q{qIdx + 1} of {questions.length}</p>
            <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.6rem', color: 'white' }}>{q?.q}</h2>
          </div>
          {feedback !== null ? (
            <div style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: feedback === 'correct' ? 'rgba(93,214,44,0.8)' : 'rgba(255,61,61,0.8)', margin: '0 32px 32px', borderRadius: 20, padding: 40 }} onClick={handleNext}>
              <p style={{ fontSize: '2.5rem', fontWeight: 900, color: feedback === 'correct' ? '#2D8C00' : '#CC0000', fontFamily: FONT, marginBottom: 12 }}>{feedback === 'correct' ? 'Correct!' : 'Incorrect'}</p>
              {feedback === 'incorrect' && q && <p style={{ fontFamily: FONT, fontSize: '1rem', color: 'white', marginBottom: 8 }}>Correct: <strong>{q.options[q.correct]}</strong></p>}
              <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>
                {feedback === 'correct' ? `+${m.correctBonus}s next question` : `-${m.wrongPenalty}s next question`} (next: {perQSecs}s)
              </p>
              <p style={{ fontFamily: FONT, fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>Click to continue</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1 }}>
              {q?.options.map((opt, i) => (
                <button key={i} className="ans-btn" style={{ background: ANS_COLORS[i], borderRadius: 0, fontSize: '1.2rem' }} onClick={() => handleAnswer(i)}>{opt}</button>
              ))}
            </div>
          )}
        </div>

        {/* Timer sidebar */}
        <div style={{ width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: 'rgba(0,0,0,0.08)' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.8rem', color: m.color, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{m.label} MODE</p>
          <div style={{ width: 140, height: 140, borderRadius: '50%', background: perQLeft <= 5 ? '#C62828' : '#7b2d6e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s', position: 'relative' }}>
            <svg width="140" height="140" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - timePct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '2.2rem', color: 'white', margin: 0, zIndex: 1 }}>{fmtTime(perQLeft)}</p>
            <p style={{ fontFamily: FONT, fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', margin: 0, zIndex: 1 }}>this question</p>
          </div>
          <div style={{ background: 'rgba(123,45,110,0.15)', border: '1px solid rgba(123,45,110,0.3)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: 'white', margin: 0, lineHeight: 1.5 }}>
              Correct: <strong style={{ color: '#4CAF50' }}>+{m.correctBonus}s</strong><br />
              Wrong: <strong style={{ color: '#F44336' }}>-{m.wrongPenalty}s</strong>
            </p>
          </div>
          <button onClick={exitGame} style={{ background: 'none', border: 'none', color: '#ff8080', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', fontSize: '0.9rem' }}>exit</button>
        </div>
      </div>
    );
  }

  // LOBBY
  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '2.2rem', color: '#7b2d6e', marginBottom: 4 }}>Bored? Try <strong>Yucca</strong></h1>
        <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: '#9A8A7A' }}>Questions from: <strong style={{ color: '#7b2d6e' }}>{materialLabel}</strong></p>
        <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: '#9A8A7A', marginTop: 6 }}>Each question has a timer. Wrong answers reduce time on the next question. Correct answers add time back!</p>
      </div>

      {genError && <div style={{ background: '#FFF0F0', border: '1.5px solid #F44336', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontFamily: FONT, fontSize: '0.85rem', color: '#C62828', textAlign: 'center' }}>{genError}</div>}

      {!materialLoaded && (
        <div style={{ background: '#FFF8F0', border: '1.5px solid #E07B39', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontFamily: FONT, fontSize: '0.9rem', color: '#8B3A00', textAlign: 'center' }}>
          No material loaded. Go to <strong>AI Study Planner</strong> and upload your notes first.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button onClick={generateQuestions} disabled={generating} style={{ background: generating ? '#E5D8C8' : '#1a1a1a', color: generating ? '#9A8A7A' : 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: generating ? 'not-allowed' : 'pointer' }}>
          {generating ? 'Generating questions...' : 'Generate Questions'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {Object.entries(MODES).map(([key, m]) => {
          const s = stats[key];
          return (
            <div key={key} className="game-card">
              <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.3rem', color: m.color, letterSpacing: '0.08em', marginBottom: 6 }}>{m.label}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: '#9A8A7A', marginBottom: 16, flex: 1, lineHeight: 1.5 }}>{m.desc}</p>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: '0.75rem', fontFamily: FONT, color: '#9A8A7A' }}>
                <div><p style={{ fontWeight: 700, color: '#7b2d6e', margin: 0 }}>{s.played}</p><p style={{ margin: 0 }}>Played</p></div>
                <div><p style={{ fontWeight: 700, color: m.color, margin: 0 }}>{fmtSecs(s.trained)}</p><p style={{ margin: 0 }}>Trained</p></div>
                <div><p style={{ fontWeight: 700, color: m.color, margin: 0 }}>{s.mastery}/10</p><p style={{ margin: 0 }}>Mastery</p></div>
              </div>
              <button onClick={() => { if (key === 'mile') setMileModal(true); else setRulesModal(key); }} style={{ width: '100%', padding: '12px', background: '#7b2d6e', border: 'none', borderRadius: 8, color: 'white', fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', cursor: 'pointer' }}>PLAY</button>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#7b2d6e', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
        <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', margin: 0 }}>Questions from your uploaded study material, runs entirely on your device</p>
      </div>

      {rulesModal && (
        <div className="modal-overlay" onClick={() => setRulesModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.3rem', textAlign: 'center', marginBottom: 24 }}>How Yucca Works</h3>
            <div style={{ background: 'rgba(123,45,110,0.08)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: '#7b2d6e', margin: 0, lineHeight: 1.7 }}>
                Each question has its own countdown timer. The timer starts at the mode's default seconds.
                <br /><br />
                <strong>Wrong answer:</strong> your next question's timer is reduced.<br />
                <strong>Correct answer:</strong> your next question's timer increases.<br /><br />
                If you run out of time on a question, the game ends. Keep answering correctly to stay alive!
              </p>
            </div>
            {Object.entries(MODES).map(([k, m]) => (
              <div key={k} style={{ marginBottom: 14, padding: '10px 14px', background: 'white', border: `2px solid ${m.color}20`, borderRadius: 8 }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.9rem', color: m.color, margin: '0 0 4px' }}>{m.label}</p>
                <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#7A6A5A', margin: 0 }}>{m.desc}</p>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button onClick={() => { startGame(rulesModal); setRulesModal(false); }} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 20, padding: '12px 36px', fontFamily: FONT, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Let's Play!</button>
            </div>
          </div>
        </div>
      )}

      {mileModal && (
        <div className="modal-overlay" onClick={() => setMileModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', marginBottom: 20 }}>Set your mile time</h3>
            <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: '#9A8A7A', textAlign: 'center', marginBottom: 16 }}>Your mile run time becomes the game clock. Each question starts with 15s, adjusted per answer.</p>
            <input className="orange-input" style={{ border: '2px solid #7b2d6e', borderRadius: 8, fontFamily: FONT }} placeholder="(ex. 5:40)" value={mileTime} onChange={e => setMileTime(e.target.value)} autoFocus />
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={() => {
                const parts = mileTime.split(':');
                const secs = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : parseInt(mileTime) * 60;
                startGame('mile', secs || 340);
                setMileModal(false);
              }} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 20, padding: '12px 36px', fontFamily: FONT, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Play</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
