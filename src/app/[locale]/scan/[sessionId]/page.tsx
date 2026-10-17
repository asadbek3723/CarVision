'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { SmartCameraLandscapeView } from '@/features/camera/components/SmartCameraLandscapeView';
import type { CompressResult } from '@/features/camera/lib/image-compressor';
import { CheckCircle2, Monitor, Sparkles } from 'lucide-react';

export default function MobileScanSessionPage() {
  const params = useParams();
  const sessionId = params?.['sessionId'] as string;

  const [isTransferred, setIsTransferred] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  // Send heartbeat / connection notification
  React.useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/v1/camera-session/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'connected' }),
    }).catch(() => {});
  }, [sessionId]);

  const handlePhotoCaptured = (result: CompressResult, angleId: number) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl && sessionId) {
        try {
          await fetch(`/api/v1/camera-session/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'captured',
              imageUrl: dataUrl,
              angleId,
            }),
          });
        } catch {
          // Network retry or offline
        }
      }
      setIsUploading(false);
      setIsTransferred(true);
    };
    reader.readAsDataURL(result.blob);
  };

  if (isTransferred) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080B] p-6 text-center text-white">
        <div className="relative mb-6">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#242735] to-[#12141A] border-2 border-[#D4AE62] shadow-[0_0_36px_rgba(212,174,98,0.5)]">
            <CheckCircle2 className="h-12 w-12 text-[#D4AE62]" />
          </div>
          <span className="absolute -top-1 -end-1">
            <Sparkles className="h-6 w-6 text-[#D4AE62] animate-bounce" />
          </span>
        </div>

        <h1 className="font-display text-xl sm:text-2xl font-light tracking-[0.25em] text-[#EDE8DF] uppercase">
          Kadr Kompyuterga Uzatildi
        </h1>

        <p className="mt-3 max-w-xs font-display text-xs sm:text-sm font-light tracking-wider text-[#D4AE62] leading-relaxed">
          Surat 4K Studio visualizerga muvaffaqiyatli qabul qilindi.
        </p>

        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-[#12141A] border border-[#D4AE62]/20 px-6 py-4 shadow-card">
          <Monitor className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium tracking-wide text-white">
            Endi ishingizni kompyuterda davom ettiring
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <SmartCameraLandscapeView
        onPhotoCaptured={handlePhotoCaptured}
        className="w-full h-full"
      />

      {isUploading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="h-16 w-16 rounded-full border-2 border-[#D4AE62]/20 border-t-[#D4AE62] animate-spin" />
          <p className="mt-4 text-xs font-mono tracking-wider text-[#D4AE62]">
            Kompyuterga uzatilmoqda...
          </p>
        </div>
      )}
    </div>
  );
}
