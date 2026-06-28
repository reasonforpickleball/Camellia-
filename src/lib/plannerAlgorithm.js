/**
 * Client-side study planner algorithm — no AI calls, no server.
 * Produces rich, emoji-annotated study materials from raw text.
 */

const EMOJI_MAP = [
  { kw: ['cell', 'biology', 'organ', 'protein', 'dna', 'rna', 'gene', 'chromosome', 'mitosis', 'mitochondria'], e: '🧬' },
  { kw: ['chemistry', 'molecule', 'atom', 'reaction', 'compound', 'element', 'periodic', 'bond', 'ionic', 'covalent'], e: '⚗️' },
  { kw: ['physics', 'force', 'energy', 'motion', 'wave', 'quantum', 'gravity', 'velocity', 'momentum'], e: '⚡' },
  { kw: ['math', 'calculus', 'algebra', 'equation', 'function', 'derivative', 'integral', 'theorem'], e: '📐' },
  { kw: ['history', 'war', 'revolution', 'empire', 'civilization', 'ancient', 'medieval', 'century'], e: '🏛️' },
  { kw: ['psychology', 'behavior', 'cognition', 'mental', 'brain', 'neuron', 'perception', 'stimulus'], e: '🧠' },
  { kw: ['economics', 'market', 'trade', 'gdp', 'inflation', 'supply', 'demand', 'fiscal'], e: '📊' },
  { kw: ['computer', 'algorithm', 'code', 'program', 'software', 'data', 'network', 'binary'], e: '💻' },
  { kw: ['literature', 'novel', 'poem', 'author', 'character', 'theme', 'narrative', 'metaphor'], e: '📚' },
  { kw: ['environment', 'climate', 'ecosystem', 'species', 'biodiversity', 'habitat', 'carbon'], e: '🌿' },
  { kw: ['government', 'politics', 'democracy', 'law', 'constitution', 'rights', 'legislature'], e: '⚖️' },
  { kw: ['art', 'painting', 'sculpture', 'design', 'aesthetic', 'style', 'movement', 'renaissance'], e: '🎨' },
];

function topicEmoji(text) {
  const lower = text.toLowerCase();
  for (const { kw, e } of EMOJI_MAP) {
    if (kw.some(k => lower.includes(k))) return e;
  }
  return '📖';
}

// ─── Section extraction ───────────────────────────────────────────────────────

export function extractSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let cur = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const isHeader =
      (line.length < 90 && line === line.toUpperCase() && /[A-Z]{2}/.test(line) && line.length > 3) ||
      /^(#{1,4})\s+.+/.test(line) ||
      /^(\d+\.?\s+[A-Z]|[IVX]+\.\s+[A-Z])/.test(line) ||
      (line.endsWith(':') && line.length < 70 && !/https?:/.test(line) && line.split(' ').length < 8) ||
      /^(Chapter|Section|Part|Unit|Module|Topic|Lecture)\s*\d*/i.test(line);

    if (isHeader) {
      if (cur) sections.push(cur);
      cur = {
        id: `branch_${sections.length}`,
        header: line.replace(/^#+\s+/, '').replace(/:$/, '').replace(/^\d+\.?\s+/, '').trim(),
        content: [],
      };
    } else if (cur) {
      cur.content.push(line);
    } else {
      cur = { id: 'branch_0', header: 'Core Concepts', content: [line] };
    }
  }
  if (cur) sections.push(cur);

  if (sections.length < 2) {
    const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 30);
    return paras.map((p, i) => {
      const sentences = p.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
      const header = sentences[0]?.slice(0, 50).trim() || `Concept ${i + 1}`;
      const content = sentences.length > 1 ? sentences.slice(1) : [p];
      return { id: `branch_${i}`, header, content };
    });
  }

  return sections;
}

// ─── Study schedule ───────────────────────────────────────────────────────────

