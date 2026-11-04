import { describe, expect, it } from 'vitest';
import { localizedText } from './catalog';

const item = {
  name: 'Kovka disklar BBS CI-R 20',
  description: 'Yangi, 4 ta komplekt',
  sourceLang: 'uz',
  translations: {
    ru: { name: 'Кованые диски BBS CI-R 20', description: 'Новые, комплект из 4 штук' },
    en: { name: '', description: 'New, set of 4' },
  },
};

describe('localizedText', () => {
  it('returns the translation for another language', () => {
    expect(localizedText(item, 'ru')).toEqual({ name: 'Кованые диски BBS CI-R 20', description: 'Новые, комплект из 4 штук' });
  });
  it('returns the original in the seller language', () => {
    expect(localizedText(item, 'uz')).toEqual({ name: item.name, description: item.description });
  });
  it('falls back to the original for each missing or empty field', () => {
    expect(localizedText(item, 'en')).toEqual({ name: item.name, description: 'New, set of 4' });
    expect(localizedText(item, 'tg')).toEqual({ name: item.name, description: item.description });
  });
  it('works without any translations', () => {
    expect(localizedText({ name: 'A', description: 'B' }, 'ru')).toEqual({ name: 'A', description: 'B' });
  });
});
