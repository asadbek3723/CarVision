import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { clientIp, recentFailures, recordAttempt } from '@/server/auth/rate-limit';
import { envKeys } from '@/server/providers/ai/key-pool';
import { fetchGeminiGenerate } from '@/server/providers/ai/google-endpoint';
import { signCarCheck } from '@/server/car-check';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PHOTO_CHARS = 3_000_000;
const MAX_PER_MINUTE = 8;

const DATA_URI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const bodySchema = z.object({
  photo: z.string().min(50).max(MAX_PHOTO_CHARS).regex(DATA_URI),
  /** The other photographed sides (small copies): checked to be the same car as `photo`. */
  angles: z
    .array(z.object({ id: z.string().regex(/^[a-z-]{2,20}$/), photo: z.string().min(50).max(700_000).regex(DATA_URI) }))
    .max(4)
    .optional(),
});

interface Candidate {
  id: string;
  label: string;
}

/**
 * Vision models tried in order. `gemini-2.5-flash` is deprecated (closed to new accounts, rerouted
 * on 2026-12-01), so the default is a current stable model, with a cheaper one behind it; a model
 * that is not available to this key answers 404 and the next one is tried.
 */
function detectModels(): string[] {
  const configured = process.env['GEMINI_DETECT_MODEL']?.trim();
  return [...new Set([configured, 'gemini-3.6-flash', 'gemini-3.5-flash-lite'].filter((m): m is string => Boolean(m)))];
}

interface CarAnswer {
  isCar: boolean;
  make: string;
  model: string;
  confidence: number;
  /** False only when the AI says some of the other photos show a different car. */
  sameCar: boolean;
  mismatchAngleIds: string[];
}

/** Asks Gemini which car is in the photo (and whether the other sides are the same car). Null = unavailable. */
async function askGemini(photo: string, angles: Array<{ id: string; photo: string }> = []): Promise<CarAnswer | null> {
  // Same key pool as image generation (GEMINI_API_KEYS, GEMINI_API_KEY or GOOGLE_API_KEY).
  const keys = envKeys('gemini');
  const key = keys[Math.floor(Math.random() * keys.length)] ?? '';
  if (key.length < 8) return null;
  const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return null;

  const extra = angles
    .map((a) => ({ id: a.id, m: a.photo.match(/^data:(image\/[a-z]+);base64,(.+)$/) }))
    .filter((a): a is { id: string; m: RegExpMatchArray } => Boolean(a.m));

  const prompt =
    'Identify the car in IMAGE 1. Reply ONLY with JSON: {"isCar": boolean, "make": string, "model": string, "confidence": number between 0 and 1, "sameCar": boolean, "mismatchAngles": string[]}. ' +
    'Use the commonly known market name (for example "Chevrolet" + "Cobalt", "Toyota" + "Camry"). If it is not a car, set isCar to false and leave make and model empty. ' +
    (extra.length > 0
      ? `The following labelled images are other sides of the car the customer photographed: ${extra.map((a) => a.id).join(', ')}. ` +
        'Set sameCar to true when every labelled image shows the same physical car as IMAGE 1 (same make, model, body style and colour; the side or angle may differ). ' +
        'Put the labels of images that clearly show a different car, or no car at all, in mismatchAngles. If you are unsure, set sameCar to true.'
      : 'Set sameCar to true and mismatchAngles to [].');

  try {
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: match[1], data: match[2] } },
            ...extra.flatMap((a) => [{ text: `Label: ${a.id}` }, { inlineData: { mimeType: a.m[1], data: a.m[2] } }]),
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    };
    let res: Response | null = null;
    for (const model of detectModels()) {
      res = await fetchGeminiGenerate(key, model, body, 14_000);
      if (res.status !== 404) break; // 404 = this model is not available to the key: try the next one
    }
    if (!res) return null;
    if (!res.ok) return null;
    const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    // Thinking models can put a thought part first: take the first real text part.
    const text = json.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string' && !(p as { thought?: boolean }).thought)?.text;
    if (!text) return null;
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as { isCar?: unknown; make?: unknown; model?: unknown; confidence?: unknown; sameCar?: unknown; mismatchAngles?: unknown };
    // An answer without a clear yes/no is "could not check", never "not a car" (that blocks the customer).
    if (typeof parsed.isCar !== 'boolean') return null;
    const sent = new Set(extra.map((a) => a.id));
    const mismatchAngleIds = Array.isArray(parsed.mismatchAngles)
      ? parsed.mismatchAngles.filter((x): x is string => typeof x === 'string' && sent.has(x))
      : [];
    return {
      sameCar: parsed.sameCar === false && mismatchAngleIds.length > 0 ? false : true,
      mismatchAngleIds,
      isCar: parsed.isCar,
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
  // Set once the user is known, so even a failed check can still hand out the "could not verify" token.
  let userId: string | null = null;
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    userId = guard.value.userId;
    // Persisted in the database, so the limit holds across serverless instances
    const used = await recentFailures('login_key', guard.value.userId, 'vehicle_detect', 60_000, true);
    if (used >= MAX_PER_MINUTE) {
      return NextResponse.json({ success: false, code: 'RATE_LIMITED', error: 'Juda ko‘p urinish. Biroz kutib qayta urining' }, { status: 429 });
    }

    await recordAttempt('vehicle_detect', guard.value.userId, clientIp(request), true);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, code: 'INVALID_INPUT', error: 'Rasm noto‘g‘ri' }, { status: 400 });

    // The check could not be run (no AI key, provider down): the customer may pick the car by hand,
    // and the token still lets the render through. Only a definite "not a car" / "different cars" is blocked.
    const unverified = () => ({ carCheckToken: signCarCheck(guard.value.userId) });

    const ai = await askGemini(parsed.data.photo, parsed.data.angles);
    if (!ai) return NextResponse.json({ success: true, detected: false, reason: 'unavailable', ...unverified() });
    if (!ai.isCar) return NextResponse.json({ success: true, detected: false, reason: 'not_a_car' });
    if (!ai.sameCar) {
      return NextResponse.json({ success: true, detected: false, reason: 'mismatch', mismatchAngleIds: ai.mismatchAngleIds });
    }

    const candidates = await matchModels(ai.make, ai.model);
    return NextResponse.json({
      success: true,
      detected: true,
      make: ai.make,
      model: ai.model,
      confidence: ai.confidence,
      candidates,
      ...unverified(),
    });
  } catch (err) {
    console.error('vehicle detect error:', err);
    return NextResponse.json({ success: true, detected: false, reason: 'error', carCheckToken: userId ? signCarCheck(userId) : null });
  }
}
