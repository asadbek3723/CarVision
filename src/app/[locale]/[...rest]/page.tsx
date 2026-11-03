import { notFound } from 'next/navigation';

/** Unknown URLs under a locale render the localized `[locale]/not-found.tsx` instead of the root one. */
export default function CatchAllNotFound() {
  notFound();
}
