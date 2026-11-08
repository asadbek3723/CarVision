#!/usr/bin/env node
/**
 * Live audit of the image-generation API keys. Prints which keys are alive, their credit/limit
 * state and which image models they can reach. Key values are NEVER printed (only "#index").
 *
 *   node scripts/probe-image-providers.mjs            # list/auth checks only (free)
 *   node scripts/probe-image-providers.mjs --generate # + real text-to-image calls (top 6 OpenRouter models)
 *   ... --generate --models=a/b,c/d                   # test exactly these OpenRouter models
 *
 * Reads .env.local / .env from the project root (existing process env wins).
 */
import fs from 'node:fs';
import path from 'node:path';

for (const file of ['.env.local', '.env']) {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const keys = (...names) => {
  const out = new Set();
  for (const n of names) for (const k of (process.env[n] ?? '').split(/[\s,]+/)) if (k.trim().length > 8) out.add(k.trim());
  return [...out];
};
const GENERATE = process.argv.includes('--generate');
/** Vertex AI express keys ("AQ.") and AI Studio keys ("AIza") are served by different APIs. */
const geminiBase = (key) =>
  key.startsWith('AQ.')
    ? 'https://aiplatform.googleapis.com/v1/publishers/google/models'
    : 'https://generativelanguage.googleapis.com/v1beta/models';
const t = (url, init = {}, ms = 15000) => fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
const pad = (s, n) => String(s).padEnd(n);
const report = { gemini: [], openrouter: [], fal: [], openai: [] };

async function geminiProbe() {
  const list = keys('GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY');
  for (const [i, key] of list.entries()) {
    if (key.startsWith('AQ.')) {
      // Vertex AI express key: no model list API, so check it with one tiny text call.
      try {
        const res = await t(`${geminiBase(key)}/gemini-2.5-flash:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }),
        });
        report.gemini.push({ i, status: res.status, note: res.ok ? 'vertex key OK' : `vertex key: ${(await res.text()).slice(0, 160)}` });
      } catch (e) {
        report.gemini.push({ i, status: 'ERR', note: e.name });
      }
      continue;
    }
    try {
      const res = await t('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
        headers: { 'x-goog-api-key': key },
      });
      if (!res.ok) {
        report.gemini.push({ i, status: res.status, note: 'rejected' });
        continue;
      }
      const data = await res.json();
      const imageModels = (data.models ?? [])
        .map((m) => m.name.replace('models/', ''))
        .filter((n) => /image/.test(n) && /generateContent|predict/.test(JSON.stringify((data.models ?? []).find((m) => m.name === `models/${n}`)?.supportedGenerationMethods ?? [])));
      report.gemini.push({ i, status: 200, models: imageModels });
    } catch (e) {
      report.gemini.push({ i, status: 'ERR', note: e.name });
    }
  }
}

async function openRouterProbe() {
  const list = keys('OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY');
  await Promise.all(
    list.map(async (key, i) => {
      try {
        const res = await t('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) return report.openrouter.push({ i, status: res.status, note: 'rejected' });
        const d = (await res.json()).data ?? {};
        report.openrouter.push({
          i,
          status: 200,
          free: d.is_free_tier,
          limit: d.limit,
          remaining: d.limit_remaining,
          usage: d.usage,
        });
      } catch (e) {
        report.openrouter.push({ i, status: 'ERR', note: e.name });
      }
    })
  );
  report.openrouter.sort((a, b) => a.i - b.i);
}

async function openRouterModels() {
  try {
    const res = await t('https://openrouter.ai/api/v1/images/models');
    const data = await res.json();
    return (data.data ?? [])
      .map((m) => ({
        id: m.id,
        edit: (m.architecture?.input_modalities ?? []).includes('image'),
      }));
  } catch {
    return [];
  }
}

async function falProbe() {
  for (const [i, key] of keys('FAL_KEYS', 'FAL_KEY', 'FAL_API_KEY').entries()) {
    try {
      const res = await t('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      // 422 (missing prompt) means the key authenticated; 401/403 = bad key, 403 also = no balance
      report.fal.push({ i, status: res.status, note: res.status === 422 ? 'key ok' : '' });
    } catch (e) {
      report.fal.push({ i, status: 'ERR', note: e.name });
    }
  }
}

async function openAiProbe() {
  for (const [i, key] of keys('OPENAI_API_KEYS', 'OPENAI_API_KEY').entries()) {
    try {
      const res = await t('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
      const d = res.ok ? await res.json() : {};
      const image = (d.data ?? []).map((m) => m.id).filter((id) => /image/.test(id));
      report.openai.push({ i, status: res.status, models: image });
    } catch (e) {
      report.openai.push({ i, status: 'ERR', note: e.name });
    }
  }
}

async function generateProbe(models) {
  const prompt = 'A red sports car on a clean studio background, photorealistic';
  const results = [];
  const gem = keys('GEMINI_API_KEYS', 'GEMINI_API_KEY', 'GOOGLE_API_KEY')[0];
  if (gem) {
    for (const model of ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']) {
      const started = Date.now();
      try {
        const res = await t(
          `${geminiBase(gem)}/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'x-goog-api-key': gem, 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
          },
          60000
        );
        const d = res.ok ? await res.json() : {};
        const ok = (d.candidates?.[0]?.content?.parts ?? []).some((p) => p.inlineData?.data);
        results.push({ via: `gemini:${model}`, status: res.status, image: ok, ms: Date.now() - started });
      } catch (e) {
        results.push({ via: `gemini:${model}`, status: 'ERR', image: false, note: e.name });
      }
    }
  }
  const or = keys('OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY');
  const arg = process.argv.find((a) => a.startsWith('--models='));
  const ranked = arg ? arg.slice(9).split(',').map((id) => ({ id })) : models.slice(0, 6);
  for (const m of ranked) {
    const key = or.find((_, i) => report.openrouter.find((r) => r.i === i && r.status === 200));
    if (!key) break;
    const started = Date.now();
    try {
      const res = await t(
        'https://openrouter.ai/api/v1/images',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: m.id, prompt, n: 1 }),
        },
        120000
      );
      const d = res.ok ? await res.json() : {};
      const ok = Boolean(d.data?.[0]?.b64_json);
      results.push({ via: `openrouter:${m.id}`, status: res.status, image: ok, ms: Date.now() - started });
    } catch (e) {
      results.push({ via: `openrouter:${m.id}`, status: 'ERR', image: false, note: e.name });
    }
  }
  return results;
}