export function generateStudyPlan(rawText, goal, difficulty = 5) {
  const sections = extractSections(rawText);
  const te = topicEmoji(rawText);
  const days = Math.min(7, Math.max(3, Math.ceil(sections.length / 2)));
  const secPerDay = Math.ceil(sections.length / days);
  const tasks = [];
  const lines = [];

  lines.push(`## ${te} Study Schedule — ${goal ? goal.slice(0, 80) : 'Your Material'}`);
  lines.push('');
  lines.push(`📊 **Difficulty:** ${difficulty}/10`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (let d = 0; d < days; d++) {
    const daySections = sections.slice(d * secPerDay, (d + 1) * secPerDay);
    if (!daySections.length) continue;

    lines.push(`### 📆 Day ${d + 1}`);
    lines.push('');

    daySections.forEach(sec => {
      const fullText = sec.content.join(' ');
      const timeEst = fullText.length > 600 ? '45 min' : '25 min';
      const preview = fullText.slice(0, 140).replace(/\s+/g, ' ');
      lines.push(`**⏱ ${timeEst}** › **${sec.header}**`);
      lines.push(`> ${preview}${fullText.length > 140 ? '...' : ''}`);
      lines.push('');
      tasks.push(`Day ${d + 1}: Study "${sec.header}" — ${preview.slice(0, 60)}...`);
    });

    lines.push(`> 🔁 **End of Day ${d + 1}:** Active Recall — close your notes and write everything from memory.`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('💡 **Remember:** Consistency beats cramming. You got this!');
  lines.push('');
  lines.push('📝 **Recommended rhythm:** 25 min study → 5 min rest (Pomodoro Technique)');

  return { schedule: lines.join('\n'), tasks: tasks.slice(0, 12) };
}

// ─── Detailed notes ───────────────────────────────────────────────────────────

export function generateKeyPoints(rawText) {
  const sections = extractSections(rawText);
  const te = topicEmoji(rawText);
  const out = [];

  out.push(`## ${te} Comprehensive Study Notes`);
  out.push('');
  out.push('> 💡 *These notes cover every key concept from your uploaded material. **★** marks the most important points.*');
  out.push('');
  out.push('---');
  out.push('');

  sections.forEach((sec, i) => {
    if (!sec.content.length) return;
    const se = topicEmoji(sec.content.join(' '));
    out.push(`## ${se} ${i + 1}. ${sec.header}`);
    out.push('');

    const fullText = sec.content.join(' ');
    const sentences = fullText
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    sentences.forEach((s, si) => {
      const isKey = si === 0 ||
        /\b(important|key|critical|fundamental|essential|main|primary|significant|note that|therefore|thus|hence|because)\b/i.test(s);
      out.push(isKey ? `★ **${s}**` : `- ${s}`);
    });

    const defs = extractInlineDefs(fullText);
    if (defs.length) {
      out.push('');
      out.push('**📖 Key Terms:**');
      defs.forEach(d => out.push(`- **${d.term}:** ${d.definition}`));
    }

    out.push('');
    out.push('---');
    out.push('');
  });

  out.push('> 📝 **Study Tip:** Cover these notes, then recite each section from memory. Active recall beats re-reading every time.');
  return out.join('\n');
}

function extractInlineDefs(text) {
  const defs = [];
  const seen = new Set();
  const re = /([^.:]{3,50}):\s+([^.]{10,100})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (/https?:/.test(m[0])) continue;
    const term = m[1].trim();
    if (!seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      defs.push({ term, definition: m[2].trim().split('.')[0] });
    }
  }
  return defs.slice(0, 6);
}

// ─── Flashcard extraction ─────────────────────────────────────────────────────

export function extractFlashcards(rawText) {
  const cards = [];
  const seen = new Set();

  const add = (term, definition) => {
    const k = term.toLowerCase().trim();
    if (seen.has(k) || term.length < 3 || term.length > 100 || definition.length < 8) return;
    seen.add(k);
    cards.push({ term: term.trim(), definition: definition.trim(), notes: '' });
  };

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  lines.forEach(line => {
    if (/https?:/.test(line)) return;
    const m1 = line.match(/^([^:]{3,60}):\s+(.{10,})$/);
    if (m1) { add(m1[1], m1[2]); return; }
    const m2 = line.match(/^(.{3,60})\s+[—–]\s+(.{10,})$/);
    if (m2) { add(m2[1], m2[2]); return; }
    const m3 = line.match(/^(.{3,60}?)\s+(?:refers to|is defined as|is known as|is called|means|denotes)\s+(.{10,})$/i);
    if (m3) { add(m3[1], m3[2]); return; }
    const m4 = line.match(/^(.{3,55})\s+(?:is|are)\s+(?:a|an|the)\s+(.{10,})$/i);
    if (m4) { add(m4[1].trim(), `Is a/an/the ${m4[2].trim()}`); return; }
    const m5 = line.match(/\*\*(.{3,60})\*\*[:\s—–]+(.{10,})/);
    if (m5) { add(m5[1], m5[2]); return; }
    if (line.length <= 60 && line === line.toUpperCase() && /[A-Z]{3}/.test(line)) {
      add(line, 'Key term — see your notes for context.');
    }
  });

  // Numbered list items
  const numbered = rawText.match(/^\d+[.)]\s+.{10,150}$/gm) || [];
  numbered.forEach(item => {
    const body = item.replace(/^\d+[.)]\s+/, '');
    const colonIdx = body.indexOf(':');
    if (colonIdx > 3 && colonIdx < 60) {
      add(body.slice(0, colonIdx).trim(), body.slice(colonIdx + 1).trim().slice(0, 200));
    } else {
      add(body.split('.')[0].slice(0, 60).trim(), body.slice(0, 160).trim());
    }
  });

  // Definitional sentences
  const defSentences = rawText.replace(/([.!?])\s+/g, '$1|||').split('|||').map(s => s.trim()).filter(s => s.length > 30);
  defSentences.forEach(sentence => {
    const m8 = sentence.match(/^([A-Z][^,]{3,50}),\s+which\s+(is|are|means|refers to)\s+(.{10,120})/);
    if (m8) add(m8[1].trim(), `${m8[2]} ${m8[3].trim()}`);
  });

  // Fallback: first sentence of every chunk
  if (cards.length < 5) {
    const chunks = rawText.split(/\n{2,}/).filter(c => c.trim().length > 40);
    chunks.slice(0, 20).forEach(chunk => {
      const sentences = chunk.split(/(?<=[.!?])\s+/);
      const first = sentences[0]?.trim() || '';
      const rest = sentences.slice(1, 3).join(' ').trim().slice(0, 200);
      if (first.length > 10 && rest.length > 10) add(first.slice(0, 70), rest);
    });
  }

  return cards.slice(0, 80);
}

