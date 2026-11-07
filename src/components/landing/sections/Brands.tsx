'use client';



import { useTranslations } from 'next-intl';const BRANDS = [
  'PORSCHE',
  'MERCEDES-BENZ',
  'BMW',
  'FERRARI',
  'AUDI',
  'LAMBORGHINI',
  'ROLLS-ROYCE',
  'ASTON MARTIN',
];

export function Brands() {
  const t = useTranslations('landing.brands');
  return (
    <section
      aria-label={t('label')}
      className=" py-10 sm:py-14 select-none"
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
