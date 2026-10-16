# 03_SCREENS_AND_FLOWS.md

**Loyiha:** CarVision
**Hujjat:** Ekranlar reestri, marshrutlar, holatlar va foydalanuvchi yo'llari
**Versiya:** 1.0.0
**Auditoriya:** Frontend/Backend dasturchilar, Antigravity agenti, QA
**Bog'liq hujjatlar:** 01_PRD_BUSINESS_LOGIC, 02_DESIGN_SYSTEM, 04_ARCHITECTURE, 05_CODING_STANDARDS

> Qoida: bu hujjatda yozilmagan ekran yaratilmaydi. Yangi ekran kerak bo'lsa, avval shu fayl yangilanadi.

---

## 0. UMUMIY QOIDALAR

### 0.1. Ekran ID formati
`S-<blok>-<raqam>`. Bloklar: `ONB` (kirish), `STU` (studiya), `MKT` (marketplace), `SEL` (sotuvchi), `ADM` (admin), `SYS` (tizim), `PUB` (ochiq sahifalar).
Modal: `M-<raqam>`. Bottom sheet: `B-<raqam>`.

### 0.2. Har bir ekran uchun majburiy 5 holat
Har bir ekran quyidagi holatlarni **alohida** ko'rsatishi shart. Holati yozilmagan ekran tugallanmagan hisoblanadi.

| Holat | Qoida |
| :--- | :--- |
| `loading` | Skeleton (spinner emas). 150 ms dan tez bo'lsa ko'rsatilmaydi (miltillashni oldini olish). |
| `empty` | Illyustratsiya + 1 jumla + 1 asosiy tugma (nima qilish kerakligi). |
| `error` | Nima bo'ldi + nima qilish kerak + "Qayta urinish" tugmasi. Texnik xato matni ko'rsatilmaydi. |
| `offline` | Tepada yupqa banner. Keshdagi ma'lumot ko'rsatiladi. Yozish amallari navbatga qo'yiladi yoki bloklanadi (ekran ta'rifida aytilgan). |
| `success` | Normal holat. |

