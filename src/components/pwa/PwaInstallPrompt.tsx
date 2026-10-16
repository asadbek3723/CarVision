'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(true); // start closed until check

  useEffect(() => {
    // Check if running in standalone mode already
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && Boolean((window.navigator as unknown as { standalone: boolean }).standalone));

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Check dismissed in session
    const isDismissed = sessionStorage.getItem('cv_pwa_dismissed') === 'true';
    if (isDismissed) return;

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      setDismissed(false);
      return;
    }

    // Android / Desktop Chrome handler
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('cv_pwa_dismissed', 'true');
  };

  if (isStandalone || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-4 start-4 end-4 md:start-auto md:end-6 md:w-96 z-50 bg-[#12141A]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 shadow-2xl shadow-cyan-500/10 text-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-[#19D3FF]">
            <Download className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white tracking-wide">Install CarVision App</h4>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              {isIos
                ? 'Install for high-speed offline camera access and full-screen studio.'
                : 'Add to your home screen for low-latency tablet garage workflow.'}
            </p>

            {isIos ? (
              <div className="mt-3 bg-neutral-900/80 rounded-lg p-2.5 border border-white/5 space-y-1.5 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-[#19D3FF] flex items-center justify-center font-bold text-[10px]">
                    1
                  </span>
                  <span>Tap share icon in browser</span>
                  <Share2 className="w-3.5 h-3.5 text-[#19D3FF] ms-auto shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-[#19D3FF] flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                  <span>Select &quot;Add to Home Screen&quot;</span>
                  <PlusSquare className="w-3.5 h-3.5 text-neutral-400 ms-auto shrink-0" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="mt-3 w-full py-2 px-3 rounded-lg bg-[#19D3FF] hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Install to Home Screen
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg shrink-0"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
