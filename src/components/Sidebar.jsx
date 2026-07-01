import React, { useRef } from 'react';
import { CamelliaLogoSidebar } from './CamelliaLogo';
import useTourStep from '../hooks/useTourStep';
import { setTourStep } from '../lib/tourStore';
import TourPointer from './TourPointer';

const NAV_ITEMS = [
  { id: 'planner', label: 'AI Study Planner' },
  { id: 'timer', label: 'Timer' },
  { id: 'todo', label: 'To-do list' },
  { id: 'feynman', label: 'Feynman' },
  { id: 'activerecall', label: 'Active recall' },
  { id: 'cornell', label: 'Cornell Notes' },
  { id: 'flashcards', label: 'Flashcard Deck' },
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'ask', label: 'Ask a question' },
  { id: 'yucca', label: 'Yucca' },
  { id: 'essay', label: 'Essay' },
  { id: 'mindmap', label: 'Mind Map' },
  { id: 'podcast', label: 'Podcast', alwaysVisible: true },
  { id: 'settings', label: 'Settings', alwaysVisible: true },
];

export default function Sidebar({ activeTab, onTabClick, isLocked, pomodoroDisplay, topicName, onBack, showBack, materialReady = true, quizzesRef: quizzesRefProp }) {
  const tourStep = useTourStep();
  const backBtnRef = useRef(null);
  const localQuizzesRef = useRef(null);
  const quizzesRef = quizzesRefProp || localQuizzesRef;

  // Which items are enabled (all items always render):
  // - No material: only Planner enabled
  // - Material ready but timer not started: Planner + Timer enabled
  // - Timer started (isLocked=false): all items enabled
  // - During the guided tour, every item unlocks once material is ready
  const isEnabled = (item) => {
    if (item.alwaysVisible || item.id === 'planner') return true;
    if (!materialReady) return false;
    if (tourStep >= 1 && tourStep <= 6) return true;
    if (isLocked) return item.id === 'timer';
    return true;
  };

  return (
    <div className="sidebar">
      {/* Logo + back */}
      <div style={{ padding: '20px 16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <CamelliaLogoSidebar />
        {(topicName || showBack) && (
          <div style={{ width: '100%', paddingTop: 4 }}>
            <button
              ref={backBtnRef}
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: '#7b2d6e', fontSize: '0.78rem', fontFamily: 'Inter', fontWeight: 600, cursor: 'pointer', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}
            >← Back to Stats</button>
            {topicName && <p style={{ fontFamily: 'Inter', fontSize: '0.82rem', fontWeight: 700, color: '#7b2d6e', margin: '4px 0 0', lineHeight: 1.3, paddingLeft: 2 }}>{topicName}</p>}
          </div>
        )}
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, paddingTop: 8, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(item => {
          const enabled = isEnabled(item);
          return (
            <div
              key={item.id}
              ref={item.id === 'quizzes' ? quizzesRef : null}
              className={`nav-link${activeTab === item.id ? ' active' : ''}${!enabled ? ' nav-link-locked' : ''}`}
              style={!enabled ? { color: '#B8AC9C', cursor: 'not-allowed' } : undefined}
              onClick={() => {
                if (!enabled) return;
                onTabClick(item.id);
                if (tourStep === 4 && item.id === 'quizzes') setTourStep(5);
              }}
              title={enabled ? item.label : `${item.label} — upload study material first`}
            >
              {item.label}
            </div>
          );
        })}
      </nav>

      {tourStep === 6 && <TourPointer anchorRef={backBtnRef} step={6} text="Now check your stats over at Coach!" placement="right" />}

      {/* Clock circle */}
      <div style={{ padding: '16px 20px 24px', display: 'flex', justifyContent: 'flex-start' }}>
        <div className="clock-circle" style={{ width: 64, height: 64 }}>
          <span style={{ fontSize: pomodoroDisplay && pomodoroDisplay.length > 5 ? '0.75rem' : '0.85rem', fontWeight: 700 }}>
            {pomodoroDisplay || '--:--'}
          </span>
        </div>
      </div>
    </div>
  );
}
