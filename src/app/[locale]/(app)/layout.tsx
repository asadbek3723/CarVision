import { VeloceShell } from '@/components/veloce/VeloceShell';

/**
 * One shell for every in-app screen (shop, garage, cart, plans, profile, customize, seller).
 * Because it lives in a layout, the header and the bottom dock stay mounted while the page between
 * them changes: tapping a tab swaps only the content, like a native app, instead of rebuilding
 * the whole chrome on every navigation.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <VeloceShell>{children}</VeloceShell>;
}
