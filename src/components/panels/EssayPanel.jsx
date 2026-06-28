import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAsk, isAIConfigured } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';
import ReactMarkdown from 'react-markdown';

const tk = (ns, key) => `camellia_${ns}_${key}`;
const FONT = 'Arial, Helvetica, sans-serif';

export default function EssayPanel({ ns = 'default' }) {
  const { dark } = useDarkMode();
  const textPrimary = dark ? '#e8d5ff' : '#4A3525';
  const cardBg = dark ? '#160e24' : 'white';
  const borderCol = dark ? '#3a1f5a' : '#E5D8C8';
  const [essay, setEssay] = useState(() => localStorage.getItem(tk(ns, 'essay')) || '');
  const [feedback, setFeedback] = useState(() => {
    try { return JSON.parse(localStorage.getItem(tk(ns, 'essay_feedback')) || 'null'); } catch { return null; }
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const getRawMaterial = () => localStorage.getItem(tk(ns, 'raw_material')) || '';

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    localStorage.setItem(tk(ns, 'essay'), essay);
  }, [essay, ns]);

  const analyzeEssay = useCallback(async (text) => {
    if (!isAIConfigured()) {
      setError('No AI key configured — go to Settings (⚙️).');
      return;
    }
    const rawMaterial = getRawMaterial();
    setAnalyzing(true);
    setError('');
    try {
      const materialCtx = rawMaterial.length > 100
        ? `\n\nThe student's study material for reference:\n${rawMaterial.slice(0, 6000)}`
        : '';

      const raw = await aiAsk(
        `You are an expert writing coach, academic tutor, and fact-checker. Analyze student essays with the depth of a top university professor. IMPORTANT: You MUST fact-check all claims in the essay. If the essay contains fabricated information, false facts, or made-up events, you MUST reflect this heavily in the score and clearly flag it. A factually incorrect essay should never receive above a C grade. Be honest and direct. Respond with valid JSON only.`,
        `Analyze this student essay. Fact-check every claim against real world knowledge.${materialCtx}

ESSAY:
${text}

Check: Are the facts real? Are the events real? Is any part fabricated or false? If so, penalize heavily.

Return ONLY a valid JSON object:
{"overallScore":75,"grade":"B","summary":"2-3 sentence assessment including fact-check verdict.","factCheckResult":"PASS or FAIL with explanation of what is true/false","scores":{"thesis":{"score":15,"comment":"feedback"},"evidence":{"score":14,"comment":"feedback"},"structure":{"score":15,"comment":"feedback"},"clarity":{"score":16,"comment":"feedback"},"grammar":{"score":15,"comment":"feedback"},"factAccuracy":{"score":20,"comment":"fact-check detail"}},"strengths":["strength 1","strength 2"],"improvements":["improvement 1","improvement 2","improvement 3"],"suggestions":"Detailed suggestions here.","wordCount":${wordCount}}`,
        { maxTokens: 2000 }
      );

      // Robust JSON extraction
      let result;
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      // Find the outermost JSON object
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) throw new Error('AI did not return valid JSON. Try again.');
      const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        result = JSON.parse(jsonStr);
      } catch {
        throw new Error('AI response could not be parsed. Try again or use a different model in Settings.');
      }
      setFeedback(result);
      localStorage.setItem(tk(ns, 'essay_feedback'), JSON.stringify(result));
    } catch (e) {
      setError('AI analysis error: ' + e.message);
    }
    setAnalyzing(false);
  }, [ns]);

  const handleAnalyze = () => {
    if (essay.trim().length < 50) {
      setError('Write at least 50 words before analyzing.');
      return;
    }
    analyzeEssay(essay);
  };

  const scoreColor = (s, max = 20) => {
    const pct = s / max;
    if (pct >= 0.8) return '#4CAF50';
    if (pct >= 0.6) return '#E07B39';
    return '#F44336';
  };

  const gradeColor = (g) => {
    if (!g) return '#9A8A7A';
    if (g.startsWith('A')) return '#4CAF50';
    if (g.startsWith('B')) return '#7b2d6e';
    if (g.startsWith('C')) return '#E07B39';
    return '#F44336';
  };

  return (
    <div className="fade-in" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 100px)', minHeight: 600 }}>
      {/* Left: Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.5rem', color: dark ? '#c77dff' : '#4A3525', margin: 0 }}>Essay</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {analyzing && <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: '#9A8A7A' }}>AI is analyzing…</span>}
            <button
              onClick={handleAnalyze}
              disabled={analyzing || essay.trim().length < 50}
              style={{ background: analyzing ? '#E5D8C8' : '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: analyzing ? 'not-allowed' : 'pointer' }}
            >{analyzing ? 'Analyzing...' : 'Analyze Essay'}</button>
          </div>
        </div>

        {!isAIConfigured() && (
          <div style={{ background: '#FFF8F0', border: '1.5px solid #E07B39', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontFamily: FONT, fontSize: '0.82rem', color: '#8B3A00' }}>
            No AI key — go to Settings to enable AI-powered essay analysis.
          </div>
        )}

        {error && (
          <div style={{ background: '#FFF0F0', border: '1.5px solid #F44336', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontFamily: FONT, fontSize: '0.82rem', color: '#C62828' }}>{error}</div>
        )}

        <textarea
          value={essay}
          onChange={e => setEssay(e.target.value)}
          placeholder="Start writing your essay here… Click 'Analyze Essay' when ready for detailed AI feedback — like having a professor read your work."
          style={{ flex: 1, border: `2px solid ${borderCol}`, borderRadius: 12, padding: '24px 28px', fontFamily: FONT, fontSize: '1rem', lineHeight: 1.85, color: dark ? '#e8d5ff' : '#2D1B0E', resize: 'none', outline: 'none', background: dark ? '#1e0a2e' : 'white' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
          <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: '#9A8A7A' }}>{wordCount} words</span>
          {feedback && (
            <>
              <div style={{ flex: 1, height: 6, background: '#F0E8E0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: scoreColor(feedback.overallScore, 100), width: `${feedback.overallScore}%`, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: gradeColor(feedback.grade), minWidth: 90 }}>
                {feedback.grade} · {feedback.overallScore}/100
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: AI Feedback Panel */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, overflowY: 'auto' }}>
        {!feedback && !analyzing && (
          <div style={{ background: '#F8F4EE', border: '1.5px solid #E5D8C8', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: '1.5rem', marginBottom: 8, display: 'none' }}></p>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: '#4A3525', marginBottom: 8 }}>AI Essay Analysis</p>
            <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#9A8A7A', lineHeight: 1.6 }}>
              Write your essay and click <strong>"Analyze Essay"</strong> for in-depth feedback: thesis strength, evidence quality, structure, clarity, and grammar — with specific suggestions.
            </p>
          </div>
        )}

        {analyzing && (
          <div style={{ background: '#F8F4EE', border: '1.5px solid #7b2d6e', borderRadius: 12, padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8, display: 'none' }}></div>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: '#7b2d6e' }}>AI is reading your essay…</p>
            <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: '#9A8A7A', lineHeight: 1.5 }}>Analyzing thesis, evidence, structure, and providing professor-level feedback</p>
          </div>
        )}

        {feedback && (
          <>
            {/* Overall */}
            <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Overall</p>
                <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.4rem', color: gradeColor(feedback.grade) }}>{feedback.grade}</span>
              </div>
              <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: '#5A4A3A', lineHeight: 1.6, margin: 0 }}>{feedback.summary}</p>
            </div>

            {/* Fact Check */}
            {feedback.factCheckResult && (
              <div style={{ background: feedback.factCheckResult.startsWith('FAIL') ? '#FFF0F0' : '#F0FCF4', border: `1.5px solid ${feedback.factCheckResult.startsWith('FAIL') ? '#F44336' : '#4CAF50'}`, borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: feedback.factCheckResult.startsWith('FAIL') ? '#C62828' : '#2E7D32', marginBottom: 6 }}>Fact Check: {feedback.factCheckResult.startsWith('FAIL') ? 'FAILED' : 'PASSED'}</p>
                <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: feedback.factCheckResult.startsWith('FAIL') ? '#C62828' : '#2E7D32', margin: 0, lineHeight: 1.5 }}>{feedback.factCheckResult}</p>
              </div>
            )}

            {/* Scores */}
            {feedback.scores && (
              <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '16px 18px' }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, marginBottom: 12 }}>Score Breakdown</p>
                {Object.entries(feedback.scores).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: '#7A6A5A', textTransform: 'capitalize' }}>{k}</span>
                      <span style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: scoreColor(v.score) }}>{v.score}/20</span>
                    </div>
                    <div style={{ height: 4, background: '#F0E8E0', borderRadius: 2, marginBottom: 4 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: scoreColor(v.score), width: `${(v.score / 20) * 100}%` }} />
                    </div>
                    <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: '#9A8A7A', margin: 0, lineHeight: 1.4 }}>{v.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths */}
            {feedback.strengths?.length > 0 && (
              <div style={{ background: '#F0FCF4', border: '1.5px solid #4CAF50', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: '#2E7D32', marginBottom: 8 }}>Strengths</p>
                {feedback.strengths.map((s, i) => (
                  <p key={i} style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#2E7D32', margin: '0 0 4px', lineHeight: 1.5 }}>• {s}</p>
                ))}
              </div>
            )}

            {/* Improvements */}
            {feedback.improvements?.length > 0 && (
              <div style={{ background: '#FFF8F0', border: '1.5px solid #E07B39', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: '#8B3A00', marginBottom: 8 }}>To Improve</p>
                {feedback.improvements.map((s, i) => (
                  <p key={i} style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#8B3A00', margin: '0 0 4px', lineHeight: 1.5 }}>• {s}</p>
                ))}
              </div>
            )}

            {/* Detailed suggestions */}
            {feedback.suggestions && (
              <div style={{ background: cardBg, border: '1.5px solid #7b2d6e', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: '#c77dff', marginBottom: 8 }}>Detailed Suggestions</p>
                <div style={{ fontFamily: FONT, fontSize: '0.82rem', color: dark ? '#c4a8e0' : '#4A3525', lineHeight: 1.65 }}>
                  <ReactMarkdown>{feedback.suggestions}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
