'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  ImagePlus,
  Loader2,
  MessageCircle,
  Package,
  Palette,
  Search,
  Send,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { isSellerUser } from '@/features/auth/roles';
import type { BookingView } from '@/features/shop/BookingCard';
import { geist, md, mdFocus } from '@/features/minimal/theme';
import { readJson } from '@/lib/safe-json';
import { shrinkImageBlob } from '@/features/camera/lib/image-compressor';
import { SUPPORT_TOPICS, type SupportTopic } from '@/features/account/support-topics';

type Icon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

/** Help topics and the questions under each (texts live in messages → support.faq.<id>). */
const CATEGORIES: Array<{ id: Exclude<SupportTopic, 'other'>; icon: Icon; items: string[]; sellerOnly?: boolean }> = [
  { id: 'order', icon: Package, items: ['orderHow', 'pickup', 'cancel'] },
  { id: 'payment', icon: CreditCard, items: ['receiptPending', 'receiptRejected', 'wrongAmount'] },
  { id: 'render', icon: Palette, items: ['renderFailed', 'renderQuality', 'credits'] },
  { id: 'account', icon: UserRound, items: ['login', 'contacts', 'language'] },
  { id: 'seller', icon: Store, items: ['sellerPayout', 'sellerAddPart'], sellerOnly: true },
  { id: 'bug', icon: Bug, items: ['appBug', 'notifications'] },
];

const MIN_LEN = 10;
const MAX_LEN = 2000;

