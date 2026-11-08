import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { envKeys } from '@/server/providers/ai/key-pool';
import { fetchGeminiGenerate } from '@/server/providers/ai/google-endpoint';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PHOTO_CHARS = 3_000_000;
const MAX_PER_MINUTE = 8;

const bodySchema = z.object({
  photo: z.string().min(50).max(MAX_PHOTO_CHARS).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
});

interface Candidate {
  id: string;
  label: string;
}

/** Asks Gemini which car is in the photo. Returns null when no key is set or the call fails. */
async function askGemini(photo: string): Promise<{ isCar: boolean; make: string; model: string; confidence: number } | null> {
  // Same key pool as image generation (GEMINI_API_KEYS, GEMINI_API_KEY or GOOGLE_API_KEY).
  const keys = envKeys('gemini');
  const key = keys[Math.floor(Math.random() * keys.length)] ?? '';
  if (key.length < 8) return null;
  const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return null;

  const prompt =
    'Identify the car in this photo. Reply ONLY with JSON: {"isCar": boolean, "make": string, "model": string, "confidence": number between 0 and 1}. ' +
    'Use the commonly known market name (for example "Chevrolet" + "Cobalt", "Toyota" + "Camry"). If it is not a car, set isCar to false and leave make and model empty.';

  try {
    const res = await fetchGeminiGenerate(
      key,
      process.env['GEMINI_DETECT_MODEL'] || 'gemini-2.5-flash',
      {
        contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: match[1], data: match[2] } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      },
      20_000
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as { isCar?: unknown; make?: unknown; model?: unknown; confidence?: unknown };
    return {
      isCar: parsed.isCar === true,
      make: typeof parsed.make === 'string' ? parsed.make.trim().slice(0, 60) : '',
      model: typeof parsed.model === 'string' ? parsed.model.trim().slice(0, 60) : '',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
    };
  } catch {
    return null;
  }
}

const clean = (s: string) => s.replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').trim();

/** Maps the AI's make/model onto rows of our vehicle database (best match first). */
async function matchModels(make: string, model: string): Promise<Candidate[]> {
  const db = createAdminClient();
  const makeQ = clean(make).toLowerCase();
  const modelQ = clean(model).toLowerCase();
  if (!makeQ && !modelQ) return [];

  const { data: makes } = makeQ
    ? await db.from('vehicle_makes').select('id, name').eq('is_active', true).ilike('name', `%${makeQ}%`).limit(5)
    : { data: [] as Array<{ id: string; name: string }> };
  const makeIds = (makes ?? []).map((m) => m.id as string);
  const makeName = new Map((makes ?? []).map((m) => [m.id as string, m.name as string]));

  let query = db.from('vehicle_models').select('id, name, make_id').eq('is_active', true).limit(60);
  if (makeIds.length) query = query.in('make_id', makeIds);
  if (modelQ) query = query.ilike('name', `%${modelQ.split(' ')[0]}%`);
  const { data: rows } = await query;

  const missingMakeIds = [...new Set((rows ?? []).map((r) => r.make_id as string).filter((id) => !makeName.has(id)))];
  if (missingMakeIds.length) {
    const { data: more } = await db.from('vehicle_makes').select('id, name').in('id', missingMakeIds);
    for (const m of more ?? []) makeName.set(m.id as string, m.name as string);
  }

  const scored = (rows ?? []).map((r) => {
    const name = (r.name as string).toLowerCase();
    const score = name === modelQ ? 3 : name.startsWith(modelQ) ? 2 : name.includes(modelQ) ? 1 : 0;
    return { id: r.id as string, label: `${makeName.get(r.make_id as string) ?? ''} ${r.name as string}`.trim(), score };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.label.length - b.label.length)
    .slice(0, 4)
    .map(({ id, label }) => ({ id, label }));
}

/**
 * Identifies the car in a photo.
 * Always answers 200 with `detected: false` when the AI is unavailable, so the UI can fall back to manual search.
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    // Persisted in the database, so the limit holds across serverless instances
    const used = await recentFailures('login_key', guard.value.userId, 'vehicle_detect', 60_000, true);
    if (used >= MAX_PER_MINUTE) {
      return NextResponse.json({ success: false, code: 'RATE_LIMITED', error: 'Juda ko‘p urinish. Biroz kutib qayta urining' }, { status: 429 });
    }

    await recordAttempt('vehicle_detect', guard.value.userId, clientIp(request), true);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Rasm noto‘g‘ri' }, { status: 400 });

    const ai = await askGemini(parsed.data.photo);
    if (!ai) return NextResponse.json({ success: true, detected: false, reason: 'unavailable' });
    if (!ai.isCar) return NextResponse.json({ success: true, detected: false, reason: 'not_a_car' });

    const candidates = await matchModels(ai.make, ai.model);
    return NextResponse.json({
      success: true,
      detected: true,
      make: ai.make,
      model: ai.model,
      confidence: ai.confidence,
      candidates,
    });
  } catch (err) {
    console.error('vehicle detect error:', err);
    return NextResponse.json({ success: true, detected: false, reason: 'error' });
  }
}
