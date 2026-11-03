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
  Globe,
  Check,
} from 'lucide-react';
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

interface VeloceShellProps {
  children: React.ReactNode;
}

export function VeloceShell({ children }: VeloceShellProps) {
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
  const isShop = pathname.includes('/shop') || pathname.includes('/marketplace');
  const isCart = pathname.includes('/cart');
  const isProfile = pathname.includes('/profile');

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
              <span>Home</span>
              <span
                className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
                  isHome ? 'scale-y-100' : 'scale-y-0'
                }`}
              />
            </Link>

            {/* Garage (B2B Seller Only) */}
            {isSeller && (
              <Link
                href={`/${locale}/garage`}
                data-status={isGarage ? 'active' : 'inactive'}
                className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
              >
                <Car className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                <span>Garage</span>
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
              <span>{isSeller ? 'Showroom' : 'Create'}</span>
            </button>

            {/* Shop */}
            <Link
              href={`/${locale}/shop`}
              data-status={isShop ? 'active' : 'inactive'}
              className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
            >
              <ShoppingCart className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              <span>Shop</span>
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
          {isSeller && (
            <Link
              href={`/${locale}/seller?tab=dashboard`}
              data-status={isDashboard ? 'active' : 'inactive'}
              className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
            >
              <LayoutDashboard className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
              <span>Dashboard</span>
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
            <span>Profile</span>
            <span
              className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
                isProfile ? 'scale-y-100' : 'scale-y-0'
              }`}
            />
          </Link>
        </div>
      </aside>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center border-b border-[#D4AE62]/15 bg-[#0D0E12]/70 px-5 py-4 backdrop-blur-xl md:px-10">
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Menu"
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

        <div className="flex items-center gap-2.5 md:gap-3">
          {/* 8-Language & 8-Currency Quick Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLocaleMenuOpen((v) => !v)}
              aria-label="Language and Currency"
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
                      Til / Language (8)
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
                      Valyuta / Currency (8)
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
            aria-label="Cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-[#D4AE62]/20 transition hover:border-primary"
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
            aria-label="Profile"
            data-status={isProfile ? 'active' : 'inactive'}
            className="hidden md:grid h-10 w-10 place-items-center rounded-full border border-[#D4AE62]/20 transition hover:border-primary data-[status=active]:border-primary data-[status=active]:bg-gold-gradient/10 cursor-pointer"
          >
            <User className="h-4 w-4 text-foreground/90" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-28 md:pb-12">{children}</main>

      {/* Mobile Fixed Bottom Nav Dock (4 columns for B2C, 5 columns for B2B Seller) */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-40 grid ${
          isSeller ? 'grid-cols-5' : 'grid-cols-4'
        } border-t border-[#D4AE62]/15 bg-[#0D0E12]/90 px-1 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur-xl md:hidden`}
      >
        {/* 1. Home */}
        <Link
          href={`/${locale}/seller`}
          data-status={isHome ? 'active' : 'inactive'}
          className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
        >
          <House className="h-6 w-6" />
          <span>Home</span>
          <span
            className={`mt-1 h-0.5 w-10 rounded-full bg-gold-gradient transition-transform duration-300 ${
              isHome ? 'scale-x-100' : 'scale-x-0'
            }`}
          />
        </Link>

        {/* 2. For Seller: Garage | For Consumer: Create */}
        {isSeller ? (
          <Link
            href={`/${locale}/garage`}
            data-status={isGarage ? 'active' : 'inactive'}
            className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
          >
            <Car className="h-6 w-6" />
            <span>Garage</span>
            <span
              className={`mt-1 h-0.5 w-10 rounded-full bg-gold-gradient transition-transform duration-300 ${
                isGarage ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        ) : (
          <button
            onClick={openCamera}
            className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-primary transition-colors hover:brightness-125 cursor-pointer"
          >
            <CirclePlus className="h-6 w-6 transition-transform group-hover:rotate-90 duration-300" />
            <span>Create</span>
            <span className="mt-1 h-0.5 w-10" />
          </button>
        )}

        {/* 3. Shop (Both Seller and Consumer) */}
        <Link
          href={`/${locale}/shop`}
          data-status={isShop ? 'active' : 'inactive'}
          className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
        >
          <ShoppingCart className="h-6 w-6" />
          <span>Shop</span>
          <span
            className={`mt-1 h-0.5 w-10 rounded-full bg-gold-gradient transition-transform duration-300 ${
              isShop ? 'scale-x-100' : 'scale-x-0'
            }`}
          />
        </Link>

        {/* 4. For Seller: Dashboard | For Consumer: Profile */}
        {isSeller ? (
          <Link
            href={`/${locale}/seller?tab=dashboard`}
            data-status={isDashboard ? 'active' : 'inactive'}
            className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
          >
            <LayoutDashboard className="h-6 w-6" />
            <span>Dashboard</span>
            <span
              className={`mt-1 h-0.5 w-10 rounded-full bg-gold-gradient transition-transform duration-300 ${
                isDashboard ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        ) : (
          <Link
            href={`/${locale}/profile`}
            data-status={isProfile ? 'active' : 'inactive'}
            className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
          >
            <User className="h-6 w-6" />
            <span>Profile</span>
            <span
              className={`mt-1 h-0.5 w-10 rounded-full bg-gold-gradient transition-transform duration-300 ${
                isProfile ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        )}

        {/* 5. For Seller: Profile */}
        {isSeller && (
          <Link
            href={`/${locale}/profile`}
            data-status={isProfile ? 'active' : 'inactive'}
            className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
          >
            <User className="h-6 w-6" />
            <span>Profile</span>
            <span
              className={`mt-1 h-0.5 w-10 rounded-full bg-gold-gradient transition-transform duration-300 ${
                isProfile ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        )}
      </nav>

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
                  <span>Home</span>
                </Link>
                {isSeller && (
                  <Link
                    href={`/${locale}/garage`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                      isGarage ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Car className="h-4 w-4" />
                    <span>Garage</span>
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
                  <span>Shop</span>
                </Link>
                <Link
                  href={`/${locale}/cart`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                    isCart ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Cart ({count})</span>
                </Link>
                {isSeller && (
                  <Link
                    href={`/${locale}/seller?tab=dashboard`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase transition ${
                      isDashboard ? 'bg-[#D4AE62]/10 text-primary' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
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
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openCamera();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase bg-gold-gradient text-black"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Customize Ride</span>
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
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
