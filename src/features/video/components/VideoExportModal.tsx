'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { exportReelVideo } from '../engine/webcodecs-encoder';
import { Video, Share2, Download, CheckCircle2, Sparkles, Film } from 'lucide-react';

export interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  angleImageUrls: string[];
  shopName?: string;
}

export function VideoExportModal({
  isOpen,
  onClose,
  angleImageUrls,
  shopName = 'Verified Workshop'
}: VideoExportModalProps) {
  const [isRendering, setIsRendering] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = React.useState<string | null>(null);

  const handleStartExport = async () => {
    setIsRendering(true);
    setProgress(0);
    setVideoBlobUrl(null);

    try {
      const blob = await exportReelVideo({
        angleImageUrls,
        shopName,
        fps: 30,
        durationSeconds: 11.0,
        onProgress: (p) => setProgress(p),
      });

      const url = URL.createObjectURL(blob);
      setVideoBlobUrl(url);

      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try {
          navigator.vibrate([30, 60, 30]);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Video rendering error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  const handleShare = async () => {
    if (!videoBlobUrl) return;

    try {
      if (navigator.share) {
        const response = await fetch(videoBlobUrl);
        const blob = await response.blob();
        const file = new File([blob], 'carvision-tuning-reel.mp4', { type: blob.type });

        await navigator.share({
          title: 'CarVision 4K Tuning Reel',
          text: `Check out my car modifications at ${shopName}! #CarVision #AutoTuning`,
          files: [file],
        });
      } else {
        // Direct download fallback
        const a = document.createElement('a');
        a.href = videoBlobUrl;
        a.download = 'carvision-tuning-reel.mp4';
        a.click();
      }
    } catch (err) {
      console.warn('Share cancelled or not supported:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cinematic 0$ Video Reel"
      description="Renders a 9:16 vertical 60 FPS Instagram Reel &amp; TikTok video directly on your device GPU."
    >
      <div className="space-y-4 p-1">
        {videoBlobUrl ? (
          <div className="space-y-3.5">
            {/* Phone Bezel Preview Container */}
            <div className="relative aspect-[9/16] max-h-[380px] rounded-3xl overflow-hidden bg-black mx-auto border-2 border-white/15 shadow-[0_0_35px_rgba(0,0,0,0.9)]">
              <video
                src={videoBlobUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#00E599] font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#00E599]" />
              <span>Ready for Instagram Reels, TikTok &amp; YouTube Shorts!</span>
            </div>

            <div className="flex gap-3 pt-1">
              <Button onClick={handleShare} variant="primary" className="flex-1 h-12 shadow-glow font-bold">
                <Share2 className="w-4 h-4 me-2" />
                <span>Share Reel</span>
              </Button>
              <a href={videoBlobUrl} download="carvision-tuning-reel.mp4" className="flex-1">
                <Button variant="secondary" className="w-full h-12 font-bold">
                  <Download className="w-4 h-4 me-2" />
                  <span>Download MP4</span>
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="p-7 sm:p-9 rounded-2xl bg-[#0A0B0F] border border-white/10 text-center space-y-5 shadow-2xl relative overflow-hidden">
            {/* Ambient Cyan Halo */}
            <div className="absolute top-0 start-1/2 -translate-x-1/2 w-48 h-20 bg-[#19D3FF]/10 blur-2xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#19D3FF]/20 to-[#12141A] border border-[#19D3FF]/30 text-[#19D3FF] flex items-center justify-center mx-auto shadow-glow">
              <Film className="w-8 h-8" />
            </div>

            {isRendering ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-[#94A3B8] font-mono">
                  <span>Rendering on-device frames...</span>
                  <span className="font-bold text-[#19D3FF] tabular-nums">{progress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#181B22] overflow-hidden p-0.5 border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-[#19D3FF] transition-all duration-200 rounded-full shadow-[0_0_12px_#19D3FF]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#94A3B8] font-mono">
                  0$ Server Cost • 808 Bass-Drop Synchronized
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-base font-bold text-white mb-1.5 flex items-center justify-center gap-2">
                  <span>Dynamic 360° Phonk Edit</span>
                  <Sparkles className="w-4 h-4 text-[#19D3FF]" />
                </h4>
                <p className="text-xs text-[#94A3B8] mb-5 leading-relaxed max-w-sm mx-auto">
                  Automatically sequences your rendered 4K car angles with whip-pan camera shakes and shop outro branding.
                </p>
                <Button
                  onClick={handleStartExport}
                  variant="primary"
                  size="lg"
                  className="w-full shadow-glow font-bold"
                >
                  <Video className="w-4 h-4 me-2" />
                  <span>Generate 11s Video Reel</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
