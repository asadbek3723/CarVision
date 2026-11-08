/**
 * The in-app path the user was on before the current one (client-side navigations only).
 * Lets a page's back button use the browser history when the user came from inside the app,
 * and fall back to a fixed list page when the page was opened directly (shared link, reload).
 */
let current: string | null = null;
let previous: string | null = null;

export function rememberPath(path: string): void {
  if (path === current) return;
  previous = current;
  current = path;
}

export function previousPath(): string | null {
  return previous;
}
