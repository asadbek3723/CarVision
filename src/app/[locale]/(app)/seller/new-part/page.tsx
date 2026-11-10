'use client';

import * as React from 'react';
import { useApiError } from '@/lib/api-error';
import { readJson } from '@/lib/safe-json';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Camera, Check, ChevronDown, Languages, Lightbulb, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { VehiclePicker, type PickedVehicle } from '@/features/seller/components/VehiclePicker';
import { ProductPhotoModal } from '@/features/seller/components/ProductPhotoModal';
import { SellerOnly } from '@/features/seller/components/SellerOnly';
import { isSellerUser } from '@/features/auth/roles';
import { analyzeQuality, compressForUpload, composeStudioImage, loadImage, loadImageFromBlob } from '@/features/seller/lib/image-tools';
import { dataUrlToBlob } from '@/features/seller/lib/photo-input';
import { CATEGORY_PROFILE, PROFILE_CATEGORY, SHOT_PLANS, type ShotProfile } from '@/features/seller/lib/product-shots';
import { useImageErrorText } from '@/features/seller/lib/use-image-error-text';
import { CATALOG_CATEGORIES, ITEM_LOCALES, MAX_ITEM_IMAGES, PRICE_CURRENCIES, type CatalogCategory, type CatalogItemDTO, type ItemLocale, type ItemTranslations } from '@/domain/catalog';
import { buttonClasses } from '@/components/ui';
import { useErrorToast } from '@/components/ui/Toaster';

interface PhotoEntry {
  id: string;
  url: string;
  kind: 'ORIGINAL' | 'STUDIO' | 'ANGLE';
}

/** Language names written in their own language (never translated). */
const LANGUAGE_NAMES: Record<ItemLocale, string> = {
  uz: 'Oʻzbekcha',
  ru: 'Русский',
  en: 'English',
  ar: 'العربية',
  tr: 'Türkçe',
  kk: 'Қазақша',
  ky: 'Кыргызча',
  tg: 'Тоҷикӣ',
};

const fieldCls =
  'w-full rounded-2xl  bg-white/[0.04] px-4 py-3.5 text-base text-white placeholder:text-white/35 outline-none transition ';
const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50';
const cardCls = 'rounded-3xl  bg-surface-1 p-5 md:p-6';
const selectCls =
  'w-full appearance-none rounded-2xl  bg-white/[0.04] ps-4 pe-11 py-3.5 text-base text-white outline-none transition   [&>option]:bg-[#11141b]';

/** Styled native select (keeps the mobile picker) with a chevron. */
function SelectBox({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} className={selectCls}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-500" />
    </div>
  );
}

