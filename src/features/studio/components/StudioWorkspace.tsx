'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { BeforeAfterSlider } from '@/components/ui/BeforeAfterSlider';
import { playShutter, playLock, vibrate, unlockAudio } from '@/features/camera/lib/fx';
import { cn } from '@/lib/utils';

export type StudioCategory = 'WHEELS' | 'BODY KIT' | 'SUSPENSION' | 'COLOR';

export interface StudioPart {
  id: string;
  name: string;
  subtitle: string;
  spec: string;
  image: string;
  tunedCarImage?: string;
  category: StudioCategory;
}

const STUDIO_CATALOG: Record<StudioCategory, StudioPart[]> = {
  WHEELS: [
    {
      id: 'wheel-vz01',
      name: 'VZ-01',
      subtitle: 'Forged Lightweight',
      spec: '20"',
      image: '/images/studio/wheel_vz01.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'WHEELS',
    },
    {
      id: 'wheel-bbs',
      name: 'BBS CI-R',
      subtitle: 'Flow Formed Platinum',
      spec: '20"',
      image: '/images/studio/wheel_bbs.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'WHEELS',
    },
    {
      id: 'wheel-sport',
      name: 'HF-5',
      subtitle: 'Hybrid Forged Concave',
      spec: '20"',
      image: '/images/studio/wheel_sport.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'WHEELS',
    },
    {
      id: 'wheel-vs5rs',
      name: 'Apex VS-5RS',
      subtitle: 'Motorsport Lightweight',
      spec: '19"',
      image: '/images/studio/wheel_bbs.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'WHEELS',
    },
  ],
  'BODY KIT': [
    {
      id: 'body-carbon-lip',
      name: 'Carbon Front Lip',
      subtitle: 'Dry Pre-preg Carbon',
      spec: 'Aero Stage 1',
      image: '/images/garage/carbon_lip.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'BODY KIT',
    },
    {
      id: 'body-diffuser',
      name: 'Quad Rear Diffuser',
      subtitle: 'Track Aerodynamics',
      spec: 'Dual Exhaust Cutout',
      image: '/images/garage/carbon_lip.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'BODY KIT',
    },
    {
      id: 'body-skirts',
      name: 'Carbon Skirt Blades',
      subtitle: 'M Performance Aero',
      spec: 'Low Profile Extension',
      image: '/images/garage/carbon_lip.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'BODY KIT',
    },
    {
      id: 'body-spoiler',
      name: 'CS Carbon Wing',
      subtitle: 'High-Kick Decklid',
      spec: '2x2 Carbon Weave',
      image: '/images/garage/carbon_lip.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'BODY KIT',
    },
  ],
  SUSPENSION: [
    {
      id: 'susp-kw3',
      name: 'KW Variant 3',
      subtitle: 'Inox-line Coilovers',
      spec: '-35mm Track Stance',
      image: '/images/garage/kw_suspension.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'SUSPENSION',
    },
    {
      id: 'susp-hr',
      name: 'H&R Sport Springs',
      subtitle: 'Progressive Rate Lowering',
      spec: '-25mm Flush Fitment',
      image: '/images/garage/kw_suspension.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'SUSPENSION',
    },
    {
      id: 'susp-airlift',
      name: 'Air Lift Performance',
      subtitle: '3H Digital Pneuma Suspension',
      spec: 'Adjustable Presets',
      image: '/images/garage/kw_suspension.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'SUSPENSION',
    },
  ],
  COLOR: [
    {
      id: 'color-satin-black',
      name: 'Satin Black',
      subtitle: 'Stealth Matte Finish',
      spec: 'Ultra High End Wrap',
      image: '/images/veloce_black_coupe.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'COLOR',
    },
    {
      id: 'color-frozen-bronze',
      name: 'Frozen Bronze',
      subtitle: 'Satin Metallic Champagne',
      spec: 'Luxury Atelier Paint',
      image: '/images/garage/garage_hero_clean.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'COLOR',
    },
    {
      id: 'color-midnight-blue',
      name: 'Midnight Blue',
      subtitle: 'Deep Metallic Pearl',
      spec: 'Triple Coat Clear',
      image: '/images/veloce_black_coupe.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'COLOR',
    },
    {
      id: 'color-chalk-gray',
      name: 'Chalk Gray',
      subtitle: 'Heritage Non-Metallic',
      spec: 'Studio Ceramic Coat',
      image: '/images/garage/garage_hero_clean.jpg',
      tunedCarImage: '/images/studio/studio_coupe_tuned.jpg',
      category: 'COLOR',
    },
  ],
};

const CATEGORIES: StudioCategory[] = ['WHEELS', 'BODY KIT', 'SUSPENSION', 'COLOR'];

export interface StudioWorkspaceProps {
  sessionId?: string;
  className?: string;
}

