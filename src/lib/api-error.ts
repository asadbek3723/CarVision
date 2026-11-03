'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

export interface ApiErrorBody {
  code?: string | undefined;
  error?: string | undefined;
  [key: string]: unknown;
}

/**
 * Turns an API error response (`{ code, error }`) into text in the active UI language.
 * A known `code` wins; otherwise the server's own message, then `fallback`. Extra fields of
 * the response (e.g. `limit`) are available as `{placeholders}` in the translation.
 */
export function useApiError() {
  const t = useTranslations('apiErrors');
  return React.useCallback((body: ApiErrorBody | null | undefined, fallback: string): string => {
    const code = body?.code;
    if (typeof code === 'string' && t.has(code)) {
      const values: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(body ?? {})) if (typeof v === 'string' || typeof v === 'number') values[k] = v;
      return t(code, values);
    }
    return (typeof body?.error === 'string' && body.error) || fallback;
  }, [t]);
}
