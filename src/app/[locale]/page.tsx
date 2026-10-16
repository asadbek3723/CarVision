'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Camera,
  Layers,
  ShieldCheck,
  Video,
  ChevronRight,
  Wrench,
  Car,
  Globe,
  Sliders,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const LOCALES = [
  { code: 'uz', label: "O'zbekcha" },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'ky', label: 'Кыргызча' },
  { code: 'tg', label: 'Тоҷикӣ' },
];

export default function HomePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params['locale'] as string) || 'en';

  const [activeRole, setActiveRole] = useState<'b2b' | 'b2c'>('b2b');

  const handleLanguageChange = (newLocale: string) => {
    router.push(`/${newLocale}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#0A0B0F]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-cyan-500/20">
              CV
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-white">CARVISION</span>
              <span className="text-[10px] block text-cyan-400 font-mono tracking-widest uppercase">
                AI Automotive OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Language Switcher */}
            <div className="relative flex items-center bg-[#12141A] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
              <Globe className="w-3.5 h-3.5 text-cyan-400 me-2" />
              <select
                value={locale}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer appearance-none font-medium pe-4"
                aria-label="Select Language"
              >
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#12141A] text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href={`/${locale}/admin`}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors"
            >
              Admin
            </Link>

            <Link
              href={`/${locale}/studio/demo`}
              className="px-4 py-2 rounded-xl bg-[#19D3FF] hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <span>Launch Studio</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Neon Ambient Glows */}
        <div className="absolute top-1/4 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 end-10 w-[350px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>FLUX Fill Inpainting + 4K Upscale + Serwist PWA</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]"
          >
            See The Build{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19D3FF] via-cyan-300 to-blue-500">
              Before
            </span>{' '}
            The Wrench Turns.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed"
          >
            The world&apos;s first enterprise platform uniting 3D Smart Camera guidance,
            instant sub-5-second 4K photorealistic car tuning, and a 3% escrow marketplace for verified workshops.
          </motion.p>

          {/* Role Switcher Selector */}
          <div className="mt-10 inline-flex p-1.5 rounded-2xl bg-[#12141A] border border-white/10 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveRole('b2b')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeRole === 'b2b'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Workshop / Bay Pro (B2B)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('b2c')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeRole === 'b2c'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Car Owner / Client (B2C)</span>
            </button>
          </div>

          {/* Dynamic Action Buttons based on Role */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {activeRole === 'b2b' ? (
              <>
                <Link
                  href={`/${locale}/studio/demo`}
                  className="px-8 py-4 rounded-xl bg-[#19D3FF] hover:bg-cyan-400 text-black font-extrabold text-sm uppercase tracking-wider transition-all shadow-xl shadow-cyan-500/25 flex items-center gap-2.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Bay Camera Walkaround</span>
                </Link>
                <Link
                  href={`/${locale}/seller`}
                  className="px-8 py-4 rounded-xl bg-[#12141A] hover:bg-[#1A1D26] border border-white/10 text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2.5"
                >
                  <Layers className="w-4 h-4" />
                  <span>Workshop Inventory Console</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/marketplace`}
                  className="px-8 py-4 rounded-xl bg-[#19D3FF] hover:bg-cyan-400 text-black font-extrabold text-sm uppercase tracking-wider transition-all shadow-xl shadow-cyan-500/25 flex items-center gap-2.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Explore Verified Tuning Shops</span>
                </Link>
                <Link
                  href={`/${locale}/studio/demo`}
                  className="px-8 py-4 rounded-xl bg-[#12141A] hover:bg-[#1A1D26] border border-white/10 text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2.5"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Try 4K Visualizer Demo</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Flagship Pillars Grid */}
      <section className="py-16 bg-[#12141A]/50 border-t border-b border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">
              Architecture & Capabilities
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white">
              Built for Dirty Hands and Tablet Screens in the Bay
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-[#12141A] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#19D3FF] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">8-Angle 3D Smart Camera</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Wireframe HUD guides technicians to the exact angle with luma exposure checks and Green-Lock auto-shutter.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#12141A] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#19D3FF] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">4K FLUX Inpainting</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Sub-5s photorealistic render swaps rims, body kits, diffusers, wraps, and tints with OEM fitment verification.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#12141A] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#19D3FF] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">0$ Client-Side Video Reel</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                WebCodecs encoder generates an 11-second viral 60fps MP4 with 808 bass-drop screen shakes on the user&apos;s GPU.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-[#12141A] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[#19D3FF] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">3% Escrow Booking</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Zero-risk parts reservation for clients and verified customer commitment for workshops with digital vouchers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights: B2B vs B2C */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Column: Workshop Workflow */}
          <div className="bg-[#12141A] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 end-0 p-8 text-neutral-800 pointer-events-none">
              <Wrench className="w-32 h-32 opacity-10" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono mb-4">
              <Lock className="w-3 h-3" />
              <span>Customer View PIN Lock (C-PIN)</span>
            </div>
            <h3 className="text-2xl font-black text-white mb-4">For Workshops &amp; Detailing Bays</h3>
            <ul className="space-y-3.5 text-xs text-neutral-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Hand the tablet to your customer in PIN-locked mode with retail pricing only.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>1-Click Master Catalog import for Vossen, BBS, Brembo, Akrapovic, and SunTek.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Serial voucher redemption immediately releases escrow deposits into workshop ledger.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Automated weak 4G garage resilience with IndexedDB photo syncing.</span>
              </li>
            </ul>
            <div className="mt-8">
              <Link
                href={`/${locale}/seller`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <span>Open Workshop Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Marketplace Workflow */}
          <div className="bg-[#12141A] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 end-0 p-8 text-neutral-800 pointer-events-none">
              <Car className="w-32 h-32 opacity-10" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono mb-4">
              <ShieldCheck className="w-3 h-3" />
              <span>Anti-Disintermediation Masking</span>
            </div>
            <h3 className="text-2xl font-black text-white mb-4">For Drivers &amp; Enthusiasts</h3>
            <ul className="space-y-3.5 text-xs text-neutral-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Pick wheels and colors on your exact car before spending thousands on parts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Compare verified partner workshops by certified equipment, warranty, and distance.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Guaranteed 3% escrow reservation: deducted 100% from your final garage invoice.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Receive a permanent cryptographic CarVision Tuning Passport for resale value.</span>
              </li>
            </ul>
            <div className="mt-8">
              <Link
                href={`/${locale}/marketplace`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <span>Browse Verified Shops</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 bg-[#08090D] py-10 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">CarVision OS</span>
            <span>&copy; {new Date().getFullYear()} CarVision Technologies. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href={`/${locale}/studio/demo`} className="hover:text-white transition-colors">
              Studio
            </Link>
            <Link href={`/${locale}/seller`} className="hover:text-white transition-colors">
              Workshop
            </Link>
            <Link href={`/${locale}/marketplace`} className="hover:text-white transition-colors">
              Marketplace
            </Link>
            <Link href={`/${locale}/admin`} className="hover:text-white transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
