import Link from 'next/link';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/i18n/routing';
import { Footer } from '@/components/landing/sections/Footer';
import { LogoWithText } from '@/components/landing/sections/shared';
import { LEGAL_EFFECTIVE, LEGAL_VERSION, type LegalBlock, type LegalDoc, type LegalUi } from '@/content/legal/types';

/** `**bold**` inside a legal string. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-foreground">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function Block({ block, num, idx }: { block: LegalBlock; num: number; idx: number }) {
  if (typeof block === 'string') {
    return (
      <p className="leading-[1.8]">
        <span className="me-2 font-mono text-xs text-primary/70 tabular-nums">
          {num}.{idx + 1}.
        </span>
        <Rich text={block} />
      </p>
    );
  }
  if ('list' in block) {
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
      <Tag className={`space-y-2.5 ps-6 leading-[1.75] ${block.ordered ? 'list-[lower-alpha]' : 'list-disc'} marker:text-primary/70`}>
        {block.list.map((item, i) => (
          <li key={i} className="ps-1.5">
            <Rich text={item} />
          </li>
        ))}
      </Tag>
    );
  }
  if ('table' in block) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[560px] border-collapse text-start text-[13px] leading-relaxed">
          <thead>
            <tr className="bg-white/[0.04]">
              {block.table.head.map((h) => (
                <th key={h} className="border-b border-white/10 px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, r) => (
              <tr key={r} className="align-top odd:bg-white/[0.015]">
                {row.map((cell, c) => (
                  <td key={c} className={`border-b border-white/5 px-4 py-3 ${c === 0 ? 'font-medium text-foreground' : ''}`}>
                    <Rich text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] px-5 py-4 text-[14px] leading-[1.75] text-foreground/90">
      <Rich text={block.note} />
    </div>
  );
}

function formatDate(locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'uz' ? 'uz-Latn-UZ' : locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(`${LEGAL_EFFECTIVE}T00:00:00Z`)
    );
  } catch {
    return LEGAL_EFFECTIVE;
  }
}

/**
 * A legal document page in the landing's look: wordmark header, title block, a sticky table of
 * contents on desktop and numbered sections (§1, 1.1, 1.2...) with stable anchors.
 */
export function LegalDocument({
  locale,
  doc,
  ui,
  kind,
  lang,
}: {
  locale: Locale;
  doc: LegalDoc;
  ui: LegalUi;
  kind: 'terms' | 'privacy';
  /** Language the document text is written in (may differ from the page locale). */
  lang: string;
}) {
  const other = kind === 'terms' ? 'privacy' : 'terms';
  // An English or Russian document shown on an Arabic page still reads left to right.
  const textDir = 'ltr';
  return (
    <main id="top" className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href={`/${locale}`} aria-label={ui.home} className="min-w-0 shrink overflow-hidden">
            <LogoWithText />
          </Link>
          <Link
            href={`/${locale}/${other}`}
            className="btn-ghost-gold hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold tracking-[0.14em] sm:inline-flex"
          >
            {ui.otherDoc[other]}
            <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
        </div>
      </header>

      <div lang={lang} dir={textDir}>
      <section className="relative mx-auto max-w-7xl px-6 pb-10 pt-14 sm:pt-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(232,191,116,0.12),transparent_70%)]" />
        <p className="relative text-[11px] tracking-lux text-primary">{doc.eyebrow}</p>
        <h1 className="relative mt-5 max-w-4xl break-words font-display text-4xl font-light leading-[1.08] [hyphens:auto] sm:text-6xl">{doc.title}</h1>
        <p className="relative mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{doc.lead}</p>
        <dl className="relative mt-8 flex flex-wrap gap-3 text-xs">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
            <dt className="text-muted-foreground">{ui.effective}:</dt>
            <dd className="font-medium">
              <time dateTime={LEGAL_EFFECTIVE}>{formatDate(locale)}</time>
            </dd>
          </div>
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
            <dt className="text-muted-foreground">{ui.version}:</dt>
            <dd className="font-medium tabular-nums">{LEGAL_VERSION}</dd>
          </div>
        </dl>
        {ui.languageNote && (
          <p lang={locale} dir="auto" className="relative mt-6 max-w-3xl rounded-2xl border border-white/10 px-5 py-3 text-sm text-muted-foreground">
            {ui.languageNote}
          </p>
        )}
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 lg:grid-cols-[280px_1fr] lg:gap-16">
        <nav aria-label={ui.contents} className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto">
          <details open className="glass group rounded-3xl p-6 lg:[&>summary]:pointer-events-none">
            <summary className="cursor-pointer list-none text-[11px] tracking-lux text-primary">{ui.contents}</summary>
            <ol className="mt-5 space-y-1 text-[13px]">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex gap-3 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  >
                    <span className="w-6 shrink-0 font-mono text-[11px] text-primary/70 tabular-nums">{i + 1}.</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </nav>

        <article className="min-w-0 max-w-3xl text-[15px] text-muted-foreground">
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28 border-t border-white/5 py-10 first:border-t-0 first:pt-0">
              <h2 className="flex items-baseline gap-4 font-display text-2xl font-light leading-tight text-foreground sm:text-3xl">
                <span className="text-gold font-mono text-base tabular-nums">§{i + 1}</span>
                <span>{s.title}</span>
              </h2>
              <div className="mt-6 space-y-5">
                {(() => {
                  let p = -1;
                  return s.blocks.map((b, j) => {
                    if (typeof b === 'string') p += 1;
                    return <Block key={j} block={b} num={i + 1} idx={Math.max(p, 0)} />;
                  });
                })()}
              </div>
            </section>
          ))}
          <a href="#top" className="mt-6 inline-flex items-center gap-2 text-xs tracking-[0.2em] text-primary hover:text-foreground">
            <ArrowUp className="h-3.5 w-3.5" />
            {ui.backToTop}
          </a>
        </article>
      </div>

      </div>

      <div className="border-t border-white/5">
        <Footer />
      </div>
    </main>
  );
}
