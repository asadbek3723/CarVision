'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, ThumbsDown } from 'lucide-react';
import { Sheet, Textarea, buttonClasses } from '@/components/ui';
import { toast } from '@/components/ui/Toaster';
import { FEEDBACK_REASONS, type FeedbackReason } from '@/domain/render-feedback';

interface RenderFeedbackProps {
  /** The finished render shown right now (a stored https URL; demo pictures cannot be rated). */
  url: string;
  className: string;
}

/**
 * "I don't like it" on the render on screen: a reason and an optional note go to the admin quality
 * view. One mark per picture; the button says so once it is sent.
 */
export function RenderFeedback({ url, className }: RenderFeedbackProps) {
  const t = useTranslations('renderFeedback');
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<FeedbackReason | null>(null);
  const [note, setNote] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sentFor, setSentFor] = React.useState<Set<string>>(() => new Set());
  const sent = sentFor.has(url);

  if (!/^https:\/\//.test(url)) return null;

  const send = async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/v1/generations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, reason, ...(note.trim() ? { note: note.trim() } : {}) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSentFor((prev) => new Set(prev).add(url));
      setOpen(false);
      setReason(null);
      setNote('');
      toast.success(t('thanks'));
    } catch {
      toast.error(t('failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={sent} className={className} aria-label={t('button')}>
        <ThumbsDown className="h-4 w-4 text-gold-500" />
        <span className="hidden sm:inline">{sent ? t('sent') : t('button')}</span>
      </button>
      <Sheet
        open={open}
        onClose={() => !sending && setOpen(false)}
        title={t('title')}
        description={t('subtitle')}
        size="sm"
        footer={
          <button type="button" onClick={() => void send()} disabled={!reason || sending} className={buttonClasses({ size: 'lg', className: 'w-full' })}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('send')}
          </button>
        }
      >
        <div role="radiogroup" aria-label={t('reasonLabel')} className="flex flex-wrap gap-2">
          {FEEDBACK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                reason === r ? 'border-gold-500 bg-gold-500 text-black' : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
              }`}
            >
              {t(`reasons.${r}`)}
            </button>
          ))}
        </div>
        <Textarea
          label={t('noteLabel')}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          rows={3}
          maxLength={500}
          wrapperClassName="mt-4"
        />
      </Sheet>
    </>
  );
}
