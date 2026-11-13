# VAZIFA: CarVision katalogini to'liq qayta to'ldirish (Supabase + AI rasm generatsiyasi)

Sen CarVision loyihasida ishlayapsan (Next.js 15 + Supabase). `GEMINI.md` va `plans/00_AGENT_RULES.md` qoidalariga amal qil. Vazifa: Supabase'dagi barcha katalog mahsulotlarini o'chirish va o'rniga Chevrolet mashinalari uchun professional, haqiqiy hayotda mavjud tuning detallaridan iborat yangi katalog yaratish. Har bir mahsulot uchun AI orqali fotorealistik rasm generatsiya qilib, Supabase Storage'ga yuklaysan.

Ishni bosqichma-bosqich bajar, har bosqich oxirida natijani tekshir va qisqa hisobot ber. Hech narsani taxmin qilma — sxemani o'zing o'qib tasdiqla.

---

## 0. Kontekst (avval o'qib chiq)

- Sxema: `supabase/migrations/20261104000000_catalog.sql`, `20261110000000_catalog_translations.sql`, `20261113000000_catalog_ceramic_polish.sql`
- Mashinalar jadvali: `supabase/migrations/20261104000001_vehicle_database.sql` (`vehicle_makes`, `vehicle_models`, slug orqali)
- Mavjud seed namunasi: `scripts/demo-catalog/seed.py`, `data.py` — do'konlar (`shops`), yuklash, tarjima va fitment logikasini shu yerdan qayta ishlat.
- Kalitlar: `.env.local` dagi `NEXT_PUBLIC_SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY`. Kalitlarni hech qachon kodga, logga yoki commitga yozma.

Jadvallar:
- `catalog_items` — `shop_id, category, name (≤150), brand, description, price_cents (USD sent), input_currency='USD', input_price, stock, install_available, install_price_cents, attributes (jsonb), status='PUBLISHED', cover_image_url, published_at, source_lang, translations, translations_hash`
- `catalog_item_images` — `item_id, url, kind ('ORIGINAL'|'STUDIO'|'ANGLE'), position`
- `catalog_item_fitment` — `item_id, model_id, year_from, year_to`
- Ruxsat etilgan `category`: `wheels, body_kit, lighting, spoiler, suspension, interior, exhaust, wrap_paint, ceramic, polish, other`
- Storage bucket: `catalog` (public, maks 8 MB, jpeg/png/webp). Yo'l: `{shop_id}/{fayl}`. `banners/` papkasiga TEGMA.

---

## 1. Hamma mahsulotlarni o'chirish

1. Avval hisobla va menga ko'rsat: nechta `catalog_items`, `catalog_item_images`, `catalog_item_fitment` qatori va `catalog` bucket'da nechta fayl bor.
2. `catalog_items` dagi barcha qatorlarni o'chir (images va fitment `ON DELETE CASCADE` bilan o'chadi).
3. `catalog` bucket'dagi mahsulot rasmlarini o'chir — `banners/` prefiksidan tashqari hammasi.
4. Do'konlar (`shops`), foydalanuvchilar, bronlar (`bookings`), bannerlar, to'lovlar — TEGILMAYDI.
5. Agar `bookings` yoki boshqa jadval `catalog_items` ga FK orqali bog'langan bo'lsa va o'chirish bloklansa — to'xta va menga xabar ber, o'zing hech narsani majburan o'chirma.
6. Tekshir: `catalog_items` = 0.

---

## 2. Mashinalar (fitment)

`vehicle_models` dan slug orqali `model_id` ni ol:

