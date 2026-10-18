'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Smartphone, Check, Copy } from 'lucide-react';
import { LuxuryQrCode } from '@/components/ui/LuxuryQrCode';

export interface QrCameraBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  bridgeToken: string;
}

export function QrCameraBridgeModal({
  isOpen,
  onClose,
  sessionId,
  bridgeToken
}: QrCameraBridgeModalProps) {
  const [copied, setCopied] = React.useState(false);

  const bridgeUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/camera-bridge/${bridgeToken}?session=${sessionId}`
    : `/camera-bridge/${bridgeToken}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bridgeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Continue on Phone Camera"
      description="Scan with your phone to take high-resolution vehicle photos and beam them instantly to this screen."
    >
      <div className="flex flex-col items-center justify-center p-4">
        {/* QR Code Container */}
        <div className="p-4 rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6 flex items-center justify-center">
          <LuxuryQrCode
            value={bridgeUrl}
            size={192}
            className="rounded-xl"
          />
        </div>

        {/* Instructions */}
        <div className="flex items-center gap-3 text-xs text-[#94A3B8] mb-6 max-w-xs text-center">
          <Smartphone className="w-5 h-5 text-accent-cyan shrink-0" />
          <span>No installation needed — opens directly in your phone browser</span>
        </div>

        {/* Copy Link Button */}
        <div className="w-full flex gap-3">
          <Button onClick={handleCopy} variant="secondary" className="flex-1">
            {copied ? (
              <>
                <Check className="w-4 h-4 me-2 text-green-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 me-2" /> Copy Link
              </>
            )}
          </Button>
          <Button onClick={onClose} variant="primary" className="flex-1">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
