import { SellerDashboardView } from '@/features/seller/components/SellerDashboardView';

/** Workshop dashboard on its own path, so the app shell knows it at once (no query string to wait for). */
export default function DashboardPage() {
  return <SellerDashboardView />;
}
