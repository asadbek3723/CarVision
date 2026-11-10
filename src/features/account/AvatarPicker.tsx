'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { loadImageFromBlob } from '@/features/seller/lib/image-tools';
import { toast } from '@/components/ui/Toaster';
import { initialsOf } from '@/features/account/preferences';

const SIZE = 512;

/** Crops the picture square from the middle and shrinks it to 512 px, as a JPEG. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const img = await loadImageFromBlob(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  if (!blob) throw new Error('encode');
  return blob;
}

/**
 * The profile photo: tap to choose one from the gallery (or take one with the camera). The picture
 * is cropped square and uploaded at once; a remove link brings the initials back.
 */
export function AvatarPicker({ name }: { name: string }) {
  const t = useTranslations('profilePage');
  const { user, refreshProfile } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  const photo = preview ?? user?.avatar_url ?? null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const jpeg = await toSquareJpeg(file);
      const local = URL.createObjectURL(jpeg);
      setPreview(local); // shown at once, before the upload finishes
      const form = new FormData();
      form.append('file', new File([jpeg], 'avatar.jpg', { type: 'image/jpeg' }));
      const res = await fetch('/api/v1/auth/avatar', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error('upload');
      await refreshProfile();
      toast.success(t('photoUpdated'));
    } catch {
      toast.error(t('photoFailed'));
    } finally {
      setPreview(null);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/v1/auth/avatar', { method: 'DELETE' });
      if (!res.ok) throw new Error('remove');
      await refreshProfile();
    } catch {
      toast.error(t('photoFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 pb-6 pt-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={photo ? t('changePhoto') : t('addPhoto')}
        className="group relative h-28 w-28 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDC902]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
      >
        <span className="absolute inset-0 overflow-hidden rounded-full bg-[#FDC902] ring-1 ring-white/10">
          {photo ? (
            <img src={photo} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <span className="grid h-full w-full place-items-center text-[40px] font-semibold uppercase text-[#0A0A0A]">{initialsOf(name)}</span>
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-black/45">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </span>
          )}
        </span>
        <span className="absolute -bottom-0.5 -end-0.5 grid h-9 w-9 place-items-center rounded-full border-2 border-[#0A0A0A] bg-[#FDC902] text-[#0A0A0A] transition group-active:scale-95">
          <Camera className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
      </button>
      {/* No `capture`: the phone offers the photo library, the camera and files. */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      <div className="flex items-center gap-4 text-[14px] font-medium">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="text-[#FDC902] transition hover:brightness-125 disabled:opacity-50">
          {photo ? t('changePhoto') : t('addPhoto')}
        </button>
        {user?.avatar_url && (
          <button type="button" onClick={() => void remove()} disabled={busy} className="text-[#9A9A9A] transition hover:text-white disabled:opacity-50">
            {t('removePhoto')}
          </button>
        )}
      </div>
    </div>
  );
}
