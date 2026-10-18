# CarVision — Master Implementation Plan (`plan.md`)

> **Status:** Completed & Verified — Phase 20: Smart Camera 1:1 Luxury Redesign, Mandatory Landscape Gate & Strict Program-Driven 4-Angle Flow (Mobile & Desktop).
> **Normative References:** User's Direct Product Vision & CTO Alignment (2026-10-18), `.agents/rules/design.md`, `.agents/rules/design-components.md`, `.agents/rules/design-carvision.md`, `DECISIONS.md`.

---

## Completed Foundation Phases (Phases 1–18)
- [x] **Phase 1–17:** Next.js 15 App Router, TypeScript strict, Tailwind CSS, 8-locale routing (`uz`, `ru`, `en`, `ar`, `tr`, `kk`, `ky`, `tg`), 8-currency engine, Supabase schema & RLS, Smart Camera 5-angle wizard, Auth, Veloce Home/Shop, and Admin Vault.
- [x] **Phase 18:** Full-page routing foundations and USD/UZS currency normalization.

---

## Phase 19: Core B2B Product Alignment & Radical Simplification (Completed)

### 19.1. 3% Zakalat = "Manzilni Ochish va Ustaxonaga Lead Yuborish" (Mahsulot Sotish Emas!)
- [x] **Shop (`/[locale]/shop` va `/[locale]/shop/[id]`):**
  - Mijoz barcha sellerlarning omboridagi mahsulotlarni ko‘radi: **faqat rasmi, narxi, ma'lumoti va qaysi 1 ta mashina uchun mosligi**.
  - **Ustaxona nomi va manzili yashiriladi:** Mijozga bu detal qaysi tuning servisda borligi va manzili **3% zakalat to‘lanmaguncha ko‘rsatilmaydi** ("Manzil va ustaxona 3% zakalatdan so‘ng ochiladi").
- [x] **3% To‘lov va Manzilni Ochish (`/[locale]/cart/checkout`):**
  - Mijoz 3% to‘lov qilgan zahoti unga: **detal qaysi tuning servisda borligi, ustaxona aniq manzili va telefoni** ochib beriladi.
  - Shu vaqtning o‘zida o‘sha tuning atelyega (sellerga) **bildirishnoma (Lead)** tushadi: mijozning ismi, telefon raqami va qaysi detalga qiziqish bildirib 3% to‘lagani.

### 19.2. Radical UI/UX Simplification — Boxless, Borderless, Hamma Tushunadigan O‘ta Sodda Dizayn
- [x] **Seller Dashboard (`SellerDashboardView.tsx`) — Faqat 2 ta Juda Sodda Bo‘lim:**
  - Barcha ortiqcha qutilar (box), chegaralar (border), murakkab grafiklar, foizlar va tushunarsiz yozuvlar olib tashlanadi.
  - **1-Bo‘lim: "Mijozlar" (Qiziqish bildirgan mijozlar):** Mijoz ismi, telefon raqami, qaysi detalga 3% to‘lagani va bitta katta **"Qo‘ng‘iroq qilish"** hamda **"Qabul qilindi"** tugmasi.
  - **2-Bo‘lim: "Mening Detallarim" (Ombor):** Ombordagi detallar ro‘yxati (ochiq, boxless dizaynda) va tepada bitta katta **"+ Detal Qo‘shish"** tugmasi.
- [x] **Foydalanuvchi Profili (`VeloceProfile.tsx`) — Maksimal Soddalashtirish:**
  - "Tuning Pasporti", "AI Balans", murakkab tablar va qutilar olib tashlanadi.
  - Faqat: Foydalanuvchi ma'lumoti, Til/Valyuta va **3% to‘lab ochilgan ustaxona manzillari** ro‘yxati qoladi.
- [x] **Luxury Rounded QR Code (`VeloceSmartCameraModal.tsx`):**
  - QR kodning 3 ta burchak ko‘zchalari (finder patterns: tashqi ramkasi va ichki yadrosi) oq ramkaning silliq egriligiga mos border-radiusda yumaloqlanadi (Apple/Tesla luxury uslubi, 100% barcha telefonlarda skanerlanadigan sof SVG QR kod).
- [x] **Dynamic Brand Core (Markaziy Logotip - `LuxuryQrCode.tsx`):**
  - QR kod markazida CarVision oltin/qora minimal monogrammasi joylashtiriladi, xavfsiz Reed-Solomon `level="H"` (30% xatolik tiklash zaxirasi) bilan 100% tezkor skanerlanadi.
- [x] **PWA Offline Handoff & Ustaxona Wi-Fi Fallback Bridge (`/scan/[sessionId]` & `VeloceSmartCameraModal.tsx`):**
  - Ustaxonada yoki yerto‘la garajda internet past bo‘lsa ham olingan fotosuratlar yo‘qolmaydi: telefon tomonida IndexedDB/offline navbatda xavfsiz saqlash, internet tiklanganda avtomatik sinxronizatsiya, va bevosita oflayn uzatish himoyasi.
