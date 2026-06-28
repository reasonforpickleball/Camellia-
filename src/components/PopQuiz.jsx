import React, { useState } from 'react';
import { CamelliaLogoSmall } from './CamelliaLogo';
import { incrementQuizzes } from '../lib/stats';

const ANS_COLORS = ['#C2185B', '#E8A598', '#E07B39', '#5C3D2E'];
const tk = (ns, key) => `camellia_${ns}_${key}`;

function getMaterialQuestions(ns) {
  try {
    const ai = JSON.parse(localStorage.getItem(tk(ns, 'ai_questions')) || '[]');
    if (ai.length > 0) return [...ai].sort(() => Math.random() - 0.5).slice(0, 9);
  } catch {}
  return [];
}

export default function PopQuiz({ ns = 'default', onComplete }) {
  const userGoal = localStorage.getItem('doomium_user_goal') || 'your goal';
  const [questions] = useState(() => getMaterialQuestions(ns));
  const [remaining, setRemaining] = useState(3);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [answerText, setAnswerText] = useState('');

  if (questions.length === 0) {
    onComplete();
    return null;
  }

  const currentQ = questions[qIdx % questions.length];

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = idx === currentQ.correct;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setAnswerText(currentQ.options[currentQ.correct]);
    if (!isCorrect) setRemaining(r => r + 1);
  };

  const handleFlashClick = () => {
    if (feedback === 'correct') {
      const newRemaining = remaining - 1;
      setRemaining(newRemaining);
      if (newRemaining <= 0) {
        incrementQuizzes();
        onComplete();
        return;
      }
    }
    setQIdx(i => i + 1);
    setSelected(null);
    setFeedback(null);
    setAnswerText('');
  };

  return (
    <div className="quiz-overlay">
      <div style={{ background: '#FDECC8', padding: '16px 24px', borderBottom: '1px solid #F5D88A' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <CamelliaLogoSmall />
          <p style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 700, fontSize: '0.88rem', textAlign: 'center', color: '#2D1B0E', maxWidth: 800, lineHeight: 1.5 }}>
            POP QUIZ — You left full screen! Answer correctly to return. Wrong answers add more questions.<br />
            <span style={{ fontStyle: 'italic' }}>"{userGoal}"</span> — You
          </p>
          <div style={{ background: '#E07B39', borderRadius: 24, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.3)', borderRadius: 4 }} />
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#E07B39', flexShrink: 0 }}>
              {remaining}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: '#FDF0F0', display: 'flex', flexDirection: 'column' }}>
        {feedback ? (
          <div className={feedback === 'correct' ? 'correct-flash' : 'incorrect-flash'} onClick={handleFlashClick}>
            <p style={{ fontSize: '4rem', fontWeight: 900, color: 'white', fontFamily: 'Arial, Helvetica, sans-serif', textShadow: '0 4px 12px rgba(0,0,0,0.15)', marginBottom: 16 }}>
              {feedback === 'correct' ? 'CORRECT' : 'INCORRECT'}
            </p>
            {feedback === 'incorrect' && (
              <p style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '1.3rem', color: 'white', fontWeight: 600, marginBottom: 12 }}>Correct answer: {answerText}</p>
            )}
            <p style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Click Anywhere to Continue</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '32px 48px', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 700, fontSize: '1.8rem', color: '#2D1B0E' }}>{currentQ?.q}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1 }}>
              {currentQ?.options.map((opt, i) => (
                <button key={i} className="ans-btn" style={{ background: ANS_COLORS[i], borderRadius: 0, fontSize: '1.3rem', minHeight: 140 }} onClick={() => handleAnswer(i)}>{opt}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
