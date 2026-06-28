import React, { useState } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';

const FONT = "'Roboto', Arial, sans-serif";

export default function FeynmanPanel({ timerDisplay, storageKey = 'doomium_feynman' }) {
  const { dark } = useDarkMode();
  const [tabs, setTabs] = useState([{ id: 'notes1', label: 'Notes 1' }]);
  const [activeTab, setActiveTab] = useState('notes1');
  const [leftNotes, setLeftNotes] = useState({});
  const [rightNotes, setRightNotes] = useState({});

  const addTab = () => {
    const n = tabs.length + 1;
    const id = `notes${n}`;
    setTabs(prev => [...prev, { id, label: `Notes ${n}` }]);
    setActiveTab(id);
  };

  const updateLeft = (id, val) => { setLeftNotes(prev => ({ ...prev, [id]: val })); try { localStorage.setItem(`${storageKey}_left_${id}`, val); } catch {} };
  const updateRight = (id, val) => { setRightNotes(prev => ({ ...prev, [id]: val })); try { localStorage.setItem(`${storageKey}_right_${id}`, val); } catch {} };
  const getLeft = (id) => leftNotes[id] !== undefined ? leftNotes[id] : (localStorage.getItem(`${storageKey}_left_${id}`) || '');
  const getRight = (id) => rightNotes[id] !== undefined ? rightNotes[id] : (localStorage.getItem(`${storageKey}_right_${id}`) || '');
  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); };

  const tabBarBg = dark ? 'rgba(22,14,36,0.85)' : 'rgba(242,234,224,0.85)';
  const tabBorder = dark ? '1px solid rgba(90,40,130,0.4)' : '1px solid rgba(229,216,200,0.7)';
  const areaBg = dark ? 'rgba(14,8,24,0.5)' : 'rgba(242,234,224,0.5)';
  const textareaStyle = {
    border: 'none', outline: 'none', resize: 'none',
    background: dark ? 'rgba(30,10,46,0.7)' : 'rgba(255,255,255,0.8)',
    color: dark ? '#e8d5ff' : '#2D1B0E',
    fontFamily: FONT,
    fontSize: '0.9rem', lineHeight: 1.8, padding: '20px',
    backdropFilter: 'blur(12px)',
    transition: 'background 0.3s',
  };

  return (
    <div className="fade-in" style={{ height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: tabBarBg, borderRadius: '14px 14px 0 0', padding: '10px 16px', borderBottom: tabBorder, justifyContent: 'space-between', backdropFilter: 'blur(20px)', boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(180,140,120,0.1)' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: dark ? '#7a5a9a' : '#8A7A6A', fontSize: '1rem', marginRight: 8 }}>--</span>
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

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: areaBg, borderBottom: tabBorder, backdropFilter: 'blur(12px)' }}>
        <div style={{ padding: '10px 20px', fontFamily: FONT, fontSize: '0.85rem', color: dark ? '#a080c0' : '#8A7A6A', textAlign: 'center', borderRight: tabBorder }}>Copy Your Notes Here</div>
        <div style={{ padding: '10px 20px', fontFamily: FONT, fontSize: '0.85rem', color: dark ? '#a080c0' : '#8A7A6A', textAlign: 'center' }}>Explain Like I'm 10</div>
      </div>

      {/* Two-column textareas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, background: areaBg, borderRadius: '0 0 14px 14px', border: tabBorder, borderTop: 'none', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
        <textarea
          value={getLeft(activeTab)}
          onChange={e => updateLeft(activeTab, e.target.value)}
          placeholder="Write your notes here..."
          style={{ ...textareaStyle, minHeight: '1200px', borderRight: tabBorder }}
        />
        <textarea
          value={getRight(activeTab)}
          onChange={e => updateRight(activeTab, e.target.value)}
          placeholder="Explain your notes as if to a 10 year old..."
          style={{ ...textareaStyle, minHeight: '1200px' }}
        />
      </div>
    </div>
  );
}
