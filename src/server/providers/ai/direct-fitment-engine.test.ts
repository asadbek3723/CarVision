import { describe, it, expect } from 'vitest';
import {
  isAllowedRemoteImageUrl,
  resolveImageToDataUri,
  executeDirectAiFitment,
  paintFinish,
  tintVlt,
  partKind,
  sendsPartPhoto,
  photoParts,
  partPhotoLabel,
  keepList,
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
    expect(res.promptUsed).toContain('front three-quarter view');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('describes every angle and the same-build reference in the prompt', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      angleId: 'rear-left',
      referenceAfter: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      parts: [{ id: 'w1', name: 'BBS CI-R 20"', category: 'Wheels' }],
    });
    expect(res.promptUsed).toContain('rear three-quarter view');
    expect(res.promptUsed).toContain('LAST input image');
    expect(res.promptUsed).toContain('Only modify what is actually visible');
  });

  describe('bumper from a photo of another car', () => {
    const car = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const bumper = { id: 'b1', name: 'Sport front bumper', category: 'Bumper' };

    it('takes only the bumper shape, never the photo car lamps or paint', async () => {
      const res = await executeDirectAiFitment({ carPhoto: car, angleId: 'front', parts: [bumper] });
      expect(res.promptUsed).toContain('take ONLY the bumper itself');
      expect(res.promptUsed).toContain('IGNORE everything else in it, including its headlights and tail lights');
      expect(res.promptUsed).toContain("the car's own paint colour from the customer photo");
      expect(res.promptUsed).toContain('The headlights and tail lights stay the lamps of the customer photo, unchanged');
      expect(res.promptUsed).toContain('PART PHOTOS');
    });

    it('paints the bumper in the colour chosen in the same build', async () => {
      const res = await executeDirectAiFitment({
        carPhoto: car,
        angleId: 'front',
        parts: [bumper, { id: 'c1', name: 'Mercedes Obsidian Black', category: 'Color', swatch: '#0B0B0C' }],
      });
      expect(res.promptUsed).toContain('the new paint colour of this build, "Mercedes Obsidian Black" (#0B0B0C)');
      expect(res.promptUsed).not.toContain("the car's own paint colour from the customer photo");
    });

    it('keeps the headlights chosen in the same build, not the bumper photo ones', async () => {
      const res = await executeDirectAiFitment({
        carPhoto: car,
        angleId: 'front',
        parts: [bumper, { id: 'h1', name: 'Angel Eye LED headlights', category: 'Lights' }],
      });
      expect(res.promptUsed).toContain('The headlights and tail lights stay the lamps listed in this build');
      expect(res.promptUsed).toContain('never copy the lamps of the bumper photo');
      expect(res.promptUsed).toContain('never its bumper, grille or paint colour');
    });
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
    expect(res.promptUsed).toContain('REPAINT the whole car body in "Satin Black"');
    expect(res.promptUsed).toContain('Every dent, crease, scratch, scuff, chip and panel gap stays visible');
    // Satin reads as a matte finish, so the old gloss is not kept.
    expect(res.promptUsed).toContain('MATTE finish');
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
    expect(polish.promptUsed).toContain('dents, creases, deep scratches');
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

describe('paint colour renders', () => {
  const car = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const run = (name: string, spec: string, swatch: string) =>
    executeDirectAiFitment({ carPhoto: car, angleId: 'front-left', parts: [{ id: 'c1', name, category: 'Color', spec, swatch }] });

  it('reads the finish from the name or description in the shop languages', () => {
    expect(paintFinish({ name: 'Mat qora — kuzovni to‘liq bo‘yash' })).toBe('matte');
    expect(paintFinish({ name: 'Матовый чёрный' })).toBe('matte');
    expect(paintFinish({ name: 'Bordo metallik' })).toBe('metallic');
    expect(paintFinish({ name: 'Graphite Grey', spec: 'a gloss paint with metallic flake' })).toBe('metallic');
    expect(paintFinish({ name: 'Racing Yellow', spec: 'a gloss solid paint' })).toBe('gloss');
  });

  it('paints by the light of the photo, keeps shadows, depth and every small detail', async () => {
    const res = await run('Racing Yellow', 'a gloss solid paint', '#E8A93A');
    expect(res.promptUsed).toContain('REPAINT the whole car body in "Racing Yellow" (base tone #E8A93A)');
    expect(res.promptUsed).toContain('LIGHT FIRST');
    expect(res.promptUsed).toContain('SHADOWS AND DEPTH');
    expect(res.promptUsed).toContain('COVER EVERY PAINTED DETAIL');
    expect(res.promptUsed).toContain('DO NOT PAINT what is not body paint');
    expect(res.promptUsed).toContain('GLOSS solid finish');
  });

  it('a matte colour drops mirror reflections instead of keeping the old gloss', async () => {
    const res = await run('Matte Black', 'a matte finish with no gloss', '#2B2B2B');
    expect(res.promptUsed).toContain('MATTE finish: no mirror-like reflections');
    expect(res.promptUsed).toContain('The paint finish becomes the matte finish');
    expect(res.promptUsed).not.toContain('The paint gloss level stays the same');
  });
});

describe('window tint renders', () => {
  const car = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const run = (name: string) =>
    executeDirectAiFitment({ carPhoto: car, angleId: 'front-left', parts: [{ id: 't1', name, category: 'Tint' }] });

  it('reads the film darkness from the name', () => {
    expect(tintVlt({ name: 'Suntek Carbon 5% tonirovka — Cobalt' })).toBe(5);
    expect(tintVlt({ name: 'XPEL Prime XR Plus 35 % — Gentra' })).toBe(35);
    expect(tintVlt({ name: 'Tonirovka' })).toBeNull();
  });

  it('tints every window to the film darkness and leaves the rest of the car', async () => {
    const dark = await run('Suntek Carbon 5% tonirovka — Cobalt');
    expect(dark.promptUsed).toContain('to EVERY window of the car visible from this viewpoint: the windshield');
    expect(dark.promptUsed).toContain('5% VLT, a "limo" tint');
    expect(dark.promptUsed).toContain('the window glass except for the listed tint film');
    const light = await run('3M Crystalline 70% tonirovka — Cobalt');
    expect(light.promptUsed).toContain('70% VLT: a very light, almost clear film');
  });

  it('a build without tint still keeps the glass as it is', async () => {
    const res = await executeDirectAiFitment({ carPhoto: car, parts: [{ id: 'w1', name: 'BBS CI-R 20"', category: 'Wheels' }] });
    expect(res.promptUsed).toContain('number plate, glass, and all existing damage');
  });
});

describe('what a part does, and which photos reach the model', () => {
  const car = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

  it('a window film in the Color tab, or with a leftover swatch, tints the glass and never repaints the car', async () => {
    expect(partKind({ category: 'Color', name: 'Tonirovka 35%', swatch: '#E8BF74' })).toBe('tint');
    expect(partKind({ category: 'Tint', name: 'XPEL 20%', swatch: '#E8BF74' })).toBe('tint');
    const res = await executeDirectAiFitment({
      carPhoto: car,
      angleId: 'right',
      parts: [{ id: 't', name: 'Tonirovka 35%', category: 'Color', swatch: '#E8BF74' }],
    });
    expect(res.promptUsed).not.toContain('REPAINT');
    expect(res.promptUsed).toContain('35% VLT');
    expect(res.promptUsed).toContain('the exact paint colour of the customer photo');
  });

  it('a wheel with a colour swatch is still a wheel', () => {
    expect(partKind({ category: 'Wheels', name: 'Vossen HF-5', swatch: '#111111' })).toBe('wheels');
  });

  it('tint, ceramic, polish and swatch colours send no shop photo; shape parts do, most important first', () => {
    expect(sendsPartPhoto({ category: 'Tint', name: 'Film 5%' })).toBe(false);
    expect(sendsPartPhoto({ category: 'Ceramic', name: 'Ceramic Pro' })).toBe(false);
    expect(sendsPartPhoto({ category: 'Polish', name: 'Polirovka' })).toBe(false);
    expect(sendsPartPhoto({ category: 'Color', name: 'Red', swatch: '#ff0000' })).toBe(false);
    expect(sendsPartPhoto({ category: 'Color', name: 'Red' })).toBe(true);
    const order = photoParts([
      { category: 'Color', name: 'Red' },
      { category: 'Lights', name: 'LED' },
      { category: 'Tint', name: 'Film' },
      { category: 'Wheels', name: 'BBS' },
    ]).map((p) => p.name);
    expect(order).toEqual(['BBS', 'LED', 'Red']);
  });

  it('every part photo caption says to ignore the car it is fitted on', () => {
    expect(partPhotoLabel({ category: 'Bumper', name: 'GT bumper' })).toContain("that car's paint colour");
    expect(partPhotoLabel({ category: 'Lights', name: 'LED' })).toContain('copy ONLY the lamp units');
  });

  it('reads the film darkness next to VLT, not the UV figure', () => {
    expect(tintVlt({ name: 'Llumar', spec: 'blocks 99% UV, 35% VLT' })).toBe(35);
    expect(tintVlt({ name: 'Llumar', spec: 'UV 99%' })).toBeNull();
    expect(tintVlt({ name: 'Film', spec: 'VLT 20%' })).toBe(20);
  });

  it('ends with the finished state of every region, keeping what was not chosen', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: car,
      angleId: 'front',
      parts: [{ id: 'b', name: 'GT bumper', category: 'Bumper' }],
    });
    expect(res.promptUsed).toContain('FINAL RESULT, region by region');
    expect(res.promptUsed).toContain('never the colour of a part photo');
    expect(res.promptUsed).toContain('Headlights and tail lights: exactly those of the customer photo, unchanged');
    expect(res.promptUsed).not.toContain('studio');
  });

  it('a front bumper on a side photo changes only its visible corner', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: car,
      angleId: 'left',
      parts: [{ id: 'b', name: 'GT bumper', category: 'Bumper' }],
    });
    expect(res.promptUsed).toContain('only its corner / side edge is visible');
  });

  it('the check knows what must stay', () => {
    expect(keepList([{ category: 'Bumper', name: 'GT' }])).toContain('the same paint colour as IMAGE 1');
    expect(keepList([{ category: 'Color', name: 'Red', swatch: '#f00' }])).not.toContain('the same paint colour as IMAGE 1');
  });
});

