'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  House,
  Car,
  ShoppingCart,
  CirclePlus,
  Plus,
  User,
  ShoppingBag,
  LayoutDashboard,
  Globe,
  Check,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { preloadCamera, useVeloceStore } from '@/context/VeloceStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { isSellerUser } from '@/features/auth/roles';
import { previousPath, rememberPath } from '@/lib/nav-history';
import { useEdgeBack } from './useEdgeBack';
import { LiquidIndicator, type LiquidIndicatorHandle } from './LiquidIndicator';
import { TabPager, type PagerTab } from './TabPager';
import { VeloceHome } from './VeloceHome';
import { VeloceCart } from './VeloceCart';
import { VeloceGarage } from './VeloceGarage';
import { VeloceShop } from './VeloceShop';
import { VeloceProfile } from './VeloceProfile';
import { SupportedCurrency } from '@/domain/currency';
import { Wordmark } from '@/components/ui/Wordmark';

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

interface QueryState {
  tab: string | null;
  qs: string;
}

function QuerySync({ onChange }: { onChange: (q: QueryState) => void }) {
  const sp = useSearchParams();
  const tab = sp?.get('tab') ?? null;
  const qs = sp?.toString() ?? '';
  React.useEffect(() => onChange({ tab, qs }), [tab, qs, onChange]);
  return null;
}

/** How long the dock takes to sink out of sight (globals.css `.cv-dock[data-hidden]`); the page's own bar rises after it. */
const DOCK_OUT_MS = 340;

/** Dock column of each swipeable tab: Home 0, Garage/Cart 1, [Create 2], Shop 3, Profile 4. */
const TAB_COLS = [0, 1, 3, 4] as const;

interface DockLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  active: boolean;
  /** Small count on the icon (cart items). */
  badge?: number;
  /** Runs on tap, before the route changes (starts the dock glass gliding at once). */
  onTap?: () => void;
}

/** Count bubble on a cart icon; `data-cart-target` is where the add-to-cart animation flies to. */
function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      className={`grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold leading-none tabular-nums text-black motion-safe:animate-[badge-pop_320ms_ease-out] ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function DockLink({ href, icon: Icon, label, active, badge = 0, onTap }: DockLinkProps) {
  return (
    <Link
      href={href}
      onClick={() => onTap?.()}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-w-0 flex-col items-center gap-1 pb-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.14em] transition-[color,transform] duration-150 active:scale-90 ${
        active ? 'text-gold-500' : 'text-white/45 hover:text-[#F1D396]'
      }`}
    >
      <span className="relative">
        <Icon className="h-6 w-6" strokeWidth={active ? 1.9 : 1.5} />
        <CountBadge count={badge} className="absolute -end-2.5 -top-1.5 ring-2 ring-surface-1" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

interface RailLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: number;
}

