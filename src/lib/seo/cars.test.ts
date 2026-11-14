import { describe, expect, it } from 'vitest';
import { CARS_COPY, carModels, carSlug, partsForCar } from './cars';

const item = (id: string, category: 'wheels' | 'body_kit' | 'other', labels: string[], universal = false, attributes: Record<string, unknown> = {}) => ({
  id,
  category,
  attributes,
  isUniversal: universal,
  fitment: labels.map((label) => ({ label })),
});

describe('car model pages', () => {
  it('turns a model name into a readable URL segment', () => {
    expect(carSlug('Chevrolet Gentra')).toBe('chevrolet-gentra');
    expect(carSlug('  Škoda  Octavia A7 ')).toBe('skoda-octavia-a7');
    expect(carSlug('Нексия')).toBe('');
  });

  it('lists every model with its own parts, most first', () => {
    const models = carModels([
      item('1', 'wheels', ['Chevrolet Gentra', 'Chevrolet Cobalt']),
      item('2', 'body_kit', ['Chevrolet Gentra']),
      item('3', 'wheels', [], true),
    ]);
    expect(models).toEqual([
      { slug: 'chevrolet-gentra', label: 'Chevrolet Gentra', count: 2 },
      { slug: 'chevrolet-cobalt', label: 'Chevrolet Cobalt', count: 1 },
    ]);
  });

  it('keeps listed and universal parts apart, and filters by catalog section (tint counts as paint & tint)', () => {
    const items = [
      item('1', 'wheels', ['Chevrolet Gentra']),
      item('2', 'wheels', [], true),
      item('3', 'other', ['Chevrolet Gentra'], false, { part: 'window_tint' }),
    ];
    expect(partsForCar(items, 'chevrolet-gentra', 'wheels')).toEqual({ listed: [items[0]], universal: [items[1]] });
    expect(partsForCar(items, 'chevrolet-gentra', 'wrap_paint').listed).toEqual([items[2]]);
  });

  it('writes the page heading the way people search', () => {
    expect(CARS_COPY.uz.carCategoryH1('Disklar', 'Chevrolet Gentra')).toBe('Chevrolet Gentra uchun disklar');
    expect(CARS_COPY.ru.carCategoryH1('Диски', 'Chevrolet Gentra')).toBe('Диски для Chevrolet Gentra');
  });
});
