'use client';

import * as React from 'react';

export type CartItems = Record<string, number>;
interface SavedCart {
  items: CartItems;
  unselected: string[];
}

const SAVE_DELAY_MS = 600;

const key = (c: SavedCart) => JSON.stringify({ items: c.items, unselected: [...c.unselected].sort() });

async function fetchSaved(): Promise<SavedCart | null> {
  try {
    const res = await fetch('/api/v1/cart', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; cart?: SavedCart };
    return data.success && data.cart ? { items: data.cart.items ?? {}, unselected: data.cart.unselected ?? [] } : null;
  } catch {
    return null;
  }
}

/** Server cart plus this device's cart: every line from both, the larger quantity when both have it. */
export function mergeCarts(server: SavedCart, local: SavedCart): SavedCart {
  const items: CartItems = { ...server.items };
  for (const [id, q] of Object.entries(local.items)) items[id] = Math.min(999, Math.max(items[id] ?? 0, q));
  const unselected = [...new Set([...server.unselected, ...local.unselected])].filter((id) => id in items);
  return { items, unselected };
}

/**
 * Keeps the cart in the user's account, so it is the same on every device:
 *  - on sign-in the saved cart and this device's cart are merged (a guest cart is not lost);
 *  - every change is saved a moment later;
 *  - coming back to the app (tab focus, phone unlocked) picks up changes made on another device;
 *  - on sign-out this device's copy is cleared, so the next person does not see it.
 * Guests and offline use keep working from the local copy.
 */
export function useCartSync({
  userId,
  hydrated,
  cart,
  unselected,
  apply,
}: {
  userId: string | null;
  hydrated: boolean;
  cart: CartItems;
  unselected: string[];
  /** Replaces the cart on this device (state and local storage). */
  apply: (next: SavedCart) => void;
}) {
  const [syncedFor, setSyncedFor] = React.useState<string | null>(null);
  const lastSaved = React.useRef<string>('');
  const saveTimer = React.useRef<number | null>(null);
  const prevUser = React.useRef<string | null>(null);
  const latest = React.useRef<SavedCart>({ items: cart, unselected });
  latest.current = { items: cart, unselected };

  // Sign-in on this device: merge once per account.
  React.useEffect(() => {
    if (!hydrated || !userId || syncedFor === userId) return;
    let cancelled = false;
    void (async () => {
      const saved = await fetchSaved();
      if (cancelled || !saved) return; // offline or not signed in after all: try again later
      lastSaved.current = key(saved);
      const merged = mergeCarts(saved, latest.current);
      if (key(merged) !== key(latest.current)) apply(merged);
      setSyncedFor(userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId, syncedFor, apply]);

  // Sign-out: forget this device's copy of the account cart.
  React.useEffect(() => {
    if (prevUser.current && !userId) {
      setSyncedFor(null);
      lastSaved.current = '';
      apply({ items: {}, unselected: [] });
    }
    prevUser.current = userId;
  }, [userId, apply]);

  // Save every change (debounced).
  React.useEffect(() => {
    if (!userId || syncedFor !== userId) return;
    const current = { items: cart, unselected: unselected.filter((id) => id in cart) };
    const k = key(current);
    if (k === lastSaved.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void fetch('/api/v1/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
        keepalive: true,
      })
        .then((res) => {
          if (res.ok) lastSaved.current = k;
        })
        .catch(() => undefined);
    }, SAVE_DELAY_MS);
  }, [cart, unselected, userId, syncedFor]);

  // Back to the app: take the account's cart if another device changed it.
  React.useEffect(() => {
    if (!userId || syncedFor !== userId) return;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || saveTimer.current) return;
      const saved = await fetchSaved();
      if (!saved || saveTimer.current) return;
      const k = key(saved);
      if (k === lastSaved.current) return;
      lastSaved.current = k;
      apply(saved);
    };
    const onVisible = () => void refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userId, syncedFor, apply]);
}
