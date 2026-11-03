import type { ReactNode } from 'react';

/** Shared pass-through layout for private routes; each route re-exports `metadata` from NOINDEX_METADATA. */
export default function PassThroughLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
