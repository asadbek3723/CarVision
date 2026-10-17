'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Award,
  Sparkles,
  Car,
  Wrench,
  Clock,
  ChevronRight,
  LogOut,
  Sliders,
  Globe,
  Check,
  ExternalLink,
  Zap,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useVeloceStore } from '@/context/VeloceStore';

interface FleetVehicle {
  id: string;
  name: string;
  chassis: string;
  image: string;
  stage: string;
  specs: string[];
  lastModified: string;
}

const FLEET_PROJECTS: FleetVehicle[] = [
  {
    id: 'f1',
    name: 'BMW M4 Competition',
    chassis: 'G82 Coupé',
    image: '/assets/car-CjioCIbt.jpg',
    stage: 'Stage 2 Completed',
    specs: ['VZ-01 20" Forged', 'Akrapovič Evolution Titanium', 'KW V4 Coilovers'],
    lastModified: 'Bugun, 14:30',
  },
  {
    id: 'f2',
    name: 'Porsche 911 GT3 RS',
    chassis: '992 Track Spec',
    image: '/images/studio/studio_coupe_tuned.jpg',
    stage: 'Fitting In Progress',
    specs: ['Carbon Aero Lip', 'Öhlins TTX Race Damper', 'Forged BBS Monoblock'],
    lastModified: 'Kecha, 18:45',
  },
  {
    id: 'f3',
    name: 'Audi RS6 Avant',
    chassis: 'C8 Quattro',
    image: '/assets/garage-Bst4bQtu.jpg',
    stage: 'Scheduled for Scan',
    specs: ['Capristo Valved Exhaust', '22" Billet Wheels'],
    lastModified: '14 Okt, 2026',
  },
];

const RECENT_ORDERS = [
  {
    id: 'ORD-8924',
    title: 'VZ-01 Forged Monoblock Set (20")',
    date: '16 Okt, 2026',
    price: '$4,800',
    status: 'Fitted',
  },
  {
    id: 'ORD-8921',
    title: 'Akrapovič Evolution Titanium Exhaust',
    date: '12 Okt, 2026',
    price: '$6,400',
    status: 'Delivered',
  },
  {
    id: 'ORD-8890',
    title: 'Öhlins TTX Pro Suspension Kit',
    date: '04 Okt, 2026',
    price: '$3,850',
    status: 'Delivered',
  },
];

