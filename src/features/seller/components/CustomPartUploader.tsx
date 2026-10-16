'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, CheckCircle2 } from 'lucide-react';
import type { CategorySlot } from '@/domain/angle-validator';

export function CustomPartUploader({
  onPartAdded
}: {
  onPartAdded?: () => void;
}) {
  const [partName, setPartName] = React.useState('');
  const [category, setCategory] = React.useState<CategorySlot>('WHEELS_RIMS');
  const [priceUsd, setPriceUsd] = React.useState('');
  const [laborUsd, setLaborUsd] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName || !priceUsd) return;

    setIsProcessing(true);
    // Simulate AI BiRefNet background removal
    await new Promise((r) => setTimeout(r, 1200));
    setIsProcessing(false);
    setIsSuccess(true);
    onPartAdded?.();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-panel">
      <div className="flex items-center gap-2 text-accent-cyan text-xs font-bold uppercase tracking-wider mb-2">
        <Sparkles className="w-4 h-4" /> Custom Inventory Item
      </div>
      <h3 className="text-xl font-bold text-white mb-6">Add Custom Part with AI Auto-Cutout</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Part Name</label>
          <input
            type="text"
            required
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="e.g. Custom Forged Monoblock 20 inch"
            className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-[#232733] text-white focus:outline-none focus:border-accent-cyan"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Category Slot</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategorySlot)}
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-[#232733] text-white focus:outline-none focus:border-accent-cyan"
            >
              <option value="WHEELS_RIMS">Wheels & Rims</option>
              <option value="FRONT_BUMPER">Front Bumper</option>
              <option value="REAR_DIFFUSER">Rear Diffuser</option>
              <option value="HEADLIGHTS">Headlights</option>
              <option value="TAILLIGHTS">Taillights</option>
              <option value="TRUNK_SPOILER">Trunk Spoiler</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Retail Price (USD)</label>
            <input
              type="number"
              required
              min="0"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              placeholder="e.g. 750"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-[#232733] text-white font-mono focus:outline-none focus:border-accent-cyan"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Labor Cost (USD)</label>
            <input
              type="number"
              min="0"
              value={laborUsd}
              onChange={(e) => setLaborUsd(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-4 py-3 rounded-xl bg-[#0A0B0F] border border-[#232733] text-white font-mono focus:outline-none focus:border-accent-cyan"
            />
          </div>
        </div>

        {/* Upload dropzone placeholder */}
        <div className="border-2 border-dashed border-[#232733] rounded-2xl p-6 text-center hover:border-accent-cyan/60 transition-colors cursor-pointer bg-[#0A0B0F]/50">
          <Upload className="w-8 h-8 text-accent-cyan mx-auto mb-2" />
          <p className="text-xs text-white font-medium">Click to upload raw part photo</p>
          <p className="text-[10px] text-[#94A3B8] mt-1">AI automatically cuts out background and generates clean WebP</p>
        </div>

        {isSuccess && (
          <div className="p-3 rounded-xl bg-accent-green/20 text-accent-green border border-accent-green/40 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Part added and ready for 4K visualization!
          </div>
        )}

        <Button
          type="submit"
          disabled={isProcessing}
          isLoading={isProcessing}
          variant="primary"
          className="w-full h-12"
        >
          Add to Shop Inventory
        </Button>
      </div>
    </form>
  );
}
