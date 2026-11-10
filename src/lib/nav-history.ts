/**
 * The in-app path the user was on before the current one (client-side navigations only).
 * Lets a page's back button use the browser history when the user came from inside the app,
 * and fall back to a fixed list page when the page was opened directly (shared link, reload).
 *
 * It also keeps a small stack of the screens behind the current one, so a back swipe knows which
 * screen it really lands on (after part A → part B → back, going back again lands on A, not B).
 */
let current: string | null = null;
let previous: string | null = null;
let stack: string[] = [];
/** Where in `stack` the current screen is (back / forward move it, a new screen cuts what was ahead). */
let at = -1;
/** Path the last back / forward went to (a popstate that stayed on the same path changes nothing). */
let popPath: string | null = null;

if (typeof window !== 'undefined') {
  // The browser's back / forward (and router.back()) fire popstate before the new route renders.
  window.addEventListener('popstate', () => {
    popPath = window.location.pathname;
  });
}

export function rememberPath(path: string): void {
  if (path === current) return;
  previous = current;
  current = path;
  if (popPath === path) {
    popPath = null;
    // Back lands just behind, forward just ahead; anything else is a jump we cannot place.
    if (stack[at - 1] === path) at -= 1;
    else if (stack[at + 1] === path) at += 1;
    else {
      stack = [path];
      at = 0;
    }
  } else {
    popPath = null;
    stack = stack.slice(0, at + 1);
    stack.push(path);
    if (stack.length > 40) stack = stack.slice(-40);
    at = stack.length - 1;
  }
}

export function previousPath(): string | null {
  return previous;
}

/** The screen a back step lands on, when the app knows it. */
export function backPath(): string | null {
  return at > 0 ? (stack[at - 1] ?? null) : null;
}

/** True while the route change in progress came from back / forward (read it before rememberPath runs). */
export function isPopNavigation(path?: string): boolean {
  return popPath !== null && (path === undefined || popPath === path);
}
