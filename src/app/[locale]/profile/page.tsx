import { VeloceShell } from '@/components/veloce/VeloceShell';
import { VeloceProfile } from '@/components/veloce/VeloceProfile';
import { ProfileExtras } from '@/features/account/ProfileExtras';

export default function ProfilePage() {
  return (
    <VeloceShell>
      <VeloceProfile />
      <ProfileExtras />
    </VeloceShell>
  );
}
