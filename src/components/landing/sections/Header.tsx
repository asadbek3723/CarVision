'use client';


import { useTranslations } from 'next-intl';import * as React from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
} from 'lucide-react';
import { LogoWithText } from './shared';

const NAV_LINKS = [
  { href: '#visualizer', key: 'visualizer' },
  { href: '#how', key: 'how' },
  { href: '#pricing', key: 'pricing' },
  { href: '#reviews', key: 'reviews' },
  { href: '#app', key: 'app' },
  { href: '#faq', key: 'faq' },
] as const;

export function Header({ locale }: { locale: string }) {
  const t = useTranslations('landing.nav');
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  // The navbar stays hidden on the hero and slides in once the visitor scrolls down.
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const visible = scrolled || mobileOpen;

  return (
    <header
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-3 z-50 px-3 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:top-4 sm:px-4 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-24 opacity-0'
      }`}
    >
      <div className="glass-nav mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full border border-border py-2 ps-4 pe-2 sm:gap-4 sm:px-5 sm:py-3 shadow-lux">
        <a href="#top" className="min-w-0 shrink overflow-hidden">
          <LogoWithText small={true} />
        </a>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(link.key)}
              <span className="absolute -bottom-1 start-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/${locale}/login`}
            className="btn-gold rounded-full px-4 py-2.5 text-[11px] font-bold tracking-[0.2em] sm:px-6 sm:text-xs sm:tracking-[0.25em]"
          >
            {t('signIn')}
          </Link>
          <button
            type="button"
            aria-label={t('menu')}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-11 w-11 place-items-center rounded-full border border-border text-primary lg:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`glass-nav mx-auto mt-3 max-w-6xl overflow-hidden rounded-3xl border border-border transition-all duration-500 lg:hidden ${
          mobileOpen
            ? 'max-h-96 opacity-100'
            : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <nav className="flex flex-col p-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-2xl px-5 py-4 text-base text-foreground transition-colors active:bg-accent"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
