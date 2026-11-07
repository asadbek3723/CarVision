'use client';

import { useParams } from 'next/navigation';
import { VeloceProductDetail } from '@/components/veloce/VeloceProductDetail';

/**
 * Shown the instant a card is tapped, while the page itself is still on its way. It draws the part
 * from the card the visitor just saw, so on a slow connection the screen is already complete instead
 * of a spinner; the server page then takes over with the same content.
 */
export default function ProductLoading() {
  const params = useParams();
  const id = (params?.['id'] as string) || '';
  return <VeloceProductDetail id={id} />;
}
