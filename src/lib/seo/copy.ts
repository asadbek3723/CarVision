import type { Locale } from '@/i18n/routing';

/**
 * Per-locale SEO copy. Titles <= 60 chars, descriptions 120-160 chars.
 * Kept out of messages/*.json on purpose: it is metadata, not UI.
 */
export interface SeoCopy {
  tagline: string;
  home: { title: string; description: string };
  shop: { title: string; description: string };
  plans: { title: string; description: string };
  productDescription: (name: string, brand: string, category: string) => string;
  breadcrumbHome: string;
  breadcrumbShop: string;
}

export const SEO_COPY: Record<Locale, SeoCopy> = {
  uz: {
    tagline: 'AI yordamida avto tyuning vizualizatori',
    home: {
      title: 'CarVision — avto tyuning vizualizatori | Disk, kuzov kit, plyonka',
      description:
        'Mashinangizni suratga oling va disk, kuzov kit, plyonkani avtomobilingizda AI yordamida oldindan ko‘ring. Ustaxonalardan qismlarni band qiling.',
    },
    shop: {
      title: 'Tyuning qismlari katalogi — disk, kuzov kit, detallar',
      description:
        'Ustaxonalarning tyuning qismlari: disklar, kuzov kitlar, spoyler va aksessuarlar. Mashinangizga mosligini tekshiring va CarVision orqali band qiling.',
    },
    plans: {
      title: 'Tariflar va narxlar — ustaxonalar uchun CarVision',
      description:
        'Tuning ustaxonalari uchun CarVision tariflari: kreditlar, ombor, buyurtmalar va AI vizualizator. Bepul boshlang va biznesingizni kengaytiring.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. Avtomobilingizga AI orqali sinab ko‘ring va CarVision orqali band qiling.`,
    breadcrumbHome: 'Bosh sahifa',
    breadcrumbShop: 'Katalog',
  },
  ru: {
    tagline: 'AI-визуализатор тюнинга автомобилей',
    home: {
      title: 'CarVision — визуализатор тюнинга авто | Диски, обвесы, плёнка',
      description:
        'Сфотографируйте свой автомобиль и примерьте диски, обвес и плёнку с помощью AI до покупки. Бронируйте детали в проверенных мастерских.',
    },
    shop: {
      title: 'Каталог тюнинг-деталей — диски, обвесы, аксессуары',
      description:
        'Тюнинг-детали от мастерских: диски, обвесы, спойлеры и аксессуары. Проверьте совместимость с вашим авто и забронируйте через CarVision.',
    },
    plans: {
      title: 'Тарифы и цены — CarVision для мастерских',
      description:
        'Тарифы CarVision для тюнинг-мастерских: кредиты, склад, заказы и AI-визуализатор. Начните бесплатно и развивайте свой бизнес.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. Примерьте на своём авто с помощью AI и забронируйте через CarVision.`,
    breadcrumbHome: 'Главная',
    breadcrumbShop: 'Каталог',
  },
  en: {
    tagline: 'AI car tuning visualizer',
    home: {
      title: 'CarVision — AI Car Tuning Visualizer | Wheels, Body Kits, Wraps',
      description:
        'Photograph your car and preview wheels, body kits and wraps on it with AI before you buy. Reserve parts from trusted tuning workshops.',
    },
    shop: {
      title: 'Tuning Parts Catalog — Wheels, Body Kits & Accessories',
      description:
        'Tuning parts from local workshops: wheels, body kits, spoilers and accessories. Check fitment for your car and reserve through CarVision.',
    },
    plans: {
      title: 'Plans & Pricing — CarVision for Tuning Workshops',
      description:
        'CarVision plans for tuning workshops: credits, inventory, orders and the AI visualizer. Start free and grow your business.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. Try it on your car with AI and reserve it through CarVision.`,
    breadcrumbHome: 'Home',
    breadcrumbShop: 'Catalog',
  },
  ar: {
    tagline: 'محاكي تعديل السيارات بالذكاء الاصطناعي',
    home: {
      title: 'CarVision — محاكي تعديل السيارات | جنوط وبودي كيت وتغليف',
      description:
        'صوّر سيارتك وجرّب الجنوط وطقم الهيكل والتغليف عليها بالذكاء الاصطناعي قبل الشراء، واحجز القطع من ورش موثوقة.',
    },
    shop: {
      title: 'كتالوج قطع التعديل — جنوط وبودي كيت وإكسسوارات',
      description:
        'قطع تعديل من الورش: جنوط وأطقم هيكل وسبويلر وإكسسوارات. تحقّق من توافقها مع سيارتك واحجزها عبر CarVision.',
    },
    plans: {
      title: 'الباقات والأسعار — CarVision لورش التعديل',
      description:
        'باقات CarVision لورش التعديل: رصيد ومخزون وطلبات ومحاكي الذكاء الاصطناعي. ابدأ مجانًا ووسّع عملك.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. جرّبها على سيارتك بالذكاء الاصطناعي واحجزها عبر CarVision.`,
    breadcrumbHome: 'الرئيسية',
    breadcrumbShop: 'الكتالوج',
  },
  tr: {
    tagline: 'Yapay zekâ ile araç tuning görselleştirici',
    home: {
      title: 'CarVision — Araç Tuning Görselleştirici | Jant, Body Kit, Kaplama',
      description:
        'Aracınızın fotoğrafını çekin; jant, body kit ve kaplamayı satın almadan önce yapay zekâ ile aracınızda görün. Parçaları atölyelerden ayırtın.',
    },
    shop: {
      title: 'Tuning Parça Kataloğu — Jant, Body Kit, Aksesuar',
      description:
        'Atölyelerden tuning parçaları: jantlar, body kitler, spoylerler ve aksesuarlar. Aracınıza uyumunu kontrol edin, CarVision ile ayırtın.',
    },
    plans: {
      title: 'Paketler ve Fiyatlar — Tuning Atölyeleri için CarVision',
      description:
        'Tuning atölyeleri için CarVision paketleri: kredi, stok, siparişler ve yapay zekâ görselleştirici. Ücretsiz başlayın.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. Yapay zekâ ile aracınızda deneyin ve CarVision ile ayırtın.`,
    breadcrumbHome: 'Ana sayfa',
    breadcrumbShop: 'Katalog',
  },
  kk: {
    tagline: 'AI арқылы көлік тюнингін визуализациялау',
    home: {
      title: 'CarVision — көлік тюнингін визуализациялау | Дискілер, обвес',
      description:
        'Көлігіңізді суретке түсіріп, дискілерді, обвесті және пленканы сатып алмас бұрын AI арқылы көріңіз. Бөлшектерді шеберханалардан брондаңыз.',
    },
    shop: {
      title: 'Тюнинг бөлшектері каталогы — дискілер, обвес, аксессуарлар',
      description:
        'Шеберханалардан тюнинг бөлшектері: дискілер, обвестер, спойлерлер. Көлігіңізге сәйкестігін тексеріп, CarVision арқылы брондаңыз.',
    },
    plans: {
      title: 'Тарифтер мен бағалар — шеберханаларға арналған CarVision',
      description:
        'Тюнинг шеберханаларына арналған CarVision тарифтері: кредиттер, қойма, тапсырыстар және AI визуализатор. Тегін бастаңыз.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. Көлігіңізде AI арқылы көріп, CarVision арқылы брондаңыз.`,
    breadcrumbHome: 'Басты бет',
    breadcrumbShop: 'Каталог',
  },
  ky: {
    tagline: 'AI менен унаа тюнингин визуалдаштыруу',
    home: {
      title: 'CarVision — унаа тюнингин визуалдаштыруу | Дисктер, обвес',
      description:
        'Унааңызды сүрөткө тартып, дисктерди, обвести жана пленканы сатып албай турып AI менен көрүңүз. Тетиктерди устаканалардан брондоңуз.',
    },
    shop: {
      title: 'Тюнинг тетиктеринин каталогу — дисктер, обвес, аксессуарлар',
      description:
        'Устаканалардан тюнинг тетиктери: дисктер, обвестер, спойлерлер. Унааңызга шайкештигин текшерип, CarVision аркылуу брондоңуз.',
    },
    plans: {
      title: 'Тарифтер жана баалар — устаканалар үчүн CarVision',
      description:
        'Тюнинг устаканалары үчүн CarVision тарифтери: кредиттер, кампа, буйрутмалар жана AI визуализатор. Бекер баштаңыз.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. Унааңызда AI менен көрүп, CarVision аркылуу брондоңуз.`,
    breadcrumbHome: 'Башкы бет',
    breadcrumbShop: 'Каталог',
  },
  tg: {
    tagline: 'Визуализатори тюнинги мошин бо AI',
    home: {
      title: 'CarVision — визуализатори тюнинги мошин | Дискҳо, обвес',
      description:
        'Мошини худро аксбардорӣ карда, дискҳо, обвес ва плёнкаро пеш аз харид бо AI бубинед. Қисмҳоро аз устохонаҳо брон кунед.',
    },
    shop: {
      title: 'Феҳристи қисмҳои тюнинг — дискҳо, обвес, аксессуарҳо',
      description:
        'Қисмҳои тюнинг аз устохонаҳо: дискҳо, обвесҳо, спойлерҳо. Мувофиқатро бо мошини худ санҷед ва тавассути CarVision брон кунед.',
    },
    plans: {
      title: 'Тарифҳо ва нархҳо — CarVision барои устохонаҳо',
      description:
        'Тарифҳои CarVision барои устохонаҳои тюнинг: кредитҳо, анбор, фармоишҳо ва визуализатори AI. Ройгон оғоз кунед.',
    },
    productDescription: (n, b, c) => `${b ? `${b} ` : ''}${n} — ${c}. Дар мошини худ бо AI санҷед ва тавассути CarVision брон кунед.`,
    breadcrumbHome: 'Саҳифаи асосӣ',
    breadcrumbShop: 'Феҳрист',
  },
};

/** Names people may type for the brand (spacing, Cyrillic, with the domain). */
export const BRAND_VARIANTS = ['CarVision', 'Car Vision', 'carvision', 'Карвижн', 'Кар Вижн', 'CarVision AI', 'CarVision tuning'];

/**
 * What people search for, per language. Google ignores the keywords tag; Yandex and Bing still read it,
 * and the same words are the ones the page copy is written around.
 */
export const SEO_KEYWORDS: Record<Locale, string[]> = {
  uz: ['avto tyuning', 'mashina tyuning', 'tuning Toshkent', 'disk tanlash', 'mashinaga disk', 'kuzov kit', 'bodykit', 'plyonka', 'mashina rangini o‘zgartirish', 'avto ehtiyot qismlar', 'tyuning ustaxona', 'mashinani AI bilan ko‘rish', 'avto vizualizator', 'spoyler', 'fara', 'keramika qoplama', 'polirovka'],
  ru: ['тюнинг авто', 'тюнинг Ташкент', 'подбор дисков', 'диски на авто', 'обвес', 'бодикит', 'оклейка плёнкой', 'смена цвета авто', 'автозапчасти', 'тюнинг ателье', 'визуализация тюнинга', 'примерка дисков онлайн', 'спойлер', 'фары', 'керамика', 'полировка'],
  en: ['car tuning', 'car customizer', 'wheel visualizer', 'try wheels on my car', 'body kit', 'car wrap', 'change car color', 'tuning parts', 'tuning shop', 'AI car visualizer', 'spoiler', 'headlights', 'ceramic coating', 'paint polishing'],
  ar: ['تعديل السيارات', 'جنوط', 'بودي كت', 'تغليف السيارات', 'تغيير لون السيارة', 'قطع تعديل', 'ورشة تعديل', 'محاكي السيارات', 'سبويلر', 'تلميع', 'سيراميك'],
  tr: ['araç modifiye', 'jant seçimi', 'body kit', 'araç kaplama', 'araç rengi değiştirme', 'modifiye parçaları', 'modifiye atölyesi', 'yapay zeka araç görselleştirme', 'spoyler', 'far', 'seramik kaplama', 'pasta cila'],
  kk: ['көлік тюнингі', 'тюнинг Алматы', 'диск таңдау', 'обвес', 'бодикит', 'пленка', 'көлік түсін өзгерту', 'тюнинг бөлшектері', 'тюнинг шеберханасы', 'AI визуализация'],
  ky: ['унаа тюнинги', 'тюнинг Бишкек', 'диск тандоо', 'обвес', 'бодикит', 'пленка', 'унаанын түсүн өзгөртүү', 'тюнинг тетиктери', 'тюнинг устаканасы', 'AI визуализация'],
  tg: ['тюнинги мошин', 'тюнинг Душанбе', 'интихоби диск', 'обвес', 'бодикит', 'плёнка', 'иваз кардани ранги мошин', 'қисмҳои тюнинг', 'устохонаи тюнинг', 'визуализатсия бо AI'],
};
