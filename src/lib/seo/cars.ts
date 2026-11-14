import type { Locale } from '@/i18n/routing';
import type { CatalogCategory } from '@/domain/catalog';
import { seoCategory } from './categories';

/** What the car pages need from a catalog item. */
export interface CarFitItem {
  id: string;
  category: CatalogCategory;
  attributes?: Record<string, unknown> | null;
  isUniversal: boolean;
  fitment: Array<{ label: string }>;
}

export interface CarModel {
  slug: string;
  /** As the catalog names it, e.g. "Chevrolet Gentra". */
  label: string;
  /** Parts listed for exactly this model (universal parts are not counted). */
  count: number;
}

/**
 * URL segment of a car model: "Chevrolet Gentra" -> "chevrolet-gentra". Latin letters and digits only;
 * a model name with no Latin letters yields '' (no page for it, rather than an unreadable URL).
 */
export function carSlug(label: string): string {
  return label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Every car model some part is listed for, most parts first (ties by name). */
export function carModels(items: CarFitItem[]): CarModel[] {
  const map = new Map<string, CarModel>();
  for (const item of items) {
    const seen = new Set<string>();
    for (const f of item.fitment) {
      const slug = carSlug(f.label ?? '');
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const model = map.get(slug) ?? { slug, label: f.label.trim(), count: 0 };
      model.count += 1;
      map.set(slug, model);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** True when the item is listed for the model with this slug. */
export function fitsCar(item: CarFitItem, slug: string): boolean {
  return item.fitment.some((f) => carSlug(f.label ?? '') === slug);
}

/**
 * Parts for a car model page: the ones listed for this model first, then universal parts (marked
 * as such on the page). `category` narrows both to one catalog section.
 */
export function partsForCar<T extends CarFitItem>(items: T[], slug: string, category?: CatalogCategory): { listed: T[]; universal: T[] } {
  const inCategory = (i: T) => !category || seoCategory(i) === category;
  const listed = items.filter((i) => fitsCar(i, slug) && inCategory(i));
  const universal = items.filter((i) => i.isUniversal && !fitsCar(i, slug) && inCategory(i));
  return { listed, universal };
}

const lowerFirst = (text: string, locale: Locale) => text.charAt(0).toLocaleLowerCase(locale) + text.slice(1);

export interface CarsCopy {
  indexTitle: string;
  indexDescription: string;
  indexH1: string;
  indexIntro: string;
  byCar: string;
  carTitle: (car: string) => string;
  carH1: (car: string) => string;
  carDescription: (car: string, n: number) => string;
  carCategoryTitle: (category: string, car: string) => string;
  carCategoryH1: (category: string, car: string) => string;
  carCategoryDescription: (category: string, car: string, n: number) => string;
  universalHeading: string;
}

/** Copy of the car model pages, written the way people search ("Gentra uchun disklar"). */
export const CARS_COPY: Record<Locale, CarsCopy> = {
  uz: {
    indexTitle: 'Mashina modeli boʻyicha tyuning detallari | CarVision',
    indexDescription: 'Mashinangiz modelini tanlang: unga mos disklar, bamperlar, faralar, tonirovka va boshqa tyuning detallari ustaxonalardan.',
    indexH1: 'Mashina modeli boʻyicha detallar',
    indexIntro: 'Har bir model sahifasida aynan shu mashinaga moslab sotilayotgan detallar bor. Detalni oching va AI bilan mashinangizda koʻring.',
    byCar: 'Mashina boʻyicha',
    carTitle: (c) => `${c} uchun tyuning detallari — narxlar | CarVision`,
    carH1: (c) => `${c} uchun tyuning detallari`,
    carDescription: (c, n) => `${c} uchun ${n} ta tyuning detali: disklar, bamperlar, faralar, tonirovka va boshqalar. Narxlar, rasmlar, AI bilan mashinangizda koʻring.`,
    carCategoryTitle: (k, c) => `${c} uchun ${lowerFirst(k, 'uz')} — narxlar | CarVision`,
    carCategoryH1: (k, c) => `${c} uchun ${lowerFirst(k, 'uz')}`,
    carCategoryDescription: (k, c, n) => `${c} uchun ${lowerFirst(k, 'uz')}: ${n} ta taklif ustaxonalardan. Narxlar, rasmlar va AI bilan mashinangizda sinab koʻring.`,
    universalHeading: 'Universal detallar (har qanday mashinaga)',
  },
  ru: {
    indexTitle: 'Тюнинг-детали по модели автомобиля | CarVision',
    indexDescription: 'Выберите модель автомобиля: подходящие диски, бамперы, фары, тонировка и другие тюнинг-детали от мастерских.',
    indexH1: 'Детали по модели автомобиля',
    indexIntro: 'На странице каждой модели — детали, которые продаются именно для неё. Откройте деталь и примерьте её на свою машину с помощью AI.',
    byCar: 'По модели авто',
    carTitle: (c) => `Тюнинг для ${c} — детали и цены | CarVision`,
    carH1: (c) => `Тюнинг-детали для ${c}`,
    carDescription: (c, n) => `${n} тюнинг-деталей для ${c}: диски, бамперы, фары, тонировка и другое. Цены, фото и примерка на вашу машину с AI.`,
    carCategoryTitle: (k, c) => `${k} для ${c} — цены | CarVision`,
    carCategoryH1: (k, c) => `${k} для ${c}`,
    carCategoryDescription: (k, c, n) => `${k} для ${c}: ${n} предложений от мастерских. Цены, фото и примерка на вашу машину с AI.`,
    universalHeading: 'Универсальные детали (для любой машины)',
  },
  en: {
    indexTitle: 'Tuning parts by car model | CarVision',
    indexDescription: 'Pick your car model: wheels, bumpers, headlights, window tint and other tuning parts that fit it, from tuning workshops.',
    indexH1: 'Parts by car model',
    indexIntro: 'Each model page lists the parts sold for exactly that car. Open a part and try it on your own car with AI.',
    byCar: 'By car model',
    carTitle: (c) => `${c} tuning parts and prices | CarVision`,
    carH1: (c) => `Tuning parts for the ${c}`,
    carDescription: (c, n) => `${n} tuning parts for the ${c}: wheels, bumpers, headlights, window tint and more. Prices, photos and an AI preview on your car.`,
    carCategoryTitle: (k, c) => `${k} for the ${c} — prices | CarVision`,
    carCategoryH1: (k, c) => `${k} for the ${c}`,
    carCategoryDescription: (k, c, n) => `${k} for the ${c}: ${n} offers from tuning workshops. Prices, photos and an AI preview on your own car.`,
    universalHeading: 'Universal parts (fit any car)',
  },
  ar: {
    indexTitle: 'قطع التعديل حسب طراز السيارة | CarVision',
    indexDescription: 'اختر طراز سيارتك: جنوط وصدامات ومصابيح وتظليل وقطع تعديل أخرى تناسبها من ورش التعديل.',
    indexH1: 'القطع حسب طراز السيارة',
    indexIntro: 'تعرض صفحة كل طراز القطع المباعة لهذه السيارة تحديدًا. افتح القطعة وجرّبها على سيارتك بالذكاء الاصطناعي.',
    byCar: 'حسب السيارة',
    carTitle: (c) => `قطع تعديل ${c} والأسعار | CarVision`,
    carH1: (c) => `قطع تعديل لـ ${c}`,
    carDescription: (c, n) => `${n} قطعة تعديل لـ ${c}: جنوط وصدامات ومصابيح وتظليل وغيرها. الأسعار والصور ومعاينة بالذكاء الاصطناعي.`,
    carCategoryTitle: (k, c) => `${k} لـ ${c} — الأسعار | CarVision`,
    carCategoryH1: (k, c) => `${k} لـ ${c}`,
    carCategoryDescription: (k, c, n) => `${k} لـ ${c}: ${n} عرضًا من ورش التعديل. الأسعار والصور ومعاينة على سيارتك بالذكاء الاصطناعي.`,
    universalHeading: 'قطع عامة (لأي سيارة)',
  },
  tr: {
    indexTitle: 'Araç modeline göre tuning parçaları | CarVision',
    indexDescription: 'Aracınızın modelini seçin: ona uyan jantlar, tamponlar, farlar, cam filmi ve diğer tuning parçaları atölyelerden.',
    indexH1: 'Araç modeline göre parçalar',
    indexIntro: 'Her model sayfasında tam o araç için satılan parçalar var. Parçayı açın ve yapay zekâ ile kendi aracınızda deneyin.',
    byCar: 'Araca göre',
    carTitle: (c) => `${c} tuning parçaları ve fiyatları | CarVision`,
    carH1: (c) => `${c} için tuning parçaları`,
    carDescription: (c, n) => `${c} için ${n} tuning parçası: jantlar, tamponlar, farlar, cam filmi ve daha fazlası. Fiyatlar, fotoğraflar ve yapay zekâ önizlemesi.`,
    carCategoryTitle: (k, c) => `${c} için ${lowerFirst(k, 'tr')} — fiyatlar | CarVision`,
    carCategoryH1: (k, c) => `${c} için ${lowerFirst(k, 'tr')}`,
    carCategoryDescription: (k, c, n) => `${c} için ${lowerFirst(k, 'tr')}: atölyelerden ${n} teklif. Fiyatlar, fotoğraflar ve aracınızda yapay zekâ önizlemesi.`,
    universalHeading: 'Üniversal parçalar (her araca uyar)',
  },
  kk: {
    indexTitle: 'Көлік моделі бойынша тюнинг бөлшектері | CarVision',
    indexDescription: 'Көлігіңіздің моделін таңдаңыз: оған лайық дискілер, бамперлер, фаралар, тонировка және басқа тюнинг бөлшектері.',
    indexH1: 'Көлік моделі бойынша бөлшектер',
    indexIntro: 'Әр модель бетінде дәл осы көлікке арналған бөлшектер бар. Бөлшекті ашып, AI арқылы өз көлігіңізде көріңіз.',
    byCar: 'Көлік бойынша',
    carTitle: (c) => `${c} үшін тюнинг бөлшектері — бағалар | CarVision`,
    carH1: (c) => `${c} үшін тюнинг бөлшектері`,
    carDescription: (c, n) => `${c} үшін ${n} тюнинг бөлшегі: дискілер, бамперлер, фаралар, тонировка және т.б. Бағалар, суреттер, AI арқылы көру.`,
    carCategoryTitle: (k, c) => `${c} үшін ${lowerFirst(k, 'kk')} — бағалар | CarVision`,
    carCategoryH1: (k, c) => `${c} үшін ${lowerFirst(k, 'kk')}`,
    carCategoryDescription: (k, c, n) => `${c} үшін ${lowerFirst(k, 'kk')}: шеберханалардан ${n} ұсыныс. Бағалар, суреттер және AI арқылы өз көлігіңізде көру.`,
    universalHeading: 'Әмбебап бөлшектер (кез келген көлікке)',
  },
  ky: {
    indexTitle: 'Унаа модели боюнча тюнинг тетиктери | CarVision',
    indexDescription: 'Унааңыздын моделин тандаңыз: ага туура келген дисктер, бамперлер, фаралар, тонировка жана башка тюнинг тетиктери.',
    indexH1: 'Унаа модели боюнча тетиктер',
    indexIntro: 'Ар бир модель барагында так ушул унаага сатылган тетиктер бар. Тетикти ачып, AI менен өз унааңызда көрүңүз.',
    byCar: 'Унаа боюнча',
    carTitle: (c) => `${c} үчүн тюнинг тетиктери — баалар | CarVision`,
    carH1: (c) => `${c} үчүн тюнинг тетиктери`,
    carDescription: (c, n) => `${c} үчүн ${n} тюнинг тетиги: дисктер, бамперлер, фаралар, тонировка жана башкалар. Баалар, сүрөттөр, AI менен көрүү.`,
    carCategoryTitle: (k, c) => `${c} үчүн ${lowerFirst(k, 'ky')} — баалар | CarVision`,
    carCategoryH1: (k, c) => `${c} үчүн ${lowerFirst(k, 'ky')}`,
    carCategoryDescription: (k, c, n) => `${c} үчүн ${lowerFirst(k, 'ky')}: устаканалардан ${n} сунуш. Баалар, сүрөттөр жана AI менен өз унааңызда көрүү.`,
    universalHeading: 'Универсалдуу тетиктер (каалаган унаага)',
  },
  tg: {
    indexTitle: 'Қисмҳои тюнинг аз рӯи модели мошин | CarVision',
    indexDescription: 'Модели мошини худро интихоб кунед: дискҳо, бамперҳо, фараҳо, тонировка ва дигар қисмҳои тюнинг, ки ба он мувофиқанд.',
    indexH1: 'Қисмҳо аз рӯи модели мошин',
    indexIntro: 'Дар саҳифаи ҳар модел қисмҳое ҳастанд, ки маҳз барои ҳамин мошин фурӯхта мешаванд. Қисмро кушоед ва бо AI дар мошини худ бинед.',
    byCar: 'Аз рӯи мошин',
    carTitle: (c) => `Қисмҳои тюнинг барои ${c} — нархҳо | CarVision`,
    carH1: (c) => `Қисмҳои тюнинг барои ${c}`,
    carDescription: (c, n) => `${n} қисми тюнинг барои ${c}: дискҳо, бамперҳо, фараҳо, тонировка ва ғайра. Нархҳо, аксҳо ва намоиш бо AI.`,
    carCategoryTitle: (k, c) => `${k} барои ${c} — нархҳо | CarVision`,
    carCategoryH1: (k, c) => `${k} барои ${c}`,
    carCategoryDescription: (k, c, n) => `${k} барои ${c}: ${n} пешниҳод аз устохонаҳо. Нархҳо, аксҳо ва намоиш дар мошини шумо бо AI.`,
    universalHeading: 'Қисмҳои универсалӣ (барои ҳар мошин)',
  },
};