### 0.3. Navigatsiya qoidalari
1. **3-klik qoidasi:** asosiy maqsadga (rasmga olish, tanlash, natijani ko'rish) kirishdan 3 tadan ko'p bosishsiz yetib borilishi kerak.
2. Orqaga tugmasi har doim bor, istisno: `S-STU-03` (generatsiya jarayoni) va `S-ONB-01`.
3. Tilni tanlagandan keyin hech qaysi ekran boshqa tilda ko'rinmasligi kerak. Tarjima yo'q kalit uchun `en` fallback ishlaydi, lekin CI da `missing key` xatosi beriladi.
4. Faqat bitta asosiy harakat tugmasi (primary CTA) bo'ladi. Ikkinchisi ikkilamchi uslubda.
5. Server tomonidan rol tekshiruvi. UI da yashirish yetarli emas (04_ARCHITECTURE ga qarang).

### 0.4. Rolga qarab kirish nuqtalari

| Rol | Kirgandan keyin | Bosh ekran |
| :--- | :--- | :--- |
| `b2c_user` | `/home` | S-MKT-01 |
| `b2b_seller` | `/studio` | S-SEL-01 |
| `super_admin` | `/admin` (2FA dan keyin) | S-ADM-01 |

---

## 1. EKRANLAR REESTRI (QISQA JADVAL)

| ID | Nomi | Marshrut | Rol | Platforma |
| :--- | :--- | :--- | :--- | :--- |
| S-ONB-01 | Splash | `/` | hamma | hamma |
| S-ONB-02 | Til tanlash | `/language` | hamma | hamma |
| S-ONB-03 | Rol tanlash | `/role` | mehmon | hamma |
| S-ONB-04 | Ro'yxatdan o'tish (B2C) | `/register/driver` | mehmon | hamma |
| S-ONB-05 | Ro'yxatdan o'tish (B2B) | `/register/shop` | mehmon | hamma |
| S-ONB-06 | Kirish | `/login` | mehmon | hamma |
| S-ONB-07 | Parolni tiklash | `/login/reset` | mehmon | hamma |
| S-ONB-08 | PWA o'rnatish ko'rsatmasi | (modal) | hamma | mobil |
| S-STU-01 | Yangi mashina: rejim tanlash | `/studio/new` | seller, b2c | hamma |
| S-STU-02 | Smart Camera | `/studio/camera` | seller, b2c | mobil/planshet |
| S-STU-03 | Rasm tekshiruvi va mashina aniqlash | `/studio/review` | seller, b2c | hamma |
| S-STU-04 | Tyuning studiyasi | `/studio/:sessionId` | seller, b2c | hamma |
| S-STU-05 | Generatsiya jarayoni | (S-STU-04 ustida overlay) | seller, b2c | hamma |
| S-STU-06 | Natija: Oldin/Keyin | `/studio/:sessionId/result` | seller, b2c | hamma |
| S-STU-07 | Savat va narx tafsiloti | (bottom sheet) | seller, b2c | hamma |
| S-STU-08 | Video Edit | `/studio/:sessionId/reel` | seller, b2c | hamma |
| S-STU-09 | QR Tyuning Pasporti (yaratish) | `/studio/:sessionId/passport` | seller | hamma |
| S-STU-10 | Seanslar tarixi | `/studio/history` | seller, b2c | hamma |
| S-STU-11 | QR-ko'prik (kompyuter tomoni) | `/studio/bridge` | seller | desktop/TV |
| S-STU-12 | QR-ko'prik (telefon tomoni) | `/bridge/:token` | seller | mobil |
| S-MKT-01 | Marketplace bosh sahifa | `/home` | b2c | hamma |
| S-MKT-02 | Mening garajim | `/garage` | b2c | hamma |
| S-MKT-03 | Servis kartochkasi (niqoblangan) | `/shop/:maskedId` | b2c | hamma |
| S-MKT-04 | Bron va zakalat | `/book/:sessionId` | b2c | hamma |
| S-MKT-05 | Chek yuklash | (S-MKT-04 ichida) | b2c | hamma |
| S-MKT-06 | Bron tasdiqlandi | `/booking/:id` | b2c | hamma |
| S-MKT-07 | Mening bronlarim | `/bookings` | b2c | hamma |
| S-SEL-01 | Sotuvchi dashboard | `/seller` | seller | hamma |
| S-SEL-02 | Omborxona ro'yxati | `/seller/inventory` | seller | hamma |
| S-SEL-03 | Master Katalogdan import | `/seller/inventory/import` | seller | hamma |
| S-SEL-04 | Yangi mahsulot qo'shish | `/seller/inventory/new` | seller | mobil/planshet |
| S-SEL-05 | Mahsulotni tahrirlash | `/seller/inventory/:id` | seller | hamma |
| S-SEL-06 | Tarif va limit | `/seller/plan` | seller | hamma |
| S-SEL-07 | Referal | `/seller/referral` | seller | hamma |
| S-SEL-08 | Kelgan buyurtmalar | `/seller/orders` | seller | hamma |
| S-SEL-09 | Qurilmalar | `/seller/devices` | seller | hamma |
| S-SEL-10 | Servis profili | `/seller/profile` | seller | hamma |
| S-ADM-01 | Umumiy ko'rinish | `/admin` | admin | desktop-first |
| S-ADM-02 | Foydalanuvchilar/servislar | `/admin/accounts` | admin | desktop-first |
| S-ADM-03 | Akkaunt tafsiloti | `/admin/accounts/:id` | admin | desktop-first |
| S-ADM-04 | Qo'lda tarif/kredit berish | (modal M-30) | admin | desktop-first |
| S-ADM-05 | Jonli generatsiya lentasi | `/admin/live` | admin | desktop-first |
| S-ADM-06 | Cheklar navbati | `/admin/receipts` | admin | desktop-first |
| S-ADM-07 | B2B referal tekshiruvlari | `/admin/referrals` | admin | desktop-first |
| S-ADM-08 | Moliya | `/admin/finance` | admin | desktop-first |
| S-ADM-09 | Omborlar auditi | `/admin/inventory` | admin | desktop-first |
| S-ADM-10 | Master Katalog boshqaruvi | `/admin/catalog` | admin | desktop-first |
| S-ADM-11 | Xavfsizlik signallari | `/admin/security` | admin | desktop-first |
| S-ADM-12 | Tizim sozlamalari | `/admin/settings` | admin | desktop-first |
| S-ADM-13 | Audit jurnali | `/admin/audit` | admin | desktop-first |
| S-PUB-01 | Tyuning Pasporti (ochiq havola) | `/p/:publicToken` | hamma | hamma |
| S-SYS-01 | 403 Ruxsat yo'q | `/403` | hamma | hamma |
| S-SYS-02 | 404 | `/404` | hamma | hamma |
| S-SYS-03 | Texnik ishlar | `/maintenance` | hamma | hamma |
| S-SYS-04 | Sessiya chiqarib yuborildi | `/session-evicted` | hamma | hamma |
| S-SYS-05 | Akkaunt bloklangan | `/blocked` | hamma | hamma |

Jami: **57 ekran**. Modallar 3-bo'limda.

---

## 2. EKRANLAR TAFSILOTI

### 2.1. ONB: Kirish bloki

#### S-ONB-01 Splash
- Qora fon, logotip animatsiyasi (faralar sekin yonadi), maksimum 1.2 s.
- Mantiq: `cv_locale` bor bo'lsa va sessiya yaroqli bo'lsa, rol bo'yicha bosh ekranga. Yo'q bo'lsa, `S-ONB-02`.
- Splash 1.2 s dan ortiq tutib turilmaydi. Resurslar tayyor bo'lmasa ham o'tiladi (skeleton bilan).

#### S-ONB-02 Til tanlash
- To'liq ekran. Katta kartochkalar: `uz`, `en`, `ru`, `ar`, `kk`, `ky`, `tg`. Har birida bayroq (belgi) va til **o'z yozuvida** nomi.
- Tanlanganda: `<html lang dir>` yangilanadi, `cv_locale` saqlanadi, darhol keyingi ekranga o'tiladi (qo'shimcha "Davom" tugmasi yo'q).
- `ar` tanlansa, `dir="rtl"` darhol ishlaydi va oldindan ko'rinadi.
- Keyin har doim Sozlamalardan o'zgartirish mumkin.
- Holatlar: oflayn bo'lsa ham ishlaydi (tillar paketga kiritilgan).

#### S-ONB-03 Rol tanlash
- Ikki katta karta:
  - **Avto egasiman** → `S-ONB-04`
  - **Avtoservis / detailing markazi** → `S-ONB-05`
- Pastda: "Akkauntim bor" → `S-ONB-06`.
- Admin uchun alohida karta **yo'q**. Admin oddiy `/login` orqali kiradi.

#### S-ONB-04 Ro'yxatdan o'tish: B2C
Maydonlar: ism, telefon (yoki email), parol, referal kod (ixtiyoriy, `?ref=` dan avtomatik to'ldiriladi).

Validatsiya:
| Maydon | Qoida |
| :--- | :--- |
| Telefon | E.164, davlat kodi tanlanadi (+998 default `uz` da) |
| Parol | Kamida 8 belgi, ro'yxatdagi eng keng tarqalgan parollar rad etiladi |
| Referal | Mavjud va faol servis kodi. Noto'g'ri bo'lsa: ogohlantirish, lekin ro'yxatdan o'tishni **bloklamaydi** |

Muvaffaqiyat: 40 kredit bepul, watermark yoqilgan, `S-MKT-01` ga.

#### S-ONB-05 Ro'yxatdan o'tish: B2B (3 qadam)
1. **Egasi:** ism, telefon, parol.
2. **Servis:** nomi, shahar, to'liq manzil, xaritadan nuqta, ish vaqti, servis turi (tyuning / detailing / ikkalasi), referal kod (ixtiyoriy).
3. **Ombor boshlash:** Master Katalog taklifi (S-SEL-03 ning qisqa varianti): "Boshlang'ich TOP 50 ta detalni qo'shish". "Keyinroq" tugmasi bor.

Qoidalar:
- Qadamlar o'rtasida progress ko'rsatkichi. Orqaga qaytganda ma'lumot saqlanadi.
- Manzil B2C ga hech qachon ochiq ko'rsatilmasligi haqida bir jumla izoh beriladi.
- Referal kod kiritilgan bo'lsa, admin navbatiga `S-ADM-07` yozuvi tushadi.

#### S-ONB-06 Kirish
- Telefon/email + parol. "Parolni unutdim" → `S-ONB-07`.
- Admin bo'lsa, parol to'g'ri bo'lgandan keyin **TOTP kod** so'raladigan ikkinchi qadam chiqadi (inline, yangi sahifasiz). 5 marta xato kod: 15 daqiqa bloklash.
- 5 marta xato parol: 5 daqiqa kutish (CAPTCHA o'rniga progressiv kechikish).
- Qurilma limiti oshgan bo'lsa: `M-12` (qaysi qurilmani chiqarish).

#### S-ONB-07 Parolni tiklash
- Telefon/email → bir martalik kod → yangi parol. Kod 10 daqiqa amal qiladi.
- Javob har doim bir xil: "Agar akkaunt bo'lsa, kod yuborildi" (akkaunt mavjudligi oshkor qilinmaydi).

#### S-ONB-08 PWA o'rnatish ko'rsatmasi
- Faqat brauzerda (standalone emas) va foydalanuvchi kamida 1 ta natija ko'rgandan keyin. Birinchi kirishda ko'rsatilmaydi.
- Android/Chrome: `beforeinstallprompt` orqali "O'rnatish" tugmasi.
- iOS Safari: 3 qadamli ko'rsatma ("Ulashish" → "Bosh ekranga qo'shish").
- Yopilsa, 14 kun qayta chiqmaydi.

---

### 2.2. STU: Tyuning studiyasi (asosiy mahsulot)

#### S-STU-01 Yangi mashina: rejim tanlash
Ikki karta:
- **⚡ Tezkor (1-2 rasm):** "Disk, rang, old fara kabilarni 10 soniyada ko'ring."
- **🔄 To'liq 360° (8 rasm):** "To'liq tyuning va video uchun."

Pastda: "Galereyadan yuklash" (ikkilamchi). Kompyuterda bu ekranda uchinchi variant: "Telefondan kamera sifatida" → `S-STU-11`.

#### S-STU-02 Smart Camera
Ekran elementlari:
- Tepa: joriy rakurs nomi va progress (`3 / 8`).
- Markaz: 3D karkas (cyan chiziqlar), mashina unga tushganda yashil.
- Burchakda: kichik 3D model, joriy rakursni ajratib ko'rsatadi.
- Matnli ko'rsatma (bir vaqtda faqat bitta): "Yaqinroq keling", "Biroz o'ngga", "Kamerani pastroq tuting", "Telefonni tekis ushlang".
- Pastda: qo'lda suratga olish tugmasi (zaxira), "Rakursni o'tkazib yuborish" (faqat 360° rejimda, kamida 1 ta rakurs shart).
- Green Lock: moslik mezoni bajarilsa 400 ms ushlab turilgach avtomatik suratga oladi (08_SMART_CAMERA da aniq mezonlar).

Holatlar:
| Holat | Xulq |
| :--- | :--- |
| Kamera ruxsati rad etilgan | Tushuntiruvchi ekran + "Sozlamalarni ochish" + "Galereyadan yuklash" |
| Sensor (giroskop) yo'q/ruxsat yo'q | Karkas ishlaydi, matnli ko'rsatmalar o'chadi, qo'lda tugma asosiy bo'ladi |
| Yorug'lik juda past | "Yorug'roq joyga o'ting" ogohlantirishi, suratga olish bloklanmaydi |
| Suratga olishda oflayn | Rasm lokal saqlanadi, onlayn bo'lgach yuklanadi |

Landscape: karkas va ko'rsatmalar gorizontal ekranga moslanadi, boshqaruv tugmalari o'ng chetda.

#### S-STU-03 Rasm tekshiruvi va mashina aniqlash
- Olingan rasmlar gorizontal lentada (mini-rasmlar). Har birini qayta olish mumkin.
- Tepada: `Aniqlandi: Chevrolet Malibu 2 (2022)  [O'zgartirish ✎]`.
- Ishonchlilik past (< 0.6) bo'lsa, avtomatik tanlanmaydi: foydalanuvchi ro'yxatdan tanlaydi (`M-04`).
- Rasm sifati tekshiruvi (xiralik, mashina to'liq ko'rinmasligi): muammo bor rasm belgilanadi, "Qayta olish" taklif qilinadi, lekin davom etishni **bloklamaydi**.
- Mashina emas (masalan mushuk): "Bu avtomobilga o'xshamaydi, qayta suratga oling." Davom etilmaydi.
- Asosiy tugma: **"Studiyaga o'tish"**.

#### S-STU-04 Tyuning studiyasi
Layout 02_DESIGN_SYSTEM dagi 85/15 qoidasiga bo'ysunadi.

Elementlar:
| Element | Tavsif |
| :--- | :--- |
| Mashina kanvasi | Joriy rakurs. Zoom (pinch), pan. |
| Rakurs tanlagich | Olingan rakurslar mini-rasmlari. Olinmaganlari xira + 📷 belgisi. |
| Kategoriya tasmasi | Gorizontal skroll: Disklar, Shinalar, Old bamper, Orqa bamper, Faralar, Orqa faralar, Spoyler, Kuzov rangi/plyonka, Polirovka, Tonirovka |
| Detal tasmasi | Tanlangan kategoriya mahsulotlari: rasm, nom, narx. |
| Narx belgisi | O'ng tepada, raqam animatsiyasi bilan. Bosilsa `S-STU-07`. |
| Tun rejimi | Tugma (kredit sarflaydi, `M-08` tasdiqlash) |
| **Generatsiya** tugmasi | Primary CTA. Ichida kredit narxi: "Natijani ko'rish (1 kredit)" |

Mantiq:
1. **Moslik filtri:** faqat tanlangan mashinaga mos (`fitment`) va universal mahsulotlar ko'rinadi.
2. **Rakurs bloklash:** mos rakursda surat bo'lmagan kategoriya xira, ustida 📷. Bosilsa:
   - mos rakursda surat bor bo'lsa, kanvas o'sha rakursga silliq o'tadi;
   - yo'q bo'lsa, `M-05` ("Orqa qismini suratga oling") va "Kamerani ochish".
3. **Tanlov qoidasi:** bir kategoriyada bir vaqtda bitta mahsulot. Qayta bosilsa tanlov bekor bo'ladi.
4. **Narx:** tanlash bilan darhol yangilanadi, serverga so'rov **yuborilmaydi** (lokal hisob, tasdiqlash serverda).
5. **Auto-hide:** zoom yoki Oldin/Keyin chizig'i ushlanganda barcha boshqaruv 200 ms ichida yashiriladi.
6. **Generatsiya tugmasi** faqat kamida 1 ta o'zgarish tanlangan va kredit yetarli bo'lsa faol. Kredit yetmasa: `M-06`.
7. B2B rejimida katalog faqat shu servis ombori. B2C rejimida barcha servislar, mahsulot kartochkasida servis niqoblangan ko'rinishda (`Partner #409 · 3.8 km`).

Holatlar:
| Holat | Xulq |
| :--- | :--- |
| Katalog bo'sh (B2B) | "Omboringiz bo'sh" + "Master Katalogdan qo'shish" |
| Kategoriyada mahsulot yo'q | "Bu mashina uchun hozircha yo'q" |
| Oflayn | Katalog keshdan. Generatsiya tugmasi o'chiq, sababi aytiladi |

#### S-STU-05 Generatsiya jarayoni
- Mashina ustida neon skaner nuri chapdan o'ngga, o'zgarayotgan joyda yorqinlik. Matn: "Detal o'rnatilmoqda…". Aylanuvchi spinner **yo'q**.
- Foizni faqat server haqiqiy progress bersa ko'rsating, aks holda soxta foiz ko'rsatilmaydi.
- Orqaga qaytish tugmasi yo'q, lekin "Fonda davom ettirish" bor (foydalanuvchi boshqa kategoriyalarni ko'rishi mumkin, tayyor bo'lganda bildirishnoma).
- Maksimal kutish: 25 s. Undan keyin `M-07` ("Biroz kechikmoqda") va kredit avtomatik qaytarilishi haqida xabar.
- Xato bo'lsa: kredit qaytariladi, ekranda "Kredit qaytarildi" yozuvi, "Qayta urinish".

Muvaffaqiyat: avval 1080p ko'rinadi, orqa fonda 4K yuklanib almashadi (sakrashsiz).

#### S-STU-06 Natija: Oldin/Keyin
- Bitta rasm ustida bo'luvchi chiziq (slider), chap "OLDIN", o'ng "KEYIN".
- Pastda: rakurslar tasmasi (generatsiya qilinganlari belgilangan).
- Tugmalar: **"O'zgartirish"** (S-STU-04 ga, tanlov saqlanadi), "Savat" (S-STU-07), "Video" (S-STU-08), "Pasport" (S-STU-09, faqat seller), "Saqlash".
- B2C uchun asosiy CTA: **"Servisga yozilish"** → `S-MKT-04`.
- Watermark: kerak bo'lgan rolda rasmda doimiy ko'rinadi, yuklab olishda ham saqlanadi.
- Yuklab olish: 4K fayl. Watermarksiz variant faqat pullik tarifda.

#### S-STU-07 Savat va narx tafsiloti (bottom sheet B-01)
- Tanlangan har bir mahsulot: rasm, nom, detal narxi, ish haqi, ✕ (olib tashlash).
- Pastda: jami. Tarmoq/valyuta: tanlangan til/valyuta.
- B2C da qo'shimcha qator: "Zakalat (3%): $X" va "Servisda to'lanadi: $Y".
- Olib tashlangan mahsulotdan keyin, agar generatsiya qilingan natija eskirsa, "Natija yangilanishi kerak" belgisi chiqadi.

#### S-STU-08 Video Edit
- Faqat kamida 4 ta rakursda natija tayyor bo'lsa ochiladi, aks holda sabab bilan blok.
- Oldindan ko'rish kanvasda, "Yaratish" bosilganda qurilma ichida render (progress ko'rsatiladi).
- Eksport: MP4. "Ulashish" (Web Share API) va "Yuklab olish".
- Outro: CarVision logotipi + servis nomi (B2B rejimda). B2C rejimda servis nomi **ko'rsatilmaydi**.
- Past quvvatli qurilma aniqlansa, past o'lchamli (720p) rejim taklif qilinadi.
- Server xarajati yo'q. Batafsil: 09_VIDEO_ENGINE.

#### S-STU-09 QR Tyuning Pasporti (yaratish)
- "Pasportni yaratish" bosilganda server `public_token` yaratadi va QR ko'rsatadi.
- Qo'shimcha: havolani nusxalash, Telegram/WhatsApp orqali ulashish.
- Amal qilish muddati tanlanadi (default 30 kun).
- Pasportda mijozning telefon raqami yoki shaxsiy ma'lumoti **bo'lmaydi**.

#### S-STU-10 Seanslar tarixi
- Ro'yxat: miniatyura, mashina modeli, sana, jami narx, holati (qoralama / natija bor / bron qilingan).
- Qidiruv va filtr (sana, holat). Cheksiz skroll (sahifalab yuklash).
- Seanslarni o'chirish mumkin (yumshoq o'chirish).

#### S-STU-11 QR-ko'prik: kompyuter tomoni
- Katta QR + "Telefoningiz kamerasi bilan skanerlang".
- Ostida holat: `Kutilmoqda` → `Telefon ulandi` → `3 / 8 rasm qabul qilindi`.
- QR 5 daqiqa amal qiladi, "Yangilash" tugmasi bor. Bir martalik token.
- Rasmlar kelgan sari lentada jonli paydo bo'ladi.
- Ulanish uzilsa: "Telefon uzildi" va qayta ulanishni kutadi, olingan rasmlar saqlanadi.

#### S-STU-12 QR-ko'prik: telefon tomoni
- Token tekshiriladi, login so'ralmaydi (token seller sessiyasiga bog'langan).
- To'g'ridan-to'g'ri `S-STU-02` ochiladi. Har rasm olingach avtomatik kompyuterga yuboriladi.
- Tugagach "Kompyuterga qaytish" ekrani.
- Token eskirgan/ishlatilgan bo'lsa: aniq xabar va yangi QR so'rash yo'riqnomasi.

