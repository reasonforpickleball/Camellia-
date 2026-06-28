import React, { useState } from 'react';
import { useDarkMode } from '../../lib/DarkModeContext';

const FONT = "'Roboto', Arial, sans-serif";

export default function CornellPanel({ timerDisplay, storageKey = 'doomium_cornell' }) {
  const { dark } = useDarkMode();
  const [tabs, setTabs] = useState([{ id: 'notes1', label: 'Notes 1' }]);
  const [activeTab, setActiveTab] = useState('notes1');
  const [cue, setCue] = useState({});
  const [header, setHeader] = useState({});
  const [main, setMain] = useState({});
  const [summary, setSummary] = useState({});

  const addTab = () => { const n = tabs.length + 1; const id = `notes${n}`; setTabs(prev => [...prev, { id, label: `Notes ${n}` }]); setActiveTab(id); };
  const get = (obj, id, section) => obj[id] !== undefined ? obj[id] : (localStorage.getItem(`${storageKey}_${section}_${id}`) || '');
  const upd = (setter, id, val, section) => { setter(prev => ({ ...prev, [id]: val })); try { localStorage.setItem(`${storageKey}_${section}_${id}`, val); } catch {} };
  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); };

  const tabBarBg = dark ? 'rgba(22,14,36,0.85)' : 'rgba(242,234,224,0.85)';
  const tabBorder = dark ? '1px solid rgba(90,40,130,0.4)' : '1px solid rgba(229,216,200,0.7)';
  const areaBg = dark ? 'rgba(14,8,24,0.5)' : 'rgba(245,237,224,0.6)';
  const cellBg = dark ? 'rgba(30,10,46,0.65)' : 'rgba(255,255,255,0.8)';
  const textColor = dark ? '#e8d5ff' : '#2D1B0E';
  const placeholderNote = { fontFamily: FONT, fontSize: '0.88rem', color: textColor, lineHeight: 1.75, border: 'none', outline: 'none', resize: 'none', background: cellBg, padding: '16px', borderRadius: 10, backdropFilter: 'blur(10px)' };

  return (
    <div className="fade-in" style={{ height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: tabBarBg, borderRadius: '14px 14px 0 0', padding: '10px 16px', borderBottom: tabBorder, justifyContent: 'space-between', backdropFilter: 'blur(20px)', boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(180,140,120,0.1)' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: dark ? '#7a5a9a' : '#8A7A6A', fontSize: '1rem', marginRight: 8 }}>☰</span>
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

      {/* Cornell layout */}
      <div style={{ background: areaBg, border: tabBorder, borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Cue column */}
          <textarea
            value={get(cue, activeTab, 'cue')}
            onChange={e => upd(setCue, activeTab, e.target.value, 'cue')}
            placeholder="Key points and testable parts, written after class"
            style={{ ...placeholderNote, width: '28%', minHeight: '900px' }}
          />
          {/* Right column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={get(header, activeTab, 'header')}
              onChange={e => upd(setHeader, activeTab, e.target.value, 'header')}
              placeholder="Name, class, period, date..."
              style={{ ...placeholderNote, height: '80px' }}
            />
            <textarea
              value={get(main, activeTab, 'main')}
              onChange={e => upd(setMain, activeTab, e.target.value, 'main')}
              placeholder="Regular notes, written during class"
              style={{ ...placeholderNote, flex: 1, minHeight: '810px' }}
            />
          </div>
        </div>
        {/* Summary row */}
        <textarea
          value={get(summary, activeTab, 'summary')}
          onChange={e => upd(setSummary, activeTab, e.target.value, 'summary')}
          placeholder="Summary of notes, written after class"
          style={{ ...placeholderNote, width: '100%', minHeight: '200px', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );
}
