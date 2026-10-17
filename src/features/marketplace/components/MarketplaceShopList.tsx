'use client';

import * as React from 'react';
import { MaskedShopCard, type MaskedShopData } from './MaskedShopCard';
import { DepositCheckoutModal } from './DepositCheckoutModal';
import { ReceiptUploadModal, type UnlockedShopDetails } from './ReceiptUploadModal';
import { VoucherUnlockedScreen } from './VoucherUnlockedScreen';
import { ProductGrid, type CatalogProduct } from '@/components/ProductCard';
import { UserAccountBar } from '@/features/auth/components/UserAccountBar';
import { ShieldCheck, Search, Sparkles, Store, Check, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [shops, setShops] = React.useState<MaskedShopData[]>([]);
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [loadingShops, setLoadingShops] = React.useState(true);
  const [loadingProducts, setLoadingProducts] = React.useState(true);

  const [selectedShop, setSelectedShop] = React.useState<MaskedShopData | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<CatalogProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
  const [unlockedDetails, setUnlockedDetails] = React.useState<UnlockedShopDetails | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [onlyCompatible, setOnlyCompatible] = React.useState(true);

  // Fetch verified workshops from live Supabase
  React.useEffect(() => {
    let isMounted = true;
    const fetchShops = async () => {
      try {
        setLoadingShops(true);
        const res = await fetch('/api/v1/shops');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.shops)) {
          setShops(data.shops);
        }
      } catch (err) {
        console.error('Failed to load shops from Supabase:', err);
      } finally {
        if (isMounted) setLoadingShops(false);
      }
    };
    fetchShops();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch real products from live Supabase
  React.useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch('/api/v1/products');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error('Failed to load products from Supabase:', err);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };
    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const vehicleModelId = 'chevrolet-malibu-2';

  const handleBookClick = (shop: MaskedShopData) => {
    setSelectedShop(shop);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  const handleVerificationSuccess = (details: UnlockedShopDetails) => {
    setUnlockedDetails(details);
  };

  if (unlockedDetails) {
    return <VoucherUnlockedScreen details={unlockedDetails} onReset={() => setUnlockedDetails(null)} />;
  }

  const filteredShops = shops.filter(
    (s) =>
      s.maskedLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' ||
      (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    const matchesCompatibility = !onlyCompatible || (p.compatibility?.some((m) => m.id === vehicleModelId) ?? false);
    return matchesSearch && matchesCategory && matchesCompatibility;
  });

  const activeTotalPrice = selectedProduct ? selectedProduct.price : 145000;
  const activeDepositAmount = Math.round(activeTotalPrice * 0.03);

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
              ? 'Browse genuine aerodynamic kits, forged wheels, and styling components with verified Malibu 2 fitment.'
              : 'Direct connection to certified tuning garages in Tashkent. Locked contact details unlock upon 3% escrow deposit confirmation.'}
          </p>
        </div>

        {/* User Account / Balance Bar */}
        <div className="shrink-0">
          <UserAccountBar />
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer',
            activeTab === 'catalog'
              ? 'bg-[#19D3FF]/15 text-[#19D3FF] border border-[#19D3FF]/30 shadow-[0_0_15px_rgba(25,211,255,0.2)]'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>Tuning Parts Catalog</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workshops')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer',
            activeTab === 'workshops'
              ? 'bg-[#19D3FF]/15 text-[#19D3FF] border border-[#19D3FF]/30 shadow-[0_0_15px_rgba(25,211,255,0.2)]'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
          )}
        >
          <Store className="w-4 h-4" />
          <span>Verified Studios</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white">
            {shops.length}
          </span>
        </button>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'catalog'
                ? 'Search aero kits, BBS, Vossen, spoilers...'
                : 'Search by facility code or district (Yunusobod, Chilanzar)...'
            }
            className="w-full ps-9 pe-4 py-2 rounded-xl bg-[#12141A] border border-white/10 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#19D3FF] focus:ring-1 focus:ring-[#19D3FF] transition-all"
          />
        </div>

        {activeTab === 'catalog' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyCompatible(!onlyCompatible)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer',
                onlyCompatible
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/10 bg-[#12141A] text-[#94A3B8] hover:text-white'
              )}
            >
              <Check className={cn('w-3.5 h-3.5', onlyCompatible ? 'opacity-100' : 'opacity-30')} />
              <span>Malibu 2 Fitment Only</span>
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

          {/* Product Grid / Skeleton */}
          {loadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              vehicleModelId={onlyCompatible ? vehicleModelId : null}
              onProductClick={(product) => {
                setSelectedProduct(product);
                setSelectedShop(shops[0] ?? null);
                setIsCheckoutOpen(true);
              }}
            />
          )}

          {!loadingProducts && filteredProducts.length === 0 && (
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
          {loadingShops ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShops.map((shop) => (
                <MaskedShopCard key={shop.id} shop={shop} onBookClick={handleBookClick} />
              ))}
            </div>
          )}

          {!loadingShops && filteredShops.length === 0 && (
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
        totalPriceCents={activeTotalPrice}
        depositAmountCents={activeDepositAmount}
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