// ─── Quiz question generation ─────────────────────────────────────────────────

export function generateQuizQuestions(rawText) {
  const sections = extractSections(rawText);
  const questions = [];

  sections.forEach(sec => {
    const nodeId = sec.id;
    const text = sec.content.join(' ');
    const sentences = text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 50 && s.length < 350);

    sentences.forEach(sentence => {
      const words = sentence.split(/\s+/);
      if (words.length < 8) return;

      const midStart = Math.floor(words.length * 0.3);
      const midEnd = Math.floor(words.length * 0.75);
      let answerStart = -1, answerLen = 1;
      for (let i = midStart; i < midEnd; i++) {
        if (words[i].length > 4 && /^[A-Za-z]/.test(words[i])) {
          answerStart = i;
          if (i + 1 < midEnd && words[i + 1].length > 3) answerLen = 2;
          break;
        }
      }
      if (answerStart !== -1) {
        const answerPhrase = words.slice(answerStart, answerStart + answerLen).join(' ').replace(/[^a-zA-Z0-9 ]/g, '');
        if (answerPhrase.length >= 3) {
          const blanked = [...words.slice(0, answerStart), '_______', ...words.slice(answerStart + answerLen)].join(' ');
          const distractors = buildDistractors(answerPhrase, sentences.filter(s => s !== sentence), 3);
          const correctIdx = Math.floor(Math.random() * 4);
          const options = [...distractors];
          options.splice(correctIdx, 0, answerPhrase);
          questions.push({ q: `Complete: "${blanked}"`, options: options.slice(0, 4), correct: correctIdx, nodeId });
        }
      }

      const defMatch = sentence.match(/^([A-Z][^.]{3,50}?)\s+(?:is a|are a|refers to|is defined as|is known as)\s+(.{10,120})/i);
      if (defMatch) {
        const term = defMatch[1].trim();
        const def = defMatch[2].trim().split('.')[0];
        if (def.length > 10) {
          const distractors = buildDistractors(term, sentences.filter(s => s !== sentence), 3);
          const correctIdx = Math.floor(Math.random() * 4);
          const opts = [...distractors];
          opts.splice(correctIdx, 0, term);
          questions.push({ q: `What does this describe: "${def.slice(0, 100)}"?`, options: opts.slice(0, 4), correct: correctIdx, nodeId });
        }
      }

      const colonMatch = sentence.match(/^([^:]{5,60}):\s+(.{15,120})/);
      if (colonMatch && !/https?:/.test(sentence)) {
        const term = colonMatch[1].trim();
        const def = colonMatch[2].trim().split('.')[0];
        const distractors = buildDistractors(def, sentences.filter(s => s !== sentence), 3);
        const correctIdx = Math.floor(Math.random() * 4);
        const opts = [...distractors];
        opts.splice(correctIdx, 0, def.slice(0, 80));
        questions.push({ q: `What is the definition of "${term}"?`, options: opts.slice(0, 4).map(o => o.slice(0, 80)), correct: correctIdx, nodeId });
      }
    });
  });

  const seen = new Set();
  return questions.filter(q => {
    if (seen.has(q.q)) return false;
    seen.add(q.q);
    return true;
  }).slice(0, 40);
}

function buildDistractors(correctAnswer, otherSentences, count) {
  const pool = otherSentences
    .flatMap(s => {
      const ws = s.split(/\s+/);
      const mid = Math.floor(ws.length / 2);
      for (let i = mid; i < ws.length; i++) {
        if (ws[i].length > 4 && /^[A-Za-z]/.test(ws[i])) {
          return [ws.slice(i, i + 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '')];
        }
      }
      return [];
    })
    .filter(d => d && d !== correctAnswer && d.length > 2);

  const unique = [...new Set(pool)].slice(0, count);
  while (unique.length < count) {
    unique.push(['mechanism', 'process', 'structure', 'function', 'property', 'interaction'][unique.length] || 'unknown');
  }
  return unique;
}
