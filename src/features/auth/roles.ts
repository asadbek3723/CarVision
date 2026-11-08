import type { UserProfile } from '@/features/auth/types';

/**
 * Workshop owners (sellers) get the Garage and the Dashboard; everyone else gets the Cart in their place.
 * The role decides this, never the plan: a regular user never sees the studio, a seller always does.
 */
export function isSellerUser(user: Pick<UserProfile, 'role'> | null | undefined): boolean {
  return user?.role === 'b2b_seller';
}
