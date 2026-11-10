import { Suspense } from 'react';
import { SupportCenter } from '@/features/account/SupportCenter';

export default function ProfileSupportPage() {
  return (
    <Suspense>
      <SupportCenter />
    </Suspense>
  );
}