| Mashina | slug | Yillar |
|---|---|---|
| Gentra | `chevrolet-gentra` | 2013–2025 |
| Cobalt | `chevrolet-cobalt` | 2012–2025 |
| Nexia 1 | `chevrolet-nexia-1` | 1995–2008 |
| Nexia 2 | `chevrolet-nexia-2` | 2008–2016 |
| Nexia 3 | `chevrolet-nexia-3` | 2016–2025 |
| Spark | `chevrolet-spark` | 2010–2025 |
| Matiz | `chevrolet-matiz` | 2001–2025 |
| Malibu | `chevrolet-malibu` (+ `chevrolet-malibu-2` alohida avlod bo'lsa, unga mos alohida mahsulotlar) | 2012–2025 |
| Onix | `chevrolet-onix` | 2020–2025 |
| Lacetti | `chevrolet-lacetti` | 2004–2013 |
| Captiva | `chevrolet-captiva` | 2006–2018 |

Slug topilmasa — to'xta va xabar ber, `custom_model` ga o'tib ketma.

---

## 3. Har bir mashina uchun detallar (har biri ≥ 10 ta mahsulot)

Har bir mashina × har bir detal turi = **kamida 10 ta alohida mahsulot**. Har bir mahsulot faqat O'SHA mashinaga fitment qilinadi (bitta mahsulot bir nechta mashinaga ulanmaydi).

| Detal | `category` | `attributes.part` |
|---|---|---|
| Oldi bamper | `body_kit` | `front_bumper` |
| Orqa bamper (diffuzor bilan variantlar) | `body_kit` | `rear_bumper` |
| Orqa bagaj eshigi ustidagi spoyler (lip / ducktail / GT wing) | `spoiler` | `trunk_spoiler` |
| Oldi faralar | `lighting` | `headlight` |
| Orqa faralar (stoplar) | `lighting` | `taillight` |
| Disk + shina komplekti | `wheels` | `wheel_tire_set` |
| Tanirovka (oyna plyonkasi) | `other` | `window_tint` |
| Bodykit (to'liq komplekt: oldi lip, yon porog, orqa diffuzor) | `body_kit` | `full_body_kit` |
| Oldi kapot (karbon, ventilyatsiyali, aluminiy) | `body_kit` | `hood` |

Jami: 11 mashina × 9 detal × 10 = **990 ta mahsulot** (minimum).

### Haqiqiylik talablari
- Faqat real bozorda mavjud tuning uslublari va brendlari: masalan disklar — BBS, Vossen, OZ Racing, Enkei, Work, Rays (Volk), HRE, Konig; shinalar — Michelin Pilot Sport, Continental, Pirelli P Zero, Bridgestone Potenza, Hankook Ventus, Toyo Proxes; faralar — DEPO, TYC, Eagle Eye, Sonar, OEM-style LED/projektor tuning; tanirovka — 3M, LLumar, Suntek, XPEL Prime; bodykit/kapot/spoyler — Seibon, Carbon Creations, Duraflex, Maxton Design, Anderson Composites, mahalliy "OEM-style" fiberglass.
- Agar brendning aynan shu mashina uchun rasmiy mahsuloti yo'q bo'lsa, brendni "universal" deb ko'rsatma — o'rniga `brand` ga ishlab chiqarish uslubini yoz (masalan "Maxton-style", "OEM+ Replica") va bu haqida descriptionda yolg'on gapirma.
- O'lchamlar real bo'lsin: shu mashinaning bolt patterni (masalan Gentra/Cobalt/Nexia 3/Lacetti — 4x100, Malibu — 5x115, Captiva — 5x115, Matiz/Spark — 4x114.3 / 4x100 — tekshir), disk diametri/kengligi/ET, shina o'lchami (masalan 205/55 R16, 225/45 R17).
- Tanirovka — VLT foizlari (5%, 15%, 20%, 35%, 50%, 70%), material (karbon, keramik, metallizatsiyalangan), qaysi oynalar.
- Materiallar: ABS plastik, fiberglass, karbon fiber (twill/forged), poliuretan, aluminiy.
- Narxlar O'zbekiston bozoriga real (USD, `price_cents` sentda), `install_price_cents` mos, `stock` 1–15.
- 10 ta mahsulot bir-birining nusxasi bo'lmasin: uslub, material, rang, narx segmenti (byudjet / o'rta / premium) farq qilsin.

### `attributes` (jsonb) misol
```json
{ "part": "front_bumper", "material": "ABS", "finish": "gloss black", "style": "Sport", "warranty_months": 12, "oem_number": null }
```
Disk (ilova aynan shu kalitlarni o'qiydi — `diameter` butun son, `pcd` matn): `{ "part": "wheel_tire_set", "diameter": 17, "width": 7.5, "pcd": "4x100", "offset": 38, "tire": "Michelin Pilot Sport 4 215/45 R17", "set_of": 4 }`
Bamper (oldi/orqa) — Bumper tabida chiqishi uchun `"slot": "bumper"` majburiy: `{ "part": "front_bumper", "slot": "bumper", ... }`
Tanirovka: `{ "part": "window_tint", "vlt_percent": 20, "film_type": "ceramic", "coverage": "rear + side", "uv_reject_percent": 99 }`

---

## 4. Universal xizmatlar (barcha mashinalar uchun)

Bular hech qaysi mashinaga bog'lanmaydi (fitment yo'q) va `attributes` ichida **`"universal": true`** bo'lishi SHART — ilova universal mahsulotni faqat shu belgi orqali taniydi.

### 4.1 Rang (`category = 'wrap_paint'`) — kamida 20 ta
Faqat real avtomobil zavod ranglari, kodi bilan. Masalan:
- Porsche Guards Red, Porsche Chalk, Porsche Gentian Blue Metallic, Porsche Python Green
- BMW Alpine White III, BMW Brooklyn Grey, BMW Isle of Man Green, BMW Tanzanite Blue
- Audi Nardo Grey, Audi Daytona Grey Pearl, Audi Mythos Black
- Mercedes Obsidian Black, Mercedes Selenite Grey Magno (matte)
- Nissan Bayside Blue, Nissan Midnight Purple III
- Lamborghini Verde Mantis, Ferrari Rosso Corsa, Toyota Super White, Ford Grabber Blue, Chevrolet Rapid Blue, Lexus Ultra White
`attributes`: `{ "color_name": "...", "oem_code": "...", "finish": "gloss|metallic|pearl|matte|satin", "hex": "#...", "method": "full_repaint|wrap" }`

### 4.2 Palirovka (`category = 'polish'`) — kamida 5 ta
Real bosqichlar: 1-bosqich (one-step enhancement), 2-bosqich (cut + polish), 3-bosqich multi-stage paint correction, fara palirovkasi + UV himoya, wet sanding + correction. Brendlar: Koch-Chemie, Menzerna, Meguiar's, Rupes, 3D.

### 4.3 Keramika (`category = 'ceramic'`) — kamida 5 ta
Real mahsulotlar: Gtechniq Crystal Serum Ultra, Ceramic Pro 9H, Gyeon Q² Mohs+, IGL Kenzo, CarPro CQuartz UK 3.0, Koch-Chemie 1K-Nano. Kafolat muddati (1–9 yil), qatlamlar soni, qattiqlik.

---

## 5. Matnlar: title va description

- `source_lang = 'uz'`, `name` va `description` o'zbekcha (lotin).
- `translations` — `ru` va `en` (agar ilova boshqa tillarni ham `translations` da kutayotgan bo'lsa — `messages/` dagi barcha tillar: ar, en, kk, ky, ru, tg, tr), `manual: false`. `translations_hash` ni `seed.py` dagi bilan bir xil usulda hisobla.
- **Title**: qisqa, aniq, ≤ 70 belgi. Format: `{Brend/uslub} {detal} — {mashina}`. Misol: `Maxton-style sport oldi bamper — Cobalt`.
- **Description**: 2–3 qisqa gap (≤ 280 belgi): material, xususiyat, mos yillar, o'rnatish. Reklama so'zlari ("eng zo'r!!!") yo'q, emoji yo'q.
- Har bir mahsulot matni o'ziga xos bo'lsin — shablonni so'zma-so'z takrorlama.

---

## 6. Rasm generatsiyasi (har bir mahsulot uchun 1 ta)

Har bir mahsulot uchun alohida rasm generatsiya qil (990 + 30+ ta). Bitta rasmni bir nechta mahsulotga qayta ishlatma.

### Texnik talablar
- Format: **4:3**, kamida **1600×1200 px**, JPEG (sifat 88–92) yoki WebP, **< 8 MB**.
- Fayl yo'li: `catalog/{shop_id}/{mashina-slug}-{part}-{nn}.jpg` (universal xizmatlar uchun `universal-{category}-{nn}.jpg`).
- Yuklash: `x-upsert: true`, `Content-Type: image/jpeg`, `Cache-Control: max-age=31536000`.
- Public URL `cover_image_url` ga va `catalog_item_images` ga (`kind = 'STUDIO'`, `position = 0`) yoziladi.

### Vizual talablar
- Rasmda **aynan o'sha mashina modeli** (to'g'ri avlod, to'g'ri kuzov shakli, to'g'ri fara/radiator formasi) va unga **o'rnatilgan aynan o'sha detal**.
- Kamera detalga yaqin fokusda — detal to'liq kadrda, kesilmagan, kadrning 50–70% ini egallaydi; mashinaning qolgan qismi fonda, yengil xira (shallow depth of field).
- Fotorealistik professional avtomobil fotosurati: tabiiy yorug'lik yoki studiya yorug'ligi, real aks-sadolar, to'g'ri soya, real lak teksturasi. CGI/plastik/multfilm ko'rinishi, ortiqcha HDR, buzilgan geometriya — yo'q.
- Rasmda matn, logotip watermarki, davlat raqami (number plate) yozuvi, odamlar bo'lmasin.
- Mahsulot tavsifi bilan rasm mos bo'lsin (material, rang, uslub — masalan karbon kapot rasmda haqiqatan karbon teksturali).
- Rang (`wrap_paint`) — shu rangga bo'yalgan zamonaviy sedan, 3/4 burchakda, lak/metallik effekt aniq ko'rinsin. Palirovka — oyna kabi aks ettiruvchi lak yaqindan (oldin/keyin ajratilgan kompozitsiya ham bo'ladi). Keramika — kapotda suv tomchilari (beading) yaqindan.

### Prompt shabloni (inglizcha, har mahsulotga moslab to'ldir)
```
Professional automotive product photograph, 4:3 aspect ratio, ultra-realistic, shot on a full-frame DSLR with an 85mm lens at f/2.8.
A {year range} Chevrolet {MODEL} ({body type}, {color}) with an aftermarket {PART DESCRIPTION: brand/style, material, finish} installed.
Close-up {camera angle: front three-quarter low angle / rear three-quarter / side profile / top-down} focused on the {PART}, the part fully visible and sharp, filling most of the frame; the rest of the car softly out of focus.
{Setting: clean modern detailing studio with softbox lighting / outdoor golden hour on an empty asphalt lot / overcast city street in Tashkent}.
Accurate factory body lines and proportions of the Chevrolet {MODEL}, realistic paint reflections, natural shadows, true-to-life materials.
No text, no watermark, no logos overlay, no license plate characters, no people. Photorealistic, high detail, natural color grading.
```
Har bir mahsulot uchun burchak, fon va mashina rangini aylantirib tur — 10 ta rasm bir xil ko'rinmasin.

### Sifat nazorati
- Har bir rasmni generatsiyadan keyin tekshir: mashina modeli to'g'rimi, detal to'liq ko'rinadimi, artefakt (eriyotgan g'ildirak, qiyshiq fara, ortiqcha eshik) yo'qmi. Yomon bo'lsa — qayta generatsiya qil (maks. 3 urinish).
- Generatsiya xato bersa yoki limitga yetsa — to'xta, qaysi mahsulotlar rasmsiz qolganini ro'yxat qilib xabar ber. Rasmsiz mahsulotni `PUBLISHED` qilma (`DRAFT` qoldir).

---

## 7. Yozish tartibi

1. Avval mahsulot ma'lumotlarini (JSON fayl, `scripts/catalog-reseed/` ichida) to'liq tayyorla va menga statistikasini ko'rsat: mashina × detal bo'yicha sonlar, umumiy son.
2. Bitta mashina (Cobalt) uchun 9 detal × 2 ta mahsulotni rasm bilan to'liq tayyorlab, Supabase'ga yoz va menga ko'rsat — men tasdiqlagach qolganini davom ettir.
3. Qolganini partiyalab (masalan 50 tadan) generatsiya + yuklash + insert. Har partiyadan keyin progress.
4. Skript idempotent bo'lsin: qayta ishga tushirilsa dublikat yaratmasin (rasm yo'li va mahsulot kaliti bo'yicha).
5. Mahsulotlarni mavjud demo do'konlar (`shops`) orasida mantiqan taqsimla (masalan disk/shina — "Dubai Custom Wheels", bodykit — "Apex Customs Studio" va h.k.).

---

## 8. Yakuniy tekshiruv va hisobot

- SQL bilan tekshir: har bir mashina × har bir detal ≥ 10; `wrap_paint` ≥ 20; `polish` ≥ 5; `ceramic` ≥ 5.
- `cover_image_url` NULL bo'lgan `PUBLISHED` mahsulot yo'q.
- Har bir rasm URL'i 200 qaytaradi va 4:3 nisbatda.
- Ilovani ishga tushirib katalog sahifasini ochib ko'r: kartochkalar, rasmlar, filtr (mashina bo'yicha) to'g'ri ishlaydi.
- Yakuniy hisobot: jami mahsulot, jami rasm, o'chirilganlar soni, muammoli/qayta generatsiya qilinganlar ro'yxati.

Commit qilishdan oldin mendan so'ra. `.env.local` va generatsiya qilingan rasmlarni repoga commit qilma.
