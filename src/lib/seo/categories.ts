import type { Locale } from '@/i18n/routing';
import { CATALOG_CATEGORIES, type CatalogCategory } from '@/domain/catalog';

/** URL segment of a category page: `/uz/catalog/body-kit`. */
export function categoryUrlSlug(slug: CatalogCategory): string {
  return slug.replace(/_/g, '-');
}

/**
 * The catalog section a part is listed under. Window films are stored as `other` with
 * `attributes.part = 'window_tint'`, but people look for them under "paint, wraps and tint".
 */
export function seoCategory(item: { category: CatalogCategory; attributes?: Record<string, unknown> | null }): CatalogCategory {
  return item.attributes?.['part'] === 'window_tint' ? 'wrap_paint' : item.category;
}

/** The brand, unless the part name already starts with it ("3M" + "3M Crystalline" is not "3M 3M Crystalline"). */
export function brandNotInName(brand: string | null | undefined, name: string): string {
  const b = (brand ?? '').trim();
  return b && !name.trim().toLowerCase().startsWith(b.toLowerCase()) ? b : '';
}

export function categoryFromUrlSlug(segment: string): CatalogCategory | null {
  const slug = segment.replace(/-/g, '_');
  return (CATALOG_CATEGORIES.find((c) => c.slug === slug)?.slug as CatalogCategory | undefined) ?? null;
}

/** Category names per language, written the way people search for them. */
export const CATEGORY_NAMES: Record<Locale, Record<CatalogCategory, string>> = {
  uz: {
    wheels: 'Disklar',
    body_kit: 'Bamper va kuzov kit (obves)',
    lighting: 'Faralar va optika',
    spoiler: 'Spoylerlar va qanotlar',
    suspension: 'Podveska va koiloverlar',
    interior: 'Salon va rul',
    exhaust: 'Glushitel va chiqarish tizimi',
    wrap_paint: 'Rang, plyonka va tonirovka',
    ceramic: 'Keramik qoplama',
    polish: 'Polirovka',
    other: 'Boshqa tyuning detallari',
  },
  ru: {
    wheels: 'Диски',
    body_kit: 'Бамперы и обвесы',
    lighting: 'Фары и оптика',
    spoiler: 'Спойлеры и антикрылья',
    suspension: 'Подвеска и койловеры',
    interior: 'Салон и руль',
    exhaust: 'Глушители и выхлоп',
    wrap_paint: 'Цвет, плёнка и тонировка',
    ceramic: 'Керамическое покрытие',
    polish: 'Полировка',
    other: 'Другие тюнинг-детали',
  },
  en: {
    wheels: 'Wheels & rims',
    body_kit: 'Bumpers & body kits',
    lighting: 'Headlights & lighting',
    spoiler: 'Spoilers & wings',
    suspension: 'Suspension & coilovers',
    interior: 'Interior & steering wheels',
    exhaust: 'Exhaust systems',
    wrap_paint: 'Paint, wraps & window tint',
    ceramic: 'Ceramic coating',
    polish: 'Paint polishing',
    other: 'Other tuning parts',
  },
  ar: {
    wheels: 'الجنوط',
    body_kit: 'الصدامات وأطقم الهيكل',
    lighting: 'المصابيح والإضاءة',
    spoiler: 'السبويلر والأجنحة',
    suspension: 'نظام التعليق',
    interior: 'المقصورة والمقود',
    exhaust: 'أنظمة العادم',
    wrap_paint: 'الطلاء والتغليف وتظليل النوافذ',
    ceramic: 'الطلاء السيراميكي',
    polish: 'تلميع الهيكل',
    other: 'قطع تعديل أخرى',
  },
  tr: {
    wheels: 'Jantlar',
    body_kit: 'Tamponlar ve body kitler',
    lighting: 'Farlar ve aydınlatma',
    spoiler: 'Spoylerler ve kanatlar',
    suspension: 'Süspansiyon ve coilover',
    interior: 'İç mekân ve direksiyon',
    exhaust: 'Egzoz sistemleri',
    wrap_paint: 'Boya, kaplama ve cam filmi',
    ceramic: 'Seramik kaplama',
    polish: 'Pasta cila',
    other: 'Diğer modifiye parçaları',
  },
  kk: {
    wheels: 'Дискілер',
    body_kit: 'Бамперлер мен обвестер',
    lighting: 'Фаралар мен оптика',
    spoiler: 'Спойлерлер',
    suspension: 'Аспа және койловерлер',
    interior: 'Салон және руль',
    exhaust: 'Бәсеңдеткіштер',
    wrap_paint: 'Түс, пленка және тонировка',
    ceramic: 'Керамикалық жабын',
    polish: 'Жылтырату',
    other: 'Басқа тюнинг бөлшектері',
  },
  ky: {
    wheels: 'Дисктер',
    body_kit: 'Бамперлер жана обвестер',
    lighting: 'Фаралар жана оптика',
    spoiler: 'Спойлерлер',
    suspension: 'Аспа жана койловерлер',
    interior: 'Салон жана руль',
    exhaust: 'Глушителдер',
    wrap_paint: 'Түс, пленка жана тонировка',
    ceramic: 'Керамикалык жабуу',
    polish: 'Жылмалоо',
    other: 'Башка тюнинг тетиктери',
  },
  tg: {
    wheels: 'Дискҳо',
    body_kit: 'Бамперҳо ва обвесҳо',
    lighting: 'Фараҳо ва оптика',
    spoiler: 'Спойлерҳо',
    suspension: 'Овеза ва койловерҳо',
    interior: 'Салон ва рул',
    exhaust: 'Глушителҳо',
    wrap_paint: 'Ранг, плёнка ва тонировка',
    ceramic: 'Қабати керамикӣ',
    polish: 'Сайқалдиҳӣ',
    other: 'Дигар қисмҳои тюнинг',
  },
};