export function VeloceProfile() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.['locale'] as string) || 'uz';
  const { user, signOut } = useAuth();
  const { openCamera } = useVeloceStore();

  const [activeTab, setActiveTab] = React.useState<'fleet' | 'activity' | 'atelier'>('fleet');
  const [selectedLocale, setSelectedLocale] = React.useState(locale);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = React.useState(false);
  const [isAiUpscaleActive, setIsAiUpscaleActive] = React.useState(true);
  const [isHapticsActive, setIsHapticsActive] = React.useState(true);

  // Authenticated or luxury default atelier profile
  const profileName = user?.full_name || 'Sanjar Usmonov';
  const atelierName = user?.shop?.shop_name || 'Apex Customs Atelier';
  const profileEmail = user?.email || 'master@apexcustoms.uz';
  const profilePhone = user?.phone || '+998 90 123 45 67';
  const profileCity = user?.shop?.city ? `${user.shop.city}, ${user.shop.district}` : 'Toshkent, Yunusobod';
  const creditsBalance = user?.credits_balance ?? 2450;

  const handleLanguageChange = (newLocale: string) => {
    setSelectedLocale(newLocale);
    router.push(`/${newLocale}/profile`);
  };

  const handleConfirmSignOut = async () => {
    setIsSignOutModalOpen(false);
    await signOut();
    router.push(`/${locale}/login`);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] px-4 py-6 md:px-10 lg:px-16 max-w-6xl mx-auto space-y-10">
      {/* Profile Header Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#161821] to-[#0F1015] p-6 sm:p-8 md:p-10 shadow-card border border-[#D4AE62]/20">
        <div className="absolute -top-24 end-0 h-72 w-72 rounded-full bg-[#D4AE62]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            {/* Avatar with Gold Halo Glow */}
            <div className="relative">
              <div className="grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-2xl bg-gradient-to-br from-[#242735] to-[#12141A] shadow-gold border border-[#D4AE62]/30 text-2xl font-light text-primary">
                {profileName
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -end-1 grid h-7 w-7 place-items-center rounded-full bg-gold-gradient text-black shadow-md">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-foreground">
                  {profileName}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AE62]/15 px-3 py-1 text-[10px] font-semibold tracking-wider text-primary uppercase">
                  <Award className="h-3 w-3" />
                  VIP Tier 1
                </span>
              </div>
              <p className="font-display text-xs sm:text-sm font-light tracking-widest text-[#A69F92] uppercase">
                {atelierName} • Certified Master
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  {profileEmail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  {profilePhone}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {profileCity}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 pt-2 md:pt-0">
            <button
              onClick={openCamera}
              className="flex items-center gap-2 rounded-xl bg-gold-gradient px-4 py-2.5 text-xs font-semibold tracking-widest text-black uppercase transition hover:brightness-110 shadow-gold cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Yangi Loyiha</span>
            </button>
            <button
              onClick={() => setIsSignOutModalOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[#D4AE62]/20 text-muted-foreground transition hover:border-red-500/50 hover:text-red-400 cursor-pointer"
              title="Chiqish"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-[#D4AE62]/15">
          <div className="rounded-2xl bg-[#0D0E12]/60 p-4 border border-[#D4AE62]/10">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Faol Loyihalar
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-light text-foreground">
              3 Ta Avto
            </div>
          </div>
          <div className="rounded-2xl bg-[#0D0E12]/60 p-4 border border-[#D4AE62]/10">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              AI Kreditlar
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-light text-gold-gradient">
              {creditsBalance.toLocaleString()} PTS
            </div>
          </div>
          <div className="rounded-2xl bg-[#0D0E12]/60 p-4 border border-[#D4AE62]/10">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Ustaxona Reytingi
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-light text-foreground">
              4.95 / 5.0
            </div>
          </div>
          <div className="rounded-2xl bg-[#0D0E12]/60 p-4 border border-[#D4AE62]/10">
            <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              SLA Kafolati
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-light text-foreground">
              100% 4K Ultra
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-[#D4AE62]/15 pb-2">
        <button
          onClick={() => setActiveTab('fleet')}
          data-active={activeTab === 'fleet'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-widest uppercase transition data-[active=true]:bg-gold-gradient data-[active=true]:text-black text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Car className="h-4 w-4" />
          <span>Atelier Garaji</span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          data-active={activeTab === 'activity'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-widest uppercase transition data-[active=true]:bg-gold-gradient data-[active=true]:text-black text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Clock className="h-4 w-4" />
          <span>Buyurtmalar & Tarix</span>
        </button>
        <button
          onClick={() => setActiveTab('atelier')}
          data-active={activeTab === 'atelier'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-widest uppercase transition data-[active=true]:bg-gold-gradient data-[active=true]:text-black text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Sliders className="h-4 w-4" />
          <span>Sozlamalar</span>
        </button>
      </div>

      {/* TAB 1: FLEET / ATELIER GARAJI */}
      {activeTab === 'fleet' && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-light tracking-wide text-foreground">
                Joriy Tyuning Loyihalari
              </h2>
              <p className="text-xs text-muted-foreground">
                Ustaxonada tayyorlanayotgan va tyuning qilingan sport avtomobillari
              </p>
            </div>
            <Link
              href={`/${locale}/garage`}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <span>Barcha omborni ko‘rish</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FLEET_PROJECTS.map((vehicle) => (
              <div
                key={vehicle.id}
                className="group relative overflow-hidden rounded-2xl bg-[#12141A] border border-[#D4AE62]/15 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary"
              >
                <div className="relative h-48 w-full overflow-hidden bg-black/40">
                  <Image
                    src={vehicle.image}
                    alt={vehicle.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-transparent to-transparent" />
                  <span className="absolute top-3 end-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-primary backdrop-blur-md border border-[#D4AE62]/20">
                    {vehicle.stage}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-display text-base font-medium text-foreground">
                      {vehicle.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{vehicle.chassis}</p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      O‘rnatilgan Detallar:
                    </div>
                    <ul className="space-y-1 text-xs text-[#E6E1D6]">
                      {vehicle.specs.map((spec, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-[#D4AE62]/10 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {vehicle.lastModified}
                    </span>
                    <Link
                      href={`/${locale}/studio`}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold-soft uppercase tracking-wider"
                    >
                      <span>Studio</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: BUYURTMALAR & TARIX */}
      {activeTab === 'activity' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-light tracking-wide text-foreground">
              So‘nggi Buyurtmalar & Tranzaksiyalar
            </h2>
            <p className="text-xs text-muted-foreground">
              Atelier hisobidan sotib olingan va buyurtma berilgan sertifikatlangan qismlar
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#12141A] border border-[#D4AE62]/15 shadow-card">
            <div className="divide-y divide-[#D4AE62]/10">
              {RECENT_ORDERS.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 transition hover:bg-[#161821]"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0D0E12] border border-[#D4AE62]/20 text-primary">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-display text-sm font-medium text-foreground">
                        {order.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {order.id} • {order.date}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="font-display text-base font-light text-gold-gradient">
                      {order.price}
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SOZLAMALAR */}
      {activeTab === 'atelier' && (
        <section className="space-y-6">
          <div>
            <h2 className="font-display text-lg font-light tracking-wide text-foreground">
              Atelier & Tizim Sozlamalari
            </h2>
            <p className="text-xs text-muted-foreground">
              Til, interfeys va AI render parametrlarini sozlash
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Language Switcher Card */}
            <div className="rounded-2xl bg-[#12141A] p-5 border border-[#D4AE62]/15 shadow-card space-y-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-medium uppercase tracking-wider text-foreground">
                  Interfeys Tili
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'uz', label: 'O‘zbekcha' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'en', label: 'English' },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => handleLanguageChange(item.code)}
                    data-selected={selectedLocale === item.code}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#D4AE62]/15 text-xs font-medium transition data-[selected=true]:border-primary data-[selected=true]:bg-gold-gradient data-[selected=true]:text-black text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Engine & Rendering Card */}
            <div className="rounded-2xl bg-[#12141A] p-5 border border-[#D4AE62]/15 shadow-card space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-medium uppercase tracking-wider text-foreground">
                  AI & Studio Render
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-foreground">4K Ultra Upscale</div>
                    <div className="text-[10px] text-muted-foreground">
                      Fal.ai FLUX Fill bilan 4K o‘ta aniq fotorealistik render
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAiUpscaleActive(!isAiUpscaleActive)}
                    className={`h-6 w-11 rounded-full p-1 transition cursor-pointer ${
                      isAiUpscaleActive ? 'bg-primary' : 'bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-black transition-transform ${
                        isAiUpscaleActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#D4AE62]/10">
                  <div>
                    <div className="text-xs font-medium text-foreground">
                      Audio & Haptic Feedback
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Kamerada suratga olish va tugma bosilganda mexanik tovushlar
                    </div>
                  </div>
                  <button
                    onClick={() => setIsHapticsActive(!isHapticsActive)}
                    className={`h-6 w-11 rounded-full p-1 transition cursor-pointer ${
                      isHapticsActive ? 'bg-primary' : 'bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-black transition-transform ${
                        isHapticsActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#12141A] border border-[#D4AE62]/30 p-6 text-center space-y-4 shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
              <LogOut className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-medium text-foreground">
                Tizimdan chiqish
              </h3>
              <p className="text-xs text-muted-foreground">
                Haqiqatan ham atelier profilidan chiqmoqchimisiz?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsSignOutModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-white transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-500 transition shadow-lg cursor-pointer"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
