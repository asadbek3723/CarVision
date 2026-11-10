'use client';

import * as React from 'react';
import { AdminShell, type AdminTab } from './AdminShell';
import { AdminOverviewView } from './AdminOverviewView';
import { AdminShopsView } from './AdminShopsView';
import { AdminEscrowView } from './AdminEscrowView';
import { AdminFinanceView } from './AdminFinanceView';
import { AdminUsersView } from './AdminUsersView';
import { AdminRendersView } from './AdminRendersView';
import { AdminBannersView } from './AdminBannersView';
import { AdminSecurityView } from './AdminSecurityView';
import { AdminSessionProvider } from './ui';

const TAB_KEY = 'carvision_admin_tab';
const TABS: AdminTab[] = ['dashboard', 'shops', 'escrow', 'finance', 'users', 'renders', 'banners', 'security'];

/** The verified admin console. A 401 from any admin API sends the admin back to the PIN screen. */
export function AdminApp({ adminName, onExpired, onLock }: { adminName: string; onExpired: () => void; onLock: () => void }) {
  const [tab, setTab] = React.useState<AdminTab>('dashboard');
  const [pending, setPending] = React.useState(0);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TAB_KEY) as AdminTab | null;
      if (saved && TABS.includes(saved)) setTab(saved);
    } catch {
      // storage unavailable
    }
  }, []);

  const changeTab = React.useCallback((t: AdminTab) => {
    setTab(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0 });
  }, []);

  const refreshPending = React.useCallback(async () => {
    try {
      // Lightweight count only (the full dashboard is not recomputed every minute).
      const res = await fetch('/api/v1/admin/overview?lite=1', { cache: 'no-store' });
      if (res.status === 401) return onExpired();
      const d = await res.json();
      if (d.success) setPending(d.pending);
    } catch {
      // badge is best effort
    }
  }, [onExpired]);

  React.useEffect(() => {
    void refreshPending();
    const t = setInterval(refreshPending, 60_000);
    return () => clearInterval(t);
  }, [refreshPending, tab]);

  return (
    <AdminSessionProvider onExpired={onExpired}>
      <AdminShell activeTab={tab} onTabChange={changeTab} onLock={onLock} adminName={adminName} pendingDeposits={pending}>
        {tab === 'dashboard' && <AdminOverviewView onNavigate={changeTab} />}
        {tab === 'shops' && <AdminShopsView />}
        {tab === 'escrow' && <AdminEscrowView onChanged={() => void refreshPending()} />}
        {tab === 'finance' && <AdminFinanceView onNavigate={changeTab} />}
        {tab === 'users' && <AdminUsersView />}
        {tab === 'renders' && <AdminRendersView />}
        {tab === 'banners' && <AdminBannersView />}
        {tab === 'security' && <AdminSecurityView />}
      </AdminShell>
    </AdminSessionProvider>
  );
}
