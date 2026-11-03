import { notFound } from 'next/navigation';
import { getSuperAdminId } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Second server-side gate (the middleware is the first). Even if the middleware were skipped or
 * misconfigured, a page under /admin never renders for anyone but a signed-in super_admin.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSuperAdminId())) notFound();
  return children;
}
