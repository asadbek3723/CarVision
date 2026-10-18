import { describe, it, expect } from 'vitest';
import {
  resolveImageToDataUri,
  executeDirectAiFitment,
} from './direct-fitment-engine';

describe('direct-fitment-engine', () => {
  it('passes through data:image URIs unchanged', async () => {
    const sample = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const resolved = await resolveImageToDataUri(sample);
    expect(resolved).toBe(sample);
  });

  it('returns null for empty image strings', async () => {
    const resolved = await resolveImageToDataUri('   ');
    expect(resolved).toBeNull();
  });

  it('builds a precision automotive fitment prompt and falls back cleanly when no API key is set', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      angleId: 'front-left',
      parts: [
        {
          id: 'wheel-1',
          name: 'BBS CI-R 20"',
          category: 'Wheels',
          spec: '20" Forged',
        },
        {
          id: 'body-1',
          name: 'Carbon Front Lip',
          category: 'Body Kit',
        },
      ],
      mode: 'fitment',
    });

    expect(res.promptUsed).toContain('BBS CI-R 20"');
    expect(res.promptUsed).toContain('Carbon Front Lip');
    expect(res.promptUsed).toContain('front-left 3/4');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('builds an 8K video frame restoration prompt in enhance_for_video mode', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      angleId: 'right',
      parts: [
        {
          id: 'light-1',
          name: 'Matrix Laser Headlights',
          category: 'Performance',
        },
      ],
      mode: 'enhance_for_video',
    });

    expect(res.promptUsed).toContain('Ultra-sharp 8K commercial automotive cinematography');
    expect(res.promptUsed).toContain('Matrix Laser Headlights');
  });
});