---

### 2.3. MKT: Marketplace (B2C)

#### S-MKT-01 Marketplace bosh sahifa
- Tepa: salom, qolgan kredit, til/profil.
- Asosiy blok: **"Mashinangizni suratga oling"** (katta CTA → `S-STU-01`).
- "Mening garajim" mini-ko'rinishi (agar mashina saqlangan bo'lsa).
- "Siz uchun yangi qismlar": garajdagi mashinaga mos yangi mahsulotlar.
- "Yaqin servislar": niqoblangan kartochkalar (`Partner #409 · Yunusobod · 3.8 km · ★4.9`).
- Joylashuv ruxsati so'raladi (kontekstda, kirishda emas). Rad etilsa, shahar qo'lda tanlanadi.

#### S-MKT-02 Mening garajim
- Saqlangan mashinalar (rasmlar + model). Qo'shish, o'chirish, nom berish.
- Chegara: B2C uchun 3 ta mashina. Oshsa, eskisini o'chirish talab qilinadi.
- Push-ruxsat ("Mos yangi qismlar kelsa xabar bering") shu yerda so'raladi.

#### S-MKT-03 Servis kartochkasi (niqoblangan)
Ko'rinadi: niqob nomi, tuman, masofa (taxminiy, 100 m aniqlikka yaxlitlangan), reyting, mahsulotlar soni, ish vaqti.
**Ko'rinmaydi** (API darajasida yuborilmaydi): haqiqiy nom, ko'cha, telefon, aniq koordinata.

