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
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useMyCar } from '@/features/shop/useMyCar';
import { useCurrency } from '@/context/CurrencyContext';
import { type VeloceProduct } from '@/domain/veloce-catalog';
import { playShutter, playLock, vibrate } from '@/features/camera/lib/fx';
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
  { id: 'Body Kit', key: 'bodyKit' },
  { id: 'Performance', key: 'performance' },
  { id: 'Interior', key: 'interior' },
  { id: 'Color', key: 'color' },
  { id: 'Ceramic', key: 'ceramic' },
  { id: 'Polish', key: 'polish' },
] as const;

import { composeCarAnglePhotorealistic } from '@/lib/automotive-compositor';

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

  const capturedAnglesCount = React.useMemo(() => {
    const keys = Object.keys(multiAngles);
    if (keys.length > 0) return keys.length;
    return photo ? 1 : 0;
  }, [multiAngles, photo]);

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
      generatedMap[angle.id] = render.demo
        ? await composeCarAnglePhotorealistic({ baseCarSrc: before, aiGeneratedUrl: null, parts, angleId: angle.id })
        : (render.results[angle.id] ?? before);
    }
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
      className="shimmer inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-gold-gradient px-6 text-[13px] font-bold uppercase tracking-[0.2em] text-black shadow-[0_14px_36px_rgba(212,174,98,0.35)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
    >
      <Layers className="h-4 w-4" />
      <span>{t('viewResult')}</span>
      {renderPlan.creditsNeeded > 0 && (
        <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] tracking-wider">
          {t('angleCredits', { angles: renderPlan.order.length, credits: renderPlan.creditsNeeded })}
        </span>
      )}
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
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-4 pt-[max(env(safe-area-inset-top),14px)] md:min-h-[calc(100dvh-81px)] md:px-8 md:pt-6 lg:max-w-7xl lg:px-10">
      {showProgress && (
        <RenderProgress
          states={render.states}
          running={render.running}
          fatal={render.fatal}
          percent={render.summary.percent}
          backdrop={renderPlan.order[0]?.photo}
          locale={locale}
          demo={render.demo}
          onRetry={(id) => void render.retry(id)}
          onContinue={() => void openResult()}
          onClose={() => setShowProgress(false)}
        />
      )}
      {showGate && <CarIdentifyGate photo={multiAngles['front'] || photo || ''} onDone={confirmCar} />}

      {/* Top bar: back, title, photo counter */}
      <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2">
        <Link
          href={isSeller ? `/${locale}/seller?tab=dashboard` : `/${locale}/shop`}
          aria-label={t('back')}
          className="grid h-11 w-11 place-items-center rounded-full text-white/80 transition hover:bg-white/[0.07] hover:text-white"
        >
          <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
        </Link>

        <div className="min-w-0 text-center">
          <h1 className="font-display text-[12px] leading-snug font-medium uppercase tracking-[0.28em] ps-[0.28em] text-white">
            {isSeller ? t('titleSeller') : t('titleUser')}
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-white/40">{myCar ? `${myCar.label}${myCar.year ? ` · ${myCar.year}` : ''}` : t('subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={openCamera}
          aria-label={t('refreshPhoto')}
          className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#D4AE62] transition hover:bg-[#D4AE62]/10"
        >
          <Camera className="h-[18px] w-[18px]" />
          <span className="tabular-nums">{capturedAnglesCount}/5</span>
        </button>
      </div>

      <div className="lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      {/* Car viewport */}
      <div className="relative mt-3 overflow-hidden rounded-[28px] lg:mt-0 bg-[#0B0D13] shadow-[0_28px_80px_rgba(0,0,0,0.75)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(70%_60%_at_50%_45%,rgba(212,174,98,0.10),transparent_70%)]" />
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
          className={`relative aspect-[16/10] w-full overflow-hidden md:aspect-[2/1] ${hasAfter ? 'cursor-ew-resize touch-none select-none' : ''}`}
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
                className="pointer-events-none absolute inset-y-0 z-[2] w-0.5 bg-[#D4AE62] shadow-[0_0_20px_rgba(212,174,98,0.9)]"
                style={{ insetInlineStart: `${sliderPos}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute start-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#D4AE62] text-sm font-black text-black shadow-[0_0_24px_rgba(212,174,98,0.9)]">‹ ›</div>
              </div>
              <span className="pointer-events-none absolute start-3 top-3 z-[3] rounded-full bg-black/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-md">{t('before')}</span>
              <span className="pointer-events-none absolute end-3 top-3 z-[3] rounded-full bg-[#D4AE62] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-black">{t('after')}</span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => void saveAfter()}
                aria-label={tr('download')}
                className="absolute end-3 top-12 z-[3] grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black/65 text-[#D4AE62] backdrop-blur-md transition hover:bg-black/85"
              >
                <Download className="h-[18px] w-[18px]" />
              </button>
            </>
          ) : (
            <img src={currentAnglePhoto} alt={t('photoAlt')} className="h-full w-full object-cover transition-opacity duration-300" />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0D13] via-[#0B0D13]/40 to-transparent" />

          {/* Other sides */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => stepAngle(-1)}
            aria-label={tr('prevAngle')}
            className="absolute start-2 top-1/2 z-[3] grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/55 text-white/85 backdrop-blur-md transition hover:bg-black/75"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => stepAngle(1)}
            aria-label={tr('nextAngle')}
            className="absolute end-2 top-1/2 z-[3] grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/55 text-white/85 backdrop-blur-md transition hover:bg-black/75"
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>

          {selectedProducts.length > 0 && !hasAfter && (
            <div className="absolute start-3 top-3 z-[2] flex items-center gap-1.5 rounded-full bg-[#090A0F]/80 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#D4AE62]" />
              {t('selectedCount', { count: selectedProducts.length })}
            </div>
          )}

          {/* Angle pills */}
          <div onPointerDown={(e) => e.stopPropagation()} className="absolute inset-x-3 bottom-3 z-[2] flex items-center gap-1 overflow-x-auto rounded-full bg-[#090A0F]/80 p-1 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FIVE_CAR_ANGLES.map((ang) => {
              const isActive = activeAngleId === ang.id;
              const hasCaptured = Boolean(multiAngles[ang.id]);
              return (
                <button
                  key={ang.id}
                  type="button"
                  onClick={() => setActiveAngleId(ang.id)}
                  aria-pressed={isActive}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition ${
                    isActive ? 'bg-[#D4AE62] text-black' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span>{t(`anglesShort.${ang.key}`)}</span>
                  {hasCaptured && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-black' : 'bg-emerald-400'}`} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop build panel: what is on the car right now, one part per slot */}
      <aside className="mt-0 hidden flex-col rounded-[28px] border border-white/[0.07] bg-[#11141D] p-5 lg:flex">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[12px] font-medium uppercase tracking-[0.28em] text-white">{t('yourBuild')}</h2>
          <span className="text-xs tabular-nums text-white/40">{selectedProducts.length}</span>
        </div>
        <ul className="mt-4 flex-1 space-y-2 overflow-y-auto pe-1">
          {selectedProducts.length === 0 && <li className="py-6 text-center text-sm text-white/45">{t('pickParts')}</li>}
          {selectedProducts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2">
              <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#0E1016]">
                {p.swatch ? <span className="block h-full w-full" style={{ background: p.swatch }} /> : <img src={p.image} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{p.name}</span>
                <span className="block text-xs tabular-nums text-[#D4AE62]">{formatPrice(getUSDPrice(p.price))}</span>
              </span>
              <button
                type="button"
                onClick={() => togglePart(p.id)}
                aria-label={`${t('removePart')}: ${p.name}`}
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/45 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-white/[0.07] pt-4">
          <div className="mb-3 flex items-center justify-between px-1 text-xs">
            <span className="text-white/50">{selectedProducts.length > 0 ? t('selectedCount', { count: selectedProducts.length }) : t('tapHint')}</span>
            {selectedProducts.length > 0 && <span className="text-base font-semibold tabular-nums text-white">{t('total', { amount: formatPrice(totalSelectedUSD) })}</span>}
          </div>
          {creditsNote}
          {applyButton}
        </div>
      </aside>
      </div>

      {applyError && (
        <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{applyError}</span>
          <button type="button" onClick={() => setApplyError(null)} className="shrink-0 text-xs font-semibold text-red-100/80 hover:text-white">
            {t('close')}
          </button>
        </div>
      )}

      {/* Category tabs */}
      <div role="tablist" aria-label={t('subtitle')} className="mt-5 flex gap-6 overflow-x-auto border-b border-white/[0.07] px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*:first-child]:ms-auto [&>*:last-child]:me-auto">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(cat.id)}
              className={`relative shrink-0 cursor-pointer py-3 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
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
      <div className="mt-1 flex-1">
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
              className="mt-5 inline-block rounded-full bg-[#D4AE62] px-6 py-2.5 text-xs font-bold text-black transition hover:brightness-110"
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
            onFocusChange={() => vibrate(8)}
            prevLabel={t('scrollBack')}
            nextLabel={t('scrollForward')}
            selectLabel={t('select')}
            selectedLabel={t('selected')}
            formatPrice={formatPrice}
            fitFallback={t('fitFallback')}
            ariaLabel={t('pickFromStrip')}
          />
        )}
      </div>

      {/* Apply changes: fixed to the bottom on phones / tablets, lives in the build panel on desktop */}
      <div aria-hidden className="h-44 shrink-0 lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#0D0E12] via-[#0D0E12]/95 to-transparent px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-8 md:start-24 md:px-8 lg:hidden">
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
