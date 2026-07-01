import React, { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { aiAsk, isAIConfigured, parseAIJson, getTaskModel } from '../../lib/aiClient';
import { readFileAsText } from '../../lib/pdfParser';
import { useDarkMode } from '../../lib/DarkModeContext';
import AIProgressBar from '../AIProgressBar';
import useTourStep from '../../hooks/useTourStep';
import TourPointer from '../TourPointer';

const tk = (ns, key) => `camellia_${ns}_${key}`;
const FONT = "'Roboto', Arial, Helvetica, sans-serif";


function NotesRenderer({ text }) {
  if (!text) return null;
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e8d5ff' : '#2D1B0E';
  const secondaryText = isDark ? '#c4a0e0' : '#4A3525';
  const blockquoteBg = isDark ? 'rgba(42,15,62,0.6)' : '#F8F0FC';
  const highlightBg = isDark ? 'rgba(50,30,10,0.6)' : '#FFF8EC';
  const lines = text.split('\n');
  return (
    <div style={{ fontFamily: FONT, fontSize: '1rem', lineHeight: 1.85, color: textColor }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: '0.6em' }} />;
        if (/^##\s+/.test(line)) return <h2 key={i} style={{ fontFamily: FONT, fontSize: '1.25rem', fontWeight: 700, color: isDark ? '#c77dff' : '#7b2d6e', margin: '24px 0 10px', borderBottom: `2px solid ${isDark ? 'rgba(90,40,130,0.4)' : '#E8D8F0'}`, paddingBottom: 6 }}>{line.replace(/^##\s+/, '')}</h2>;
        if (/^###\s+/.test(line)) return <h3 key={i} style={{ fontFamily: FONT, fontSize: '1.1rem', fontWeight: 700, color: secondaryText, margin: '20px 0 8px' }}>{line.replace(/^###\s+/, '')}</h3>;
        if (/^---+$/.test(line.trim())) return <hr key={i} style={{ border: 'none', borderTop: `1.5px solid ${isDark ? 'rgba(90,40,130,0.3)' : '#E5D8C8'}`, margin: '18px 0' }} />;
        if (/^★\s+/.test(line)) {
          const inner = line.replace(/^★\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1');
          return <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: highlightBg, border: `1.5px solid ${isDark ? 'rgba(200,150,50,0.4)' : '#F5C842'}`, borderRadius: 8, padding: '8px 14px', margin: '6px 0' }}><span style={{ color: '#E07B39', fontSize: '1.1rem', flexShrink: 0 }}>*</span><span style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1rem', color: textColor, lineHeight: 1.7 }}>{inner}</span></div>;
        }
        if (/^>\s+/.test(line)) {
          const inner = line.replace(/^>\s+/, '');
          return <blockquote key={i} style={{ borderLeft: `4px solid ${isDark ? '#c77dff' : '#7b2d6e'}`, background: blockquoteBg, margin: '8px 0', padding: '10px 16px', borderRadius: '0 8px 8px 0', fontFamily: FONT, fontSize: '0.97rem', color: textColor, lineHeight: 1.75 }}>{formatInline(inner, isDark)}</blockquote>;
        }
        if (/^[-*]\s+/.test(line)) {
          const inner = line.replace(/^[-*]\s+/, '');
          return <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 4, paddingLeft: 8 }}><span style={{ color: isDark ? '#c77dff' : '#7b2d6e', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>•</span><span style={{ fontFamily: FONT, fontSize: '0.97rem', color: textColor, lineHeight: 1.8 }}>{formatInline(inner, isDark)}</span></div>;
        }
        return <p key={i} style={{ fontFamily: FONT, fontSize: '1rem', color: textColor, margin: '4px 0', lineHeight: 1.85 }}>{formatInline(line, isDark)}</p>;
      })}
    </div>
  );
}

function formatInline(text, isDark) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: isDark ? '#e8d5ff' : '#4A3525', fontWeight: 700 }}>{part}</strong> : part);
}

