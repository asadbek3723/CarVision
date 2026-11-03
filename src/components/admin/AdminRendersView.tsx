'use client';

import { useTranslations } from 'next-intl';
import { EmptyState, ErrorState, PageHeader, Pill, Spinner, StatTile, Surface, useAdminData, useAdminFormat } from './ui';

interface Gen {
  id: string;
  user: string;
  status: string;
  provider: string | null;
  angle: string | null;
  seconds: number | null;
  credits: number;
  creditState: string;
  error: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface Data {
  stats: { total: number; completed: number; failed: number; successRate: number | null; avgSeconds: number | null; creditsCommitted: number; creditsRefunded: number; byProvider: Record<string, number> };
  items: Gen[];
}

const TONE: Record<string, 'green' | 'red' | 'amber' | 'neutral'> = { COMPLETED: 'green', FAILED: 'red', PROCESSING: 'amber', QUEUED: 'neutral' };
const STATUSES = new Set(['COMPLETED', 'FAILED', 'PROCESSING', 'QUEUED']);
const CREDIT_STATES = new Set(['COMMITTED', 'REFUNDED', 'RESERVED', 'NONE']);

export function AdminRendersView() {
  const t = useTranslations('adm.renders');
  const tc = useTranslations('adm.common');
  const { nf, timeAgo } = useAdminFormat();
  const { data, error, loading, reload } = useAdminData<Data>('/api/v1/admin/generations');
  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const s = data.stats;
  const providers = Object.entries(s.byProvider);

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t('done')} value={nf.format(s.completed)} accent="green" />
        <StatTile label={t('failed')} value={nf.format(s.failed)} accent={s.failed ? 'red' : undefined} hint={t('refundedHint')} />
        <StatTile label={t('successRate')} value={s.successRate === null ? '—' : `${s.successRate}%`} />
        <StatTile label={t('avg')} value={s.avgSeconds === null ? '—' : tc('seconds', { seconds: s.avgSeconds })} />
        <StatTile label={t('committed')} value={nf.format(s.creditsCommitted)} accent="gold" />
        <StatTile label={t('refundedLabel')} value={nf.format(s.creditsRefunded)} />
      </div>

      {providers.length > 0 && (
        <Surface className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-bold text-white">{t('providers')}</h2>
          <div className="flex flex-wrap gap-2">
            {providers.map(([p, n]) => <Pill key={p} tone="gold">{p}: {n}</Pill>)}
          </div>
        </Surface>
      )}

      <h2 className="mb-3 mt-6 text-sm font-bold text-white">{t('recent')}</h2>
      <div className="space-y-3">
        {data.items.length === 0 && <EmptyState>{t('empty')}</EmptyState>}
        {data.items.map((g) => (
          <Surface key={g.id} className="flex gap-4 p-3 sm:p-4">
            <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-black">
              {g.imageUrl && g.imageUrl.startsWith('http') ? <img src={g.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={TONE[g.status] ?? 'neutral'}>{STATUSES.has(g.status) ? t(g.status) : g.status}</Pill>
                {g.provider && <Pill>{g.provider}</Pill>}
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold text-white">{g.user}</p>
              <p className="text-xs text-white/45">
                {timeAgo(g.createdAt)}{g.seconds !== null ? ` · ${tc('seconds', { seconds: g.seconds })}` : ''} · {CREDIT_STATES.has(g.creditState) ? t(g.creditState) : g.creditState}
              </p>
              {g.error && <p className="mt-1 truncate text-xs text-red-300">{g.error}</p>}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
