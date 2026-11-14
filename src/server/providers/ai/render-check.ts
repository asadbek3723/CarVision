import { envKeys } from './key-pool';
import { fetchGeminiGenerate, geminiVisionModels } from './google-endpoint';

/**
 * Second look at a finished render, by a vision model:
 * - `sameView`: the result shows the car from the same side and camera angle as the customer's
 *   photo (image models sometimes "turn" a front photo into a side view, often copying the
 *   reference render of another angle). A before/after pair from different sides is useless.
 * - `partsComplete`: every visible instance of each new part is changed fully and identically
 *   (all wheels the same design and colour over the whole face, both headlights, ...).
 */
export interface RenderCheck {
  sameView: boolean;
  /** The same car (make, model, body) in the same scene: not a new car drawn from a part photo. */
  sameCar: boolean;
  /** Nothing that was not asked for changed (paint, lamps, wheels, bumper copied from a part photo). */
  keepsRest: boolean;
  partsComplete: boolean;
  problem: string;
}

/** How bad a checked render is: another side / another car outweigh an unwanted change, which outweighs an unfinished part. */
export function renderFaults(c: RenderCheck): number {
  return (c.sameView ? 0 : 8) + (c.sameCar ? 0 : 8) + (c.keepsRest ? 0 : 2) + (c.partsComplete ? 0 : 1);
}

export function hasRenderChecker(): boolean {
  return envKeys('gemini').some((k) => k.length >= 8);
}

function inline(uri: string): { mimeType: string; data: string } | null {
  const m = uri.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  return m ? { mimeType: m[1]!, data: m[2]! } : null;
}

/** Parses the model's JSON answer. Anything unclear counts as "fine" (never block a render by guessing). */
export function parseRenderCheck(text: string): RenderCheck | null {
  try {
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Record<string, unknown>;
    return {
      sameView: parsed['sameView'] !== false,
      sameCar: parsed['sameCar'] !== false,
      keepsRest: parsed['keepsRest'] !== false,
      partsComplete: parsed['partsComplete'] !== false,
      problem: typeof parsed['problem'] === 'string' ? parsed['problem'].slice(0, 300) : '',
    };
  } catch {
    return null;
  }
}

/** Null when no checker is configured, the call failed or ran out of time. */
export async function checkRender(
  beforeUri: string,
  afterUri: string,
  changes: string[],
  timeoutMs: number,
  /** What must stay as in the original (paint colour when no colour was chosen, lamps, ...). */
  keep: string[] = []
): Promise<RenderCheck | null> {
  const keys = envKeys('gemini').filter((k) => k.length >= 8);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const before = inline(beforeUri);
  const after = inline(afterUri);
  if (!key || !before || !after || timeoutMs < 2_000) return null;

  const prompt =
    'IMAGE 1 is a customer photo of a car. IMAGE 2 is an AI edit of that photo that should only add these changes: ' +
    `${changes.map((c) => `"${c}"`).join(', ')}. ` +
    'Reply ONLY with JSON: {"sameView": boolean, "sameCar": boolean, "keepsRest": boolean, "partsComplete": boolean, "problem": string}. ' +
    'sameView: true when IMAGE 2 shows the car from the same side and roughly the same camera angle as IMAGE 1 ' +
    '(front stays front, rear stays rear, left side stays left side, a 3/4 view stays the same 3/4 view). ' +
    'False when IMAGE 2 shows another side of the car, the car is turned around or mirrored, or it is a different scene. ' +
    'sameCar: true when IMAGE 2 is clearly the same car as IMAGE 1 (same make, model, body shape and background). False when it is ' +
    'a different car or a different background. ' +
    `keepsRest: true when everything that is not one of the changes stays as in IMAGE 1${keep.length ? `, in particular: ${keep.join('; ')}` : ''}. ` +
    'False when something that was not asked for changed, for example the paint colour, the lamps, the wheels or the bumper ' +
    'look like they were copied from another car. ' +
    'partsComplete: true when every change is applied fully and identically to every visible instance: all visible wheels ' +
    'have the same new design and the same colour over the whole wheel face (spokes, centre, hub, centre cap, lip), ' +
    'both headlights / both tail lights look the same, and a new paint colour covers every painted panel. False when one ' +
    'instance is only partly changed or still shows the old part or old colour (for example the centre of one wheel ' +
    'kept the old colour). problem: a few words about what is wrong, or "". When unsure, answer true.';

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { text: 'IMAGE 1 (original):' },
          { inlineData: before },
          { text: 'IMAGE 2 (edited):' },
          { inlineData: after },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  };

  const started = Date.now();
  try {
    for (const model of geminiVisionModels()) {
      const left = timeoutMs - (Date.now() - started);
      if (left < 1_500) return null;
      const res = await fetchGeminiGenerate(key, model, body, left);
      if (res.status === 404) continue;
      if (!res.ok) return null;
      const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
      const text = json.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string' && !p.thought)?.text;
      return text ? parseRenderCheck(text) : null;
    }
  } catch {
    return null;
  }
  return null;
}
