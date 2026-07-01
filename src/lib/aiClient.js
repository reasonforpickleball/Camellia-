/**
 * AI Client — thin transport layer.
 * ALL calls go through AI_GATEWAY (aiRequestGovernor).
 * No feature should import fetch URLs directly — import { aiAsk, aiChat } from here.
 */

import { sendRequest, PRIORITY, fallback } from './aiRequestGovernor';

export { PRIORITY as AI_PRIORITY };

export function getAIConfig() {
  return {
    provider: localStorage.getItem('camellia_ai_provider') || 'openai',
    apiKey:   localStorage.getItem('camellia_ai_key') || '',
    model:    localStorage.getItem('camellia_ai_model') || 'gpt-4o-mini',
  };
}

export function isAIConfigured() {
  const { apiKey } = getAIConfig();
  return !!apiKey && apiKey.length > 10;
}

// ── Task-based model selection ─────────────────────────────────────────────
// Each feature picks the model tier best suited to it (quality for long-form
// generation, fast for quick grading/short answers), resolved to a specific,
// currently-supported model for whichever provider the user has configured.
const TASK_MODELS = {
  openai:    { fast: 'gpt-4o-mini',              quality: 'gpt-4o-mini' },
  anthropic: { fast: 'claude-3-5-haiku-20241022', quality: 'claude-3-5-sonnet-20241022' },
  google:    { fast: 'gemini-2.5-flash-lite',     quality: 'gemini-2.5-flash' },
  groq:      { fast: 'llama-3.1-8b-instant',      quality: 'llama-3.3-70b-versatile' },
};

const TASK_TIER = {
  notes: 'quality', schedule: 'quality', flashcards: 'quality', flashcard_regen: 'quality',
  essay_analysis: 'quality', podcast_script: 'quality', ask_chat: 'quality', diagnostic_quiz: 'quality',
  quiz_gen: 'fast', quiz_grade: 'fast', quiz_explain: 'fast', quiz_followup: 'fast',
  khan_videos: 'fast', todo_tasks: 'fast', yucca_quiz: 'fast',
};

export function getTaskModel(task) {
  const { provider } = getAIConfig();
  const tier = TASK_TIER[task] || 'fast';
  return TASK_MODELS[provider]?.[tier];
}

// ── Raw provider transports (private — called ONLY through AI_GATEWAY) ────────

async function _callOpenAI(messages, config, opts = {}) {
  const hasImages = opts.file_urls && opts.file_urls.length > 0;
  // gpt-4o-mini supports vision; ensure we never send images to a non-vision model
  const model = opts.model || (hasImages ? 'gpt-4o-mini' : config.model) || 'gpt-4o-mini';
  // If file_urls provided, convert last user message to multimodal content
  let finalMessages = messages;
  if (opts.file_urls && opts.file_urls.length > 0) {
    finalMessages = messages.map((m, i) => {
      if (m.role === 'user' && i === messages.length - 1) {
        return { role: 'user', content: [
          { type: 'text', text: m.content },
          ...opts.file_urls.map(url => ({ type: 'image_url', image_url: { url } })),
        ]};
      }
      return m;
    });
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model, messages: finalMessages, temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens ?? 2000 }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `OpenAI error (${resp.status})`;
    if (resp.status === 401) throw new Error('Invalid OpenAI API key. Check Settings.');
    if (resp.status === 404) throw new Error(`Model "${model}" not found. Try gpt-4o-mini in Settings.`);
    if (resp.status === 429) throw new Error(`429 OpenAI rate limit: ${msg}`);
    throw new Error(msg);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function _parseDataUrl(url) {
  const match = /^data:(.+?);base64,(.+)$/.exec(url);
  return match ? { mediaType: match[1], data: match[2] } : null;
}

async function _callAnthropic(messages, config, opts = {}) {
  const hasImages = opts.file_urls && opts.file_urls.length > 0;
  // Claude 3.5 Haiku does NOT support image input — switch to Sonnet (vision-capable) when a photo is attached
  const model = opts.model || (hasImages ? 'claude-3-5-sonnet-20241022' : config.model) || 'claude-3-5-haiku-20241022';
  const system = messages.find(m => m.role === 'system')?.content || '';
  const nonSystem = messages.filter(m => m.role !== 'system');
  const conv = nonSystem.map((m, i) => {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    if (role === 'user' && i === nonSystem.length - 1 && opts.file_urls?.length > 0) {
      const content = [{ type: 'text', text: m.content }];
      opts.file_urls.forEach(url => {
        const parsed = _parseDataUrl(url);
        if (parsed) content.push({ type: 'image', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.data } });
      });
      return { role, content };
    }
    return { role, content: m.content };
  });
  if (!conv.length || conv[0].role !== 'user') throw new Error('Anthropic requires at least one user message.');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: opts.maxTokens ?? 2000, ...(system ? { system } : {}), messages: conv }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `Anthropic error (${resp.status})`;
    if (resp.status === 401) throw new Error('Invalid Anthropic API key. Check Settings.');
    if (resp.status === 429) throw new Error(`429 Anthropic rate limit: ${msg}`);
    throw new Error(msg);
  }
  const data = await resp.json();
  return data.content?.[0]?.text || '';
}

