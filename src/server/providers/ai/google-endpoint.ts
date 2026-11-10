/**
 * Google serves Gemini from two APIs, and the key decides which one accepts it:
 *   - Google AI Studio keys ("AIza...")      -> generativelanguage.googleapis.com
 *   - Vertex AI (express mode) keys ("AQ.")  -> aiplatform.googleapis.com
 * Sending a Vertex key to the AI Studio endpoint fails with 401 on every call, so image generation
 * and car detection silently never worked with such a key.
 */
const AI_STUDIO = 'https://generativelanguage.googleapis.com/v1beta/models';
const VERTEX = 'https://aiplatform.googleapis.com/v1/publishers/google/models';

export function isVertexKey(key: string): boolean {
  return key.trim().startsWith('AQ.');
}

/**
 * `generateContent` URLs to try for this key, the likely one first. The other API is kept as a
 * fallback in case Google changes key formats; callers move on only when the key is rejected.
 */
export function geminiGenerateUrls(key: string, model: string): string[] {
  const path = `${encodeURIComponent(model)}:generateContent`;
  const studio = `${AI_STUDIO}/${path}`;
  const vertex = `${VERTEX}/${path}`;
  return isVertexKey(key) ? [vertex, studio] : [studio, vertex];
}

/**
 * POSTs a `generateContent` request with this key, trying the matching API first and the other
 * one only when the key is rejected (401/403). Returns the last response; throws on network errors
 * or timeout like `fetch` does.
 */
export async function fetchGeminiGenerate(
  key: string,
  model: string,
  body: unknown,
  timeoutMs: number
): Promise<Response> {
  let res: Response | null = null;
  for (const url of geminiGenerateUrls(key, model)) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status !== 401 && res.status !== 403) return res;
  }
  return res!;
}

/**
 * Vision (text-answer) models tried in order for photo checks. `GEMINI_DETECT_MODEL` overrides the
 * first one; a model the key cannot use answers 404 and the next one is tried.
 */
export function geminiVisionModels(): string[] {
  const configured = process.env['GEMINI_DETECT_MODEL']?.trim();
  return [...new Set([configured, 'gemini-3.6-flash', 'gemini-3.5-flash-lite'].filter((m): m is string => Boolean(m)))];
}
