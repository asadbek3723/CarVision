'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, BellOff } from 'lucide-react';

const PUBLIC_KEY = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] ?? '';

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = 'loading' | 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on';

/** True on iPhone / iPad, where push works only after the app is added to the Home Screen. */
function isIosDevice(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Profile row that turns order notifications on or off for this device. */
export function PushToggle() {
  const t = useTranslations('push');
  const locale = (useParams()?.['locale'] as string) || 'uz';
  const [state, setState] = React.useState<State>('loading');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && PUBLIC_KEY;
      if (!supported) {
        if (alive) setState(isIosDevice() && PUBLIC_KEY ? 'needs-install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') return void (alive && setState('blocked'));
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = await reg?.pushManager.getSubscription();
      if (alive) setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setState(permission === 'denied' ? 'blocked' : 'off');
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
      const res = await fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), locale }),
      });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        return setState('off');
      }
      setState('on');
    } catch {
      setState('off');
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/v1/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState('off');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading' || state === 'unsupported') return null;

  const on = state === 'on';
  const hint = state === 'blocked' ? t('blocked') : state === 'needs-install' ? t('needsInstall') : on ? t('onSub') : t('offSub');
  const disabled = busy || state === 'blocked' || state === 'needs-install';

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={on}
      onClick={on ? turnOff : turnOn}
      className="flex min-h-[68px] w-full items-center gap-4 px-4 text-start transition hover:bg-white/[0.02] disabled:opacity-60"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#262626] text-white">{on ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}</span>
      <span className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 border-b border-[#262626] py-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-tight text-white">{t('title')}</span>
          <span className="mt-1 block text-[13px] leading-[1.35] text-white/55">{hint}</span>
        </span>
        <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-[#FDC902]' : 'bg-[#3a3a3a]'}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? 'start-[22px]' : 'start-0.5'}`} />
        </span>
      </span>
    </button>
  );
}
