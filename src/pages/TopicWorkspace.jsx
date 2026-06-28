import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import TimerPanel from '../components/panels/TimerPanel';
import TodoPanel from '../components/panels/TodoPanel';
import ActiveRecallPanel from '../components/panels/ActiveRecallPanel';
import FeynmanPanel from '../components/panels/FeynmanPanel';
import CornellPanel from '../components/panels/CornellPanel';
import PlannerPanel from '../components/panels/PlannerPanel';
import AskPanel from '../components/panels/AskPanel';
import QuizzesPanel from '../components/panels/QuizzesPanel';
import YuccaPanel from '../components/panels/YuccaPanel';
import FlashcardPanel from '../components/panels/FlashcardPanel';
import EssayPanel from '../components/panels/EssayPanel';
import CoachPanel from '../components/panels/CoachPanel';
import MindMapPanel from '../components/panels/MindMapPanel';
import PodcastPanel from '../components/panels/PodcastPanel';
import SettingsPanel from '../components/panels/SettingsPanel';
import EscapeOverlay from '../components/EscapeOverlay';
import PopQuiz from '../components/PopQuiz';
import BreakScreen from '../components/BreakScreen';
import { incrementSessions, addStudyMinutes, recordWeekMinutes } from '../lib/stats';
import { useDarkMode } from '../lib/DarkModeContext';

