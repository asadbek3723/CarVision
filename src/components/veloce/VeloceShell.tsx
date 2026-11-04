'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  House,
  Car,
  ShoppingCart,
  CirclePlus,
  Menu,
  User,
  X,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Lock,
  Globe,
  Check,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVeloceStore } from '@/context/VeloceStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { SupportedCurrency } from '@/domain/currency';

const LOCALE_OPTIONS = [
  { code: 'uz', label: 'UZ', name: "O'zbekcha" },
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'tr', label: 'TR', name: 'Türkçe' },
  { code: 'kk', label: 'KK', name: 'Қазақша' },
  { code: 'ky', label: 'KY', name: 'Кыргызча' },
  { code: 'tg', label: 'TG', name: 'Тоҷикӣ' },
] as const;

const CURRENCY_OPTIONS: { code: SupportedCurrency; label: string }[] = [
  { code: 'UZS', label: 'UZS' },
  { code: 'USD', label: 'USD' },
  { code: 'AED', label: 'AED' },
  { code: 'TRY', label: 'TRY' },
  { code: 'KZT', label: 'KZT' },
  { code: 'KGS', label: 'KGS' },
  { code: 'TJS', label: 'TJS' },
  { code: 'RUB', label: 'RUB' },
];

interface DockLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  active: boolean;
  locked?: boolean;
}