#### S-MKT-04 Bron va zakalat
Ketma-ketlik:
1. Xulosa: tanlangan mahsulotlar, jami, zakalat = `max(minimal, round(jami × 3%))`, qoldiq.
2. Servis tanlash (agar tanlov bir necha servisdan bo'lsa, **servis bo'yicha alohida bron** yaratiladi va foydalanuvchiga tushuntiriladi).
3. Sana/vaqt tanlash (servis ish vaqti ichida).
4. To'lov yo'riqnomasi: karta raqami (nusxalash tugmasi), aniq summa, izoh kodi.
5. Chek yuklash → `S-MKT-05`.

Qoidalar:
- Karta rekvizitlari bazadan olinadi (kodda emas), admin o'zgartira oladi.
- Zakalat qaytarilishi qoidasi (bekor qilish) ko'rinadigan joyda yoziladi. Matn: biznes qarori bilan to'ldiriladi (OPEN).

#### S-MKT-05 Chek yuklash
- Rasm tanlash/suratga olish. Yuklashdan oldin qurilmada siqiladi.
- Yuklangandan keyin holat: `Tekshirilmoqda` (maks. 10 s).
- Natijalar:
  | Natija | Xulq |
  | :--- | :--- |
  | OCR muvaffaqiyatli, qoida bo'yicha | ADR-006 ga qarab: (A) manzil darhol ochiladi, (B) "Admin tasdig'ini kutilmoqda" holati |
  | Summa mos emas | "Summa mos kelmadi" + to'g'ri summa ko'rsatiladi + qayta yuklash |
  | Chek avval ishlatilgan | "Bu chek allaqachon ishlatilgan" |
  | OCR ishlamadi | "Tekshirishga yuborildi", admin qo'lda ko'radi |

