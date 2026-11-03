'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Sparkles,
  Check,
  Car,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { useVeloceStore } from '@/context/VeloceStore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useMyCar } from '@/features/shop/useMyCar';
import { useCurrency } from '@/context/CurrencyContext';
import { type VeloceProduct } from '@/domain/veloce-catalog';
import { playShutter, playLock, vibrate } from '@/features/camera/lib/fx';

export const FIVE_CAR_ANGLES = [
  { id: 'front', label: 'Oldi tomon', short: 'Oldi' },
  { id: 'rear', label: 'Orqa tomon', short: 'Orqa' },
  { id: 'right', label: 'O‘ng tomon', short: 'O‘ng' },
  { id: 'front-left', label: 'Oldi-chap tomon', short: 'Oldi-Chap' },
  { id: 'rear-right', label: 'Orqa-o‘ng tomon', short: 'Orqa-O‘ng' },
] as const;

const CATEGORIES = [
  { id: 'All', label: 'Barcha detallar' },
  { id: 'Wheels', label: 'Disklar (Wheels)' },
  { id: 'Body Kit', label: 'Bamper va Obves' },
  { id: 'Performance', label: 'Fara va Chiroqlar' },
  { id: 'Interior', label: 'Salon va Rul' },
  { id: 'Color', label: 'Kuzov Rangi' },
];

import { composeCarAnglePhotorealistic } from '@/lib/automotive-compositor';

const getUSDPrice = (raw?: number) => {
  const num = Number(raw) || 850;
  return num > 50000 ? Math.max(1, Math.round(num / 13000)) : num;
};

