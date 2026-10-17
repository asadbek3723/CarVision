'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  Apple,
  Building2,
  Car,
  Check,
  ChevronDown,
  Clock,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Play,
  Quote,
  Send,
  Star,
  Twitter,
  Upload,
  User,
  WandSparkles,
  X,
  Youtube,
  ArrowRight,
} from 'lucide-react';

/* ===================================================================
   Brand Marks & Logos (1:1 Golden Chevron Mark)
   =================================================================== */

function BrandMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cv-gold-mark" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="oklch(0.93 0.05 90)" />
          <stop offset="1" stopColor="oklch(0.68 0.11 68)" />
        </linearGradient>
      </defs>
      <path
        d="M38 3H14L3 16l11 13h24"
        stroke="url(#cv-gold-mark)"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoWithText({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <BrandMark className={small ? 'h-5 w-6' : 'h-7 w-8'} />
      <span
        className={`font-display tracking-[0.3em] text-foreground ${
          small ? 'text-base' : 'text-lg'
        }`}
      >
        CARVISION
      </span>
    </span>
  );
}

/* ===================================================================
   Scroll Reveal Hook
   =================================================================== */

function useReveal() {
  React.useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            entry.target.setAttribute('data-revealed', 'true');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ===================================================================
   Navigation Header
   =================================================================== */

const NAV_LINKS = [
  { href: '#visualizer', label: 'Vizualizator' },
  { href: '#how', label: 'Qanday ishlaydi' },
  { href: '#pricing', label: 'Narxlar' },
  { href: '#reviews', label: 'Fikrlar' },
  { href: '#app', label: 'Ilova' },
  { href: '#faq', label: 'FAQ' },
];

function Header({ locale }: { locale: string }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const isPast = window.scrollY > 120;
      setScrolled(isPast);
      if (!isPast) setMobileOpen(false);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4 transition-all duration-700 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] ${
        scrolled
          ? 'translate-y-0 opacity-100'
          : '-translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <div className="glass-nav mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full border border-border py-2 ps-4 pe-2 sm:gap-4 sm:px-5 sm:py-3 shadow-lux">
        <a href="#top" className="min-w-0 shrink overflow-hidden">
          <LogoWithText small={true} />
        </a>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute -bottom-1 start-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/${locale}/login`}
            className="btn-gold rounded-full px-4 py-2.5 text-[11px] font-bold tracking-[0.2em] sm:px-6 sm:text-xs sm:tracking-[0.25em]"
          >
            KIRISH
          </Link>
          <button
            type="button"
            aria-label="Menyu"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-11 w-11 place-items-center rounded-full border border-border text-primary lg:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`glass-nav mx-auto mt-3 max-w-6xl overflow-hidden rounded-3xl border border-border transition-all duration-500 lg:hidden ${
          mobileOpen && scrolled
            ? 'max-h-96 opacity-100'
            : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <nav className="flex flex-col p-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-2xl px-5 py-4 text-base text-foreground transition-colors active:bg-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ===================================================================
   Hero Section
   =================================================================== */

function Hero() {
  return (
    <section
      id="top"
      className="grain relative flex h-screen min-h-[640px] items-center justify-center overflow-hidden"
    >
      <img
        src="/images/golden/hero-car.jpg"
        alt="Qora sport avtomobil oltin yorug'likda"
        width={1920}
        height={1088}
        className="animate-slowzoom absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 15%, rgba(10, 11, 15, 0.75) 85%), linear-gradient(180deg, rgba(10, 11, 15, 0.4) 0%, transparent 20%, transparent 70%, #0A0B0F 100%)',
        }}
      />

      <div className="relative z-10 px-6 text-center select-none">
        <div
          className="animate-rise mb-6 flex justify-center"
          style={{ animationDelay: '.1s' }}
        >
          <BrandMark className="h-12 w-14" />
        </div>
        <p
          className="animate-rise text-[11px] tracking-lux text-primary"
          style={{ animationDelay: '.3s' }}
        >
          DRIVE YOUR VISION
        </p>
        <h1
          className="animate-rise mt-6 font-display text-5xl font-light leading-[0.95] text-foreground sm:text-8xl lg:text-9xl"
          style={{ animationDelay: '.5s' }}
        >
          Orzuingizdagi <br />
          <em className="shimmer-text not-italic font-medium italic">
            avtomobil.
          </em>
        </h1>
        <p
          className="animate-rise mx-auto mt-8 max-w-lg text-base text-muted-foreground"
          style={{ animationDelay: '.8s' }}
        >
          Diskalar, rang va body kitni o&apos;z mashinangizda 4K realizmda — bir
          tiyin sarflamasdan ko&apos;ring.
        </p>

        <div
          className="animate-rise mx-auto mt-10 flex max-w-xs flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4"
          style={{ animationDelay: '1.1s' }}
        >
          <a
            href="#visualizer"
            className="btn-gold sweep relative w-full overflow-hidden rounded-full px-9 py-4 sm:w-auto text-xs font-bold tracking-[0.3em]"
          >
            VIZIONNI YOQING
          </a>
          <a
            href="#app"
            className="btn-ghost-gold w-full rounded-full px-9 py-4 sm:w-auto text-xs font-semibold tracking-[0.3em]"
          >
            ILOVANI YUKLASH
          </a>
        </div>
      </div>

      <a
        href="#visualizer"
        className="absolute bottom-10 start-1/2 z-10 flex -translate-x-1/2 rtl:translate-x-1/2 flex-col items-center gap-3 text-[10px] tracking-lux text-muted-foreground"
      >
        PASTGA
        <span className="relative h-14 w-px overflow-hidden bg-border">
          <span className="animate-scrollline absolute inset-0 bg-primary" />
        </span>
      </a>
    </section>
  );
}

/* ===================================================================
   Section Heading Component
   =================================================================== */

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  gold: string;
  sub?: string | undefined;
  center?: boolean | undefined;
}