> **OPEN (ADR-006):** OCR tasdig'idan keyin manzil avtomatik ochiladimi yoki admin tasdig'ini kutadimi. Hozirgi standart: admin tasdig'i. Interfeys ikkala rejimni qo'llab-quvvatlashi uchun `unlock_mode` sozlamasi (`auto_ocr` | `admin_confirm`) bazada turadi.

#### S-MKT-06 Bron tasdiqlandi
- Yashil tasdiq animatsiyasi.
- Ochiladi: servis haqiqiy nomi, manzil, xarita tugmasi (Google/Yandex), telefon (qo'ng'iroq tugmasi), 6 xonali bron kodi, sana-vaqt.
- "Kalendarga qo'shish" (.ics).
- Bu ma'lumotlar faqat tasdiqlangan bron egasiga ko'rinadi. Havola boshqaga yuborilsa ochilmaydi.

#### S-MKT-07 Mening bronlarim
- Holatlar: `Kutilmoqda`, `Tasdiqlangan`, `Rad etilgan`, `Bajarilgan`, `Bekor qilingan`.
- Bronni bekor qilish (qoidalarga muvofiq), servis bilan bog'lanish.

---

### 2.4. SEL: Sotuvchi paneli

#### S-SEL-01 Dashboard
- Tepada: joriy tarif, **qolgan kredit** (progress), tugash sanasi.
- Kredit ≤ 10%: sariq banner. Kredit ≤ 16: qizil modal (`M-10`). Ikkalasi ham "Admin bilan bog'lanish" ga olib boradi.
- Bugungi ko'rsatkichlar: seanslar soni, generatsiyalar, yangi buyurtmalar.
- Tezkor harakatlar: **"Yangi mashina"** (katta), "Mahsulot qo'shish", "Referal".
- Faol bronlar ro'yxati (so'nggi 5 ta).

#### S-SEL-02 Omborxona
- Jadval/kartochka rejimi (planshetda kartochka, desktopda jadval).
- Filtr: kategoriya, mashina modeli, faol/nofaol. Qidiruv.
- Tezkor tahrir: narx va faollikni ro'yxatning o'zida o'zgartirish.
- Ommaviy amallar: narxni foizga oshirish/kamaytirish, nofaol qilish.

