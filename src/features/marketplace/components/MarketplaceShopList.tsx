'use client';

import * as React from 'react';
import { MaskedShopCard, type MaskedShopData } from './MaskedShopCard';
import { DepositCheckoutModal } from './DepositCheckoutModal';
import { ReceiptUploadModal, type UnlockedShopDetails } from './ReceiptUploadModal';
import { VoucherUnlockedScreen } from './VoucherUnlockedScreen';
import { ProductGrid, type CatalogProduct } from '@/components/ProductCard';
import { UserAccountBar } from '@/features/auth/components/UserAccountBar';
import { ShieldCheck, Search, Sparkles, SlidersHorizontal, Store, Check, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_SHOPS: MaskedShopData[] = [
  {
    id: '7f8b919d-6484-4827-86c3-16279f6bb123',
    maskedLabel: 'Verified Partner #B123',
    district: 'Yunusobod',
    distanceKm: 3.8,
    ratingAvg: 4.9,
    ratingCount: 42,
    logoUrl: undefined,
    activeOffersCount: 68,
  },
  {
    id: '9c12a84e-1249-411a-829b-81729afca772',
    maskedLabel: 'Verified Partner #A772',
    district: 'Chilanzar',
    distanceKm: 5.4,
    ratingAvg: 4.8,
    ratingCount: 29,
    logoUrl: undefined,
    activeOffersCount: 45,
  },
  {
    id: 'e49120ba-4412-4211-9012-71829afca881',
    maskedLabel: 'Verified Partner #C881',
    district: 'Mirzo Ulugbek',
    distanceKm: 6.1,
    ratingAvg: 5.0,
    ratingCount: 18,
    logoUrl: undefined,
    activeOffersCount: 54,
  },
];

const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'p-1',
    name: 'Vossen HF-5 20" Forged Wheels',
    price: 85000,
    image_url: 'https://cdn.carvision.app/catalog/vossen-hf5.webp',
    stock: 8,
    category: 'wheels',
    brand: 'Vossen',
    seller: { id: 's-1', business_name: 'Apex Wheels Tashkent' },
    compatibility: [{ id: 'chevrolet-malibu-2' }, { id: 'byd-seal' }],
  },
  {
    id: 'p-2',
    name: 'BBS CI-R 19" Satin Titanium Wheels',
    price: 65000,
    image_url: 'https://cdn.carvision.app/catalog/bbs-cir.webp',
    stock: 4,
    category: 'wheels',
    brand: 'BBS',
    seller: { id: 's-2', business_name: 'BBS Official Distributor' },
    compatibility: [{ id: 'chevrolet-malibu-2' }, { id: 'bmw-3-g20' }],
  },
  {
    id: 'p-3',
    name: 'Redline Sport Carbon Front Bumper & Splitter',
    price: 48000,
    image_url: 'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
    stock: 3,
    category: 'aero',
    brand: 'OEM+ Performance',
    seller: { id: 's-3', business_name: 'CarbonTech Lab' },
    compatibility: [{ id: 'chevrolet-malibu-2' }],
  },
  {
    id: 'p-4',
    name: 'Full Matrix LED Laser Headlight Assembly',
    price: 58000,
    image_url: 'https://cdn.carvision.app/catalog/malibu-laser-led.webp',
    stock: 5,
    category: 'lighting',
    brand: 'CustomLED Pro',
    seller: { id: 's-4', business_name: 'LuxOptics Pro' },
    compatibility: [{ id: 'chevrolet-malibu-2' }, { id: 'byd-seal' }],
  },
  {
    id: 'p-5',
    name: 'Supergloss Nardo Gray Ultra Vinyl Wrap (Full Roll)',
    price: 160000,
    image_url: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    stock: 12,
    category: 'wrap',
    brand: 'Inozetek',
    seller: { id: 's-5', business_name: 'ColorWrap Studio' },
    compatibility: [{ id: 'chevrolet-malibu-2' }],
  },
  {
    id: 'p-6',
    name: 'Dry Carbon Fiber Ducktail Trunk Spoiler',
    price: 35000,
    image_url: 'https://cdn.carvision.app/catalog/malibu-laser-led.webp',
    stock: 0,
    category: 'aero',
    brand: 'AeroCraft',
    seller: { id: 's-3', business_name: 'CarbonTech Lab' },
    compatibility: [{ id: 'chevrolet-malibu-2' }],
  },
  {
    id: 'p-7',
    name: 'Dual Quad-Fin Rear Aero Diffuser',
    price: 49000,
    image_url: 'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
    stock: 6,
    category: 'aero',
    brand: 'Akrapovic Style',
    seller: { id: 's-3', business_name: 'CarbonTech Lab' },
    compatibility: [{ id: 'chevrolet-malibu-2' }],
  },
  {
    id: 'p-8',
    name: 'Nano-Ceramic IR 15% Heat-Rejection Window Tint',
    price: 28000,
    image_url: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
    stock: 20,
    category: 'tint',
    brand: 'SunTek Ultra',
    seller: { id: 's-6', business_name: 'SolarShield Tint' },
    compatibility: [{ id: 'chevrolet-malibu-2' }, { id: 'byd-seal' }],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Catalog' },
  { id: 'wheels', label: 'Wheels & Rims' },
  { id: 'aero', label: 'Aero & Spoilers' },
  { id: 'lighting', label: 'Optics & LED' },
  { id: 'wrap', label: 'Vinyl Wraps' },
  { id: 'tint', label: 'Window Tint' },
];

