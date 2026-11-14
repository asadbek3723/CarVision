'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { EmptyState, ErrorState, LoadMore, PageHeader, Pill, Segmented, Spinner, StatTile, Surface, useAdminFormat, useAdminPaged } from './ui';

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
  check: { sameView?: boolean; sameCar?: boolean; keepsRest?: boolean; partsComplete?: boolean; problem?: string; retried?: boolean } | null;
  feedback: { reason: string | null; note: string | null; at: string | null } | null;
}

interface QualityLine {
  key: string;
  renders: number;
  checked: number;
  faults: number;
  retried: number;
  disliked: number;
}

interface Data {
  stats: { total: number; completed: number; failed: number; successRate: number | null; avgSeconds: number | null; creditsCommitted: number; creditsRefunded: number; unsettled: number; byProvider: Record<string, number> };
  items: Gen[];
  total: number;
  nextOffset: number | null;
  /** Null until the render_quality migration is applied. */
  quality: { byModel: QualityLine[]; byPart: QualityLine[] } | null;
}
type StatusFilter = 'all' | 'COMPLETED' | 'FAILED' | 'UNSETTLED' | 'DISLIKED';

const REASONS = new Set(['wrong_part', 'wrong_color', 'other_car', 'wrong_angle', 'not_realistic', 'other']);

/** Share of `part` in `whole` as a whole percent, or a dash when there is nothing to divide. */
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');

function QualityTable({ title, lines, t }: { title: string; lines: QualityLine[]; t: (key: string) => string }) {
  return (
    <Surface className="p-5">
      <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-start text-xs">
          <thead className="text-white/45">
            <tr>
              <th className="pb-2 text-start font-medium" />
              <th className="pb-2 text-end font-medium">{t('colRenders')}</th>
              <th className="pb-2 text-end font-medium">{t('colFaults')}</th>
              <th className="pb-2 text-end font-medium">{t('colDisliked')}</th>
            </tr>
          </thead>
          <tbody className="text-white/85">
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-white/[0.06]">
                <td className="max-w-[220px] truncate py-2 pe-3 font-medium text-white">{l.key}</td>
                <td className="py-2 text-end tabular-nums">{l.renders}</td>
                <td className={`py-2 text-end tabular-nums ${l.faults ? 'text-amber-300' : ''}`}>
                  {l.faults} <span className="text-white/40">/ {l.checked} · {pct(l.faults, l.checked)}</span>
                </td>
                <td className={`py-2 text-end tabular-nums ${l.disliked ? 'text-red-300' : ''}`}>
                  {l.disliked} <span className="text-white/40">· {pct(l.disliked, l.renders)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

const TONE: Record<string, 'green' | 'red' | 'amber' | 'neutral'> = { COMPLETED: 'green', FAILED: 'red', PROCESSING: 'amber', QUEUED: 'neutral' };
const STATUSES = new Set(['COMPLETED', 'FAILED', 'PROCESSING', 'QUEUED']);
const CREDIT_STATES = new Set(['COMMITTED', 'REFUNDED', 'RESERVED', 'NONE']);

export function AdminRendersView() {
  const t = useTranslations('adm.renders');
  const tc = useTranslations('adm.common');
  const { nf, timeAgo } = useAdminFormat();
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const { items, meta: data, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<Gen, Data>(status === 'all' ? '/api/v1/admin/generations' : '/api/v1/admin/generations?status=' + status, (p) => p.items);
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
        <StatTile label={t('unsettled')} value={nf.format(s.unsettled)} accent={s.unsettled ? 'amber' : undefined} hint={t('unsettledHint')} />
      </div>

      {providers.length > 0 && (
        <Surface className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-bold text-white">{t('providers')}</h2>
          <div className="flex flex-wrap gap-2">
            {providers.map(([p, n]) => <Pill key={p} tone="gold">{p}: {n}</Pill>)}
          </div>
        </Surface>
      )}

      {data.quality && (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-white">{t('quality')}</h2>
          <p className="mb-3 mt-1 text-xs text-white/45">{t('qualitySub')}</p>
          {data.quality.byModel.length === 0 ? (
            <EmptyState>{t('noQuality')}</EmptyState>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              <QualityTable title={t('byModel')} lines={data.quality.byModel} t={t} />
              <QualityTable title={t('byPart')} lines={data.quality.byPart} t={t} />
            </div>
          )}
        </section>
      )}

      <h2 className="mb-3 mt-6 text-sm font-bold text-white">{t('recent')}</h2>
      <div className="mb-3">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { id: 'all', label: tc('all') },
            { id: 'COMPLETED', label: t('COMPLETED') },
            { id: 'FAILED', label: t('FAILED') },
            { id: 'UNSETTLED', label: t('unsettled'), count: s.unsettled },
            ...(data.quality ? [{ id: 'DISLIKED' as const, label: t('DISLIKED') }] : []),
          ]}
        />
      </div>
      <div className="space-y-3">
        {items.length === 0 && <EmptyState>{t('empty')}</EmptyState>}
        {items.map((g) => (
          <Surface key={g.id} className="flex gap-4 p-3 sm:p-4">
            <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-black">
              {g.imageUrl && g.imageUrl.startsWith('http') ? <img src={g.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={TONE[g.status] ?? 'neutral'}>{STATUSES.has(g.status) ? t(g.status) : g.status}</Pill>
                {g.provider && <Pill>{g.provider}</Pill>}
                {g.check?.sameView === false && <Pill tone="red">{t('checkView')}</Pill>}
                {g.check?.sameCar === false && <Pill tone="red">{t('checkCar')}</Pill>}
                {g.check?.keepsRest === false && <Pill tone="amber">{t('checkRest')}</Pill>}
                {g.check?.partsComplete === false && <Pill tone="amber">{t('checkParts')}</Pill>}
                {g.check?.retried && <Pill>{t('retried')}</Pill>}
                {g.feedback && (
                  <Pill tone="red">
                    {t('DISLIKED')}
                    {g.feedback.reason && REASONS.has(g.feedback.reason) ? `: ${t(`reasons.${g.feedback.reason}`)}` : ''}
                  </Pill>
                )}
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold text-white">{g.user}</p>
              <p className="text-xs text-white/45">
                {timeAgo(g.createdAt)}{g.seconds !== null ? ` · ${tc('seconds', { seconds: g.seconds })}` : ''} · {CREDIT_STATES.has(g.creditState) ? t(g.creditState) : g.creditState}
              </p>
              {g.error && <p className="mt-1 truncate text-xs text-red-300">{g.error}</p>}
              {g.check?.problem && <p className="mt-1 truncate text-xs text-amber-200/80">{g.check.problem}</p>}
              {g.feedback?.note && <p className="mt-1 line-clamp-2 text-xs text-white/70">“{g.feedback.note}”</p>}
            </div>
          </Surface>
        ))}
      </div>
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={items.length} total={data.total} />
    </div>
  );
}
