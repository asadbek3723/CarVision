'use client';

import * as React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, Clock } from 'lucide-react';

export interface LiveGenerationItem {
  id: string;
  shopName: string;
  vehicle: string;
  angle: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  previewUrl: string;
  timestamp: string;
}

const DEMO_LIVE_GENERATIONS: LiveGenerationItem[] = [
  {
    id: 'gen-101',
    shopName: 'Autotune Pro Tashkent',
    vehicle: 'Chevrolet Malibu 2',
    angle: 'Front 3/4 (45°)',
    status: 'COMPLETED',
    previewUrl: 'https://cdn.carvision.app/outputs/demo/malibu-tuned-angle-2.webp',
    timestamp: 'Just now',
  },
  {
    id: 'gen-102',
    shopName: 'Dubai Custom Wheels',
    vehicle: 'BMW M3 (G80)',
    angle: 'Side Profile (90°)',
    status: 'PROCESSING',
    previewUrl: 'https://cdn.carvision.app/originals/demo/malibu-angle-3.webp',
    timestamp: '12s ago',
  },
  {
    id: 'gen-103',
    shopName: 'Besh Agach Detailing',
    vehicle: 'Chevrolet Cobalt',
    angle: 'Front View (0°)',
    status: 'COMPLETED',
    previewUrl: 'https://cdn.carvision.app/originals/demo/malibu-angle-1.webp',
    timestamp: '45s ago',
  },
];

export function LiveGenerationStream() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent-cyan animate-pulse" />
          <h3 className="text-lg font-bold text-white">Live Generation Stream</h3>
        </div>
        <span className="text-xs text-[#94A3B8]">Real-time Fal.ai rendering feed</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DEMO_LIVE_GENERATIONS.map((gen) => (
          <GlassCard key={gen.id} className="p-3 overflow-hidden">
            <div className="relative aspect-video rounded-xl bg-black/60 overflow-hidden mb-2.5">
              <img
                src={gen.previewUrl}
                alt={gen.vehicle}
                className="w-full h-full object-cover"
              />
              <span
                className={
                  gen.status === 'COMPLETED'
                    ? 'absolute top-2 start-2 px-2 py-0.5 rounded text-[10px] font-bold bg-accent-green/20 text-accent-green border border-accent-green/30'
                    : 'absolute top-2 start-2 px-2 py-0.5 rounded text-[10px] font-bold bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 animate-pulse'
                }
              >
                {gen.status}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{gen.vehicle}</span>
                <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {gen.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-accent-cyan">{gen.shopName} • {gen.angle}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
