/**
 * AI_KILL_SWITCH_GATEWAY — Real-time monitor panel (dev only)
 * Shows: provider status, queue state machine, retries, cache, backpressure, recent log
 */
import React, { useState, useEffect } from 'react';
import { subscribeMonitor, getMonitorSnapshot, invalidateCache } from '../../lib/aiRequestGovernor';
import { useDarkMode } from '../../lib/DarkModeContext';

const FONT = "'Roboto', Arial, sans-serif";

const STATE_COLORS = {
  QUEUED:    '#f59e0b',
  ACTIVE:    '#3b82f6',
  RETRYING:  '#f97316',
  COMPLETED: '#22c55e',
  FAILED:    '#ef4444',
};

const PRIORITY_LABELS = { 1: 'CRITICAL', 2: 'HIGH', 3: 'NORMAL', 4: 'LOW' };

function Pill({ label, color, bg }) {
  return (
    <span style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: color || 'white', background: bg || '#7b2d6e', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, sub, color, dark }) {
  const cardBg = dark ? 'rgba(22,14,36,0.8)' : 'white';
  const textSec = dark ? '#a080c0' : '#7A6A5A';
  return (
    <div style={{ background: cardBg, borderRadius: 10, padding: '12px 16px', border: `1.5px solid ${color || (dark ? 'rgba(90,40,130,0.4)' : '#E5D8C8')}`, minWidth: 100 }}>
      <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.5rem', color: color || (dark ? '#c77dff' : '#7b2d6e'), margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: FONT, fontSize: '0.7rem', color: textSec, margin: '4px 0 0' }}>{label}</p>
      {sub && <p style={{ fontFamily: FONT, fontSize: '0.62rem', color: textSec, margin: '2px 0 0', opacity: 0.75 }}>{sub}</p>}
    </div>
  );
}