#### S-SEL-03 Master Katalogdan import
- Avval mashina markalari tanlanadi (ko'p tanlov), keyin kategoriya bo'yicha mahsulotlar.
- Har mahsulotda checkbox va **narx maydoni** (majburiy, sentlarda saqlanadi, ko'rsatishda valyutada).
- "Hammasini tanlash" va "Hammasiga narx belgilash" yordamchilari.
- Tugma: "Omborga qo'shish (N ta)". Natija: nechta qo'shildi.
- Takroriy mahsulot: o'tkazib yuboriladi va xabar beriladi.

#### S-SEL-04 Yangi mahsulot qo'shish
Maydonlar: kategoriya, nom, tavsif (ixtiyoriy), narx, ish haqi, mos mashinalar (ko'p tanlov, "Universal" belgisi), rasmlar (3-4 ta, ko'rsatma bilan).
- Rasm olingach avtomatik fon tozalash (server jarayoni). Natija ko'rsatiladi, "Qayta olish" yoki "Qabul qilish".
- Fon tozalash muvaffaqiyatsiz bo'lsa: mahsulot "Rasm tayyorlanmoqda" holatida saqlanadi, tayyor bo'lgach faollashadi.
- Kategoriya uchun kerakli rakurs ko'rsatmasi rasmda ko'rsatiladi (masalan disk uchun yon tomondan, to'g'ri).
- 3D model ixtiyoriy kelajak uchun, hozir **yo'q** (MVP chegarasi).

#### S-SEL-05 Mahsulotni tahrirlash
S-SEL-04 maydonlari + faol/nofaol, o'chirish (yumshoq). Faol bronga bog'liq mahsulotni o'chirib bo'lmaydi, faqat nofaol qilinadi.

#### S-SEL-06 Tarif va limit
- Joriy tarif, kredit, muddat, kredit sarfi grafigi.
- Tariflar taqqoslash kartochkalari (Pro / Max / Ultra) tejamkorlik belgisi bilan. Hisob formulasi 01_PRD da.
- Tugma: **"Tarifni faollashtirish"** → `M-11`: admin kontakti (Telegram) va tayyor xabar matni ("Salom, men [servis nomi], [tarif] ni faollashtirmoqchiman"). Avtomatik to'lov **yo'q**.
- Tarif faollashganda real vaqtda ekran yangilanadi + tabrik animatsiyasi.

#### S-SEL-07 Referal
- Shaxsiy kod, havola, QR (chop etish uchun A4 plakat PDF).
- Statistika: taklif qilingan foydalanuvchilar, shundan faollar, qo'shilgan bonus kreditlar (cheklov: bir foydalanuvchidan maks. 40).
- B2B referal: taklif qilingan servislar va ularning holati (`Tekshiruv kutilmoqda`, `Tasdiqlangan`, `Rad etilgan`).

#### S-SEL-08 Kelgan buyurtmalar
- B2C bronlari: mijoz ismi (tasdiqlangandan keyin), mashina, tanlangan detallar, jami, sana-vaqt, bron kodi.
- Amallar: "Qabul qilindi", "Mijoz keldi" (bron kodi bilan tekshirish), "Bajarildi".
- Yangi buyurtmada push/ovozli signal (ustaxona shovqinida eshitiladigan).

#### S-SEL-09 Qurilmalar
- Faol qurilmalar ro'yxati, oxirgi faollik, "Chiqarish" tugmasi.
- Qurilma limiti ko'rsatkichi (`3 / 4`).

#### S-SEL-10 Servis profili
Nom, manzil, xarita, ish vaqti, telefon, logotip (video outro va pasport uchun), til. Manzil o'zgarishi admin tekshiruviga yuboriladi.

---

### 2.5. ADM: Super Admin

Admin ekranlari **desktop-first**, lekin planshet va telefonda ham to'liq ishlaydi (jadvallar kartochkaga aylanadi). Har bir amal audit jurnaliga yoziladi (`S-ADM-13`).

#### S-ADM-01 Umumiy ko'rinish
KPI kartochkalari: bugungi generatsiyalar, faol servislar, oylik tushum (qo'lda kiritilgan to'lovlar), Fal API xarajati, sof foyda, kutilayotgan cheklar, kutilayotgan referal tekshiruvlari, xavfsizlik signallari. Har kartochka tegishli ekranga olib boradi.

#### S-ADM-02 Akkauntlar
- Qidiruv: ism, telefon, servis nomi, referal kod.
- Filtr: rol, tarif, holat, muddati tugayotganlar.
- Ro'yxat ustunlari: nom, rol, tarif, kredit, oxirgi faollik, holat.
- Tezkor tugma: "Tarif berish" → `M-30`.

#### S-ADM-03 Akkaunt tafsiloti
Tablar: Umumiy, Kreditlar tarixi (ledger), Seanslar, Ombor, Qurilmalar, Referallar, Bronlar, Audit.
Amallar: tarif/kredit berish, bloklash/ochish, majburiy chiqarish (barcha sessiyalar), parolni tiklash havolasi.

#### M-30 Qo'lda tarif/kredit berish
Maydonlar: harakat turi (`Tarifni faollashtirish` | `Kredit qo'shish` | `Kredit ayirish` | `Muddat uzaytirish`), tarif yoki miqdor, **sabab** (majburiy matn), to'langan summa va usul (ichki yozuv uchun).
- Tasdiqlashdan oldin natija ko'rsatiladi ("Kredit: 12 → 812, Muddat: 16.11.2026").
- Tasdiqlangach foydalanuvchi ekranida real vaqtda yangilanadi.
- Barcha o'zgarish ledger va audit jurnaliga yoziladi. Orqaga qaytarish alohida teskari yozuv bilan.

#### S-ADM-05 Jonli generatsiya lentasi
Real vaqt: kim, qaysi mashina, qaysi detal, holat (navbatda/jarayonda/tayyor/xato), narxi, davomiyligi. "Oldin/Keyin" miniatyura. Xatolar qizil. Filtr: servis, holat.
Maxfiylik: B2C mijozlar rasmlari faqat shu ekranda va admin huquqi bilan ko'rinadi, har ko'rish jurnalga tushadi.

#### S-ADM-06 Cheklar navbati
- Kartochka: chek rasmi, OCR natijasi (summa, sana, ishonch), kutilgan summa, mijoz, servis, bron.
- Amallar: **Tasdiqlash**, **Rad etish (sabab)**, **Soxta: bloklash**.
- Kuzatuv: navbatda kutish vaqti. 8 soatdan oshgan chek belgilanadi.
- Klaviatura yorliqlari: `A` tasdiqlash, `R` rad etish (desktopda tez ishlash uchun).

#### S-ADM-07 B2B referal tekshiruvlari
Holatlar: `Kutilmoqda`, `Tekshiruvda`, `Tasdiqlangan`, `Rad etilgan`. Tekshiruv varaqasi: ikkala servis ma'lumoti, xarita, admin izohi, foto-dalil yuklash. Tasdiqlansa, mukofot qoidasi 01_PRD bo'yicha avtomatik beriladi.

#### S-ADM-08 Moliya
Davr tanlash. Jadval va grafik: kirim (qo'lda tasdiqlangan tariflar), AI xarajati (Fal.ai haqiqiy sarf), sof foyda, marja, tarif bo'yicha taqsimot. CSV eksport. Pul qiymatlari sentlarda saqlanadi, ko'rsatishda formatlanadi.

#### S-ADM-09 Omborlar auditi
Barcha servislar mahsulotlari, shubhali narx (kutilganidan juda past/baland) belgilanadi, nomaqbul rasm moderatsiyasi: yashirish/o'chirish.

#### S-ADM-10 Master Katalog
Mahsulot qo'shish/tahrirlash/arxivlash, ommaviy import (CSV + rasmlar), mashina modellari bilan moslik jadvali.

#### S-ADM-11 Xavfsizlik signallari
Qurilma limiti oshishi, ko'p marta xato login, shubhali referal, bir chek bir necha marta, IP anomaliyalari. Har signalga holat (`Yangi`/`Ko'rilmoqda`/`Yopilgan`) va amal tugmalari.

#### S-ADM-12 Tizim sozlamalari
Bazadan boshqariladigan qiymatlar (deploysiz): tarif parametrlari, kredit narxlari, valyuta kurslari, zakalat foizi va minimal summa, karta rekvizitlari, `unlock_mode`, qurilma limitlari, xizmat xabarlari. Har o'zgarish versiyalanadi.

#### S-ADM-13 Audit jurnali
Faqat o'qish. Kim, qachon, nima, avval/keyin qiymat, IP. Filtr va CSV eksport. O'chirib bo'lmaydi.

---

### 2.6. PUB va SYS ekranlari

#### S-PUB-01 Tyuning Pasporti (ochiq havola)
- Login talab qilinmaydi. `public_token` orqali.
- Mazmun: Oldin/Keyin slider, rakurslar, tanlangan detallar ro'yxati, jami narx, servis nomi (B2B seansda) va **"Band qilish"** tugmasi.
- Bosilganda mehmon bo'lsa, ro'yxatdan o'tish (B2C) → `S-MKT-04` ga qaytadi, tanlov saqlangan holda.
- Muddati tugagan: "Pasport muddati tugagan" + servis bilan bog'lanish.
- Qidiruv tizimlari indekslamasin: `noindex`.

#### S-SYS-01...05
| ID | Matn va harakat |
| :--- | :--- |
| 403 | "Bu sahifaga ruxsat yo'q." Tugma: bosh sahifaga. Admin yo'li haqida **maslahat berilmaydi**. |
| 404 | "Sahifa topilmadi." Tugma: bosh sahifaga. |
| Maintenance | Rejalashtirilgan ishlar xabari, taxminiy tugash vaqti. |
| Session evicted | "Akkauntingizga boshqa qurilmadan kirildi." Tugma: qayta kirish. |
| Blocked | "Akkaunt cheklangan." Support kontakti. Sabab matni foydalanuvchiga ko'rsatilmaydi. |

---

## 3. MODALLAR VA BOTTOM SHEETLAR

| ID | Nomi | Qachon chiqadi | Asosiy harakat |
| :--- | :--- | :--- | :--- |
| M-01 | Tilni o'zgartirish | Profil → Til | Til ro'yxati |
| M-02 | Chiqish tasdig'i | "Chiqish" bosilganda | Chiqish / Bekor |
| M-03 | Yuklanmagan o'zgarishlar | Studiyadan chiqishda | Saqlash / Tashlab ketish |
| M-04 | Mashinani qo'lda tanlash | Ishonchlilik past yoki "O'zgartirish" | Marka → model → yil |
| M-05 | Rakurs yetishmayapti | Mos rakursi yo'q kategoriya tanlanganda | "Kamerani ochish" |
| M-06 | Kredit yetarli emas | Generatsiya paytida balans kam | B2B: tarifga o'tish. B2C: "Admin bilan bog'lanish" |
| M-07 | Kechikish | Generatsiya 25 s dan oshganda | "Kutish" / "Bekor qilish (kredit qaytadi)" |
| M-08 | Tun rejimi tasdig'i | Tun rejimi yoqilganda | "+1 kredit" haqida ogohlantirish |
| M-09 | Video tayyor | Render tugaganda | Ulashish / Yuklab olish |
| M-10 | Kredit deyarli tugadi | ≤ 16 kredit | "Tarifni yangilash" |
| M-11 | Tarifni faollashtirish | S-SEL-06 dan | Admin kontakti + tayyor matn |
| M-12 | Qurilma limiti | Login paytida limit to'lgan | Qaysi qurilmani chiqarishni tanlash |
| M-13 | Mahsulotni o'chirish | S-SEL-05 | O'chirish / Bekor |
| M-14 | Bronni bekor qilish | S-MKT-07 | Sabab tanlash + tasdiq |
| M-15 | Joylashuv ruxsati | S-MKT-01 | Ruxsat berish / Qo'lda shahar |
| M-16 | Push ruxsati | S-MKT-02 | Ruxsat / Keyinroq |
| M-17 | Yangi versiya | Service Worker yangilanganda | "Yangilash" |
| M-30 | Qo'lda tarif/kredit | S-ADM-02/03 | Tasdiqlash |
| M-31 | Akkauntni bloklash | S-ADM-03 | Sabab (majburiy) + tasdiq |
| M-32 | Chekni rad etish | S-ADM-06 | Sabab tanlash |

Modal qoidalari: Esc va tashqariga bosish bilan yopiladi (xavfli amallardan tashqari). Fokus modal ichida ushlanadi. Mobilda bottom sheet ko'rinishida.

---

## 4. ASOSIY FOYDALANUVCHI YO'LLARI (FLOW DIAGRAMMALARI)

### 4.1. Seller: mijoz bilan tezkor tyuning
```
S-SEL-01 Dashboard
   └─ [Yangi mashina] → S-STU-01 (rejim)
        ├─ Tezkor → S-STU-02 (1-2 surat) ─┐
        └─ 360°   → S-STU-02 (8 surat) ───┤
                                          ▼
                                    S-STU-03 (mashina aniqlandi)
                                          ▼
                                    S-STU-04 (studiya, planshet mijozda)
                                          ├─ detal tanlaydi → narx yangilanadi
                                          ├─ rakurs yo'q → M-05 → S-STU-02
                                          ├─ kredit yo'q → M-06
                                          ▼
                                    [Natijani ko'rish] → S-STU-05
                                          ▼
                                    S-STU-06 (Oldin/Keyin)
                                          ├─ [O'zgartirish] → S-STU-04
                                          ├─ [Video] → S-STU-08
                                          └─ [Pasport] → S-STU-09 (QR)
```

### 4.2. B2C: uyda sinash va bron
```
Ro'yxatdan o'tish (S-ONB-04) → S-MKT-01
   └─ [Mashinani suratga oling] → S-STU-01 → S-STU-02 → S-STU-03 → S-STU-04
         ▼
   [Natijani ko'rish] → S-STU-05 → S-STU-06
         ▼
   [Servisga yozilish] → S-MKT-04 (zakalat hisob)
         ▼
   S-MKT-05 (chek yuklash)
         ├─ unlock_mode = auto_ocr   → OCR OK → S-MKT-06 (manzil ochiladi)
         └─ unlock_mode = admin_confirm → "Tasdiq kutilmoqda"
                                            └─ Admin S-ADM-06 tasdiqlaydi → push → S-MKT-06
```

### 4.3. Kompyuter + telefon kamera ko'prigi
```
Desktop: S-STU-01 → [Telefondan kamera] → S-STU-11 (QR)
Phone:   QR skan → S-STU-12 → S-STU-02 (kamera)
Phone:   rasm olinadi ──(WebSocket)──► Desktop S-STU-11 (lenta)
Phone:   [Tugadi] → "Kompyuterga qayting"
Desktop: S-STU-03 → S-STU-04 (katta ekranda davom)
```

### 4.4. Admin: qo'lda tarif berish
```
Seller S-SEL-06 → [Tarifni faollashtirish] → M-11 → Telegram (admin)
(To'lov tashqarida, kelishuv bo'yicha)
Admin: S-ADM-02 (qidirish) → S-ADM-03 → M-30 → Tasdiqlash
Seller ekrani real vaqtda yangilanadi (S-SEL-01 / S-SEL-06)
```

### 4.5. B2B referal
```
Shop B: S-ONB-05 (kod kiritadi) → S-ADM-07 (yangi yozuv)
Admin: ko'rib chiqadi → jismoniy/video tekshiruv → [Tasdiqlash]
Shop A: avtomatik bonus + S-SEL-07 da holat "Tasdiqlangan" + bildirishnoma
```

---

## 5. HOLAT MASHINALARI

### 5.1. Seans (`session.status`)
```
draft → capturing → reviewed → editing → generating → ready → [booked | archived]
                                   ▲          │
                                   └──────────┘  (O'zgartirish)
generating → failed (kredit qaytariladi) → editing
```
O'tish qoidalari:
- `draft → capturing`: birinchi rasm olinganda.
- `generating`: faqat bitta faol generatsiya bir seansda (takroriy bosish e'tiborsiz qoldiriladi, idempotency key bilan).
- `ready → booked`: bron yaratilganda.

### 5.2. Bron (`booking.status`)
```
created → receipt_uploaded → [ocr_passed | ocr_failed]
   ocr_passed  → (admin_confirm rejimida) pending_admin → confirmed
               → (auto_ocr rejimida)     confirmed (+ admin audit)
   ocr_failed  → pending_admin
   pending_admin → confirmed | rejected
confirmed → completed | cancelled | no_show
```
`confirmed` holatidagina manzil/telefon API orqali beriladi.

### 5.3. Generatsiya vazifasi (`generation.status`)
`queued → running → succeeded | failed | timed_out`
`failed` va `timed_out` holatlarida kredit **majburiy** qaytariladi (idempotent: ikki marta qaytarilmaydi).

---

## 6. VALIDATSIYA VA XATO XABARLARI (QISQA KATALOG)

| Kod | Foydalanuvchiga matn (kalit) | Harakat |
| :--- | :--- | :--- |
| `INSUFFICIENT_CREDITS` | `errors.credits.insufficient` | M-06 |
| `CAR_NOT_DETECTED` | `errors.vision.no_car` | Qayta suratga olish |
| `LOW_CONFIDENCE_MODEL` | `errors.vision.low_confidence` | M-04 |
| `ANGLE_MISSING` | `errors.studio.angle_missing` | M-05 |
| `GENERATION_TIMEOUT` | `errors.ai.timeout` | M-07, kredit qaytadi |
| `RECEIPT_AMOUNT_MISMATCH` | `errors.receipt.amount` | Qayta yuklash |
| `RECEIPT_DUPLICATE` | `errors.receipt.duplicate` | Boshqa chek |
| `DEVICE_LIMIT` | `errors.auth.device_limit` | M-12 |
| `SESSION_EVICTED` | `errors.auth.evicted` | S-SYS-04 |
| `FORBIDDEN` | `errors.auth.forbidden` | S-SYS-01 |
| `RATE_LIMITED` | `errors.common.rate_limited` | Kutish vaqti ko'rsatiladi |
| `OFFLINE` | `errors.common.offline` | Offline banner |

Qoidalar: xato matnlarida texnik tafsilot, stack trace, SQL, provayder nomi (Fal.ai) **ko'rsatilmaydi**. Matn 2 jumladan oshmaydi: nima bo'ldi + nima qilish kerak.

---

## 7. ANALITIKA HODISALARI (EVENT NAMES)

Shaxsiy ma'lumotsiz (PII yo'q), faqat ID va xususiyatlar.

| Hodisa | Xususiyatlar |
| :--- | :--- |
| `language_selected` | `locale` |
| `role_selected` | `role` |
| `register_completed` | `role`, `has_referral` |
| `capture_started` | `mode` (`quick`/`full360`) |
| `capture_completed` | `mode`, `angles_count`, `duration_s` |
| `car_detected` | `confidence_bucket`, `manual_override` |
| `part_selected` | `category`, `surface` (`b2b`/`b2c`) |
| `generation_started` / `_succeeded` / `_failed` | `angles`, `night_mode`, `latency_ms` |
| `before_after_used` | `session_id` |
| `reel_created` | `duration_s`, `device_class` |
| `passport_created` / `passport_opened` | `session_id` |
| `booking_started` / `receipt_uploaded` / `booking_confirmed` | `deposit_cents_bucket` |
| `upgrade_cta_clicked` | `from_plan`, `trigger` (`low_credit`/`manual`) |
| `install_prompt_shown` / `app_installed` | `platform` |

---

## 8. QABUL QILISH MEZONLARI (ACCEPTANCE CRITERIA)

1. Reestrdagi har bir ekran 5 ta holatni (0.2) ko'rsatadi, buni Storybook/Playwright skrinshot testlari tasdiqlaydi.
2. 7 tilda va 5 ta qurilma o'lchamida (320 px portrait, 667 px landscape, 768, 1280, 1920) hech bir matn qirqilmaydi yoki ustma-ust tushmaydi.
3. `ar` tilida barcha ekranlar RTL da to'g'ri, mashina kanvasi va Oldin/Keyin slayderi tabiiy yo'nalishini saqlaydi.
4. Rol tekshiruvi server tomonida: `b2c_user` `/seller/*` va `/admin/*` ga kirganda 403, va hech qanday admin kodi paketda yuklanmaydi.
5. B2C API javoblarida servisning haqiqiy nomi/manzili/telefoni `confirmed` bronga qadar **hech qachon** bo'lmaydi (kontrakt testi).
6. 3-klik qoidasi: seller dashboard dan generatsiya boshlashgacha ≤ 3 ta bosish (rasmga olish jarayoni hisobga olinmaydi).
7. Generatsiya xatosida kredit har doim qaytariladi va ikki marta qaytarilmaydi.
8. Oflayn holatda ekranlar qotmaydi, banner va keshdan ma'lumot ko'rsatiladi.
9. Klaviatura va ekran o'quvchi bilan barcha asosiy oqimlar (kirish, katalog, savat, bron) bajarilishi mumkin.

---

## 9. OCHIQ SAVOLLAR

| № | Savol | Hozirgi standart | Qaror kerak bo'lgan hujjat |
| :--- | :--- | :--- | :--- |
| Q1 | OCR tasdiqlasa manzil avtomatik ochilsinmi? (ADR-006) | `admin_confirm` | 04, 10 |
| Q2 | Zakalat bekor qilinsa qaytariladimi? | Qaror yo'q (matn bo'sh qoldirilgan) | 01 |
| Q3 | Bir nechta servisdan tanlov: bitta bronmi yoki servis bo'yicha alohidami? | Servis bo'yicha alohida | 01 |
| Q4 | B2C video outro'da servis nomi bo'ladimi? | Yo'q (niqob saqlanadi) | 09 |
| Q5 | Garajda mashina chegarasi | 3 ta | 01 |
