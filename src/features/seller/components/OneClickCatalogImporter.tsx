'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Check, Download, Layers, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CatalogTemplateItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  suggestedPriceCents: number;
  suggestedLaborCents: number;
  imageUrl: string;
}

const TEMPLATE_ITEMS: CatalogTemplateItem[] = [
  {
    id: 'a1000001-0000-0000-0000-000000000001',
    name: 'Vossen HF-5 Hybrid Forged 20"',
    category: 'WHEELS_RIMS',
    brand: 'Vossen',
    suggestedPriceCents: 85000,
    suggestedLaborCents: 10000,
    imageUrl: 'https://cdn.carvision.app/catalog/vossen-hf5.webp',
  },
  {
    id: 'a1000001-0000-0000-0000-000000000002',
    name: 'BBS CI-R Platinum Silver 17"',
    category: 'WHEELS_RIMS',
    brand: 'BBS',
    suggestedPriceCents: 42000,
    suggestedLaborCents: 10000,
    imageUrl: 'https://cdn.carvision.app/catalog/bbs-cir-17.webp',
  },
  {
    id: 'a1000002-0000-0000-0000-000000000001',
    name: 'Malibu 2 Redline Front Bumper',
    category: 'FRONT_BUMPER',
    brand: 'OEM+',
    suggestedPriceCents: 48000,
    suggestedLaborCents: 12000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-redline-bumper.webp',
  },
  {
    id: 'a1000002-0000-0000-0000-000000000002',
    name: 'Gentra Optra Premier Front Bumper',
    category: 'FRONT_BUMPER',
    brand: 'CustomFit',
    suggestedPriceCents: 24000,
    suggestedLaborCents: 8000,
    imageUrl: 'https://cdn.carvision.app/catalog/gentra-optra-bumper.webp',
  },
  {
    id: 'a1000003-0000-0000-0000-000000000001',
    name: 'Malibu 2 Full LED Laser Headlights',
    category: 'HEADLIGHTS',
    brand: 'CustomLED',
    suggestedPriceCents: 58000,
    suggestedLaborCents: 8000,
    imageUrl: 'https://cdn.carvision.app/catalog/malibu-laser-led.webp',
  },
  {
    id: 'a1000004-0000-0000-0000-000000000001',
    name: 'Gloss Nardo Gray Full Body Wrap',
    category: 'BODY_COLOR',
    brand: 'Inozetek',
    suggestedPriceCents: 160000,
    suggestedLaborCents: 40000,
    imageUrl: 'https://cdn.carvision.app/catalog/wrap-nardo-gray.webp',
  },
];

export function OneClickCatalogImporter({
  onImportComplete
}: {
  onImportComplete?: (importedCount: number) => void;
}) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(TEMPLATE_ITEMS.map((i) => i.id))
  );
  const [isImporting, setIsImporting] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
    // Simulate database bulk inventory insertion
    await new Promise((r) => setTimeout(r, 800));
    setIsImporting(false);
    setIsDone(true);
    onImportComplete?.(selectedIds.size);
  };

  if (isDone) {
    return (
      <div className="p-8 rounded-2xl glass-panel text-center">
        <div className="w-14 h-14 rounded-full bg-accent-green/20 text-accent-green flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Catalog Stocked Successfully!</h3>
        <p className="text-sm text-[#94A3B8] mb-6">
          {selectedIds.size} verified tuning accessories have been imported into your workshop omborxona.
        </p>
        <Button onClick={() => setIsDone(false)} variant="primary">
          Manage Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl glass-panel">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#232733] mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent-cyan text-xs font-bold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" /> 1-Click Fast Stock
          </div>
          <h2 className="text-xl font-bold text-white">Import Verified Master Catalog</h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Stock your workshop inventory with market-tested parts and recommended retail pricing in 3 minutes.
          </p>
        </div>

        <Button
          onClick={handleImport}
          disabled={selectedIds.size === 0 || isImporting}
          isLoading={isImporting}
          variant="primary"
          className="shrink-0 h-12"
        >
          <Download className="w-4 h-4 me-2" />
          <span>Import ({selectedIds.size} items)</span>
        </Button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATE_ITEMS.map((item) => {
          const isSelected = selectedIds.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl bg-[#181B22] border transition-all cursor-pointer',
                isSelected
                  ? 'border-accent-cyan shadow-[0_0_12px_rgba(25,211,255,0.2)]'
                  : 'border-[#232733] opacity-60 hover:opacity-100'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'bg-accent-cyan border-accent-cyan text-[#0A0B0F]' : 'border-white/30'
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center p-1 shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-accent-cyan uppercase font-bold">{item.brand}</span>
                  <h4 className="text-xs font-semibold text-white line-clamp-1">{item.name}</h4>
                  <div className="text-[11px] font-mono text-[#94A3B8]">
                    ${(item.suggestedPriceCents / 100).toFixed(0)} + ${(item.suggestedLaborCents / 100).toFixed(0)} labor
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
