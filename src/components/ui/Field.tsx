'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Filled, borderless control look shared by Input / Select / Textarea.
 * 16px text so iOS Safari never zooms on focus; 48px tall.
 */
export const fieldClass =
  'w-full rounded-md bg-surface-2 px-4 text-base text-foreground placeholder:text-neutral-500 ' +
  'transition-[background-color,box-shadow] duration-micro ease-brand ' +
  'hover:bg-surface-3 focus:bg-surface-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold-500/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger/60';

type FieldMeta = {
  /** Visible label above the control. */
  label?: React.ReactNode | undefined;
  /** Helper text under the control. */
  hint?: React.ReactNode | undefined;
  /** Error text; also marks the control invalid. */
  error?: React.ReactNode | undefined;
  /** Classes for the outer wrapper (layout); `className` goes to the control. */
  wrapperClassName?: string | undefined;
};

type Ids = { id: string; describedBy: string | undefined; invalid: boolean };

function useFieldIds(idProp: string | undefined, hint: React.ReactNode, error: React.ReactNode, describedByProp?: string): Ids {
  const auto = React.useId();
  const id = idProp ?? auto;
  const parts = [describedByProp, hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined].filter(Boolean);
  return { id, describedBy: parts.length ? parts.join(' ') : undefined, invalid: Boolean(error) };
}

/** Label + control + hint/error. Used by Input, Select and Textarea; usable on its own for custom controls. */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: { id: string; label?: React.ReactNode | undefined; hint?: React.ReactNode | undefined; error?: React.ReactNode | undefined; className?: string | undefined; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger-soft">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export type InputProps = React.ComponentProps<'input'> & FieldMeta;

export function Input({ id: idProp, label, hint, error, wrapperClassName, className, 'aria-describedby': ad, ...rest }: InputProps) {
  const { id, describedBy, invalid } = useFieldIds(idProp, hint, error, ad);
  return (
    <Field id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <input id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} className={cn(fieldClass, 'min-h-12', className)} {...rest} />
    </Field>
  );
}

export type TextareaProps = React.ComponentProps<'textarea'> & FieldMeta;

export function Textarea({ id: idProp, label, hint, error, wrapperClassName, className, rows = 4, 'aria-describedby': ad, ...rest }: TextareaProps) {
  const { id, describedBy, invalid } = useFieldIds(idProp, hint, error, ad);
  return (
    <Field id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(fieldClass, 'min-h-28 resize-y py-3 leading-relaxed', className)}
        {...rest}
      />
    </Field>
  );
}

export type SelectProps = React.ComponentProps<'select'> & FieldMeta;

/** Native select (keyboard and screen-reader friendly) with the filled look and a custom chevron. */
export function Select({ id: idProp, label, hint, error, wrapperClassName, className, children, 'aria-describedby': ad, ...rest }: SelectProps) {
  const { id, describedBy, invalid } = useFieldIds(idProp, hint, error, ad);
  return (
    <Field id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(fieldClass, 'min-h-12 cursor-pointer appearance-none pe-11 [&>option]:bg-surface-1', className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
    </Field>
  );
}