function DockLink({ href, icon: Icon, label, active, locked = false }: DockLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-w-0 flex-col items-center gap-1 pb-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.14em] transition-colors ${
        active ? 'text-[#D4AE62]' : 'text-white/45 hover:text-[#E8CF94]'
      }`}
    >
      <span className="relative">
        <Icon className="h-6 w-6" strokeWidth={active ? 1.9 : 1.5} />
        {locked && <Lock className="absolute -end-1.5 -top-1 h-3 w-3 text-[#D4AE62]" />}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

interface VeloceShellProps {
  children: React.ReactNode;
}

export function VeloceShell({ children }: VeloceShellProps) {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get('tab') : null;
  const locale = (params?.['locale'] as string) || 'uz';
  const { count, openCamera } = useVeloceStore();
  const { user, isLoading, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const isSeller = user?.role === 'b2b_seller';
  // Everyone starts on the Free plan: Garage and Dashboard are visible but locked until a paid plan is active.
  // A paid plan opens them for every account type (workshop owner or regular user).
  const studioUnlocked = user?.plan?.isPaid === true;
  const garageHref = studioUnlocked ? `/${locale}/garage` : `/${locale}/plans`;
  const dashboardHref = studioUnlocked ? `/${locale}/seller?tab=dashboard` : `/${locale}/plans`;

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [localeMenuOpen, setLocaleMenuOpen] = React.useState(false);

  // Require authentication to access the Veloce App; redirect guests to Landing / Sign In
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/${locale}`);
    }
  }, [isLoading, user, locale, router]);

  const buildLocalizedHref = (targetLocale: string) => {
    const base = pathname.replace(/^\/(uz|ru|en|ar|tr|kk|ky|tg)(?=\/|$)/, `/${targetLocale}`);
    const qs = searchParams?.toString();
    return qs ? `${base}?${qs}` : base;
  };

  // Active state matching
  const isSellerSubpage = pathname.startsWith(`/${locale}/seller/`);
  const isDashboard = currentTab === 'dashboard' || isSellerSubpage;
  const isGarage = pathname.includes('/garage') || currentTab === 'garage';
  const isHome = (pathname === `/${locale}` || pathname === `/${locale}/` || pathname === `/${locale}/seller`) && !isDashboard && !isGarage;
  const isShop = pathname.includes('/shop');
  const isCart = pathname.includes('/cart');
  const isProfile = pathname.includes('/profile');
  // The customizer is a full-screen flow on phones: no header and no dock, only its own top bar and Apply button.
  const isImmersive = pathname.includes('/customize');

  return (
    <div className="min-h-screen md:ps-24 lg:ps-28 bg-[#0D0E12] text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-24 lg:w-28 flex-col items-center justify-between border-e border-[#D4AE62]/15 bg-[#0D0E12]/80 py-8 backdrop-blur-xl md:flex">
        <div className="flex flex-col items-center gap-10">
          <Link
            href={`/${locale}/seller`}
            className="font-display text-2xl font-extralight text-gold-gradient transition hover:opacity-90"
          >
            V
          </Link>
          <nav className="flex flex-col items-center gap-8">
            {/* Home (App Home Showroom) */}
            <Link
              href={`/${locale}/seller`}
              data-status={isHome ? 'active' : 'inactive'}
              className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
            >
              <House className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              <span>{t('home')}</span>
              <span
                className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
                  isHome ? 'scale-y-100' : 'scale-y-0'
                }`}
              />
            </Link>

            {/* Garage (locked on the Free plan) */}
            {(
              <Link
                href={garageHref}
                data-status={isGarage ? 'active' : 'inactive'}
                className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
              >
                <Car className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                <span>{t('garage')}</span>
                {!studioUnlocked && <Lock className="absolute -end-2 -top-1 h-3 w-3 text-[#D4AE62]" />}
                <span
                  className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
                    isGarage ? 'scale-y-100' : 'scale-y-0'
                  }`}
                />
              </Link>
            )}

            {/* Create Button (Exact Center) */}
            <button
              onClick={openCamera}
              className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-primary transition-colors hover:brightness-125 cursor-pointer"
            >
              <CirclePlus className="h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
              <span>{isSeller ? t('showroom') : t('create')}</span>
            </button>

            {/* Shop */}
            <Link
              href={`/${locale}/shop`}
              data-status={isShop ? 'active' : 'inactive'}
              className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
            >
              <ShoppingCart className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              <span>{t('shop')}</span>
              <span
                className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
                  isShop ? 'scale-y-100' : 'scale-y-0'
                }`}
              />
            </Link>
          </nav>
        </div>

        {/* Bottom Section (Dashboard for seller + Profile for all) */}
        <div className="flex flex-col items-center gap-8">
          {(
            <Link
              href={dashboardHref}
              data-status={isDashboard ? 'active' : 'inactive'}
              className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
            >
              <LayoutDashboard className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              <span>{t('dashboard')}</span>
              {!studioUnlocked && <Lock className="absolute -end-2 -top-1 h-3 w-3 text-[#D4AE62]" />}
              <span
                className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
                  isDashboard ? 'scale-y-100' : 'scale-y-0'
                }`}
              />
            </Link>
          )}

          {/* Profile */}
          <Link
            href={`/${locale}/profile`}
            data-status={isProfile ? 'active' : 'inactive'}
            className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
          >
            <User className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
            <span>{t('profile')}</span>
            <span
              className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
                isProfile ? 'scale-y-100' : 'scale-y-0'
              }`}
            />
          </Link>
        </div>
      </aside>

      {/* Sticky Header */}
      <header
        className={`sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center bg-[#0D0E12]/70 px-5 py-4 backdrop-blur-xl md:border-b md:border-[#D4AE62]/15 md:px-10 ${
          isImmersive ? 'max-md:hidden' : ''
        }`}
      >
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t('menu')}
          className="text-foreground/80 md:invisible cursor-pointer p-1"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link href={`/${locale}/seller`} className="text-center leading-none">
          <div className="font-display text-lg font-light tracking-[0.6em] ps-[0.6em] text-foreground">
            VELOCE
          </div>
          <div className="mt-1.5 font-display text-[8px] tracking-[0.5em] ps-[0.5em] text-muted-foreground uppercase">
            Drive Beyond
          </div>
        </Link>

        <div className="flex items-center justify-end gap-2.5 md:gap-3">
          {/* 8-Language & 8-Currency Quick Switcher (desktop only; on phones it lives in Profile) */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setLocaleMenuOpen((v) => !v)}
              aria-label={t('languageAndCurrency')}
              className="flex h-10 items-center gap-1.5 rounded-full bg-white/[0.04] px-3 text-[10px] font-medium tracking-[0.18em] uppercase text-foreground/90 transition hover:bg-white/[0.08] cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-[#D4AE62]" />
              <span>{locale.toUpperCase()}</span>
              <span className="text-white/25">/</span>
              <span className="text-[#D4AE62]">{currency}</span>
            </button>

            {localeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLocaleMenuOpen(false)}
                />
                <div className="absolute end-0 top-12 z-50 w-72 rounded-2xl bg-[#13151B]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
                  <div className="mb-3">
                    <div className="mb-2 text-[9px] font-semibold tracking-[0.25em] uppercase text-white/40">
                      {t('language')}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LOCALE_OPTIONS.map((opt) => {
                        const active = locale === opt.code;
                        return (
                          <Link
                            key={opt.code}
                            href={buildLocalizedHref(opt.code)}
                            onClick={() => setLocaleMenuOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                              active
                                ? 'bg-[#D4AE62]/15 text-[#D4AE62] font-medium'
                                : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            <span>{opt.name}</span>
                            {active ? (
                              <Check className="h-3.5 w-3.5 text-[#D4AE62]" />
                            ) : (
                              <span className="text-[9px] tracking-widest text-white/30">{opt.label}</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="mb-2 text-[9px] font-semibold tracking-[0.25em] uppercase text-white/40">
                      {t('currency')}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {CURRENCY_OPTIONS.map((curr) => {
                        const active = currency === curr.code;
                        return (
                          <button
                            key={curr.code}
                            type="button"
                            onClick={() => {
                              setCurrency(curr.code);
                              setLocaleMenuOpen(false);
                            }}
                            className={`rounded-xl py-1.5 text-[10px] font-semibold tracking-wider uppercase transition cursor-pointer ${
                              active
                                ? 'bg-[#D4AE62] text-black shadow-[0_4px_14px_rgba(212,174,98,0.3)]'
                                : 'bg-white/[0.03] text-white/65 hover:bg-white/[0.08] hover:text-white'
                            }`}
                          >
                            {curr.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href={`/${locale}/cart`}
            aria-label={t('cart')}
            className="relative hidden h-10 w-10 place-items-center rounded-full border border-[#D4AE62]/20 transition hover:border-primary md:grid"
          >
            <ShoppingCart className="h-4 w-4 text-foreground/90" />
            {count > 0 && (
              <span className="absolute -top-1 -end-1 grid h-4 w-4 place-items-center rounded-full bg-gold-gradient text-[9px] font-bold text-black shadow-gold">
                {count}
              </span>
            )}
          </Link>

          <Link
            href={`/${locale}/profile`}
            aria-label={t('profile')}
            data-status={isProfile ? 'active' : 'inactive'}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#D4AE62]/40 text-[#D4AE62] transition hover:border-primary data-[status=active]:border-primary data-[status=active]:bg-[#D4AE62]/10 md:border-[#D4AE62]/20 md:text-foreground/90 cursor-pointer"
          >
            <User className="h-[18px] w-[18px] md:h-4 md:w-4" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className={isImmersive ? 'md:pb-12' : 'pb-28 md:pb-12'}>{children}</main>

      {/* Mobile bottom dock: Home, Garage, [Create], Shop, Dashboard. Profile is the icon in the header. */}
      {!isImmersive && (
        <nav
          aria-label={t('menu')}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D4AE62]/15 bg-[#0B0C10]/90 backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
            <DockLink href={`/${locale}/seller`} icon={House} label={t('home')} active={isHome} />
            <DockLink href={garageHref} icon={Car} label={t('garage')} active={isGarage} locked={!studioUnlocked} />

            <button
              type="button"
              onClick={openCamera}
              aria-label={isSeller ? t('showroom') : t('create')}
              className="group relative flex cursor-pointer flex-col items-center gap-1 pb-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[#D4AE62]"
            >
              <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-gold-gradient text-black shadow-[0_10px_30px_-4px_rgba(212,174,98,0.65)] ring-[5px] ring-[#0B0C10] transition duration-300 group-active:scale-95">
                <CirclePlus className="h-7 w-7 transition-transform duration-300 group-hover:rotate-90" strokeWidth={1.8} />
              </span>
              <span>{isSeller ? t('showroom') : t('create')}</span>
            </button>

            <DockLink href={`/${locale}/shop`} icon={ShoppingCart} label={t('shop')} active={isShop} />
            <DockLink href={dashboardHref} icon={LayoutDashboard} label={t('panel')} active={isDashboard} locked={!studioUnlocked} />
          </div>
        </nav>
      )}

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 start-0 w-72 bg-[#0D0E12] border-e border-[#D4AE62]/20 p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-light tracking-[0.4em] text-gold-gradient">
                  VELOCE
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-neutral-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 pt-4">
                <Link
                  href={`/${locale}/seller`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                    isHome ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <House className="h-4 w-4" />
                  <span>{t('home')}</span>
                </Link>
                {(
                  <Link
                    href={garageHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                      isGarage ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Car className="h-4 w-4" />
                    <span>{t('garage')}</span>
                    {!studioUnlocked && <Lock className="h-3 w-3 text-[#D4AE62]" />}
                  </Link>
                )}
                <Link
                  href={`/${locale}/shop`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                    isShop ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{t('shop')}</span>
                </Link>
                <Link
                  href={`/${locale}/cart`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                    isCart ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{t('cartWithCount', { count })}</span>
                </Link>
                {(
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                      isDashboard ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t('dashboard')}</span>
                    {!studioUnlocked && <Lock className="h-3 w-3 text-[#D4AE62]" />}
                  </Link>
                )}
                <Link
                  href={`/${locale}/profile`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                    isProfile ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>{t('profile')}</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openCamera();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase bg-gold-gradient text-black"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{t('customizeRide')}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="flex items-center gap-2 text-xs tracking-widest uppercase text-neutral-500 hover:text-red-400 pt-4 border-t border-[#D4AE62]/15"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('signOut')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
