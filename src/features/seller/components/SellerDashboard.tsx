'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  User as UserIcon,
  ChevronRight,
  Settings,
  Sparkles,
  Activity,
  Gauge,
  CarFront,
  Store,
  ShoppingBag,
  X,
  ShieldCheck,
  Lock,
  Layers,
  LogOut,
  SlidersHorizontal,
  QrCode,
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  Check,
  Trash2,
  ExternalLink,
  Camera,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { CustomerViewLockModal } from './CustomerViewLockModal';
import { RedeemVoucherModal } from './RedeemVoucherModal';
import { OneClickCatalogImporter } from './OneClickCatalogImporter';
import { CustomPartUploader } from './CustomPartUploader';
import { SmartCameraView } from '@/features/camera/components/SmartCameraView';
import type { CompressResult } from '@/features/camera/lib/image-compressor';

export type GarageCategory = 'ALL' | 'WHEELS' | 'BODY KIT' | 'SUSPENSION' | 'INTERIOR' | 'PERFORMANCE';

export interface GarageProduct {
  id: string;
  name: string;
  category: 'WHEELS' | 'BODY KIT' | 'SUSPENSION' | 'INTERIOR' | 'PERFORMANCE';
  subtitle: string;
  image: string;
  price?: number | undefined;
  inStock?: boolean | undefined;
}

const INITIAL_GARAGE_PRODUCTS: GarageProduct[] = [
  {
    id: 'prod-1',
    name: 'BBS CI-R 20"',
    category: 'WHEELS',
    subtitle: 'Wheels • Set of 4',
    image: '/images/garage/bbs_wheel.jpg',
    price: 3450,
    inStock: true,
  },
  {
    id: 'prod-2',
    name: 'Carbon Front Lip',
    category: 'BODY KIT',
    subtitle: 'Body kit • Front',
    image: '/images/garage/carbon_lip.jpg',
    price: 1850,
    inStock: true,
  },
  {
    id: 'prod-3',
    name: 'KW Variant 3',
    category: 'SUSPENSION',
    subtitle: 'Suspension • Coilovers',
    image: '/images/garage/kw_suspension.jpg',
    price: 2980,
    inStock: true,
  },
  {
    id: 'prod-4',
    name: 'M Performance Seats',
    category: 'INTERIOR',
    subtitle: 'Interior • Seats',
    image: '/images/garage/m_seats.jpg',
    price: 4600,
    inStock: true,
  },
  {
    id: 'prod-5',
    name: 'Akrapovič Titanium Exhaust',
    category: 'PERFORMANCE',
    subtitle: 'Performance • Titanium System',
    image: '/images/garage/carbon_lip.jpg',
    price: 5200,
    inStock: true,
  },
  {
    id: 'prod-6',
    name: 'Eventuri Carbon Airbox',
    category: 'PERFORMANCE',
    subtitle: 'Performance • Intake System',
    image: '/images/garage/hero_authentic.jpg',
    price: 2150,
    inStock: true,
  },
  {
    id: 'prod-7',
    name: 'HRE P101 Monoblok 21"',
    category: 'WHEELS',
    subtitle: 'Wheels • Forged Luxury',
    image: '/images/garage/bbs_wheel.jpg',
    price: 6800,
    inStock: true,
  },
  {
    id: 'prod-8',
    name: 'Vorsteiner Carbon Diffuser',
    category: 'BODY KIT',
    subtitle: 'Body kit • Rear Aero',
    image: '/images/garage/carbon_lip.jpg',
    price: 2400,
    inStock: true,
  },
  {
    id: 'prod-9',
    name: 'Alcantara Sport Steering',
    category: 'INTERIOR',
    subtitle: 'Interior • LED Shift',
    image: '/images/garage/m_seats.jpg',
    price: 1650,
    inStock: true,
  },
  {
    id: 'prod-10',
    name: 'Öhlins Road & Track Kit',
    category: 'SUSPENSION',
    subtitle: 'Suspension • DFV Coilovers',
    image: '/images/garage/kw_suspension.jpg',
    price: 3600,
    inStock: true,
  },
  {
    id: 'prod-11',
    name: 'Pure Stage 2+ Turbos',
    category: 'PERFORMANCE',
    subtitle: 'Performance • 850+ HP Kit',
    image: '/images/garage/hero_authentic.jpg',
    price: 4950,
    inStock: true,
  },
  {
    id: 'prod-12',
    name: 'Brembo GT Carbon Ceramic',
    category: 'PERFORMANCE',
    subtitle: 'Performance • 400mm Rotors',
    image: '/images/garage/bbs_wheel.jpg',
    price: 8900,
    inStock: true,
  },
];

const GARAGE_CATEGORIES: GarageCategory[] = [
  'ALL',
  'WHEELS',
  'BODY KIT',
  'SUSPENSION',
  'INTERIOR',
  'PERFORMANCE',
];

const PRESET_IMAGE_OPTIONS = [
  { label: 'BBS Wheel', url: '/images/garage/bbs_wheel.jpg' },
  { label: 'Carbon Lip', url: '/images/garage/carbon_lip.jpg' },
  { label: 'KW Suspension', url: '/images/garage/kw_suspension.jpg' },
  { label: 'M Seats', url: '/images/garage/m_seats.jpg' },
  { label: 'Showroom M5', url: '/images/garage/hero_authentic.jpg' },
];

