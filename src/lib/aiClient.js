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

// ── Raw provider transports (private — called ONLY through AI_GATEWAY) ────────

async function _callOpenAI(messages, config, opts = {}) {
  const model = opts.model || config.model || 'gpt-4o-mini';
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens ?? 2000 }),
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

async function _callAnthropic(messages, config, opts = {}) {
  const model = opts.model || config.model || 'claude-3-5-haiku-20241022';
  const system = messages.find(m => m.role === 'system')?.content || '';
  const conv = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content,
  }));
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
  const conv = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }],
  }));
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
  const model = opts.model || config.model || 'llama-3.1-8b-instant';
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens ?? 2000 }),
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
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
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
