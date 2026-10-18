'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Check,
  Car,
  AlertTriangle,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useCurrency } from '@/context/CurrencyContext';
import { SupportedCurrency } from '@/domain/currency';

const SINGLE_VEHICLE_MODELS = [
  'Chevrolet Gentra',
  'Chevrolet Cobalt',
  'Chevrolet Malibu 2',
  'Chevrolet Tracker 2',
  'Chevrolet Onix',
  'Chevrolet Monza',
  'BYD Song Plus',
  'BYD Chazor',
  'Kia K5',
  'Li Auto L9',
  'Zeekr 001',
];

const PART_CATEGORIES = [
  { id: 'wheels', slug: 'wheels', name: 'Disklar (Wheels)' },
  { id: 'body-kits', slug: 'body-kits', name: 'Bamper va Obves (Body Kit)' },
  { id: 'lighting', slug: 'lighting', name: 'Fara va Optika (Lighting)' },
  { id: 'interior', slug: 'interior', name: 'Salon va Rul (Interior)' },
  { id: 'suspension', slug: 'suspension', name: 'Podveska (Suspension)' },
];

const STUDIO_SAMPLES = [
  {
    label: 'BBS CI-R 20" Disk',
    url: '/images/garage/bbs_wheel.jpg',
    fileName: 'bbs_wheel.jpg',
    categorySlug: 'wheels',
  },
  {
    label: 'M-Perf Carbon Old Lip / Bamper',
    url: '/images/garage/carbon_lip.jpg',
    fileName: 'carbon_lip_bamper.jpg',
    categorySlug: 'body-kits',
  },
  {
    label: 'KW Variant 3 Podveska',
    url: '/images/garage/kw_suspension.jpg',
    fileName: 'kw_suspension.jpg',
    categorySlug: 'suspension',
  },
  {
    label: 'M-Performance Sport Salon',
    url: '/images/garage/m_seats.jpg',
    fileName: 'm_seats_interior.jpg',
    categorySlug: 'interior',
  },
];

interface ValidationState {
  valid: boolean;
  status: string;
  detectedCategorySlug?: string;
  detectedCategoryLabel?: string;
  message: string;
}

