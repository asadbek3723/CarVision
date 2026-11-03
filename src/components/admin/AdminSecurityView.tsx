'use client';

import { useTranslations } from 'next-intl';
import { ErrorState, EmptyState, PageHeader, Pill, Spinner, StatTile, Surface, dateTime, useAdminData } from './ui';
import { actionLabel, attemptLabel } from './labels';

interface Data {
  stats: { failed24h: number; pinFailed24h: number };
  actions: Array<{ id: string; action: string; entity: string; admin: string; ip: string; details: Record<string, unknown> | null; at: string }>;
  failedAttempts: Array<{ id: string; kind: string; who: string; ip: string; at: string }>;
}

function detail(t: (key: string, values?: Record<string, string | number>) => string, d: Record<string, unknown> | null): string {
  if (!d) return '';
  const parts: string[] = [];
  if (typeof d['delta'] === 'number') parts.push(t('dCredits', { delta: `${(d['delta'] as number) > 0 ? '+' : ''}${d['delta']}` }));
  if (typeof d['plan'] === 'string') parts.push(t('dPlan', { plan: d['plan'] }));
  if (typeof d['reason'] === 'string' && d['reason']) parts.push(t('dReason', { reason: d['reason'] }));
  if (typeof d['notes'] === 'string' && d['notes']) parts.push(String(d['notes']));
  return parts.join(' · ');
}

export function AdminSecurityView() {
  const t = useTranslations('adm.security');
  const ta = useTranslations('adm.actions');
  const tt = useTranslations('adm.attempts');
  const { data, error, loading, reload } = useAdminData<Data>('/api/v1/admin/audit');
  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label={t('failedLogins')} value={data.stats.failed24h} accent={data.stats.failed24h > 20 ? 'red' : undefined} />
        <StatTile label={t('failedPins')} value={data.stats.pinFailed24h} accent={data.stats.pinFailed24h ? 'amber' : undefined} />
      </div>

      <h2 className="mb-3 mt-6 text-sm font-bold text-white">{t('actions')}</h2>
      <div className="space-y-2">
        {data.actions.length === 0 && <EmptyState>{t('noActions')}</EmptyState>}
        {data.actions.map((a) => (
          <Surface key={a.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{actionLabel(ta, a.action)}</p>
              <span className="text-xs text-white/40">{dateTime(a.at)}</span>
            </div>
            <p className="mt-1 text-xs text-white/50">{a.admin}{a.ip ? ` · ${a.ip}` : ''}</p>
            {detail(t, a.details) && <p className="mt-1 text-xs text-white/60">{detail(t, a.details)}</p>}
          </Surface>
        ))}
      </div>

      <h2 className="mb-3 mt-6 text-sm font-bold text-white">{t('attempts')}</h2>
      <div className="space-y-2">
        {data.failedAttempts.length === 0 && <EmptyState>{t('noAttempts')}</EmptyState>}
        {data.failedAttempts.map((a) => (
          <Surface key={a.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Pill tone="red">{attemptLabel(tt, a.kind)}</Pill><span className="truncate text-sm text-white/80">{a.who}</span></div>
              <p className="mt-1 text-xs text-white/40">{a.ip || t('ipUnknown')}</p>
            </div>
            <span className="shrink-0 text-xs text-white/40">{dateTime(a.at)}</span>
          </Surface>
        ))}
      </div>
    </div>
  );
}
