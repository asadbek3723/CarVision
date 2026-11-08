'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Camera,
  Layers,
  MoreHorizontal,
  Maximize2,
  X,
} from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useMyCar } from '@/features/shop/useMyCar';
import { useCurrency } from '@/context/CurrencyContext';
import { type VeloceProduct } from '@/domain/veloce-catalog';
import { playShutter, playLock, playTick, unlockAudio, vibrate } from '@/features/camera/lib/fx';
import { CarIdentifyGate } from './CarIdentifyGate';
import { PartReel } from './PartReel';
import { onePerSlot, partSlot, toggleInSlot } from '@/lib/part-slot';
import { RenderProgress } from '@/features/visualizer/RenderProgress';
import { planRender, type PlanAngle } from '@/features/visualizer/render-plan';
import { useRenderBuild, type BuildPart } from '@/features/visualizer/useRenderBuild';

const CONFIRMED_KEY = 'carvision_car_confirmed_for';

/** `id` is the stable identifier; `key` selects the translated label in `customize.angles` / `customize.anglesShort`. */
export const FIVE_CAR_ANGLES = [
  { id: 'front', key: 'front' },
  { id: 'rear', key: 'rear' },
  { id: 'right', key: 'right' },
  { id: 'front-left', key: 'frontLeft' },
  { id: 'rear-right', key: 'rearRight' },
] as const;

/** `id` doubles as the filter key used below; `key` selects the label in `customize.categories`. */
const CATEGORIES = [
  { id: 'All', key: 'all' },
  { id: 'Wheels', key: 'wheels' },
  { id: 'Bumper', key: 'bumper' },
  { id: 'Body Kit', key: 'bodyKit' },
  { id: 'Spoiler', key: 'spoiler' },
  { id: 'Lights', key: 'lights' },
  { id: 'Performance', key: 'performance' },
  { id: 'Interior', key: 'interior' },
  { id: 'Color', key: 'color' },
  { id: 'Ceramic', key: 'ceramic' },
  { id: 'Polish', key: 'polish' },
] as const;

import { composeCarAnglePhotorealistic } from '@/lib/automotive-compositor';
import { buttonClasses } from '@/components/ui';

