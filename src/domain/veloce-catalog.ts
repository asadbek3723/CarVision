export interface VeloceProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  spec: string;
  swatch?: string | undefined;
  rating: number;
  stock: number;
  image: string;
  angleImage?: string | undefined;
  targetCar?: string | undefined;
  compatibility?: Array<{ id: string; name: string; yearFrom?: number | null | undefined; yearTo?: number | null | undefined }> | undefined;
  isUniversal?: boolean | undefined;
  images?: string[] | undefined;
  attributes?: Record<string, unknown> | undefined;
  installAvailable?: boolean | undefined;
  installPrice?: number | undefined;
  categoryLabel?: string | undefined;
  sellerName?: string | undefined;
}

export const VELOCE_CATEGORIES = [
  'Wheels',
  'Body Kit',
  'Suspension',
  'Interior',
  'Performance',
  'Color',
] as const;

export type VeloceCategory = (typeof VELOCE_CATEGORIES)[number];

export const CATEGORY_IMAGES: Record<string, string> = {
  Wheels: '/assets/wheel-CiWWvvai.jpg',
  'Body Kit': '/assets/bodykit-CjvcnY7y.jpg',
  Suspension: '/assets/suspension-BTwmFe87.jpg',
  Interior: '/assets/interior-DWHEsFIZ.jpg',
  Performance: '/assets/exhaust-BEQYegnz.jpg',
  Color: '/assets/wheel-CiWWvvai.jpg',
};

export const TOP_BRANDS = [
  'BBS',
  'Akrapovič',
  'KW',
  'Öhlins',
  'Brembo',
  'HRE',
  'Vossen',
  'Recaro',
] as const;

export function formatPriceUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

const RAW_PRODUCTS: [string, string, string, number, string, string?][] = [
  ['Wheels', 'VZ-01 Forged', 'Veloce', 3890, '20" · Forged Lightweight'],
  ['Wheels', 'BBS CI-R', 'BBS', 4250, '20" · Set of 4'],
  ['Wheels', 'HRE P101', 'HRE', 6900, '21" · Monoblock'],
  ['Wheels', 'Vossen HF-5', 'Vossen', 2980, '20" · Hybrid Forged'],
  ['Wheels', 'BC Forged RS31', 'BC Forged', 3450, '19" · Two-piece'],
  ['Wheels', 'Rotiform LAS-R', 'Rotiform', 2650, '19" · Cast'],
  ['Wheels', 'Work Meister S1', 'Work', 4100, '19" · Three-piece'],
  ['Wheels', 'Brixton PF1', 'Brixton', 5200, '21" · Ultrasport'],
  ['Body Kit', 'Carbon Front Lip', 'Veloce', 890, 'Pre-preg carbon'],
  ['Body Kit', 'GT Rear Wing', 'Vorsteiner', 2400, 'Swan neck · Carbon'],
  ['Body Kit', 'Side Skirt Set', '3D Design', 1150, 'Carbon · Pair'],
  ['Body Kit', 'Rear Diffuser', 'Akrapovič', 1680, 'Gloss carbon'],
  ['Body Kit', 'Widebody Kit', 'Liberty Walk', 9800, 'Full kit · FRP'],
  ['Body Kit', 'Carbon Hood', 'Seibon', 2100, 'Vented · Carbon'],
  ['Body Kit', 'Mirror Caps', 'M Performance', 420, 'Carbon · Pair'],
  ['Body Kit', 'Front Canards', 'Veloce', 360, 'Carbon · 4 pcs'],
  ['Suspension', 'KW Variant 3', 'KW', 2890, 'Coilovers · Adjustable'],
  ['Suspension', 'Öhlins Road & Track', 'Öhlins', 3600, 'DFV coilovers'],
  ['Suspension', 'Bilstein B16', 'Bilstein', 2450, 'Damptronic'],
  ['Suspension', 'Air Lift 3P', 'Air Lift', 3900, 'Air suspension'],
  ['Suspension', 'H&R Lowering Springs', 'H&R', 390, '-30mm'],
  ['Suspension', 'Eibach Anti-roll Kit', 'Eibach', 720, 'Front & rear'],
  ['Suspension', 'BC Racing BR', 'BC Racing', 1290, 'Coilovers'],
  ['Interior', 'M Performance Seats', 'BMW M', 7400, 'Carbon bucket'],
  ['Interior', 'Alcantara Wheel', 'Veloce', 980, 'Gold stitching'],
  ['Interior', 'Carbon Trim Set', 'M Performance', 1250, '8 pcs'],
  ['Interior', 'Recaro Podium', 'Recaro', 5600, 'CF shell'],
  ['Interior', 'Ambient Light Kit', 'Veloce', 340, '64 colors'],
  ['Interior', 'Shift Paddles', 'Veloce', 290, 'Aluminium · Gold'],
  ['Performance', 'Valvetronic Exhaust', 'Akrapovič', 5400, 'Titanium'],
  ['Performance', 'Stage 2 ECU Tune', 'Veloce', 1490, '+110 hp'],
  ['Performance', 'Downpipes', 'Eventuri', 1290, 'Catless'],
  ['Performance', 'Carbon Intake', 'Eventuri', 2200, 'Cold air'],
  ['Performance', 'Upgraded Intercooler', 'Wagner', 1350, 'Competition'],
  ['Performance', 'Big Brake Kit', 'Brembo', 4800, '6-piston · Gold'],
  ['Performance', 'Turbo Upgrade', 'Pure Turbos', 3900, 'Stage 2+'],
  ['Color', 'Obsidian Black', 'Veloce Paint', 4900, 'Gloss metallic', 'oklch(0.15 0 0)'],
  ['Color', 'Champagne Gold', 'Veloce Paint', 5600, 'Satin metallic', 'oklch(0.78 0.1 82)'],
  ['Color', 'Frozen Grey', 'Veloce Paint', 5200, 'Matte', 'oklch(0.55 0.01 250)'],
  ['Color', 'Isle of Man Green', 'Veloce Paint', 5400, 'Gloss', 'oklch(0.45 0.1 160)'],
  ['Color', 'Toronto Red', 'Veloce Paint', 5400, 'Gloss metallic', 'oklch(0.5 0.2 25)'],
  ['Color', 'Portimao Blue', 'Veloce Paint', 5400, 'Gloss metallic', 'oklch(0.5 0.15 255)'],
  ['Color', 'Pearl White', 'Veloce Paint', 5100, 'Tri-coat', 'oklch(0.95 0.01 90)'],
];

export const VELOCE_PRODUCTS: VeloceProduct[] = RAW_PRODUCTS.map(
  ([category, name, brand, price, spec, swatch], index) => ({
    id: `p${index + 1}`,
    name,
    brand,
    category,
    price,
    spec,
    swatch,
    rating: Number((4.3 + ((index * 7) % 7) / 10).toFixed(1)),
    stock: (index * 5) % 13,
    image: CATEGORY_IMAGES[category] || '/assets/wheel-CiWWvvai.jpg',
  })
);

export function getProductById(id: string): VeloceProduct | undefined {
  return VELOCE_PRODUCTS.find((p) => p.id === id);
}