- [x] **Smart Camera Wizard — Bottom Lock Bar Removal & Dynamic "Keyingi" Button (`VeloceSmartCameraModal.tsx`):**
  - Pastdagi qulfli ogohlantirish paneli ("Davom etish uchun barcha 4 ta rakurs yuklanishi shart...") butunlay olib tashlanadi.
  - Qadamlar boshqaruvidagi "Keyingi" tugmasi barcha suratlar yuklanishi bilan avtomatik "Studioga o‘tish" (oltin gradientli) tugmasiga aylanadi va to‘g‘ridan-to‘g‘ri Studioga o‘tadi.
- [x] **Desktop Initial Choice View — Clean Top-Down Car Silhouette & Centered Action Button (`VeloceSmartCameraModal.tsx`):**
  - O‘ng tomondagi "Kompyuterdan yuklash" bo‘limida kompas strelkalarisiz toza, katta va fotorealistik qora kupe avtomobil silueti (`/images/camera/topdown_coupe.png`) referens rasmga 1:1 mos qaytarildi.
  - Sarlavha tagiga referensdagi subtitr: *"Fotosuratlarni kompyuteringizdan bosqichma-bosqich kiriting"*.
  - "Rasmlarni yuklash" tugmasi to‘g‘ridan-to‘g‘ri avtomobil tagiga markazlashtirildi va ostiga *"Istalgan paytda 1 ta rasm bilan ham davom etishingiz mumkin"* izohi keltirildi.

### 19.3. Mukammal Detal Qo‘shish (`/[locale]/seller/new-part`) — 1 Mashina Qoidasi & AI Vision Gatekeeper
- [x] **1 ta Detal = Faqat 1 ta Mashina Modeli:**
  - Ko‘p mashina tanlash o‘rniga **faqat bitta aniq mashina modeli** (radio / single-select) tanlanadi.
- [x] **AI Vision Gatekeeper (`/api/v1/seller/validate-part-image`):**
  - Asosiy 1 ta toza rasm majburiy + ixtiyoriy 2-rakurs (3/4 burchak) aniqlikni 100% qilish uchun.
  - **AI Tekshiruv (Edge-Case Himoyasi):**
    1. Agar mashina detaliga aloqasi yo‘q rasm (odam, manzara, xira rasm) yuklansa — AI rad etadi va tushunarli tilda sababini aytadi.
    2. Agar kategoriya **"Fara"** tanlanib, rasmga **"Bamper"** yoki **"Disk"** yuklansa — AI buni aniqlaydi (*"Siz 'Fara' tanladingiz, lekin rasmda 'Bamper' ko‘rinmoqda"*) va xatolikni tuzatishni so‘raydi.
    3. Detalning fonini qirqib oladi (`AI Cutout`) va AI generatsiyada detal 100% o‘zidek (mayda chiziqlarigacha) tushishi uchun uning vizual pasportini (`visualSignature` + `cutoutUrl`) saqlaydi.

### 19.4. Asosiy B2B Planshet Oqimi (Ustaxona Ichidagi Mijoz Tajribasi)
- [x] **1-Qadam (Barcha Kerakli Burchaklardan Majburiy Rasmga Olish — Phase 20 bilan yangilandi):**
  - Telefon va kompyuterda barcha kerakli rakurslarni (Oldi, O‘ng, Orqa, Chap) dastur ko‘rsatgan tartibda to‘liq olish/yuklash majburiy.
- [x] **2-Qadam (Mijoz Qo‘lida Planshet — Silliq Lenta / Carousel `/[locale]/customize`):**
  - Detallar quti-quti setka emas, **xuddi bitta silliq aylanadigan lentadek (smooth horizontal filmstrip carousel)** turadi — chapga va o‘ngga tortganda silliq o‘tadi.
  - Mijoz o‘ziga yoqqan detallarni tanlaydi va **`Apply Changes` (O‘zgarishlarni qo‘llash)** tugmasini bosadi.
- [x] **3-Qadam (Alohida Natija Sahifasi — `/[locale]/customize/result`):**
  - `Apply Changes` bosilganda **alohida yangi sahifa (`/[locale]/customize/result`)** ochiladi:
    1. Katta **Before / After (Oldin va Keyin)** solishtirish.
    2. Pastida mijoz **tanlagan detallar ro‘yxati va ularning narxi**.
    3. **Ikki rejimli asosiy tugma:**
       - Agar ustaxona planshetida (Seller) bo‘lsa: **"Tasdiqlash / Buyurtmani rasmiylashtirish"** (ustaxonaning o‘zida darhol rasmiylashtiriladi).
       - Agar uydagi oddiy mijoz bo‘lsa: **"3% Zakalat to‘lab ustaxona manzilini ochish"**.
    4. **"O‘zgartirish" (`Orqaga qaytish`) tugmasi:** bosilganda `/customize` sahifasiga qaytadi va **mijoz avval tanlagan barcha detallar o‘chib ketmasdan, tanlangan holatda turadi**!
