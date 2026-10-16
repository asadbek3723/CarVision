'use client';

import * as React from 'react';
import { MaskedShopCard, type MaskedShopData } from './MaskedShopCard';
import { DepositCheckoutModal } from './DepositCheckoutModal';
import { ReceiptUploadModal, type UnlockedShopDetails } from './ReceiptUploadModal';
import { VoucherUnlockedScreen } from './VoucherUnlockedScreen';
import { ShieldCheck, Search } from 'lucide-react';

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

export function MarketplaceShopList() {
  const [selectedShop, setSelectedShop] = React.useState<MaskedShopData | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
  const [unlockedDetails, setUnlockedDetails] = React.useState<UnlockedShopDetails | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#232733] gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-cyan text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> 3% Escrow Verified Network
          </div>
          <h1 className="text-2xl font-bold text-white">Verified Tuning & Detailing Partners</h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Book certified workshops with reserved parts and guaranteed price protection.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by district or ID..."
            className="w-full px-4 py-2.5 ps-9 rounded-xl bg-[#12141A] border border-[#232733] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-accent-cyan"
          />
          <Search className="w-4 h-4 text-[#64748B] absolute start-3 top-3 pointer-events-none" />
        </div>
      </header>

      {/* Grid of Masked Workshop Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShops.map((shop) => (
          <MaskedShopCard key={shop.id} shop={shop} onBookClick={handleBookClick} />
        ))}
      </div>

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
