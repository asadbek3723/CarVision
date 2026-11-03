import type { ImageEditProvider } from './interface';
import { FalImageEditProvider } from './fal-provider';
import { MockImageEditProvider } from './mock-provider';

export function getAiImageProvider(): ImageEditProvider {
  // If user provided a real FAL_KEY in .env.local, use live Fal.ai
  if (process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 5) {
    return new FalImageEditProvider();
  }

  // Otherwise, use zero-cost realistic Mock adapter
  return new MockImageEditProvider();
}

export * from './interface';
export * from './circuit-breaker';
