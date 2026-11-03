import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  executeDirectAiFitment,
  type FitmentPartInput,
} from '@/server/providers/ai/direct-fitment-engine';

const angleSchema = z.object({
  id: z.string(),
  label: z.string(),
  beforeUrl: z.string(),
  afterUrl: z.string(),
});

const partSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().default('Wheels'),
  spec: z.string().optional(),
  image: z.string().optional(),
  angleImage: z.string().optional(),
  swatch: z.string().optional(),
});

const videoEditRequestSchema = z.object({
  angles: z.array(angleSchema).min(1),
  parts: z.array(partSchema).default([]),
  trackId: z.enum(['phonk', 'luxury', 'synth']).default('phonk'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = videoEditRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid video-edit payload',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { angles, parts } = parsed.data;
    const fitmentParts: FitmentPartInput[] = parts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      spec: p.spec,
      image: p.image,
      angleImage: p.angleImage,
      swatch: p.swatch,
    }));

    const hasLiveKey = Boolean(
      (process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 8) ||
        (process.env.FAL_API_KEY && process.env.FAL_API_KEY.trim().length > 8) ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 8) ||
        (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 8) ||
        (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 8)
    );

    const enhancedAngles = [...angles];
    let providerUsed = 'local-neural-studio';

    // If a live AI key is present in .env, run AI 4K frame restoration on the primary hero angle
    if (hasLiveKey && enhancedAngles[0]) {
      const hero = enhancedAngles[0];
      const aiEnhanced = await executeDirectAiFitment({
        carPhoto: hero.afterUrl || hero.beforeUrl,
        angleId: hero.id,
        parts: fitmentParts,
        mode: 'enhance_for_video',
      });

      if (aiEnhanced.liveApiActive && aiEnhanced.afterImageUrl) {
        providerUsed = aiEnhanced.providerUsed;
        enhancedAngles[0] = {
          ...hero,
          afterUrl: aiEnhanced.afterImageUrl,
        };
      }
    }

    return NextResponse.json({
      success: true,
      liveAiActive: hasLiveKey,
      providerUsed,
      angles: enhancedAngles,
      script: {
        durationSec: 10.0,
        acts: [
          {
            id: 'stock_intro',
            startSec: 0.0,
            endSec: 2.4,
            label: 'OLDINGI HOLAT (ZAVOD)',
          },
          {
            id: 'laser_drop',
            startSec: 2.4,
            endSec: 2.9,
            label: '4K AI LAZER SKANERLASH',
          },
          {
            id: 'multi_angle_showcase',
            startSec: 2.9,
            endSec: 8.2,
            label: 'TUNING NATIJASI · 5 RAKURS',
          },
          {
            id: 'split_finale',
            startSec: 8.2,
            endSec: 10.0,
            label: 'OLDIN VA KEYIN · SOLISHTIRISH',
          },
        ],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video edit error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
