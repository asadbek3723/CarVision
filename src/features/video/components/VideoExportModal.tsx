'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { exportReelVideo } from '../engine/webcodecs-encoder';
import { Video, Share2, Download, CheckCircle2 } from 'lucide-react';

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
        // Fallback to direct download
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
      description="Renders an 11-second 60 FPS Instagram Reel / TikTok video directly on your device."
    >
      <div className="space-y-4 p-1">
        {videoBlobUrl ? (
          <div className="space-y-3">
            <div className="relative aspect-[9/16] max-h-[380px] rounded-2xl overflow-hidden bg-black mx-auto border border-[#232733] shadow-lg">
              <video
                src={videoBlobUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-accent-green font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Ready for Instagram Reels & TikTok!
            </div>

            <div className="flex gap-3">
              <Button onClick={handleShare} variant="primary" className="flex-1 h-12 shadow-glow">
                <Share2 className="w-4 h-4 me-2" /> Share Reel
              </Button>
              <a href={videoBlobUrl} download="carvision-tuning-reel.mp4" className="flex-1">
                <Button variant="secondary" className="w-full h-12">
                  <Download className="w-4 h-4 me-2" /> Download
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#0A0B0F] border border-[#232733] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-cyan/10 text-accent-cyan flex items-center justify-center mx-auto">
              <Video className="w-8 h-8" />
            </div>

            {isRendering ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>Encoding frames on device...</span>
                  <span className="font-mono font-bold text-accent-cyan">{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#181B22] overflow-hidden">
                  <div
                    className="h-full bg-accent-cyan transition-all duration-200 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#94A3B8]">0$ cloud cost • 808 bass-drop synchronized</p>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-bold text-white mb-1">High-Energy Phonk Edit</h4>
                <p className="text-xs text-[#94A3B8] mb-4">
                  Sequences your rendered 4K angles with whip-pan transitions and viral CarVision outro branding.
                </p>
                <Button onClick={handleStartExport} variant="primary" className="w-full h-12 shadow-glow">
                  <Video className="w-4 h-4 me-2" /> Generate Video Reel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
