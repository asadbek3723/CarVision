import * as React from 'react';

/** A settings-style row: title (and hint) on the start side, content filling the rest; stacked on phones. */
export function ProfileSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 py-8 md:py-10 lg:grid-cols-[minmax(220px,320px)_1fr] lg:gap-16">
      <div>
        <h2 className="font-heading text-base font-semibold text-white md:text-lg">{title}</h2>
        {hint && <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/45">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
