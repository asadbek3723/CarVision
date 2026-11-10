import { NextResponse } from 'next/server';

/** Period from `from` / `to` query params (ISO dates, `to` exclusive). Defaults to the last 30 days. */
export function financeRange(params: URLSearchParams): { from: string; to: string } {
  const parse = (v: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const to = parse(params.get('to')) ?? new Date(Date.now() + 60_000);
  const from = parse(params.get('from')) ?? new Date(to.getTime() - 30 * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV download (UTF-8 BOM so Excel shows Uzbek / Cyrillic text correctly). */
export function csvResponse(filename: string, rows: unknown[][]): NextResponse {
  const body = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
