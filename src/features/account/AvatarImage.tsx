'use client';

import * as React from 'react';
import { initialsOf } from '@/features/account/preferences';

/**
 * The profile photo, or the initials when there is none or it cannot be loaded (a deleted file
 * must never leave a broken image on one device while another still shows a cached copy).
 */
export function AvatarImage({ src, name, className = '' }: { src: string | null | undefined; name: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <>{initialsOf(name)}</>;
  return <img src={src} alt="" className={className} draggable={false} onError={() => setFailed(true)} />;
}
