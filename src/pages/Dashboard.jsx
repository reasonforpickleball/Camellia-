import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import TimerPanel from '../components/panels/TimerPanel';
import StatsPanel from '../components/panels/StatsPanel';
import TodoPanel from '../components/panels/TodoPanel';
import ActiveRecallPanel from '../components/panels/ActiveRecallPanel';
import FeynmanPanel from '../components/panels/FeynmanPanel';
import CornellPanel from '../components/panels/CornellPanel';
import PlannerPanel from '../components/panels/PlannerPanel';
import AskPanel from '../components/panels/AskPanel';
import QuizzesPanel from '../components/panels/QuizzesPanel';
import YuccaPanel from '../components/panels/YuccaPanel';
import FlashcardPanel from '../components/panels/FlashcardPanel';
import MindMapPanel from '../components/panels/MindMapPanel';
import CoachPanel from '../components/panels/CoachPanel';
import PodcastPanel from '../components/panels/PodcastPanel';
import EssayPanel from '../components/panels/EssayPanel';
import SettingsPanel from '../components/panels/SettingsPanel';
import GovernorMonitorPanel from '../components/panels/GovernorMonitorPanel';
import EscapeOverlay from '../components/EscapeOverlay';
import PopQuiz from '../components/PopQuiz';
import BreakScreen from '../components/BreakScreen';
import TopicWorkspace from './TopicWorkspace';
import { incrementSessions, addStudyMinutes, recordWeekMinutes, tickMinuteSpent } from '../lib/stats';
import { DarkModeToggle, useDarkMode } from '../lib/DarkModeContext';
import StreakBadgePopup from '../components/StreakBadgePopup';

