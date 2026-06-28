import React, { useState, useEffect, useRef } from 'react';
import { aiAsk, isAIConfigured, getAIConfig } from '../../lib/aiClient';
import { useDarkMode } from '../../lib/DarkModeContext';

const FONT = "'Roboto', Arial, Helvetica, sans-serif";
const tk = (ns, key) => `camellia_${ns}_${key}`;

// Detect Chrome
function isChrome() {
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

// Pick best two voices: prefer Google US English voices for Chrome
function pickVoices(allVoices) {
  if (isChrome()) {
    // Google US English voices are typically named "Google US English" numbered
    const googleUS = allVoices.filter(v => v.name.toLowerCase().includes('google') && v.lang.startsWith('en'));
    if (googleUS.length >= 2) {
      // Use voices at index 4 and 5 (0-based), or last two if fewer available
      const v1 = googleUS[Math.min(4, googleUS.length - 1)];
      const v2 = googleUS[Math.min(5, googleUS.length - 1)];
      return { voice1: v1, voice2: v2 };
    }
  }
  // Fallback: find two distinct English voices
  const english = allVoices.filter(v => v.lang.startsWith('en'));
  const voice1 = english.find(v => v.name.includes('Daniel') || v.name.includes('Fred') || v.name.toLowerCase().includes('male')) || english[0] || allVoices[0];
  const voice2 = english.find(v => v !== voice1 && (v.name.includes('Alex') || v.name.includes('Tom') || v.name.includes('George'))) || english[Math.min(1, english.length - 1)] || allVoices[Math.min(1, allVoices.length - 1)];
  return { voice1, voice2 };
}

export default function PodcastPanel({ ns = 'default' }) {
  const { dark } = useDarkMode();
  const [customPrompt, setCustomPrompt] = useState('');
  const [script, setScript] = useState(() => localStorage.getItem(tk(ns, 'podcast_script')) || '');
  const [audioUrl, setAudioUrl] = useState(() => localStorage.getItem(tk(ns, 'podcast_audio_url')) || '');
  const [generating, setGenerating] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [error, setError] = useState('');
  const [audioProgress, setAudioProgress] = useState('');
  const audioRef = useRef(null);
  const stoppedRef = useRef(false);
  const pausedRef = useRef(false);
  const lineIndexRef = useRef(0);
  const orderedLinesRef = useRef([]);
  const playbackRateRef = useRef(1.0);
  const voicesRef = useRef({ voice1: null, voice2: null });
  const speakNextRef = useRef(null);

  const rawMaterial = localStorage.getItem(tk(ns, 'raw_material')) || '';
  const hasMaterial = rawMaterial.length > 50;
  const config = getAIConfig();
  const isOpenAI = config.provider === 'openai';

  // Cancel speech when unmounting
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Keep rate ref in sync
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  // Sync audio player playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioUrl]);

  const parsedLines = () => {
    if (!script) return [];
    return script.split('\n').filter(l => l.trim()).flatMap(line => {
      if (line.startsWith('Winston:')) return [{ speaker: 'Winston', text: line.slice(8).trim() }];
      if (line.startsWith('Jacob:')) return [{ speaker: 'Jacob', text: line.slice(6).trim() }];
      return [];
    });
  };

  const generateScript = async () => {
    if (!isAIConfigured()) { setError('No AI key configured. Go to Settings.'); return; }
    if (!hasMaterial) { setError('No study material found. Upload your notes in AI Study Planner first.'); return; }
    setGenerating(true); setError(''); setAudioUrl(''); setCurrentLine(0); setTotalLines(0);
    localStorage.removeItem(tk(ns, 'podcast_audio_url'));
    const customInstructions = customPrompt.trim() ? `\nExtra instructions: ${customPrompt.trim()}` : '';
    try {
      const podcastScript = await aiAsk(
        `You are a professional podcast script writer. Create an engaging, educational podcast script for two hosts: Winston (curious, enthusiastic) and Jacob (knowledgeable, witty). Format EVERY spoken line as exactly "Winston:" or "Jacob:" followed by their dialogue. Include detailed exploration of all key concepts, test tips, memorization tricks, real-world examples, analogies, quizzes between hosts, spaced repetition of key facts, and a thorough summary. Natural pacing, back-and-forth conversation, light humor. Do not use em-dashes. Use commas or restructure sentences instead.`,
        `Create a detailed 10-minute podcast script (80+ exchanges between Winston and Jacob) covering ALL major topics. Each line must start with "Winston:" or "Jacob:".${customInstructions}\n\nSTUDY MATERIAL:\n${rawMaterial.slice(0, 16000)}`,
        { maxTokens: 6000 }
      );
      setScript(podcastScript);
      localStorage.setItem(tk(ns, 'podcast_script'), podcastScript);
    } catch (e) { setError('Error generating script: ' + e.message); }
    setGenerating(false);
  };

  const generateMP3Audio = async () => {
    if (!script) { setError('Generate the script first.'); return; }
    setGeneratingAudio(true); setError(''); setAudioProgress('Splitting script by speaker...');
    const lines = parsedLines();
    try {
      const apiKey = config.apiKey;
      const audioBuffers = [];
      for (let i = 0; i < lines.length; i++) {
        const { speaker, text } = lines[i];
        setAudioProgress(`Generating audio ${i + 1}/${lines.length}...`);
        const voice = speaker === 'Winston' ? 'onyx' : 'echo';
        const resp = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'tts-1', input: text.slice(0, 4096), voice, speed: 1.0 }),
        });
        if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err?.error?.message || `TTS error ${resp.status}`); }
        audioBuffers.push(await resp.arrayBuffer());
      }
      setAudioProgress('Merging audio...');
      const totalLength = audioBuffers.reduce((sum, b) => sum + b.byteLength, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of audioBuffers) { merged.set(new Uint8Array(buf), offset); offset += buf.byteLength; }
      const blob = new Blob([merged], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setAudioProgress('');
    } catch (e) { setError('Audio error: ' + e.message); setAudioProgress(''); }
    setGeneratingAudio(false);
  };

  // Core speak function — uses setTimeout to advance, which works reliably in Chrome
  const buildSpeakLoop = (lines, startIndex) => {
    stoppedRef.current = false;
    pausedRef.current = false;
    lineIndexRef.current = startIndex;
    orderedLinesRef.current = lines;

    const allVoices = window.speechSynthesis.getVoices();
    const { voice1, voice2 } = pickVoices(allVoices);
    voicesRef.current = { voice1, voice2 };

    const speakNext = () => {
      if (stoppedRef.current) return;
      if (pausedRef.current) { setTimeout(speakNext, 200); return; }

      const i = lineIndexRef.current;
      if (i >= orderedLinesRef.current.length) {
        setIsPlaying(false);
        setGeneratingAudio(false);
        setCurrentLine(0);
        return;
      }

      const { speaker, text } = orderedLinesRef.current[i];
      setCurrentLine(i + 1);

      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = speaker === 'Winston' ? voicesRef.current.voice1 : voicesRef.current.voice2;
      utter.pitch = speaker === 'Winston' ? 0.85 : 1.1;
      utter.rate = playbackRateRef.current;

      // Use both onend AND a timeout fallback to handle Chrome's onend bug
      let advanced = false;
      const advance = () => {
        if (advanced) return;
        advanced = true;
        lineIndexRef.current++;
        // Small gap between utterances
        setTimeout(speakNext, 80);
      };

      utter.onend = advance;
      utter.onerror = advance; // also advance on error

      window.speechSynthesis.speak(utter);

      // Chrome sometimes never fires onend — estimate duration as fallback
      const estimatedMs = Math.max((text.length / (playbackRateRef.current * 14)) * 1000, 500);
      setTimeout(() => {
        // Only fire if speech synthesis isn't actively speaking anymore
        if (!window.speechSynthesis.speaking) advance();
      }, estimatedMs + 500);
    };

    speakNextRef.current = speakNext;
    return speakNext;
  };

  const playBrowserAudio = () => {
    if (!('speechSynthesis' in window)) { setError('Your browser does not support speech synthesis.'); return; }
    window.speechSynthesis.cancel();

    const lines = parsedLines();
    setTotalLines(lines.length);
    setCurrentLine(0);
    setIsPlaying(true);
    setGeneratingAudio(true);

    const allVoices = window.speechSynthesis.getVoices();
    const startSpeaking = () => {
      const speakNext = buildSpeakLoop(lines, 0);
      speakNext();
    };

    if (allVoices.length === 0) {
      window.speechSynthesis.onvoiceschanged = startSpeaking;
    } else {
      startSpeaking();
    }
  };

  const stopBrowserAudio = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setGeneratingAudio(false);
    setCurrentLine(0);
  };

  const seekBrowserAudio = (lineNum) => {
    window.speechSynthesis.cancel();
    stoppedRef.current = false;
    pausedRef.current = false;
    const lines = orderedLinesRef.current;
    if (!lines.length) return;
    const speakNext = buildSpeakLoop(lines, lineNum);
    speakNext();
  };

  const downloadScript = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `camellia-podcast-${ns}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a'); a.href = audioUrl; a.download = `camellia-podcast-${ns}.mp3`; a.click();
  };

  const clearPodcast = () => {
    stopBrowserAudio();
    setScript(''); setAudioUrl(''); setCurrentLine(0); setTotalLines(0);
    localStorage.removeItem(tk(ns, 'podcast_script'));
    localStorage.removeItem(tk(ns, 'podcast_audio_url'));
  };

  // Theme colors — pure dark purple only
  const cardBg = dark ? 'rgba(18,10,30,0.92)' : 'rgba(255,255,255,0.7)';
  const borderCol = dark ? 'rgba(160,80,255,0.35)' : 'rgba(200,180,160,0.6)';
  const textPrimary = dark ? '#f0e6ff' : '#2D1B0E';
  const textSecondary = dark ? '#c8a8f0' : '#7A6A5A';
  const inputBg = dark ? 'rgba(14,6,26,0.9)' : 'rgba(255,255,255,0.9)';
  const glassStyle = { backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(180,140,120,0.12)' };

  const allLines = parsedLines();
  const displayLines = script ? script.split('\n').filter(l => l.trim()) : [];

  return (
    <div className="fade-in" style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: '2rem', color: dark ? '#e8ccff' : '#4A3525', marginBottom: 6 }}>Podcast</h1>
      <p style={{ fontFamily: FONT, fontSize: '0.9rem', color: textSecondary, marginBottom: 20 }}>
        Generate a 10-minute educational podcast with Winston and Jacob.
      </p>

      {/* Info banner */}
      <div style={{ background: dark ? 'rgba(14,6,26,0.9)' : 'rgba(240,248,255,0.9)', border: `1.5px solid ${isOpenAI ? '#7b2d6e' : (dark ? 'rgba(160,80,255,0.4)' : '#7b2d6e')}`, borderRadius: 12, padding: '12px 18px', marginBottom: 16, ...glassStyle }}>
        <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: dark ? '#d4b0ff' : '#7b2d6e', margin: 0 }}>
          {isOpenAI
            ? 'OpenAI: Generate an MP3 podcast with two real voices after creating the script.'
            : `Browser TTS${isChrome() ? ' — Chrome detected, using Google high-quality voices' : ''}. Switch to OpenAI for MP3.`}
        </p>
      </div>

      {error && <div style={{ background: dark ? 'rgba(198,40,40,0.15)' : '#FFF0F0', border: '1.5px solid #F44336', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontFamily: FONT, fontSize: '0.85rem', color: dark ? '#ff8080' : '#C62828' }}>{error}</div>}

      {/* Customize */}
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 14, padding: '20px', marginBottom: 16, ...glassStyle }}>
        <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: '0.95rem', color: textPrimary, marginBottom: 6 }}>Customize (optional)</p>
        <textarea
          rows={2}
          style={{ width: '100%', border: `1.5px solid ${dark ? 'rgba(160,80,255,0.5)' : '#7b2d6e'}`, borderRadius: 10, padding: '10px 14px', fontFamily: FONT, fontSize: '0.9rem', resize: 'none', background: inputBg, color: textPrimary, outline: 'none', boxSizing: 'border-box' }}
          placeholder="(optional) Focus more on formulas, add mnemonics, make it more casual..."
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={generateScript} disabled={generating || !hasMaterial || !isAIConfigured()}
          style={{ flex: 1, minWidth: 160, padding: '13px', background: generating ? (dark ? 'rgba(60,30,100,0.5)' : '#E5D8C8') : '#7b2d6e', color: generating ? textSecondary : 'white', border: 'none', borderRadius: 12, fontFamily: FONT, fontWeight: 700, fontSize: '1rem', cursor: generating ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
          {generating ? 'Generating script...' : script ? 'Regenerate Script' : 'Generate Script (10 min)'}
        </button>
        {script && isOpenAI && !generatingAudio && (
          <button onClick={generateMP3Audio}
            style={{ padding: '13px 18px', background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 12, fontFamily: FONT, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}>
            {audioUrl ? 'Regenerate MP3' : 'Generate MP3 Audio'}
          </button>
        )}
        {script && (
          <button onClick={downloadScript} style={{ padding: '13px 16px', background: dark ? 'rgba(60,20,100,0.8)' : '#7b2d6e', color: 'white', border: 'none', borderRadius: 12, fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>Script (.txt)</button>
        )}
        {audioUrl && (
          <button onClick={downloadAudio} style={{ padding: '13px 16px', background: '#7b2d6e', color: 'white', border: 'none', borderRadius: 12, fontFamily: FONT, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>Download MP3</button>
        )}
        {script && (
          <button onClick={clearPodcast} style={{ padding: '13px 14px', background: 'none', border: `1px solid ${borderCol}`, borderRadius: 12, fontFamily: FONT, fontSize: '0.85rem', color: textSecondary, cursor: 'pointer', transition: 'all 0.2s' }}>Clear</button>
        )}
      </div>

      {/* Browser speech player */}
      {script && !isOpenAI && (
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 18, padding: '20px 24px', marginBottom: 16, ...glassStyle }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, marginBottom: 4 }}>
            {isPlaying ? `Now: ${allLines[currentLine - 1]?.speaker || ''}` : 'Winston & Jacob Podcast'}
          </p>
          <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, marginBottom: 14 }}>
            {totalLines > 0 ? `${currentLine} / ${totalLines} exchanges` : `${allLines.length} exchanges`}
          </p>

          {/* Progress slider */}
          <div style={{ marginBottom: 14 }}>
            <input
              type="range" min={0} max={totalLines || allLines.length} value={currentLine}
              onChange={e => {
                const val = Number(e.target.value);
                if (isPlaying || generatingAudio) seekBrowserAudio(val);
                else setCurrentLine(val);
              }}
              style={{ width: '100%', accentColor: '#7b2d6e', cursor: 'pointer', height: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: '0.7rem', color: textSecondary, marginTop: 2 }}>
              <span>{currentLine}</span><span>{totalLines || allLines.length}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (isPlaying) {
                  pausedRef.current = true;
                  window.speechSynthesis.pause();
                  setIsPlaying(false);
                } else if (generatingAudio) {
                  pausedRef.current = false;
                  window.speechSynthesis.resume();
                  setIsPlaying(true);
                } else {
                  playBrowserAudio();
                }
              }}
              style={{ width: 48, height: 48, borderRadius: '50%', background: '#7b2d6e', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', flexShrink: 0 }}
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20"/></svg>
              )}
            </button>

            <button
              onClick={stopBrowserAudio}
              disabled={!generatingAudio && !isPlaying}
              style={{ width: 40, height: 40, borderRadius: '50%', background: dark ? 'rgba(60,30,100,0.6)' : '#ede0f5', border: `1px solid ${borderCol}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', opacity: (!generatingAudio && !isPlaying) ? 0.4 : 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={dark ? '#e8d5ff' : '#7b2d6e'}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}>Speed</span>
              {[0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                <button key={rate} onClick={() => setPlaybackRate(rate)}
                  style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${playbackRate === rate ? '#7b2d6e' : borderCol}`, background: playbackRate === rate ? '#7b2d6e' : (dark ? 'rgba(30,10,50,0.6)' : 'rgba(255,255,255,0.7)'), color: playbackRate === rate ? 'white' : textSecondary, fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {isPlaying && (
            <p style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary, marginTop: 10, fontStyle: 'italic' }}>
              {allLines[currentLine - 1]?.text?.slice(0, 100)}{(allLines[currentLine - 1]?.text?.length || 0) > 100 ? '...' : ''}
            </p>
          )}
        </div>
      )}

      {/* MP3 player */}
      {audioUrl && isOpenAI && (
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 18, padding: '20px 24px', marginBottom: 16, ...glassStyle }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, marginBottom: 10 }}>Audio Podcast</p>
          <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%' }} onPlay={() => { if (audioRef.current) audioRef.current.playbackRate = playbackRate; }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT, fontSize: '0.78rem', color: textSecondary }}>Speed:</span>
            {[0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
              <button key={rate} onClick={() => setPlaybackRate(rate)}
                style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${playbackRate === rate ? '#7b2d6e' : borderCol}`, background: playbackRate === rate ? '#7b2d6e' : (dark ? 'rgba(30,10,50,0.6)' : 'rgba(255,255,255,0.7)'), color: playbackRate === rate ? 'white' : textSecondary, fontFamily: FONT, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                {rate}x
              </button>
            ))}
          </div>
        </div>
      )}

      {generatingAudio && isOpenAI && (
        <div style={{ textAlign: 'center', padding: '20px', background: cardBg, borderRadius: 14, border: `1px solid ${borderCol}`, marginBottom: 16, ...glassStyle }}>
          <p style={{ fontFamily: FONT, fontWeight: 600, color: '#c77dff', marginBottom: 4 }}>{audioProgress || 'Generating audio...'}</p>
          <p style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary }}>This may take 2-5 minutes. Each line is processed individually.</p>
        </div>
      )}

      {generating && (
        <div style={{ textAlign: 'center', padding: '28px', background: cardBg, borderRadius: 14, border: `1px solid ${borderCol}`, ...glassStyle }}>
          <p style={{ fontFamily: FONT, fontWeight: 600, color: '#c77dff', marginBottom: 6 }}>AI is writing your 10-minute podcast...</p>
          <p style={{ fontFamily: FONT, fontSize: '0.85rem', color: textSecondary }}>This takes 30-60 seconds.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7b2d6e', opacity: 0.3 + i * 0.17 }} />)}
          </div>
        </div>
      )}

      {/* Script display */}
      {script && !generating && (
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 14, overflow: 'hidden', ...glassStyle }}>
          <div style={{ background: dark ? 'rgba(14,6,26,0.9)' : 'rgba(248,244,238,0.9)', borderBottom: `1px solid ${borderCol}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: textPrimary, margin: 0 }}>Podcast Script</p>
              <p style={{ fontFamily: FONT, fontSize: '0.72rem', color: textSecondary, margin: '2px 0 0' }}>
                ~10 minutes, {allLines.length} exchanges
              </p>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{name:'Winston', color:'#a855f7'}, {name:'Jacob', color:'#c77dff'}].map(h => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: h.color }} />
                  <span style={{ fontFamily: FONT, fontSize: '0.75rem', color: textSecondary }}>{h.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '20px 24px', maxHeight: 520, overflowY: 'auto' }}>
            {displayLines.map((line, i) => {
              const isWinston = line.startsWith('Winston:');
              const isJacob = line.startsWith('Jacob:');
              const speaker = isWinston ? 'Winston' : isJacob ? 'Jacob' : null;
              const text = speaker ? line.slice(speaker.length + 1).trim() : line;
              if (!speaker) return <p key={i} style={{ fontFamily: FONT, fontSize: '0.8rem', color: textSecondary, fontStyle: 'italic', margin: '6px 0' }}>{line}</p>;
              return (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start', flexDirection: isWinston ? 'row' : 'row-reverse' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: isWinston ? '#7b2d6e' : '#5a1f9e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', fontFamily: FONT, flexShrink: 0 }}>
                    {speaker[0]}
                  </div>
                  <div style={{ maxWidth: '75%' }}>
                    <p style={{ fontFamily: FONT, fontSize: '0.7rem', fontWeight: 700, color: isWinston ? '#a855f7' : '#c77dff', margin: '0 0 4px' }}>{speaker}</p>
                    <div style={{ background: isWinston ? (dark ? 'rgba(80,20,120,0.4)' : 'rgba(243,238,248,0.95)') : (dark ? 'rgba(50,10,80,0.4)' : 'rgba(238,232,250,0.95)'), border: `1px solid ${isWinston ? (dark ? 'rgba(168,85,247,0.3)' : 'rgba(232,216,240,0.8)') : (dark ? 'rgba(199,125,255,0.3)' : 'rgba(210,190,240,0.8)')}`, borderRadius: isWinston ? '4px 16px 16px 16px' : '16px 4px 16px 16px', padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
                      <p style={{ fontFamily: FONT, fontSize: '0.88rem', color: textPrimary, margin: 0, lineHeight: 1.65 }}>{text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