const fmt = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// Namespace for all topic-specific storage keys
const nsFor = (topic) => `topic_${topic.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
const tk = (ns, key) => `camellia_${ns}_${key}`;

// Check if this topic already has material uploaded
const topicHasMaterial = (ns) => {
  return !!(
    localStorage.getItem(tk(ns, 'raw_material')) ||
    localStorage.getItem(tk(ns, 'planner_filename')) ||
    localStorage.getItem(tk(ns, 'ai_questions'))
  );
};

const topicTimerConfigured = (ns) => !!localStorage.getItem(tk(ns, 'timer_configured'));

export default function TopicWorkspace({ topic, onBack }) {
  const ns = nsFor(topic);
  const { dark, theme } = useDarkMode();
  const isRed = theme === 'red';
  const workspaceBg = isRed
    ? 'linear-gradient(135deg, #120508 0%, #1e0a0a 50%, #0a0408 100%)'
    : dark
      ? 'linear-gradient(135deg, #0d0a12 0%, #120a1e 50%, #0a0814 100%)'
      : 'linear-gradient(135deg, #FADCD0 0%, #FDF3EE 50%, #FFFDFB 100%)';

  const [materialReady, setMaterialReady] = useState(() => topicHasMaterial(ns));
  const [isTimerConfigured, setIsTimerConfigured] = useState(() => topicTimerConfigured(ns));
  const [activeTab, setActiveTab] = useState(() => topicHasMaterial(ns) ? 'timer' : 'planner');

  const [pomConfig, setPomConfig] = useState({ studyMin: 25, restMin: 5, repeat: 4 });
  const [pomRunning, setPomRunning] = useState(false);
  const [pomPhase, setPomPhase] = useState('study');
  const [pomSecsLeft, setPomSecsLeft] = useState(25 * 60);
  const [pomInterval, setPomInterval] = useState(1);
  const intervalRef = useRef(null);
  const frozenSecsRef = useRef(null);
  const shakeRef = useRef(null);

  const [escapeVisible, setEscapeVisible] = useState(false);
  const [escapeCountdown, setEscapeCountdown] = useState(5);
  const [popQuizVisible, setPopQuizVisible] = useState(false);
  const escapeTimerRef = useRef(null);
  const escapeCountRef = useRef(5);

  const userName = localStorage.getItem('doomium_user_name') || 'Student';
  const userGoal = localStorage.getItem('doomium_user_goal') || '';
  const nn1 = localStorage.getItem('doomium_nn1') || '';
  const nn2 = localStorage.getItem('doomium_nn2') || '';
  const nn3 = localStorage.getItem('doomium_nn3') || '';

  const pomDisplay = fmt(pomSecsLeft);

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

  const handleTimerStart = (cfg) => {
    setPomConfig(cfg);
    setPomSecsLeft(cfg.studyMin * 60);
    setPomPhase('study');
    setPomInterval(1);
    setPomRunning(true);
    setIsTimerConfigured(true);
    localStorage.setItem(tk(ns, 'timer_configured'), 'true');
    incrementSessions();
    startTick();
    try { document.documentElement.requestFullscreen?.(); } catch {}
    setActiveTab('timer');
  };

  const handleEscape = useCallback(() => {
    if (!pomRunning || pomPhase !== 'study' || escapeVisible || popQuizVisible) return;
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
    const onFSChange = () => { if (!document.fullscreenElement && pomRunning && pomPhase === 'study') handleEscape(); };
    const onVisibility = () => { if (document.hidden && pomRunning && pomPhase === 'study') handleEscape(); };
    const onBlur = () => { if (pomRunning && pomPhase === 'study') handleEscape(); };
    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleEscape]);

  const handleReturnFullscreen = () => {
    clearInterval(escapeTimerRef.current);
    setEscapeVisible(false);
    setEscapeCountdown(5);
    if (frozenSecsRef.current !== null) setPomSecsLeft(frozenSecsRef.current);
    try { document.documentElement.requestFullscreen?.(); } catch {}
    setTimeout(startTick, 200);
  };

  const handlePopQuizComplete = () => {
    setPopQuizVisible(false);
    if (frozenSecsRef.current !== null) setPomSecsLeft(frozenSecsRef.current);
    try { document.documentElement.requestFullscreen?.(); } catch {}
    setTimeout(startTick, 200);
  };

  const handleTabClick = (tab) => {
    if (tab === 'planner' || tab === 'settings' || tab === 'podcast' || tab === 'coach') { setActiveTab(tab); return; }
    if (tab === 'timer') {
      if (materialReady) { setActiveTab('timer'); return; }
      shakeRef.current?.(); return;
    }
    if (!isTimerConfigured) { shakeRef.current?.(); return; }
    setActiveTab(tab);
  };

  const handleMaterialReady = () => {
    setMaterialReady(true);
    setActiveTab('timer');
  };

  const handleInjectTasks = (tasks) => {
    const key = tk(ns, 'tasks');
    const saved = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
    const arr = Array.from({ length: 12 }, (_, i) => saved[i] || { text: '', done: false });
    let injected = 0;
    for (let i = 0; i < arr.length && injected < tasks.length; i++) {
      if (!arr[i].text) { arr[i] = { text: tasks[injected++], done: false }; }
    }
    localStorage.setItem(key, JSON.stringify(arr));
  };

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
      case 'todo':        return <TodoPanel storageKey={tk(ns, 'tasks')} ns={ns} />;
      case 'settings':    return <SettingsPanel />;
      case 'activerecall':return <ActiveRecallPanel timerDisplay={pomDisplay} storageKey={tk(ns, 'ar')} />;
      case 'feynman':     return <FeynmanPanel timerDisplay={pomDisplay} storageKey={tk(ns, 'feynman')} />;
      case 'cornell':     return <CornellPanel timerDisplay={pomDisplay} storageKey={tk(ns, 'cornell')} />;
      case 'planner':     return <PlannerPanel ns={ns} onInjectTasks={handleInjectTasks} onMaterialReady={handleMaterialReady} isTimerConfigured={isTimerConfigured} />;
      case 'flashcards':  return <FlashcardPanel ns={ns} />;
      case 'quizzes':     return <QuizzesPanel ns={ns} />;
      case 'ask':         return <AskPanel ns={ns} />;
      case 'yucca':       return <YuccaPanel ns={ns} />;
      case 'essay':       return <EssayPanel ns={ns} />;
      case 'mindmap':     return <MindMapPanel ns={ns} />;
      case 'podcast':     return <PodcastPanel ns={ns} />;
      case 'coach':       return <CoachPanel />;
      default:            return <TimerPanel onStart={handleTimerStart} isConfigured={isTimerConfigured} shakeRef={shakeRef} pomRunning={pomRunning} pomSecsLeft={pomSecsLeft} pomInterval={pomInterval} pomConfig={pomConfig} pomPhase={pomPhase} fmt={fmt} />;
    }
  };

  const showBreak = pomRunning && pomPhase === 'rest';

  return (
    <>
      {showBreak && <BreakScreen display={fmt(pomSecsLeft)} interval={pomInterval} totalIntervals={pomConfig.repeat} />}
      {escapeVisible && <EscapeOverlay countdown={escapeCountdown} onReturnFullscreen={handleReturnFullscreen} userName={userName} userGoal={userGoal} nn1={nn1} nn2={nn2} nn3={nn3} />}
      {popQuizVisible && <PopQuiz ns={ns} onComplete={handlePopQuizComplete} />}

      {!showBreak && !escapeVisible && !popQuizVisible && (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar
            activeTab={activeTab}
            onTabClick={handleTabClick}
            isLocked={!isTimerConfigured}
            materialReady={materialReady}
            pomodoroDisplay={pomDisplay}
            topicName={topic}
            onBack={onBack}
            showBack
          />
          <div className="workspace" style={{ flex: 1, background: workspaceBg }}>
            {renderPanel()}
          </div>
        </div>
      )}
    </>
  );
}