function SectionHeading({
  eyebrow,
  title,
  gold,
  sub,
  center,
}: SectionHeadingProps) {
  return (
    <div className={`reveal ${center ? 'mx-auto text-center' : ''} max-w-3xl`}>
      <p className="text-[11px] tracking-lux text-primary">{eyebrow}</p>
      <h2 className="mt-5 font-display text-4xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">
        {title} <br />
        <span className="text-gold italic">{gold}</span>
      </h2>
      {sub && (
        <p
          className={`mt-6 text-lg text-muted-foreground ${
            center ? 'mx-auto' : ''
          } max-w-2xl`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ===================================================================
   Brands Marquee
   =================================================================== */

const BRANDS = [
  'PORSCHE',
  'MERCEDES-BENZ',
  'BMW',
  'FERRARI',
  'AUDI',
  'LAMBORGHINI',
  'ROLLS-ROYCE',
  'ASTON MARTIN',
];

function Brands() {
  return (
    <section
      aria-label="Brendlar"
      className="border-y border-border py-10 sm:py-14 select-none"
    >
      <p className="mb-8 text-center text-[10px] tracking-lux text-muted-foreground">
        DUNYO BRENDLARI BILAN ISHLAYDI
      </p>
      <div className="mask-fade-x overflow-hidden">
        <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
          {[...BRANDS, ...BRANDS].map((brand, idx) => (
            <span
              key={idx}
              className="mx-8 whitespace-nowrap font-display text-2xl tracking-[0.25em] text-muted-foreground/60 transition-all duration-500 hover:text-primary hover:[text-shadow:0_0_24px_var(--primary)] sm:mx-14 sm:text-3xl"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   Visualizer Before/After Slider
   =================================================================== */

function VisualizerBeforeAfter() {
  const [sliderPos, setSliderPos] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);
  const animFrame = React.useRef(0);

  const updatePosition = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      cancelAnimationFrame(animFrame.current);
      animFrame.current = requestAnimationFrame(() => {
        const pct = Math.min(
          100,
          Math.max(0, ((clientX - rect.left) / rect.width) * 100)
        );
        setSliderPos(pct);
      });
    }
  };

  return (
    <section
      id="visualizer"
      className="relative mx-auto grid max-w-7xl items-center gap-12 lg:gap-16 px-6 py-20 sm:py-32 lg:grid-cols-[1fr_1.4fr]"
    >
      <div>
        <SectionHeading
          eyebrow="01 — VIZUALIZATOR"
          title="Zavod holati."
          gold="4K realizmgacha."
        />
        <p className="reveal mt-6 text-muted-foreground">
          Maxsus diskalar, plyonka va body stylingni aynan sizning
          mashinangizda sinab ko&apos;ring — tez, oson va 100% xavfsiz.
        </p>
        <ul className="reveal mt-8 space-y-3 text-sm">
          {[
            "Aniq disk o'lchami (fitment)",
            '500+ brend katalogi',
            '60FPS video eksport',
          ].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <Check className="h-4 w-4 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="reveal relative w-full">
        <div
          ref={containerRef}
          className="relative aspect-[16/9] cursor-ew-resize select-none overflow-hidden rounded-3xl border border-border shadow-lux"
          style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          isDragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          updatePosition(e.clientX);
        }}
        onPointerMove={(e) => isDragging.current && updatePosition(e.clientX)}
        onPointerUp={() => {
          isDragging.current = false;
        }}
        onPointerCancel={() => {
          isDragging.current = false;
        }}
        role="slider"
        aria-label="Oldin va keyin"
        aria-valuenow={Math.round(sliderPos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setSliderPos((v) => Math.max(0, v - 5));
          if (e.key === 'ArrowRight') setSliderPos((v) => Math.min(100, v + 5));
        }}
      >
        <img
          draggable={false}
          src="/images/golden/car-after.jpg"
          alt="Tuning qilingan avtomobil"
          loading="lazy"
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <img
            draggable={false}
            src="/images/golden/car-before.jpg"
            alt="Zavod holatidagi avtomobil"
            loading="lazy"
            width={1600}
            height={912}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <span className="glass pointer-events-none absolute start-3 top-3 sm:start-4 sm:top-4 rounded-full px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
          OLDIN
        </span>
        <span className="glass pointer-events-none absolute end-3 top-3 sm:end-4 sm:top-4 rounded-full px-3 py-1 text-[10px] tracking-[0.25em] text-primary">
          KEYIN
        </span>

        <div
          className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-primary shadow-gold"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="btn-gold absolute top-1/2 start-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-bold">
            ‹ ›
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

/* ===================================================================
   How It Works
   =================================================================== */

const STEPS = [
  {
    icon: Upload,
    t: 'Suratga oling',
    d: "Mashinangizni yon tomondan bitta surat bilan yuklang.",
  },
  {
    icon: WandSparkles,
    t: 'Tanlang',
    d: 'Disk, rang, body kit va past turishni tanlang.',
  },
  {
    icon: Car,
    t: 'Haqiqatga aylantiring',
    d: 'Tasdiqlangan ustaxonada 3% depozit bilan bron qiling.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <SectionHeading
        eyebrow="02 — QANDAY ISHLAYDI"
        title="Orzuingizdagi mashina."
        gold="Uch oddiy qadamda."
      />

      <div className="mt-20 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, idx) => (
          <div
            key={step.t}
            className="reveal group relative overflow-hidden rounded-3xl border border-border bg-card-lux p-7 sm:p-10 transition-all duration-700 hover:-translate-y-2 hover:border-primary/40"
            style={{ transitionDelay: `${idx * 120}ms` }}
          >
            <span className="absolute -end-4 -top-10 font-display text-[11rem] font-light text-primary/5 transition-colors duration-700 group-hover:text-primary/10 select-none">
              {idx + 1}
            </span>
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 text-primary">
              <step.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-8 font-display text-3xl">{step.t}</h3>
            <p className="mt-3 text-muted-foreground">{step.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===================================================================
   Target Audience (Studios & Car Owners)
   =================================================================== */

const AUDIENCE_CARDS = [
  {
    icon: Building2,
    tag: 'USTAXONALAR UCHUN',
    t: 'Tijorat tuning atelyelari',
    d: "Mijozga mashinasini real vaqtda ko'rsating va shartnomani joyida yoping.",
    items: [
      '40 ta bepul token',
      '500+ master katalog',
      '3% depozit tizimi',
    ],
    cta: 'ATELYE OCHISH',
    link: 'register',
  },
  {
    icon: User,
    tag: 'EGALAR UCHUN',
    t: 'Avto ixlosmandlar',
    d: "Xavfsiz tajriba qiling, so'ng tasdiqlangan ustaxonada o'rnatishni bron qiling.",
    items: [
      'Aniq fitment dvigateli',
      'Yashirin ustamasiz narx',
      'Raqamli tuning pasporti',
      '60FPS video eksport',
    ],
    cta: 'STUDIYANI BOSHLASH',
    link: 'login',
  },
];

function TargetAudience({ locale }: { locale: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <SectionHeading
        eyebrow="03 — KIM UCHUN"
        title="Studiyalar uchun yaratilgan."
        gold="Egalar uchun moslangan."
      />

      <div className="mt-20 grid gap-6 lg:grid-cols-2">
        {AUDIENCE_CARDS.map((card, idx) => (
          <div
            key={card.t}
            className="reveal relative overflow-hidden rounded-3xl border border-border bg-card-lux p-7 sm:p-10 shadow-lux"
            style={{ transitionDelay: `${idx * 150}ms` }}
          >
            <div className="absolute -end-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-[10px] tracking-[0.25em] text-primary">
              <card.icon className="h-3.5 w-3.5" />
              {card.tag}
            </span>
            <h3 className="mt-6 font-display text-4xl">{card.t}</h3>
            <p className="mt-4 text-muted-foreground">{card.d}</p>

            <ul className="mt-8 space-y-3 text-sm">
              {card.items.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/${card.link}`}
              className={`${
                idx === 0 ? 'btn-gold' : 'btn-ghost-gold'
              } mt-10 flex items-center justify-center gap-2 rounded-full py-4 text-xs font-bold tracking-[0.25em]`}
            >
              <span>{card.cta}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===================================================================
   Pricing Table
   =================================================================== */

const TIERS: {
  tier: string;
  name: string;
  price: number;
  originalPrice?: number;
  per: string;
  d: string;
  items: string[];
  cta: string;
  hot: boolean;
  badge?: string;
}[] = [
  {
    tier: 'SINOV VA TANISHUV',
    name: 'FREE',
    price: 0,
    per: 'sinov',
    d: 'Oddiy foydalanuvchilar va AI kuchini to‘lovsiz sinab ko‘rmoqchi bo‘lgan avtoservislar uchun.',
    items: [
      '40 ta bepul rasm',
      '"Tuned by CarVision" suv belgisi (watermark)',
      '1 ta faol qurilma',
      'AIning kuchini sinash va ishonch hosil qilish',
      'Oddiy foydalanuvchilar uchun qulay',
    ],
    cta: 'BEPUL BOSHLASH',
    hot: false,
  },
  {
    tier: 'KICHIK BIZNES',
    name: 'PRO',
    price: 29,
    per: 'oy',
    d: 'Kichik auto tuning saloni borlar uchun boshlang‘ich qadam.',
    items: [
      '800 ta rasm / oy',
      'Suv belgisisiz toza 4K sifatli rasmlar',
      'Maksimum 3 ta qurilma (planshet / telefon)',
      'Mahsulot joylash imkoniyati',
      'Boshlang‘ich biznes qo‘llab-quvvatlash',
    ],
    cta: "PRO'NI TANLASH",
    hot: false,
  },
  {
    tier: 'PROFESSIONAL SERVISLAR',
    name: 'MAX',
    badge: "$145 O'RNIGA $99 — SIZ 32% TEJAB QOLYAPSIZ!",
    price: 99,
    originalPrice: 145,
    per: 'oy',
    d: 'Katta auto tuning do‘koni yoki professional tuning saloni borlar uchun.',
    items: [
      '4,000 ta rasm / oy',
      'Tizimdagi eng optimal tanlov',
      'Bir vaqtda 8 tagacha qurilmadan kirish',
      'Videolarni 4K formatda yuklab olish imkoni',
      'Mahsulot joylash imkoniyati',
    ],
    cta: "MAX'NI YOQISH",
    hot: true,
  },
];

function Pricing({ locale }: { locale: string }) {
  const [isAnnual, setIsAnnual] = React.useState(false);

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
        <SectionHeading
          eyebrow="04 — NARXLAR"
          title="Shaffof narxlar."
          gold="Har bir loyiha uchun."
        />

        <div className="reveal flex shrink-0 rounded-full border border-border p-1 text-xs select-none">
          {[false, true].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setIsAnnual(val)}
              className={`rounded-full px-5 py-2 transition-all duration-500 cursor-pointer ${
                isAnnual === val ? 'btn-gold font-bold' : 'text-muted-foreground'
              }`}
            >
              {val ? 'Yillik −20%' : 'Oylik'}
            </button>
          ))}
        </div>
      </div>

      <div className="reveal mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((tier, idx) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-3xl border p-9 transition-all duration-700 hover:-translate-y-2 ${
              tier.hot
                ? 'border-primary/50 bg-card-lux shadow-gold lg:-translate-y-4'
                : 'border-border bg-card/40'
            }`}
            style={{ transitionDelay: `${idx * 120}ms` }}
          >
            {tier.hot && (
              <span className="btn-gold absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rounded-full px-4 py-1 text-[9px] sm:text-[10px] font-bold tracking-[0.12em] whitespace-nowrap shadow-gold">
                {tier.badge || 'ENG MASHHUR'}
              </span>
            )}
            <p className="text-[11px] tracking-lux text-primary">{tier.tier}</p>
            <h3 className="mt-4 font-display text-3xl">{tier.name}</h3>

            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-6xl text-gold">
                $
                {isAnnual && tier.price
                  ? Math.round(tier.price * 0.8)
                  : tier.price}
              </span>
              {tier.originalPrice && (
                <span className="text-xl text-muted-foreground/60 line-through decoration-primary/50">
                  ${isAnnual ? Math.round(tier.originalPrice * 0.8) : tier.originalPrice}
                </span>
              )}
              <span className="text-sm text-muted-foreground">/ {tier.per}</span>
            </p>

            <p className="mt-4 text-sm text-muted-foreground">{tier.d}</p>

            <ul className="mt-8 flex-1 space-y-3 text-sm">
              {tier.items.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/login`}
              className={`${
                tier.hot ? 'btn-gold' : 'btn-ghost-gold'
              } mt-10 rounded-full py-4 text-center text-xs font-bold tracking-[0.25em]`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===================================================================
   Reviews
   =================================================================== */

const REVIEWS = [
  {
    n: 'Jasur Karimov',
    r: 'Auto Lux Tashkent, egasi',
    t: "Mijozlarga mashinasini yangi disklarda ko'rsatamiz — shartnoma joyida yopiladi. Sotuvlarimiz sezilarli oshdi.",
  },
  {
    n: 'Dilnoza Rahimova',
    r: 'Shine Detailing, direktor',
    t: "Plyonka ranglarini tanlash endi bir necha daqiqa. Mijozlar natijani ko'rib, ikkilanmay buyurtma berishadi.",
  },
  {
    n: 'Aziz Tursunov',
    r: 'Avtobloger, 300K obunachi',
    t: "Videolarim uchun ajoyib vosita. 4K render sifati haqiqiy suratdan farq qilmaydi.",
  },
  {
    n: 'Sardor Aliyev',
    r: 'BMW M4 egasi',
    t: "Body kitni o'rnatishdan oldin ko'rib oldim va xato qilmadim. Juda qulay va premium tajriba.",
  },
];

function Reviews() {
  return (
    <section id="reviews" className="mx-auto max-w-7xl px-6 py-20 sm:py-32">
      <SectionHeading
        eyebrow="MIJOZLAR FIKRI"
        title="Bizga ishonch"
        gold="bildirganlar."
      />

      <div className="mt-14 grid gap-5 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
        {REVIEWS.map((review, idx) => (
          <figure
            key={review.n}
            className="reveal glass group relative flex flex-col overflow-hidden rounded-3xl border border-primary/15 p-7 transition-all duration-700 hover:-translate-y-2 hover:border-primary/40 hover:shadow-gold"
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            <Quote className="h-7 w-7 text-primary/40" />

            <div className="mt-4 flex text-primary">
              {Array.from({ length: 5 }).map((_, sIdx) => (
                <Star key={sIdx} className="h-4 w-4 fill-current" />
              ))}
            </div>

            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
              &ldquo;{review.t}&rdquo;
            </blockquote>

            <figcaption className="mt-6 flex items-center gap-3">
              <span className="btn-gold grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-lg font-semibold text-primary-foreground">
                {review.n
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{review.n}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {review.r}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ===================================================================
   Mobile App Section
   =================================================================== */

function AppStoreButton({
  icon: Icon,
  top,
  name,
}: {
  icon: React.ComponentType<{ className?: string }>;
  top: string;
  name: string;
}) {
  return (
    <a
      href="#"
      className="btn-ghost-gold flex items-center justify-center gap-3.5 sm:gap-4 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-3.5 sm:justify-start w-full sm:w-auto transition-transform active:scale-[0.98]"
    >
      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
      <span className="text-start leading-tight">
        <span className="block text-[10px] tracking-[0.2em] text-muted-foreground">
          {top}
        </span>
        <span className="block text-base sm:text-lg font-semibold">{name}</span>
      </span>
    </a>
  );
}

function MobileApp() {
  return (
    <section id="app" className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-32 overflow-hidden">
      <div className="reveal relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-primary/20 bg-card-lux shadow-lux w-full">
        <div className="absolute -start-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative grid w-full min-w-0 items-center gap-8 sm:gap-10 p-5 sm:p-16 lg:grid-cols-2">
          <div className="w-full min-w-0">
            <p className="text-[11px] tracking-lux text-primary">
              05 — MOBIL ILOVA
            </p>
            <h2 className="mt-4 sm:mt-5 font-display text-[2rem] font-light leading-[1.08] sm:text-6xl sm:leading-[1.02] break-words">
              CarVision <br />
              <span className="text-gold italic">cho&apos;ntagingizda.</span>
            </h2>
            <p className="mt-4 sm:mt-6 max-w-md text-base sm:text-lg text-muted-foreground leading-relaxed">
              Ilovamizni yuklab oling — mashinangizni suratga oling va soniyalar
              ichida yangi qiyofasini ko&apos;ring.
            </p>

            <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="flex text-primary">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-current" />
                ))}
              </span>
              <span>4.9 · 12 000+ foydalanuvchi</span>
            </div>

            <div className="mt-8 sm:mt-10 grid gap-3 sm:flex sm:flex-wrap sm:gap-4 w-full">
              <AppStoreButton
                icon={Apple}
                top="YUKLAB OLING"
                name="App Store"
              />
              <AppStoreButton
                icon={Play}
                top="MAVJUD"
                name="Google Play"
              />
            </div>
          </div>

          <div className="relative flex justify-center w-full min-w-0 mt-4 sm:mt-0">
            <img
              src="/images/golden/app-phones.jpg"
              alt="CarVision mobil ilovasi"
              loading="lazy"
              width={1200}
              height={1200}
              className="animate-float mx-auto w-full max-w-[280px] sm:max-w-md mix-blend-lighten pointer-events-none select-none object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   FAQ Accordion
   =================================================================== */

const FAQS = [
  [
    "4K natija haqiqiy detallarga qanchalik o'xshaydi?",
    "Neyron tarmog'imiz yorug'lik, aks va soyalarni hisobga olib, haqiqiy fotosuratdan deyarli farqlanmaydigan natija beradi.",
  ],
  [
    "3% depozit egasi va ustaxonani qanday himoya qiladi?",
    "Depozit detallarni omborda band qiladi va ish bajarilguncha xavfsiz saqlanadi — ikki tomon ham kafolatlangan.",
  ],
  [
    "Surat xira yoki qorong'i bo'lsa nima bo'ladi?",
    "Tizim avtomatik ravishda sifatni tekshiradi va qayta suratga olish bo'yicha maslahat beradi.",
  ],
  [
    "Studiyalar o'z inventarini yuklay oladimi?",
    "Ha, Pro va Enterprise rejalarida o'z detallaringiz va zaxirangizni sinxronlash mumkin.",
  ],
];

function Faq() {
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-20 sm:py-32">
      <SectionHeading
        center={true}
        eyebrow="06 — SAVOLLAR"
        title="Savollaringiz bormi?"
        gold="Javoblarimiz tayyor."
      />

      <div className="reveal mt-16 space-y-3">
        {FAQS.map(([q, a], idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={q}
              className={`overflow-hidden rounded-2xl border transition-colors duration-500 ${
                isOpen
                  ? 'border-primary/40 bg-card-lux shadow-lux'
                  : 'border-border bg-card/30 hover:border-primary/20'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-4 px-7 py-6 text-start cursor-pointer transition-colors hover:text-primary"
              >
                <span className="font-medium text-foreground">{q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-primary transition-transform duration-500 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`grid transition-all duration-500 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden min-h-0 px-7 text-muted-foreground">
                  <p className="pb-6 leading-relaxed text-sm sm:text-base">{a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ===================================================================
   Grand CTA Banner
   =================================================================== */

function CtaBanner({ locale }: { locale: string }) {
  return (
    <section className="grain relative overflow-hidden py-36 sm:py-48 select-none">
      <img
        src="/images/golden/hero-car.jpg"
        alt="CarVision Grand CTA"
        loading="lazy"
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-80 pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(10, 11, 15, 0.45) 0%, rgba(10, 11, 15, 0.75) 65%, #0A0B0F 100%), linear-gradient(180deg, #0A0B0F 0%, transparent 25%, transparent 75%, #0A0B0F 100%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 className="reveal font-display text-5xl font-light leading-[1.02] sm:text-7xl">
          O&apos;zgarishga tayyormisiz? <br />
          <span className="shimmer-text italic">Vizioningizni yoqing.</span>
        </h2>
        <div className="reveal mt-12">
          <Link
            href={`/${locale}/register`}
            className="btn-gold sweep relative inline-flex overflow-hidden rounded-full px-12 py-5 text-xs font-bold tracking-[0.3em]"
          >
            HOZIROQ BOSHLASH
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   Footer
   =================================================================== */

const SOCIAL_LINKS = [
  { icon: Send, label: 'Telegram' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Youtube, label: 'YouTube' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Twitter, label: 'X' },
];

const FOOTER_COLUMNS = [
  {
    title: 'MAHSULOT',
    links: ['Vizualizator', 'Narxlar', 'Mobil ilova', 'Katalog'],
  },
  {
    title: 'KOMPANIYA',
    links: ['Biz haqimizda', 'Hamkorlar', 'Karyera', 'Blog'],
  },
  {
    title: 'YORDAM',
    links: ['FAQ', 'Foydalanish shartlari', 'Maxfiylik', 'Aloqa'],
  },
];

function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-6 pb-10 select-none">
      <div className="grid grid-cols-2 gap-10 border-t border-border pt-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <LogoWithText />
          <p className="mt-6 max-w-xs text-sm text-muted-foreground">
            Mashinangizni AI kuchi bilan durdonaga aylantiring.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span>support@carvision.com</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span>Toshkent, O&apos;zbekiston</span>
            </li>
            <li className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span>Du–Ju, 9:00–18:00</span>
            </li>
          </ul>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-[11px] tracking-lux text-primary">
              {col.title}
            </h4>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
        <div className="flex gap-3">
          {SOCIAL_LINKS.map(({ icon: Icon, label }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="glass grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-500 hover:-translate-y-1 hover:border-primary/60 hover:text-primary hover:shadow-gold"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>

        <p className="text-center text-[10px] tracking-lux text-muted-foreground">
          © 2026 CARVISION · TRICORP AGENCY
        </p>
      </div>
    </footer>
  );
}

/* ===================================================================
   Main Landing Page Component
   =================================================================== */

export default function GoldenLandingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params['locale'] as string) || 'uz';
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        router.push(`/${locale}/admin`);
      } else {
        router.push(`/${locale}/seller`);
      }
    }
  }, [user, locale, router]);

  useReveal();

  return (
    <main className="overflow-x-hidden bg-background text-foreground">
      <Header locale={locale} />
      <Hero />
      <Brands />
      <VisualizerBeforeAfter />
      <HowItWorks />
      <TargetAudience locale={locale} />
      <Pricing locale={locale} />
      <Reviews />
      <MobileApp />
      <Faq />
      <CtaBanner locale={locale} />
      <Footer />
    </main>
  );
}