const fmt = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export default function Dashboard() {
  // Stats view is the "home" — no sidebar
  const [view, setView] = useState('stats'); // 'stats' | 'workspace' | 'topic'
  const [activeTab, setActiveTab] = useState('planner');
  const [activeTopic, setActiveTopic] = useState(null);

  // "Create study tab" modal — name the session before entering workspace
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  // Require material upload (planner ran) before timer can start
  const hasMaterial = () => !!(
    localStorage.getItem('camellia_default_planner_filename') ||
    localStorage.getItem('camellia_default_raw_material') ||
    localStorage.getItem('camellia_default_ai_questions')
  );
  const [materialReady, setMaterialReady] = useState(hasMaterial);

  const [isTimerConfigured, setIsTimerConfigured] = useState(() => !!localStorage.getItem('doomium_timer_configured'));

  // Pomodoro state
  const [pomConfig, setPomConfig] = useState({ studyMin: 25, restMin: 5, repeat: 4 });
  const [pomRunning, setPomRunning] = useState(false);
  const [pomPhase, setPomPhase] = useState('study');
  const [pomSecsLeft, setPomSecsLeft] = useState(25 * 60);
  const [pomInterval, setPomInterval] = useState(1);
  const intervalRef = useRef(null);
  const frozenSecsRef = useRef(null);

  // Fullscreen trap state
  const [escapeVisible, setEscapeVisible] = useState(false);
  const [escapeCountdown, setEscapeCountdown] = useState(5);
  const [popQuizVisible, setPopQuizVisible] = useState(false);
  const escapeTimerRef = useRef(null);
  const escapeCountRef = useRef(5);
  const shakeRef = useRef(null);
  // Track if a file dialog is open to suppress escape penalty
  const fileDialogOpenRef = useRef(false);
  // Suppress escape penalty while we're re-entering fullscreen programmatically
  const returningFullscreenRef = useRef(false);

  const { dark, theme } = useDarkMode();
  const isRed = theme === 'red';
  const workspaceBg = isRed
    ? 'linear-gradient(135deg, #120508 0%, #1e0a0a 50%, #0a0408 100%)'
    : dark
      ? 'linear-gradient(135deg, #0d0a12 0%, #120a1e 50%, #0a0814 100%)'
      : 'linear-gradient(135deg, #FADCD0 0%, #FDF3EE 50%, #FFFDFB 100%)';
  const userName = localStorage.getItem('doomium_user_name') || 'Student';
  const userGoal = localStorage.getItem('doomium_user_goal') || '';
  const nn1 = localStorage.getItem('doomium_nn1') || '';
  const nn2 = localStorage.getItem('doomium_nn2') || '';
  const nn3 = localStorage.getItem('doomium_nn3') || '';

  const pomDisplay = fmt(pomSecsLeft);

  // ─── Background active-minute tracking (every 60s while app is open) ─────────
  useEffect(() => {
    const id = setInterval(() => { tickMinuteSpent(); }, 60000);
    return () => clearInterval(id);
  }, []);

  // ─── Pomodoro tick ─────────────────────────────────────────────────────────
  const startTick = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setPomSecsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!pomRunning || pomSecsLeft > 0) return;
    if (pomPhase === 'study') {
      addStudyMinutes(pomConfig.studyMin);
      recordWeekMinutes(pomConfig.studyMin);
      setPomPhase('rest');
      setPomSecsLeft(pomConfig.restMin * 60);
      setTimeout(startTick, 100);
    } else {
      if (pomInterval >= pomConfig.repeat) {
        setPomRunning(false);
        clearInterval(intervalRef.current);
        setPomPhase('study');
        setPomSecsLeft(pomConfig.studyMin * 60);
        if (document.fullscreenElement) document.exitFullscreen?.();
        return;
      }
      setPomInterval(i => i + 1);
      setPomPhase('study');
      setPomSecsLeft(pomConfig.studyMin * 60);
      setTimeout(startTick, 100);
    }
  }, [pomSecsLeft, pomRunning, pomPhase]);

  // ─── Timer start ───────────────────────────────────────────────────────────
  const handleTimerStart = (cfg) => {
    setPomConfig(cfg);
    setPomSecsLeft(cfg.studyMin * 60);
    setPomPhase('study');
    setPomInterval(1);
    setPomRunning(true);
    setIsTimerConfigured(true);
    localStorage.setItem('doomium_timer_configured', 'true');
    incrementSessions();
    startTick();
    try { document.documentElement.requestFullscreen?.(); } catch {}
    setActiveTab('timer');
  };

  // ─── Fullscreen + visibility (with file dialog guard) ─────────────────────
  const handleEscape = useCallback(() => {
    if (!pomRunning || pomPhase !== 'study' || escapeVisible || popQuizVisible) return;
    if (fileDialogOpenRef.current) return;
    if (returningFullscreenRef.current) return; // re-entering fullscreen programmatically
    clearInterval(intervalRef.current);
    frozenSecsRef.current = pomSecsLeft;
    setEscapeVisible(true);
    escapeCountRef.current = 5;
    setEscapeCountdown(5);
    escapeTimerRef.current = setInterval(() => {
      escapeCountRef.current -= 1;
      setEscapeCountdown(escapeCountRef.current);
      if (escapeCountRef.current <= 0) {
        clearInterval(escapeTimerRef.current);
        setEscapeVisible(false);
        setPopQuizVisible(true);
      }
    }, 1000);
  }, [pomRunning, pomPhase, escapeVisible, popQuizVisible, pomSecsLeft]);

  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement && pomRunning && pomPhase === 'study') handleEscape();
    };
    const onVisibility = () => {
      if (document.hidden && pomRunning && pomPhase === 'study') handleEscape();
    };
    const onBlur = () => {
      // Small delay — if a file input was clicked the focus blur fires first
      setTimeout(() => {
        if (fileDialogOpenRef.current) return;
        if (pomRunning && pomPhase === 'study') handleEscape();
      }, 300);
    };
    // Detect file input clicks to suppress blur penalty
    const onFileInputClick = (e) => {
      if (e.target.type === 'file') {
        fileDialogOpenRef.current = true;
        // Reset after a short window (file dialog closes and focus returns)
        setTimeout(() => { fileDialogOpenRef.current = false; }, 5000);
      }
    };
    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('click', onFileInputClick, true);
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('click', onFileInputClick, true);
    };
  }, [handleEscape]);

  const handleReturnFullscreen = () => {
    clearInterval(escapeTimerRef.current);
    returningFullscreenRef.current = true;
    setEscapeVisible(false);
    setEscapeCountdown(5);
    if (frozenSecsRef.current !== null) setPomSecsLeft(frozenSecsRef.current);
    try {
      document.documentElement.requestFullscreen?.().finally(() => {
        setTimeout(() => { returningFullscreenRef.current = false; }, 500);
      });
    } catch { returningFullscreenRef.current = false; }
    setTimeout(startTick, 200);
  };

  const handlePopQuizComplete = () => {
    returningFullscreenRef.current = true;
    setPopQuizVisible(false);
    if (frozenSecsRef.current !== null) setPomSecsLeft(frozenSecsRef.current);
    try {
      document.documentElement.requestFullscreen?.().finally(() => {
        setTimeout(() => { returningFullscreenRef.current = false; }, 500);
      });
    } catch { returningFullscreenRef.current = false; }
    setTimeout(startTick, 200);
  };

  const handleTabClick = (tab) => {
    // Always accessible
    if (tab === 'planner' || tab === 'settings') { setActiveTab(tab); return; }
    // Phase D: Timer becomes reachable only once study material has been parsed
    if (tab === 'timer') { if (materialReady) setActiveTab('timer'); return; }
    // Phase E: every other tool stays locked until a focus session is started
    if (!isTimerConfigured) { shakeRef.current?.(); return; }
    setActiveTab(tab);
  };

  const handleInjectTasks = (tasks) => {
    // Mark material as ready once planner runs
    setMaterialReady(true);
    const saved = (() => { try { return JSON.parse(localStorage.getItem('doomium_tasks') || '[]'); } catch { return []; } })();
    const arr = [];
    for (let i = 0; i < 12; i++) arr.push(saved[i] || { text: '', done: false });
    let injected = 0;
    for (let i = 0; i < arr.length && injected < tasks.length; i++) {
      if (!arr[i].text) { arr[i] = { text: tasks[injected], done: false }; injected++; }
    }
    localStorage.setItem('doomium_tasks', JSON.stringify(arr));
    // Do NOT switch tab — stay on planner; tasks are saved silently
  };

  // Topic workspace
  if (activeTopic) {
    return <TopicWorkspace topic={activeTopic} onBack={() => setActiveTopic(null)} />;
  }

  const handleStartStudying = () => {
    // Always show the create tab modal — every "Start Studying" creates a fresh isolated topic
    setNewTabName('');
    setShowCreateTab(true);
  };

  const handleCreateTabConfirm = () => {
    if (!newTabName.trim()) return;
    const name = newTabName.trim();
    // Add to topics list
    const topics = (() => { try { return JSON.parse(localStorage.getItem('doomium_topics') || '[]'); } catch { return []; } })();
    if (!topics.includes(name)) {
      localStorage.setItem('doomium_topics', JSON.stringify([...topics, name]));
    }
    setShowCreateTab(false);
    // Open as an isolated topic workspace
    setActiveTopic(name);
  };

  // STATS view — no sidebar, full page
  if (view === 'stats') {
    return (
      <>
        <StreakBadgePopup />
        {escapeVisible && <EscapeOverlay countdown={escapeCountdown} onReturnFullscreen={handleReturnFullscreen} userName={userName} userGoal={userGoal} nn1={nn1} nn2={nn2} nn3={nn3} />}
        {popQuizVisible && <PopQuiz onComplete={handlePopQuizComplete} />}
        {showCreateTab && (
          <div className="modal-overlay" onClick={() => setShowCreateTab(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <button onClick={() => setShowCreateTab(false)} style={{ position: 'absolute', top: 14, right: 18, color: 'red', background: 'none', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>x</button>
              <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.3rem', textAlign: 'center', marginBottom: 8 }}>New Study Session</h3>
              <p style={{ fontFamily: 'Inter', fontSize: '0.9rem', color: '#8A7A6A', textAlign: 'center', marginBottom: 24 }}>Name this study tab — e.g. "Chem Unit 3" or "AP Bio Midterm"</p>
              <input
                className="orange-input"
                style={{ borderRadius: 12, marginBottom: 24 }}
                placeholder="(ex. Chem Unit 3)"
                value={newTabName}
                onChange={e => setNewTabName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateTabConfirm()}
                autoFocus
              />
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleCreateTabConfirm}
                  disabled={!newTabName.trim()}
                  style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 20, padding: '12px 40px', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
                >Start Studying →</button>
              </div>
            </div>
          </div>
        )}
        {!escapeVisible && !popQuizVisible && (
          <div style={{ minHeight: '100vh', background: workspaceBg, padding: '28px 36px' }}>
            {/* Top nav */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <DarkModeToggle />
              <button
                onClick={handleStartStudying}
                style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                {isTimerConfigured ? 'Resume Study Session' : 'Start Studying'}
              </button>
            </div>
            <StatsPanel onTopicClick={(t) => setActiveTopic(t)} />
          </div>
        )}
      </>
    );
  }

  // WORKSPACE view — sidebar + panels
  const showBreak = pomRunning && pomPhase === 'rest';

  const renderPanel = () => {
    switch (activeTab) {
      case 'timer': return (
        <TimerPanel
          onStart={handleTimerStart}
          isConfigured={isTimerConfigured}
          shakeRef={shakeRef}
          pomRunning={pomRunning}
          pomSecsLeft={pomSecsLeft}
          pomInterval={pomInterval}
          pomConfig={pomConfig}
          pomPhase={pomPhase}
          fmt={fmt}
        />
      );
      case 'todo': return <TodoPanel />;
      case 'activerecall': return <ActiveRecallPanel timerDisplay={pomDisplay} />;
      case 'feynman': return <FeynmanPanel timerDisplay={pomDisplay} />;
      case 'cornell': return <CornellPanel timerDisplay={pomDisplay} />;
      case 'planner': return <PlannerPanel onInjectTasks={handleInjectTasks} onMaterialReady={() => { setMaterialReady(true); setActiveTab('timer'); }} isTimerConfigured={isTimerConfigured} />;
      case 'flashcards': return <FlashcardPanel />;
      case 'quizzes': return <QuizzesPanel />;
      case 'ask': return <AskPanel />;
      case 'yucca': return <YuccaPanel />;
      case 'mindmap': return <MindMapPanel ns="default" />;
      case 'podcast': return <PodcastPanel />;
      case 'essay': return <EssayPanel />;
      case 'coach': return <CoachPanel />;
      case 'settings': return <SettingsPanel />;
      case 'governor': return <GovernorMonitorPanel />;
      default: return (
        <TimerPanel
          onStart={handleTimerStart}
          isConfigured={isTimerConfigured}
          shakeRef={shakeRef}
          pomRunning={pomRunning}
          pomSecsLeft={pomSecsLeft}
          pomInterval={pomInterval}
          pomConfig={pomConfig}
          pomPhase={pomPhase}
          fmt={fmt}
        />
      );
    }
  };

  return (
    <>
      {showBreak && <BreakScreen display={fmt(pomSecsLeft)} interval={pomInterval} totalIntervals={pomConfig.repeat} />}
      {escapeVisible && <EscapeOverlay countdown={escapeCountdown} onReturnFullscreen={handleReturnFullscreen} userName={userName} userGoal={userGoal} nn1={nn1} nn2={nn2} nn3={nn3} />}
      {popQuizVisible && <PopQuiz onComplete={handlePopQuizComplete} />}

      {!showBreak && !escapeVisible && !popQuizVisible && (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar
            activeTab={activeTab}
            onTabClick={handleTabClick}
            isLocked={!isTimerConfigured}
            materialReady={materialReady}
            pomodoroDisplay={pomDisplay}
            onBack={() => setView('stats')}
            showBack
          />
          <div className="workspace" style={{ flex: 1, background: workspaceBg }}>
            {/* Material gate: redirect to planner if not ready and trying to start timer */}
            {!materialReady && activeTab === 'timer' && (
              <div style={{ marginBottom: 24, background: dark ? 'rgba(60,20,100,0.3)' : '#f3e8ff', border: '2px solid #7b2d6e', borderRadius: 12, padding: '20px 24px', maxWidth: 700 }}>
                <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', color: dark ? '#e0b8ff' : '#7b2d6e', marginBottom: 8 }}>Upload your study material first</p>
                <p style={{ fontFamily: 'Inter', fontSize: '0.9rem', color: dark ? '#c0a0e0' : '#7A6A5A', marginBottom: 12 }}>
                  Go to <strong>AI Study Planner</strong> and upload your notes or enter your study goal — this generates questions used by Yucca, your pop-quizzes, and the quiz generator.
                </p>
                <button
                  onClick={() => setActiveTab('planner')}
                  style={{ background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >Go to AI Study Planner →</button>
              </div>
            )}
            {renderPanel()}
          </div>
        </div>
      )}
    </>
  );
}