function FaqItem({ id, open, onToggle, onContact }: { id: string; open: boolean; onToggle: () => void; onContact: () => void }) {
  const t = useTranslations('support');
  const steps = (t.raw(`faq.${id}.steps`) as string[] | undefined) ?? [];
  const panelId = `faq-${id}`;
  return (
    <li className={`border-b ${md.line} last:border-b-0`}>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={`flex min-h-[60px] w-full items-center gap-3 py-4 text-start text-[15px] font-medium leading-snug text-white transition hover:text-white/90 ${mdFocus}`}
        >
          <span className="min-w-0 flex-1">{t(`faq.${id}.q`)}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 ${md.faint} transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      {open && (
        <div id={panelId} className="pb-5">
          <p className={`text-[14px] leading-[1.6] ${md.muted}`}>{t(`faq.${id}.a`)}</p>
          {steps.length > 0 && (
            <div className={`mt-4 rounded-2xl ${md.card} p-4`}>
              <p className={`text-[12px] font-semibold uppercase tracking-[0.08em] ${md.accentText}`}>{t('whatToDo')}</p>
              <ol className="mt-3 space-y-2.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-[1.5] text-white/85">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${md.tile} text-[12px] font-semibold tabular-nums text-white`}>{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <button type="button" onClick={onContact} className={`mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-[13px] font-medium ${md.muted} transition hover:text-white ${mdFocus}`}>
            <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
            {t('stillStuck')}
          </button>
        </div>
      )}
    </li>
  );
}

export function SupportCenter() {
  const t = useTranslations('support');
  const params = useParams();
  const search = useSearchParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user } = useAuth();
  const isSeller = !!user && isSellerUser(user);

  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const [topic, setTopic] = React.useState<SupportTopic>('other');
  const [message, setMessage] = React.useState('');
  const [bookings, setBookings] = React.useState<BookingView[]>([]);
  const [bookingId, setBookingId] = React.useState('');
  const [photo, setPhoto] = React.useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ticket, setTicket] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLElement>(null);
  const messageRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const categories = React.useMemo(() => CATEGORIES.filter((c) => !c.sellerOnly || isSeller), [isSeller]);

  // A deep link such as /profile/support?topic=payment&order=<id> opens the form prefilled.
  React.useEffect(() => {
    const tp = search?.get('topic');
    if (tp && (SUPPORT_TOPICS as readonly string[]).includes(tp)) setTopic(tp as SupportTopic);
    const order = search?.get('order');
    if (order) setBookingId(order);
  }, [search]);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/v1/bookings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => !cancelled && d.success && setBookings(d.bookings ?? []))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const q = query.trim().toLowerCase();
  const visible = categories
    .filter((c) => !category || c.id === category)
    .map((c) => ({
      ...c,
      items: c.items.filter((id) => {
        if (!q) return true;
        const steps = (t.raw(`faq.${id}.steps`) as string[] | undefined) ?? [];
        return [t(`faq.${id}.q`), t(`faq.${id}.a`), ...steps].join(' ').toLowerCase().includes(q);
      }),
    }))
    .filter((c) => c.items.length > 0);

  const goToForm = (tp?: SupportTopic) => {
    if (tp) setTopic(tp);
    setTicket(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => messageRef.current?.focus({ preventScroll: true }), 400);
  };

  const pickPhoto = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError(t('errFileType'));
    try {
      const blob = await shrinkImageBlob(file, 2000);
      if (blob.size > 5 * 1024 * 1024) return setError(t('errFileSize'));
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError(t('errFileType'));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (message.trim().length < MIN_LEN) return setError(t('errShort', { min: MIN_LEN }));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('topic', topic);
      fd.set('message', message.trim());
      if (bookingId && bookings.some((b) => b.id === bookingId)) fd.set('bookingId', bookingId);
      fd.set('page', window.location.pathname);
      fd.set('device', navigator.userAgent.slice(0, 300));
      fd.set('locale', locale);
      if (photo) fd.set('photo', new File([photo.blob], 'screenshot', { type: photo.blob.type || 'image/jpeg' }));
      const res = await fetch('/api/v1/support', { method: 'POST', body: fd });
      const data = (await readJson(res)).data as { success?: boolean; ticket?: string; code?: string };
      if (res.ok && data.success) {
        setTicket(data.ticket ?? '');
        setMessage('');
        setPhoto(null);
        setBookingId('');
        return;
      }
      const map: Record<string, string> = {
        RATE_LIMITED: t('errRate'),
        FILE_TOO_LARGE: t('errFileSize'),
        BAD_FILE_TYPE: t('errFileType'),
        INVALID_INPUT: t('errShort', { min: MIN_LEN }),
        SUPPORT_UNAVAILABLE: t('errUnavailable'),
      };
      setError((data.code && map[data.code]) || t('errSend'));
    } catch {
      setError(t('errNetwork'));
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  const contact = user.phone || user.email;
  const topicLabel = (id: SupportTopic) => t(`topics.${id}`);
  const formTopics = SUPPORT_TOPICS.filter((id) => id !== 'seller' || isSeller);

  return (
    <div className={`${geist.className} ${md.page} min-h-full`}>
      <div className="mx-auto w-full max-w-3xl px-5 pb-10 pt-3 md:pt-8">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/profile`}
            aria-label={t('back')}
            className={`-ms-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/[0.06] hover:text-white ${mdFocus}`}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <span className={`text-[14px] ${md.muted}`}>{t('back')}</span>
        </div>

        <section className="mt-4">
          <p className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${md.accentText}`}>{t('eyebrow')}</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-white md:text-[34px]">{t('title')}</h1>
          <p className={`mt-2 max-w-xl text-[15px] leading-[1.55] ${md.muted}`}>{t('subtitle')}</p>

          <div className="relative mt-6">
            <Search className={`pointer-events-none absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${md.faint}`} />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenId(null);
              }}
              placeholder={t('searchPh')}
              aria-label={t('searchPh')}
              className={`h-[52px] w-full rounded-2xl ${md.card} border ${md.line} pe-4 ps-11 text-[15px] text-white placeholder:text-[#6B6B6B] ${mdFocus}`}
            />
          </div>
        </section>

        {/* Topic tiles */}
        <section aria-label={t('topicsTitle')} className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {categories.map(({ id, icon: Icon }) => {
            const active = category === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCategory(active ? null : id);
                  setOpenId(null);
                }}
                className={`flex min-h-[76px] flex-col items-start justify-between gap-3 rounded-2xl border p-3.5 text-start transition ${mdFocus} ${
                  active ? 'border-[#FDC902]/60 bg-[#FDC902]/[0.08]' : `${md.line} ${md.card} hover:bg-[#1c1c1c]`
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? md.accentText : 'text-white/80'}`} strokeWidth={1.7} />
                <span className="text-[14px] font-medium leading-tight text-white">{topicLabel(id)}</span>
              </button>
            );
          })}
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 id="faq-title" className="text-[18px] font-semibold tracking-[-0.01em] text-white">
              {t('faqTitle')}
            </h2>
            {(category || q) && (
              <button
                type="button"
                onClick={() => {
                  setCategory(null);
                  setQuery('');
                }}
                className={`min-h-9 rounded-lg text-[13px] font-medium ${md.muted} transition hover:text-white ${mdFocus}`}
              >
                {t('showAll')}
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className={`mt-4 rounded-2xl ${md.card} p-5`}>
              <p className="text-[15px] font-medium text-white">{t('noResults')}</p>
              <p className={`mt-1 text-[14px] ${md.muted}`}>{t('noResultsSub')}</p>
              <button type="button" onClick={() => goToForm()} className={`mt-4 inline-flex min-h-10 items-center gap-2 text-[14px] font-semibold ${md.accentText} ${mdFocus}`}>
                <MessageCircle className="h-4 w-4" />
                {t('writeUs')}
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-6">
              {visible.map((c) => (
                <div key={c.id}>
                  {!category && <p className={`mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] ${md.faint}`}>{topicLabel(c.id)}</p>}
                  <ul>
                    {c.items.map((id) => (
                      <FaqItem key={id} id={id} open={openId === id || (!!q && visible.length === 1 && c.items.length === 1)} onToggle={() => setOpenId(openId === id ? null : id)} onContact={() => goToForm(c.id)} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact form */}
        <section ref={formRef} aria-labelledby="contact-title" className={`mt-10 scroll-mt-6 rounded-3xl border ${md.line} ${md.card} p-5 md:p-7`}>
          {ticket !== null ? (
            <div className="flex flex-col items-start" role="status">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </span>
              <h2 className="mt-4 text-[20px] font-semibold text-white">{t('sentTitle')}</h2>
              {ticket && (
                <p className={`mt-1 text-[14px] ${md.muted}`}>
                  {t('ticketNo')} <span className="font-mono font-semibold text-white">{ticket}</span>
                </p>
              )}
              <p className={`mt-3 max-w-md text-[14px] leading-[1.55] ${md.muted}`}>{t('sentSub', { contact: contact || '—' })}</p>
              <button type="button" onClick={() => setTicket(null)} className={`mt-5 inline-flex min-h-11 items-center rounded-full ${md.tile} px-5 text-[14px] font-medium text-white transition hover:bg-[#2a2a2a] ${mdFocus}`}>
                {t('sendAnother')}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${md.accentSoft}`}>
                  <MessageCircle className={`h-5 w-5 ${md.accentText}`} strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <h2 id="contact-title" className="text-[18px] font-semibold leading-tight text-white">
                    {t('contactTitle')}
                  </h2>
                  <p className={`mt-1 text-[14px] leading-[1.5] ${md.muted}`}>{t('contactSub')}</p>
                </div>
              </div>

              <fieldset className="mt-6">
                <legend className="mb-2.5 text-[13px] font-medium text-white/80">{t('topicLabel')}</legend>
                <div className="flex flex-wrap gap-2">
                  {formTopics.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={topic === id}
                      onClick={() => setTopic(id)}
                      className={`min-h-10 rounded-full border px-4 text-[13px] font-medium transition ${mdFocus} ${
                        topic === id ? 'border-[#FDC902] bg-[#FDC902] text-[#0A0A0A]' : `${md.line} text-white/85 hover:bg-white/[0.04]`
                      }`}
                    >
                      {topicLabel(id)}
                    </button>
                  ))}
                </div>
              </fieldset>

              {bookings.length > 0 && (
                <div className="mt-5">
                  <label htmlFor="support-order" className="mb-2 block text-[13px] font-medium text-white/80">
                    {t('orderLabel')}
                  </label>
                  <div className="relative">
                    <select
                      id="support-order"
                      value={bookingId}
                      onChange={(e) => setBookingId(e.target.value)}
                      className={`h-12 w-full cursor-pointer appearance-none rounded-xl ${md.tile} pe-11 ps-4 text-[15px] text-white [color-scheme:dark] ${mdFocus}`}
                    >
                      <option value="">{t('orderNone')}</option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          #{b.bookingNumber} · {b.items[0]?.name ?? '—'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label htmlFor="support-message" className="mb-2 block text-[13px] font-medium text-white/80">
                  {t('messageLabel')}
                </label>
                <textarea
                  id="support-message"
                  ref={messageRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                  rows={6}
                  placeholder={t('messagePh')}
                  className={`w-full resize-y rounded-xl ${md.tile} px-4 py-3.5 text-[15px] leading-[1.5] text-white placeholder:text-[#6B6B6B] ${mdFocus}`}
                />
                <p className={`mt-1.5 text-end text-[12px] tabular-nums ${md.faint}`}>
                  {message.length}/{MAX_LEN}
                </p>
              </div>

              <div className="mt-2">
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => void pickPhoto(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
                {photo ? (
                  <div className="flex items-center gap-3">
                    <img src={photo.url} alt={t('photoAttached')} className={`h-16 w-16 rounded-xl border object-cover ${md.line}`} />
                    <span className={`flex-1 text-[13px] ${md.muted}`}>{t('photoAttached')}</span>
                    <button type="button" onClick={() => setPhoto(null)} aria-label={t('photoRemove')} className={`grid h-10 w-10 place-items-center rounded-full text-white/70 transition hover:bg-white/[0.06] hover:text-white ${mdFocus}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#333] text-[14px] ${md.muted} transition hover:border-[#555] hover:text-white ${mdFocus}`}>
                    <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.7} />
                    {t('photoAdd')}
                  </button>
                )}
              </div>

              <div className={`mt-5 flex gap-2.5 rounded-xl ${md.tile} p-3.5`}>
                <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-400" strokeWidth={1.8} />
                <p className={`text-[13px] leading-[1.5] ${md.muted}`}>{t('privacyNote', { contact: contact || '—' })}</p>
              </div>

              {error && (
                <p role="alert" className="mt-4 text-[14px] text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || message.trim().length < MIN_LEN}
                className={`mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full ${md.accentBg} text-[15px] font-semibold text-[#0A0A0A] transition hover:brightness-110 disabled:opacity-40 ${mdFocus}`}
              >
                {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-[18px] w-[18px] rtl:-scale-x-100" strokeWidth={2} />}
                {busy ? t('sending') : t('send')}
              </button>
              <p className={`mt-3 text-center text-[12px] ${md.faint}`}>{t('responseTime')}</p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
