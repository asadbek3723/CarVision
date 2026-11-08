'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Rendered when a regular (non-seller) account opens a workshop-only page by URL.
 * Those pages do not exist for them, so they are sent to Home instead of seeing a lock screen.
 */
export function SellerOnly() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  React.useEffect(() => {
    router.replace(`/${locale}/seller`);
  }, [router, locale]);
  return (
    <div className="flex justify-center py-24" role="status">
      <Loader2 className="h-7 w-7 animate-spin text-gold-500" />
    </div>
  );
}