const summarize = (rows) => {
  const alive = rows.filter((r) => r.status === 200 || r.note === 'key ok').length;
  return `${alive}/${rows.length} alive`;
};

await Promise.all([geminiProbe(), openRouterProbe(), falProbe(), openAiProbe()]);
const orModels = await openRouterModels();

console.log('\n== KEY STATUS (values never printed) ==');
for (const [name, rows] of Object.entries(report)) {
  if (rows.length === 0) continue;
  console.log(`\n${name}: ${summarize(rows)}`);
  for (const r of rows) {
    const extra = Object.entries(r)
      .filter(([k]) => !['i', 'status'].includes(k))
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('|') || '-' : v}`)
      .join('  ');
    console.log(`  #${pad(r.i, 3)} HTTP ${pad(r.status, 4)} ${extra}`);
  }
}

console.log(`\n== OPENROUTER IMAGE MODELS (${orModels.length}) ==`);
const slugRank = (id) =>
  /gemini-3.*image|nano-banana-pro/.test(id) ? 5 : /gpt-5-image-mini/.test(id) ? 26 : /gpt-5-image|gpt-image/.test(id) ? 10
  : /seedream/.test(id) ? 20 : /hy-image|hunyuan/.test(id) ? 22 : /muse/.test(id) ? 24 : /gemini-2\.5-flash-image|nano-banana/.test(id) ? 15
  : /flux.*(pro|max|2)/.test(id) ? 30 : /klein/.test(id) ? 28 : /flux/.test(id) ? 40 : 60;
orModels.sort((a, b) => slugRank(a.id) - slugRank(b.id));
for (const m of orModels) console.log(`  ${pad(slugRank(m.id), 3)} ${pad(m.id, 55)} edit=${m.edit}`);

if (GENERATE) {
  console.log('\n== LIVE GENERATION TEST ==');
  for (const r of await generateProbe(orModels)) {
    console.log(`  ${pad(r.via, 60)} HTTP ${pad(r.status, 4)} image=${r.image} ${r.ms ? r.ms + 'ms' : ''} ${r.note ?? ''}`);
  }
}
console.log('');
