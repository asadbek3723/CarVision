'use client';

import { useTranslations } from 'next-intl';

/** Shop / studio category id (e.g. "Body Kit") -> key in `customize.categories`. */
const KEY: Record<string, string> = {
  Wheels: 'wheels',
  Bumper: 'bumper',
  'Body Kit': 'bodyKit',
  Spoiler: 'spoiler',
  Lights: 'lights',
  Performance: 'performance',
  Interior: 'interior',
  Color: 'color',
  Ceramic: 'ceramic',
  Polish: 'polish',
};

/** Translated label for a category id; unknown ids are shown as they are. */
export function useCategoryLabel() {
  const t = useTranslations('customize.categories');
  return (category: string | undefined | null) => {
    const key = category ? KEY[category] : undefined;
    return key && t.has(key) ? t(key) : category ?? '';
  };
}
