import fs from 'node:fs/promises';
import path from 'node:path';

export interface FitmentPartInput {
  id: string;
  name: string;
  category: string;
  spec?: string | undefined;
  image?: string | undefined;
  angleImage?: string | undefined;
  swatch?: string | undefined;
}

export interface DirectFitmentRequest {
  carPhoto: string;
  angleId?: string | undefined;
  parts: FitmentPartInput[];
  mode?: 'fitment' | 'enhance_for_video' | undefined;
}

export interface DirectFitmentResponse {
  providerUsed: 'fal-ai' | 'gemini-ai' | 'openai' | 'replicate' | 'local-neural-compositor';
  liveApiActive: boolean;
  afterImageUrl: string | null;
  promptUsed: string;
  durationMs: number;
}

/**
 * Resolves any image source (data URI, remote https URL, or local /public path)
 * into a Data URI (`data:image/jpeg;base64,...`) so external AI APIs (Fal, Gemini, OpenAI)
 * can process images even when the app runs on localhost.
 */
export async function resolveImageToDataUri(src: string | undefined): Promise<string | null> {
  if (!src || src.trim().length === 0) return null;
  const trimmed = src.trim();

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const res = await fetch(trimmed, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return trimmed;
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const buf = Buffer.from(await res.arrayBuffer());
      return `data:${contentType};base64,${buf.toString('base64')}`;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith('/')) {
    try {
      const cleanRel = trimmed.replace(/^\/+/, '').split('?')[0] || '';
      const fullPath = path.join(process.cwd(), 'public', cleanRel);
      const buf = await fs.readFile(fullPath);
      const ext = path.extname(cleanRel).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  return null;
}

function buildPrecisionAutomotivePrompt(req: DirectFitmentRequest): string {
  const angleDescriptions: Record<string, string> = {
    front: 'front 0-degree symmetrical studio view',
    rear: 'rear 180-degree symmetrical view',
    right: 'right side 90-degree profile view',
    'front-left': 'front-left 3/4 dynamic automotive angle',
    'rear-right': 'rear-right 3/4 dynamic automotive angle',
  };

  const angleText = angleDescriptions[req.angleId || 'front-left'] || '3/4 automotive view';

  if (req.mode === 'enhance_for_video') {
    const partNames = req.parts.map((p) => `${p.name} (${p.category})`).join(', ');
    return [
      `Ultra-sharp 8K commercial automotive cinematography frame of this exact car in the exact same location and background (${angleText}).`,
      partNames
        ? `The vehicle is fitted with ${partNames} with 100% OEM+ precision fitment.`
        : '',
      'Enhance optical clarity, reflections on the bodywork, rim metallic micro-contrast, and natural dynamic range.',
      'Strictly preserve the exact car model, license plate area, background architecture, and camera perspective.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  const partInstructions = req.parts.map((p) => {
    const cat = p.category.toLowerCase();
    const specText = p.spec ? ` (${p.spec})` : '';
    if (cat.includes('wheel') || cat.includes('disk')) {
      return `Mount "${p.name}"${specText} forged wheels/rims into the wheel wells with exact spoke geometry, brake caliper clearance, and realistic tire sidewalls`;
    }
    if (cat.includes('body') || cat.includes('bamper') || cat.includes('aero')) {
      return `Install "${p.name}"${specText} aerodynamic body kit / bumper fascia seamlessly aligned with factory body panel gaps and matching paint/carbon weave reflections`;
    }
    if (cat.includes('perf') || cat.includes('light') || cat.includes('fara')) {
      return `Fit "${p.name}"${specText} crystal LED headlights/taillights into the factory lamp housings with realistic DRL illumination`;
    }
    if (p.swatch || cat.includes('color') || cat.includes('wrap')) {
      return `Refinish the exterior body panels in "${p.name}" (${p.swatch || 'custom automotive wrap'}) while preserving all window glass, trim, and realistic environment reflections`;
    }
    return `Install "${p.name}"${specText} (${p.category}) with 100% factory-grade fitment`;
  });

  return [
    `Photorealistic 4K automotive tuning modification on the exact input car (${angleText}).`,
    ...partInstructions,
    'CRITICAL RULES: Keep the exact same car make/model, exact same camera angle, and exact same background environment.',
    'Do not alter the background or change the vehicle into a different car. Photorealistic shadows, reflections, and OEM+ studio quality.',
  ].join(' ');
}

/**
 * 1. FAL.AI Engine (`FAL_KEY` or `FAL_API_KEY`)
 * Supports `fal-ai/flux-pro/kontext` (reference-aware editing) and `fal-ai/flux/dev/image-to-image`.
 */
async function runFalAiFitment(
  apiKey: string,
  carDataUri: string,
  prompt: string,
  mode: 'fitment' | 'enhance_for_video'
): Promise<string | null> {
  const endpoints =
    mode === 'enhance_for_video'
      ? [
          'https://fal.run/fal-ai/flux-pro/kontext',
          'https://fal.run/fal-ai/flux/dev/image-to-image',
        ]
      : [
          'https://fal.run/fal-ai/flux-pro/kontext',
          'https://fal.run/fal-ai/flux/dev/image-to-image',
        ];

  for (const endpoint of endpoints) {
    try {
      const isKontext = endpoint.includes('kontext');
      const payload = isKontext
        ? {
            prompt,
            image_url: carDataUri,
            guidance_scale: 3.5,
            num_inference_steps: 28,
            output_format: 'jpeg',
          }
        : {
            prompt,
            image_url: carDataUri,
            strength: mode === 'enhance_for_video' ? 0.35 : 0.65,
            guidance_scale: 3.5,
            num_inference_steps: 28,
            output_format: 'jpeg',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) continue;
      const data = (await res.json()) as {
        images?: Array<{ url?: string }>;
        image?: { url?: string };
      };
      const outputUrl = data.images?.[0]?.url || data.image?.url;
      if (outputUrl) return outputUrl;
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

/**
 * 2. GOOGLE GEMINI MULTIMODAL ENGINE (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)
 * Sends both the base car image AND the selected part reference images so Gemini
 * replicates the exact part details onto the vehicle.
 */
async function runGeminiMultimodalFitment(
  apiKey: string,
  carDataUri: string,
  partDataUris: string[],
  prompt: string
): Promise<string | null> {
  const parseBase64 = (uri: string) => {
    const match = uri.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1] || 'image/jpeg', data: match[2] || '' };
  };

  const carInline = parseBase64(carDataUri);
  if (!carInline) return null;

  const contentParts: Array<Record<string, unknown>> = [
    {
      text: `${prompt}\nThe first image is the customer's car. Any following images are the exact tuning parts that must be installed onto the car with 100% identical visual details.`,
    },
    { inlineData: carInline },
  ];

  for (const pUri of partDataUris.slice(0, 3)) {
    const parsed = parseBase64(pUri);
    if (parsed) {
      contentParts.push({ inlineData: parsed });
    }
  }

  const models = [
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.5-flash-image-preview',
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: contentParts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType?: string; data?: string };
            }>;
          };
        }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
    } catch {
      // Try next Gemini model
    }
  }

  return null;
}

