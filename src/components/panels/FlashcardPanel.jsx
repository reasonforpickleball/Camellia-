import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { aiAsk, isAIConfigured, parseAIJson } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';
import AIProgressBar, { useAIProgress } from '../AIProgressBar';

const tk = (ns, key) => `camellia_${ns}_${key}`;
const FONT = "'Roboto', Arial, sans-serif";
const MONO = '"Courier New", Courier, monospace';

const PLACEHOLDER_CARDS = [
  { term: '📂 Upload material first', definition: 'Go to the AI Study Planner tab, upload your notes or PDF — Camellia will generate AI-powered flashcards directly from your material.', notes: '' }
];

function loadDeck(ns) {
  try {
    const saved = JSON.parse(localStorage.getItem(tk(ns, 'flashcard_deck')) || 'null');
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  return PLACEHOLDER_CARDS.map(c => ({ ...c }));
}

function saveDeck(ns, deck) {
  localStorage.setItem(tk(ns, 'flashcard_deck'), JSON.stringify(deck));
}

export default function FlashcardPanel({ ns = 'default' }) {
  const isMobile = useIsMobile();
  const { dark } = useDarkMode();
  const { progress, active: progActive, startProgress, finishProgress } = useAIProgress();
  const [deck, setDeck] = useState(() => loadDeck(ns));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');

  useEffect(() => {
    setDeck(loadDeck(ns));
    setIdx(0);
    setFlipped(false);
  }, [ns]);

  useEffect(() => { setFlipped(false); }, [idx]);

  const card = deck[idx] || deck[0];
  const total = deck.length;

  const handleNoteChange = (e) => {
    const updated = deck.map((c, i) => i === idx ? { ...c, notes: e.target.value } : c);
    setDeck(updated);
    saveDeck(ns, updated);
  };

  const goNext = () => setIdx(i => Math.min(i + 1, total - 1));
  const goPrev = () => setIdx(i => Math.max(i - 1, 0));

  const markHard = () => {
    const updated = [...deck];
    const [removed] = updated.splice(idx, 1);
    updated.splice(Math.min(idx + 2, updated.length), 0, removed);
    setDeck(updated); saveDeck(ns, updated); setFlipped(false);
  };
  const markGood = () => goNext();
  const markEasy = () => {
    const updated = [...deck];
    const [removed] = updated.splice(idx, 1);
    updated.push(removed);
    setDeck(updated); saveDeck(ns, updated);
    setIdx(i => Math.min(i, updated.length - 1));
    setFlipped(false);
  };

  const regenerateWithAI = async () => {
    const rawMaterial = localStorage.getItem(tk(ns, 'raw_material')) || '';
    if (!rawMaterial || rawMaterial.length < 50) { setRegenError('Upload material in AI Study Planner first.'); return; }
    if (!isAIConfigured()) { setRegenError('No AI key configured, go to Settings.'); return; }
    setRegenerating(true); setRegenError('');
    startProgress();
    try {
      const raw = await aiAsk(
        `You are an expert flashcard creator. Generate high-quality flashcards from study material. Focus on key concepts, definitions, processes, formulas, and important facts. NEVER include file metadata, dates, author names, or formatting artifacts. Each card must genuinely test understanding of the subject matter.`,
        `Generate 25 flashcards from this study material.\n\nMATERIAL:\n${rawMaterial.slice(0, 12000)}\n\nReturn ONLY a JSON array: [{"term": "...", "definition": "detailed explanation..."}, ...]\n\nMake each definition thorough and educational, 1-3 sentences.`,
        { maxTokens: 3500 }
      );
      const cards = parseAIJson(raw);
      const valid = Array.isArray(cards)
        ? cards.filter(c => c.term && c.definition && c.term.length > 2 && !c.term.match(/^\d{4}/) && c.definition.length > 10).map(c => ({ ...c, notes: '' }))
        : [];
      if (valid.length > 0) { finishProgress(); setDeck(valid); saveDeck(ns, valid); setIdx(0); setFlipped(false); }
      else { finishProgress(); setRegenError('Something went wrong. Please try again.'); }
    } catch (e) { finishProgress(); setRegenError('Something went wrong. Please try again.'); }
    setRegenerating(false);
  };

  const isPlaceholder = deck.length === 1 && deck[0].term === PLACEHOLDER_CARDS[0].term;

  // Dark mode styles
  const textPrimary = dark ? '#e8d5ff' : '#2D1B0E';
  const textSecondary = dark ? '#a080c0' : '#9A8A7A';
  const cardBg = dark ? 'rgba(22,14,36,0.85)' : 'rgba(255,255,255,0.95)';
  const cardBorder = dark ? '2.5px solid #6d3b8a' : '2.5px solid #7b2d6e';
  const cardBackBg = dark ? 'rgba(30,10,50,0.9)' : '#F8F4EE';
  const cardBackBorder = dark ? '2.5px solid #9a5ab5' : '2.5px solid #4A3525';
  const noteBg = dark ? 'rgba(22,14,36,0.7)' : 'white';
  const noteBorder = dark ? '2px solid #6d3b8a' : '2px solid #4A3525';
  const navBtnBg = dark ? '#5a1f7a' : '#7b2d6e';
  const navBtnDisBg = dark ? 'rgba(40,20,60,0.5)' : '#F0E8E0';
  const glassStyle = { backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: dark ? '#c77dff' : '#4A3525', fontFamily: FONT, margin: 0 }}>Flashcard Deck</h1>
        {!isPlaceholder && (
          <button
            onClick={regenerateWithAI}
            disabled={regenerating}
            style={{ background: regenerating ? (dark ? 'rgba(58,31,90,0.5)' : '#E5D8C8') : '#7b2d6e', color: regenerating ? textSecondary : 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', cursor: regenerating ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >{regenerating ? 'Generating…' : 'Regenerate with AI'}</button>
        )}
      </div>
      {progActive && <div style={{ marginBottom: 12 }}><AIProgressBar progress={progress} label={null} /></div>}
      <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, textAlign: 'center', marginBottom: 20 }}>
        {isPlaceholder ? 'Upload material in AI Study Planner to generate flashcards' : `${total} AI-generated card${total !== 1 ? 's' : ''} — click card to flip`}
      </p>

      {regenError && (
        <div style={{ background: '#FFF0F0', border: '1.5px solid #F44336', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontFamily: FONT, fontSize: '0.85rem', color: '#C62828', textAlign: 'center' }}>{regenError}</div>
      )}

      {isPlaceholder ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontFamily: FONT, fontSize: '1rem', color: textSecondary, marginBottom: 20 }}>Upload your study material to generate AI-powered flashcards focused on key concepts.</p>
          <button
            onClick={regenerateWithAI}
            disabled={regenerating || !localStorage.getItem(tk(ns, 'raw_material'))}
            style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontFamily: FONT, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >{regenerating ? 'Generating...' : 'Generate AI Flashcards'}</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div onClick={() => setFlipped(f => !f)} style={{ width: isMobile ? '90vw' : 520, maxWidth: 520, height: isMobile ? '54vw' : 300, maxHeight: 300, cursor: 'pointer', perspective: '1000px', position: 'relative' }}>
              <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.5s ease' }}>
                {/* Front */}
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: cardBg, border: cardBorder, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(123,45,110,0.12)', ...glassStyle }}>
                  <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Term</span>
                  <p style={{ fontFamily: MONO, fontWeight: 700, fontSize: '1.35rem', color: textPrimary, textAlign: 'center', lineHeight: 1.4, margin: 0 }}>{card.term}</p>
                  <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, marginTop: 20 }}>Click to reveal definition</span>
                </div>
                {/* Back */}
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: cardBackBg, border: cardBackBorder, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(74,53,37,0.12)', ...glassStyle }}>
                  <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Definition</span>
                  <p style={{ fontFamily: FONT, fontSize: '1rem', color: textPrimary, textAlign: 'center', lineHeight: 1.75, margin: 0 }}>{card.definition}</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Hard', color: '#CC0000', onClick: markHard },
              { label: 'Good', color: '#D4A017', onClick: markGood },
              { label: 'Easy', color: '#7b2d6e', onClick: markEasy },
            ].map(btn => (
              <button key={btn.label} onClick={btn.onClick} style={{ padding: '10px 28px', borderRadius: 24, border: `2px solid ${btn.color}`, background: dark ? 'rgba(22,14,36,0.6)' : 'white', color: btn.color, fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.18s', ...glassStyle }}>{btn.label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 32 }}>
            <button onClick={goPrev} disabled={idx === 0} style={{ width: 44, height: 44, borderRadius: '50%', background: idx === 0 ? navBtnDisBg : navBtnBg, border: 'none', color: idx === 0 ? textSecondary : 'white', fontSize: '1.1rem', cursor: idx === 0 ? 'default' : 'pointer', transition: 'all 0.18s' }}>←</button>
            <span style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary, fontWeight: 600 }}>Card {idx + 1} of {total}</span>
            <button onClick={goNext} disabled={idx === total - 1} style={{ width: 44, height: 44, borderRadius: '50%', background: idx === total - 1 ? navBtnDisBg : navBtnBg, border: 'none', color: idx === total - 1 ? textSecondary : 'white', fontSize: '1.1rem', cursor: idx === total - 1 ? 'default' : 'pointer', transition: 'all 0.18s' }}>→</button>
          </div>

          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', color: dark ? '#c77dff' : '#4A3525', marginBottom: 8 }}>Notes for "{card.term}"</p>
            <textarea
              value={card.notes || ''}
              onChange={handleNoteChange}
              placeholder="Write your notes for this card here, they save automatically..."
              style={{ width: '100%', minHeight: 120, border: noteBorder, borderRadius: 10, padding: '16px 20px', fontFamily: FONT, fontSize: '0.95rem', lineHeight: 1.75, color: textPrimary, resize: 'vertical', background: noteBg, outline: 'none', boxSizing: 'border-box', ...glassStyle }}
            />
          </div>
        </>
      )}
    </div>
  );
}
