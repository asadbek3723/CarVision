# 17_SELLER_DASHBOARD_AND_GLOBAL_LOCALIZATION_SYSTEM.md — Normative Specification

## 1. Executive Summary & Problem Formulation
Ushbu hujjat quyidagi fundamental me'moriy talablarni qat'iy standartlashtiradi:
1. **Garaj va Seller Rol Ajratilishi**:
   - `/garage` (Atelye Ombori) faqat `b2b_seller` (tuning atelye ustalari va do'kon egalari) uchun mo'ljallangan ombor boshqaruv tizimidir.
   - Oddiy mijozlar (`b2c_user`) navigatsiyasida (Desktop Sidebar, Mobile Bottom Bar, Drawer) "Garage" tugmasi ko'rinmaydi.
   - Oddiy foydalanuvchining shaxsiy avtomobillari `/profile?tab=fleet` bo'limida saqlanadi. Agar oddiy foydalanuvchi to'g'ridan-to'g'ri `/garage` havolasiga kirsa, unga B2B seller ekrani emas, balki shaxsiy garajiga yo'naltiruvchi maxsus axborot kartochkasi ko'rsatiladi.
2. **Professional B2B Seller Dashboard (`/seller`)**:
   - Rule #6 talablariga to'liq mos keladigan, premium qorong'u interfeysli ("Carbon Dark"), yig'iladigan (collapsible) sidebarli, KPI analitika kartochkali, interaktiv grafikli (Recharts), buyurtmalar jadvali va ombor nazorat paneli.
   - Seller o'z atelyesi tushumlarini, mijozlarning 3% zakalat depozitlarini, bron qilingan sanalarini boshqaradi va yangi ehtiyot qismlarni AI studio orqali qo'shadi.
3. **Global Til va Davlat Qulflash Tizimi (Localization Lock)**:
   - Ro'yxatdan o'tishda (yoki Profil sozlamalarida) foydalanuvchi qaysi davlatni tanlasa (O'zbekiston, Rossiya, BAA, Turkiya, AQSH va h.k.), tizim unga mos asosiy tilni (`uz`, `ru`, `en`) va milliy valyutani biriktiradi.
   - Tizim ichidagi barcha sahifalar (`/seller`, `/garage`, `/customize`, `/shop`, `/profile`, `/cart`) avtorizatsiyadan o'tgan foydalanuvchining shaxsiy tilida qat'iy ochiladi.
   - Faqatгина Landing page (`/`) mustasno bo'lib, joriy tashrif havolasi bo'yicha mustaqil qoladi.
   - Mijoz xohlagan paytda Profil -> Sozlamalar bo'limiga kirib ilova tilini va davlatini o'zgartira oladi.
4. **Haqiqiy Valyuta Konvertatsiyasi (Real-Rate Multi-Currency Engine)**:
   - Barcha narxlar jonli API kurslari bo'yicha foydalanuvchi davlat valyutasiga (UZS, USD, RUB, AED, TRY, KZT, KGS) hisoblanadi.
   - Narxlar yaxlitlanadi, milliy valyuta belgisi (`so'm`, `$`, `₽`, `د.إ`, `₺`, `сом`, `₸`) va `tabular-nums font-mono` formatida ko'rsatiladi.

---

## 2. Role-Based Navigation Architecture (`VeloceShell.tsx`)

### Navigatsiya taqsimoti:
| Foydalanuvchi roli | Navigatsiya elementlari |
| :--- | :--- |
| **B2B Seller (`b2b_seller`)** | 1. **Dashboard** (`/seller`)<br>2. **Ombor / Garage** (`/garage`)<br>3. **Showroom** (`/customize`)<br>4. **Do'kon** (`/shop`)<br>5. **Profil** (`/profile`) |
| **B2C Foydalanuvchi (`b2c_user`)** | 1. **Bosh sahifa** (`/`)<br>2. **4K Studio** (`/customize`)<br>3. **Katalog / Do'kon** (`/shop`)<br>4. **Profil / Avtopark** (`/profile`) |
| **Mehmon (Anonim)** | 1. **Bosh sahifa** (`/`)<br>2. **4K Studio** (`/customize`)<br>3. **Do'kon** (`/shop`)<br>4. **Kirish** (`/login`) |

---

## 3. B2B Seller Dashboard Specification (`src/features/seller/components/SellerDashboardView.tsx`)

Rule #6 bo'yicha tuzilgan modullar:
1. **Collapsible Workspace Sidebar**:
   - Apex Customs Studio logotipi, status indikatori (`WORKSHOP ONLINE`).
   - Bo'limlar:
     - Analitika & Tushum (`Overview`)
     - Ombor & Ehtiyot qismlar (`Warehouse / Garage`)
     - Zakalat Buyurtmalari (`Orders & Escrow`)
     - 4K Showroom Studiyasi (`Studio Launcher`)
     - Atelye Sozlamalari (`Settings`)
   - Qulay pastki profil kartochkasi va kreditlar balansi (`Kreditlar: 40 ta / PRO_800`).
2. **Top Bar**:
   - Breadcrumbs, tezkor qidiruv (Cmd+K), jonli valyuta ko'rsatkichi, bildirishnomalar qo'ng'irog'i, til almashtirgich, profil menyusi.
3. **KPI Telemetriya Kartochkalari**:
   - **Oylik Zakalat Tushumi**: jami tushum (foydalanuvchi valyutasida, masalan `18,450,000 so'm`), +14% o'sish sparkline.
   - **Faol Buyurtmalar**: 6 ta yangi buyurtma (qabul qilingan va ustaxonaga yozilgan).
   - **Ombordagi Qismlar**: Real Supabase `products` hisobi (masalan, 36 ta ehtiyot qism).
   - **4K Showroom Sinovlari**: 142 ta AI fitment namoyishlari.
4. **Savdo va Fitment Dinamikasi Grafigi (Recharts)**:
   - Haftalik / Oylik zakalat tushumlari va qabul qilingan avtomobillar soni.
   - Elegant tilla gradient to'ldirish (`#D4AE62`), minimal grid chiziqlari.
5. **Jonli Buyurtmalar Jadvali (Orders Table)**:
   - Ustunlar: Buyurtma ID, Mijoz ismi, Telefon (+998...), Tanlangan qismlar, Jami narx, 3% Zakalat holati, Rejalashtirilgan sana, Amal (Voucherni tasdiqlash / Aloqa).
   - Filterlar: Hammasi, Kutishda, Tasdiqlangan, Yakunlangan.
6. **Omborga Tezkor Kirish va AI Part Onboarding**:
   - "Yangi detal qo'shish" tugmasi -> `AddPartModal` ochiladi (Kamera orqali rasmga olish, AI fonni tozalash va studiya nurini qo'shish, avtomobil muvofiqligini tanlash, narx va qoldiq kiritish, Supabase-ga saqlash).

---

## 4. Global Language & Country Locking Architecture

### Ro'yxatdan o'tish va Foydalanuvchi Profili
1. `UserProfile` interfeysiga yangi parametrlar qo'shiladi:
   ```typescript
   export interface UserProfile {
     id: string;
     email: string;
     phone: string;
     full_name: string;
     role: UserRole;
     credits_balance: number;
     country?: string; // 'uz' | 'ru' | 'ae' | 'tr' | 'us' | 'kz' | 'kg'
     preferred_language?: 'uz' | 'ru' | 'en';
     preferred_currency?: CurrencyCode;
     shop?: ShopDetails | null;
   }
   ```
2. **Davlat-Til-Valyuta Muvofiqlik Matritsasi**:
   - O'zbekiston (`+998`) -> Til: `uz`, Valyuta: `UZS` (`so'm`)
   - Rossiya (`+7`) -> Til: `ru`, Valyuta: `RUB` (`₽`)
   - Qozog'iston (`+7`) -> Til: `ru`, Valyuta: `KZT` (`₸`)
   - Qirg'iziston (`+996`) -> Til: `ru`, Valyuta: `KGS` (`сом`)
   - BAA (`+971`) -> Til: `en` (yoki `ar`), Valyuta: `AED` (`د.إ`)
   - Turkiya (`+90`) -> Til: `en` (yoki `tr`), Valyuta: `TRY` (`₺`)
   - AQSH / Boshqa (`+1`) -> Til: `en`, Valyuta: `USD` (`$`)
3. **Avtorizatsiyalangan Sahifalar Qoidasi**:
   - Agar foydalanuvchi tizimga kirgan bo'lsa, URL `/[locale]/seller`, `/[locale]/garage`, `/[locale]/customize` va hokazo sahifalar foydalanuvchining `preferred_language` qiymatiga mos bo'lishi tekshiriladi.
   - Agar foydalanuvchi Profil -> Sozlamalar orqali tilni o'zgartirsa:
     - `preferred_language` va `preferred_currency` yangilanadi.
     - `document.cookie = NEXT_LOCALE=...` o'rnatiladi.
     - Sahifa bir zumda yangi tanlangan til prefiksiga o'tadi (`router.push('/ru/profile')`).
   - Landing page (`/`, `/uz`, `/ru`, `/en`) foydalanuvchi kirgan URL bo'yicha mustaqil qoladi.

---

## 5. Zero-Error Standard & Sifat Talablari
- `npx tsc --noEmit` -> 0 xatolik.
- `npm run check-direction` -> 0 jismoniy klasslar (barcha yo'nalishlar RTL/LTR mos logical klasslar: `ps-`, `pe-`, `start-`, `end-`).
- `npm run lint` -> 0 xatolik va ogohlantirish.
- Vitest domain testlari -> 100% muvaffaqiyatli.
