import React, { useState, useEffect } from 'react';
import { aiAsk, isAIConfigured, parseAIJson, getTaskModel } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';

const TOTAL_ROWS = 12;
const FONT = "'Roboto', Arial, sans-serif";

export default function TodoPanel({ storageKey = 'doomium_tasks', ns = 'default' }) {
  const tk = (key) => `camellia_${ns}_${key}`;
  const { dark } = useDarkMode();

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const arr = [];
      for (let i = 0; i < TOTAL_ROWS; i++) arr.push(saved[i] || { text: '', done: false });
      return arr;
    } catch {
      return Array.from({ length: TOTAL_ROWS }, () => ({ text: '', done: false }));
    }
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const arr = [];
      for (let i = 0; i < TOTAL_ROWS; i++) arr.push(saved[i] || { text: '', done: false });
      setTasks(arr);
    } catch {}
  }, [storageKey]);

  const save = (updated) => { setTasks(updated); localStorage.setItem(storageKey, JSON.stringify(updated)); };
  const updateText = (i, val) => { const u = [...tasks]; u[i] = { ...u[i], text: val }; save(u); };
  const toggleDone = (i) => { const u = [...tasks]; u[i] = { ...u[i], done: !u[i].done }; save(u); };
  const clearAll = () => save(Array.from({ length: TOTAL_ROWS }, () => ({ text: '', done: false })));

  const generateWithAI = async () => {
    const rawMaterial = localStorage.getItem(tk('raw_material')) || '';
    if (!rawMaterial || rawMaterial.length < 50) { setGenError('Upload study material in AI Study Planner first.'); return; }
    if (!isAIConfigured()) { setGenError('No AI key, go to Settings.'); return; }
    setGenerating(true); setGenError('');
    try {
      const raw = await aiAsk(
        `You are a study coach creating a personalized to-do list for a student. Generate specific, actionable study tasks.`,
        `Generate exactly 10 specific study tasks from this material.\n\nMATERIAL:\n${rawMaterial.slice(0, 10000)}\n\nReturn ONLY a JSON array of 10 strings: ["task 1", "task 2", ...]`,
        { maxTokens: 800, model: getTaskModel('todo_tasks') }
      );
      const taskArr = parseAIJson(raw);
      if (!Array.isArray(taskArr) || taskArr.length === 0) { setGenError('AI returned unexpected format. Try again.'); setGenerating(false); return; }
      const newTasks = [...tasks];
      let injected = 0;
      for (let i = 0; i < newTasks.length && injected < taskArr.length; i++) {
        if (!newTasks[i].text) { newTasks[i] = { text: String(taskArr[injected]).slice(0, 120), done: false }; injected++; }
      }
      if (injected < taskArr.length) {
        for (let i = 0; i < newTasks.length && injected < taskArr.length; i++) {
          newTasks[i] = { text: String(taskArr[injected]).slice(0, 120), done: false }; injected++;
        }
      }
      save(newTasks);
    } catch (e) { setGenError('AI Error: ' + e.message); }
    setGenerating(false);
  };

  const completedCount = tasks.filter(t => t.done && t.text).length;
  const totalFilled = tasks.filter(t => t.text).length;

  const panelBg = dark
    ? 'rgba(22,14,36,0.7)'
    : 'rgba(255,255,255,0.55)';
  const panelBorder = dark ? '1px solid rgba(90,40,130,0.4)' : '1px solid rgba(229,216,200,0.7)';
  const rowBorder = dark ? '1px solid rgba(90,40,130,0.2)' : '1px solid rgba(240,232,224,0.8)';
  const textPrimary = dark ? '#e8d5ff' : '#2D1B0E';
  const textSecondary = dark ? '#b090d0' : '#9A8A7A';
  const numColor = dark ? '#7a5a9a' : '#C5B8A8';

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: dark ? '#c77dff' : '#4A3525', fontFamily: FONT, margin: 0 }}>To-do List</h1>
          {totalFilled > 0 && <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, margin: '4px 0 0' }}>{completedCount}/{totalFilled} completed</p>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={generateWithAI} disabled={generating} style={{
            background: generating ? (dark ? '#2a1f3d' : '#E5D8C8') : '#7b2d6e',
            color: generating ? textSecondary : 'white', border: 'none', borderRadius: 10,
            padding: '8px 14px', fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', cursor: generating ? 'not-allowed' : 'pointer',
            backdropFilter: 'blur(8px)', transition: 'all 0.2s',
          }}>{generating ? 'Generating...' : 'Generate with AI'}</button>
          <button onClick={clearAll} style={{
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
            border: panelBorder, borderRadius: 10, padding: '8px 14px',
            fontFamily: FONT, fontSize: '0.82rem', color: textSecondary, cursor: 'pointer',
            backdropFilter: 'blur(8px)', transition: 'all 0.2s',
          }}>Clear All</button>
        </div>
      </div>

      {genError && (
        <div style={{ background: '#FFF0F0', border: '1.5px solid #F44336', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontFamily: FONT, fontSize: '0.85rem', color: '#C62828' }}>{genError}</div>
      )}

      {totalFilled > 0 && (
        <div style={{ height: 4, background: dark ? 'rgba(90,40,130,0.3)' : '#F0E8E0', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#7b2d6e', borderRadius: 2, width: `${totalFilled > 0 ? (completedCount / totalFilled) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
        </div>
      )}

      <div style={{
        background: panelBg, border: panelBorder, borderRadius: 18,
        padding: '8px 24px', minHeight: 600,
        backdropFilter: 'blur(20px) saturate(150%)',
        boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(180,140,120,0.12)',
        transition: 'all 0.3s ease',
      }}>
        {tasks.map((task, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', borderBottom: rowBorder, padding: '13px 0', gap: 12 }}>
            <span style={{ fontFamily: FONT, fontSize: '0.9rem', color: numColor, width: 26, flexShrink: 0 }}>{i + 1}</span>
            <input
              type="text"
              value={task.text}
              onChange={e => updateText(i, e.target.value)}
              placeholder=""
              style={{
                flex: 1, border: 'none', outline: 'none', fontFamily: FONT, fontSize: '0.97rem',
                color: task.done ? (dark ? '#7a5a9a' : '#A09080') : textPrimary,
                textDecoration: task.done ? 'line-through' : 'none',
                background: 'transparent', padding: '2px 0',
              }}
            />
            <div
              className={`task-checkbox${task.done ? ' checked' : ''}`}
              onClick={() => toggleDone(i)}
              style={{ border: dark ? '2px solid #6a4a8a' : undefined }}
            >
              {task.done && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ margin: '3px' }}>
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
