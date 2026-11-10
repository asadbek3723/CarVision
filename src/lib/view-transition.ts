/**
 * Shared-element page transitions (View Transitions API): a tapped card's photo grows into the part
 * page's photo. Browsers without the API (and people who asked for reduced motion) get the normal
 * navigation; nothing else changes.
 */
export const PRODUCT_IMAGE_VT = 'cv-product-image';

type Push = (href: string) => void;
type VtDocument = Document & { startViewTransition?: (cb: () => Promise<void> | void) => { finished: Promise<unknown> } };

let release: (() => void) | null = null;

export function canViewTransition(): boolean {
  if (typeof document === 'undefined') return false;
  if (typeof (document as VtDocument).startViewTransition !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The destination page calls this once its photo is on screen; the transition then plays. */
export function viewTransitionReady(): void {
  release?.();
  release = null;
}

/**
 * Navigates with the card's photo as the shared element. `source` is the photo box that is leaving.
 * Returns false when it could not start (caller should navigate normally).
 */
export function navigateWithTransition(push: Push, href: string, source: HTMLElement | null): boolean {
  if (!source || !canViewTransition()) return false;
  const doc = document as VtDocument;
  const root = document.documentElement;
  source.style.viewTransitionName = PRODUCT_IMAGE_VT;
  root.dataset['vt'] = '1';
  try {
    const t = doc.startViewTransition!(
      () =>
        new Promise<void>((resolve) => {
          // The old picture is already captured: free the name so the new page can own it.
          source.style.viewTransitionName = '';
          release = resolve;
          push(href);
          // Never leave the screen frozen if the page is slow to appear.
          window.setTimeout(viewTransitionReady, 900);
        })
    );
    const done = () => {
      delete root.dataset['vt'];
      source.style.viewTransitionName = '';
    };
    void t.finished.then(done, done);
    return true;
  } catch {
    source.style.viewTransitionName = '';
    delete root.dataset['vt'];
    return false;
  }
}
