'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Film,
  Download,
  CheckCircle2,
  SlidersHorizontal,
  ShoppingBag,
  Car,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { FIVE_CAR_ANGLES } from '@/components/veloce/VeloceCustomize';
import {
  CinematicVideoStudio,
  type CinematicAngleFrame,
} from '@/components/studio/CinematicVideoStudio';
import { useVeloceStore } from '@/context/VeloceStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { type VeloceProduct } from '@/domain/veloce-catalog';
import { vibrate } from '@/features/camera/lib/fx';
import { heroAngleId } from '@/features/visualizer/render-plan';

/** Catalog prices are already stored in USD; never guess a currency from the size of the number. */
const getUSDPrice = (raw?: number) => {
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

export default function CustomizeResultPage() {
  const tc = useTranslations('customize');
  const t = useTranslations('result');
  const tf = useTranslations('flow');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  const {
    photo,
    selectedPartIds,
    multiAngles,
    generatedAngles,
    add,
  } = useVeloceStore();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const isSeller = user?.role === 'b2b_seller';

  const [catalogProducts, setCatalogProducts] = React.useState<VeloceProduct[]>([]);
  const [activeAngleId, setActiveAngleId] = React.useState<string>('front-left');
  const [sliderPos, setSliderPos] = React.useState(50);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isVideoStudioOpen, setIsVideoStudioOpen] = React.useState(false);
  const [workshopConfirmed, setWorkshopConfirmed] = React.useState(false);

  const sliderContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Load catalog products to resolve selectedPartIds
  React.useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        // Workshop owners only ever see their own garage; everyone else sees the whole marketplace.
        const endpoint = isSeller ? '/api/v1/seller/inventory' : `/api/v1/products?locale=${locale}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.products)) {
          setCatalogProducts(data.products);
        }
      } catch {
        // Ignore
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [isSeller, user?.plan?.isPaid, locale]);

  const selectedParts = React.useMemo(() => {
    if (catalogProducts.length === 0) return [];
    const matched = catalogProducts.filter((p) => selectedPartIds.includes(p.id));
    return matched.length > 0 ? matched : catalogProducts.slice(0, 1);
  }, [catalogProducts, selectedPartIds]);

  const totalPriceUSD = React.useMemo(
    () => selectedParts.reduce((sum, p) => sum + getUSDPrice(p.price), 0),
    [selectedParts]
  );

  const deposit3PercentUSD = Math.max(1, Math.round(totalPriceUSD * 0.03));

  // Only sides that were really rendered are shown (no placeholder or copied images)
  const renderedAngles = React.useMemo(
    () => FIVE_CAR_ANGLES.filter((a) => Boolean(generatedAngles[a.id])),
    [generatedAngles]
  );
  const hasResults = renderedAngles.length > 0;
  const currentAngle = renderedAngles.find((a) => a.id === activeAngleId) ?? renderedAngles[0];
  const currentId = currentAngle?.id ?? activeAngleId;
  const beforeUrl = multiAngles[currentId] || photo || '';
  const afterUrl = generatedAngles[currentId] || '';
  const currentIndex = Math.max(0, renderedAngles.findIndex((a) => a.id === currentId));

  const goTo = React.useCallback(
    (delta: number) => {
      if (renderedAngles.length < 2) return;
      const next = renderedAngles[(currentIndex + delta + renderedAngles.length) % renderedAngles.length];
      if (next) setActiveAngleId(next.id);
    },
    [renderedAngles, currentIndex]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(1);
      if (e.key === 'ArrowLeft') goTo(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo]);

  // Video frames: the real rendered sides only
  const studioAngles: CinematicAngleFrame[] = React.useMemo(() => {
    const frames = renderedAngles.map((ang) => ({
      id: ang.id,
      label: tc(`angles.${ang.key}`),
      afterUrl: generatedAngles[ang.id] as string,
    }));
    // The reel opens on the best 3/4 view
    const hero = heroAngleId(frames.map((f) => ({ id: f.id, label: f.label, photo: f.afterUrl })));
    return [...frames].sort((a, b) => (a.id === hero ? -1 : b.id === hero ? 1 : 0));
  }, [renderedAngles, generatedAngles, tc]);

  // Before / After Slider Drag Logic
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offset = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((offset / rect.width) * 100);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleSliderMove(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleSliderMove(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Downloads one image. Cross-origin URLs ignore <a download>, so fetch it as a blob first.
  const saveImage = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const blobUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleDownloadImage = () => void saveImage(afterUrl, `carvision-${currentId}.jpg`);

  const handleDownloadAll = async () => {
    for (const ang of renderedAngles) {
      await saveImage(generatedAngles[ang.id] as string, `carvision-${ang.id}.jpg`);
      await new Promise((r) => setTimeout(r, 350));
    }
  };

  // Primary Buy / Confirm Action
  const handlePrimaryBuy = async () => {
    vibrate(35);
    if (isSeller) {
      // Workshop tablet mode: the customer is in the bay, the sale is settled at the counter.
      setWorkshopConfirmed(true);
      return;
    }

    // B2C User mode: Add selected parts to cart and navigate to 3% address unlock checkout
    selectedParts.forEach((p) => add(p.id));
    router.push(`/${locale}/cart/checkout`);
  };

  const ghostBtn =
    'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40 cursor-pointer md:text-sm';

  return (
    <VeloceShell>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-3 md:px-8 lg:px-10 lg:pb-8">
        {/* Action bar: edit on the left, downloads + video on the right */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 lg:mb-6">
          <button type="button" onClick={() => router.push(`/${locale}/customize`)} className={`${ghostBtn} -ms-3`}>
            <ArrowLeft className="h-4 w-4 text-[#D4AE62] rtl:rotate-180" />
            <span>{t('editParts')}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={handleDownloadImage} disabled={!hasResults} className={ghostBtn}>
              <Download className="h-4 w-4 text-[#D4AE62]" />
              <span className="hidden sm:inline">{t('download')}</span>
            </button>
            {renderedAngles.length > 1 && (
              <button type="button" onClick={() => void handleDownloadAll()} className={ghostBtn}>
                <Download className="h-4 w-4 text-[#D4AE62]" />
                <span>{t('downloadAll', { count: renderedAngles.length })}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsVideoStudioOpen(true)}
              disabled={!hasResults}
              className="ms-1 inline-flex items-center gap-2.5 rounded-full bg-[#D4AE62] px-6 py-3 text-xs font-extrabold text-black shadow-[0_12px_32px_-8px_rgba(212,174,98,0.5)] transition hover:brightness-110 active:scale-95 disabled:opacity-40 cursor-pointer md:text-sm"
            >
              <Film className="h-4 w-4" />
              <span>{t('watchVideo')}</span>
            </button>
          </div>
        </div>

        {!hasResults && (
          <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center">
            <p className="text-lg font-semibold text-white">{t('emptyTitle')}</p>
            <p className="mt-2 max-w-md text-sm text-[#A69F92]">{t('emptyBody')}</p>
            <button type="button" onClick={() => router.push(`/${locale}/customize`)} className="mt-6 rounded-full bg-[#D4AE62] px-8 py-3.5 text-sm font-bold text-black cursor-pointer">
              {t('customize')}
            </button>
          </div>
        )}

        {hasResults && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-14">
            {/* BEFORE / AFTER viewer: fills the free height, sides sit on the image itself */}
            <div className="overflow-hidden rounded-[28px] bg-[#0B0D13] shadow-[0_32px_90px_-24px_rgba(0,0,0,0.85)]">
              <div
                ref={sliderContainerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative aspect-[4/3] w-full cursor-ew-resize touch-none select-none overflow-hidden sm:aspect-[16/10] lg:aspect-auto lg:h-[calc(100dvh-210px)] lg:min-h-[480px]"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={currentId}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <img
                      src={afterUrl}
                      alt={t('afterAlt')}
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      style={{
                        clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                        WebkitClipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                      }}
                    >
                      <img
                        src={beforeUrl}
                        alt={t('beforeAlt')}
                        draggable={false}
                        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Angle arrows */}
                {renderedAngles.length > 1 && (
                  <>
                    <button type="button" aria-label={t('prevAngle')} onPointerDown={(e) => e.stopPropagation()} onClick={() => goTo(-1)} className="absolute start-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 cursor-pointer">
                      <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                    </button>
                    <button type="button" aria-label={t('nextAngle')} onPointerDown={(e) => e.stopPropagation()} onClick={() => goTo(1)} className="absolute end-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 cursor-pointer">
                      <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                    </button>
                  </>
                )}

                {/* Before / after labels */}
                <div className="pointer-events-none absolute start-4 top-4 rounded-full bg-black/55 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] text-white/85 backdrop-blur-md">
                  {tf('rsBeforeBadge')}
                </div>
                <div className="pointer-events-none absolute end-4 top-4 rounded-full bg-[#D4AE62] px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.14em] text-black">
                  {tf('rsAfterBadge')}
                </div>

                {/* Slider handle */}
                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#D4AE62] shadow-[0_0_20px_rgba(212,174,98,0.9)]"
                  style={{ insetInlineStart: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute start-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#D4AE62] text-sm font-black text-black shadow-[0_0_28px_rgba(212,174,98,0.9)]">
                    ‹ ›
                  </div>
                </div>

                {/* Rendered sides: thumbnails float on the image */}
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-4 pt-12"
                >
                  <div className="flex min-w-0 items-center gap-2.5 overflow-x-auto [scrollbar-width:none]">
                    {renderedAngles.map((ang) => {
                      const active = currentId === ang.id;
                      return (
                        <button
                          key={ang.id}
                          type="button"
                          onClick={() => setActiveAngleId(ang.id)}
                          aria-label={tc(`angles.${ang.key}`)}
                          aria-current={active ? 'true' : undefined}
                          className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl transition cursor-pointer sm:h-16 sm:w-24 ${active ? 'ring-2 ring-[#D4AE62]' : 'opacity-65 hover:opacity-100'}`}
                        >
                          <img src={generatedAngles[ang.id]} alt="" className="h-full w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-[10px] font-semibold text-white">{tc(`anglesShort.${ang.key}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="hidden shrink-0 text-xs font-medium tabular-nums text-white/70 sm:block">{currentIndex + 1} / {renderedAngles.length}</span>
                </div>
              </div>
            </div>

            {/* PARTS + TOTAL + BUY: one open column, no boxes */}
            <aside className="flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100dvh-210px)] lg:min-h-[480px]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-[28px]">{t('selectedTitle')}</h2>
                  <p className="mt-1.5 text-sm text-[#A69F92]">{t('selectedSub')}</p>
                </div>
                <button type="button" onClick={() => router.push(`/${locale}/customize`)} className="-me-2 inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold text-[#D4AE62] transition hover:bg-white/[0.07] cursor-pointer">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>{t('changeParts')}</span>
                </button>
              </div>

              <div className="mt-6 flex-1 space-y-2 overflow-y-auto pe-1 [scrollbar-width:none]">
                {selectedParts.map((part) => {
                  const priceUSD = getUSDPrice(part.price);
                  const carFit = part.targetCar || part.compatibility?.[0]?.name || tc('fitFallback');
                  return (
                    <div key={part.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.035] p-3 transition hover:bg-white/[0.06]">
                      <div className="flex min-w-0 items-center gap-4">
                        {part.swatch ? (
                          <div className="h-16 w-20 shrink-0 rounded-xl" style={{ background: part.swatch }} />
                        ) : (
                          <img src={part.image} alt={part.name} className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate text-[15px] font-bold text-white">{part.name}</h3>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[#A69F92]">
                            <Car className="h-3.5 w-3.5 shrink-0 text-[#D4AE62]" />
                            <span className="truncate">{carFit}</span>
                          </div>
                        </div>
                      </div>
                      <p className="shrink-0 text-base font-extrabold tabular-nums text-[#D4AE62]">{formatPrice(priceUSD)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Total + primary action */}
              {workshopConfirmed ? (
                <div className="mt-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
                  <h3 className="text-xl font-bold text-white">{t('confirmedTitle')}</h3>
                  <p className="mt-1 text-sm text-white/75">{t('confirmedBody', { count: selectedParts.length })}</p>
                  <div className="mt-5 flex justify-center gap-2">
                    <button type="button" onClick={() => setIsVideoStudioOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#D4AE62] px-6 py-3 text-xs font-extrabold text-black cursor-pointer">
                      <Film className="h-4 w-4" />
                      <span>{t('viewVideo')}</span>
                    </button>
                    <button type="button" onClick={() => router.push(`/${locale}/customize`)} className={ghostBtn}>
                      <span>{t('editAgain')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[#A69F92]">{t('totalLabel', { count: selectedParts.length })}</p>
                      <p className="mt-1.5 text-4xl font-extrabold tabular-nums tracking-tight text-white md:text-5xl">{formatPrice(totalPriceUSD)}</p>
                    </div>
                  </div>
                  {!isSeller && <p className="mt-2 text-xs font-semibold text-[#D4AE62]">{t('unlockHint', { amount: formatPrice(deposit3PercentUSD) })}</p>}

                  <button
                    type="button"
                    onClick={handlePrimaryBuy}
                    className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-[#D4AE62] px-8 py-4 text-sm font-extrabold text-black shadow-[0_16px_40px_-10px_rgba(212,174,98,0.55)] transition hover:brightness-110 active:scale-[0.98] cursor-pointer md:text-base"
                  >
                    {isSeller ? (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>{t('confirmOrder')}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-5 w-5" />
                        <span>{t('buy', { amount: formatPrice(deposit3PercentUSD) })}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      {/* AI Cinematic Video Studio Modal */}
      <CinematicVideoStudio
        isOpen={isVideoStudioOpen}
        onClose={() => setIsVideoStudioOpen(false)}
        angles={studioAngles}
        selectedParts={selectedParts}
      />
    </VeloceShell>
  );
}
