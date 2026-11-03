'use client';

import { useTranslations } from 'next-intl';
import { IMAGE_ERROR, type QualityIssue } from './image-tools';

/** Translates image helper errors (codes) and quality issues; unknown messages (e.g. from the server) pass through. */
export function useImageErrorText() {
  const t = useTranslations('imageErrors');
  const byCode: Record<string, string> = {
    [IMAGE_ERROR.open]: t('open'),
    [IMAGE_ERROR.save]: t('save'),
    [IMAGE_ERROR.read]: t('read'),
    [IMAGE_ERROR.type]: t('type'),
  };
  return {
    error: (err: unknown, fallback: string): string =>
      err instanceof Error ? byCode[err.message] ?? (err.message || fallback) : fallback,
    issue: (issue: QualityIssue): string =>
      issue.code === 'tooSmall' ? t('tooSmall', { width: issue.width, height: issue.height }) : t(issue.code),
  };
}
