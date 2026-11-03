'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Loader2, Lock } from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';

interface Plan {
  code: string;
  name: string;
  priceUSD: number;
  credits: number;
  durationDays: number;
  watermark: boolean;
  maxDevices: number;
  maxItems: number;
}

export default function PlansPage() {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/plans')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setPlans(d.plans);
        else setError(true);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const current = user?.plan?.code ?? 'FREE_TRIAL';

  return (
    <VeloceShell>
      <div className="mx-auto max-w-6xl px-5 pb-32 pt-8 md:px-10 md:pt-12">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-[#D4AE62]">Tariflar</p>
          <h1 className="mt-2 font-display text-3xl font-light text-white md:text-5xl">Studiyangiz uchun tarif</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
            Garaj va Dashboard pullik tariflarda ochiladi: mahsulot qo‘shish, ombor, buyurtmalar va ustaxona boshqaruvi.
          </p>
          {user && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs text-white/75">
              Sizning tarifingiz: <b className="text-white">{plans.find((p) => p.code === current)?.name ?? 'Free'}</b> · Kredit: <b className="text-[#D4AE62]">{user.credits_balance}</b>
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-[#D4AE62]" />
          </div>
        ) : error ? (
          <p className="py-20 text-center text-sm text-red-300">Tariflarni yuklab bo‘lmadi. Sahifani yangilang.</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const isCurrent = p.code === current;
              const free = p.priceUSD === 0;
              return (
                <article key={p.code} className={`flex flex-col rounded-3xl border p-6 ${p.code === 'MAX_4000' ? 'border-[#D4AE62]/50 bg-[#D4AE62]/[0.05]' : 'border-white/[0.08] bg-[#0B0D13]'}`}>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white">{p.name}</h2>
                  <p className="mt-4 text-3xl font-bold text-white">{free ? '0' : formatPrice(p.priceUSD)}</p>
                  <p className="text-xs text-white/45">{free ? 'har oy bepul' : `${p.durationDays} kun`}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm text-white/75">
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AE62]" />{p.credits.toLocaleString()} ta kredit {free ? '(oyiga)' : ''}</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AE62]" />{p.maxDevices} ta qurilma</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AE62]" />{free ? 'Garaj va Dashboard yopiq' : `${p.maxItems.toLocaleString()} tagacha mahsulot`}</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AE62]" />{p.watermark ? 'Rasmlarda CarVision belgisi' : 'Belgisiz rasmlar'}</li>
                  </ul>
                  {isCurrent ? (
                    <span className="mt-6 rounded-full bg-white/10 py-3 text-center text-xs font-bold text-white/80">Joriy tarif</span>
                  ) : free ? null : (
                    <span className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] py-3 text-xs font-bold text-white/60">
                      <Lock className="h-3.5 w-3.5" />
                      Tez orada faollashtiriladi
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!user && (
          <p className="mt-8 text-center text-sm text-white/55">
            <Link href={`/${locale}/register`} className="text-[#D4AE62] underline">Ro‘yxatdan o‘ting</Link>: Free tarif bilan darrov boshlang.
          </p>
        )}
      </div>
    </VeloceShell>
  );
}
