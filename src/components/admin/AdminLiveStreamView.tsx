'use client';

import * as React from 'react';
import { Activity, Clock, Cpu, Sparkles, CheckCircle2, RefreshCw, Eye } from 'lucide-react';

interface GenerationFeedItem {
  id: string;
  studioName: string;
  vehicle: string;
  angle: string;
  partsApplied: string;
  status: 'COMPLETED' | 'PROCESSING';
  imageUrl: string;
  resolution: string;
  durationSeconds: number;
  timeAgo: string;
}

const LIVE_GENERATIONS: GenerationFeedItem[] = [
  {
    id: 'gen-01',
    studioName: 'Apex Customs Studio',
    vehicle: 'Chevrolet Malibu 2',
    angle: 'Front 3/4 (45°)',
    partsApplied: '20" Forged Wheels + Gloss Black Shadowline',
    status: 'COMPLETED',
    imageUrl: '/images/car-after.jpg',
    resolution: '3840 × 2160 (4K)',
    durationSeconds: 1.28,
    timeAgo: 'Hozirgina',
  },
  {
    id: 'gen-02',
    studioName: 'Dubai Custom Wheels',
    vehicle: 'BMW M4 Competition',
    angle: 'Side Stance (90°)',
    partsApplied: 'Carbon Aerokit + 21" Bronze Wheels',
    status: 'COMPLETED',
    imageUrl: '/assets/car-CjioCIbt.jpg',
    resolution: '3840 × 2160 (4K)',
    durationSeconds: 1.42,
    timeAgo: '18 soniya oldin',
  },
  {
    id: 'gen-03',
    studioName: 'Autotune Pro Tashkent',
    vehicle: 'Chevrolet Malibu OEM',
    angle: 'Original Kadr (Before)',
    partsApplied: 'Asl zavod holati skaneri',
    status: 'COMPLETED',
    imageUrl: '/images/car-before.jpg',
    resolution: '1920 × 1080 (HD)',
    durationSeconds: 0.95,
    timeAgo: '45 soniya oldin',
  },
  {
    id: 'gen-04',
    studioName: 'Samarkand Tuning Lab',
    vehicle: 'Veloce Super Coupe',
    angle: 'Showroom Angled View',
    partsApplied: 'Dark Titanium Body + Lowered Suspension',
    status: 'COMPLETED',
    imageUrl: '/images/veloce_black_coupe.jpg',
    resolution: '3840 × 2160 (4K)',
    durationSeconds: 1.34,
    timeAgo: '1 daqiqa oldin',
  },
];

export function AdminLiveStreamView() {
  const [items] = React.useState<GenerationFeedItem[]>(LIVE_GENERATIONS);
  const [selectedImage, setSelectedImage] = React.useState<GenerationFeedItem | null>(null);

  return (
    <div className="space-y-6">
      {/* GPU Pipeline Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0D0F15] p-5 border border-[#D4AE62]/15 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Fal.ai FLUX Klasteri</span>
            <Cpu className="w-4 h-4 text-[#D4AE62]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">8x A100</div>
          <p className="text-[11px] text-emerald-400 mt-1">Barcha tugunlar faol</p>
        </div>

        <div className="rounded-2xl bg-[#0D0F15] p-5 border border-[#D4AE62]/15 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>O‘rtacha Render Tezligi</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">1.34s</div>
          <p className="text-[11px] text-[#64748B] mt-1">4K Upscale bilan birga</p>
        </div>

        <div className="rounded-2xl bg-[#0D0F15] p-5 border border-[#D4AE62]/15 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Hozirgi Navbat</span>
            <RefreshCw className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">2 kadr</div>
          <p className="text-[11px] text-[#64748B] mt-1">0.4s kutish vaqti</p>
        </div>

        <div className="rounded-2xl bg-[#0D0F15] p-5 border border-[#D4AE62]/15 shadow-md">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Bugungi 4K Natijalar</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">1,420 ta</div>
          <p className="text-[11px] text-purple-300 mt-1">99.8% muvaffaqiyat</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Jonli 4K AI Render Oqimi
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Atelyelardan kelib tushayotgan har bir fotosurat va uning 4K natijasi
          </p>
        </div>
      </div>

      {/* Grid of Renders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-[#0D0F15] border border-[#D4AE62]/15 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5)] group hover:border-[#D4AE62]/40 transition-all"
          >
            {/* Image Preview Container */}
            <div className="relative aspect-[16/9] bg-[#07080B] overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.vehicle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Status & Resolution Pills */}
              <div className="absolute top-3 start-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {item.status}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-[#E5C378] border border-[#D4AE62]/30">
                  {item.resolution}
                </span>
              </div>

              {/* Action Buttons on Hover */}
              <div className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setSelectedImage(item)}
                  className="p-2 rounded-xl bg-black/80 backdrop-blur-md text-white hover:text-[#D4AE62] transition-colors cursor-pointer"
                  title="Kattalashtirib ko'rish"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Gradient Bar */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white drop-shadow-md">{item.vehicle}</h4>
                  <p className="text-[11px] text-[#D4AE62] drop-shadow-sm">{item.partsApplied}</p>
                </div>
                <span className="text-[10px] text-white/80 font-mono bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm">
                  {item.durationSeconds}s
                </span>
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="p-4 flex items-center justify-between text-xs border-t border-[#D4AE62]/10 bg-[#12141C]">
              <span className="text-white font-medium">{item.studioName}</span>
              <span className="text-[#64748B] flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3" />
                {item.timeAgo}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full rounded-2xl overflow-hidden border border-[#D4AE62]/30 shadow-2xl">
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.vehicle}
              className="w-full h-auto object-contain max-h-[80vh]"
            />
            <div className="absolute bottom-0 inset-x-0 p-4 bg-black/80 backdrop-blur-md flex items-center justify-between text-xs text-white">
              <div>
                <span className="font-bold text-sm block">{selectedImage.vehicle}</span>
                <span className="text-[#D4AE62]">{selectedImage.studioName} • {selectedImage.partsApplied}</span>
              </div>
              <span className="text-[#94A3B8]">Yopish uchun ekranni bosing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
