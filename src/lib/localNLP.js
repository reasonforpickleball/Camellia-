/**
 * Local NLP engine — entirely client-side, zero external calls.
 * Handles: Q&A from material, grammar checking, fact checking, essay scoring.
 */

const STOP = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','must','can','to','of','in','on','at','by','for','with','about','as','into','from','and','or','but','not','no','that','this','these','those','it','its','he','she','they','we','i','you','what','who','which','when','where','why','how','very','just','more','most','such','than','then','so','if','up','out','each','every','some','any','me','him','her','them','us','my','your','his','our','their','its']);

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

// ─── Q&A ─────────────────────────────────────────────────────────────────────

export function answerFromMaterial(question, rawText, conversationHistory) {
  if (!rawText || rawText.trim().length < 50) {
    return "I don't have any study material loaded yet. Please upload your material in the AI Study Planner first, then ask me questions about it.";
  }

  const resolved = resolveContext(question, conversationHistory);
  const keywords = extractKeywords(resolved);

  if (keywords.length === 0) {
    return "Could you rephrase your question with specific terms from your material?";
  }

  const sentences = rawText
    .replace(/([.!?])\s+/g, '$1|||')
    .split('|||')
    .map(s => s.trim())
    .filter(s => s.length > 15);

  const scored = sentences.map(sent => {
    const lower = sent.toLowerCase();
    let score = 0;
    keywords.forEach(kw => {
      if (lower.includes(kw)) score += 3;
      else if (lower.includes(kw.slice(0, Math.max(3, kw.length - 2)))) score += 1;
    });
    return { sent, score };
  });

  const top = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => s.sent);

  if (top.length === 0) {
    return `I searched your uploaded material for "${keywords.slice(0, 3).join(', ')}" but couldn't find a direct match. Try using terms directly from your notes.`;
  }

  const combined = top.join(' ').replace(/\s+/g, ' ').trim();
  const openers = [
    'Based on your material:',
    'From your uploaded notes:',
    'According to your study material:',
    'Your notes explain:',
  ];
  const opener = openers[Math.floor(Math.random() * openers.length)];
  return `${opener}\n\n${combined.slice(0, 700)}${combined.length > 700 ? '...' : ''}`;
}

function resolveContext(question, history) {
  const lq = question.toLowerCase().trim();
  const pronouns = ['he', 'she', 'it', 'they', 'this', 'that', 'him', 'her', 'them'];
  const hasPronoun = lq.split(/\s+/).some(w => pronouns.includes(w));

  if (!hasPronoun && lq.split(/\s+/).length > 2) return question;
  if (!history || history.length === 0) return question;

  const recentText = history.slice(-8).map(m => m.text || m.content || '').join(' ');
  const entities = recentText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  const COMMON = new Set(['The','A','An','In','On','At','It','Is','Are','Was','If','Of','To','For','And','Or','But','Not','So','As','By','Can','Will','My','Your','No','Yes']);
  const unique = [...new Set(entities)].filter(e => e.length > 2 && !COMMON.has(e));

  if (unique.length > 0) {
    const lastEntity = unique[unique.length - 1];
    let q = question.replace(/\b(he|she|it|this|that)\b/gi, lastEntity);
    q = q.replace(/\b(his|her|its|their)\b/gi, `${lastEntity}'s`);
    return q;
  }

  if (question.trim().split(/\s+/).length <= 3) {
    const lastUser = [...history].reverse().find(m => m.role === 'user');
    if (lastUser) {
      const ctx = (lastUser.text || lastUser.content || '').trim();
      if (ctx.length > 3) return `${question} in the context of ${ctx}`;
    }
  }

  return question;
}

// ─── Grammar checking ─────────────────────────────────────────────────────────

