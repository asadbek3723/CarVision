/**
 * "Come back here after signing in". A guest who is sent to the login page keeps their place:
 * the page they were on travels in `?next=` and login / register return to it.
 */

/** Link to the login page that returns to `next` (a path inside the app, with its query). */
export function loginHref(locale: string, next?: string | null): string {
  const base = `/${locale}/login`;
  const safe = safeNext(next, locale);
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base;
}

/**
 * Accepts only a path of this app in the current language (`/uz/...`), never another site:
 * anything else is dropped so `?next=` cannot be used to send people elsewhere.
 */
export function safeNext(next: string | null | undefined, locale: string): string | null {
  if (!next) return null;
  if (!next.startsWith(`/${locale}/`)) return null;
  if (next.includes('//') || next.includes('\\') || next.includes('\n') || next.includes('\r')) return null;
  const path = next.split(/[?#]/)[0] ?? '';
  if (path === `/${locale}/login` || path === `/${locale}/register`) return null;
  return next;
}

/** The current page (path + query), for `loginHref`. Client only. */
export function currentPath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname + window.location.search;
}

/** The safe `?next=` of the page being shown (login / register), or null. Client only. */
export function readNext(locale: string): string | null {
  if (typeof window === 'undefined') return null;
  return safeNext(new URLSearchParams(window.location.search).get('next'), locale);
}

/** Keeps `?next=` when moving between the login and register pages. */
export function withNext(href: string, locale: string): string {
  const next = readNext(locale);
  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
}
