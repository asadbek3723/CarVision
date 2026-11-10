'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { EmptyState, ErrorState, LoadMore, Pill, Sheet, Spinner, dateTime, useAdminFormat, useAdminPaged } from './ui';

interface Entry {
  id: string;
  scope: 'shop' | 'personal';
  amount: number;
  balanceAfter: number;
  action: string;
  description: string;
  at: string;
}
interface Page {
  entries: Entry[];
  total: number;
  nextOffset: number | null;
}

const KNOWN = new Set(['TRIAL_BONUS', 'MONTHLY_FREE', 'PLAN_ASSIGNED', 'RESERVED', 'COMMITTED', 'REFUNDED', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT']);

/** Credit history of one account or workshop, paged from the append-only ledger. */
export function AdminLedgerSheet({ target, onClose }: { target: { title: string; userId?: string; shopId?: string } | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(target)} onClose={onClose} title={target?.title ?? ''}>
      {target && <LedgerList userId={target.userId} shopId={target.shopId} />}
    </Sheet>
  );
}

function LedgerList({ userId, shopId }: { userId?: string | undefined; shopId?: string | undefined }) {
  const t = useTranslations('adm.ledger');
  const { nf } = useAdminFormat();
  const url = `/api/v1/admin/credits/ledger?${userId ? `userId=${userId}` : `shopId=${shopId}`}`;
  const { items, meta, error, loading, loadingMore, reload, loadMore, hasMore } = useAdminPaged<Entry, Page>(url, (p) => p.entries);

  if (loading && !meta) return <Spinner />;
  if (error && !meta) return <ErrorState message={error} onRetry={reload} />;
  if (items.length === 0) return <EmptyState>{t('empty')}</EmptyState>;

  return (
    <div>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-white">{KNOWN.has(e.action) ? t(`a.${e.action}`) : e.action}</span>
                {userId && <Pill tone={e.scope === 'shop' ? 'blue' : 'neutral'}>{t(e.scope)}</Pill>}
              </div>
              {e.description && <p className="mt-0.5 truncate text-xs text-white/45">{e.description}</p>}
              <p className="mt-0.5 text-[11px] text-white/35">{dateTime(e.at)}</p>
            </div>
            <div className="shrink-0 text-end">
              <p className={`text-sm font-bold tabular-nums ${e.amount > 0 ? 'text-emerald-300' : e.amount < 0 ? 'text-red-300' : 'text-white/60'}`}>
                {e.amount > 0 ? '+' : ''}{nf.format(e.amount)}
              </p>
              <p className="text-[11px] tabular-nums text-white/40">{t('after', { count: nf.format(e.balanceAfter) })}</p>
            </div>
          </li>
        ))}
      </ul>
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} shown={items.length} total={meta?.total ?? 0} />
    </div>
  );
}
