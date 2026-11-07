'use client';

import Image from 'next/image';

/** Photos in our own Supabase storage can be resized and re-encoded (AVIF/WebP) by Next.js. */
const OPTIMIZABLE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i;

interface ProductImageProps {
  src: string;
  alt: string;
  /** Rendered width hint, e.g. "(min-width: 768px) 25vw, 50vw". */
  sizes: string;
  className?: string;
  priority?: boolean;
  onError?: () => void;
}

/**
 * A part photo sized for where it is shown: a phone card downloads a ~400px image of a few dozen
 * KB instead of the multi-hundred-KB original, which is what makes lists fast on a slow connection.
 * Must sit inside a `relative` box (it fills it). Other hosts fall back to a plain lazy <img>.
 */
export function ProductImage({ src, alt, sizes, className = '', priority = false, onError }: ProductImageProps) {
  if (OPTIMIZABLE.test(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={70}
        priority={priority}
        className={className}
        onError={onError}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
      onError={onError}
    />
  );
}
