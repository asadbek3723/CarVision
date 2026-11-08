'use client';

/**
 * Installing CarVision (a PWA) with as little effort as each platform allows.
 *
 * - Chrome / Edge / Samsung on Android and desktop: the browser's own one-tap install dialog
 *   (`beforeinstallprompt`, captured early by the inline script in the locale layout).
 * - iPhone / iPad: Apple gives web pages no way to install themselves, so the shortest path is a
 *   two-step "Share -> Add to Home Screen" guide.
 * - In-app browsers (Telegram, Instagram, Facebook...): cannot install at all; open in Safari.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    /** Captured by the inline script in the locale layout, before React hydrates. */
    __cvDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type InstallPlatform =
  | 'installed'
  | 'prompt'
  | 'ios-safari'
  | 'ios-other'
  | 'in-app'
  | 'android-manual'
  | 'desktop-manual';

export const OPEN_INSTALL_EVENT = 'cv:open-install';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  );
}

export function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iPadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1; // iPadOS 13+ reports a Mac
  return /iphone|ipad|ipod/i.test(ua) || iPadOs;
}

/** Social / messenger in-app browsers: they cannot add anything to the home screen. */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Telegram|TikTok|BytedanceWebview|musical_ly|Snapchat|Twitter|LinkedInApp/i.test(ua)) return true;
  // On iOS every real browser (Safari, Chrome, Firefox, Edge) carries the "Safari/" token; a bare
  // WKWebView inside another app does not.
  return isIos() && !/Safari\//.test(ua);
}

export function detectInstallPlatform(): InstallPlatform {
  if (typeof window === 'undefined') return 'desktop-manual';
  if (isStandalone()) return 'installed';
  if (window.__cvDeferredPrompt) return 'prompt';
  if (isInAppBrowser()) return 'in-app';
  if (isIos()) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(window.navigator.userAgent) ? 'ios-other' : 'ios-safari';
  if (/Android/i.test(window.navigator.userAgent)) return 'android-manual';
  return 'desktop-manual';
}

/**
 * The one entry point for every "Install the app" button. Must be called from the tap itself:
 * the browser only opens its install dialog inside a user gesture.
 * Resolves to true when the app was installed.
 */
export async function startInstall(): Promise<boolean> {
  const promptEvent = typeof window !== 'undefined' ? window.__cvDeferredPrompt : null;
  if (promptEvent) {
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      // A prompt works once; the browser fires a fresh event if the app is still installable.
      window.__cvDeferredPrompt = null;
      window.dispatchEvent(new Event('cv:installable'));
      return choice.outcome === 'accepted';
    } catch {
      window.__cvDeferredPrompt = null;
    }
  }
  window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
  return false;
}