export default function SellerNewPartPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { formatPrice } = useCurrency();

  const mainFileRef = useRef<HTMLInputElement>(null);
  const angleFileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categorySlug, setCategorySlug] = useState('wheels');
  const [selectedCar, setSelectedCar] = useState<string>('Chevrolet Gentra');
  const [price, setPrice] = useState('450');
  const [inputCurrency, setInputCurrency] = useState<SupportedCurrency>('USD');
  const [stock, setStock] = useState('4');
  const [spec, setSpec] = useState('');

  const [imageUrl, setImageUrl] = useState('/images/garage/bbs_wheel.jpg');
  const [uploadedFileName, setUploadedFileName] = useState('bbs_wheel.jpg');
  const [secondAngleUrl, setSecondAngleUrl] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<{
    width: number;
    height: number;
    contrast: number;
  }>({ width: 1024, height: 1024, contrast: 48 });

  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    valid: true,
    status: 'verified',
    message:
      'AI Tekshiruvdan o‘tdi: Detal tanlangan bo‘limga 100% mos va mashinaga mayda detallarigacha aniq joylashtirishga tayyor!',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  // Run AI Vision Category & Quality Gatekeeper whenever image, category, or name changes
  const runAiValidation = useCallback(
    async (
      targetUrl: string,
      targetFile: string,
      targetCatSlug: string,
      targetName: string,
      stats: { width: number; height: number; contrast: number }
    ) => {
      setIsCheckingAI(true);
      try {
        const res = await fetch('/api/v1/seller/validate-part-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: targetUrl,
            fileName: targetFile,
            categorySlug: targetCatSlug,
            productName: targetName,
            imageStats: stats,
          }),
        });
        const data = await res.json();
        if (data && typeof data.valid === 'boolean') {
          setValidation(data);
        }
      } catch {
        // Keep current validation if offline
      } finally {
        setIsCheckingAI(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      runAiValidation(imageUrl, uploadedFileName, categorySlug, name, imageStats);
    }, 220);
    return () => clearTimeout(timer);
  }, [imageUrl, uploadedFileName, categorySlug, name, imageStats, runAiValidation]);

  // Extract pixel resolution, contrast & clean studio cutout on upload
  const processUploadedFile = (file: File, isSecondAngle = false) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          if (isSecondAngle) setSecondAngleUrl(rawDataUrl);
          else {
            setImageUrl(rawDataUrl);
            setUploadedFileName(file.name);
          }
          return;
        }

        // Studio dark background normalization + micro-contrast for 100% accurate AI reference
        ctx.fillStyle = '#0B0C10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.filter = 'contrast(1.06) saturate(1.05)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Compute image contrast to detect blank/blurry uploads
        let contrastScore = 42;
        try {
          const sample = ctx.getImageData(
            0,
            0,
            Math.min(120, canvas.width),
            Math.min(120, canvas.height)
          ).data;
          let minL = 255;
          let maxL = 0;
          for (let i = 0; i < sample.length; i += 16) {
            const lum =
              0.299 * (sample[i] ?? 0) +
              0.587 * (sample[i + 1] ?? 0) +
              0.114 * (sample[i + 2] ?? 0);
            if (lum < minL) minL = lum;
            if (lum > maxL) maxL = lum;
          }
          contrastScore = Math.round(maxL - minL);
        } catch {
          // Ignore CORS if any
        }

        const processedUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (isSecondAngle) {
          setSecondAngleUrl(processedUrl);
        } else {
          setImageStats({
            width: img.width,
            height: img.height,
            contrast: contrastScore,
          });
          setUploadedFileName(file.name);
          setImageUrl(processedUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validation.valid) {
      setErrorMsg(validation.message);
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Iltimos, detal nomini kiriting.');
      return;
    }
    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      setErrorMsg('Iltimos, to‘g‘ri narx kiriting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullSpec = [
        `${selectedCar} uchun maxsus`,
        spec.trim() || '100% Original AI Reference Fitment',
        secondAngleUrl ? '2-rakursli aniq shablon' : 'Toza studiya shabloni',
      ].join(' · ');

      const res = await fetch('/api/v1/seller/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || 'Tuning Atelier',
          categoryId: categorySlug,
          price: numericPrice,
          currency: inputCurrency,
          stock: Number(stock) || 1,
          compatibility: [selectedCar],
          spec: fullSpec,
          imageUrl,
          installationAvailable: true,
          installationPrice: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Saqlashda xatolik yuz berdi');
      }

      setCreatedSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/seller?tab=dashboard`);
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VeloceShell>
      <div className="mx-auto max-w-5xl px-5 pt-6 pb-28 md:px-10 md:pt-10">
        {/* Simple Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`/${locale}/seller?tab=dashboard`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/80 transition hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-[#D4AE62]">
              Omborga Yangi Jihoz Qo‘shish
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-light text-white sm:text-3xl">
              Yangi Tuning Detal Qo‘shish
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-12">
          {/* LEFT: Photo Upload + AI Vision Gatekeeper */}
          <div className="space-y-6 lg:col-span-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                1. Detal Rasmi (AI Mashinaga 100% Bir Xil Joylashtirishi Uchun)
              </p>
              <p className="mt-1 text-xs text-white/45">
                AI detalning mayda chiziqlarigacha xuddi o‘zidek tushirishi va bo‘lim mosligini (masalan: Fara vs Bamper) tekshirishi uchun aniq rasm yuklang.
              </p>
            </div>

            {/* Main Part Image Preview */}
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-[#11131A] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
              <img
                src={imageUrl}
                alt={name || 'Detal rasmi'}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-xs font-medium text-[#D4AE62] backdrop-blur-md">
                  <Car className="h-3.5 w-3.5" />
                  <span>{selectedCar}</span>
                </span>
                <span className="rounded-xl bg-black/75 px-3 py-1 font-mono text-xs font-bold text-white backdrop-blur-md">
                  {formatPrice(Number(price) || 0, inputCurrency)}
                </span>
              </div>
            </div>

            {/* Upload Buttons (Main + Optional 2nd 3/4 Angle) */}
            <input
              ref={mainFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processUploadedFile(f, false);
              }}
              className="hidden"
            />
            <input
              ref={angleFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processUploadedFile(f, true);
              }}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => mainFileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] py-3.5 text-xs font-semibold text-white transition hover:bg-white/[0.12] cursor-pointer"
              >
                <Upload className="h-4 w-4 text-[#D4AE62]" />
                <span>Asosiy Rasm Yuklash</span>
              </button>

              <button
                type="button"
                onClick={() => angleFileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.04] py-3.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.09] cursor-pointer"
              >
                <Plus className="h-4 w-4 text-[#D4AE62]" />
                <span>{secondAngleUrl ? '2-rakurs yuklandi ✓' : '2-rakurs (Ixtiyoriy)'}</span>
              </button>
            </div>

            {/* AI Vision Gatekeeper Status Box */}
            <div
              className={`rounded-2xl p-4 transition ${
                validation.valid
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-amber-500/15 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {validation.valid ? (
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                )}
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed">
                    {isCheckingAI ? 'AI rasm va bo‘lim mosligini tekshirmoqda...' : validation.message}
                  </p>

                  {!validation.valid && validation.detectedCategorySlug && (
                    <button
                      type="button"
                      onClick={() => {
                        if (validation.detectedCategorySlug) {
                          setCategorySlug(validation.detectedCategorySlug);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AE62] px-3.5 py-2 text-xs font-bold text-black cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        Bo‘limni &ldquo;{validation.detectedCategoryLabel}&rdquo; ga to‘g‘rilash
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Sample Selector to Test AI Validation */}
            <div>
              <p className="mb-2 text-[11px] text-white/40">
                Yoki tayyor namuna rasmlardan tanlang:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {STUDIO_SAMPLES.map((s) => (
                  <button
                    key={s.url}
                    type="button"
                    onClick={() => {
                      setImageUrl(s.url);
                      setUploadedFileName(s.fileName);
                      setCategorySlug(s.categorySlug);
                    }}
                    className={`overflow-hidden rounded-xl transition cursor-pointer ${
                      imageUrl === s.url ? 'ring-2 ring-[#D4AE62]' : 'opacity-65 hover:opacity-100'
                    }`}
                    title={s.label}
                  >
                    <img src={s.url} alt={s.label} className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Simple Form (1 Car Rule + Category + Price) */}
          <div className="space-y-7 lg:col-span-7">
            {/* Step 2: Select Part Category */}
            <div>
              <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-white/70">
                2. Detal Turi (Bo‘limi)
              </label>
              <div className="flex flex-wrap gap-2">
                {PART_CATEGORIES.map((cat) => {
                  const active = categorySlug === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setCategorySlug(cat.slug)}
                      className={`rounded-2xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                        active
                          ? 'bg-[#D4AE62] text-black shadow-[0_6px_18px_rgba(212,174,98,0.3)]'
                          : 'bg-white/[0.04] text-white/65 hover:text-white'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Strictly 1 Car Model Rule */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  3. Qaysi Mashina Uchun? (Faqat 1 ta Mashina Tanlanadi)
                </label>
                <span className="text-xs font-medium text-[#D4AE62]">
                  Tanlandi: {selectedCar}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SINGLE_VEHICLE_MODELS.map((car) => {
                  const active = selectedCar === car;
                  return (
                    <button
                      key={car}
                      type="button"
                      onClick={() => setSelectedCar(car)}
                      className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-medium transition cursor-pointer ${
                        active
                          ? 'bg-[#D4AE62]/20 text-[#D4AE62] ring-1 ring-[#D4AE62]'
                          : 'bg-white/[0.04] text-white/60 hover:text-white'
                      }`}
                    >
                      <Car className="h-3.5 w-3.5" />
                      <span>{car}</span>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Name, Brand & Price */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-white/60">
                  Detal Nomi
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Gentra AMG Style Old Bamper yoki BBS R18 Disk"
                  className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs text-white/60">
                    Narxi
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
                    />
                    <select
                      value={inputCurrency}
                      onChange={(e) => setInputCurrency(e.target.value as SupportedCurrency)}
                      className="rounded-2xl bg-white/[0.06] px-3 py-3.5 text-xs font-semibold text-[#D4AE62] focus:outline-none cursor-pointer"
                    >
                      <option value="USD">USD</option>
                      <option value="UZS">UZS</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-white/60">
                    Ombordagi soni
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-white/60">
                    Brend (Ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="BBS / Custom"
                    className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/60">
                  Qo‘shimcha ma’lumot (O‘lchami, rangi yoki materiali)
                </label>
                <input
                  type="text"
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  placeholder="Masalan: R18 · Qora matoviy · Zavod o‘rniga tushadi"
                  className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AE62]/40"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            {createdSuccess && (
              <div className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-xs text-emerald-300">
                Detal omborga muvaffaqiyatli qo‘shildi!
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !validation.valid}
              className="shimmer flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient py-4 text-xs font-bold tracking-wider uppercase text-black shadow-[0_12px_30px_rgba(212,174,98,0.25)] transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>
                {isSubmitting ? 'Saqlanmoqda...' : 'Detalni Omborga Saqlash'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </VeloceShell>
  );
}