export interface SellerDashboardProps {
  shopName?: string;
  creditsBalance?: number;
  planCode?: string;
  initialTab?: 'home' | 'garage' | 'shop' | 'more';
}

export function SellerDashboard({
  shopName = 'Apex Customs Studio',
  creditsBalance = 78,
  planCode = 'PRO_800',
  initialTab = 'home',
}: SellerDashboardProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params['locale'] as string) || 'uz';
  const { user, signOut, switchDemoProfile } = useAuth();

  const isGarageRoute = pathname?.includes('/garage') ?? false;
  const resolvedTab: 'home' | 'garage' | 'shop' | 'more' = isGarageRoute ? 'garage' : initialTab;

  const activeShopName =
    user?.shop?.shop_name ||
    (user?.full_name ? `${user.full_name}'s Studio` : shopName);
  const activeCredits = user?.credits_balance ?? creditsBalance;

  // Modals & Navigation state
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'home' | 'garage' | 'shop' | 'more'>(resolvedTab);

  React.useEffect(() => {
    if (isGarageRoute) {
      setActiveTab('garage');
    } else if (pathname?.includes('/seller')) {
      setActiveTab('home');
    }
  }, [isGarageRoute, pathname]);
  const [isLockModalOpen, setIsLockModalOpen] = React.useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = React.useState(false);
  const [isImporterOpen, setIsImporterOpen] = React.useState(false);
  const [isCustomPartOpen, setIsCustomPartOpen] = React.useState(false);
  const [isCustomerViewLocked, setIsCustomerViewLocked] = React.useState(false);

  // Smart Camera Scan & Capture state
  const [isSmartCameraOpen, setIsSmartCameraOpen] = React.useState(false);
  const [isProcessingCapture, setIsProcessingCapture] = React.useState(false);

  const handlePhotoCaptured = (result: CompressResult) => {
    setIsProcessingCapture(true);
    try {
      if (typeof window !== 'undefined') {
        const objectUrl = URL.createObjectURL(result.blob);
        sessionStorage.setItem('carvision_captured_image', objectUrl);
        sessionStorage.setItem('carvision_captured_at', Date.now().toString());
      }
    } catch {
      // Ignore sessionStorage errors
    }

    setTimeout(() => {
      setIsProcessingCapture(false);
      setIsSmartCameraOpen(false);
      router.push(`/${locale}/studio?captured=1`);
    }, 700);
  };

  const handleSampleCarSelect = (sampleUrl: string) => {
    setIsProcessingCapture(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('carvision_captured_image', sampleUrl);
        sessionStorage.setItem('carvision_captured_at', Date.now().toString());
      }
    } catch {
      // Ignore sessionStorage errors
    }

    setTimeout(() => {
      setIsProcessingCapture(false);
      setIsSmartCameraOpen(false);
      router.push(`/${locale}/studio?captured=1`);
    }, 600);
  };

  // Garage Inventory & Detail state
  const [garageCategory, setGarageCategory] = React.useState<GarageCategory>('ALL');
  const [products, setProducts] = React.useState<GarageProduct[]>(INITIAL_GARAGE_PRODUCTS);
  const [isAddDetailModalOpen, setIsAddDetailModalOpen] = React.useState(false);
  const [selectedProductForAction, setSelectedProductForAction] = React.useState<GarageProduct | null>(null);

  // New Detail Form state
  const [newPartName, setNewPartName] = React.useState('');
  const [newPartCategory, setNewPartCategory] = React.useState<'WHEELS' | 'BODY KIT' | 'SUSPENSION' | 'INTERIOR' | 'PERFORMANCE'>('WHEELS');
  const [newPartSubtitle, setNewPartSubtitle] = React.useState('');
  const [newPartPrice, setNewPartPrice] = React.useState('');
  const [newPartImage, setNewPartImage] = React.useState(PRESET_IMAGE_OPTIONS[0]?.url ?? '/images/garage/bbs_wheel.jpg');

  // Filtered products based on active category
  const filteredProducts = React.useMemo(() => {
    if (garageCategory === 'ALL') return products;
    return products.filter((p) => p.category === garageCategory);
  }, [products, garageCategory]);

  const handleToggleLock = (pin: string) => {
    if (pin === '1234' || pin.length === 4) {
      setIsCustomerViewLocked(!isCustomerViewLocked);
      return true;
    }
    return false;
  };

  const handleAddDetailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim()) return;

    const newProduct: GarageProduct = {
      id: `prod-${Date.now()}`,
      name: newPartName.trim(),
      category: newPartCategory,
      subtitle: newPartSubtitle.trim() || `${newPartCategory} • Custom Upgrade`,
      image: newPartImage,
      price: newPartPrice ? parseInt(newPartPrice, 10) : undefined,
      inStock: true,
    };

    setProducts((prev) => [newProduct, ...prev]);
    setGarageCategory('ALL');
    setNewPartName('');
    setNewPartSubtitle('');
    setNewPartPrice('');
    setIsAddDetailModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelectedProductForAction(null);
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-foreground select-none relative overflow-x-hidden">
      {/* Subtle ambient gold background glow on desktop */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(212,174,98,0.12),transparent_70%)]" />

      {/* Main Container: Full screen on mobile, elegant layout on desktop */}
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center p-0 md:p-6 lg:p-10">
        
        {/* DESKTOP SIDE PANEL (LEFT): Workshop OS Telemetry */}
        <aside className="hidden lg:flex w-72 flex-col gap-5 pe-8">
          <div className="rounded-3xl border border-white/5 bg-[#0E1015]/80 p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-[#94A3B8] uppercase">WORKSHOP OS ONLINE</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-white tracking-wide">{activeShopName}</h2>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#D4AE62]/30 bg-[#D4AE62]/10 px-3 py-1 text-[10px] font-bold text-[#E6C687]">
              <ShieldCheck className="h-3 w-3" />
              <span>VERIFIED ATELIER</span>
            </div>

            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="text-[11px] font-mono text-[#94A3B8]">KREDITLAR BALANSI</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-[#E6C687]">{activeCredits}</span>
                <span className="text-xs font-mono text-[#94A3B8]">/ {planCode}</span>
              </div>
            </div>

            {/* View Switcher for Desktop */}
            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="text-[10px] font-mono text-[#94A3B8] uppercase mb-2">BO&apos;LIMNI TANLANG</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/${locale}/seller`}
                  onClick={() => setActiveTab('home')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'home'
                      ? 'bg-[#D4AE62]/20 border border-[#D4AE62]/40 text-[#E6C687]'
                      : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Gauge className="h-3.5 w-3.5" />
                  <span>HOME</span>
                </Link>
                <Link
                  href={`/${locale}/garage`}
                  onClick={() => setActiveTab('garage')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'garage'
                      ? 'bg-[#D4AE62]/20 border border-[#D4AE62]/40 text-[#E6C687]'
                      : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <CarFront className="h-3.5 w-3.5" />
                  <span>GARAGE</span>
                </Link>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => setIsLockModalOpen(true)}
                className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/10 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-[#D4AE62]" />
                  <span>{isCustomerViewLocked ? 'Mijoz rejimi faol' : 'Mijoz rejimiga qulflash'}</span>
                </span>
                <span className="text-[10px] font-mono text-[#D4AE62]">{isCustomerViewLocked ? 'QULFLANGAN' : 'PIN 1234'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(true)}
                className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/10 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="h-3.5 w-3.5 text-[#D4AE62]" />
                  <span>Vaucher faollashtirish</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] rtl:rotate-180" />
              </button>
            </div>
          </div>
        </aside>

        {/* 1:1 VELOCE PHONE APP SHELL */}
        <main className="relative w-full max-w-[430px] min-h-screen md:min-h-[880px] bg-[#07080B] flex flex-col justify-between overflow-hidden shadow-2xl md:rounded-[52px] md:border-[10px] md:border-[#221F19] md:ring-1 md:ring-white/10">
          
          {/* TOP SECTION */}
          <div className="relative z-10">
            {/* Header: Hamburger | VELOCE BRANDING | User Profile */}
            <header className="flex items-center justify-between px-6 pt-5 pb-3">
              {/* Menu button */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Menyu"
                className="grid h-10 w-10 place-items-center rounded-full text-[#E6C687] transition-transform active:scale-90 cursor-pointer"
              >
                <Menu className="h-6 w-6 stroke-[2]" />
              </button>

              {/* Brand: VELOCE // DRIVE BEYOND or VELOCE // GARAGE */}
              <div className="flex flex-col items-center text-center">
                <span className="font-serif text-lg font-semibold tracking-[0.38em] text-[#E6C687] ps-[0.38em]">
                  VELOCE
                </span>
                <span className="text-[8px] font-medium tracking-[0.28em] text-[#A68A56] ps-[0.28em] uppercase">
                  {activeTab === 'garage' ? 'GARAGE' : 'DRIVE BEYOND'}
                </span>
              </div>

              {/* Profile icon */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Profil"
                className="grid h-8 w-8 place-items-center rounded-full border border-[#E6C687]/60 text-[#E6C687] transition-transform active:scale-90 cursor-pointer"
              >
                <UserIcon className="h-4 w-4" />
              </button>
            </header>

            {/* VIEW 1: HOME VIEW */}
            {activeTab === 'home' && (
              <div>
                {/* Hero Car Artwork */}
                <div className="relative -mt-2 px-1 select-none overflow-hidden">
                  <img
                    src="/images/veloce_black_coupe.jpg"
                    alt="Veloce Black Sports Coupe"
                    width={800}
                    height={600}
                    className="h-auto w-full object-cover pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] scale-[1.12] transition-transform duration-700 hover:scale-[1.16]"
                  />
                  {/* Soft edge blend overlays */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#07080B] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#07080B]/60 to-transparent" />
                </div>

                {/* Content Area */}
                <div className="relative z-20 px-6 mt-3">
                  {/* Headline: BUILT DIFFERENT */}
                  <h1 className="font-heading text-2xl sm:text-3xl font-light tracking-[0.34em] leading-[1.28] text-[#EDE8DF] uppercase">
                    BUILT<br />
                    DIFFERENT
                  </h1>

                  {/* Tagline: TUNE • STYLE • PERFORM */}
                  <p className="mt-2 text-[10px] sm:text-[11px] font-normal tracking-[0.24em] text-[#8C867D] uppercase">
                    TUNE &nbsp;•&nbsp; STYLE &nbsp;•&nbsp; PERFORM
                  </p>

                  {/* Pill CTA: CUSTOMIZE YOUR RIDE > (Opens Smart Camera & 4K Studio scan) */}
                  <div className="mt-5 flex justify-start">
                    <button
                      type="button"
                      onClick={() => setIsSmartCameraOpen(true)}
                      className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-[11px] font-bold tracking-[0.16em] text-[#12141A] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_24px_-4px_rgba(212,174,98,0.5)] active:scale-[0.98] cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #E6C687 0%, #D4AE62 50%, #C49B4D 100%)',
                        boxShadow: '0 6px 20px -4px rgba(212,174,98,0.4)',
                      }}
                    >
                      <span>CUSTOMIZE YOUR RIDE</span>
                      <ChevronRight className="h-4 w-4 stroke-[2.5] rtl:rotate-180" />
                    </button>
                  </div>

                  {/* 3 Feature Category Cards */}
                  <div className="mt-6 mb-28 grid grid-cols-3 gap-2.5">
                    {/* Card 1: PERFORMANCE */}
                    <div className="flex flex-col items-center rounded-2xl bg-[#0E1015] border border-white/[0.04] p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AE62]/30 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.8)]">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[#181A22] text-[#E0C07E] mb-2">
                        <Settings className="h-4 w-4" />
                      </div>
                      <span className="text-[9px] font-bold tracking-[0.12em] text-[#E0C07E]">
                        PERFORMANCE
                      </span>
                      <div className="mt-2 space-y-0.5 text-[8px] tracking-[0.08em] text-[#7E828E] font-medium">
                        <p>ENGINE</p>
                        <p>TUNING</p>
                        <p>EXHAUST</p>
                      </div>
                    </div>

                    {/* Card 2: STYLE */}
                    <div className="flex flex-col items-center rounded-2xl bg-[#0E1015] border border-white/[0.04] p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AE62]/30 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.8)]">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[#181A22] text-[#E0C07E] mb-2">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="text-[9px] font-bold tracking-[0.12em] text-[#E0C07E]">
                        STYLE
                      </span>
                      <div className="mt-2 space-y-0.5 text-[8px] tracking-[0.08em] text-[#7E828E] font-medium">
                        <p>WHEELS</p>
                        <p>BODY KITS</p>
                        <p>COLORS</p>
                      </div>
                    </div>

                    {/* Card 3: TRACK */}
                    <div className="flex flex-col items-center rounded-2xl bg-[#0E1015] border border-white/[0.04] p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AE62]/30 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.8)]">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[#181A22] text-[#E0C07E] mb-2">
                        <Activity className="h-4 w-4" />
                      </div>
                      <span className="text-[9px] font-bold tracking-[0.12em] text-[#E0C07E]">
                        TRACK
                      </span>
                      <div className="mt-2 space-y-0.5 text-[8px] tracking-[0.08em] text-[#7E828E] font-medium">
                        <p>LAP TIMES</p>
                        <p>ANALYTICS</p>
                        <p>IMPROVE</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: 1:1 VELOCE GARAGE VIEW */}
            {activeTab === 'garage' && (
              <div className="relative flex flex-col">
                {/* 1:1 Garage Hero Banner with Integrated 1:1 Luxury Typography */}
                <div className="relative -mt-2 px-1 select-none overflow-hidden">
                  <img
                    src="/images/garage/garage_hero_v3.jpg?v=3.1"
                    alt="Veloce Garage Showroom"
                    width={1200}
                    height={780}
                    className="h-auto w-full object-cover pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] transition-transform duration-700 hover:scale-[1.02]"
                  />
                  {/* Soft edge blend overlays */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#07080B] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#07080B]/60 to-transparent" />
                </div>

                {/* Content Area */}
                <div className="relative z-20 px-6 mt-3">
                  {/* CUSTOM BUTTON REQUESTED BY USER:
                      Directly above categories bar, identical style and size to home CTA button */}
                  <div className="mb-4 flex justify-start">
                    <button
                      type="button"
                      onClick={() => setIsAddDetailModalOpen(true)}
                      className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-[11px] font-bold tracking-[0.16em] text-[#12141A] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_24px_-4px_rgba(212,174,98,0.5)] active:scale-[0.98] cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #E6C687 0%, #D4AE62 50%, #C49B4D 100%)',
                        boxShadow: '0 6px 20px -4px rgba(212,174,98,0.4)',
                      }}
                    >
                      <span>ADD DETAIL</span>
                      <ChevronRight className="h-4 w-4 stroke-[2.5] rtl:rotate-180" />
                    </button>
                  </div>

                  {/* Horizontal Scrollable Categories Filter Bar */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {GARAGE_CATEGORIES.map((cat) => {
                      const isActive = garageCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setGarageCategory(cat)}
                          className={`cursor-pointer whitespace-nowrap rounded-full transition-all duration-300 ${
                            isActive
                              ? 'border border-[#D4AE62] bg-[#D4AE62]/10 px-4 py-1.5 text-[10px] font-bold tracking-[0.14em] text-[#EDE8DF] shadow-[0_0_12px_rgba(212,174,98,0.25)]'
                              : 'border border-transparent px-3.5 py-1.5 text-[10px] font-medium tracking-[0.12em] text-[#7E828E] hover:text-[#C5CAD6]'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Products Header: YOUR PRODUCTS & Dynamic Items Counter */}
                  <div className="mt-6 flex items-center justify-between">
                    <h2 className="text-[11px] font-bold tracking-[0.18em] text-[#EDE8DF] uppercase">
                      YOUR PRODUCTS
                    </h2>
                    <button
                      type="button"
                      onClick={() => setGarageCategory('ALL')}
                      className="group flex items-center gap-1 text-[10px] font-semibold tracking-[0.12em] text-[#8C867D] hover:text-[#E6C687] transition-colors cursor-pointer"
                    >
                      <span>{filteredProducts.length} ITEMS</span>
                      <ChevronRight className="h-3 w-3 stroke-[2] rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

                  {/* 2-Column Product Cards Grid */}
                  <div className="mt-4 mb-32 grid grid-cols-2 gap-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group flex flex-col justify-between rounded-2xl bg-[#0E1015] border border-white/[0.04] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AE62]/30 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.85)]"
                      >
                        {/* Top Product Image */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/60">
                          <img
                            src={product.image}
                            alt={product.name}
                            width={400}
                            height={210}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E1015] via-transparent to-transparent opacity-60" />
                        </div>

                        {/* Bottom Card Content */}
                        <div className="p-3">
                          {/* Category Tag */}
                          <span className="inline-block rounded-full border border-[#D4AE62]/40 bg-[#D4AE62]/10 px-2 py-0.5 text-[8px] font-bold tracking-[0.08em] text-[#E6C687]">
                            {product.category}
                          </span>

                          {/* Product Title */}
                          <h3 className="mt-2 text-xs font-bold text-white tracking-wide truncate">
                            {product.name}
                          </h3>

                          {/* Subtitle / Specs */}
                          <p className="mt-0.5 text-[9px] text-[#7E828E] tracking-wider truncate">
                            {product.subtitle}
                          </p>

                          {/* Bottom Row: Price & 3 dots action menu */}
                          <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.04] pt-2">
                            <span className="text-[10px] font-mono text-[#D4AE62]">
                              {product.price ? `$${product.price.toLocaleString()}` : 'In Stock'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedProductForAction(product)}
                              aria-label="Amallar"
                              className="grid h-6 w-6 place-items-center rounded-md text-[#7E828E] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM DOCK NAVIGATION (Luxury Automotive Console - Fixed, Borderless, Heavy Frosted Blur) */}
          <nav className="fixed inset-x-0 bottom-0 z-40 md:absolute max-w-[430px] mx-auto bg-[#07080B]/80 backdrop-blur-3xl shadow-[0_-12px_36px_rgba(0,0,0,0.9)] pt-3.5 pb-5 px-3 md:pb-3.5 transition-all duration-300">
            <div className="flex items-center justify-around">
              {/* HOME (Cockpit / Telemetry) */}
              <Link
                href={`/${locale}/seller`}
                onClick={() => setActiveTab('home')}
                className="group flex flex-col items-center gap-1.5 transition-all duration-300 cursor-pointer min-w-[54px]"
              >
                <div className={`transition-all duration-300 ${
                  activeTab === 'home'
                    ? 'text-[#E6C687] scale-110 drop-shadow-[0_0_12px_rgba(230,198,135,0.5)]'
                    : 'text-[#6F7482] group-hover:text-[#C5CAD6] group-hover:scale-105'
                }`}>
                  <Gauge className="h-6 w-6 stroke-[1.8]" />
                </div>
                <span className={`text-[9px] tracking-[0.16em] transition-colors ${
                  activeTab === 'home' ? 'font-bold text-[#E6C687]' : 'font-medium text-[#6F7482] group-hover:text-[#A8ADB9]'
                }`}>
                  HOME
                </span>
                <span className={`h-1 w-1 rounded-full transition-all duration-300 ${
                  activeTab === 'home' ? 'bg-[#E6C687] shadow-[0_0_8px_#E6C687]' : 'bg-transparent'
                }`} />
              </Link>

              {/* GARAGE (Sports Coupe Supercar Front) */}
              <Link
                href={`/${locale}/garage`}
                onClick={() => setActiveTab('garage')}
                className="group flex flex-col items-center gap-1.5 transition-all duration-300 cursor-pointer min-w-[54px]"
              >
                <div className={`transition-all duration-300 ${
                  activeTab === 'garage'
                    ? 'text-[#E6C687] scale-110 drop-shadow-[0_0_12px_rgba(230,198,135,0.5)]'
                    : 'text-[#6F7482] group-hover:text-[#C5CAD6] group-hover:scale-105'
                }`}>
                  <CarFront className="h-6 w-6 stroke-[1.8]" />
                </div>
                <span className={`text-[9px] tracking-[0.16em] transition-colors ${
                  activeTab === 'garage' ? 'font-bold text-[#E6C687]' : 'font-medium text-[#6F7482] group-hover:text-[#A8ADB9]'
                }`}>
                  GARAGE
                </span>
                <span className={`h-1 w-1 rounded-full transition-all duration-300 ${
                  activeTab === 'garage' ? 'bg-[#E6C687] shadow-[0_0_8px_#E6C687]' : 'bg-transparent'
                }`} />
              </Link>

              {/* CREATE (Central Elevated Smart Camera Action Button) */}
              <button
                type="button"
                onClick={() => setIsSmartCameraOpen(true)}
                aria-label="Create / Smart Camera 4K Scan"
                className="group relative -top-2.5 flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer min-w-[54px]"
              >
                <div
                  className="relative grid h-12 w-12 place-items-center rounded-full text-[#07080B] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_24px_rgba(230,198,135,0.8)] active:scale-95 shadow-[0_6px_20px_-2px_rgba(212,174,98,0.6)]"
                  style={{
                    background: 'linear-gradient(135deg, #F3D9A4 0%, #D4AE62 50%, #B88E3E 100%)',
                  }}
                >
                  <Camera className="h-5 w-5 stroke-[2.2] text-[#07080B]" />
                  <span className="absolute -top-0.5 -end-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#19D3FF] text-[8px] font-black text-[#07080B] shadow-[0_0_8px_#19D3FF]">
                    +
                  </span>
                </div>
                <span className="text-[9px] font-bold tracking-[0.16em] text-[#E6C687] drop-shadow-[0_0_8px_rgba(230,198,135,0.4)]">
                  CREATE
                </span>
              </button>

              {/* SHOP (Luxury Atelier Boutique) */}
              <Link
                href={`/${locale}/marketplace`}
                onClick={() => setActiveTab('shop')}
                className="group flex flex-col items-center gap-1.5 transition-all duration-300 cursor-pointer min-w-[54px]"
              >
                <div className={`transition-all duration-300 ${
                  activeTab === 'shop'
                    ? 'text-[#E6C687] scale-110 drop-shadow-[0_0_12px_rgba(230,198,135,0.5)]'
                    : 'text-[#6F7482] group-hover:text-[#C5CAD6] group-hover:scale-105'
                }`}>
                  <Store className="h-6 w-6 stroke-[1.8]" />
                </div>
                <span className={`text-[9px] tracking-[0.16em] transition-colors ${
                  activeTab === 'shop' ? 'font-bold text-[#E6C687]' : 'font-medium text-[#6F7482] group-hover:text-[#A8ADB9]'
                }`}>
                  SHOP
                </span>
                <span className={`h-1 w-1 rounded-full transition-all duration-300 ${
                  activeTab === 'shop' ? 'bg-[#E6C687] shadow-[0_0_8px_#E6C687]' : 'bg-transparent'
                }`} />
              </Link>

              {/* MORE (Tuning & Atelier Calibration Console) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('more');
                  setIsMenuOpen(true);
                }}
                className="group flex flex-col items-center gap-1.5 transition-all duration-300 cursor-pointer min-w-[54px]"
              >
                <div className={`transition-all duration-300 ${
                  activeTab === 'more'
                    ? 'text-[#E6C687] scale-110 drop-shadow-[0_0_12px_rgba(230,198,135,0.5)]'
                    : 'text-[#6F7482] group-hover:text-[#C5CAD6] group-hover:scale-105'
                }`}>
                  <SlidersHorizontal className="h-6 w-6 stroke-[1.8]" />
                </div>
                <span className={`text-[9px] tracking-[0.16em] transition-colors ${
                  activeTab === 'more' ? 'font-bold text-[#E6C687]' : 'font-medium text-[#6F7482] group-hover:text-[#A8ADB9]'
                }`}>
                  MORE
                </span>
                <span className={`h-1 w-1 rounded-full transition-all duration-300 ${
                  activeTab === 'more' ? 'bg-[#E6C687] shadow-[0_0_8px_#E6C687]' : 'bg-transparent'
                }`} />
              </button>
            </div>
          </nav>
        </main>

        {/* DESKTOP SIDE PANEL (RIGHT): Atelier Operations */}
        <aside className="hidden lg:flex w-72 flex-col gap-5 ps-8">
          <div className="rounded-3xl border border-white/5 bg-[#0E1015]/80 p-6 backdrop-blur-xl shadow-2xl">
            <h3 className="text-xs font-mono tracking-widest text-[#94A3B8] uppercase">TEZKOR AMALLAR</h3>

            <div className="mt-4 space-y-2.5">
              <Link
                href={`/${locale}/studio`}
                className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#D4AE62]/20 to-transparent border border-[#D4AE62]/30 p-3.5 text-xs font-bold text-[#E6C687] hover:border-[#D4AE62] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#E6C687]" />
                  <span>4K Studiyani ochish</span>
                </span>
                <ArrowUpRight className="h-4 w-4 rtl:rotate-90" />
              </Link>

              <button
                type="button"
                onClick={() => setIsAddDetailModalOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#D4AE62]/10 to-transparent border border-[#D4AE62]/20 p-3.5 text-xs font-semibold text-[#E6C687] hover:bg-[#D4AE62]/15 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#D4AE62]" />
                  <span>Add Detail (Yangi detal)</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#D4AE62] rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={() => setIsImporterOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl bg-white/5 p-3.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#D4AE62]" />
                  <span>Katalog import qilish</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#94A3B8] rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={() => setIsCustomPartOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl bg-white/5 p-3.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#D4AE62]" />
                  <span>AI Kesilgan detal (BiRefNet)</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#94A3B8] rtl:rotate-180" />
              </button>
            </div>

            <div className="mt-8 border-t border-white/5 pt-4">
              <p className="text-[10px] font-mono text-[#94A3B8] uppercase">SINOV AKKAUNTLARI</p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => switchDemoProfile('b2b_seller')}
                  className="rounded-xl bg-white/5 px-3 py-1.5 text-start text-[11px] font-medium text-white hover:bg-[#D4AE62]/10 hover:text-[#E6C687] transition-colors cursor-pointer"
                >
                  B2B Usta (Apex Customs)
                </button>
                <button
                  type="button"
                  onClick={() => switchDemoProfile('b2c_user')}
                  className="rounded-xl bg-white/5 px-3 py-1.5 text-start text-[11px] font-medium text-white hover:bg-[#D4AE62]/10 hover:text-[#E6C687] transition-colors cursor-pointer"
                >
                  B2C Mijoz (Bobur Karimov)
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* SLIDE-OVER WORKSHOP MENU DRAWER */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative z-10 w-full max-w-xs bg-[#0E1015] border-e border-white/10 p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex flex-col">
                  <span className="font-serif text-base font-bold tracking-[0.25em] text-[#E6C687]">
                    VELOCE
                  </span>
                  <span className="text-[9px] tracking-widest text-[#8E8A85]">
                    ATELIER CONTROLS
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="mt-6 rounded-2xl bg-[#161820] p-4 border border-white/5">
                <p className="text-xs font-bold text-white">{activeShopName}</p>
                <p className="mt-0.5 text-[11px] text-[#8E8A85]">{user?.phone || '+998 90 123 45 67'}</p>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
                  <span className="text-[10px] font-mono text-[#8E8A85]">Kreditlar:</span>
                  <span className="text-sm font-bold text-[#E6C687]">{activeCredits}</span>
                </div>
              </div>

              {/* Navigation links */}
              <div className="mt-6 space-y-1.5">
                <Link
                  href={`/${locale}/garage`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <CarFront className="h-4 w-4 text-[#D4AE62]" />
                  <span>Garaj / Omborxona</span>
                </Link>

                <Link
                  href={`/${locale}/studio`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-[#D4AE62]" />
                  <span>Tyuning Studiyasi</span>
                </Link>

                <Link
                  href={`/${locale}/marketplace`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  <ShoppingBag className="h-4 w-4 text-[#D4AE62]" />
                  <span>Marketplace</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsLockModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Lock className="h-4 w-4 text-[#D4AE62]" />
                  <span>Mijoz Rejimi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsVoucherModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <QrCode className="h-4 w-4 text-[#D4AE62]" />
                  <span>Vaucher faollashtirish</span>
                </button>
              </div>
            </div>

            {/* Logout button */}
            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 rtl:rotate-180" />
                <span>Chiqish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD DETAIL MODAL (Requested custom button action) */}
      <Modal
        isOpen={isAddDetailModalOpen}
        onClose={() => setIsAddDetailModalOpen(false)}
        title="ADD DETAIL // OMBORGA QO'SHISH"
      >
        <form onSubmit={handleAddDetailSubmit} className="space-y-4">
          <p className="text-xs text-[#94A3B8]">
            Servis omboriga yangi modifikatsiya detalini qo&apos;shing. U bir zumda ro&apos;yxatda va 4K Studiyada aks etadi.
          </p>

          {/* Part Name */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8C867D] uppercase tracking-wider mb-1.5">
              Detal Nomi
            </label>
            <input
              type="text"
              required
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              placeholder="masalan: BBS CI-R 20'', Akrapovič Titanium..."
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-white/10 text-white placeholder:text-[#555A68] text-xs focus:outline-none focus:border-[#D4AE62]"
            />
          </div>

          {/* Category Slot */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8C867D] uppercase tracking-wider mb-1.5">
              Kategoriya
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['WHEELS', 'BODY KIT', 'SUSPENSION', 'INTERIOR', 'PERFORMANCE'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewPartCategory(cat)}
                  className={`rounded-xl py-2 px-2 text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    newPartCategory === cat
                      ? 'bg-[#D4AE62]/20 border border-[#D4AE62] text-[#E6C687]'
                      : 'bg-[#0A0B0F] border border-white/10 text-[#7E828E] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subtitle / Specs */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8C867D] uppercase tracking-wider mb-1.5">
              Texnik Tavsif / Xususiyat
            </label>
            <input
              type="text"
              value={newPartSubtitle}
              onChange={(e) => setNewPartSubtitle(e.target.value)}
              placeholder="masalan: Wheels • Set of 4 yoki Carbon • Front"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-white/10 text-white placeholder:text-[#555A68] text-xs focus:outline-none focus:border-[#D4AE62]"
            />
          </div>

          {/* Retail Price */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8C867D] uppercase tracking-wider mb-1.5">
              Narxi (USD)
            </label>
            <input
              type="number"
              min="0"
              value={newPartPrice}
              onChange={(e) => setNewPartPrice(e.target.value)}
              placeholder="masalan: 2450"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-white/10 text-white font-mono placeholder:text-[#555A68] text-xs focus:outline-none focus:border-[#D4AE62]"
            />
          </div>

          {/* Image Presets Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8C867D] uppercase tracking-wider mb-1.5">
              Rasm Tanlash
            </label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_IMAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.url}
                  type="button"
                  onClick={() => setNewPartImage(opt.url)}
                  className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    newPartImage === opt.url
                      ? 'border-[#D4AE62] shadow-[0_0_12px_rgba(212,174,98,0.4)]'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={opt.url} alt={opt.label} className="h-full w-full object-cover" />
                  {newPartImage === opt.url && (
                    <div className="absolute inset-0 bg-[#D4AE62]/20 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-[#E6C687] stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-xs font-bold tracking-[0.16em] text-[#12141A] transition-all hover:scale-[1.02] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #E6C687 0%, #D4AE62 50%, #C49B4D 100%)',
                boxShadow: '0 6px 20px -4px rgba(212,174,98,0.4)',
              }}
            >
              <span>OMBORGA QO&apos;SHISH</span>
              <ChevronRight className="h-4 w-4 stroke-[2.5] rtl:rotate-180" />
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ITEM ACTION MODAL (From three dots menu) */}
      {selectedProductForAction && (
        <Modal
          isOpen={Boolean(selectedProductForAction)}
          onClose={() => setSelectedProductForAction(null)}
          title={selectedProductForAction.name}
        >
          <div className="space-y-4">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-white/5">
              <img
                src={selectedProductForAction.image}
                alt={selectedProductForAction.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                <span className="text-[10px] font-bold text-[#E6C687]">{selectedProductForAction.category}</span>
                <p className="text-xs text-[#94A3B8]">{selectedProductForAction.subtitle}</p>
                {selectedProductForAction.price && (
                  <p className="text-sm font-mono font-bold text-white mt-1">${selectedProductForAction.price.toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href={`/${locale}/studio`}
                onClick={() => setSelectedProductForAction(null)}
                className="flex items-center justify-between rounded-xl bg-[#D4AE62]/10 border border-[#D4AE62]/30 p-3 text-xs font-bold text-[#E6C687] hover:bg-[#D4AE62]/20 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>4K Studiyada avtomobilga o&apos;rnatib ko&apos;rish</span>
                </span>
                <ExternalLink className="h-4 w-4 rtl:rotate-180" />
              </Link>

              <button
                type="button"
                onClick={() => handleDeleteProduct(selectedProductForAction.id)}
                className="flex w-full items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Ombor zaxirasidan o&apos;chirish</span>
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Mode Lock Modal */}
      <CustomerViewLockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        isLocked={isCustomerViewLocked}
        onToggleLock={handleToggleLock}
      />

      {/* Voucher Modal */}
      <RedeemVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        onVoucherRedeemed={() => setIsVoucherModalOpen(false)}
      />

      {/* Catalog Importer */}
      <Modal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        title="1-Tugma bilan katalog import qilish"
      >
        <OneClickCatalogImporter onImportComplete={() => setIsImporterOpen(false)} />
      </Modal>

      {/* BiRefNet Custom Part Uploader */}
      <Modal
        isOpen={isCustomPartOpen}
        onClose={() => setIsCustomPartOpen(false)}
        title="AI Orqa fonni kesuvchi uploader (BiRefNet)"
      >
        <CustomPartUploader onPartAdded={() => setIsCustomPartOpen(false)} />
      </Modal>

      {/* FULLSCREEN SMART CAMERA // 4K SCAN MODAL */}
      {isSmartCameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#07080B] text-white">
          {/* Top Bar Header */}
          <div className="relative z-30 flex h-16 items-center justify-between px-4 sm:px-6 bg-[#07080B]/90 backdrop-blur-xl border-b border-white/[0.06]">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                if (!isProcessingCapture) {
                  setIsSmartCameraOpen(false);
                }
              }}
              aria-label="Yopish"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title & Guidance */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#19D3FF] animate-pulse" />
                <h2 className="text-xs sm:text-sm font-bold tracking-[0.2em] text-[#EDE8DF]">
                  SMART CAMERA // 4K SCAN
                </h2>
              </div>
              <p className="text-[9px] sm:text-[10px] tracking-wider text-[#D4AE62]">
                AVTOMOBILNI KADRGA JOYLASHTIRING
              </p>
            </div>

            {/* Quick Demo Photo Trigger & File Upload Fallback */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSampleCarSelect('/images/veloce_black_coupe.jpg')}
                disabled={isProcessingCapture}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#D4AE62]/40 bg-[#D4AE62]/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#E6C687] hover:bg-[#D4AE62]/20 transition-all cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                <span>DEMO KADR</span>
              </button>

              <label className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-medium tracking-wider text-white hover:bg-white/20 transition-all cursor-pointer">
                <Upload className="h-3 w-3" />
                <span className="hidden sm:inline">RASM YUKLASH</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          handleSampleCarSelect(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Camera Viewport Area */}
          <div className="relative flex-1 w-full h-full overflow-hidden bg-black">
            <SmartCameraView
              currentAngleId={1}
              totalAngles={1}
              completedAngles={[]}
              onPhotoCaptured={handlePhotoCaptured}
              className="w-full h-full"
            />

            {/* Processing / Transfer Overlay */}
            {isProcessingCapture && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#07080B]/90 backdrop-blur-2xl">
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-full border-2 border-[#D4AE62]/20 border-t-[#D4AE62] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-[#D4AE62] animate-pulse" />
                  </div>
                </div>
                <h3 className="text-sm font-bold tracking-[0.2em] text-[#EDE8DF] uppercase">
                  AVTOMOBIL ANQLANDI // 4K SCAN TAYYOR
                </h3>
                <p className="mt-2 text-xs font-mono text-[#D4AE62] tracking-wider">
                  4K Studio visualizerga o&apos;tkazilmoqda...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
