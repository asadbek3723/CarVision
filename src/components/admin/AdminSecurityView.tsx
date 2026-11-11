'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { ErrorState, EmptyState, LoadMore, PageHeader, Pill, Segmented, Spinner, StatTile, Surface, dateTime, useAdminPaged } from './ui';
import { actionLabel, attemptLabel } from './labels';

type LockId = 'stableDomain' | 'https' | 'ports' | 'keyOnlyAccess' | 'privateDb' | 'waf';
interface Lock { id: LockId; ok: boolean; source: 'auto' | 'manual' }

interface Data {
  stats: { failed24h: number; pinFailed24h: number };
  locks?: Lock[];
  actions: Array<{ id: string; action: string; entity: string; admin: string; ip: string; details: Record<string, unknown> | null; at: string }>;
  failedAttempts: Array<{ id: string; kind: string; who: string; ip: string; at: string }>;
  total: number;
  nextOffset: number | null;
}
type Group = 'all' | 'money' | 'credits' | 'access';
type Action = Data['actions'][number];

function detail(t: (key: string, values?: Record<string, string | number>) => string, d: Record<string, unknown> | null): string {
  if (!d) return '';
  const parts: string[] = [];
  if (typeof d['delta'] === 'number') parts.push(t('dCredits', { delta: `${(d['delta'] as number) > 0 ? '+' : ''}${d['delta']}` }));
  if (typeof d['plan'] === 'string') parts.push(t('dPlan', { plan: d['plan'] }));
  if (typeof d['reason'] === 'string' && d['reason']) parts.push(t('dReason', { reason: d['reason'] }));
  if (typeof d['notes'] === 'string' && d['notes']) parts.push(String(d['notes']));
  return parts.join(' · ');
}

/** "Server · 6 locks": each classic server control, as its Vercel / Supabase equivalent (SECURITY.md). */
function ServerLocks({ locks }: { locks: Lock[] }) {
  const t = useTranslations('adm.security');
  const on = locks.filter((l) => l.ok).length;
  return (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-white">{t('locksTitle', { count: locks.length })}</h2>
        <Pill tone={on === locks.length ? 'green' : 'amber'}>{`${on} / ${locks.length}`}</Pill>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {locks.map((l, i) => (
          <Surface key={l.id} className="flex items-start gap-3 p-4">
            {l.ok ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <CircleDashed aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{t(`lock.${l.id}`)}</p>
              <p className="mt-1 text-xs text-white/50">{t(`lockHow.${l.id}`)}</p>
              <p className={`mt-1 text-xs ${l.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                {l.ok ? t('lockOn') : l.source === 'manual' ? t('lockManual') : t('lockOff')}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-white/30">{i + 1}</span>
          </Surface>
        ))}
      </div>
    </>
  );
}

export function AdminSecurityView() {
  const t = useTranslations('adm.security');
  const ta = useTranslations('adm.actions');
  const tt = useTranslations('adm.attempts');
  const [group, setGroup] = React.useState<Group>('all');
  const { items: actions, meta: data, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<Action, Data>(group === 'all' ? '/api/v1/admin/audit' : '/api/v1/admin/audit?group=' + group, (p) => p.actions);
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

      {data.locks && data.locks.length > 0 && <ServerLocks locks={data.locks} />}

      <h2 className="mb-3 mt-6 text-sm font-bold text-white">{t('actions')}</h2>
      <div className="mb-3">
        <Segmented
          value={group}
          onChange={setGroup}
          options={[
            { id: 'all', label: t('gAll') },
            { id: 'money', label: t('gMoney') },
            { id: 'credits', label: t('gCredits') },
            { id: 'access', label: t('gAccess') },
          ]}
        />
      </div>
      <div className="space-y-2">
        {actions.length === 0 && <EmptyState>{t('noActions')}</EmptyState>}
        {actions.map((a) => (
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
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={actions.length} total={data.total} />

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
