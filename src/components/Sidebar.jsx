import React from 'react';
import { CamelliaLogoSidebar } from './CamelliaLogo';

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

export default function Sidebar({ activeTab, onTabClick, isLocked, pomodoroDisplay, topicName, onBack, showBack, materialReady = true }) {
  // Which items are visible:
  // - No material: only Planner
  // - Material ready but timer not started: Planner + Timer
  // - Timer started (isLocked=false): all items
  const visibleItems = !materialReady
    ? NAV_ITEMS.filter(i => i.id === 'planner' || i.alwaysVisible)
    : isLocked
      ? NAV_ITEMS.filter(i => i.id === 'planner' || i.id === 'timer' || i.alwaysVisible)
      : NAV_ITEMS;

  return (
    <div className="sidebar">
      {/* Logo + back */}
      <div style={{ padding: '20px 16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <CamelliaLogoSidebar />
        {(topicName || showBack) && (
          <div style={{ width: '100%', paddingTop: 4 }}>
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: '#7b2d6e', fontSize: '0.78rem', fontFamily: 'Inter', fontWeight: 600, cursor: 'pointer', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}
            >← Back to Stats</button>
            {topicName && <p style={{ fontFamily: 'Inter', fontSize: '0.82rem', fontWeight: 700, color: '#7b2d6e', margin: '4px 0 0', lineHeight: 1.3, paddingLeft: 2 }}>{topicName}</p>}
          </div>
        )}
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, paddingTop: 8, overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleItems.map(item => (
          <div
            key={item.id}
            className={`nav-link${activeTab === item.id ? ' active' : ''}`}
            onClick={() => onTabClick(item.id)}
            title={item.label}
          >
            {item.label}
          </div>
        ))}
      </nav>

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