export function StudioWorkspace({ className }: StudioWorkspaceProps) {
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  const [activeCategory, setActiveCategory] = React.useState<StudioCategory>('WHEELS');
  const [partIndices, setPartIndices] = React.useState<Record<StudioCategory, number>>({
    WHEELS: 0,
    'BODY KIT': 0,
    SUSPENSION: 0,
    COLOR: 0,
  });

  const [isComparing, setIsComparing] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [carImgSrc, setCarImgSrc] = React.useState('/images/studio/studio_coupe_tuned.jpg');

  // Verify and load photo captured from Smart Camera if valid
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('carvision_captured_image');
        if (stored && (stored.startsWith('data:image/') || stored.startsWith('/images/'))) {
          setCarImgSrc(stored);
        } else {
          sessionStorage.removeItem('carvision_captured_image');
        }
      }
    } catch {
      // Storage unavailable in private browsing
    }
  }, []);

  const activeCatalog = STUDIO_CATALOG[activeCategory] || [];
  const currentPartIndex = partIndices[activeCategory] % activeCatalog.length;
  const activePart = activeCatalog[currentPartIndex] || activeCatalog[0];

  // Carousel navigation: previous item
  const handlePrev = React.useCallback(() => {
    setPartIndices((prev) => {
      const cur = prev[activeCategory];
      const nextIndex = cur > 0 ? cur - 1 : activeCatalog.length - 1;
      return { ...prev, [activeCategory]: nextIndex };
    });
    vibrate(18);
  }, [activeCategory, activeCatalog.length]);

  // Carousel navigation: next item
  const handleNext = React.useCallback(() => {
    setPartIndices((prev) => {
      const cur = prev[activeCategory];
      const nextIndex = cur < activeCatalog.length - 1 ? cur + 1 : 0;
      return { ...prev, [activeCategory]: nextIndex };
    });
    vibrate(18);
  }, [activeCategory, activeCatalog.length]);

  // Keyboard navigation on desktop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Touch Swipe Gesture for physical tape feel ("lenta kabi")
  const touchStartXRef = React.useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const diff = touchStartXRef.current - touchEndX;

    if (diff > 30) {
      handleNext();
    } else if (diff < -30) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  // Apply Changes Action
  const handleApplyChanges = () => {
    unlockAudio();
    playShutter();
    vibrate([35, 45, 35]);

    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setIsComparing(true);
      playLock();
    }, 400);
  };

  // 3 visible items for the carousel tape
  const len = activeCatalog.length;
  const prevIndex = (currentPartIndex - 1 + len) % len;
  const nextIndex = (currentPartIndex + 1) % len;

  const prevItem = activeCatalog[prevIndex];
  const nextItem = activeCatalog[nextIndex];

  // Car images: factory (before) vs tuned (after)
  const factoryCarUrl = '/images/veloce_black_coupe.jpg';
  const tunedCarUrl = carImgSrc;

  return (
    <div
      className={cn(
        'relative min-h-screen w-full bg-[#07080B] text-foreground select-none flex flex-col justify-between overflow-x-hidden font-sans',
        className
      )}
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(212,174,98,0.06)_0%,rgba(7,8,11,0.95)_75%)]" />

      {/* 1. TOP HEADER: Back Chevron & Clean CUSTOMIZE Title (1:1 with reference) */}
      <header className="relative z-30 flex h-14 w-full items-center justify-between px-5 sm:px-8 max-w-xl mx-auto pt-2">
        <Link
          href={`/${locale}/seller`}
          aria-label="Orqaga qaytish"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#EDE8DF] hover:bg-white/5 active:scale-90 transition-all cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.2] rtl:rotate-180" />
        </Link>

        <h1 className="text-xs sm:text-sm font-medium tracking-[0.28em] text-[#EDE8DF] uppercase">
          CUSTOMIZE
        </h1>

        {/* Empty placeholder for perfect optical center alignment */}
        <div className="w-10 h-10 pointer-events-none" aria-hidden="true" />
      </header>

      {/* 2. MAIN CAR VIEWPORT (Commanding top ~50% of the screen) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-4 sm:px-6 my-auto max-w-4xl mx-auto">
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[380px] flex items-center justify-center overflow-hidden">
          {isComparing ? (
            <div className="w-full h-full relative rounded-2xl overflow-hidden">
              <BeforeAfterSlider
                beforeImageUrl={factoryCarUrl}
                afterImageUrl={tunedCarUrl}
                beforeLabel="Factory Stock"
                afterLabel="CarVision 4K Tuned"
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={carImgSrc}
                alt="Customized Vehicle 4K Front Right View"
                onError={() => setCarImgSrc('/images/studio/studio_coupe_tuned.jpg')}
                className={cn(
                  'w-full h-full object-contain pointer-events-none transition-all duration-700 drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)]',
                  isApplying ? 'scale-[1.02] filter brightness-110' : 'scale-100'
                )}
                draggable={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. LOWER INTERACTIVE CONTROLS SECTION */}
      <div className="relative z-20 w-full max-w-md mx-auto flex flex-col items-center pb-8 px-4 sm:px-6">
        {/* CATEGORY TABS (WHEELS | BODY KIT | SUSPENSION | COLOR - Borderless Depth) */}
        <nav className="flex items-center justify-between w-full px-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  vibrate(15);
                }}
                className={cn(
                  'relative pb-2.5 text-[10.5px] sm:text-xs font-semibold tracking-[0.14em] uppercase transition-all duration-300 cursor-pointer',
                  isActive ? 'text-[#EDE8DF]' : 'text-[#6F7482] hover:text-[#C5CAD6]'
                )}
              >
                <span>{cat}</span>
                {isActive && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[2px] rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, #D4AE62 50%, transparent 100%)',
                      boxShadow: '0 0 10px #D4AE62',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* HORIZONTAL PART TAPE / CAROUSEL ("lenta kabi") */}
        <div
          className="relative flex items-center justify-center w-full mt-6 py-2 select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left Arrow Chevron */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Oldingi detal"
            className="flex h-10 w-8 items-center justify-center text-[#6F7482] hover:text-[#EDE8DF] active:scale-90 transition-all cursor-pointer me-2 sm:me-4"
          >
            <ChevronLeft className="h-5 w-5 stroke-[1.8] rtl:rotate-180" />
          </button>

          {/* 3 Visible Items Tape */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Prev Item Card */}
            {prevItem && (
              <div
                onClick={handlePrev}
                className="grid h-[82px] w-[82px] sm:h-[88px] sm:w-[88px] place-items-center rounded-2xl bg-[#0E1015] p-2.5 opacity-35 scale-90 transition-all duration-300 cursor-pointer hover:opacity-50"
              >
                <img
                  src={prevItem.image}
                  alt={prevItem.name}
                  className="h-full w-full object-contain pointer-events-none rounded-xl"
                />
              </div>
            )}

            {/* Center Active Item Card (Champagne Gold Rounded Frame 1:1) */}
            {activePart && (
              <div
                className="relative grid h-[100px] w-[100px] sm:h-[108px] sm:w-[108px] place-items-center rounded-[22px] bg-[#12141A] p-2.5 scale-105 transition-all duration-300"
                style={{
                  border: '1.5px solid #D4AE62',
                  boxShadow: '0 0 24px -4px rgba(212,174,98,0.35)',
                }}
              >
                <img
                  src={activePart.image}
                  alt={activePart.name}
                  className="h-full w-full object-contain pointer-events-none rounded-xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                />
              </div>
            )}

            {/* Next Item Card */}
            {nextItem && (
              <div
                onClick={handleNext}
                className="grid h-[82px] w-[82px] sm:h-[88px] sm:w-[88px] place-items-center rounded-2xl bg-[#0E1015] p-2.5 opacity-35 scale-90 transition-all duration-300 cursor-pointer hover:opacity-50"
              >
                <img
                  src={nextItem.image}
                  alt={nextItem.name}
                  className="h-full w-full object-contain pointer-events-none rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Right Arrow Chevron */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Keyingi detal"
            className="flex h-10 w-8 items-center justify-center text-[#6F7482] hover:text-[#EDE8DF] active:scale-90 transition-all cursor-pointer ms-2 sm:me-4"
          >
            <ChevronRight className="h-5 w-5 stroke-[1.8] rtl:rotate-180" />
          </button>
        </div>

        {/* ACTIVE ITEM SPECIFICATIONS (Title, Subtitle, Spec) */}
        {activePart && (
          <div className="mt-4 flex flex-col items-center text-center">
            <h2 className="text-sm sm:text-base font-bold tracking-[0.14em] text-[#EDE8DF]">
              {activePart.name}
            </h2>
            <p className="mt-1 text-xs text-[#8E8A85] tracking-wider font-normal">
              {activePart.subtitle}
            </p>
            <p className="mt-0.5 text-[11px] text-[#8E8A85] tracking-widest font-mono">
              {activePart.spec}
            </p>
          </div>
        )}

        {/* PRIMARY ACTION BUTTON: APPLY CHANGES (1:1 Rounded Pill) */}
        <div className="mt-6 w-full flex justify-center mb-6 sm:mb-8">
          <button
            type="button"
            onClick={handleApplyChanges}
            disabled={isApplying}
            className="w-[84%] max-w-[340px] h-[54px] rounded-[22px] flex items-center justify-center gap-2 text-[11.5px] font-bold tracking-[0.18em] text-[#12141A] uppercase transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_28px_-4px_rgba(207,165,89,0.55)] active:scale-[0.98] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #DFBE82 0%, #CFA559 50%, #B88B3D 100%)',
              boxShadow: '0 8px 24px -4px rgba(207,165,89,0.45)',
            }}
          >
            {isApplying ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-spin text-[#12141A]" />
                <span>APPLYING 4K CHANGES...</span>
              </span>
            ) : (
              <span>APPLY CHANGES</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