export function VeloceCustomize() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const requestedPartId = searchParams ? searchParams.get('partId') : null;
  const locale = (params?.['locale'] as string) || 'uz';

  const {
    photo,
    setPhoto,
    selectedPartIds,
    setSelectedPartIds,
    toggleSelectedPart,
    multiAngles,
    setGeneratedAngles,
    openCamera,
  } = useVeloceStore();
  const { user, refreshProfile } = useAuth();
  const { filterQuery } = useMyCar();
  const { formatPrice } = useCurrency();

  const isSeller = user?.role === 'b2b_seller';

  const [activeCategory, setActiveCategory] = React.useState('All');
  const [activeAngleId, setActiveAngleId] = React.useState<string>('front-left');
  const [catalogProducts, setCatalogProducts] = React.useState<VeloceProduct[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = React.useState(true);
  const [isApplying, setIsApplying] = React.useState(false);
  const [applyStepText, setApplyStepText] = React.useState('');
  const [applyError, setApplyError] = React.useState<string | null>(null);

  // Filmstrip horizontal drag / scroll state
  const filmstripRef = React.useRef<HTMLDivElement | null>(null);
  const isDraggingStrip = React.useRef(false);
  const dragStartX = React.useRef(0);
  const scrollStartLeft = React.useRef(0);

  // Load catalog products
  React.useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        const endpoint = isSeller ? '/api/v1/seller/inventory' : `/api/v1/products?limit=120${filterQuery ? `&${filterQuery}` : ''}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.products) && data.products.length > 0) {
          setCatalogProducts(data.products);
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
  }, [isSeller, filterQuery]);

  // Pre-select requestedPartId if passed in URL and not yet selected
  React.useEffect(() => {
    if (requestedPartId && catalogProducts.length > 0) {
      const exists = catalogProducts.some((p) => p.id === requestedPartId);
      if (exists && !selectedPartIds.includes(requestedPartId)) {
        setSelectedPartIds([...selectedPartIds, requestedPartId]);
      }
    }
  }, [requestedPartId, catalogProducts, selectedPartIds, setSelectedPartIds]);

  // Filter products for the filmstrip carousel
  const filteredProducts = React.useMemo(() => {
    if (catalogProducts.length === 0) return [];
    if (activeCategory === 'All') return catalogProducts;

    const categoryKeywords: Record<string, string[]> = {
      Wheels: ['wheel', 'disk', 'gildirak', 'rim', 'r15', 'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'forged', 'alloy'],
      'Body Kit': ['bamper', 'lip', 'splitter', 'diffuzor', 'skirt', 'spoyler', 'wing', 'widebody', 'panjara', 'rishotka', 'grille', 'hood', 'body'],
      Interior: ['salon', 'rul', "o'rindiq", 'seat', 'ambient', 'torpeda', 'panel', 'interior'],
      Performance: ['fara', 'chiroq', 'lighting', 'glushitel', 'exhaust', 'intake', 'tormoz', 'stage', 'chip'],
      Color: ['wrap', 'rang', 'paint', 'black', 'gold', 'grey', 'green', 'red', 'blue', 'white'],
    };

    const keywords = categoryKeywords[activeCategory] || [activeCategory.toLowerCase()];
    const matched = catalogProducts.filter((p) => {
      const combined = `${p.category || ''} ${p.name || ''} ${p.spec || ''}`.toLowerCase();
      return keywords.some((kw) => combined.includes(kw));
    });

    return matched.length > 0 ? matched : catalogProducts;
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
    multiAngles[activeAngleId] || photo || '/assets/hero-car-1-Bi4wq3bK.jpg';

  const capturedAnglesCount = React.useMemo(() => {
    const keys = Object.keys(multiAngles);
    if (keys.length > 0) return keys.length;
    return photo ? 1 : 0;
  }, [multiAngles, photo]);

  // Smooth scroll filmstrip left/right
  const scrollFilmstrip = (direction: 'prev' | 'next') => {
    const el = filmstripRef.current;
    if (!el) return;
    const step = 300;
    el.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    });
  };

  // Mouse drag handlers for smooth ribbon dragging on desktop/tablet
  const handleStripMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = filmstripRef.current;
    if (!el) return;
    isDraggingStrip.current = true;
    dragStartX.current = e.pageX - el.offsetLeft;
    scrollStartLeft.current = el.scrollLeft;
  };

  const handleStripMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingStrip.current) return;
    const el = filmstripRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartX.current) * 1.4;
    el.scrollLeft = scrollStartLeft.current - walk;
  };

  const handleStripMouseUp = () => {
    isDraggingStrip.current = false;
  };

  // Apply Changes -> Generate all 5 angles & navigate to dedicated /customize/result page
  const handleApplyChanges = async () => {
    if (isApplying) return;

    // Ensure at least 1 part is selected
    let partsToApply = selectedProducts;
    if (partsToApply.length === 0 && filteredProducts[0]) {
      partsToApply = [filteredProducts[0]];
      setSelectedPartIds([filteredProducts[0].id]);
    }
    if (partsToApply.length === 0) return;

    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }
    setApplyError(null);

    const basePhoto = photo || '/assets/hero-car-1-Bi4wq3bK.jpg';
    if (!photo) {
      setPhoto(basePhoto);
    }

    playShutter();
    vibrate(40);
    setIsApplying(true);
    setApplyStepText('1/3 · 5 ta rakurs bo‘yicha avtomobil geometriyasi tekshirilmoqda...');

    try {
      const primaryPart = partsToApply[0]!;
      const normalizedUSD = getUSDPrice(primaryPart.price);

      // Call AI generation API for primary angle
      setTimeout(() => {
        setApplyStepText(
          `2/3 · Tanlangan ${partsToApply.length} ta detal 100% aniqlikda mashinaga joylashtirilmoqda...`
        );
      }, 450);

      let apiAfterUrl: string | null = null;
      let isLiveAi = false;
      try {
        const res = await fetch('/api/v1/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: multiAngles[activeAngleId] || basePhoto,
            angleId: activeAngleId,
            partId: primaryPart.id,
            partName: partsToApply.map((p) => p.name).join(' + '),
            partCategory: primaryPart.category || 'Wheels',
            partSpec: primaryPart.spec || '',
            partImage: primaryPart.image,
            partAngleImage: primaryPart.angleImage,
            partPrice: normalizedUSD,
            swatchColor: primaryPart.swatch || undefined,
            parts: partsToApply.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category || 'Wheels',
              spec: p.spec || '',
              image: p.image,
              angleImage: p.angleImage,
              swatch: p.swatch,
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.push(`/${locale}/login`);
          return;
        }
        if (!res.ok || !data.success) {
          // Real failure (no credits, provider error, ...): show it, never fake a result.
          setApplyError(data.error || "Rasm yaratib bo'lmadi. Qayta urinib ko'ring");
          void refreshProfile();
          return;
        }
        if (data.generation?.afterImageUrl) {
          apiAfterUrl = data.generation.afterImageUrl;
          isLiveAi = Boolean(data.generation.liveApiActive);
        }
        void refreshProfile();
      } catch {
        setApplyError("Tarmoq xatosi. Internetni tekshirib qayta urinib ko'ring");
        return;
      }

      setApplyStepText('3/3 · Natija sahifasi tayyorlanmoqda...');

      // Generate After images for all 5 angles
      const generatedMap: Record<string, string> = {};
      for (const angle of FIVE_CAR_ANGLES) {
        const angleBefore = multiAngles[angle.id] || basePhoto;
        const useAiDirect =
          apiAfterUrl &&
          angle.id === activeAngleId &&
          (isLiveAi || (!angleBefore.startsWith('data:') && !angleBefore.startsWith('blob:')));

        generatedMap[angle.id] = await composeCarAnglePhotorealistic({
          baseCarSrc: angleBefore,
          aiGeneratedUrl: useAiDirect ? apiAfterUrl : null,
          parts: partsToApply,
          angleId: angle.id,
        });
      }

      setGeneratedAngles(generatedMap);
      playLock();
      vibrate(50);
      router.push(`/${locale}/customize/result`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-32 md:px-8">
      {/* Top Minimal Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={isSeller ? `/${locale}/seller/dashboard` : `/${locale}/shop`}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.1] hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Orqaga</span>
        </Link>

        <div className="text-center">
          <h1 className="text-base md:text-lg font-bold tracking-wide text-white">
            {isSeller ? 'Planshet Tuning Studiyasi' : 'Avtomobil Tuning Studiyasi'}
          </h1>
          <p className="text-xs text-[#A69F92]">
            Yoqqan detallarni lentadan surib tanlang va natijani ko‘ring
          </p>
        </div>

        <button
          onClick={openCamera}
          className="inline-flex items-center gap-2 rounded-full bg-[#D4AE62]/15 px-4 py-2 text-xs font-bold text-[#D4AE62] hover:bg-[#D4AE62]/25 transition cursor-pointer"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">5 Rakursda Rasmga Olish</span>
          <span className="sm:hidden">{capturedAnglesCount}/5</span>
        </button>
      </div>

      {/* 1. CAR 5-ANGLE VIEWPORT (Boxless, Deep Shadow) */}
      <div className="relative overflow-hidden rounded-[32px] bg-[#0B0D13] shadow-[0_28px_80px_rgba(0,0,0,0.75)]">
        <div className="relative aspect-[16/9] max-h-[460px] w-full overflow-hidden">
          <img
            src={currentAnglePhoto}
            alt="Mijoz avtomobili"
            className="h-full w-full object-cover transition-all duration-300"
          />

          {/* Subtle gradient at bottom for angle pills */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07080C] via-[#07080C]/50 to-transparent" />

          {/* Top-Start Selected Parts Counter Pill */}
          <div className="absolute start-4 top-4 flex items-center gap-2 rounded-full bg-[#090A0F]/85 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#D4AE62]" />
            <span>
              {selectedProducts.length > 0
                ? `${selectedProducts.length} ta detal tanlandi`
                : 'Lentadan detal tanlang'}
            </span>
          </div>

          {/* 5-Angle Selector Pills inside Viewport Bottom */}
          <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-full bg-[#090A0F]/85 p-1.5 backdrop-blur-md [scrollbar-width:none]">
              {FIVE_CAR_ANGLES.map((ang) => {
                const isActive = activeAngleId === ang.id;
                const hasCaptured = Boolean(multiAngles[ang.id]);
                return (
                  <button
                    key={ang.id}
                    type="button"
                    onClick={() => setActiveAngleId(ang.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? 'bg-[#D4AE62] text-black shadow-md'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    <span>{ang.short}</span>
                    {hasCaptured && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isActive ? 'bg-black' : 'bg-emerald-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={openCamera}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
            >
              Rasmni yangilash
            </button>
          </div>
        </div>

        {/* AI Applying Full Overlay */}
        {isApplying && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#07080C]/92 p-6 text-center backdrop-blur-xl">
            <Sparkles className="h-12 w-12 text-[#D4AE62] animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white">{applyStepText}</h3>
            <p className="mt-1.5 text-xs text-[#A69F92]">
              Tanlangan detallar barcha mayda qismlarigacha 100% bir xil o‘rnatilmoqda
            </p>
          </div>
        )}
      </div>

      {applyError && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <span>{applyError}</span>
          <button type="button" onClick={() => setApplyError(null)} className="shrink-0 text-xs font-semibold text-red-100/80 hover:text-white">
            Yopish
          </button>
        </div>
      )}

      {/* 2. CATEGORY FILTER PILLS */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'bg-[#D4AE62] text-black shadow-[0_8px_24px_rgba(212,174,98,0.28)]'
                    : 'bg-[#12151E] text-white/75 hover:bg-[#181C28] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Left / Right Ribbon Glide Arrows */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollFilmstrip('prev')}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#12151E] text-white/80 hover:bg-[#1A1E2B] hover:text-white transition cursor-pointer"
            aria-label="Chapga surish"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollFilmstrip('next')}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#12151E] text-white/80 hover:bg-[#1A1E2B] hover:text-white transition cursor-pointer"
            aria-label="O‘ngga surish"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 3. CONTINUOUS HORIZONTAL FILMSTRIP RIBBON (Lenta) */}
      <div className="mt-4">
        {isLoadingCatalog ? (
          <div className="flex gap-4 overflow-hidden py-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-64 w-60 shrink-0 animate-pulse rounded-[28px] bg-[#12151E]"
              />
            ))}
          </div>
        ) : (
          <div
            ref={filmstripRef}
            onMouseDown={handleStripMouseDown}
            onMouseMove={handleStripMouseMove}
            onMouseUp={handleStripMouseUp}
            onMouseLeave={handleStripMouseUp}
            className="flex gap-4 overflow-x-auto py-3 snap-x snap-mandatory scroll-smooth select-none cursor-grab active:cursor-grabbing [scrollbar-width:none]"
          >
            {filteredProducts.map((part) => {
              const isSelected = selectedPartIds.includes(part.id);
              const usdPrice = getUSDPrice(part.price);
              const carFit = part.targetCar || part.compatibility?.[0]?.name || 'Maxsus model';

              return (
                <div
                  key={part.id}
                  onClick={() => {
                    toggleSelectedPart(part.id);
                    vibrate(20);
                  }}
                  className={`snap-center shrink-0 w-64 rounded-[28px] p-3.5 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1A1E2B] shadow-[0_20px_50px_rgba(212,174,98,0.22)] scale-[1.02]'
                      : 'bg-[#11141D] hover:bg-[#161A26] opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Part Photo */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#090B10]">
                    {part.swatch ? (
                      <div className="h-full w-full" style={{ background: part.swatch }} />
                    ) : (
                      <img
                        src={part.image}
                        alt={part.name}
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    )}

                    {/* Selected Check Badge */}
                    <div
                      className={`absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full transition ${
                        isSelected
                          ? 'bg-[#D4AE62] text-black shadow-lg scale-105'
                          : 'bg-black/60 text-white/70 backdrop-blur-md'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </div>

                    {/* 1-Car Compatibility Pill */}
                    <div className="absolute start-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                      <Car className="h-3 w-3 text-[#D4AE62]" />
                      <span className="truncate max-w-[140px]">{carFit}</span>
                    </div>
                  </div>

                  {/* Part Name & Price */}
                  <div className="mt-3 px-1">
                    <h3 className="truncate text-sm font-bold text-white">{part.name}</h3>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-[#D4AE62] tabular-nums">
                        {formatPrice(usdPrice)}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-emerald-400' : 'text-[#A69F92]'
                        }`}
                      >
                        {isSelected ? 'Tanlandi' : 'Tanlash'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. STICKY BOTTOM "APPLY CHANGES" BAR */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#07080C] via-[#07080C]/95 to-transparent pb-5 pt-4 px-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-[28px] bg-[#12151F] p-3.5 ps-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
          <div>
            <p className="text-xs text-[#A69F92]">
              {selectedProducts.length > 0
                ? `${selectedProducts.length} ta detal tanlandi`
                : 'Detallarni tanlang'}
            </p>
            <p className="text-base md:text-lg font-extrabold text-white tabular-nums">
              {selectedProducts.length > 0
                ? `Jami: ${formatPrice(totalSelectedUSD)}`
                : 'Lentadan yoqqan jihozlarni bosing'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleApplyChanges}
            disabled={isApplying}
            className="inline-flex items-center gap-2.5 rounded-2xl bg-[#D4AE62] px-7 py-4 text-sm font-extrabold uppercase tracking-wider text-black shadow-[0_12px_32px_rgba(212,174,98,0.35)] hover:brightness-110 active:scale-95 disabled:opacity-50 transition cursor-pointer"
          >
            <Layers className="h-4 w-4" />
            <span>Apply Changes (Natijani Ko‘rish)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