function ProviderRow({ p, dark }) {
  const textSec = dark ? '#a080c0' : '#7A6A5A';
  const textPri = dark ? '#e8d5ff' : '#2D1B0E';
  const usagePct = p.limit > 0 ? Math.min((p.reqLastMinute / p.limit) * 100, 100) : 0;
  const barColor = p.inCooldown ? '#ef4444' : usagePct > 80 ? '#f97316' : usagePct > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${dark ? 'rgba(90,40,130,0.15)' : '#f0e8e0'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.85rem', color: textPri, width: 90, flexShrink: 0 }}>{p.name}</span>
        <div style={{ flex: 1, height: 7, background: dark ? 'rgba(255,255,255,0.08)' : '#f0e8e0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${usagePct}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontFamily: FONT, fontSize: '0.68rem', color: textSec, flexShrink: 0, width: 55, textAlign: 'right' }}>
          {p.reqLastMinute}/{p.limit} rpm
        </span>
        {p.active > 0 && <Pill label={`${p.active} active`} bg="#3b82f6" />}
        {p.inCooldown
          ? <Pill label={`CB ${p.cooldownSecsLeft}s`} bg="#ef4444" />
          : <Pill label="OK" bg="#22c55e" />}
      </div>
      <div style={{ display: 'flex', gap: 14, paddingLeft: 98, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FONT, fontSize: '0.65rem', color: textSec }}>Reqs: {p.requests}</span>
        <span style={{ fontFamily: FONT, fontSize: '0.65rem', color: p.errors > 0 ? '#ef4444' : textSec }}>Errors: {p.errors}</span>
        <span style={{ fontFamily: FONT, fontSize: '0.65rem', color: p.retries > 0 ? '#f97316' : textSec }}>Retries: {p.retries}</span>
        {p.cbTrips > 0 && <span style={{ fontFamily: FONT, fontSize: '0.65rem', color: '#ef4444' }}>CB trips: {p.cbTrips}</span>}
        {p.backpressureMs > 0 && <span style={{ fontFamily: FONT, fontSize: '0.65rem', color: '#f59e0b' }}>Backpressure: +{p.backpressureMs}ms</span>}
        <span style={{ fontFamily: FONT, fontSize: '0.65rem', color: textSec }}>Now: {p.reqLastSecond}/s</span>
      </div>
    </div>
  );
}

function QueueItem({ item, dark }) {
  const textPri = dark ? '#e8d5ff' : '#2D1B0E';
  const textSec = dark ? '#a080c0' : '#7A6A5A';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${dark ? 'rgba(90,40,130,0.1)' : '#f5f0ec'}` }}>
      <Pill label={item.state} bg={STATE_COLORS[item.state] || '#888'} />
      <Pill label={PRIORITY_LABELS[item.priority] || `P${item.priority}`} bg={item.priority === 1 ? '#ef4444' : item.priority === 2 ? '#f97316' : item.priority === 3 ? '#7b2d6e' : '#6b7280'} />
      <span style={{ fontFamily: FONT, fontSize: '0.72rem', color: textPri, flex: 1 }}>{item.source}</span>
      <span style={{ fontFamily: FONT, fontSize: '0.65rem', color: textSec }}>{item.provider}</span>
      {item.retries > 0 && <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: '#f97316' }}>retry #{item.retries}</span>}
      <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: textSec }}>{item.age}s ago</span>
    </div>
  );
}

function RecentLogItem({ entry, dark }) {
  const textSec = dark ? '#a080c0' : '#7A6A5A';
  const textPri = dark ? '#e8d5ff' : '#2D1B0E';
  const t = new Date(entry.ts);
  const time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0' }}>
      <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: textSec, flexShrink: 0, width: 55 }}>{time}</span>
      <Pill label={entry.state} bg={STATE_COLORS[entry.state] || '#888'} />
      <span style={{ fontFamily: FONT, fontSize: '0.68rem', color: textPri, flex: 1 }}>{entry.source}</span>
      <span style={{ fontFamily: FONT, fontSize: '0.62rem', color: textSec }}>{entry.provider}</span>
    </div>
  );
}

export default function GovernorMonitorPanel() {
  const { dark } = useDarkMode();
  const [snap, setSnap] = useState(() => getMonitorSnapshot());
  const [showQueue, setShowQueue] = useState(true);
  const [showLog, setShowLog] = useState(true);

  useEffect(() => {
    const unsub = subscribeMonitor(setSnap);
    const interval = setInterval(() => setSnap(getMonitorSnapshot()), 1500);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const cardBg = dark ? 'rgba(22,14,36,0.75)' : 'rgba(255,255,255,0.9)';
  const borderCol = dark ? 'rgba(90,40,130,0.35)' : '#E5D8C8';
  const textPri = dark ? '#e8d5ff' : '#2D1B0E';
  const textSec = dark ? '#a080c0' : '#7A6A5A';
  const anyInCooldown = snap.providers.some(p => p.inCooldown);

  return (
    <div className="fade-in" style={{ maxWidth: 780, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.3rem', color: dark ? '#c77dff' : '#4A3525', margin: 0 }}>
          AI Kill Switch Gateway
        </h2>
        <Pill label="DEV" color={dark ? '#c77dff' : '#7b2d6e'} bg={dark ? 'rgba(90,40,130,0.3)' : '#f0e0ff'} />
        {anyInCooldown && <Pill label="CIRCUIT BREAKER OPEN" bg="#ef4444" />}
        {snap.queueLength > 0 && <Pill label={`${snap.queueLength} in queue`} bg="#f59e0b" />}
      </div>

      {/* Global stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatBox dark={dark} label="Total" value={snap.totalRequests} />
        <StatBox dark={dark} label="Cache Hits" value={snap.cacheHits} sub={`${snap.cacheHitRate}% rate`} color="#22c55e" />
        <StatBox dark={dark} label="Queued" value={snap.queuedRequests} />
        <StatBox dark={dark} label="Retries" value={snap.retries} color={snap.retries > 0 ? '#f97316' : undefined} />
        <StatBox dark={dark} label="Fallbacks" value={snap.fallbackActivations} color={snap.fallbackActivations > 0 ? '#ef4444' : undefined} />
        <StatBox dark={dark} label="Bypasses" value={snap.bypassAttempts} color={snap.bypassAttempts > 0 ? '#ef4444' : '#22c55e'} />
      </div>

      {/* Provider status */}
      <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12, backdropFilter: 'blur(16px)' }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 10px' }}>Provider Status</p>
        {snap.providers.map(p => <ProviderRow key={p.name} p={p} dark={dark} />)}
      </div>

      {/* Live queue */}
      <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12, backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#4A3525', margin: 0 }}>
            Live Queue ({snap.queueLength})
          </p>
          <button onClick={() => setShowQueue(v => !v)} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: '0.72rem', color: textSec, cursor: 'pointer' }}>
            {showQueue ? 'hide' : 'show'}
          </button>
        </div>
        {showQueue && (snap.queueItems.length === 0
          ? <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSec, margin: 0 }}>Queue empty.</p>
          : snap.queueItems.map((item, i) => <QueueItem key={i} item={item} dark={dark} />)
        )}
      </div>

      {/* Recent log */}
      <div style={{ background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12, backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.88rem', color: dark ? '#c77dff' : '#4A3525', margin: 0 }}>
            Recent Requests (last 20)
          </p>
          <button onClick={() => setShowLog(v => !v)} style={{ background: 'none', border: 'none', fontFamily: FONT, fontSize: '0.72rem', color: textSec, cursor: 'pointer' }}>
            {showLog ? 'hide' : 'show'}
          </button>
        </div>
        {showLog && (snap.recentLog.length === 0
          ? <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSec, margin: 0 }}>No requests yet.</p>
          : snap.recentLog.map((e, i) => <RecentLogItem key={i} entry={e} dark={dark} />)
        )}
      </div>

      {/* State machine legend + cache controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '14px 18px', backdropFilter: 'blur(16px)' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 8px' }}>Request State Machine</p>
          {Object.entries(STATE_COLORS).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: textPri }}>{s}</span>
            </div>
          ))}
          <p style={{ fontFamily: FONT, fontSize: '0.65rem', color: textSec, margin: '8px 0 0', lineHeight: 1.6 }}>
            QUEUED→ACTIVE→COMPLETED<br />
            ACTIVE→RETRYING→ACTIVE (up to 4x)<br />
            FAILED only on permanent error
          </p>
        </div>

        <div style={{ flex: 1, minWidth: 240, background: cardBg, border: `1.5px solid ${borderCol}`, borderRadius: 12, padding: '14px 18px', backdropFilter: 'blur(16px)' }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: dark ? '#c77dff' : '#4A3525', margin: '0 0 8px' }}>Cache Controls</p>
          <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSec, margin: '0 0 10px', lineHeight: 1.6 }}>
            Responses cached 5 min. Identical requests return instantly from cache.
          </p>
          <button
            onClick={() => { invalidateCache(); setSnap(getMonitorSnapshot()); }}
            style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: FONT, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
          >
            Clear Cache
          </button>

          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.82rem', color: dark ? '#c77dff' : '#4A3525', margin: '14px 0 6px' }}>Rate Limits</p>
          <p style={{ fontFamily: FONT, fontSize: '0.68rem', color: textSec, lineHeight: 1.7, margin: 0 }}>
            Groq: 18 rpm / 1 rps / 4s gap<br />
            Google: 12 rpm / 1 rps / 6s gap<br />
            Circuit opens on 2 consecutive 429s<br />
            Backoff: 30s base, 2x per trip, 2min cap<br />
            Retries: 4 max, exp. backoff + jitter
          </p>
        </div>
      </div>
    </div>
  );
}