- [x] **4-Qadam ("Video sifatida ko‘rish" — AI Restoratsiya + Scripted Beat-Sync Video Edit):**
  - Natija sahifasida **"Video sifatida ko‘rish"** tugmasi bo‘ladi.
  - Bosilganda:
    - Oldingi va keyingi rasmlar AI yordamida yanada tiniqroq, studiya darajasidagi yorug‘lik va mukammal rakursga keltiriladi (o‘sha joyda, o‘sha mashina).
    - **9:16 (Vertikal Reels/TikTok)** va **16:9 (Gorizontal Planshet)** formatida, maxsus ssenariy (script) asosida musiqaga mos (**Beat-Sync**) Before → After kinematik video montaj qilinadi.
    - Mijoz **Videoni** ham, **Rasmni** ham bir bosishda yuklab oladi.

---

## Phase 20: Smart Camera 1:1 Luxury Redesign, Mandatory Landscape Gate & Strict Program-Driven Multi-Angle Flow (Active Priority)

- [x] **20.1. 1:1 Reference Smart Camera Architecture (`SmartCameraLandscapeView.tsx`):**
  - **Sof Qora Matte Asos (`#050507`) & 3-Zonali Proportsional Layout:**
    - Chap panel: Tepadagi dumaloq Orqaga (`<-`) tugmasi va markazda **3D/Top-down Avtomobil Kompas Yo‘riqnomasi**.
    - Markaziy panel: Oltin hoshiyali (`#D4AE62`) yumaloq burchakli kamera oynasi, 4 ta oltin `L`-simon burchak nishonlari va pol ustidagi **3D perspektivali oltin yo‘l/parkovka chiziqlari** (trapezoid alignment grid).
    - O‘ng panel: Oltin halqali, o‘rtasi sof oq **Luxury Shutter** rasmga olish tugmasi.
- [x] **20.2. Telefonda Majburiy Gorizontal (Landscape) Rejim va Tugmasiz Avto-Animatsiya:**
  - Telefonda Smart Cameraga kirganda (yoki QR kod orqali `/scan/[sessionId]` ochilganda) faqat gorizontal (yotiq) holatda suratga olish majburiy.
  - Agar telefon vertikal (`portrait`) bo‘lsa, ekran to‘liq **animatsiyali "Telefonni gorizontal holatga aylantiring"** oynasi bilan yopiladi.
  - Bu oynada **hech qanday o‘tkazib yuborish yoki yopish tugmasi bo‘lmaydi**.
  - Foydalanuvchi telefonni gorizontalga aylantirishi bilan oyna **avtomatik yo‘qoladi**; agar yana vertikalga qaytarilsa, oyna **avtomatik qaytadan chiqadi**.
- [x] **20.3. Dastur Boshqaradigan Kompas (Strelkalar Bosilmaydi, Ketma-ketlik Majburiy):**
  - Mashina atrofidagi 4 ta yo‘nalish ko‘rsatkichi (`^` Oldi, `>` O‘ng, `v` Orqa, `<` Chap) **tugma emas (`pointer-events-none`)** — mijoz ularni bosib o‘zgartira olmaydi.
  - Dastur qaysi tomonni oltin nur bilan ko‘rsatsa (masalan, 1-bo‘lib `^` Oldi), mijoz aynan o‘sha tomonni suratga olishi shart.
  - 1-rasm olingandan so‘ng kompas avtomatik keyingi tomonga (`>` O‘ng -> `v` Orqa -> `<` Chap) o‘tadi.
  - Hech bir rakursni tashlab o‘tib ketib bo‘lmaydi; **barcha 4 ta majburiy rasm olingandan keyingina** keyingi bosqichga (Studio) o‘tiladi.
- [x] **20.4. Kompyuterda va QR Bridge Oqimida Barcha Rasmlarni Majburiy Yuklash (`VeloceSmartCameraModal.tsx` & `/scan/[sessionId]`):**
  - Kompyuterdan rasm yuklashda ham 1 ta rasm bilan davom etib ketish butunlay taqiqlanadi.
  - Foydalanuvchi dastur ko‘rsatgan ketma-ketlikda barcha 4 ta tomon rasmini yuklamagunicha `"Keyingi"` va `"Davom etish"` tugmalari ochilmaydi.
  - QR kod orqali telefonda suratga olinganda ham barcha 4 ta rakurs to‘liq olinib kompyuterga uzatilgandan so‘nggina Studio ochiladi.

---

