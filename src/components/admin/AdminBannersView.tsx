'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { buttonClasses } from '@/components/ui';
import { BANNER_FRAME } from '@/features/shop/ShopBanner';
import { ErrorState, Field, PageHeader, Spinner, Surface, dateTime, fieldClass, useAdminApi, useAdminData, useToast } from './ui';

interface Banner {
  imageUrl: string;
  linkUrl: string | null;
  alt: string;
  isActive: boolean;
  updatedAt: string;
}

const MAX_WIDTH = 1600;

/** Shrinks the picture in the browser (JPEG, max 1600px wide) so the upload stays small and fast. */
async function prepareImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = url;
    });
    const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Admin: the advertising banner shown in the shop. */
export function AdminBannersView() {
  const t = useTranslations('adm.banners');
  const tc = useTranslations('adm.common');
  const api = useAdminApi();
  const toast = useToast();
  const { data, error, loading, reload } = useAdminData<{ banner: Banner | null }>('/api/v1/admin/banners?slot=shop');

  const [picked, setPicked] = React.useState<string | null>(null);
  const [link, setLink] = React.useState('');
  const [alt, setAlt] = React.useState('');
  const [active, setActive] = React.useState(true);
  const [busy, setBusy] = React.useState<'save' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const saved = data?.banner ?? null;
  React.useEffect(() => {
    if (!data) return;
    setLink(data.banner?.linkUrl ?? '');
    setAlt(data.banner?.alt ?? '');
    setActive(data.banner?.isActive ?? true);
    setPicked(null);
    setConfirmRemove(false);
  }, [data]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast.show(t('badType'), 'err');
    try {
      setPicked(await prepareImage(file));
    } catch {
      toast.show(t('badImage'), 'err');
    }
  };

  const save = async () => {
    if (!picked && !saved) return toast.show(t('needImage'), 'err');
    setBusy('save');
    try {
      await api('/api/v1/admin/banners', {
        method: 'PUT',
        body: JSON.stringify({ slot: 'shop', ...(picked ? { image: picked } : {}), linkUrl: link.trim() || null, alt: alt.trim(), isActive: active }),
      });
      toast.show(t('saved'));
      await reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : tc('errGeneric'), 'err');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      await api('/api/v1/admin/banners?slot=shop', { method: 'DELETE' });
      toast.show(t('removed'));
      await reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : tc('errGeneric'), 'err');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const preview = picked ?? saved?.imageUrl ?? null;
  const dirty = Boolean(picked) || (saved ? link.trim() !== (saved.linkUrl ?? '') || alt.trim() !== saved.alt || active !== saved.isActive : false);

  return (
    <div>
      {toast.node}
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Surface className="p-4 sm:p-5">
        <p className="mb-3 text-xs font-semibold text-white/55">{t('preview')}</p>
        <div className="mx-auto max-w-md">
          <div className={BANNER_FRAME}>
            {preview ? (
              <img src={preview} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/45 transition hover:text-white/70">
                <ImagePlus className="h-8 w-8" strokeWidth={1.5} />
                <span className="text-sm font-medium">{t('empty')}</span>
              </button>
            )}
            {saved && !saved.isActive && !picked && (
              <span className="absolute start-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white/80">{t('hidden')}</span>
            )}
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-md text-xs text-white/40">{t('sizeHint')}</p>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
        <div className="mx-auto mt-4 flex max-w-md flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className={buttonClasses({ variant: 'quiet', size: 'md' })}>
            <ImagePlus className="h-4 w-4" />
            {preview ? t('replace') : t('choose')}
          </button>
          {picked && (
            <button type="button" onClick={() => setPicked(null)} className={buttonClasses({ variant: 'ghost', size: 'md' })}>
              {t('undo')}
            </button>
          )}
        </div>
      </Surface>

      <Surface className="mt-4 space-y-4 p-4 sm:p-5">
        <Field label={t('link')}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… / /shop" inputMode="url" autoCapitalize="none" spellCheck={false} className={fieldClass} />
        </Field>
        <p className="-mt-2 text-xs text-white/40">{t('linkHint')}</p>
        <Field label={t('alt')}>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={160} className={fieldClass} />
        </Field>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-white/[0.04] px-4 py-3">
          <span className="text-sm font-semibold text-white">{t('active')}</span>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-[#FDC902]" />
        </label>
        {saved && <p className="text-xs text-white/40">{t('updated', { at: dateTime(saved.updatedAt) })}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={busy !== null || (!picked && !saved) || (saved !== null && !dirty)} className={buttonClasses({ size: 'md' })}>
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy === 'save' ? tc('saving') : t('save')}
          </button>
          {saved && !confirmRemove && (
            <button type="button" onClick={() => setConfirmRemove(true)} disabled={busy !== null} className={buttonClasses({ variant: 'ghost', size: 'md' })}>
              <Trash2 className="h-4 w-4" />
              {t('remove')}
            </button>
          )}
          {saved && confirmRemove && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-white/70">{t('removeAsk')}</span>
              <button type="button" onClick={remove} disabled={busy !== null} className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy === 'remove' ? tc('saving') : t('removeYes')}
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="rounded-full px-3 py-2 text-sm font-semibold text-white/60 hover:text-white">
                {t('removeNo')}
              </button>
            </span>
          )}
        </div>
      </Surface>
    </div>
  );
}
