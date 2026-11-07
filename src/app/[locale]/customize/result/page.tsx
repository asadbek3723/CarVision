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
  const t = useTranslations('flow');
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
        const endpoint = isSeller ? '/api/v1/seller/inventory' : '/api/v1/products';
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
  }, [isSeller, user?.plan?.isPaid]);

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
      label: t(ang.label),
      beforeUrl: multiAngles[ang.id] || photo || '',
      afterUrl: generatedAngles[ang.id] as string,
    }));
    // The reel opens on the best 3/4 view
    const hero = heroAngleId(frames.map((f) => ({ id: f.id, label: f.label, photo: f.afterUrl })));
    return [...frames].sort((a, b) => (a.id === hero ? -1 : b.id === hero ? 1 : 0));
  }, [renderedAngles, multiAngles, photo, generatedAngles, t]);

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

  return (
    <VeloceShell>
      <div className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:px-8">
        {/* Top Action Bar: "O‘zgartirish" (Back with preserved selections) & "Video sifatida ko‘rish" */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/customize`)}
            className="inline-flex items-center gap-2.5 rounded-full bg-[#141822] px-5 py-3 text-xs md:text-sm font-bold text-white shadow-lg hover:bg-[#1C2130] transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-[#D4AE62]" />
            <span>{t('rsChange')}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={!hasResults}
              className="inline-flex items-center gap-2 rounded-full bg-[#141822] px-4 py-3 text-xs md:text-sm font-semibold text-white hover:bg-[#1C2130] transition cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#D4AE62]" />
              <span className="hidden sm:inline">{t('rsDownload')}</span>
            </button>

            {renderedAngles.length > 1 && (
              <button
                type="button"
                onClick={() => void handleDownloadAll()}
                className="inline-flex items-center gap-2 rounded-full bg-[#141822] px-4 py-3 text-xs md:text-sm font-semibold text-white hover:bg-[#1C2130] transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#D4AE62]" />
                <span>Hammasi ({renderedAngles.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsVideoStudioOpen(true)}
              disabled={!hasResults}
              className="inline-flex items-center gap-2.5 rounded-full bg-[#D4AE62] px-6 py-3 text-xs md:text-sm font-extrabold text-black shadow-[0_12px_32px_rgba(212,174,98,0.35)] hover:brightness-110 active:scale-95 disabled:opacity-40 transition cursor-pointer"
            >
              <Film className="h-4 w-4" />
              <span>{t('rsVideo')}</span>
            </button>
          </div>
        </div>

        {!hasResults && (
          <div className="rounded-[32px] bg-[#0B0D13] p-10 text-center">
            <p className="text-base font-semibold text-white">{t('rsNone')}</p>
            <p className="mt-2 text-sm text-[#A69F92]">{t('rsNoneHint')}</p>
            <button type="button" onClick={() => router.push(`/${locale}/customize`)} className="mt-6 rounded-full bg-[#D4AE62] px-8 py-3.5 text-sm font-bold text-black">
              {t('rsSetup')}
            </button>
          </div>
        )}

        {/* 1. BEFORE / AFTER INTERACTIVE COMPARISON VIEWPORT */}
        {hasResults && (
        <div className="overflow-hidden rounded-[32px] bg-[#0B0D13] shadow-[0_32px_90px_rgba(0,0,0,0.8)]">
          <div
            ref={sliderContainerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative aspect-[16/9] max-h-[520px] w-full select-none overflow-hidden cursor-ew-resize touch-none"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={currentId}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
            {/* AFTER (Tuned) Base Layer */}
            <img
              src={afterUrl}
              alt={t('rsAfterAlt')}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
            />

            {/* BEFORE (Stock) Clipped Layer */}
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                WebkitClipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
              }}
            >
              <img
                src={beforeUrl}
                alt={t('rsBeforeAlt')}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
              />
            </div>
              </motion.div>
            </AnimatePresence>

            {/* Angle arrows */}
            {renderedAngles.length > 1 && (
              <>
                <button type="button" aria-label={t('rsPrevAngle')} onPointerDown={(e) => e.stopPropagation()} onClick={() => goTo(-1)} className="absolute start-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80">
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </button>
                <button type="button" aria-label={t('rsNextAngle')} onPointerDown={(e) => e.stopPropagation()} onClick={() => goTo(1)} className="absolute end-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80">
                  <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                </button>
              </>
            )}

            {/* Top Labels */}
            <div className="pointer-events-none absolute start-4 top-4 rounded-full bg-black/75 px-4 py-1.5 text-xs font-bold tracking-wider text-white/85 backdrop-blur-md">
              {t('rsBeforeBadge')}
            </div>
            <div className="pointer-events-none absolute end-4 top-4 rounded-full bg-[#D4AE62] px-4 py-1.5 text-xs font-extrabold tracking-wider text-black shadow-lg">
              {t('rsAfterBadge')}
            </div>

            {/* Slider Handle Line */}
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#D4AE62] shadow-[0_0_20px_rgba(212,174,98,0.9)]"
              style={{
                insetInlineStart: `${sliderPos}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="absolute top-1/2 start-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#D4AE62] text-sm font-black text-black shadow-[0_0_28px_rgba(212,174,98,0.9)]">
                ‹ ›
              </div>
            </div>
          </div>

          {/* Rendered sides as thumbnails */}
          <div className="flex items-center justify-between gap-3 bg-[#0E1119] px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5 overflow-x-auto [scrollbar-width:none]">
              {renderedAngles.map((ang) => {
                const active = currentId === ang.id;
                return (
                  <button
                    key={ang.id}
                    type="button"
                    onClick={() => setActiveAngleId(ang.id)}
                    aria-label={t(ang.label)}
                    aria-current={active ? 'true' : undefined}
                    className={`group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl transition ${active ? 'ring-2 ring-[#D4AE62]' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <img src={generatedAngles[ang.id]} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[10px] font-semibold text-white">{t(ang.short)}</span>
                  </button>
                );
              })}
            </div>
            <span className="hidden shrink-0 text-xs text-[#A69F92] sm:block">{currentIndex + 1} / {renderedAngles.length}</span>
          </div>
        </div>
        )}

        {/* 2. SELECTED PARTS LIST & PRICES + BUY BUTTON */}
        <div className="mt-8 rounded-[32px] bg-[#10131C] p-6 md:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white">
                {t('rsSelected')}
              </h2>
              <p className="mt-1 text-xs md:text-sm text-[#A69F92]">
                {t('rsSelectedHint')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/${locale}/customize`)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-[#D4AE62] hover:bg-white/[0.12] transition cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{t('rsEditParts')}</span>
            </button>
          </div>

          {/* Parts Rows */}
          <div className="space-y-3">
            {selectedParts.map((part) => {
              const priceUSD = getUSDPrice(part.price);
              const carFit = part.targetCar || part.compatibility?.[0]?.name || 'Maxsus model';
              return (
                <div
                  key={part.id}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-[#161A26] p-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {part.swatch ? (
                      <div
                        className="h-16 w-20 shrink-0 rounded-xl"
                        style={{ background: part.swatch }}
                      />
                    ) : (
                      <img
                        src={part.image}
                        alt={part.name}
                        className="h-16 w-20 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-white">
                        {part.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#A69F92]">
                        <Car className="h-3.5 w-3.5 text-[#D4AE62]" />
                        <span>{carFit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <p className="text-base md:text-lg font-extrabold text-[#D4AE62] tabular-nums">
                      {formatPrice(priceUSD)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Price & Primary Purchase Button */}
          {workshopConfirmed ? (
            <div className="mt-8 rounded-2xl bg-emerald-500/15 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
              <h3 className="text-xl font-bold text-white">
                {t('rsOrderTitle')}
              </h3>
              <p className="mt-1 text-sm text-white/80">
                {t('rsOrderText', { n: selectedParts.length })}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsVideoStudioOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AE62] px-6 py-3 text-xs font-extrabold text-black cursor-pointer"
                >
                  <Film className="h-4 w-4" />
                  <span>{t('rsVideoEdit')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/customize`)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-xs font-bold text-white cursor-pointer"
                >
                  <span>{t('rsChangeAgain')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl bg-[#161A26] p-5 md:p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#A69F92]">
                  {t('rsTotal', { n: selectedParts.length })}
                </p>
                <p className="mt-1 text-2xl md:text-3xl font-extrabold text-white tabular-nums">
                  {formatPrice(totalPriceUSD)}
                </p>
                {!isSeller && (
                  <p className="mt-1 text-xs font-semibold text-[#D4AE62]">
                    {t('rsDeposit', { amount: formatPrice(deposit3PercentUSD) })}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handlePrimaryBuy}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#D4AE62] px-8 py-4 text-sm md:text-base font-extrabold text-black shadow-[0_14px_38px_rgba(212,174,98,0.38)] hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                {isSeller ? (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Buyurtmani Tasdiqlash</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    <span>{t('rsBuy', { amount: formatPrice(deposit3PercentUSD) })}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
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