async function _callGoogle(messages, config, opts = {}) {
  const model = opts.model || config.model || 'gemini-2.5-flash-lite';
  const system = messages.find(m => m.role === 'system')?.content || '';
  const conv = messages.filter(m => m.role !== 'system').map((m, i, arr) => {
    const parts = [{ text: m.content }];
    // Attach images to last user message (inline base64, not a hosted file URI)
    if (m.role === 'user' && i === arr.length - 1 && opts.file_urls?.length > 0) {
      opts.file_urls.forEach(url => {
        const parsed = _parseDataUrl(url);
        if (parsed) parts.push({ inlineData: { mimeType: parsed.mediaType, data: parsed.data } });
      });
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });
  const body = {
    contents: conv,
    generationConfig: { temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens ?? 2000 },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `Google AI error (${resp.status})`;
    if (resp.status === 403) throw new Error('Invalid Google AI Studio API key. Check Settings.');
    if (resp.status === 429) throw new Error(`429 Google rate limit: ${msg}`);
    throw new Error(msg);
  }
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function _callGroq(messages, config, opts = {}) {
  const hasImages = opts.file_urls && opts.file_urls.length > 0;
  // Groq's default text models cannot see images — switch to a vision-capable model when a photo is attached
  const model = opts.model || (hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : config.model) || 'llama-3.1-8b-instant';
  let finalMessages = messages;
  if (hasImages) {
    finalMessages = messages.map((m, i) => {
      if (m.role === 'user' && i === messages.length - 1) {
        return { role: 'user', content: [
          { type: 'text', text: m.content },
          ...opts.file_urls.map(url => ({ type: 'image_url', image_url: { url } })),
        ]};
      }
      return m;
    });
  }
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model, messages: finalMessages, temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens ?? 2000 }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `Groq error (${resp.status})`;
    if (resp.status === 401) throw new Error('Invalid Groq API key. Check Settings.');
    if (resp.status === 404) throw new Error(`Model "${model}" not found on Groq.`);
    // For 429 — throw with "429" in message so gateway circuit breaker fires
    if (resp.status === 429) throw new Error(`429 Groq rate limit: ${msg}`);
    throw new Error(msg);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function _makeTransport(messages, config, opts) {
  switch (config.provider) {
    case 'anthropic': return () => _callAnthropic(messages, config, opts);
    case 'google':    return () => _callGoogle(messages, config, opts);
    case 'groq':      return () => _callGroq(messages, config, opts);
    default:          return () => _callOpenAI(messages, config, opts);
  }
}

// ── Public API (all features use these) ───────────────────────────────────────

export async function aiChat(messages, opts = {}) {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error('No API key configured. Go to Settings to add your AI key.');

  return sendRequest({
    provider:  config.provider,
    model:     opts.model || config.model,
    messages,
    priority:  opts.priority || PRIORITY.NORMAL,
    source:    opts.source || 'unknown',
    fn:        _makeTransport(messages, config, opts),
    callOpts:  opts,
    skipCache: opts.skipCache || false,
  });
}

export async function aiAsk(systemPrompt, userPrompt, opts = {}) {
  const messages = [
    { role: 'system', content: systemPrompt + ' Do not use em-dashes (—). Use commas or restructure sentences instead.' },
    { role: 'user', content: userPrompt },
  ];
  const result = await aiChat(messages, opts);
  return result.replace(/\u2014/g, ',').replace(/\u2013/g, ',');
}

export function parseAIJson(text) {
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // Strip any leading prose before the actual JSON structure
  const firstBracket = Math.min(
    ...['[', '{'].map(ch => { const i = cleaned.indexOf(ch); return i === -1 ? Infinity : i; })
  );
  if (firstBracket !== Infinity && firstBracket > 0) cleaned = cleaned.slice(firstBracket);
  const openChar = cleaned[0];
  const closeChar = openChar === '[' ? ']' : '}';
  const lastClose = cleaned.lastIndexOf(closeChar);
  if (lastClose !== -1) cleaned = cleaned.slice(0, lastClose + 1);
  // Remove trailing commas before closing brackets (common AI formatting slip)
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Response likely got truncated (token limit) mid-array — salvage complete items
    if (openChar === '[') {
      const lastComplete = cleaned.lastIndexOf('},');
      if (lastComplete !== -1) {
        return JSON.parse(cleaned.slice(0, lastComplete + 1) + ']');
      }
    }
    throw e;
  }
}

export { fallback as aiFallback };

// ── Settings panel only: test with explicit credentials (no gateway) ──────────

export async function testAIConnection(provider, apiKey, model) {
  const config = { provider, apiKey, model };
  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say exactly: "Camellia AI connection successful!" and nothing else.' },
  ];
  // Direct call — intentional bypass for credential testing only
  if (provider === 'anthropic') return _callAnthropic(messages, config, { maxTokens: 30 });
  if (provider === 'google')    return _callGoogle(messages, config, { maxTokens: 30 });
  if (provider === 'groq')      return _callGroq(messages, config, { maxTokens: 30 });
  return _callOpenAI(messages, config, { maxTokens: 30 });
}

