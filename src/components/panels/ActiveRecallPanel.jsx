import React, { useState } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';

const FONT = "'Roboto', Arial, sans-serif";

const TUTORIAL_TEXT = `Welcome to active recall,

On the "Notebook 1" page, write the first part of your notes from a lesson or textbook. Then, click the "Recall 1" page.

On "Recall 1," write all you remember using only your memory.

After you dump everything you got from your mind into the page, click back on "Notebook" to see what you missed.

Click the plus button, put the points you missed in "Notebook 2", as well as the next session of your notes, and repeat the process.

Congrats! You have learned active recall.`;

export default function ActiveRecallPanel({ timerDisplay, storageKey = 'doomium_ar' }) {
  const { dark } = useDarkMode();
  const [activeTab, setActiveTab] = useState('tutorial');
  const [tabs, setTabs] = useState([
    { id: 'notebook1', label: 'Notebook 1' },
    { id: 'recall1', label: 'Recall 1' },
  ]);
  const [notes, setNotes] = useState({});

  const addTab = () => {
    const nCount = tabs.filter(t => t.id.startsWith('notebook')).length + 1;
    const rCount = tabs.filter(t => t.id.startsWith('recall')).length + 1;
    setTabs(prev => [...prev, { id: `notebook${nCount + 1}`, label: `Notebook ${nCount + 1}` }, { id: `recall${rCount + 1}`, label: `Recall ${rCount + 1}` }]);
  };

  const updateNote = (id, val) => { setNotes(prev => ({ ...prev, [id]: val })); try { localStorage.setItem(`${storageKey}_${id}`, val); } catch {} };
  const getNote = (id) => { if (notes[id] !== undefined) return notes[id]; try { return localStorage.getItem(`${storageKey}_${id}`) || ''; } catch { return ''; } };
  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); };

  const tabBarBg = dark ? 'rgba(22,14,36,0.85)' : 'rgba(242,234,224,0.85)';
  const tabBorder = dark ? '1px solid rgba(90,40,130,0.4)' : '1px solid rgba(229,216,200,0.7)';
  const contentBg = dark ? 'rgba(14,8,24,0.6)' : 'rgba(255,255,255,0.7)';

  return (
    <div className="fade-in" style={{ height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: tabBarBg, borderRadius: '14px 14px 0 0', padding: '10px 16px', borderBottom: tabBorder, justifyContent: 'space-between', backdropFilter: 'blur(20px)', boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(180,140,120,0.1)' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: dark ? '#7a5a9a' : '#8A7A6A', fontSize: '1rem', marginRight: 8 }}>--</span>
          <span className={`tab-item${activeTab === 'tutorial' ? ' active' : ''}`} onClick={() => setActiveTab('tutorial')} style={{ fontFamily: FONT }}>Tutorial</span>
          {tabs.map(t => (
            <span key={t.id} className={`tab-item${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)} style={{ fontFamily: FONT }}>{t.label}</span>
          ))}
          <button onClick={addTab} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: dark ? '#c77dff' : '#5A4A3A', padding: '0 6px' }}>+</button>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: FONT, fontSize: '1rem', color: dark ? '#c77dff' : '#2D1B0E', fontWeight: 600 }}>{timerDisplay || '24:59'}</span>
          <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: dark ? '#a080c0' : '#8A7A6A', fontFamily: FONT }}>Fullscreen</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ background: contentBg, borderRadius: '0 0 14px 14px', border: tabBorder, borderTop: 'none', backdropFilter: 'blur(16px)', overflow: 'hidden' }}>
        {activeTab === 'tutorial' ? (
          <div style={{ padding: '40px', fontFamily: FONT, fontSize: '0.97rem', color: dark ? '#d0b8f0' : '#2D1B0E', lineHeight: 1.9, whiteSpace: 'pre-wrap', minHeight: '800px' }}>
            {TUTORIAL_TEXT}
          </div>
        ) : (
          <textarea
            value={getNote(activeTab)}
            onChange={e => updateNote(activeTab, e.target.value)}
            placeholder={activeTab.startsWith('notebook') ? 'Write your notes here...' : 'Write everything you remember from memory...'}
            style={{
              width: '100%', minHeight: '1200px', border: 'none', outline: 'none', resize: 'none',
              background: 'transparent', padding: '32px',
              fontFamily: FONT, fontSize: '0.95rem', lineHeight: 1.85,
              color: dark ? '#e8d5ff' : '#2D1B0E',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>
    </div>
  );
}