## Phase 21: Production-Grade Drop-in AI Image Generation (`FAL_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`) & Masterpiece Beat-Synced Video Edit Engine (Completed)

- [x] **21.1. Universal Drop-in AI Image Generation Engine (`src/server/providers/ai/direct-fitment-engine.ts` & `POST /api/v1/generations`):**
  - Foydalanuvchi `.env` yoki `.env.local` fayliga `FAL_KEY`, `GEMINI_API_KEY` (yoki `GOOGLE_API_KEY`), yoxud `OPENAI_API_KEY` qo‘yishi bilan **hech qanday qo‘shimcha kod o‘zgartirmasdan** real AI generatsiya avtomatik ishga tushadi:
    1. **Fal.ai (`FAL_KEY`):** `fal-ai/flux-pro/kontext` va `fal-ai/flux/dev/image-to-image` orqali mijozning mashinasi rasmini (`photo`) va tanlangan detallarning aniq referens rasmlarini (`partImages`) qabul qilib, mashinaning o‘z joyi, foni va rakursini 100% saqlagan holda tanlangan detallarni fotorealistik o‘rnatib beradi.
    2. **Google Gemini Multimodal Image Editing (`GEMINI_API_KEY` / `GOOGLE_API_KEY`):** `gemini-2.0-flash-exp-image-generation` / `gemini-2.5-flash-image-preview` orqali mashina rasmi + detal referens rasmlarini birlashtirib 4K natija qaytaradi.
    3. **OpenAI Image Edit (`OPENAI_API_KEY`):** `gpt-image-1` orqali avtomobilni real vaqtda tyuning qiladi.
- [x] **21.2. Fotorealistik Perspektiv Detal Joylashtirish (Local Neural-Grade Canvas Compositor — `src/lib/automotive-compositor.ts`):**
  - API kalit hali ulanmagan yoki oflayn bo‘lgan taqdirda ham "Before / After" solishtirishda shunchaki burchakdagi kartochka emas, balki:
    - Tanlangan detalning fonini avtomatik tozalaydigan (`Chroma/Luminance Background Matting`),
    - Avtomobilning 5 ta rakursiga (`front`, `rear`, `right`, `front-left`, `rear-right`) qarab **g‘ildirak disklarini g‘ildirak arkalariga, bamper/obvesni pastki kuzov qismiga, farani optika qismiga, kuzov rangini esa metallik/matoviy lak qatlamiga** fotorealistik soya va yorug‘lik bilan tushiradigan dvigatel (`composeCarAnglePhotorealistic`).
- [x] **21.3. AI Video Restoratsiya va Generatsiya API (`POST /api/v1/video-edit`):**
  - `.env` da `FAL_KEY` bo‘lganda har bir rakursni `fal-ai/clarity-upscaler` / `fal-ai/flux-pro/kontext` orqali 4K studiya aniqligida tiniqlashtiradi va ixtiyoriy `fal-ai/kling-video` / `fal-ai/luma-dream-machine` video oqimini qo‘llab-quvvatlaydi.
- [x] **21.4. Mukammal 4-Bosqichli Ssenariyli (Scripted) Beat-Sync Video Edit (`CinematicVideoStudio.tsx`):**
  - **1-Sahna (0.0s – 2.4s — Zavod Holati):** Sovuq kinematik rang (Cold Grade), sekin dolly-zoom, yurak urishiga mos puls va bass dropga tayyorgarlik.
  - **2-Sahna (2.4s – 2.85s — AI Oltin Lazer Skanerlash & Beat Drop):** Mashina ustidan oltin lazer nuri (`Laser Scanline Wipe`) o‘tib, Zavod holati ko‘z o‘ngimizda 4K Tuning holatiga aylanadi + xromatik aberratsiya va yorug‘lik chaqnashi.
  - **3-Sahna (2.85s – 8.2s — 5 Rakursli Dinamik Studiya Namoyishi):** Har bir zarba (beat) da 5 ta rakurs (`Oldi-Chap`, `Oldi`, `O‘ng`, `Orqa-O‘ng`, `Orqa`) Speed-Ramp / Whip-Pan effekti, oltin zarralar (floating bokeh particles) va o‘rnatilgan detallarning jonli ko‘rsatkichlari bilan almashadi.
  - **4-Sahna (8.2s – 10.0s — Split-Screen Taqqoslash & Final):** Oldin va Keyin holati diagonal/vertikal oltin lazer bilan yonma-yon solishtiriladi.
  - **Haqiqiy Ovozli Video Eksport (`Audio + Video MediaStream Muxing`):** Videoni yuklab olganda (`WebM / MP4`) Web Audio API musiqasi va bass effektlari `createMediaStreamDestination()` orqali videoning ichiga to‘liq yoziladi (ovozsiz emas, 100% musiqali tayyor video yuklanadi!).