/** Throws an Error whose message is the server's text, or '' when there is none (the caller supplies a translated fallback). */
async function uploadBlob(blob: Blob, apiError: (b: { code?: string; error?: string }, fallback: string) => string): Promise<string> {
  const form = new FormData();
  form.append('file', new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
  const res = await fetch('/api/v1/seller/inventory/upload', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(apiError(data, ''));
  return data.url as string;
}

function SellerNewPartPageInner() {
  const t = useTranslations('newPart');
  const tTips = useTranslations('listingTips');
  const apiError = useApiError();
  const tc = useTranslations('catalogCat');
  const imgText = useImageErrorText();
  const tImg = useTranslations('imageErrors');
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const editId = search?.get('id') ?? null;
  const { user, isLoading, refreshProfile } = useAuth();
  const unlocked = isSellerUser(user);

  const [photos, setPhotos] = React.useState<PhotoEntry[]>([]);
  const [uploading, setUploading] = React.useState(0);
  const [photoNotice, setPhotoNotice] = React.useState<string | null>(null);
  const [photoModal, setPhotoModal] = React.useState(false);
  const autoOpened = React.useRef(false);

  const [category, setCategory] = React.useState<CatalogCategory>('wheels');
  const [name, setName] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [currency, setCurrency] = React.useState<(typeof PRICE_CURRENCIES)[number]>('UZS');
  const [universal, setUniversal] = React.useState(false);
  const [vehicles, setVehicles] = React.useState<PickedVehicle[]>([]);
  const [pickCars, setPickCars] = React.useState(false);

  const [more, setMore] = React.useState(true);
  const [sourceLang, setSourceLang] = React.useState<string | null>(null);
  const [translations, setTranslations] = React.useState<ItemTranslations>({});
  const [editedLangs, setEditedLangs] = React.useState<Set<ItemLocale>>(new Set());
  const [brand, setBrand] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [stock, setStock] = React.useState('1');
  const [diameter, setDiameter] = React.useState('');
  const [swatch, setSwatch] = React.useState('#E8BF74');

  const [suggestion, setSuggestion] = React.useState<{ name: string; description: string } | null>(null);
  const [improvingText, setImprovingText] = React.useState(false);
  const [improvingImage, setImprovingImage] = React.useState(false);
  const [studioCandidate, setStudioCandidate] = React.useState<{ url: string; preview: string } | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  useErrorToast(error);
  const [done, setDone] = React.useState(false);
  const [loadingItem, setLoadingItem] = React.useState(Boolean(editId));

  // ---- edit mode ------------------------------------------------------------------------------
  React.useEffect(() => {
    if (!editId || !unlocked) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/seller/inventory?id=${encodeURIComponent(editId)}`, { cache: 'no-store' });
        const data = (await readJson(res)).data;
        const item: CatalogItemDTO | undefined = data.items?.[0];
        if (cancelled) return;
        if (!item) return setError(t('errNotFound'));
        const a = item.attributes;
        setCategory(item.category);
        setName(item.name);
        setBrand(item.brand);
        setDescription(item.description);
        setSourceLang(item.sourceLang);
        setTranslations(item.translations ?? {});
        setDiameter(a['diameter'] ? String(a['diameter']) : '');
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
        setPhotos(item.images.map((g) => ({ id: g.id, url: g.url, kind: g.kind })));
        setMore(true);
      } catch {
        if (!cancelled) setError(t('errLoad'));
      } finally {
        if (!cancelled) setLoadingItem(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, unlocked, t]);

  // New product: the camera opens right away
  React.useEffect(() => {
    if (!editId && unlocked && !autoOpened.current) {
      autoOpened.current = true;
      setPhotoModal(true);
    }
  }, [editId, unlocked]);

  // ---- photos -----------------------------------------------------------------------------------
  const profile: ShotProfile = CATEGORY_PROFILE[category];
  const changeProfile = (p: ShotProfile) => {
    if (CATEGORY_PROFILE[category] !== p) setCategory(PROFILE_CATEGORY[p]);
  };

  // The camera stays open for the next shot; it closes with "Done".
  const addPhoto = React.useCallback(async (dataUrl: string) => {
    setPhotoNotice(null);
    setUploading((n) => n + 1);
    try {
      const img = await loadImageFromBlob(await dataUrlToBlob(dataUrl));
      const report = analyzeQuality(img);
      if (!report.ok) {
        setPhotoNotice(report.blocking[0] ? imgText.issue(report.blocking[0]) : null);
        return;
      }
      if (report.warnings[0]) setPhotoNotice(imgText.issue(report.warnings[0]));
      const url = await uploadBlob(await compressForUpload(img), apiError);
      setPhotos((prev) => (prev.length >= MAX_ITEM_IMAGES ? prev : [...prev, { id: crypto.randomUUID(), url, kind: 'ORIGINAL' }]));
    } catch (err) {
      setPhotoNotice(imgText.error(err, tImg('upload')));
    } finally {
      setUploading((n) => n - 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- AI helpers -------------------------------------------------------------------------------
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
      if (!res.ok || !data.success) throw new Error(apiError(data, t('errImprove')));
      setSuggestion({ name: data.name, description: data.description });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errImprove'));
    } finally {
      setImprovingText(false);
    }
  };

  const main = photos[0];
  const improveImage = async () => {
    if (!main) return;
    setImprovingImage(true);
    setPhotoNotice(null);
    setStudioCandidate(null);
    try {
      const res = await fetch('/api/v1/seller/inventory/improve-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: main.url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(apiError(data, t('errImproveImage')));
      const composed = await composeStudioImage(await loadImage(data.cutoutUrl as string));
      setStudioCandidate({ url: await uploadBlob(composed, apiError), preview: URL.createObjectURL(composed) });
    } catch (err) {
      setPhotoNotice(imgText.error(err, t('errImproveImage')));
    } finally {
      setImprovingImage(false);
      void refreshProfile();
    }
  };

  // ---- save ----------------------------------------------------------------------------------------
  const priceNum = Number(price.replace(/\s/g, ''));

  const save = async () => {
    setError(null);
    if (photos.length === 0) return setError(t('errNeedPhoto'));
    if (name.trim().length < 2) return setError(t('errNeedName'));
    if (!(priceNum > 0)) return setError(t('errNeedPrice'));
    if (!universal && vehicles.length === 0) return setError(t('errNeedCar'));

    const attributes: Record<string, unknown> = {};
    if (category === 'wheels' && diameter) attributes['diameter'] = Number(diameter);
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
      installAvailable: true,
      attributes,
      images: photos.map((p) => ({ url: p.url, kind: p.kind })),
      fitment: universal ? [] : vehicles.map((v) => ({ modelId: v.modelId, customModel: v.modelId ? undefined : v.customModel, yearFrom: v.yearFrom, yearTo: v.yearTo })),
      publish: true,
      // Only the languages the seller changed by hand; the rest stay automatic.
      translations: editedLangs.size
        ? Object.fromEntries([...editedLangs].map((l) => [l, { name: translations[l]?.name ?? '', description: translations[l]?.description ?? '' }]))
        : undefined,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/v1/seller/inventory', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...body } : body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(apiError(data, t('errSave')));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errSave'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPhotos([]);
    setName('');
    setPrice('');
    setVehicles([]);
    setUniversal(false);
    setBrand('');
    setDescription('');
    setStock('1');
    setDiameter('');
    setSuggestion(null);
    setStudioCandidate(null);
    setDone(false);
    setPhotoModal(true);
  };

  // ---- screens -------------------------------------------------------------------------------------
  const shell = (children: React.ReactNode) => (
    <>
      <div className="mx-auto max-w-xl px-4 pb-28 pt-4 md:px-8 lg:max-w-6xl">{children}</div>
    </>
  );

  if (isLoading || loadingItem) {
    return shell(
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-gold-500" />
      </div>
    );
  }
  if (!user) {
    return shell(
      <div className="mt-10 text-center">
        <Link href={`/${locale}/login`} className={buttonClasses({ size: 'sm' })}>{t('login')}</Link>
      </div>
    );
  }
  if (!unlocked) return <SellerOnly />;

  if (done) {
    return shell(
      <div className="mt-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{editId ? t('savedEdit') : t('savedNew')}</h1>
        <div className="mt-7 flex flex-col gap-3">
          {!editId && (
            <button type="button" onClick={reset} className={buttonClasses({ size: 'md' })}>
              {t('addAnother')}
            </button>
          )}
          <Link href={`/${locale}/dashboard`} className="rounded-full bg-white/10 px-6 py-3.5 text-sm font-semibold text-white">
            {t('dashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return shell(
    <>
      <ProductPhotoModal
        isOpen={photoModal}
        onClose={() => {
          setPhotoModal(false);
          if (photos.length === 0 && !editId) router.push(`/${locale}/dashboard`);
        }}
        onPhoto={(d) => void addPhoto(d)}
        profile={profile}
        onProfileChange={changeProfile}
        onDone={() => setPhotoModal(false)}
      />

      <div className="mb-4 flex items-center justify-between">
        <Link href={`/${locale}/dashboard`} aria-label={t('back')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white/80 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <h1 className="text-balance font-heading text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-3xl">{editId ? t('titleEdit') : t('titleNew')}</h1>
        <span className="w-10" />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-8">
      {/* Photo */}
      <section className={`${cardCls} !p-3 md:!p-4 lg:sticky lg:top-6`}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface-1">
          {main ? (
            <>
              <img src={main.url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhotoModal(true)} className="absolute bottom-3 end-3 flex items-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur">
                <Camera className="h-4 w-4" />
                {t('retake')}
              </button>
              {main.kind === 'STUDIO' && <span className="absolute start-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-gold-500">{t('studioBadge')}</span>}
            </>
          ) : (
            <button type="button" onClick={() => setPhotoModal(true)} className="flex h-full w-full flex-col items-center justify-center gap-3 text-gold-500">
              {uploading > 0 ? <Loader2 className="h-9 w-9 animate-spin" /> : <Camera className="h-9 w-9" />}
              <span className="text-sm font-semibold">{uploading > 0 ? t('uploading') : t('takePhoto')}</span>
            </button>
          )}
        </div>

        {main && (
          <div className="mt-3 flex gap-2">
            {photos.slice(1).map((p) => (
              <div key={p.id} className="relative h-16 w-16 overflow-hidden rounded-xl bg-black">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label={t('remove')} onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))} className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {uploading > 0 && <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/[0.05]"><Loader2 className="h-4 w-4 animate-spin text-gold-500" /></div>}
            {photos.length < MAX_ITEM_IMAGES && (
              <button type="button" onClick={() => setPhotoModal(true)} aria-label={t('addPhoto')} className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed text-white/60 hover:text-white">
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {photos.length < SHOT_PLANS[profile].length && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-white/50">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
            {tTips('photos', { count: SHOT_PLANS[profile].length })}
          </p>
        )}

        {photoNotice && (
          <p className="mt-3 flex items-start gap-2 text-xs text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {photoNotice}
          </p>
        )}

        {main && main.kind !== 'STUDIO' && !studioCandidate && (
          <button type="button" onClick={() => void improveImage()} disabled={improvingImage} className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/45 transition hover:text-gold-500 disabled:opacity-50">
            {improvingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {t('studioImprove')}
          </button>
        )}
        {studioCandidate && (
          <div className="mt-3 rounded-2xl bg-gold-500/[0.06] p-3">
            <img src={studioCandidate.preview} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setStudioCandidate(null)} className="flex-1 rounded-full bg-white/10 py-2.5 text-xs font-semibold text-white">{t('useOriginal')}</button>
              <button
                type="button"
                onClick={() => {
                  const studio: PhotoEntry = { id: crypto.randomUUID(), url: studioCandidate.url, kind: 'STUDIO' };
                  setPhotos((prev) => [studio, ...prev].slice(0, MAX_ITEM_IMAGES));
                  setStudioCandidate(null);
                }}
                className={buttonClasses({ size: 'sm', className: 'flex-1' })}
              >
                {t('useStudio')}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-5 lg:mt-0 [&>section]:!mt-0">
      {/* Category */}
      <section className={cardCls}>
        <label className={labelCls} htmlFor="p-cat">{t('category')}</label>
        <SelectBox id="p-cat" value={category} onChange={(e) => setCategory(e.target.value as CatalogCategory)}>
          {CATALOG_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{tc(c.slug)}</option>
          ))}
        </SelectBox>
      </section>

      {/* Write in any language: AI polishes and translates on save */}
      <div className="flex items-start gap-3 rounded-3xl bg-gold-500/[0.07] p-4 text-xs leading-relaxed text-white/70">
        <Languages className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
        <p>{tTips('anyLanguage')}</p>
      </div>

      {/* Name + price */}
      <section className={`${cardCls} space-y-4`}>
        <div>
          <label className={labelCls} htmlFor="p-name">{t('name')}</label>
          <p className="-mt-1 mb-2 text-xs text-white/45">{tTips('nameFormula')}</p>
          <div className="relative">
            <input id="p-name" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} placeholder={tTips(`nameExample.${profile}`)} className={`${fieldCls} pe-12`} />
            {name.trim().length > 1 && (
              <button type="button" aria-label={t('improveText')} onClick={() => void improveText()} disabled={improvingText} className="absolute end-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white/35 transition hover:text-gold-500">
                {improvingText ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {suggestion && (
          <div className="rounded-2xl bg-gold-500/[0.06] p-4">
            <p className="text-sm font-semibold text-white">{suggestion.name}</p>
            {suggestion.description && <p className="mt-1 whitespace-pre-line text-sm text-white/70">{suggestion.description}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setSuggestion(null)} className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white">{t('no')}</button>
              <button
                type="button"
                onClick={() => {
                  if (suggestion.name) setName(suggestion.name);
                  if (suggestion.description) setDescription(suggestion.description);
                  setSuggestion(null);
                }}
                className={buttonClasses({ size: 'sm' })}
              >
                {t('accept')}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls} htmlFor="p-price">{t('price')}</label>
          <div className="flex gap-2">
            <input id="p-price" type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={fieldCls} />
            <SelectBox value={currency} onChange={(e) => setCurrency(e.target.value as (typeof PRICE_CURRENCIES)[number])} aria-label={t('currency')} className="w-32 shrink-0">
              {PRICE_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectBox>
          </div>
          <p className="mt-2 text-xs text-white/45">{tTips('price')}</p>
        </div>
      </section>

      {/* Fitment */}
      <section className={cardCls}>
        <label className={labelCls}>{t('whichCar')}</label>
        {!pickCars && !universal && vehicles.length === 0 ? (
          <>
            <button type="button" onClick={() => setPickCars(true)} className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3.5 text-start text-base text-white/50">
              {t('chooseCar')}
              <ChevronDown className="h-4 w-4" />
            </button>
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-white/75">
              <input type="checkbox" checked={universal} onChange={(e) => setUniversal(e.target.checked)} className="h-4 w-4 accent-gold-500" />
              {t('fitsAll')}
            </label>
          </>
        ) : (
          <div className="space-y-3">
            {!universal && <VehiclePicker value={vehicles} onChange={setVehicles} />}
            <label className="flex cursor-pointer items-center gap-3 text-sm text-white/75">
              <input type="checkbox" checked={universal} onChange={(e) => setUniversal(e.target.checked)} className="h-4 w-4 accent-gold-500" />
              {t('fitsAll')}
            </label>
          </div>
        )}
      </section>

      {/* More */}
      <section className={cardCls}>
        <button type="button" onClick={() => setMore((m) => !m)} className="flex w-full items-center justify-between text-sm font-semibold text-white/75 hover:text-white">
          {t('more')}
          <ChevronDown className={`h-4 w-4 text-gold-500 transition ${more ? 'rotate-180' : ''}`} />
        </button>
        {more && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="p-brand">{t('brand')}</label>
                <input id="p-brand" value={brand} maxLength={100} onChange={(e) => setBrand(e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="p-stock">{t('stock')}</label>
                <input id="p-stock" type="number" inputMode="numeric" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={fieldCls} />
              </div>
            </div>
            {category === 'wheels' && (
              <div>
                <label className={labelCls} htmlFor="p-diam">{t('diameter')}</label>
                <SelectBox id="p-diam" value={diameter} onChange={(e) => setDiameter(e.target.value)}>
                  <option value="">—</option>
                  {Array.from({ length: 17 }, (_, i) => 13 + i).map((d) => (
                    <option key={d} value={d}>R{d}</option>
                  ))}
                </SelectBox>
              </div>
            )}
            {category === 'wrap_paint' && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-white/55" htmlFor="sw">{t('color')}</label>
                <input id="sw" type="color" value={swatch} onChange={(e) => setSwatch(e.target.value)} className="h-10 w-16 cursor-pointer rounded-lg bg-transparent" />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="p-desc">{t('description')}</label>
              <p className="-mt-1 mb-2 text-xs text-white/45">{tTips('descIntro')}</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {tTips(`descFields.${profile}`)
                  .split('|')
                  .map((field) => {
                    const used = description.toLowerCase().includes(`${field.toLowerCase()}:`);
                    return (
                      <button
                        key={field}
                        type="button"
                        disabled={used}
                        onClick={() => {
                          setDescription((d) => `${d.trimEnd()}${d.trim() ? '\n' : ''}${field}: `.slice(0, 1500));
                          requestAnimationFrame(() => {
                            const el = document.getElementById('p-desc') as HTMLTextAreaElement | null;
                            el?.focus();
                            el?.setSelectionRange(el.value.length, el.value.length);
                          });
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${used ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white'}`}
                      >
                        {used ? '✓ ' : '+ '}
                        {field}
                      </button>
                    );
                  })}
              </div>
              <textarea id="p-desc" value={description} maxLength={1500} rows={5} onChange={(e) => setDescription(e.target.value)} placeholder={tTips('descPlaceholder')} className={`${fieldCls} resize-y`} />
              <p className="mt-2 text-xs text-white/45">{tTips('honest')}</p>
            </div>
          </div>
        )}
      </section>

      {/* Translations (edit mode): the listing is translated automatically; the seller can correct any language */}
      {editId && (
        <section className={cardCls}>
          <h2 className="text-sm font-semibold text-white/75">{t('trTitle')}</h2>
          <p className="mt-1 text-xs text-white/45">{t('trHint')}</p>
          {ITEM_LOCALES.filter((l) => l !== sourceLang && translations[l]).length === 0 ? (
            <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs text-white/55">{t('trPending')}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {ITEM_LOCALES.filter((l) => l !== sourceLang && translations[l]).map((l) => {
                const tr = translations[l]!;
                const edit = (patch: { name?: string; description?: string }) => {
                  setTranslations((prev) => ({ ...prev, [l]: { ...prev[l], ...patch } }));
                  setEditedLangs((prev) => new Set(prev).add(l));
                };
                return (
                  <div key={l} className="rounded-2xl bg-white/[0.04] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{LANGUAGE_NAMES[l]}</span>
                      <span className="text-[11px] text-white/45">{tr.manual || editedLangs.has(l) ? t('trManual') : t('trAuto')}</span>
                    </div>
                    <input aria-label={t('trName')} value={tr.name ?? ''} maxLength={150} onChange={(e) => edit({ name: e.target.value })} dir={l === 'ar' ? 'rtl' : 'ltr'} className={`${fieldCls} !py-2.5 !text-sm`} />
                    <textarea aria-label={t('trDesc')} value={tr.description ?? ''} maxLength={1500} rows={2} onChange={(e) => edit({ description: e.target.value })} dir={l === 'ar' ? 'rtl' : 'ltr'} className={`${fieldCls} mt-2 resize-y !py-2.5 !text-sm`} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(var(--dock-h,72px)+12px)] z-30 px-4 md:bottom-6 md:ps-28">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || uploading > 0}
          className={buttonClasses({ size: 'lg', fullWidth: true, className: 'mx-auto max-w-xl' })}
        >
          {saving && <Loader2 className="h-5 w-5 animate-spin" />}
          {editId ? t('save') : t('publish')}
        </button>
      </div>
    </>
  );
}

// useSearchParams lives inside Suspense so the page can be prebuilt and prefetched.
export default function SellerNewPartPage() {
  return (
    <React.Suspense fallback={null}>
      <SellerNewPartPageInner />
    </React.Suspense>
  );
}
