'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Camera, Check, ImagePlus, Loader2, Sparkles, Star, Trash2 } from 'lucide-react';
import { VeloceShell } from '@/components/veloce/VeloceShell';
import { useAuth } from '@/features/auth/context/AuthContext';
import { VehiclePicker, type PickedVehicle } from '@/features/seller/components/VehiclePicker';
import {
  analyzeQuality,
  compressForUpload,
  composeStudioImage,
  loadImage,
  loadImageFromBlob,
} from '@/features/seller/lib/image-tools';
import { CATALOG_CATEGORIES, MAX_ITEM_IMAGES, PRICE_CURRENCIES, type CatalogCategory, type CatalogItemDTO } from '@/domain/catalog';
import { DEFAULT_RATES } from '@/domain/currency';

interface PhotoEntry {
  id: string;
  url: string;
  preview: string;
  kind: 'ORIGINAL' | 'STUDIO' | 'ANGLE';
  warnings: string[];
}

const fieldCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-[#D4AE62]/60';
const labelCls = 'mb-1.5 block text-xs font-semibold tracking-wide text-white/60';
const sectionCls = 'rounded-3xl border border-white/[0.07] bg-[#0B0D13] p-5 md:p-6';

async function uploadBlob(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
  const res = await fetch('/api/v1/seller/inventory/upload', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Rasmni yuklab bo‘lmadi');
  return data.url as string;
}

export default function SellerNewPartPage() {
  const params = useParams();
  const search = useSearchParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const editId = search?.get('id') ?? null;
  const { user, isLoading, refreshProfile } = useAuth();

  const fileRef = React.useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = React.useState<PhotoEntry[]>([]);
  const [uploading, setUploading] = React.useState(0);
  const [photoError, setPhotoError] = React.useState<string | null>(null);

  const [category, setCategory] = React.useState<CatalogCategory>('wheels');
  const [name, setName] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [diameter, setDiameter] = React.useState('');
  const [width, setWidth] = React.useState('');
  const [pcd, setPcd] = React.useState('');
  const [offset, setOffset] = React.useState('');
  const [swatch, setSwatch] = React.useState('#D4AE62');
  const [universal, setUniversal] = React.useState(false);
  const [vehicles, setVehicles] = React.useState<PickedVehicle[]>([]);
  const [price, setPrice] = React.useState('');
  const [currency, setCurrency] = React.useState<(typeof PRICE_CURRENCIES)[number]>('UZS');
  const [stock, setStock] = React.useState('1');
  const [install, setInstall] = React.useState(true);
  const [installPrice, setInstallPrice] = React.useState('');

  const [suggestion, setSuggestion] = React.useState<{ name: string; description: string; ai: boolean } | null>(null);
  const [improvingText, setImprovingText] = React.useState(false);

  const [improvingImage, setImprovingImage] = React.useState(false);
  const [imageNotice, setImageNotice] = React.useState<string | null>(null);
  const [studioCandidate, setStudioCandidate] = React.useState<{ url: string; preview: string } | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [savedAs, setSavedAs] = React.useState<'PUBLISHED' | 'DRAFT' | null>(null);
  const [loadingItem, setLoadingItem] = React.useState(Boolean(editId));

  const isSeller = user?.role === 'b2b_seller';

  // ---- edit mode: load the item -----------------------------------------------------------
  React.useEffect(() => {
    if (!editId || !isSeller) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/seller/inventory?id=${encodeURIComponent(editId)}`, { cache: 'no-store' });
        const data = await res.json();
        const item: CatalogItemDTO | undefined = data.items?.[0];
        if (cancelled) return;
        if (!item) {
          setFormError('Mahsulot topilmadi');
          return;
        }
        const a = item.attributes;
        setCategory(item.category);
        setName(item.name);
        setBrand(item.brand);
        setDescription(item.description);
        setDiameter(a['diameter'] ? String(a['diameter']) : '');
        setWidth(a['width'] ? String(a['width']) : '');
        setPcd(typeof a['pcd'] === 'string' ? a['pcd'] : '');
        setOffset(a['offset'] !== undefined ? String(a['offset']) : '');
        if (typeof a['swatch'] === 'string') setSwatch(a['swatch']);
        setUniversal(item.isUniversal);
        setVehicles(
          item.fitment.map((f) => ({
            key: f.modelId ?? `custom:${(f.customModel ?? '').toLowerCase()}`,
            modelId: f.modelId ?? undefined,
            customModel: f.customModel ?? undefined,
            label: f.label,
            yearFrom: f.yearFrom ?? undefined,
            yearTo: f.yearTo ?? undefined,
          }))
        );
        setCurrency((PRICE_CURRENCIES as readonly string[]).includes(item.inputCurrency) ? (item.inputCurrency as (typeof PRICE_CURRENCIES)[number]) : 'USD');
        setPrice(item.inputPrice !== null ? String(item.inputPrice) : String(item.priceUSD));
        setStock(String(item.stock));
        setInstall(item.installAvailable);
        setInstallPrice(item.installPriceUSD > 0 ? String(item.installPriceUSD) : '');
        setPhotos(item.images.map((g) => ({ id: g.id, url: g.url, preview: g.url, kind: g.kind, warnings: [] })));
      } catch {
        if (!cancelled) setFormError('Mahsulotni yuklab bo‘lmadi');
      } finally {
        if (!cancelled) setLoadingItem(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, isSeller]);

  // ---- photos ----------------------------------------------------------------------------------
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoError(null);
    const room = MAX_ITEM_IMAGES - photos.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (picked.length === 0) {
      setPhotoError(`Eng ko‘pi bilan ${MAX_ITEM_IMAGES} ta rasm`);
      return;
    }
    for (const file of picked) {
      setUploading((n) => n + 1);
      try {
        if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
          throw new Error('Faqat JPEG, PNG yoki WebP rasm yuklang');
        }
        const img = await loadImageFromBlob(file);
        const report = analyzeQuality(img);
        if (!report.ok) throw new Error(report.blocking[0]);
        const blob = await compressForUpload(img);
        const url = await uploadBlob(blob);
        setPhotos((prev) => [
          ...prev,
          { id: crypto.randomUUID(), url, preview: URL.createObjectURL(blob), kind: 'ORIGINAL', warnings: report.warnings },
        ]);
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'Rasmni yuklab bo‘lmadi');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const makeMain = (id: string) =>
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      return target ? [target, ...prev.filter((p) => p.id !== id)] : prev;
    });

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  // ---- AI: text -----------------------------------------------------------------------------------
  const improveText = async () => {
    setImprovingText(true);
    setSuggestion(null);
    try {
      const res = await fetch('/api/v1/seller/inventory/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, brand, category }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Yaxshilab bo‘lmadi');
      setSuggestion({ name: data.name, description: data.description, ai: Boolean(data.ai) });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Yaxshilab bo‘lmadi');
    } finally {
      setImprovingText(false);
    }
  };

  // ---- AI: image (cut-out + studio background) ----------------------------------------------------
  const mainPhoto = photos[0];
  const canImproveImage = Boolean(mainPhoto) && mainPhoto!.kind !== 'STUDIO' && !improvingImage;

  const improveImage = async () => {
    if (!mainPhoto) return;
    setImprovingImage(true);
    setImageNotice(null);
    setStudioCandidate(null);
    try {
      const res = await fetch('/api/v1/seller/inventory/improve-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: mainPhoto.url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Rasmni yaxshilab bo‘lmadi');
      const cutout = await loadImage(data.cutoutUrl as string);
      const composed = await composeStudioImage(cutout);
      const url = await uploadBlob(composed);
      setStudioCandidate({ url, preview: URL.createObjectURL(composed) });
      void refreshProfile();
    } catch (err) {
      setImageNotice(err instanceof Error ? err.message : 'Rasmni yaxshilab bo‘lmadi');
      void refreshProfile();
    } finally {
      setImprovingImage(false);
    }
  };

  const acceptStudio = () => {
    if (!studioCandidate) return;
    const studio: PhotoEntry = { id: crypto.randomUUID(), url: studioCandidate.url, preview: studioCandidate.preview, kind: 'STUDIO', warnings: [] };
    setPhotos((prev) => [studio, ...prev].slice(0, MAX_ITEM_IMAGES));
    setStudioCandidate(null);
  };

  // ---- submit -----------------------------------------------------------------------------------------
  const priceNum = Number(price.replace(/\s/g, ''));
  const approxUsd = priceNum > 0 ? priceNum / (DEFAULT_RATES[currency] || 1) : 0;

  const validate = (): string | null => {
    if (photos.length === 0) return 'Kamida 1 ta rasm yuklang';
    if (name.trim().length < 2) return 'Mahsulot nomini kiriting';
    if (!(priceNum > 0)) return 'Narxni kiriting';
    if (!universal && vehicles.length === 0) return 'Qaysi mashinaga mosligini tanlang yoki "Barcha mashinalarga" ni belgilang';
    if (category === 'wheels' && !diameter) return 'Disk diametrini kiriting';
    return null;
  };

  const save = async (publish: boolean) => {
    setFormError(null);
    const problem = publish ? validate() : photos.length === 0 ? 'Kamida 1 ta rasm yuklang' : name.trim().length < 2 ? 'Mahsulot nomini kiriting' : !(priceNum > 0) ? 'Narxni kiriting' : null;
    if (problem) {
      setFormError(problem);
      return;
    }
    const attributes: Record<string, unknown> = {};
    if (category === 'wheels') {
      if (diameter) attributes['diameter'] = Number(diameter);
      if (width) attributes['width'] = Number(width);
      if (pcd.trim()) attributes['pcd'] = pcd.trim();
      if (offset !== '') attributes['offset'] = Number(offset);
    }
    if (category === 'wrap_paint') attributes['swatch'] = swatch;
    if (universal) attributes['universal'] = true;

    const body = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      description: description.trim() || undefined,
      category,
      price: priceNum,
      currency,
      stock: Math.max(0, Math.floor(Number(stock) || 0)),
      installAvailable: install,
      installPrice: install && installPrice ? Number(installPrice) : undefined,
      attributes,
      images: photos.map((p) => ({ url: p.url, kind: p.kind })),
      fitment: universal
        ? []
        : vehicles.map((v) => ({ modelId: v.modelId, customModel: v.modelId ? undefined : v.customModel, yearFrom: v.yearFrom, yearTo: v.yearTo })),
      publish,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/v1/seller/inventory', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...body } : body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Saqlab bo‘lmadi');
      setSavedAs(publish ? 'PUBLISHED' : 'DRAFT');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPhotos([]);
    setName('');
    setBrand('');
    setDescription('');
    setDiameter('');
    setWidth('');
    setPcd('');
    setOffset('');
    setPrice('');
    setStock('1');
    setVehicles([]);
    setUniversal(false);
    setSuggestion(null);
    setStudioCandidate(null);
    setSavedAs(null);
  };

  // ---- guards -----------------------------------------------------------------------------------------
  const shell = (children: React.ReactNode) => (
    <VeloceShell>
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-4 md:px-8">{children}</div>
    </VeloceShell>
  );

  if (isLoading || loadingItem) {
    return shell(
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#D4AE62]" />
      </div>
    );
  }
  if (!user || !isSeller) {
    return shell(
      <div className={`${sectionCls} mt-10 text-center`}>
        <p className="text-sm text-white/80">Mahsulot qo‘shish uchun studiya akkaunti bilan kiring.</p>
        <Link href={`/${locale}/login`} className="mt-4 inline-block rounded-full bg-[#D4AE62] px-6 py-2.5 text-sm font-bold text-black">
          Kirish
        </Link>
      </div>
    );
  }

  if (savedAs) {
    return shell(
      <div className={`${sectionCls} mt-10 text-center`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">{savedAs === 'PUBLISHED' ? 'Mahsulot do‘konda chiqdi' : 'Qoralama saqlandi'}</h1>
        <p className="mt-1 text-sm text-white/60">
          {savedAs === 'PUBLISHED' ? 'Mijozlar uni hozirdan ko‘ra oladi.' : 'Tayyor bo‘lganda dashboarddan nashr qilasiz.'}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {!editId && (
            <button type="button" onClick={resetForm} className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15">
              Yana mahsulot qo‘shish
            </button>
          )}
          <Link href={`/${locale}/seller?tab=dashboard`} className="rounded-full bg-[#D4AE62] px-6 py-3 text-sm font-bold text-black">
            Dashboardga qaytish
          </Link>
        </div>
      </div>
    );
  }

  const cat = CATALOG_CATEGORIES.find((c) => c.slug === category)!;

  return shell(
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href={`/${locale}/seller?tab=dashboard`} className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          Orqaga
        </Link>
        <h1 className="text-base font-bold text-white md:text-lg">{editId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h1>
        <span className="w-20" />
      </div>

      <div className="space-y-4">
        {/* 1. PHOTOS */}
        <section className={sectionCls}>
          <h2 className="text-sm font-bold text-white">1. Rasm</h2>
          <p className="mt-1 text-xs text-white/50">Detalni yaxshi yorug‘likda, ravshan va to‘liq ko‘rinadigan qilib oling. Birinchi rasm asosiy bo‘ladi.</p>

          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute start-1.5 top-1.5 rounded-full bg-[#D4AE62] px-2 py-0.5 text-[10px] font-bold text-black">Asosiy</span>}
                {p.kind === 'STUDIO' && <span className="absolute start-1.5 bottom-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-[#D4AE62]">Studiya</span>}
                <div className="absolute end-1.5 top-1.5 flex flex-col gap-1">
                  {i !== 0 && (
                    <button type="button" aria-label="Asosiy qilish" onClick={() => makeMain(p.id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black">
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" aria-label="O‘chirish" onClick={() => removePhoto(p.id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <Loader2 className="h-5 w-5 animate-spin text-[#D4AE62]" />
              </div>
            ))}
            {photos.length + uploading < MAX_ITEM_IMAGES && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#D4AE62]/40 bg-[#D4AE62]/[0.05] text-[#D4AE62] transition hover:bg-[#D4AE62]/10"
              >
                {photos.length === 0 ? <Camera className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
                <span className="text-[11px] font-semibold">{photos.length === 0 ? 'Rasm qo‘shish' : 'Yana'}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />

          {photoError && <p role="alert" className="mt-3 text-xs text-red-300">{photoError}</p>}
          {photos.flatMap((p) => p.warnings).slice(0, 3).map((w) => (
            <p key={w} className="mt-2 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {w}
            </p>
          ))}

          {mainPhoto && mainPhoto.kind !== 'STUDIO' && (
            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Rasmni studiya ko‘rinishiga keltirish</p>
                  <p className="text-xs text-white/50">Detal o‘zgarmaydi: faqat orqa fon toza studiyaga almashadi. 1 kredit.</p>
                </div>
                <button
                  type="button"
                  disabled={!canImproveImage}
                  onClick={() => void improveImage()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#D4AE62] px-4 py-2 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {improvingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {improvingImage ? 'Tayyorlanmoqda…' : 'Yaxshilash'}
                </button>
              </div>
              {imageNotice && <p role="alert" className="mt-3 text-xs text-amber-300">{imageNotice}</p>}
              {studioCandidate && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <figure>
                    <img src={mainPhoto.preview} alt="Asl rasm" className="aspect-[4/3] w-full rounded-xl object-cover" />
                    <figcaption className="mt-1 text-center text-[11px] text-white/50">Asl</figcaption>
                  </figure>
                  <figure>
                    <img src={studioCandidate.preview} alt="Yaxshilangan rasm" className="aspect-[4/3] w-full rounded-xl object-cover" />
                    <figcaption className="mt-1 text-center text-[11px] text-[#D4AE62]">Studiya</figcaption>
                  </figure>
                  <button type="button" onClick={() => setStudioCandidate(null)} className="rounded-full bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/15">
                    Asl rasmni qoldirish
                  </button>
                  <button type="button" onClick={acceptStudio} className="rounded-full bg-[#D4AE62] py-2.5 text-xs font-bold text-black">
                    Yaxshilanganini ishlatish
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 2. WHAT IS IT */}
        <section className={sectionCls}>
          <h2 className="text-sm font-bold text-white">2. Bu nima?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATALOG_CATEGORIES.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategory(c.slug)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${category === c.slug ? 'bg-[#D4AE62] text-black' : 'bg-white/[0.06] text-white/75 hover:bg-white/10'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/40">{cat.hint}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="p-name">Nomi *</label>
              <input id="p-name" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} placeholder="Masalan: BBS CI-R 20 dyuym" className={fieldCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-brand">Brend</label>
              <input id="p-brand" value={brand} maxLength={100} onChange={(e) => setBrand(e.target.value)} placeholder="Masalan: BBS" className={fieldCls} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wide text-white/60" htmlFor="p-desc">Tavsif</label>
              {(name.trim() || description.trim()) && (
                <button
                  type="button"
                  onClick={() => void improveText()}
                  disabled={improvingText}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40 transition hover:text-[#D4AE62] disabled:opacity-50"
                >
                  {improvingText ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Yaxshilash
                </button>
              )}
            </div>
            <textarea id="p-desc" value={description} maxLength={1500} rows={4} onChange={(e) => setDescription(e.target.value)} placeholder="Detal haqida qisqacha: material, holati, nimasi bilan yaxshi…" className={`${fieldCls} resize-y`} />

            {suggestion && (
              <div className="mt-3 rounded-2xl border border-[#D4AE62]/30 bg-[#D4AE62]/[0.06] p-4">
                <p className="text-[11px] font-semibold text-[#D4AE62]">{suggestion.ai ? 'Taklif' : 'Tozalangan variant'}</p>
                <p className="mt-2 text-sm font-semibold text-white">{suggestion.name}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-white/75">{suggestion.description}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setSuggestion(null)} className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15">Bekor qilish</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (suggestion.name) setName(suggestion.name);
                      setDescription(suggestion.description);
                      setSuggestion(null);
                    }}
                    className="rounded-full bg-[#D4AE62] px-4 py-2 text-xs font-bold text-black"
                  >
                    Qabul qilish
                  </button>
                </div>
              </div>
            )}
          </div>

          {category === 'wheels' && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className={labelCls} htmlFor="w-d">Diametr (R) *</label>
                <input id="w-d" type="number" inputMode="numeric" min={10} max={30} value={diameter} onChange={(e) => setDiameter(e.target.value)} placeholder="17" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="w-w">Eni (J)</label>
                <input id="w-w" type="number" inputMode="decimal" step="0.5" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="7.5" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="w-p">PCD</label>
                <input id="w-p" value={pcd} onChange={(e) => setPcd(e.target.value)} placeholder="5x114.3" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="w-o">Offset (ET)</label>
                <input id="w-o" type="number" inputMode="numeric" value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="35" className={fieldCls} />
              </div>
            </div>
          )}
          {category === 'wrap_paint' && (
            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs font-semibold text-white/60" htmlFor="sw">Rang</label>
              <input id="sw" type="color" value={swatch} onChange={(e) => setSwatch(e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
              <span className="text-xs text-white/50">{swatch.toUpperCase()}</span>
            </div>
          )}
        </section>

        {/* 3. FITMENT */}
        <section className={sectionCls}>
          <h2 className="text-sm font-bold text-white">3. Qaysi mashinaga mos?</h2>
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-white/80">
            <input type="checkbox" checked={universal} onChange={(e) => setUniversal(e.target.checked)} className="h-4 w-4 accent-[#D4AE62]" />
            Barcha mashinalarga mos (universal)
          </label>
          {!universal && (
            <div className="mt-4">
              <VehiclePicker value={vehicles} onChange={setVehicles} />
              <p className="mt-2 text-[11px] text-white/40">Bazada minglab model bor. Yil oralig‘i ixtiyoriy.</p>
            </div>
          )}
        </section>

        {/* 4. PRICE */}
        <section className={sectionCls}>
          <h2 className="text-sm font-bold text-white">4. Narx va soni</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="pr">Narxi *</label>
              <div className="flex gap-2">
                <input id="pr" type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={fieldCls} />
                <select value={currency} onChange={(e) => setCurrency(e.target.value as (typeof PRICE_CURRENCIES)[number])} className="rounded-xl border border-white/10 bg-[#11141b] px-3 text-sm text-white outline-none" aria-label="Valyuta">
                  {PRICE_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {approxUsd > 0 && currency !== 'USD' && <p className="mt-1 text-[11px] text-white/40">≈ ${approxUsd.toFixed(2)}</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="st">Soni</label>
              <input id="st" type="number" inputMode="numeric" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={fieldCls} />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-white/80">
            <input type="checkbox" checked={install} onChange={(e) => setInstall(e.target.checked)} className="h-4 w-4 accent-[#D4AE62]" />
            O‘rnatib berish xizmati bor
          </label>
          {install && (
            <div className="mt-3 max-w-xs">
              <label className={labelCls} htmlFor="ip">O‘rnatish narxi ({currency})</label>
              <input id="ip" type="number" inputMode="decimal" min={0} value={installPrice} onChange={(e) => setInstallPrice(e.target.value)} placeholder="0" className={fieldCls} />
            </div>
          )}
        </section>

        {formError && (
          <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{formError}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={saving} onClick={() => void save(false)} className="rounded-full bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50">
            Qoralama sifatida saqlash
          </button>
          <button type="button" disabled={saving || uploading > 0} onClick={() => void save(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AE62] px-8 py-3.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editId ? 'Saqlash va nashr qilish' : 'Do‘konda chiqarish'}
          </button>
        </div>
      </div>
    </>
  );
}
