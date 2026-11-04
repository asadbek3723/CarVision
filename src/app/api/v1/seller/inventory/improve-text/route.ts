import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePaidSeller } from '@/server/auth/guards';
import { categoryLabel } from '@/domain/catalog';

const schema = z.object({
  name: z.string().trim().max(150).default(''),
  description: z.string().trim().max(1500).default(''),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().max(40).optional(),
});

const HOURLY_LIMIT = 30;

const PROMPT = (i: z.infer<typeof schema>) => `You edit product listings for a car tuning parts shop in Uzbekistan.
Rewrite the product NAME and DESCRIPTION below. Strict rules:
- Keep the SAME language as the input (Uzbek Latin, Russian or English). Never translate.
- Fix spelling, grammar, capitalisation and awkward phrasing. Make it clear and professional.
- Do NOT invent facts, specs, sizes, materials, compatibility, warranty or prices. Use only what is given.
- Do NOT add marketing exaggeration or emojis. Keep it close to the original length (description max 600 characters).
- If the description is empty, write one short neutral sentence from the name and category only.
Return ONLY JSON: {"name": "...", "description": "..."}

Category: ${i.category ? categoryLabel(i.category) : '-'}
Brand: ${i.brand || '-'}
NAME: ${i.name}
DESCRIPTION: ${i.description}`;

function localClean(text: string): string {
  const t = text.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/,(?=[A-Za-z\u0400-\u04FF])/g, ', ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

async function viaGemini(key: string, prompt: string): Promise<{ name: string; description: string } | null> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env['GEMINI_MODEL'] || 'gemini-3.1-flash-lite')}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parseJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function viaOpenAi(key: string, prompt: string): Promise<{ name: string; description: string } | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return parseJson(data.choices?.[0]?.message?.content);
}

function parseJson(text: string | undefined): { name: string; description: string } | null {
  if (!text) return null;
  try {
    const parsed = z.object({ name: z.string(), description: z.string() }).parse(JSON.parse(text));
    return { name: parsed.name.trim().slice(0, 150), description: parsed.description.trim().slice(0, 1500) };
  } catch {
    return null;
  }
}

/**
 * Light touch-up of the title and description. Nothing is saved here: the seller
 * sees the suggestion and accepts or discards it. Free of credits (rate limited).
 */
export async function POST(request: NextRequest) {
  const guard = await requirePaidSeller();
  if (!guard.ok) return guard.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.name && !parsed.data.description)) {
    return NextResponse.json({ success: false, code: 'NAME_REQUIRED', error: 'Avval nom yoki tavsif yozing' }, { status: 400 });
  }
  const input = parsed.data;

  const db = createAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db
    .from('auth_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'improve_text')
    .eq('login_key', guard.value.session.userId)
    .gte('created_at', since);
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', error: 'Soatiga 30 martadan ko‘p yaxshilab bo‘lmaydi' }, { status: 429 });
  }
  await db.from('auth_attempts').insert({ kind: 'improve_text', login_key: guard.value.session.userId, success: true });

  const prompt = PROMPT(input);
  const gemini = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const openai = (process.env.OPENAI_API_KEY || '').trim();

  let result: { name: string; description: string } | null = null;
  try {
    if (gemini.length > 8) result = await viaGemini(gemini, prompt);
    if (!result && openai.length > 8) result = await viaOpenAi(openai, prompt);
  } catch {
    result = null;
  }

  if (result) {
    return NextResponse.json({ success: true, ai: true, name: result.name || input.name, description: result.description || input.description });
  }
  // No AI key (or provider down): safe local tidy-up only.
  return NextResponse.json({ success: true, ai: false, name: localClean(input.name), description: localClean(input.description) });
}