/** Catalog prices are already stored in USD; never guess a currency from the size of the number. */
const getUSDPrice = (raw?: number) => {
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

export function VeloceCustomize() {
  const t = useTranslations('customize');
  const tr = useTranslations('result');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const requestedPartId = searchParams ? searchParams.get('partId') : null;
  const locale = (params?.['locale'] as string) || 'uz';

  const {
    photo,
    selectedPartIds,
    setSelectedPartIds,
    multiAngles,
    captureStamp,
    generatedAngles,
    setGeneratedAngles,
    openCamera,
  } = useVeloceStore();
  const { user, refreshProfile } = useAuth();
  const { car: myCar, filterQuery } = useMyCar();
  const { formatPrice } = useCurrency();

  const isSeller = user?.role === 'b2b_seller';

  const [activeCategory, setActiveCategory] = React.useState('All');
  const [activeAngleId, setActiveAngleId] = React.useState<string>('front-left');
  const [catalogProducts, setCatalogProducts] = React.useState<VeloceProduct[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(true);
  // After new photos are taken the car must be confirmed (AI guess + year) before parts are shown.
  const [confirmedStamp, setConfirmedStamp] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      setConfirmedStamp(sessionStorage.getItem(CONFIRMED_KEY) ?? '');
    } catch {
      setConfirmedStamp('');
    }
  }, []);
  const carChecked = confirmedStamp !== null;
  const carConfirmed = confirmedStamp === captureStamp;
  const confirmCar = React.useCallback(() => {
    setConfirmedStamp(captureStamp);
    try {
      sessionStorage.setItem(CONFIRMED_KEY, captureStamp);
    } catch {
      // kept in memory for this visit
    }
  }, [captureStamp]);
  const [showProgress, setShowProgress] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const render = useRenderBuild(refreshProfile);
  const isApplying = render.running;

  // Load catalog products
  React.useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        // Workshop owners see only their own garage parts; regular users see every shop's parts that fit their car.
        const endpoint = isSeller ? '/api/v1/seller/inventory' : `/api/v1/products?limit=120&locale=${locale}${filterQuery ? `&${filterQuery}` : ''}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        const data = await res.json();
        if (isMounted) {
          setCatalogProducts(data.success && Array.isArray(data.products) ? data.products : []);
        }
      } catch (err) {
        console.warn('Could not load catalog:', err);
      } finally {
        if (isMounted) setIsLoadingCatalog(false);
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [isSeller, filterQuery, locale]);

  // One part per slot: a car can't wear two sets of wheels or two paint jobs, so picking a part
  // replaces the one already chosen in the same slot.
  const togglePart = React.useCallback(
    (id: string) => {
      setSelectedPartIds(toggleInSlot(selectedPartIds, id, catalogProducts));
      // The rendered pictures belong to the old selection: drop them so the top never shows stale parts.
      if (Object.keys(generatedAngles).length > 0) setGeneratedAngles({});
      vibrate(20);
    },
    [selectedPartIds, catalogProducts, setSelectedPartIds, generatedAngles, setGeneratedAngles]
  );

  // Pre-select requestedPartId if passed in URL and not yet selected; tidy older multi-picks per slot.
  React.useEffect(() => {
    if (catalogProducts.length === 0) return;
    let next = selectedPartIds;
    if (requestedPartId && catalogProducts.some((p) => p.id === requestedPartId) && !next.includes(requestedPartId)) {
      next = toggleInSlot(next, requestedPartId, catalogProducts);
    }
    next = onePerSlot(next, catalogProducts);
    if (next.length !== selectedPartIds.length || next.some((id, i) => id !== selectedPartIds[i])) {
      setSelectedPartIds(next);
    }
  }, [requestedPartId, catalogProducts, selectedPartIds, setSelectedPartIds]);

  // Bring back the build saved with "Save config" (once, and only when nothing is picked yet).
  const restoredBuild = React.useRef(false);
  React.useEffect(() => {
    if (restoredBuild.current || catalogProducts.length === 0) return;
    restoredBuild.current = true;
    if (selectedPartIds.length > 0 || requestedPartId) return;
    try {
      const saved = JSON.parse(localStorage.getItem('carvision_saved_build') ?? '[]') as unknown;
      if (!Array.isArray(saved)) return;
      const ids = saved.filter((id): id is string => typeof id === 'string' && catalogProducts.some((p) => p.id === id));
      if (ids.length) setSelectedPartIds(onePerSlot(ids, catalogProducts));
    } catch {
      /* nothing saved */
    }
  }, [catalogProducts, selectedPartIds, requestedPartId, setSelectedPartIds]);

  // Only tabs that have parts right now: an empty tab is a dead end.
  const visibleCategories = React.useMemo(
    () =>
      catalogProducts.length === 0
        ? CATEGORIES.filter((c) => c.id === 'All')
        : CATEGORIES.filter((c) => c.id === 'All' || catalogProducts.some((p) => partSlot(p) === c.id.toLowerCase())),
    [catalogProducts]
  );
  React.useEffect(() => {
    if (!visibleCategories.some((c) => c.id === activeCategory)) setActiveCategory('All');
  }, [visibleCategories, activeCategory]);

  // Filter products for the filmstrip carousel
  const filteredProducts = React.useMemo(() => {
    if (catalogProducts.length === 0) return [];
    if (activeCategory === 'All') return catalogProducts;

    // Strict: a tab shows only parts of that kind (wheels -> only wheels, color -> only colors).
    return catalogProducts.filter((p) => partSlot(p) === activeCategory.toLowerCase());
  }, [catalogProducts, activeCategory]);

  // All selected product objects across all categories
  const selectedProducts = React.useMemo(
    () => catalogProducts.filter((p) => selectedPartIds.includes(p.id)),
    [catalogProducts, selectedPartIds]
  );

  const totalSelectedUSD = React.useMemo(
    () => selectedProducts.reduce((sum, p) => sum + getUSDPrice(p.price), 0),
    [selectedProducts]
  );

  // Active angle preview image
  const currentAnglePhoto =
    multiAngles[activeAngleId] || photo || '/assets/car-CjioCIbt.jpg';

  // Rendered result of this side (if any): the top picture becomes a before / after comparison.
  const afterPhoto = generatedAngles[activeAngleId] || '';
  const hasAfter = Boolean(afterPhoto);
  const [sliderPos, setSliderPos] = React.useState(50);
  const sliderRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };
  const sliderDrag = React.useRef(false);
  const moveSlider = (clientX: number) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    setSliderPos(Math.max(0, Math.min(((clientX - rect.left) / rect.width) * 100, 100)));
  };
  const stepAngle = (delta: number) => {
    const withPhoto = FIVE_CAR_ANGLES.filter((a) => multiAngles[a.id] || generatedAngles[a.id]);
    const list = withPhoto.length > 1 ? withPhoto : FIVE_CAR_ANGLES;
    const at = Math.max(0, list.findIndex((a) => a.id === activeAngleId));
    const next = list[(at + delta + list.length) % list.length];
    if (next) setActiveAngleId(next.id);
  };
  // Cross-origin URLs ignore <a download>, so fetch the picture as a blob first.
  const saveAfter = async () => {
    try {
      const res = await fetch(afterPhoto);
      if (!res.ok) throw new Error('fetch failed');
      const blobUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `carvision-${activeAngleId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      window.open(afterPhoto, '_blank', 'noopener');
    }
  };

  // Full-screen studio on phones: the page itself must not scroll or rubber-band while the
  // wheel and the photo are dragged (only the studio's own controls move).
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow, html.style.overscrollBehavior, body.style.overscrollBehavior];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      [html.style.overflow, body.style.overflow, html.style.overscrollBehavior, body.style.overscrollBehavior] = prev as [string, string, string, string];
    };
  }, []);


  // The sides that were actually photographed. A single plain photo counts as the hero side.
  const planAngles = React.useMemo<PlanAngle[]>(() => {
    const sides: PlanAngle[] = FIVE_CAR_ANGLES.map((a) => ({ id: a.id, label: t(`angles.${a.key}`), photo: multiAngles[a.id] }));
    if (!sides.some((a) => a.photo) && photo) {
      return sides.map((a) => (a.id === 'front-left' ? { ...a, photo } : a));
    }
    return sides;
  }, [multiAngles, photo, t]);
  const renderPlan = React.useMemo(() => planRender(planAngles), [planAngles]);
  const creditsLeft = user?.credits_balance ?? 0;
  const notEnoughCredits = Boolean(user) && renderPlan.creditsNeeded > creditsLeft;

  const buildParts = (list: VeloceProduct[]): BuildPart[] =>
    list.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || 'Wheels',
      spec: p.spec || undefined,
      price: getUSDPrice(p.price),
      image: p.image,
      angleImage: p.angleImage,
      swatch: p.swatch,
    }));

  // Render the chosen parts on EVERY captured side of the car (1 credit per side)
  const handleApplyChanges = async () => {
    if (render.running) return;

    const partsToApply = selectedProducts;
    if (partsToApply.length === 0) {
      setApplyError(t('errPickPart'));
      return;
    }

    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }
    if (renderPlan.order.length === 0) {
      setApplyError(t('errTakePhoto'));
      return;
    }
    setApplyError(null);
    playShutter();
    vibrate(40);
    setShowProgress(true);
    await render.run(planAngles, buildParts(partsToApply));
  };

  // Demo mode (no AI key yet) returns a stock picture; show the local composite as a clearly labelled preview
  const openResult = async () => {
    const parts = selectedProducts;
    const generatedMap: Record<string, string> = {};
    for (const angle of renderPlan.order) {
      const before = angle.photo as string;
      if (render.demo) {
        generatedMap[angle.id] = await composeCarAnglePhotorealistic({ baseCarSrc: before, aiGeneratedUrl: null, parts, angleId: angle.id });
        continue;
      }
      // Only real AI results are shown; a side that failed stays out instead of passing the
      // untouched photo off as the "after" picture.
      const result = render.results[angle.id];
      if (result) generatedMap[angle.id] = result;
    }
    if (Object.keys(generatedMap).length === 0) return;
    setGeneratedAngles(generatedMap);
    playLock();
    vibrate(50);
    router.push(`/${locale}/customize/result`);
  };

  const applyButton = (
    <button
      type="button"
      onClick={handleApplyChanges}
      disabled={isApplying}
      className={buttonClasses({ size: 'lg', fullWidth: true, className: 'gap-2.5 px-5' })}
    >
      {/* Always one line: the label shrinks with an ellipsis before anything wraps. */}
      <Layers className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 truncate whitespace-nowrap">{t('viewResult')}</span>
      {renderPlan.creditsNeeded > 0 && (
        <span className="shrink-0 whitespace-nowrap rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-semibold tabular-nums">
          {t('angleCredits', { angles: renderPlan.order.length, credits: renderPlan.creditsNeeded })}
        </span>
      )}
    </button>
  );
  const applyButtonDesktop = (
    <button
      type="button"
      onClick={handleApplyChanges}
      disabled={isApplying}
      className="relative inline-flex h-[58px] w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full border border-[#F0D79A]/55 bg-[linear-gradient(180deg,#E9CB8A_0%,#C9A257_48%,#A98337_100%)] px-6 text-[15px] font-semibold uppercase tracking-[0.1em] text-[#1A1409] shadow-[inset_0_1px_0_rgba(255,244,214,0.65),inset_0_-10px_18px_rgba(120,84,20,0.28),0_10px_30px_-10px_rgba(212,174,98,0.5)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-1/2 rounded-b-[50%] bg-gradient-to-b from-white/25 to-transparent" />
      <Layers className="relative h-[22px] w-[22px]" strokeWidth={2} />
      <span className="relative">{t('viewResult')}</span>
      <ChevronRight className="relative h-4 w-4 rtl:rotate-180" strokeWidth={2.5} />
    </button>
  );
  const creditsNote = notEnoughCredits && (
    <p className="mb-2 px-2 text-[11px] text-amber-300">
      {t('creditsNeeded', { needed: renderPlan.creditsNeeded, left: creditsLeft })}{' '}
      <Link href={`/${locale}/plans`} className="font-semibold underline">{t('plans')}</Link>
    </p>
  );

  const showGate = carChecked && !carConfirmed && Boolean(user) && Boolean(photo);

  return (
    <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col overflow-hidden px-4 pt-[max(env(safe-area-inset-top),12px)] md:h-[calc(100dvh-81px)] md:px-8 md:pt-4 lg:max-w-[1680px] lg:px-10 lg:pb-5 xl:px-14">
      {showProgress && (
        <RenderProgress
          states={render.states}
          running={render.running}
          fatal={render.fatal}
          percent={render.summary.percent}
          backdrop={renderPlan.order[0]?.photo}
          locale={locale}
          demo={render.demo}
          onRetry={(id) => render.retry(id)}
          onContinue={() => void openResult()}
          onClose={() => setShowProgress(false)}
        />
      )}
      {showGate && <CarIdentifyGate photo={multiAngles['front'] || photo || ''} onDone={confirmCar} />}

      {/* Top bar: back, title, photo counter */}
      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2 lg:grid-cols-[44px_1fr] lg:gap-10 lg:pt-1">
        <Link
          href={isSeller ? `/${locale}/seller?tab=dashboard` : `/${locale}/shop`}
          aria-label={t('back')}
          className="grid h-11 w-11 place-items-center rounded-full text-white/80 transition hover:bg-white/[0.07] hover:text-white lg:bg-white/[0.02]"
        >
          <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
        </Link>

        <div className="min-w-0 text-center lg:text-start">
          <h1 className="truncate whitespace-nowrap font-display text-[12px] leading-snug font-medium uppercase tracking-[0.16em] ps-[0.16em] text-white sm:tracking-[0.28em] sm:ps-[0.28em] lg:ps-0 lg:text-[17px] lg:font-light lg:tracking-[0.42em]">
            {isSeller ? t('titleSeller') : t('titleUser')}
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-white/40 lg:mt-1 lg:text-sm">{myCar ? `${myCar.label}${myCar.year ? ` · ${myCar.year}` : ''}` : t('subtitle')}</p>
        </div>

      </div>

      <div className="mt-2 min-h-[130px] flex-1 lg:mt-3 lg:grid lg:min-h-[260px] lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1 lg:items-stretch lg:gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* Car viewport */}
      <div ref={stageRef} className="relative h-full min-h-0 overflow-hidden rounded-[28px] lg:mt-0 bg-surface-1 shadow-[0_28px_80px_rgba(0,0,0,0.75)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(70%_60%_at_50%_45%,rgba(212,174,98,0.10),transparent_70%)] lg:hidden" />
        <div
          ref={sliderRef}
          onPointerDown={(e) => {
            if (!hasAfter) return;
            sliderDrag.current = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            moveSlider(e.clientX);
          }}
          onPointerMove={(e) => {
            if (sliderDrag.current) moveSlider(e.clientX);
          }}
          onPointerUp={() => {
            sliderDrag.current = false;
          }}
          onPointerCancel={() => {
            sliderDrag.current = false;
          }}
          className={`relative h-full w-full overflow-hidden ${hasAfter ? 'cursor-ew-resize touch-none select-none' : ''}`}
        >
          {hasAfter ? (
            <>
              <img src={afterPhoto} alt={tr('afterAlt')} draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
              <img
                src={currentAnglePhoto}
                alt={tr('beforeAlt')}
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)`, WebkitClipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-[2] w-0.5 bg-gold-500 shadow-[0_0_20px_rgba(212,174,98,0.9)]"
                style={{ insetInlineStart: `${sliderPos}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute start-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-500 text-sm font-black text-black shadow-[0_0_24px_rgba(212,174,98,0.9)]">‹ ›</div>
              </div>
              <span className="pointer-events-none absolute start-3 top-3 z-[3] rounded-full bg-black/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-md">{t('before')}</span>
              <span className="pointer-events-none absolute end-3 top-3 z-[3] rounded-full bg-gold-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-black">{t('after')}</span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => void saveAfter()}
                aria-label={tr('download')}
                className="absolute end-3 top-12 z-[3] grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-black/65 text-gold-500 backdrop-blur-md transition hover:bg-black/85"
              >
                <Download className="h-[18px] w-[18px]" />
              </button>
            </>
          ) : (
            <>
              <img src={currentAnglePhoto} alt={t('photoAlt')} className="h-full w-full object-cover transition-opacity duration-300" />
            </>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0D13] via-[#0B0D13]/40 to-transparent lg:hidden" />

          {/* Other sides */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => stepAngle(-1)}
            aria-label={tr('prevAngle')}
            className="absolute start-2 top-1/2 z-[3] grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/25 text-white/45 opacity-60 backdrop-blur-sm transition hover:bg-black/60 hover:text-white hover:opacity-100 active:opacity-100 lg:start-6 lg:h-12 lg:w-12 lg:bg-black/40"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => stepAngle(1)}
            aria-label={tr('nextAngle')}
            className="absolute end-2 top-1/2 z-[3] grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/25 text-white/45 opacity-60 backdrop-blur-sm transition hover:bg-black/60 hover:text-white hover:opacity-100 active:opacity-100 lg:end-6 lg:h-12 lg:w-12 lg:bg-black/40"
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>

          {!hasAfter && (
            <div onPointerDown={(e) => e.stopPropagation()} className="absolute end-5 top-4 z-[3] hidden items-center gap-1 lg:flex">
              <button type="button" onClick={toggleFullscreen} aria-label={tr('fullscreen')} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white">
                <Maximize2 className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={openCamera} aria-label={t('refreshPhoto')} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white">
                <Camera className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}


          {/* Angle pills */}
          <div onPointerDown={(e) => e.stopPropagation()} className="absolute inset-x-3 bottom-3 z-[2] flex items-center gap-1 overflow-x-auto rounded-full bg-[#090A0F]/35 p-1 opacity-55 backdrop-blur-sm transition-opacity duration-ui hover:opacity-100 focus-within:opacity-100 active:opacity-100 lg:opacity-100 lg:inset-x-auto lg:bottom-5 lg:start-5 lg:max-w-[calc(100%-2.5rem)] lg:gap-2 lg:bg-transparent lg:p-0 lg:backdrop-blur-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FIVE_CAR_ANGLES.map((ang) => {
              const isActive = activeAngleId === ang.id;
              const hasCaptured = Boolean(multiAngles[ang.id]);
              return (
                <button
                  key={ang.id}
                  type="button"
                  onClick={() => setActiveAngleId(ang.id)}
                  aria-pressed={isActive}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition lg:gap-2 lg:border lg:px-4 lg:py-2.5 lg:text-[13px] lg:font-medium ${
 isActive ? 'bg-gold-500 text-black lg:border-gold-500' : 'text-white/70 hover:text-white lg:bg-black/35'
                  }`}
                >
                  <span aria-hidden className={`hidden h-2 w-2 rounded-full lg:block ${isActive ? 'bg-black/70' : hasCaptured ? 'bg-emerald-400' : 'bg-white/25'}`} />
                  <span>{t(`anglesShort.${ang.key}`)}</span>
                  {hasCaptured && <span className={`h-1.5 w-1.5 rounded-full lg:hidden ${isActive ? 'bg-black' : 'bg-emerald-400'}`} />}
                  <span aria-hidden className={`hidden h-1.5 w-1.5 rounded-full lg:block ${isActive ? 'bg-black/60' : 'bg-gold-500'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop build panel: what is on the car right now, one part per slot */}
      <aside className="mt-0 hidden min-h-0 flex-col rounded-[28px] bg-gradient-to-b from-[#14171F] to-[#0E1016] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.5)] lg:flex">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 font-display text-[12px] font-medium uppercase tracking-[0.28em] text-white"><span aria-hidden className="h-5 w-[3px] rounded-full bg-gold-500" />{t('yourBuild')}</h2>
          <button
            type="button"
            onClick={() => setSelectedPartIds([])}
            disabled={selectedProducts.length === 0}
            aria-label={t('clearBuild')}
            title={t('clearBuild')}
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
        <ul className="mt-5 flex-1 space-y-3 overflow-y-auto pe-1">
          {selectedProducts.length === 0 && <li className="py-6 text-center text-sm text-white/45">{t('pickParts')}</li>}
          {selectedProducts.map((p) => (
            <li key={p.id} className="flex items-center gap-4 rounded-[20px] bg-white/[0.03] p-2.5">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-surface-1">
                {p.swatch ? <span className="block h-full w-full" style={{ background: p.swatch }} /> : <img src={p.image} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-white">{p.name}</span>
                <span className="mt-0.5 block text-sm tabular-nums text-gold-500">{formatPrice(getUSDPrice(p.price))}</span>
              </span>
              <button
                type="button"
                onClick={() => togglePart(p.id)}
                aria-label={`${t('removePart')}: ${p.name}`}
                className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-white/45 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-5">
          {selectedProducts.length > 0 && (
            <div className="mb-4 flex items-center justify-between px-1 text-sm">
              <span className="text-white/45">{t('selectedCount', { count: selectedProducts.length })}</span>
              <span className="text-[17px] tabular-nums text-white/85">
                {t('total', { amount: '§' }).split('§')[0]}
                <span className="text-[22px] font-semibold text-white">{formatPrice(totalSelectedUSD)}</span>
                {t('total', { amount: '§' }).split('§')[1]}
              </span>
            </div>
          )}
          {creditsNote}
          {applyButtonDesktop}
          {renderPlan.creditsNeeded > 0 && (
            <p className="mt-2 text-center text-[11px] text-white/40">{t('angleCredits', { angles: renderPlan.order.length, credits: renderPlan.creditsNeeded })}</p>
          )}
        </div>
      </aside>
      </div>

      {applyError && (
        <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{applyError}</span>
          <button type="button" onClick={() => setApplyError(null)} className="shrink-0 text-xs font-semibold text-red-100/80 hover:text-white">
            {t('close')}
          </button>
        </div>
      )}

      {/* Category tabs */}
      <div role="tablist" aria-label={t('subtitle')} className="mt-2 flex shrink-0 gap-6 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*:first-child]:ms-auto [&>*:last-child]:me-auto">
        {visibleCategories.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(cat.id)}
              className={`relative shrink-0 cursor-pointer py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
 active ? 'text-white' : 'text-white/40 hover:text-white/70'
 }`}
            >
              {t(`categories.${cat.key}`)}
              <span className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gold-gradient transition-transform duration-300 ${active ? 'scale-x-100' : 'scale-x-0'}`} />
            </button>
          );
        })}
      </div>

      {/* Parts reel */}
      <div className="shrink-0">
        {isLoadingCatalog ? (
          <div className="flex items-center justify-center gap-3 py-10" aria-hidden>
            {[0.5, 0.75, 1, 0.75, 0.5].map((o, n) => (
              <div key={n} className="aspect-square w-[22%] max-w-[120px] animate-pulse rounded-[22px] bg-[#12151E]" style={{ opacity: o }} />
            ))}
          </div>
        ) : catalogProducts.length === 0 ? (
          <div className="mt-6 rounded-[28px] bg-[#11141D] px-6 py-12 text-center">
            <p className="text-base font-semibold text-white">{isSeller ? t('emptySeller') : t('emptyUser')}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
              {isSeller ? (user?.plan?.isPaid ? t('emptySellerHint') : t('emptyLockedHint')) : t('emptyUserHint')}
            </p>
            <Link
              href={isSeller ? (user?.plan?.isPaid ? `/${locale}/seller/new-part` : `/${locale}/plans`) : `/${locale}/shop`}
              className={buttonClasses({ size: 'sm', className: 'mt-5' })}
            >
              {isSeller ? (user?.plan?.isPaid ? t('ctaAddPart') : t('ctaPlans')) : t('ctaShop')}
            </Link>
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/45">{t('noPartsInCategory')}</p>
        ) : (
          <PartReel
            items={filteredProducts}
            selectedIds={selectedPartIds}
            onToggle={togglePart}
            onTick={playTick}
            onPointerStart={unlockAudio}
            prevLabel={t('scrollBack')}
            nextLabel={t('scrollForward')}
            formatPrice={formatPrice}
            fitFallback={t('fitFallback')}
            ariaLabel={t('pickFromStrip')}
          />
        )}
      </div>

      {/* Apply changes: pinned to the bottom of the screen on phones / tablets, lives in the build panel on desktop */}
      <div className="shrink-0 pb-[max(env(safe-area-inset-bottom),12px)] pt-1 lg:hidden">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between gap-3 px-2 text-xs">
            <span className="text-white/50">{selectedProducts.length > 0 ? t('selectedCount', { count: selectedProducts.length }) : t('pickParts')}</span>
            <span className="font-semibold tabular-nums text-white">{selectedProducts.length > 0 ? t('total', { amount: formatPrice(totalSelectedUSD) }) : t('tapHint')}</span>
          </div>
          {creditsNote}
          {applyButton}
        </div>
      </div>
    </div>
  );
}
