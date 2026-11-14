import type { Locale } from '@/i18n/routing';
import { legalContext, type LegalContext } from './context';
import { privacyEn } from './privacy.en';
import { privacyRu } from './privacy.ru';
import { privacyUz } from './privacy.uz';
import { termsEn } from './terms.en';
import { termsRu } from './terms.ru';
import { termsUz } from './terms.uz';
import type { LegalDoc, LegalUi } from './types';

export type LegalKind = 'terms' | 'privacy';
type DocLang = 'uz' | 'ru' | 'en';

const DOCS: Record<LegalKind, Record<DocLang, (c: LegalContext) => LegalDoc>> = {
  terms: { uz: termsUz, ru: termsRu, en: termsEn },
  privacy: { uz: privacyUz, ru: privacyRu, en: privacyEn },
};

/**
 * The documents are written in Uzbek (governing text), Russian and English. Kazakh, Kyrgyz and
 * Tajik visitors get the Russian text, Arabic and Turkish visitors the English one, with a note.
 */
const DOC_LANG: Record<Locale, DocLang> = { uz: 'uz', ru: 'ru', en: 'en', kk: 'ru', ky: 'ru', tg: 'ru', ar: 'en', tr: 'en' };

const UI: Record<Locale, LegalUi> = {
  uz: { contents: 'MUNDARIJA', effective: 'Kuchga kirgan sana', version: 'Versiya', home: 'Bosh sahifa', otherDoc: { terms: 'FOYDALANISH SHARTLARI', privacy: 'MAXFIYLIK SIYOSATI' }, languageNote: null, backToTop: 'YUQORIGA' },
  ru: { contents: 'СОДЕРЖАНИЕ', effective: 'Вступает в силу', version: 'Версия', home: 'Главная', otherDoc: { terms: 'ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ', privacy: 'ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ' }, languageNote: null, backToTop: 'НАВЕРХ' },
  en: { contents: 'CONTENTS', effective: 'Effective', version: 'Version', home: 'Home', otherDoc: { terms: 'TERMS OF USE', privacy: 'PRIVACY POLICY' }, languageNote: null, backToTop: 'BACK TO TOP' },
  kk: { contents: 'МАЗМҰНЫ', effective: 'Күшіне енеді', version: 'Нұсқа', home: 'Басты бет', otherDoc: { terms: 'ПАЙДАЛАНУ ШАРТТАРЫ', privacy: 'ҚҰПИЯЛЫЛЫҚ САЯСАТЫ' }, languageNote: 'Құжат орыс тілінде берілген. Мәтіндер арасында айырмашылық болса, өзбек тіліндегі нұсқа басым болады.', backToTop: 'ЖОҒАРЫ' },
  ky: { contents: 'МАЗМУНУ', effective: 'Күчүнө кирет', version: 'Версия', home: 'Башкы бет', otherDoc: { terms: 'КОЛДОНУУ ШАРТТАРЫ', privacy: 'КУПУЯЛЫК САЯСАТЫ' }, languageNote: 'Документ орус тилинде берилген. Тексттер айырмаланса, өзбек тилиндеги нуска артыкчылыкка ээ.', backToTop: 'ӨЙДӨ' },
  tg: { contents: 'МУНДАРИҶА', effective: 'Эътибор пайдо мекунад', version: 'Версия', home: 'Саҳифаи асосӣ', otherDoc: { terms: 'ШАРТҲОИ ИСТИФОДА', privacy: 'СИЁСАТИ МАХФИЯТ' }, languageNote: 'Ҳуҷҷат бо забони русӣ пешниҳод шудааст. Дар сурати фарқият матни ӯзбекӣ афзалият дорад.', backToTop: 'БА БОЛО' },
  ar: { contents: 'المحتويات', effective: 'تاريخ السريان', version: 'الإصدار', home: 'الرئيسية', otherDoc: { terms: 'شروط الاستخدام', privacy: 'سياسة الخصوصية' }, languageNote: 'هذه الوثيقة متاحة باللغة الإنجليزية. في حال وجود اختلاف بين النصوص، يُعتمد النص باللغة الأوزبكية.', backToTop: 'إلى الأعلى' },
  tr: { contents: 'İÇİNDEKİLER', effective: 'Yürürlük tarihi', version: 'Sürüm', home: 'Ana sayfa', otherDoc: { terms: 'KULLANIM KOŞULLARI', privacy: 'GİZLİLİK POLİTİKASI' }, languageNote: 'Bu belge İngilizce olarak sunulmaktadır. Metinler arasında farklılık olması hâlinde Özbekçe metin esas alınır.', backToTop: 'YUKARI' },
};

export function getLegal(kind: LegalKind, locale: Locale): { doc: LegalDoc; ui: LegalUi; lang: DocLang } {
  const lang = DOC_LANG[locale];
  return { doc: DOCS[kind][lang](legalContext()), ui: UI[locale], lang };
}

/** Short description for the page's meta tags. */
export function legalDescription(doc: LegalDoc): string {
  const t = doc.lead.replace(/\s+/g, ' ').trim();
  return t.length > 158 ? `${t.slice(0, 157)}…` : t;
}
