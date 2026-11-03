'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Film,
  Download,
  CheckCircle2,
  SlidersHorizontal,
  ShoppingBag,
  Car,
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

const getUSDPrice = (raw?: number) => {
  const num = Number(raw) || 850;
  return num > 50000 ? Math.max(1, Math.round(num / 13000)) : num;
};

export default function CustomizeResultPage() {
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
        const endpoint = isSeller && user?.plan?.isPaid ? '/api/v1/seller/inventory' : '/api/v1/products';
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

  const basePhoto = photo || '/assets/hero-car-1-Bi4wq3bK.jpg';
  const beforeUrl = multiAngles[activeAngleId] || basePhoto;
  const afterUrl =
    generatedAngles[activeAngleId] ||
    generatedAngles['front-left'] ||
    '/images/studio/studio_coupe_tuned.jpg';

  // Build 5-angle array for CinematicVideoStudio
  const studioAngles: CinematicAngleFrame[] = React.useMemo(
    () =>
      FIVE_CAR_ANGLES.map((ang) => ({
        id: ang.id,
        label: ang.label,
        beforeUrl: multiAngles[ang.id] || basePhoto,
        afterUrl:
          generatedAngles[ang.id] ||
          generatedAngles['front-left'] ||
          afterUrl,
      })),
    [multiAngles, basePhoto, generatedAngles, afterUrl]
  );

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

  // Download current 4K tuned image
  const handleDownloadImage = () => {
    const a = document.createElement('a');
    a.href = afterUrl;
    a.download = `carvision-result-${activeAngleId}-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
            <span>O‘zgartirish (Boshqa detallarni sinash)</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-2 rounded-full bg-[#141822] px-4 py-3 text-xs md:text-sm font-semibold text-white hover:bg-[#1C2130] transition cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#D4AE62]" />
              <span className="hidden sm:inline">Rasmni yuklash</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVideoStudioOpen(true)}
              className="inline-flex items-center gap-2.5 rounded-full bg-[#D4AE62] px-6 py-3 text-xs md:text-sm font-extrabold text-black shadow-[0_12px_32px_rgba(212,174,98,0.35)] hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <Film className="h-4 w-4" />
              <span>Video sifatida ko‘rish</span>
            </button>
          </div>
        </div>

        {/* 1. BEFORE / AFTER INTERACTIVE COMPARISON VIEWPORT */}
        <div className="overflow-hidden rounded-[32px] bg-[#0B0D13] shadow-[0_32px_90px_rgba(0,0,0,0.8)]">
          <div
            ref={sliderContainerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative aspect-[16/9] max-h-[520px] w-full select-none overflow-hidden cursor-ew-resize touch-none"
          >
            {/* AFTER (Tuned) Base Layer */}
            <img
              src={afterUrl}
              alt="Keyingi holat (Tuning)"
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
                alt="Oldingi holat (Zavod)"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
              />
            </div>

            {/* Top Labels */}
            <div className="pointer-events-none absolute start-4 top-4 rounded-full bg-black/75 px-4 py-1.5 text-xs font-bold tracking-wider text-white/85 backdrop-blur-md">
              OLDIN (ZAVOD)
            </div>
            <div className="pointer-events-none absolute end-4 top-4 rounded-full bg-[#D4AE62] px-4 py-1.5 text-xs font-extrabold tracking-wider text-black shadow-lg">
              KEYIN (TUNING)
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

          {/* 5-Angle Switcher Bar Below Image */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1119] px-5 py-3.5">
            <span className="text-xs font-semibold text-[#A69F92]">
              5 ta burchakdan ko‘rish:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {FIVE_CAR_ANGLES.map((ang) => {
                const active = activeAngleId === ang.id;
                return (
                  <button
                    key={ang.id}
                    type="button"
                    onClick={() => setActiveAngleId(ang.id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                      active
                        ? 'bg-[#D4AE62] text-black shadow-md'
                        : 'bg-white/[0.05] text-white/75 hover:bg-white/[0.1] hover:text-white'
                    }`}
                  >
                    {ang.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. SELECTED PARTS LIST & PRICES + BUY BUTTON */}
        <div className="mt-8 rounded-[32px] bg-[#10131C] p-6 md:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white">
                Tanlangan detallar
              </h2>
              <p className="mt-1 text-xs md:text-sm text-[#A69F92]">
                Avtomobilingizga o‘rnatilgan jihozlar va ularning narxi
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/${locale}/customize`)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-2.5 text-xs font-bold text-[#D4AE62] hover:bg-white/[0.12] transition cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Detallarni o‘zgartirish</span>
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
                Buyurtma Ustaxonaga Tasdiqlandi!
              </h3>
              <p className="mt-1 text-sm text-white/80">
                Tanlangan {selectedParts.length} ta detal ustaxona ish ro‘yxatiga biriktirildi.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsVideoStudioOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AE62] px-6 py-3 text-xs font-extrabold text-black cursor-pointer"
                >
                  <Film className="h-4 w-4" />
                  <span>Video Editni Ko‘rish</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/customize`)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-xs font-bold text-white cursor-pointer"
                >
                  <span>Yana o‘zgartirish</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl bg-[#161A26] p-5 md:p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#A69F92]">
                  Jami hisob ({selectedParts.length} ta detal)
                </p>
                <p className="mt-1 text-2xl md:text-3xl font-extrabold text-white tabular-nums">
                  {formatPrice(totalPriceUSD)}
                </p>
                {!isSeller && (
                  <p className="mt-1 text-xs font-semibold text-[#D4AE62]">
                    3% Zakalat ({formatPrice(deposit3PercentUSD)}) to‘lab ustaxona manzili va telefonini ochasiz
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
                    <span>Sotib olish ({formatPrice(deposit3PercentUSD)} Zakalat)</span>
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
