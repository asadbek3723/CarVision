'use client';

import { EmptyState, ErrorState, PageHeader, Pill, Spinner, StatTile, Surface, nf, timeAgo, useAdminData } from './ui';

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
const LABEL: Record<string, string> = { COMPLETED: 'Tayyor', FAILED: 'Xato', PROCESSING: 'Jarayonda', QUEUED: 'Navbatda' };
const CREDIT: Record<string, string> = { COMMITTED: 'kredit yechildi', REFUNDED: 'kredit qaytarildi', RESERVED: 'kredit band', NONE: 'kreditsiz' };

export function AdminRendersView() {
  const { data, error, loading, reload } = useAdminData<Data>('/api/v1/admin/generations');
  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const s = data.stats;
  const providers = Object.entries(s.byProvider);

  return (
    <div>
      <PageHeader title="AI renderlar" subtitle="So‘nggi 30 kun" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tayyor" value={nf.format(s.completed)} accent="green" />
        <StatTile label="Xato" value={nf.format(s.failed)} accent={s.failed ? 'red' : undefined} hint="kredit qaytarilgan" />
        <StatTile label="Muvaffaqiyat" value={s.successRate === null ? '—' : `${s.successRate}%`} />
        <StatTile label="O‘rtacha vaqt" value={s.avgSeconds === null ? '—' : `${s.avgSeconds}s`} />
        <StatTile label="Yechilgan kredit" value={nf.format(s.creditsCommitted)} accent="gold" />
        <StatTile label="Qaytarilgan kredit" value={nf.format(s.creditsRefunded)} />
      </div>

      {providers.length > 0 && (
        <Surface className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-bold text-white">Provayderlar</h2>
          <div className="flex flex-wrap gap-2">
            {providers.map(([p, n]) => <Pill key={p} tone="gold">{p}: {n}</Pill>)}
          </div>
        </Surface>
      )}

      <h2 className="mb-3 mt-6 text-sm font-bold text-white">So‘nggi renderlar</h2>
      <div className="space-y-3">
        {data.items.length === 0 && <EmptyState>Hali render yo‘q. Mijozlar mashina rasmiga detal sinab ko‘rganda shu yerda ko‘rinadi.</EmptyState>}
        {data.items.map((g) => (
          <Surface key={g.id} className="flex gap-4 p-3 sm:p-4">
            <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-black">
              {g.imageUrl && g.imageUrl.startsWith('http') ? <img src={g.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={TONE[g.status] ?? 'neutral'}>{LABEL[g.status] ?? g.status}</Pill>
                {g.provider && <Pill>{g.provider}</Pill>}
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold text-white">{g.user}</p>
              <p className="text-xs text-white/45">
                {timeAgo(g.createdAt)}{g.seconds !== null ? ` · ${g.seconds}s` : ''} · {CREDIT[g.creditState] ?? g.creditState}
              </p>
              {g.error && <p className="mt-1 truncate text-xs text-red-300">{g.error}</p>}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