export function checkGrammar(text) {
  const sug = [];

  const add = (start, end, type, message, fix) => {
    if (start >= end) return;
    sug.push({ start, end, type, message, fix, excerpt: text.slice(start, end) });
  };

  let m;

  // Wordiness
  const wordiness = [
    { re: /\bin order to\b/gi, fix: 'to', msg: 'Wordy — use "to"' },
    { re: /\bdue to the fact that\b/gi, fix: 'because', msg: 'Wordy — use "because"' },
    { re: /\bat this point in time\b/gi, fix: 'now', msg: 'Wordy — use "now"' },
    { re: /\bin the event that\b/gi, fix: 'if', msg: 'Wordy — use "if"' },
    { re: /\bvery unique\b/gi, fix: 'unique', msg: '"Unique" is absolute — remove "very"' },
    { re: /\ba number of\b/gi, fix: 'several', msg: 'Consider "several"' },
    { re: /\bthe reason (?:why|is) because\b/gi, fix: 'because', msg: 'Redundant — just use "because"' },
    { re: /\bfirst and foremost\b/gi, fix: 'first', msg: 'Cliché — use "first"' },
  ];
  wordiness.forEach(({ re, fix, msg }) => {
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) add(m.index, m.index + m[0].length, 'wordiness', msg, fix);
  });

  // Passive voice
  const passive = /\b(is|are|was|were|be|been|being)\s+(\w+ed)\b/gi;
  while ((m = passive.exec(text)) !== null) {
    add(m.index, m.index + m[0].length, 'style', 'Passive voice — consider active voice', '');
  }

  // Very long sentences
  const sentRe = /[^.!?]+[.!?]/g;
  while ((m = sentRe.exec(text)) !== null) {
    const wc = m[0].trim().split(/\s+/).length;
    if (wc > 50) add(m.index, m.index + m[0].length, 'clarity', `Long sentence (${wc} words) — consider splitting`, '');
  }

  // Common spelling confusions
  const confusions = [
    { re: /\btheir\s+is\b/gi, msg: '"Their is" — should be "There is"', fix: 'There is' },
    { re: /\byour\s+(?:going|welcome|right|wrong)\b/gi, msg: '"your" vs "you\'re" — check this', fix: '' },
    { re: /\bits\s+(?:going|a|an|not)\b/gi, msg: '"its" vs "it\'s" — check this', fix: '' },
  ];
  confusions.forEach(({ re, msg, fix }) => {
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) add(m.index, m.index + m[0].length, 'grammar', msg, fix);
  });

  return sug.slice(0, 25);
}

// ─── Fact checking ────────────────────────────────────────────────────────────

export function factCheckEssay(essayText, rawMaterial) {
  if (!rawMaterial || rawMaterial.trim().length < 50) return [];
  const sug = [];
  const matLower = rawMaterial.toLowerCase();

  // Check numbers/dates not in material
  const numRe = /\b(\d{4}|\d+(?:\.\d+)?(?:\s*%)?)\b/g;
  let m;
  while ((m = numRe.exec(essayText)) !== null) {
    const num = m[1];
    if (num.length < 2) continue;
    if (!matLower.includes(num)) {
      sug.push({ start: m.index, end: m.index + num.length, type: 'fact', message: `"${num}" — verify this figure against your source material`, fix: '', excerpt: num });
    }
  }

  // Check proper nouns not in material
  const pnRe = /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*)\b/g;
  const skip = new Set(['The','This','That','These','There','Here','When','While','Although','However','Therefore','Furthermore','Moreover','Additionally','Finally','Firstly','Secondly']);
  while ((m = pnRe.exec(essayText)) !== null) {
    const noun = m[1];
    if (skip.has(noun) || noun.split(' ').length > 4) continue;
    if (!matLower.includes(noun.toLowerCase())) {
      sug.push({ start: m.index, end: m.index + noun.length, type: 'fact', message: `"${noun}" — not found in your uploaded material`, fix: '', excerpt: noun });
    }
  }

  return sug.slice(0, 12);
}

// ─── Essay scoring ────────────────────────────────────────────────────────────

export function scoreEssay(text, rawMaterial) {
  const words = text.trim().split(/\s+/);
  const wc = words.length;

  const lengthScore = Math.min(20, Math.floor(wc / 20));

  const intro = /\b(introduction|first|to begin|this essay|in this paper)\b/i.test(text.slice(0, Math.floor(text.length * 0.25)));
  const conclusion = /\b(conclusion|in summary|to conclude|in conclusion|therefore|thus|overall)\b/i.test(text.slice(Math.floor(text.length * 0.7)));
  const structureScore = (intro ? 7 : 0) + (conclusion ? 7 : 0) + (wc > 80 ? 6 : 0);

  const issues = checkGrammar(text).filter(s => s.type !== 'style');
  const grammarScore = Math.max(0, 20 - issues.length * 2);

  const contentWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length > 3 && !STOP.has(w));
  const diversity = contentWords.length > 0 ? new Set(contentWords).size / contentWords.length : 0;
  const vocabScore = Math.min(20, Math.floor(diversity * 28));

  let coverScore = 0;
  if (rawMaterial) {
    const matKws = extractKeywords(rawMaterial).slice(0, 40);
    const essLower = text.toLowerCase();
    const matched = matKws.filter(k => essLower.includes(k)).length;
    coverScore = Math.min(20, Math.floor((matched / Math.max(1, matKws.length)) * 30));
  }

  const total = Math.min(100, lengthScore + structureScore + grammarScore + vocabScore + coverScore);

  let feedback;
  if (total >= 90) feedback = '🏆 Excellent! Well-structured and material-aligned.';
  else if (total >= 75) feedback = '✅ Good work! Review flagged suggestions to polish it.';
  else if (total >= 55) feedback = '📝 Decent start — expand material coverage and sharpen structure.';
  else if (total >= 35) feedback = '⚠️ Needs development — add intro, conclusion, and more from your notes.';
  else feedback = '🚧 Keep writing — aim for 200+ words with clear structure.';

  return {
    total,
    breakdown: { length: lengthScore, structure: structureScore, grammar: grammarScore, vocabulary: vocabScore, coverage: coverScore },
    wordCount: wc,
    feedback,
  };
}