export function MarketplaceShopList() {
  const [activeTab, setActiveTab] = React.useState<'catalog' | 'workshops'>('catalog');
  const [selectedShop, setSelectedShop] = React.useState<MaskedShopData | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
  const [unlockedDetails, setUnlockedDetails] = React.useState<UnlockedShopDetails | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [onlyCompatible, setOnlyCompatible] = React.useState(true);

  const vehicleModelId = 'chevrolet-malibu-2';

  const handleBookClick = (shop: MaskedShopData) => {
    setSelectedShop(shop);
    setIsCheckoutOpen(true);
  };

  const handleVerificationSuccess = (details: UnlockedShopDetails) => {
    setUnlockedDetails(details);
  };

  if (unlockedDetails) {
    return <VoucherUnlockedScreen details={unlockedDetails} onReset={() => setUnlockedDetails(null)} />;
  }

  const filteredShops = DEMO_SHOPS.filter(
    (s) =>
      s.maskedLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = CATALOG_PRODUCTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesCompatibility = !onlyCompatible || (p.compatibility?.some((m) => m.id === vehicleModelId) ?? false);
    return matchesSearch && matchesCategory && matchesCompatibility;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#19D3FF] text-xs font-bold uppercase tracking-wider mb-1.5 font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>3% Escrow Protected Automotive Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {activeTab === 'catalog' ? 'Tuning & Aero Parts Catalog' : 'Verified Installation Partners'}
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed max-w-xl">
            {activeTab === 'catalog'
              ? 'OEM-precision aftermarket aero components, forged wheels, and vinyl finishes calibrated for your chassis.'
              : 'Book certified partner workshops with reserved inventory, OEM precision fitment, and guaranteed price protection.'}
          </p>
        </div>

        {/* Actions & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <UserAccountBar />
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'catalog' ? 'Search parts, brands...' : 'Search by district or shop...'}
              className="w-full px-4 py-2.5 ps-10 rounded-2xl bg-[#12141A] border border-white/10 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#19D3FF] focus:shadow-glow transition-all"
            />
            <Search className="w-4 h-4 text-[#64748B] absolute start-3.5 top-3 pointer-events-none" />
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-full bg-[#12141A] p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none',
              activeTab === 'catalog'
                ? 'bg-[#19D3FF] text-[#0A0B0F] shadow-[0_0_16px_rgba(25,211,255,0.4)]'
                : 'text-[#94A3B8] hover:text-white'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Parts Catalog</span>
            <span className="ms-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
              {CATALOG_PRODUCTS.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workshops')}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer select-none',
              activeTab === 'workshops'
                ? 'bg-[#19D3FF] text-[#0A0B0F] shadow-[0_0_16px_rgba(25,211,255,0.4)]'
                : 'text-[#94A3B8] hover:text-white'
            )}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Certified Workshops</span>
            <span className="ms-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/30">
              {DEMO_SHOPS.length}
            </span>
          </button>
        </div>

        {/* Compatibility and Filter Toggles (Catalog Mode) */}
        {activeTab === 'catalog' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyCompatible((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer',
                onlyCompatible
                  ? 'border-[#00E599]/60 bg-[#00E599]/15 text-[#00E599] shadow-[0_0_12px_rgba(0,229,153,0.25)]'
                  : 'border-white/10 bg-white/5 text-[#94A3B8] hover:text-white'
              )}
            >
              <Check className={cn('w-3.5 h-3.5 stroke-[2.5]', onlyCompatible ? 'opacity-100' : 'opacity-40')} />
              <span>Fits Malibu 2.0T</span>
            </button>
          </div>
        )}
      </div>

      {/* Catalog Mode */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer',
                    isSelected
                      ? 'border-[#19D3FF] bg-[#19D3FF]/15 text-[#19D3FF] shadow-[0_0_12px_rgba(25,211,255,0.25)]'
                      : 'border-white/10 bg-[#12141A] text-[#94A3B8] hover:border-white/20 hover:text-white'
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          <ProductGrid
            products={filteredProducts}
            vehicleModelId={onlyCompatible ? vehicleModelId : null}
            onProductClick={() => {
              // Open workshop booking directly for installation
              setSelectedShop(DEMO_SHOPS[0] ?? null);
              setIsCheckoutOpen(true);
            }}
          />

          {filteredProducts.length === 0 && (
            <div className="py-16 text-center text-[#94A3B8] flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-[#19D3FF]" />
              <p className="text-sm">No catalog products found matching your current filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setOnlyCompatible(false);
                  setSearchQuery('');
                }}
                className="text-xs text-[#19D3FF] underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Workshops Mode */}
      {activeTab === 'workshops' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredShops.map((shop) => (
              <MaskedShopCard key={shop.id} shop={shop} onBookClick={handleBookClick} />
            ))}
          </div>

          {filteredShops.length === 0 && (
            <div className="py-16 text-center text-[#94A3B8] flex flex-col items-center justify-center gap-3">
              <Wrench className="w-8 h-8 text-[#19D3FF]" />
              <p className="text-sm">No verified partner facilities found matching &quot;{searchQuery}&quot;.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <DepositCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        shop={selectedShop ?? undefined}
        totalPriceCents={145000} // $1450 demo build
        depositAmountCents={4350} // $43.50 deposit (3%)
        onOpenReceiptUpload={() => setIsReceiptModalOpen(true)}
      />

      <ReceiptUploadModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onVerificationSuccess={handleVerificationSuccess}
      />
    </div>
  );
}
