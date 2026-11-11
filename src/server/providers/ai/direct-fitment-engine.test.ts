import { describe, it, expect } from 'vitest';
import {
  isAllowedRemoteImageUrl,
  resolveImageToDataUri,
  executeDirectAiFitment,
} from './direct-fitment-engine';

describe('direct-fitment-engine input safety', () => {
  it('blocks path traversal out of /public', async () => {
    expect(await resolveImageToDataUri('/../package.json')).toBeNull();
    expect(await resolveImageToDataUri('/../../etc/passwd')).toBeNull();
    expect(await resolveImageToDataUri('/%2e%2e/package.json')).toBeNull();
    expect(await resolveImageToDataUri('//evil.example/x.jpg')).toBeNull();
  });

  it('only allows non-image extensions to resolve to null', async () => {
    expect(await resolveImageToDataUri('/manifest.json')).toBeNull();
  });

  it('rejects non-image data URIs and arbitrary remote hosts (SSRF)', async () => {
    expect(await resolveImageToDataUri('data:text/html;base64,PGgxPg==')).toBeNull();
    expect(await resolveImageToDataUri('http://169.254.169.254/latest/meta-data')).toBeNull();
    expect(await resolveImageToDataUri('https://evil.example/car.jpg')).toBeNull();
    expect(isAllowedRemoteImageUrl('https://v3.fal.media/files/a.jpg')).toBe(true);
    expect(isAllowedRemoteImageUrl('https://fal.media.evil.example/a.jpg')).toBe(false);
    expect(isAllowedRemoteImageUrl('http://v3.fal.media/a.jpg')).toBe(false);
    // Google Cloud Storage: only Fal's own bucket, never any other bucket.
    expect(isAllowedRemoteImageUrl('https://storage.googleapis.com/falserverless/out/a.png')).toBe(true);
    expect(isAllowedRemoteImageUrl('https://storage.googleapis.com/someone-else/a.png')).toBe(false);
    expect(isAllowedRemoteImageUrl('https://evil-bucket.storage.googleapis.com/a.png')).toBe(false);
  });
});

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
    });

    expect(res.promptUsed).toContain('BBS CI-R 20"');
    expect(res.promptUsed).toContain('Carbon Front Lip');
    expect(res.promptUsed).toContain('front-left 3/4');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('describes every angle and the same-build reference in the prompt', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      angleId: 'rear-left',
      referenceAfter: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      parts: [{ id: 'w1', name: 'BBS CI-R 20"', category: 'Wheels' }],
    });
    expect(res.promptUsed).toContain('rear-left 3/4');
    expect(res.promptUsed).toContain('LAST input image');
    expect(res.promptUsed).toContain('Only modify what is actually visible');
  });

  it('keeps the rest of the car untouched and does not add shine', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      angleId: 'front-left',
      parts: [{ id: 'w1', name: 'BBS CI-R 20"', category: 'Wheels' }],
    });
    expect(res.promptUsed).toContain('dents');
    expect(res.promptUsed).toContain('Never repair, clean, smooth');
    expect(res.promptUsed).toContain('Do not add extra shine');
  });

  it('recolours in place and keeps damage visible', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      angleId: 'right',
      parts: [{ id: 'c1', name: 'Satin Black', category: 'Color', swatch: '#111' }],
    });
    expect(res.promptUsed).toContain('Change ONLY the exterior paint colour');
    expect(res.promptUsed).toContain('Do not make the paint glossier');
    expect(res.promptUsed).not.toContain('Do not add extra shine');
  });

  it('describes ceramic coating and polishing as paint finish only', async () => {
    const ceramic = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      parts: [{ id: 'k1', name: 'Ceramic Pro 9H', category: 'Ceramic' }],
    });
    expect(ceramic.promptUsed).toContain('CERAMIC COATING');
    expect(ceramic.promptUsed).toContain('deep scratches stay');
    const polish = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      parts: [{ id: 'p1', name: 'Polirovka 2 bosqich', category: 'Polish' }],
    });
    expect(polish.promptUsed).toContain('PAINT POLISHING');
    expect(polish.promptUsed).toContain('Dents, creases, deep scratches');
  });
});

describe('fitment prompt output rules', () => {
  it('asks for one picture with the same framing and nothing added', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      angleId: 'rear',
      parts: [{ id: 'w', name: 'BBS', category: 'Wheels' }],
    });
    expect(res.promptUsed).toMatch(/exactly one picture/i);
    expect(res.promptUsed).toMatch(/same framing, aspect ratio and camera angle/i);
    expect(res.promptUsed).toMatch(/No text, captions, logos, watermark/i);
    expect(res.promptUsed).toMatch(/Do not add people/i);
  });
});
