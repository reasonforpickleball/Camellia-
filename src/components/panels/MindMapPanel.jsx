import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { generateMindMap, computeLayout } from '../../lib/mindMapGenerator';
import { useDarkMode } from '../../lib/DarkModeContext';

const tk = (ns, key) => `camellia_${ns}_${key}`;
const FONT = 'Arial, Helvetica, sans-serif';
const CANVAS_W = 1800;
const CANVAS_H = 1400;

function getMastery(ns) {
  try { return JSON.parse(localStorage.getItem(tk(ns, 'mindmap_mastery')) || '{}'); } catch { return {}; }
}

function getMLevel(masteryMap, nodeId) {
  if (!masteryMap?.[nodeId]) return 'not_started';
  const net = (masteryMap[nodeId].correct || 0) - (masteryMap[nodeId].incorrect || 0);
  if (net >= 5) return 'mastered';
  if (net >= 2) return 'proficient';
  return 'not_started';
}

const MASTERY_COLORS = { mastered: '#7b2d6e', proficient: '#9b30c0', not_started: null };
const MASTERY_LABELS = { mastered: 'Mastered', proficient: 'Proficient', not_started: 'Not Started' };

function truncate(str, max) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

export default function MindMapPanel({ ns = 'default' }) {
  const { dark } = useDarkMode();
  const [mindMap, setMindMap] = useState(null);
  const [mastery, setMastery] = useState({});
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouseRef = useRef(null);
  const containerRef = useRef(null);
  const didAutoFit = useRef(false);

  // Load material and generate map — check all namespaces as fallback
  useEffect(() => {
    let mat = localStorage.getItem(tk(ns, 'raw_material')) || '';
    if (!mat || mat.length < 30) {
      // Scan all namespaces for material
      const allNs = ['default'];
      try { const topics = JSON.parse(localStorage.getItem('doomium_topics') || '[]'); topics.forEach(t => { const n = `topic_${t.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')}`;  if (!allNs.includes(n)) allNs.push(n); }); } catch {}
      for (const n of allNs) {
        const m = localStorage.getItem(`camellia_${n}_raw_material`) || '';
        if (m.length > mat.length) mat = m;
      }
    }
    if (!mat || mat.length < 30) { setMindMap(null); return; }
    didAutoFit.current = false;
    try {
      const map = generateMindMap(mat);
      setMindMap(map);
    } catch (e) {
      setMindMap(null);
    }
  }, [ns]);

  // Poll mastery every 2s
  useEffect(() => {
    const load = () => setMastery(getMastery(ns));
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [ns]);

  // Auto-fit once mindmap is ready
  useEffect(() => {
    if (!mindMap || didAutoFit.current) return;
    const el = containerRef.current;
    if (!el) return;
    const cw = el.offsetWidth || 800;
    const ch = el.offsetHeight || 600;
    const fitZoom = Math.min(cw / CANVAS_W, ch / CANVAS_H) * 0.9;
    const z = Math.max(0.15, Math.min(1.5, fitZoom));
    setZoom(z);
    setPan({ x: (cw - CANVAS_W * z) / 2, y: (ch - CANVAS_H * z) / 2 });
    didAutoFit.current = true;
  }, [mindMap]);

  const layout = useMemo(() => {
    if (!mindMap?.branches?.length) return null;
    return computeLayout(mindMap.branches, CANVAS_W, CANVAS_H);
  }, [mindMap]);

  // Pan handlers
  const onMouseDown = (e) => { setIsPanning(true); lastMouseRef.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => {
    if (!isPanning || !lastMouseRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { setIsPanning(false); lastMouseRef.current = null; };
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(2.5, z - e.deltaY * 0.001)));
  };

  const resetView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.offsetWidth || 800;
    const ch = el.offsetHeight || 600;
    const z = Math.max(0.15, Math.min(1.5, Math.min(cw / CANVAS_W, ch / CANVAS_H) * 0.9));
    setZoom(z);
    setPan({ x: (cw - CANVAS_W * z) / 2, y: (ch - CANVAS_H * z) / 2 });
  }, []);

  const hasAnyMaterial = (() => {
    if (localStorage.getItem(tk(ns, 'raw_material'))) return true;
    const allNs = ['default'];
    try { const topics = JSON.parse(localStorage.getItem('doomium_topics') || '[]'); topics.forEach(t => { const n = `topic_${t.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')}`; if (!allNs.includes(n)) allNs.push(n); }); } catch {}
    return allNs.some(n => !!localStorage.getItem(`camellia_${n}_raw_material`));
  })();

  if (!hasAnyMaterial) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: FONT, fontSize: '1.2rem', color: dark ? '#c0a0e0' : '#9A8A7A', marginBottom: 8 }}>No mind map yet</p>
          <p style={{ fontFamily: FONT, fontSize: '0.95rem', color: dark ? '#a080c0' : '#B0A090' }}>Upload study material in the AI Study Planner to generate your Mind Map.</p>
        </div>
      </div>
    );
  }

  if (!mindMap) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontFamily: FONT, color: dark ? '#c0a0e0' : '#9A8A7A' }}>
        Generating mind map...
      </div>
    );
  }

  if (!mindMap.branches || mindMap.branches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontFamily: FONT, color: dark ? '#c0a0e0' : '#9A8A7A' }}>
        <p style={{ fontSize: '1rem', marginBottom: 8 }}>Could not generate a mind map from this material.</p>
        <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Try uploading material with clear headings or sections.</p>
      </div>
    );
  }

  if (!layout) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontFamily: FONT, color: dark ? '#c0a0e0' : '#9A8A7A' }}>
        Generating mind map...
      </div>
    );
  }

  const { centralPos, branchPositions, nodePositions } = layout;
  const getNodePos = (id) => nodePositions.find(p => p.id === id) || { x: 0, y: 0 };

  // Node dimensions — wide enough for full labels
  const BW = 120, BH = 44;
  const NW = 160, NH = 56;
  const CR = 100; // central ellipse rx

  return (
    <div className="fade-in" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 500 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
        <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.3rem', color: dark ? '#e8b8ff' : '#4A3525', margin: 0 }}>Mind Map</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[{ color: '#7b2d6e', label: 'Mastered' }, { color: '#9b30c0', label: 'Proficient' }, { color: dark ? '#2a1040' : '#E5D8C8', label: 'Not Started', border: dark ? '#6a40a0' : '#9A8A7A' }].map(({ color, label, border }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: border ? `1.5px solid ${border}` : undefined, display: 'inline-block' }} />
              <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: dark ? '#c0a0e8' : '#9A8A7A' }}>{label}</span>
            </div>
          ))}
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} style={{ background: dark ? 'rgba(80,30,130,0.5)' : '#F0E8E0', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: FONT, fontSize: '0.85rem', color: dark ? '#e0c0ff' : '#2D1B0E' }}>+</button>
          <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: dark ? '#c0a0e8' : '#9A8A7A', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} style={{ background: dark ? 'rgba(80,30,130,0.5)' : '#F0E8E0', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: FONT, fontSize: '0.85rem', color: dark ? '#e0c0ff' : '#2D1B0E' }}>-</button>
          <button onClick={resetView} style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: FONT, fontSize: '0.78rem' }}>Reset</button>
        </div>
      </div>
      <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: dark ? '#8060a0' : '#B0A090', marginBottom: 6, flexShrink: 0 }}>
        Scroll to zoom · Drag to pan · Hover nodes for details
      </p>

      {/* Viewport — fills remaining height */}
      <div
        ref={containerRef}
        style={{
          width: '100%', flex: 1, overflow: 'hidden',
          background: dark ? '#0d0a12' : '#fafafa',
          borderRadius: 16, border: dark ? '1.5px solid #2a1f3d' : '1.5px solid #E5D8C8',
          cursor: isPanning ? 'grabbing' : 'grab', position: 'relative', userSelect: 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <svg
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: 'block',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Lines: central → branch */}
          {mindMap.branches.map((branch, i) => {
            const bp = branchPositions[i];
            if (!bp) return null;
            return <line key={`lc${i}`} x1={centralPos.x} y1={centralPos.y} x2={bp.x} y2={bp.y} stroke={branch.color} strokeWidth={3} strokeOpacity={0.5} />;
          })}

          {/* Lines: branch → nodes */}
          {mindMap.branches.map((branch, i) => {
            const bp = branchPositions[i];
            if (!bp) return null;
            return branch.nodes.map(node => {
              const np = getNodePos(node.id);
              return <line key={`ln${node.id}`} x1={bp.x} y1={bp.y} x2={np.x} y2={np.y} stroke={branch.color} strokeWidth={1.5} strokeOpacity={0.4} strokeDasharray="4 3" />;
            });
          })}

          {/* Central node */}
          <ellipse cx={centralPos.x} cy={centralPos.y} rx={CR} ry={44} fill="#7b2d6e" />
          <text x={centralPos.x} y={centralPos.y} textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, fill: 'white', pointerEvents: 'none' }}>
            {truncate(mindMap.central, 30)}
          </text>

          {/* Branch nodes */}
          {mindMap.branches.map((branch, i) => {
            const bp = branchPositions[i];
            if (!bp) return null;
            const level = getMLevel(mastery, branch.id);
            const fill = MASTERY_COLORS[level] || branch.color;
            return (
              <g key={`b${i}`}>
                <ellipse cx={bp.x} cy={bp.y} rx={BW} ry={BH} fill={fill}
                  stroke={level !== 'not_started' ? 'rgba(255,255,255,0.8)' : 'none'} strokeWidth={2} />
                <text x={bp.x} y={bp.y - 8} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, fill: 'white', pointerEvents: 'none' }}>
                  {truncate(branch.label, 20)}
                </text>
                <text x={bp.x} y={bp.y + 12} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontFamily: FONT, fontSize: 9, fill: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }}>
                  {MASTERY_LABELS[level]}
                </text>
              </g>
            );
          })}

          {/* Sub-nodes */}
          {mindMap.branches.map(branch =>
            branch.nodes.map(node => {
              const np = getNodePos(node.id);
              if (!np) return null;
              const level = getMLevel(mastery, node.id);
              const fill = MASTERY_COLORS[level] || (dark ? '#2a1040' : '#F8F4EE');
              const textFill = level !== 'not_started' ? 'white' : (dark ? '#e0c8ff' : '#4A3525');
              const stroke = level !== 'not_started' ? fill : branch.color;
              return (
                <g key={node.id} style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => setTooltip({ node, branch, ex: e.clientX, ey: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}>
                  <rect x={np.x - NW / 2} y={np.y - NH / 2} width={NW} height={NH} rx={10} fill={fill} stroke={stroke} strokeWidth={1.5} />
                  <text x={np.x} y={np.y - 8} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, fill: textFill, pointerEvents: 'none' }}>
                    {truncate(node.label, 24)}
                  </text>
                  <text x={np.x} y={np.y + 11} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontFamily: FONT, fontSize: 9, fill: level !== 'not_started' ? 'rgba(255,255,255,0.8)' : (dark ? '#a080c8' : '#9A8A7A'), pointerEvents: 'none' }}>
                    {MASTERY_LABELS[level]}
                  </text>
                </g>
              );
            })
          )}
        </svg>

        {/* Tooltip — fixed to viewport so it's always visible */}
        {tooltip && (() => {
          const tx = Math.min(tooltip.ex + 16, window.innerWidth - 270);
          const ty = Math.max(tooltip.ey - 60, 8);
          return (
            <div style={{
              position: 'fixed', left: tx, top: ty, pointerEvents: 'none',
              background: dark ? 'rgba(22,14,36,0.97)' : 'white',
              border: `2px solid ${tooltip.branch.color}`,
              borderRadius: 10, padding: '10px 14px', maxWidth: 250, zIndex: 100,
              boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.18)',
            }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: dark ? '#e8d5ff' : '#2D1B0E', marginBottom: 4 }}>{tooltip.node.label}</p>
              <p style={{ fontFamily: FONT, fontSize: '0.75rem', color: dark ? '#c0a0e0' : '#7A6A5A', lineHeight: 1.5, margin: '0 0 6px' }}>{tooltip.node.description}</p>
              <span style={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, background: MASTERY_COLORS[getMLevel(mastery, tooltip.node.id)] || '#E5D8C8', color: getMLevel(mastery, tooltip.node.id) !== 'not_started' ? 'white' : '#7A6A5A', borderRadius: 8, padding: '2px 8px', display: 'inline-block' }}>
                {MASTERY_LABELS[getMLevel(mastery, tooltip.node.id)]}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Branch legend */}
      <div style={{ marginTop: 8, flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {mindMap.branches.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color }} />
            <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: dark ? '#c0a0e0' : '#7A6A5A' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