describe('parts with and without a photo, front and rear', () => {
  const car = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

  it('a part without a photo is told so, so it never borrows another part photo', async () => {
    const res = await executeDirectAiFitment({
      carPhoto: car,
      angleId: 'front',
      parts: [
        { id: 'b', name: 'GT bumper', category: 'Bumper' },
        { id: 'w', name: 'BBS', category: 'Wheels', image: '/images/studio/wheel_bbs.jpg' },
      ],
    });
    const bumperLine = res.promptUsed.split('2. ')[0]!;
    expect(bumperLine).toContain('No photo of this part is given');
    expect(res.promptUsed.split('2. ')[1]!.split('Apply every change')[0]).not.toContain('No photo of this part is given');
  });

  it('a swatch colour says the colour comes from the swatch, not from a photo', async () => {
    const res = await executeDirectAiFitment({ carPhoto: car, parts: [{ id: 'c', name: 'Red', category: 'Color', swatch: '#ff0000' }] });
    expect(res.promptUsed).toContain('No photo of this paint is given: the colour is exactly the base tone #ff0000');
    expect(res.promptUsed).not.toContain('Its reference photo is a close-up sample');
  });

  it('names the front or rear bumper and the head or tail lights by their zone', async () => {
    const front = await executeDirectAiFitment({ carPhoto: car, angleId: 'right', parts: [{ id: 'b', name: 'GT', category: 'Bumper', zone: 'front' }] });
    expect(front.promptUsed).toContain('Replace the FRONT bumper (never the rear one)');
    const tail = await executeDirectAiFitment({ carPhoto: car, angleId: 'rear', parts: [{ id: 'l', name: 'Orqa fara LED', category: 'Lights' }] });
    expect(tail.promptUsed).toContain('Replace the TAIL LIGHTS (never the headlights)');
  });
});