function Slider({ min, max, step = 1, value, onChange, label, unit }) {
  const pct = ((value - min) / (max - min)) * 100;
  const thumbOffset = 18 - (pct / 100) * 36;
  const isDark = document.documentElement.classList.contains('dark');
  const trackBg = isDark ? '#6d3b8a' : '#7b2d6e';
  const thumbColor = isDark ? '#c77dff' : '#7b2d6e';
  const thumbBg = isDark ? '#1e0a2e' : 'white';
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: isDark ? '#c4a8e0' : '#8A7A6A', textAlign: 'center', marginBottom: 10 }}>{label}: <strong style={{ color: thumbColor }}>{value} {unit}</strong></p>
      <div style={{ position: 'relative', height: 36, padding: '0 18px' }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2, height: '100%' }}
        />
        <div style={{ position: 'absolute', left: 18, right: 18, top: 0, bottom: 0, borderRadius: 18, background: trackBg, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: `calc(${pct}% + ${thumbOffset}px)`, top: 0, bottom: 0, width: 36, height: 36, borderRadius: '50%', background: thumbBg, border: `3px solid ${thumbColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: '0.75rem', color: thumbColor, pointerEvents: 'none', zIndex: 1 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function PlannerPanel({ ns = 'default', onInjectTasks, onMaterialReady, isTimerConfigured, notesBoxRef: notesBoxRefProp }) {
  const { dark: isDark } = useDarkMode();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);         // 0 = idle, 1-6 = active steps
  const TOTAL_STEPS = 6;
  const [goal, setGoal] = useState(() => localStorage.getItem(tk(ns, 'planner_goal')) || '');
  const [fileNames, setFileNames] = useState(() => {
    try {
      const raw = localStorage.getItem(tk(ns, 'planner_filename')) || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw].filter(Boolean);
    } catch { return []; }
  });
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [generated, setGenerated] = useState(false);
  const [activeView, setActiveView] = useState('notes');
  const [schedule, setSchedule] = useState(() => localStorage.getItem(tk(ns, 'schedule')) || '');
  const [keyPoints, setKeyPoints] = useState(() => localStorage.getItem(tk(ns, 'notes')) || '');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  // 0.5 hour increments so hoursPerDay can be a decimal like 0.5 or 1.5
  const [daysUntilTest, setDaysUntilTest] = useState(7);
  const [khanVideos, setKhanVideos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(tk(ns, 'khan_videos')) || 'null'); } catch { return null; }
  });
  const fileRef = useRef();
  const tourStep = useTourStep();
  const dropZoneRef = useRef(null);
  const localNotesBoxRef = useRef(null);
  const notesBoxRef = notesBoxRefProp || localNotesBoxRef;
  const slidersAndDropRef = useRef(null);

  useEffect(() => {
    if (schedule && keyPoints) setGenerated(true);
  }, []);

  const saveSchedule = (val) => { setSchedule(val); localStorage.setItem(tk(ns, 'schedule'), val); };
  const saveKeyPoints = (val) => { setKeyPoints(val); localStorage.setItem(tk(ns, 'notes'), val); };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      setFileNames(files.map(f => f.name));
      setPendingFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      setFileNames(files.map(f => f.name));
      setPendingFiles(files);
    }
  };

  const removeFile = () => {
    setFileNames([]);
    setPendingFiles([]);
    localStorage.removeItem(tk(ns, 'planner_filename'));
    localStorage.removeItem(tk(ns, 'raw_material'));
  };

  const handleGenerate = async () => {
    if (pendingFiles.length === 0 && !localStorage.getItem(tk(ns, 'raw_material'))) {
      alert('Please upload a file first.');
      return;
    }
    if (!isAIConfigured()) {
      alert('No AI key configured. Go to Settings in the sidebar to add your API key first.');
      return;
    }

    let rawText = '';
    if (pendingFiles.length > 0) {
      setLoading(true);
      setStep(0);
      setLoadingStep('Reading your files...');
      try {
        const textParts = [];
        for (const file of pendingFiles) {
          const isImage = file.type.startsWith('image/');
          if (isImage) {
            // Convert to base64 data URL and send directly to the vision model (BYOK, no server)
            setLoadingStep(`Reading handwritten notes with AI vision (${file.name})...`);
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = e => resolve(e.target.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const transcribed = await aiAsk(
              `You are an expert at reading handwritten and printed notes. Transcribe ALL text visible in this image completely and accurately. Preserve structure, headings, bullet points, and formatting as much as possible. Include every word you can read.`,
              `Please transcribe all text from this image of notes.`,
              { maxTokens: 4000, file_urls: [dataUrl] }
            );
            if (!transcribed || transcribed.trim().length < 20) {
              alert(`Could not read text from "${file.name}". Make sure the photo is clear and well-lit.`);
              continue;
            }
            textParts.push(transcribed);
          } else {
            setLoadingStep(`Reading ${file.name}...`);
            const text = await readFileAsText(file);
            if (!text || text.trim().length < 30) {
              alert(`Could not extract readable text from "${file.name}". Try a .txt or .pdf with selectable text.`);
              continue;
            }
            textParts.push(text);
          }
        }
        rawText = textParts.join('\n\n---\n\n');
        if (!rawText || rawText.trim().length < 30) {
          setLoading(false);
          return;
        }
        localStorage.setItem(tk(ns, 'planner_filename'), JSON.stringify(pendingFiles.map(f => f.name)));
        localStorage.setItem(tk(ns, 'planner_goal'), goal);
        const storeText = rawText.length > 500000
          ? rawText.slice(0, 200000) + '\n\n[...]\n\n' + rawText.slice(Math.floor(rawText.length / 2) - 50000, Math.floor(rawText.length / 2) + 50000) + '\n\n[...]\n\n' + rawText.slice(-200000)
          : rawText;
        localStorage.setItem(tk(ns, 'raw_material'), storeText);
      } catch (err) {
        alert('Error reading files: ' + err.message);
        setLoading(false);
        return;
      }
    } else {
      rawText = localStorage.getItem(tk(ns, 'raw_material')) || '';
      setLoading(true);
      setStep(0);
    }

    const goalCtx = goal.trim() ? `\nStudent goal: "${goal}"` : '';
    // For large files, sample intelligently: take beginning, middle, and end chunks
    const chunkSize = 4500;
    let truncated;
    if (rawText.length <= chunkSize * 3) {
      truncated = rawText.slice(0, 14000);
    } else {
      const mid = Math.floor(rawText.length / 2);
      truncated = rawText.slice(0, chunkSize) + '\n\n[...middle section...]\n\n' + rawText.slice(mid - chunkSize / 2, mid + chunkSize / 2) + '\n\n[...later section...]\n\n' + rawText.slice(-chunkSize);
    }
    const studyCtx = `\nStudent has ${hoursPerDay} hours per day and ${daysUntilTest} days until the test. Total available: ${hoursPerDay * daysUntilTest} hours.`;

    try {
      // Step 1: Detailed Notes
      setStep(1); setLoadingStep('Generating comprehensive notes…');
      const notesRaw = await aiAsk(
        `You are an expert study notes generator. Create extremely detailed, multi-section study notes from the provided material. Use markdown formatting: ## for main sections, ### for subsections, * **text** for key points, - for bullets, > for important quotes/definitions. Include: key concepts, definitions, examples, relationships between ideas, and memory tips. Do NOT copy-paste raw text, synthesize and explain. Make it thorough like a professional textbook summary. IMPORTANT: Do NOT include any dates, file names, author names, page numbers, or document metadata in the notes. Only include actual subject matter.`,
        `Create comprehensive study notes from this material.${goalCtx}\n\nMATERIAL:\n${truncated}`,
        { maxTokens: 3000, model: getTaskModel('notes') }
      );
      saveKeyPoints(notesRaw);

      // Step 2: Study Schedule
      setStep(2); setLoadingStep('Building your study schedule…');
      const scheduleRaw = await aiAsk(
        `You are an expert study planner. Create a realistic multi-day study schedule with spaced repetition built in. IMPORTANT RULES: (1) Never use specific clock times. Use durations like "1 hour" or "45 minutes". (2) Distribute hours across days. (3) Use ## for day headers, use "- " bullet points for all activities (NEVER use commas as list separators), use > for tips. (4) Include spaced repetition: schedule review sessions for previous material on later days. Format: "- 45 minutes: Active Recall on Chapter 3". Optimize for retention.`,
        `Create a study schedule with spaced repetition. ${studyCtx}${goalCtx}\n\nMATERIAL SUMMARY:\n${truncated.slice(0, 6000)}\n\nIMPORTANT: Use "- " bullet points for every activity. NO comma-separated lists. Distribute ${hoursPerDay} hours across ${daysUntilTest} days.`,
        { maxTokens: 2000, model: getTaskModel('schedule') }
      );
      saveSchedule(scheduleRaw);

      // Step 3: Flashcards
      setStep(3); setLoadingStep('Generating smart flashcards…');
      const flashcardsRaw = await aiAsk(
        `You are an expert flashcard creator. Generate exactly 20 high-quality flashcards from the study material. Focus on key concepts, definitions, formulas, processes, and important facts. NEVER include metadata like dates, file names, or author info. Each card should test genuine understanding.`,
        `Generate 20 flashcards from this material.${goalCtx}\n\nMATERIAL:\n${truncated.slice(0, 10000)}\n\nReturn ONLY a JSON array: [{"term": "...", "definition": "..."}, ...]`,
        { maxTokens: 3000, model: getTaskModel('flashcards') }
      );
      try {
        const cards = parseAIJson(flashcardsRaw);
        const validCards = Array.isArray(cards)
          ? cards.filter(c => c.term && c.definition && c.term.length > 2 && c.definition.length > 5).map(c => ({ ...c, notes: '' }))
          : [];
        if (validCards.length > 0) localStorage.setItem(tk(ns, 'flashcard_deck'), JSON.stringify(validCards));
      } catch {}

      // Step 4: Quiz Questions
      setStep(4); setLoadingStep('Creating quiz questions…');
      const quizRaw = await aiAsk(
        `You are an expert quiz creator. Generate exactly 20 multiple-choice quiz questions from the study material. Each question should test understanding, not just memorization. Make distractors plausible but clearly wrong. Questions must be based on the actual content, no metadata, no file dates.`,
        `Generate 20 multiple choice questions from this material.${goalCtx}\n\nMATERIAL:\n${truncated.slice(0, 10000)}\n\nReturn ONLY a JSON array: [{"q": "question text", "options": ["A", "B", "C", "D"], "correct": 0}] where correct is the 0-based index of the right answer.`,
        { maxTokens: 3000, model: getTaskModel('quiz_gen') }
      );
      try {
        const questions = parseAIJson(quizRaw);
        const validQs = Array.isArray(questions)
          ? questions.filter(q => q.q && Array.isArray(q.options) && q.options.length === 4 && typeof q.correct === 'number')
          : [];
        if (validQs.length > 0) localStorage.setItem(tk(ns, 'ai_questions'), JSON.stringify(validQs));
      } catch {}

      // Step 5: Khan Academy videos — real course URLs
      setStep(5); setLoadingStep('Finding related Khan Academy videos…');
      try {
        const khanRaw = await aiAsk(
          `You are an expert Khan Academy curator with deep knowledge of every Khan Academy course URL. Your task is to return REAL, EXISTING Khan Academy course or lesson URLs — NOT search links. Use this URL structure: https://www.khanacademy.org/{subject}/{course}/{unit}/{lesson}. Examples of real URLs: https://www.khanacademy.org/science/ap-biology/natural-selection/population-genetics/e/population-genetics, https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratic-functions-equations/x2f8bb11595b61c86:quadratic-formula-a1/v/using-the-quadratic-formula, https://www.khanacademy.org/science/chemistry/chemical-reactions-stoichiome/stoichiometry-ideal/v/stoichiometry. Return only URLs you are highly confident exist.`,
          `Find 6 real Khan Academy course/lesson URLs most relevant to this study material.\n\nMATERIAL SUMMARY:\n${truncated.slice(0, 4000)}\n\nReturn ONLY a JSON array: [{"title": "Descriptive lesson title", "url": "https://www.khanacademy.org/real/course/path", "topic": "subject area"}]\n\nIMPORTANT: Use real course paths, NOT search URLs. Only return URLs you are confident exist.`,
          { maxTokens: 1000, model: getTaskModel('khan_videos') }
        );
        const videos = parseAIJson(khanRaw);
        if (Array.isArray(videos) && videos.length > 0) {
          // Validate URLs: must be khanacademy.org with a real path (not search)
          const candidateVideos = videos.filter(v =>
            v.title && v.url &&
            v.url.includes('khanacademy.org') &&
            !v.url.includes('search?') &&
            v.url.split('/').length > 4
          );
          // Head-check each URL to confirm it exists (avoid broken links)
          const validVideos = [];
          for (const v of candidateVideos) {
            try {
              const resp = await fetch(v.url, { method: 'HEAD', mode: 'no-cors' });
              // no-cors always gives opaque response — treat non-error as valid
              validVideos.push(v);
            } catch {
              // Network error = skip
            }
          }
          const toSave = validVideos.length > 0 ? validVideos : candidateVideos; // fallback: keep candidates if all fail
          if (toSave.length > 0) {
            localStorage.setItem(tk(ns, 'khan_videos'), JSON.stringify(toSave));
            setKhanVideos(toSave);
          }
        }
      } catch {}

      // Step 6: Todo tasks
      setStep(6); setLoadingStep('Generating your to-do tasks…');
      const tasksRaw = await aiAsk(
        `You are a study coach. Generate 10 specific, actionable study tasks based on the material. Each task should be a concrete action like "Summarize the three stages of X", "Draw a diagram of Y", "Practice Z formula with 5 examples". Write them as a student would, clear, motivating, doable. No vague tasks.`,
        `Generate 10 study tasks for this material.${goalCtx}\n\nMATERIAL:\n${truncated.slice(0, 6000)}\n\nReturn ONLY a JSON array of strings: ["task 1", "task 2", ...]`,
        { maxTokens: 800, model: getTaskModel('todo_tasks') }
      );
      try {
        const tasks = parseAIJson(tasksRaw);
        if (Array.isArray(tasks) && tasks.length > 0 && onInjectTasks) onInjectTasks(tasks.slice(0, 12));
      } catch {}

      setGenerated(true);
      setLoadingStep('');
      setStep(0);
      setPendingFiles([]);
      if (onMaterialReady) onMaterialReady();
    } catch (err) {
      // Only non-rate-limit errors reach here (bad key, network down, etc.)
      // Rate limit errors are handled silently by the governor with infinite retries.
      setLoadingStep('Check your API key in Settings and try again.');
    }
    setLoading(false);
    setStep(0);
  };

  const handleReset = () => {
    setGenerated(false); setSchedule(''); setKeyPoints(''); setKhanVideos(null);
    ['schedule', 'notes', 'planner_filename', 'raw_material', 'flashcard_deck', 'ai_questions', 'timer_configured', 'khan_videos'].forEach(k => localStorage.removeItem(tk(ns, k)));
    setFileNames([]);
    setPendingFiles([]);
  };

  if (generated && (schedule || keyPoints)) {
    const isDarkG = document.documentElement.classList.contains('dark');
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: isDarkG ? '#c77dff' : '#4A3525', fontFamily: FONT, margin: 0 }}>AI Study Planner</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {fileNames.length > 0 && <span style={{ fontFamily: FONT, fontSize: '0.8rem', color: '#9A8A7A' }}>File{fileNames.length > 1 ? 's' : ''}: {fileNames.join(', ')}</span>}
            <button onClick={handleReset} style={{ background: 'none', border: '1px solid #C5B8A8', borderRadius: 8, padding: '6px 14px', fontFamily: FONT, fontSize: '0.8rem', color: '#7A6A5A', cursor: 'pointer' }}>Upload New File</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${isDarkG ? 'rgba(90,40,130,0.4)' : '#E5D8C8'}`, width: 'fit-content', backdropFilter: 'blur(12px)' }}>
          {[{ id: 'notes', label: 'Detailed Notes' }, { id: 'schedule', label: 'Study Schedule' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id)} style={{ padding: '10px 24px', fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer', background: activeView === tab.id ? '#7b2d6e' : (isDarkG ? 'rgba(22,14,36,0.6)' : 'rgba(255,255,255,0.8)'), color: activeView === tab.id ? 'white' : (isDarkG ? '#c4a0e0' : '#7A6A5A'), transition: 'all 0.2s' }}>{tab.label}</button>
          ))}
        </div>

        {activeView === 'notes' && (
          <div ref={notesBoxRef} style={{ background: isDarkG ? 'rgba(14,6,26,0.85)' : 'rgba(255,255,255,0.8)', borderRadius: 14, border: '2px solid #7b2d6e', padding: isMobile ? '20px 16px' : '36px 44px', maxWidth: '100%', minHeight: 600, overflowY: 'auto', backdropFilter: 'blur(16px)' }}>
            <NotesRenderer text={keyPoints} />
          </div>
        )}
        {activeView === 'schedule' && (
          <div style={{ background: isDarkG ? 'rgba(22,14,36,0.75)' : 'rgba(255,255,255,0.8)', borderRadius: 14, border: isDarkG ? '2px solid rgba(90,40,130,0.5)' : '2px solid #4A3525', padding: isMobile ? '20px 16px' : '36px 44px', maxWidth: '100%', minHeight: 600, overflowY: 'auto', backdropFilter: 'blur(16px)' }}>
            <NotesRenderer text={schedule} />
          </div>
        )}
        {khanVideos && khanVideos.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '1.05rem', color: isDarkG ? '#c77dff' : '#4A3525', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#1c6b1c', color: 'white', borderRadius: 6, padding: '2px 10px', fontSize: '0.8rem' }}>Khan Academy</span>
              Related Videos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
              {khanVideos.map((v, i) => (
                <a key={i} href={v.url} target="_blank" rel="noreferrer" style={{
                  display: 'block', textDecoration: 'none',
                  background: isDarkG ? 'rgba(14,6,26,0.8)' : 'white',
                  border: isDarkG ? '1.5px solid rgba(28,107,28,0.5)' : '1.5px solid #bbf7bb',
                  borderRadius: 10, padding: '12px 14px',
                  transition: 'all 0.18s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', flexShrink: 0, fontWeight: 700, color: '#1c6b1c' }}>Play</span>
                    <div>
                      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.82rem', color: isDarkG ? '#a0e0a0' : '#1c6b1c', margin: '0 0 3px', lineHeight: 1.4 }}>{v.title}</p>
                      {v.topic && <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: isDarkG ? '#7a9a7a' : '#5a8a5a', margin: 0 }}>{v.topic}</p>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: '#B0A090', textAlign: 'center', marginTop: 14 }}>
          Generated by AI from your material, your API key, no Camellia servers
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '2rem', fontWeight: 600, color: isDark ? '#c77dff' : '#4A3525', fontFamily: FONT, marginBottom: 28, textAlign: 'center' }}>Camellia AI Study Planner</h1>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {!isAIConfigured() && (
          <div style={{ background: isDark ? 'rgba(60,20,100,0.3)' : '#f3e8ff', border: '1.5px solid #7b2d6e', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontFamily: FONT, fontSize: '0.9rem', color: isDark ? '#e0b8ff' : '#7b2d6e' }}>
            <strong>No AI key configured.</strong> Go to <strong>Settings</strong> in the sidebar to add your API key first.
          </div>
        )}

        <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: isDark ? '#c4a0e0' : '#8A7A6A', marginBottom: 8 }}>Study goal and due date (optional, helps tailor the schedule)</p>
        <textarea
          className="orange-input"
          rows={2}
          placeholder="(ex. Reviewing for chemistry exam in 4 days, chapters 5-8)"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          style={{ marginBottom: 20, resize: 'none', fontFamily: FONT, background: isDark ? 'rgba(30,10,46,0.7)' : undefined, color: isDark ? '#e8d5ff' : undefined }}
        />

        {tourStep === 3 && <TourPointer anchorRef={slidersAndDropRef} step={3} text="Insert your notes here as well as due dates to get access to all features!" placement="bottom" />}
        <div ref={slidersAndDropRef}>
          {/* Sliders */}
          <Slider min={0.5} max={12} step={0.5} value={hoursPerDay} onChange={setHoursPerDay} label="Hours dedicated for this material per day" unit="hrs/day" />
          <Slider min={1} max={60} value={daysUntilTest} onChange={setDaysUntilTest} label="Days until test" unit="days" />

          {/* File drop zone */}
          <div
            ref={dropZoneRef}
            className={`drop-zone${dragOver ? ' drag-over' : ''}`}
            style={{ marginBottom: 16, minHeight: 140, border: '2px solid #E07B39', position: 'relative', background: isDark ? 'rgba(30,10,46,0.5)' : undefined, backdropFilter: 'blur(12px)' }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" multiple accept=".txt,.pdf,.md,.doc,.docx,text/plain,application/pdf,image/*" style={{ display: 'none' }} onChange={handleFileInput} />
            <button style={{ background: '#1a1a1a', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontFamily: FONT, fontSize: '0.9rem', cursor: 'pointer', pointerEvents: 'none' }}>Add Files or Photos</button>
            <p style={{ fontFamily: FONT, fontSize: '0.82rem', color: '#9A8A7A', marginTop: 8 }}>Drag here or select multiple: .txt, .pdf, .md, or photos of handwritten notes</p>
            {fileNames.length > 0 && <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: '#7b2d6e', marginTop: 4 }}>{fileNames.length} file{fileNames.length > 1 ? 's' : ''} ready: {fileNames.join(', ')}</p>}
            {fileNames.length > 0 && <p onClick={e => { e.stopPropagation(); removeFile(); }} style={{ position: 'absolute', bottom: 10, right: 14, fontFamily: FONT, fontSize: '0.75rem', color: '#7b2d6e', cursor: 'pointer', textDecoration: 'underline' }}>remove files</p>}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || (pendingFiles.length === 0 && !localStorage.getItem(tk(ns, 'raw_material')))}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? (isDark ? 'rgba(40,15,70,0.6)' : '#E5D8C8') : '#7b2d6e',
              color: loading ? (isDark ? '#8060a0' : '#9A8A7A') : 'white',
              border: 'none',
              borderRadius: 12,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 8,
            }}
          >
            {loading ? 'Generating…' : 'Generate Study Plan'}
          </button>
        </div>

        {loading && (
          <div style={{ marginTop: 16 }}>
            <AIProgressBar progress={step === 0 ? 5 : Math.round((step / TOTAL_STEPS) * 100)} label={loadingStep || 'Preparing…'} />
          </div>
        )}
      </div>
    </div>
  );
}