/** Page copy for the crawlable catalog (`/catalog`, `/catalog/[category]`). */
export interface CatalogCopy {
  title: string;
  description: string;
  h1: string;
  intro: string;
  allCategories: string;
  parts: (n: number) => string;
  categoryTitle: (category: string) => string;
  categoryDescription: (category: string, n: number) => string;
  fits: string;
  universal: string;
  openShop: string;
  empty: string;
}

export const CATALOG_COPY: Record<Locale, CatalogCopy> = {
  uz: {
    title: 'Barcha tyuning detallari katalogi — CarVision',
    description: 'CarVision ustaxonalaridagi barcha tyuning detallari: disklar, bamperlar, spoylerlar, faralar, plyonka va boshqalar. Har bir detalni AI bilan mashinangizda ko‘ring.',
    h1: 'Tyuning detallari katalogi',
    intro: 'Ustaxonalar yuklagan har bir detal shu yerda: rasm, narx va qaysi mashinaga mosligi bilan. Detalni oching, mashinangizda AI bilan ko‘ring va band qiling.',
    allCategories: 'Barcha kategoriyalar',
    parts: (n) => `${n} ta detal`,
    categoryTitle: (c) => `${c} — tyuning detallari | CarVision`,
    categoryDescription: (c, n) => `${c}: ${n} ta detal ustaxonalardan. Narxlar, rasmlar va mashinangizga mosligi. AI bilan mashinangizda ko‘ring va CarVision orqali band qiling.`,
    fits: 'Mos keladi',
    universal: 'Universal',
    openShop: 'Do‘konni ochish',
    empty: 'Bu kategoriyada hozircha detal yo‘q.',
  },
  ru: {
    title: 'Каталог всех тюнинг-деталей — CarVision',
    description: 'Все тюнинг-детали мастерских CarVision: диски, бамперы, спойлеры, фары, плёнка и другое. Примерьте каждую деталь на свой автомобиль с помощью AI.',
    h1: 'Каталог тюнинг-деталей',
    intro: 'Здесь каждая деталь, загруженная мастерскими: с фото, ценой и совместимостью с автомобилями. Откройте деталь, примерьте её на свою машину с AI и забронируйте.',
    allCategories: 'Все категории',
    parts: (n) => `${n} деталей`,
    categoryTitle: (c) => `${c} — тюнинг-детали | CarVision`,
    categoryDescription: (c, n) => `${c}: ${n} деталей от мастерских. Цены, фото и совместимость с вашим авто. Примерьте с AI и забронируйте через CarVision.`,
    fits: 'Подходит для',
    universal: 'Универсальная',
    openShop: 'Открыть магазин',
    empty: 'В этой категории пока нет деталей.',
  },
  en: {
    title: 'All Car Tuning Parts Catalog — CarVision',
    description: 'Every tuning part from CarVision workshops: wheels, bumpers, spoilers, headlights, wraps and more. Preview each part on your own car with AI.',
    h1: 'Tuning parts catalog',
    intro: 'Every part workshops have uploaded, with photos, price and the cars it fits. Open a part, preview it on your car with AI and reserve it.',
    allCategories: 'All categories',
    parts: (n) => `${n} parts`,
    categoryTitle: (c) => `${c} — Tuning Parts | CarVision`,
    categoryDescription: (c, n) => `${c}: ${n} parts from tuning workshops. Prices, photos and fitment for your car. Preview with AI and reserve through CarVision.`,
    fits: 'Fits',
    universal: 'Universal fit',
    openShop: 'Open the shop',
    empty: 'No parts in this category yet.',
  },
  ar: {
    title: 'كتالوج جميع قطع تعديل السيارات — CarVision',
    description: 'جميع قطع التعديل من ورش CarVision: جنوط وصدامات وسبويلر ومصابيح وتغليف والمزيد. جرّب كل قطعة على سيارتك بالذكاء الاصطناعي.',
    h1: 'كتالوج قطع التعديل',
    intro: 'كل قطعة رفعتها الورش هنا مع الصور والسعر والسيارات المتوافقة. افتح القطعة وجرّبها على سيارتك بالذكاء الاصطناعي واحجزها.',
    allCategories: 'كل الفئات',
    parts: (n) => `${n} قطعة`,
    categoryTitle: (c) => `${c} — قطع التعديل | CarVision`,
    categoryDescription: (c, n) => `${c}: ${n} قطعة من ورش التعديل. الأسعار والصور والتوافق مع سيارتك. جرّبها بالذكاء الاصطناعي واحجزها عبر CarVision.`,
    fits: 'متوافقة مع',
    universal: 'تناسب الجميع',
    openShop: 'افتح المتجر',
    empty: 'لا توجد قطع في هذه الفئة بعد.',
  },
  tr: {
    title: 'Tüm Modifiye Parçaları Kataloğu — CarVision',
    description: 'CarVision atölyelerindeki tüm modifiye parçaları: jantlar, tamponlar, spoylerler, farlar, kaplamalar ve dahası. Her parçayı yapay zekâ ile aracınızda görün.',
    h1: 'Modifiye parçaları kataloğu',
    intro: 'Atölyelerin yüklediği her parça burada: fotoğraf, fiyat ve uyumlu araçlarla. Parçayı açın, yapay zekâ ile aracınızda görün ve ayırtın.',
    allCategories: 'Tüm kategoriler',
    parts: (n) => `${n} parça`,
    categoryTitle: (c) => `${c} — Modifiye Parçaları | CarVision`,
    categoryDescription: (c, n) => `${c}: atölyelerden ${n} parça. Fiyatlar, fotoğraflar ve aracınıza uyum. Yapay zekâ ile deneyin, CarVision ile ayırtın.`,
    fits: 'Uyumlu',
    universal: 'Evrensel',
    openShop: 'Mağazayı aç',
    empty: 'Bu kategoride henüz parça yok.',
  },
  kk: {
    title: 'Барлық тюнинг бөлшектерінің каталогы — CarVision',
    description: 'CarVision шеберханаларының барлық тюнинг бөлшектері: дискілер, бамперлер, спойлерлер, фаралар, пленка. Әр бөлшекті көлігіңізде AI арқылы көріңіз.',
    h1: 'Тюнинг бөлшектерінің каталогы',
    intro: 'Шеберханалар жүктеген әр бөлшек осында: суреті, бағасы және сәйкес көліктері. Бөлшекті ашып, көлігіңізде AI арқылы көріп, брондаңыз.',
    allCategories: 'Барлық санаттар',
    parts: (n) => `${n} бөлшек`,
    categoryTitle: (c) => `${c} — тюнинг бөлшектері | CarVision`,
    categoryDescription: (c, n) => `${c}: шеберханалардан ${n} бөлшек. Бағалар, суреттер және көлігіңізге сәйкестігі. AI арқылы көріп, CarVision арқылы брондаңыз.`,
    fits: 'Сәйкес',
    universal: 'Әмбебап',
    openShop: 'Дүкенді ашу',
    empty: 'Бұл санатта әзірге бөлшек жоқ.',
  },
  ky: {
    title: 'Бардык тюнинг тетиктеринин каталогу — CarVision',
    description: 'CarVision устаканаларынын бардык тюнинг тетиктери: дисктер, бамперлер, спойлерлер, фаралар, пленка. Ар бир тетикти унааңызда AI менен көрүңүз.',
    h1: 'Тюнинг тетиктеринин каталогу',
    intro: 'Устаканалар жүктөгөн ар бир тетик ушул жерде: сүрөтү, баасы жана шайкеш унаалары. Тетикти ачып, унааңызда AI менен көрүп, брондоңуз.',
    allCategories: 'Бардык категориялар',
    parts: (n) => `${n} тетик`,
    categoryTitle: (c) => `${c} — тюнинг тетиктери | CarVision`,
    categoryDescription: (c, n) => `${c}: устаканалардан ${n} тетик. Баалар, сүрөттөр жана унааңызга шайкештиги. AI менен көрүп, CarVision аркылуу брондоңуз.`,
    fits: 'Шайкеш',
    universal: 'Универсал',
    openShop: 'Дүкөндү ачуу',
    empty: 'Бул категорияда азырынча тетик жок.',
  },
  tg: {
    title: 'Феҳристи ҳамаи қисмҳои тюнинг — CarVision',
    description: 'Ҳамаи қисмҳои тюнинги устохонаҳои CarVision: дискҳо, бамперҳо, спойлерҳо, фараҳо, плёнка. Ҳар қисмро дар мошини худ бо AI бубинед.',
    h1: 'Феҳристи қисмҳои тюнинг',
    intro: 'Ҳар қисме, ки устохонаҳо бор кардаанд, дар ин ҷост: бо акс, нарх ва мошинҳои мувофиқ. Қисмро кушоед, дар мошини худ бо AI бубинед ва брон кунед.',
    allCategories: 'Ҳамаи категорияҳо',
    parts: (n) => `${n} қисм`,
    categoryTitle: (c) => `${c} — қисмҳои тюнинг | CarVision`,
    categoryDescription: (c, n) => `${c}: ${n} қисм аз устохонаҳо. Нархҳо, аксҳо ва мувофиқат бо мошини шумо. Бо AI бубинед ва тавассути CarVision брон кунед.`,
    fits: 'Мувофиқ',
    universal: 'Универсалӣ',
    openShop: 'Кушодани мағоза',
    empty: 'Дар ин категория ҳоло қисм нест.',
  },
};