/**
 * 3. OPENAI IMAGE ENGINE (`OPENAI_API_KEY`)
 */
async function runOpenAiFitment(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1536x1024',
        quality: 'high',
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = data.data?.[0];
    if (first?.b64_json) {
      return `data:image/png;base64,${first.b64_json}`;
    }
    if (first?.url) {
      return first.url;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Master Drop-in AI Execution Router:
 * Automatically checks `.env` / `.env.local` for `FAL_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY`
 * and executes live neural fitment.
 */
export async function executeDirectAiFitment(
  req: DirectFitmentRequest
): Promise<DirectFitmentResponse> {
  const startMs = Date.now();
  const promptUsed = buildPrecisionAutomotivePrompt(req);

  const falKey = (process.env.FAL_KEY || process.env.FAL_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();

  const carDataUri = await resolveImageToDataUri(req.carPhoto);

  if (carDataUri) {
    // Priority 1: Fal.ai FLUX Kontext / Dev
    if (falKey.length > 8) {
      const falUrl = await runFalAiFitment(
        falKey,
        carDataUri,
        promptUsed,
        req.mode || 'fitment'
      );
      if (falUrl) {
        return {
          providerUsed: 'fal-ai',
          liveApiActive: true,
          afterImageUrl: falUrl,
          promptUsed,
          durationMs: Date.now() - startMs,
        };
      }
    }

    // Priority 2: Google Gemini Multimodal Image Editing (Car + Exact Part Reference Images)
    if (geminiKey.length > 8) {
      const partDataUris = (
        await Promise.all(
          req.parts.map((p) => resolveImageToDataUri(p.angleImage || p.image))
        )
      ).filter((u): u is string => Boolean(u));

      const geminiUrl = await runGeminiMultimodalFitment(
        geminiKey,
        carDataUri,
        partDataUris,
        promptUsed
      );
      if (geminiUrl) {
        return {
          providerUsed: 'gemini-ai',
          liveApiActive: true,
          afterImageUrl: geminiUrl,
          promptUsed,
          durationMs: Date.now() - startMs,
        };
      }
    }

    // Priority 3: OpenAI Image Generation
    if (openAiKey.length > 8) {
      const openAiUrl = await runOpenAiFitment(openAiKey, promptUsed);
      if (openAiUrl) {
        return {
          providerUsed: 'openai',
          liveApiActive: true,
          afterImageUrl: openAiUrl,
          promptUsed,
          durationMs: Date.now() - startMs,
        };
      }
    }
  }

  return {
    providerUsed: 'local-neural-compositor',
    liveApiActive: false,
    afterImageUrl: null,
    promptUsed,
    durationMs: Date.now() - startMs,
  };
}