/** One item of the desktop side rail. */
function RailLink({ href, icon: Icon, label, active, badge = 0 }: RailLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-status={active ? 'active' : 'inactive'}
      className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-gold-soft data-[status=active]:text-primary"
    >
      <span className="relative">
        <Icon className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
        <CountBadge count={badge} className="absolute -end-3 -top-2" />
      </span>
      <span>{label}</span>
      <span
        className={`absolute -start-[30px] top-1/2 h-8 w-0.5 -translate-y-1/2 bg-gold-gradient transition-transform duration-300 ${
          active ? 'scale-y-100' : 'scale-y-0'
        }`}
      />
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
  // `?tab=` and the query string arrive from <QuerySync>, which reads them inside a Suspense
  // boundary. Reading them here directly would force every in-app page to render on the server per
  // request, so taps could not be prefetched and each tab switch waited for the network.
  const [query, setQuery] = React.useState<QueryState>({ tab: null, qs: '' });
  const currentTab = query.tab;
  const locale = (params?.['locale'] as string) || 'uz';
  const { count, openCamera } = useVeloceStore();
  const { user, isLoading } = useAuth();
  const { currency, setCurrency } = useCurrency();
  // The role decides the menu, never the plan: workshop owners get Garage + Dashboard (their cart lives
  // in Profile); everyone else gets the Cart in the Garage slot and never sees the studio.
  const isSeller = isSellerUser(user);

  const [localeMenuOpen, setLocaleMenuOpen] = React.useState(false);

  React.useEffect(() => {
    rememberPath(pathname);
  }, [pathname]);

  // Publish the dock's real height (it varies with the font, language and safe area) as --dock-h.
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dockRef = React.useRef<HTMLElement | null>(null);
  const dockHiddenRef = React.useRef(false);
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    const dock = dockRef.current;
    if (!root) return;
    const apply = () => {
      // md:hidden hides the dock on tablets and up; offsetParent cannot be used (it is null for fixed elements).
      // A dock sliding away (a part's page, the cart's checkout) leaves no room behind it.
      const visible = dock !== null && !dockHiddenRef.current && getComputedStyle(dock).display !== 'none';
      const h = visible ? `${Math.ceil(dock!.getBoundingClientRect().height)}px` : '0px';
      root.style.setProperty('--dock-h', h);
      // Also for overlays mounted outside the shell (the install banner).
      document.documentElement.style.setProperty('--dock-h', h);
    };
    apply();
    if (!dock || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(dock);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
      document.documentElement.style.removeProperty('--dock-h');
    };
  });

  // The catalog, a part's page, plans and the cart are public (search engines and first-time
  // visitors can browse); everything else needs an account. Checkout asks for sign-in itself.
  const isPublicPage = /^\/[a-z]{2}\/(shop|plans|cart)(\/|$)/.test(pathname) && !pathname.includes('/cart/checkout');
  React.useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.replace(`/${locale}/login`);
    }
  }, [isLoading, user, locale, router, isPublicPage]);

  const buildLocalizedHref = (targetLocale: string) => {
    const base = pathname.replace(/^\/(uz|ru|en|ar|tr|kk|ky|tg)(?=\/|$)/, `/${targetLocale}`);
    const qs = query.qs;
    return qs ? `${base}?${qs}` : base;
  };

  // Active state matching
  const isSellerSubpage = pathname.startsWith(`/${locale}/seller/`);
  const isDashboard = isSeller && (pathname === `/${locale}/dashboard` || currentTab === 'dashboard' || isSellerSubpage);
  const isGarage = isSeller && (pathname.includes('/garage') || currentTab === 'garage');
  const isHome =
    (pathname === `/${locale}` || pathname === `/${locale}/` || pathname === `/${locale}/seller`) && !isDashboard && !isGarage;
  const isShop = pathname.includes('/shop');
  const isCart = pathname.includes('/cart');
  // A seller reaches the cart from Profile, so Profile stays lit there.
  const isProfile = pathname.includes('/profile') || (isSeller && isCart);
  // The customizer is a full-screen flow on phones: no header and no dock, only its own top bar and Apply button.
  const isImmersive = pathname.includes('/customize');
  // A part's page swaps the dock (and the phone header) for its own top bar and fixed add-to-cart bar.
  const isProductDetail = /^\/[a-z]{2}\/shop\/[^/]+/.test(pathname);
  // Full-screen screens hide both the phone header and the dock.
  const hideHeader = isImmersive || isProductDetail;
  // The cart's checkout bar takes the dock's place at the bottom while there is something to check out.
  const isCartScreen = pathname === `/${locale}/cart`;
  const hideDock = hideHeader || (isCartScreen && count > 0);

  const cartHref = `/${locale}/cart`;

  // The dock's screens live side by side in a swipeable pager (signed-in users); every other screen
  // (a part, checkout, dashboard...) opens on its own, scrolling inside <main>.
  const tabs = React.useMemo<PagerTab[]>(
    () => [
      { key: 'home', href: `/${locale}/seller`, render: () => <VeloceHome /> },
      isSeller
        ? { key: 'garage', href: `/${locale}/garage`, render: () => <VeloceGarage /> }
        : { key: 'cart', href: `/${locale}/cart`, render: () => <VeloceCart /> },
      { key: 'shop', href: `/${locale}/shop`, render: () => <VeloceShop /> },
      { key: 'profile', href: `/${locale}/profile`, render: () => <VeloceProfile /> },
    ],
    [locale, isSeller]
  );
  const tabIndex = user && !currentTab ? tabs.findIndex((tab) => tab.href === pathname) : -1;
  const pager = tabIndex >= 0;
  const isRtl = locale === 'ar';

  // App feel: the document itself never scrolls (so iOS cannot rubber-band it); <main> or each tab
  // scrolls on its own with overscroll switched off.
  React.useEffect(() => {
    document.documentElement.classList.add('app-locked');
    return () => document.documentElement.classList.remove('app-locked');
  }, []);
  // A newly opened screen starts at its top (the pager keeps each tab's own position).
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    if (!pager && overlayRef.current) overlayRef.current.scrollTop = 0;
  }, [pathname, pager]);
  // A screen opened on top of the tabs keeps the tab it came from alive underneath, so a back swipe
  // shows that tab sliding in instead of an empty page.
  const lastTabRef = React.useRef(-1);
  if (pager) lastTabRef.current = tabIndex;
  const underTab = !pager && user && lastTabRef.current >= 0 && lastTabRef.current < tabs.length ? lastTabRef.current : -1;
  const underRef = React.useRef<HTMLDivElement | null>(null);
  const shadeRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLElement | null>(null);
  const headerH = React.useRef(0);
  React.useLayoutEffect(() => {
    if (!hideHeader && headerRef.current) headerH.current = headerRef.current.offsetHeight;
  });
  // Dock selection ("liquid glass").
  const routeCol = isHome ? 0 : (isSeller ? isGarage : isCart) ? 1 : isShop ? 3 : isProfile || isDashboard ? 4 : null;
  const indicatorRef = React.useRef<LiquidIndicatorHandle | null>(null);
  const tabPosToCol = React.useCallback((p: number) => {
    const last = TAB_COLS.length - 1;
    const i = Math.max(0, Math.min(last - 1, Math.floor(p)));
    const a = TAB_COLS[i] ?? 0;
    const b = TAB_COLS[i + 1] ?? a;
    return a + (p - i) * (b - a); // also extends past the ends, so the rubber-band shows on the glass too
  }, []);
  const onPagerScrub = React.useCallback((p: number) => indicatorRef.current?.scrub(tabPosToCol(p)), [tabPosToCol]);

  // The dock and the bar that replaces it never swap in one frame. While a swipe heads for the cart
  // (with something in it) the dock starts sinking from the first pixel of the drag; once it is
  // fully gone the checkout bar rises. Turning back, or swiping away again, reverses it.
  const [aimTab, setAimTab] = React.useState<number | null>(null);
  const tabIndexRef = React.useRef(tabIndex);
  tabIndexRef.current = tabIndex;
  // A tap on a part's card: the dock starts sinking at once, not when the part's page arrives.
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => {
    setAimTab(null);
    setLeaving(false);
  }, [pathname]);
  React.useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => setLeaving(false), 4000); // the navigation never happened
    return () => window.clearTimeout(id);
  }, [leaving]);
  // Bubble phase (not capture): the pager swallows the click that ends a swipe before it gets here.
  // Next's <Link> has already called preventDefault by then, so that is not a sign to skip.
  const onShellClick = React.useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement | null)?.closest?.('a[href]');
    const href = a?.getAttribute('href') ?? '';
    if (a?.getAttribute('target') !== '_blank' && /^\/[a-z]{2}\/shop\/[^/?#]+/.test(href)) setLeaving(true);
  }, []);
  const onPagerAim = React.useCallback((i: number) => setAimTab(i === tabIndexRef.current ? null : i), []);
  const onPagerSettle = React.useCallback((i: number) => {
    indicatorRef.current?.settle(TAB_COLS[i] ?? 0);
    setAimTab(i === tabIndexRef.current ? null : i);
  }, []);
  const aimed = aimTab !== null ? tabs[aimTab] : undefined;
  const dockHidden = aimed ? aimed.key === 'cart' && count > 0 : hideDock || leaving;
  dockHiddenRef.current = dockHidden;
  const [barReady, setBarReady] = React.useState(dockHidden);
  React.useEffect(() => {
    if (!dockHidden) {
      setBarReady(false);
      return;
    }
    const id = window.setTimeout(() => setBarReady(true), DOCK_OUT_MS);
    return () => window.clearTimeout(id);
  }, [dockHidden]);

  // Installed app: swipe from the edge to leave a screen opened on top of the tabs.
  useEdgeBack(
    overlayRef,
    !pager,
    () => (previousPath() ? router.back() : router.push(`/${locale}/seller`)),
    isRtl,
    underRef,
    shadeRef,
    // The tab underneath is shown only when going back really lands on it.
    () => underTab >= 0 && (previousPath() ?? '').split('?')[0] === tabs[underTab]?.href
  );

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden md:ps-24 lg:ps-28 bg-surface-0 text-foreground"
      ref={rootRef}
      data-bar-ready={barReady ? 'true' : 'false'}
      onClick={onShellClick}
      // Height of the phone dock (measured), for pages with their own fixed bar above it (the cart's checkout bar).
      style={{ '--dock-h': '0px' } as React.CSSProperties}
    >
      <React.Suspense fallback={null}>
        <QuerySync onChange={setQuery} />
      </React.Suspense>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-24 lg:w-28 flex-col items-center justify-between bg-surface-0 py-8 md:flex">
        <div className="flex flex-col items-center gap-10">
          <Link
            href={`/${locale}/seller`}
            aria-label="CarVision"
            className="font-display text-2xl font-extralight text-gold-gradient transition hover:opacity-90"
          >
            C
          </Link>
          <nav aria-label={t('menu')} className="flex flex-col items-center gap-8">
            <RailLink href={`/${locale}/seller`} icon={House} label={t('home')} active={isHome} />
            {isSeller ? (
              <RailLink href={`/${locale}/garage`} icon={Car} label={t('garage')} active={isGarage} />
            ) : (
              <RailLink href={cartHref} icon={ShoppingBag} label={t('cart')} active={isCart} badge={count} />
            )}

            {/* Create Button (Exact Center) */}
            <button
              type="button"
              onPointerDown={preloadCamera}
              onClick={openCamera}
              className="group relative flex flex-col items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-primary transition-colors hover:brightness-125 cursor-pointer"
            >
              <CirclePlus className="h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
              <span>{isSeller ? t('showroom') : t('create')}</span>
            </button>

            <RailLink href={`/${locale}/shop`} icon={ShoppingCart} label={t('shop')} active={isShop} />
          </nav>
        </div>

        {/* Bottom Section (Dashboard for workshop owners + Profile for all) */}
        <div className="flex flex-col items-center gap-8">
          {isSeller && (
            <RailLink href={`/${locale}/dashboard`} icon={LayoutDashboard} label={t('dashboard')} active={isDashboard} />
          )}
          <RailLink href={`/${locale}/profile`} icon={User} label={t('profile')} active={isProfile} />
        </div>
      </aside>

      {/* Sticky Header */}
      <header
        ref={headerRef}
        className={`relative z-30 grid shrink-0 grid-cols-[auto_1fr_auto] items-center bg-surface-0 px-5 pb-4 pt-[max(env(safe-area-inset-top),16px)] md:px-10 md:pt-4 ${
          hideHeader ? 'max-md:hidden' : ''
        }`}
      >
        {/* Phones: no menu button (everything is in the bottom dock); keeps the logo centred. */}
        <span aria-hidden className="block h-8 w-8" />

        <Link href={`/${locale}/seller`} aria-label="CarVision" className="justify-self-center text-center">
          <Wordmark />
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
              <Globe className="h-3.5 w-3.5 text-gold-500" />
              <span>{locale.toUpperCase()}</span>
              <span className="text-white/25">/</span>
              <span className="text-gold-500">{currency}</span>
            </button>

            {localeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLocaleMenuOpen(false)}
                />
                <div className="absolute end-0 top-12 z-50 w-72 rounded-2xl bg-[#13151B]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.75)]">
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
 ? 'bg-gold-500/15 text-gold-500 font-medium'
                                : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            <span>{opt.name}</span>
                            {active ? (
                              <Check className="h-3.5 w-3.5 text-gold-500" />
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
 ? 'bg-gold-500 text-black shadow-[0_4px_14px_rgba(232,191,116,0.3)]'
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

          {/* Desktop cart shortcut: regular users only (a seller's cart lives in Profile). */}
          {!isSeller && (
            <Link
              href={cartHref}
              aria-label={t('cart')}
              className="relative hidden h-10 w-10 place-items-center rounded-full transition hover:bg-white/[0.06] md:grid"
            >
              <ShoppingBag className="h-4 w-4 text-foreground/90" />
              <CountBadge count={count} className="absolute -end-1 -top-1" />
            </Link>
          )}

          <Link
            href={`/${locale}/profile`}
            aria-label={t('profile')}
            data-status={isProfile ? 'active' : 'inactive'}
            className="hidden h-11 w-11 place-items-center rounded-full text-foreground/90 transition hover:bg-white/[0.06] data-[status=active]:bg-gold-500/10 data-[status=active]:text-gold-500 cursor-pointer md:grid"
          >
            <User className="h-4 w-4" />
          </Link>
          {/* Phones: Profile lives in the bottom dock; this keeps the logo centred. */}
          <span aria-hidden className="block h-8 w-8 md:hidden" />
        </div>
      </header>

      {/* Main Content */}
      {/* Phones: room for the dock only (measured, hidden behind it); each page keeps its own small bottom gap. */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {/* The tabs. While a part's page (or checkout...) is open they stay mounted underneath, hidden, so a back swipe can show them. */}
        {(pager || underTab >= 0) && (
          <div
            ref={underRef}
            className="absolute inset-x-0 bottom-0"
            style={{ top: pager ? 0 : headerH.current, ...(pager ? {} : { visibility: 'hidden' as const }) }}
            {...(pager ? {} : { inert: true, 'aria-hidden': true })}
          >
            <TabPager
              tabs={tabs}
              index={pager ? tabIndex : underTab}
              dir={isRtl ? -1 : 1}
              onScrub={onPagerScrub}
              onSettle={onPagerSettle}
              onAim={onPagerAim}
              covered={!pager}
            />
            {/* Dark veil that lifts as the screen on top slides away. */}
            <div ref={shadeRef} aria-hidden className="pointer-events-none absolute inset-0 bg-black opacity-0" />
          </div>
        )}
        {/* Every other screen: scrolls on its own, laid over the tabs. */}
        {!pager && (
          <div
            ref={overlayRef}
            className={`absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-none bg-surface-0 [touch-action:pan-y] ${hideDock ? 'md:pb-0' : 'pb-[var(--dock-h,72px)] md:pb-12'}`}
          >
            {children}
          </div>
        )}
      </main>

      {/* Mobile bottom dock: Home, Garage (workshop owners) or Cart (everyone else), [Create], Shop, Profile. */}
      {/* Always mounted: on a part's page or the cart's checkout it sinks out of sight instead of vanishing. */}
      <nav
        ref={dockRef}
        aria-label={t('menu')}
        data-hidden={dockHidden ? 'true' : 'false'}
        {...(dockHidden ? { inert: true } : {})}
        className="cv-dock fixed inset-x-0 bottom-0 z-40 bg-surface-1/95 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.6)] md:hidden"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent"
        />
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)]">
          {/* The grid's padding is excluded so the glass lines up with the five columns. */}
          <div className="pointer-events-none absolute inset-y-0 inset-x-2">
            <LiquidIndicator ref={indicatorRef} col={routeCol} columns={5} rtl={isRtl} />
          </div>
          <DockLink href={`/${locale}/seller`} icon={House} label={t('home')} active={isHome} onTap={() => indicatorRef.current?.settle(0)} />
          {isSeller ? (
            <DockLink href={`/${locale}/garage`} icon={Car} label={t('garage')} active={isGarage} onTap={() => indicatorRef.current?.settle(1)} />
          ) : (
            <DockLink href={cartHref} icon={ShoppingBag} label={t('cart')} active={isCart} badge={count} onTap={() => indicatorRef.current?.settle(1)} />
          )}

          <button
            type="button"
            onClick={openCamera}
            aria-label={isSeller ? t('showroom') : t('create')}
            className="group relative flex cursor-pointer flex-col items-center gap-1 pb-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.14em] text-gold-500 outline-none"
          >
            <span className="grid h-8 w-11 place-items-center rounded-xl bg-gradient-to-b from-gold-500/20 to-gold-500/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 group-hover:from-gold-500/28 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-gold-500/60 motion-reduce:transition-none">
              <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span>{isSeller ? t('showroom') : t('create')}</span>
          </button>

          <DockLink href={`/${locale}/shop`} icon={ShoppingCart} label={t('shop')} active={isShop} onTap={() => indicatorRef.current?.settle(3)} />
          <DockLink href={`/${locale}/profile`} icon={User} label={t('profile')} active={isProfile || isDashboard} onTap={() => indicatorRef.current?.settle(4)} />
        </div>
      </nav>
    </div>
  );
}