export async function runAITestSuite(provider, apiKey, model) {
  const TESTS = [
    { name: 'Connection handshake',   prompt: 'Reply with only the word: CONNECTED' },
    { name: 'Basic comprehension',    prompt: 'What is 2 + 2? Reply with just the number.' },
    { name: 'JSON output',            prompt: 'Return only this JSON: {"status":"ok"}' },
    { name: 'Instruction following',  prompt: 'Repeat the word CAMELLIA exactly three times, space-separated.' },
    { name: 'Markdown formatting',    prompt: 'Write one bullet point in markdown starting with "- ".' },
    { name: 'Multi-sentence response',prompt: 'Write exactly two sentences about studying.' },
    { name: 'Factual recall',         prompt: 'What planet is closest to the Sun? One word answer.' },
    { name: 'Context retention',      prompt: 'You are a study assistant. Confirm your role in 5 words or fewer.' },
    { name: 'Token limit compliance', prompt: 'Count from 1 to 5, comma-separated, nothing else.' },
    { name: 'Final integration check',prompt: 'Say: "All 10 Camellia tests passed successfully!" and nothing else.' },
  ];
  const config = { provider, apiKey, model };
  const results = [];
  for (const test of TESTS) {
    try {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant. Follow instructions precisely.' },
        { role: 'user', content: test.prompt },
      ];
      // Direct calls — explicit credentials test context, intentional gateway bypass
      let resp;
      if (provider === 'anthropic') resp = await _callAnthropic(messages, config, { maxTokens: 60 });
      else if (provider === 'google') resp = await _callGoogle(messages, config, { maxTokens: 60 });
      else if (provider === 'groq')   resp = await _callGroq(messages, config, { maxTokens: 60 });
      else                            resp = await _callOpenAI(messages, config, { maxTokens: 60 });
      results.push({ name: test.name, ok: true, msg: resp.trim().slice(0, 80) });
    } catch (e) {
      results.push({ name: test.name, ok: false, msg: e.message });
    }
  }
  return results;
}
