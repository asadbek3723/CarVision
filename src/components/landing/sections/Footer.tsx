'use client';


import { useTranslations } from 'next-intl';import {
  Clock,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Send,
  Twitter,
  Youtube,
} from 'lucide-react';
import { LogoWithText } from './shared';

const SOCIAL_LINKS = [
  { icon: Send, label: 'Telegram' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Twitter, label: 'X' },
];

const FOOTER_COLUMNS = [
  { key: 'product', links: ['visualizer', 'pricing', 'mobileApp', 'catalog'] },
  { key: 'company', links: ['about', 'partners', 'careers', 'blog'] },
  { key: 'help', links: ['faq', 'terms', 'privacy', 'contact'] },
] as const;

/** Link labels that already exist in the navigation namespace. */
const NAV_LABELS = new Set(['visualizer', 'pricing', 'faq']);

export function Footer() {
  const t = useTranslations('landing.footer');
  const tNav = useTranslations('landing.nav');
  return (
    <footer className="mx-auto max-w-7xl px-6 pb-10 select-none">
      <div className="grid grid-cols-2 gap-10 pt-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <LogoWithText />
          <p className="mt-6 max-w-xs text-sm text-muted-foreground">
            {t('tagline')}
          </p>

          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span>support@carvision.com</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span>{t('address')}</span>
            </li>
            <li className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span>{t('hours')}</span>
            </li>
          </ul>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.key}>
            <h4 className="text-[11px] tracking-lux text-primary">
              {t(col.key)}
            </h4>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    {NAV_LABELS.has(link) ? tNav(link as 'visualizer' | 'pricing' | 'faq') : t(link)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center justify-between gap-6 pt-8 sm:flex-row">
        <div className="flex gap-3">
          {SOCIAL_LINKS.map(({ icon: Icon, label }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="glass grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-all duration-500 hover:-translate-y-1  hover:text-primary hover:shadow-gold"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>

        <p className="text-center text-[10px] tracking-lux text-muted-foreground">
          © 2026 CARVISION · TRICORP AGENCY
        </p>
      </div>
    </footer>
  );
}
