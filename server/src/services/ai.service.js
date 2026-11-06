import { env } from '../config/env.js';

export const aiConfigured = () => Boolean(env.aiKey);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = [429, 500, 503]; // pansamantalang problema ng provider (busy / limit)

async function failIfBad(res) {
  if (res.ok) return;
  // Isama ang dahilan sa server log (401/403 maling key, 404 maling model, 429 limit, 503 busy)
  const detail = await res.text().catch(() => '');
  const err = new Error(`AI provider ${res.status}: ${detail.slice(0, 300)}`);
  err.status = res.status;
  throw err;
}

async function callGemini(model, { system, messages, maxTokens, timeoutMs, json, temperature }) {
  // Ang mga bagong Gemini model ay "nag-iisip" muna at kumakain ng token budget, kaya bigyan ng dagdag na espasyo
  const generationConfig = { maxOutputTokens: maxTokens + 2048, temperature };
  if (json) generationConfig.responseMimeType = 'application/json';
  if (/2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.aiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  await failIfBad(res);
  const data = await res.json();
  const out = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!out) throw new Error(`Empty AI reply (${data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason || 'unknown'})`);
  return out;
}

async function callAnthropic({ system, messages, maxTokens, timeoutMs, temperature }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.aiKey, 'anthropic-version': '2026-10-21' },
    body: JSON.stringify({ model: env.aiModel, max_tokens: maxTokens, temperature, system, messages }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  await failIfBad(res);
  const data = await res.json();
  const out = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!out) throw new Error('Empty AI reply');
  return out;
}

// Subukan ulit (hanggang 3 beses) kapag busy o naabot ang limit ng provider
async function withRetry(fn) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      if (!RETRYABLE.includes(err.status) || i === 2) break;
      await sleep(i === 0 ? 1000 : 2500);
    }
  }
  throw lastErr;
}

// Iisang pintuan para sa lahat ng AI call. messages = [{ role: 'user' | 'assistant', content }]
export async function generateText({ system, messages, maxTokens = 600, timeoutMs = 20000, json = false, temperature = 0.3 }) {
  const opts = { system, messages, maxTokens, timeoutMs, json, temperature };
  if (env.aiProvider !== 'gemini') return withRetry(() => callAnthropic(opts));

  try {
    return await withRetry(() => callGemini(env.aiModel, opts));
  } catch (err) {
    // Kung busy o wala na ang pangunahing model, subukan ang pangalawa
    const fb = env.aiFallbackModel;
    if (fb && fb !== env.aiModel && [404, 429, 500, 503].includes(err.status)) {
      console.warn(`[ai] ${env.aiModel} failed (${err.status}), trying ${fb}`);
      return withRetry(() => callGemini(fb, opts));
    }
    throw err;
  }
}