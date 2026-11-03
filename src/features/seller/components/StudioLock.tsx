'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Lock } from 'lucide-react';

/** Shown instead of Garage / Dashboard / Add product while the workshop is on the Free plan. */
export function StudioLock({ title }: { title: string }) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  return (
    <div className="mx-auto mt-16 max-w-md px-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AE62]/15 text-[#D4AE62]">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-white">{title} yopiq</h1>
      <p className="mt-2 text-sm text-white/60">
        Siz hozir Free tarifdasiz. Garaj, Dashboard va mahsulot qo‘shish pullik tarifda ochiladi.
      </p>
      <Link href={`/${locale}/plans`} className="mt-6 inline-block rounded-full bg-[#D4AE62] px-8 py-3 text-sm font-bold text-black transition hover:brightness-110">
        Tariflarni ko‘rish
      </Link>
    </div>
  );
}
