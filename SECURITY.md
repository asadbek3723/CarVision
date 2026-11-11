# CarVision — xavfsizlik

CarVision **Vercel** (sayt) va **Supabase** (baza, kirish, fayllar) ustida ishlaydi. O'zimizning
serverimiz (EC2/VPS) yo'q, shuning uchun klassik "6 qulf" platformadagi muqobillari bilan
yopiladi. Holatini **Admin → Xavfsizlik va audit → "Server · 6 qulf"** kartasida ko'rasiz.

| # | Qulf | CarVision'da nima qiladi | Kim yoqadi |
|---|---|---|---|
| 1 | Elastic IP (doimiy manzil) | Vercel production domeni. Statik IP faqat tashqi tizim allowlist so'rasa kerak bo'ladi (Vercel Static IPs, Pro) | avtomatik |
| 2 | SSL (HTTPS) | Vercel TLS, HSTS preload, `upgrade-insecure-requests` | avtomatik |
| 3 | Faqat 80 va 443 | Vercel boshqa port ochmaydi. Supabase'ning to'g'ridan-to'g'ri Postgres portlarini (5432/6543) yopish | **siz**, 2-qadam |
| 4 | SSH faqat kalit | Kiradigan server yo'q. Uning o'rnida: deploy qila oladigan yoki ma'lumot o'qiy oladigan har bir akkauntda 2FA | **siz**, 3-qadam |
| 5 | VPC (yopiq tarmoq) | Brauzer bazaga umuman kira olmaydi: `anon`/`authenticated` huquqlari olib tashlangan, service-role kaliti faqat serverda | migratsiya, 1-qadam |
| 6 | WAF | Vercel Firewall: bot himoyasi va rate-limit qoidalari. Ilova ichidagi limitlar ikkinchi qatlam | **siz**, 4-qadam |

## Qadamlar (bir martalik)

### 1. Migratsiyani qo'llash (kod deploy qilinishidan OLDIN)
Supabase → SQL Editor → `supabase/migrations/20261120000000_security_hardening.sql` faylini
**to'liq** joylab, Run bosing (hech narsani belgilamang). Bu fayl:
- bepul kreditlarni bitta tranzaksiyada beradi va kredit tarixini o'chirib bo'lmaydigan qiladi;
- tasdiqlanmagan ustaxonalarni katalogdan yashiradi (hozir sotayotganlari tasdiqlangan holda qoladi);
- brauzerning bazaga to'g'ridan-to'g'ri kirishini butunlay yopadi.

Tekshirish: Supabase → Advisors → Security. "Public can execute SECURITY DEFINER function" va
"RLS disabled" ogohlantirishlari qolmasligi kerak.

### 2. Supabase: tarmoq va SSL
- Project Settings → Database → **Network Restrictions**: faqat o'zingizning IP manzilingiz
  (yoki hech kim). Sayt bazaga HTTPS API orqali ulanadi, bu sozlama unga ta'sir qilmaydi.
- Project Settings → Database → **Enforce SSL on incoming connections**: yoqing.
- Authentication → Providers/Policies → **Leaked password protection**: yoqing.
- Keyin Vercel env'ga `SEC_DB_NETWORK_RESTRICTED=1` qo'shing.

### 3. Akkauntlar: 2FA ("SSH faqat kalit" o'rniga)
- Vercel, Supabase, GitHub va Cloudflare akkauntlarida 2FA (authenticator ilova) yoqing.
- Vercel → Settings → Git: deploy faqat `main` branch'dan bo'ladi; begona fork PR'lari
  avtomatik deploy qilinmasin (Git Fork Protection yoqilgan bo'lsin).
- **`ADMIN_MASTER_PIN`ni almashtiring.** Eski `3723` qiymati git tarixida qolgan. Yangisi kamida
  8 xonali tasodifiy son bo'lsin.
- Service-role kaliti biror joyga (chat, skrinshot, repo) tushgan bo'lsa: Supabase → API Keys →
  roll qiling va Vercel env'ni yangilang.
- Keyin `SEC_2FA_CONFIRMED=1` qo'shing.

### 4. Vercel Firewall (WAF)
Vercel → Project → **Firewall**:
- **Bot Protection** (Bot Management): yoqing.
- Pro tarifda **OWASP managed ruleset**: yoqing.
- **Rate limit** qoidalari (Custom Rule → Rate Limit, kalit: IP):
  - `/api/v1/auth/` bilan boshlanadi: 20 so'rov / 60 s → Deny
  - `/api/v1/generations`: 20 so'rov / 60 s → Deny
  - `/api/v1/camera-session`: 30 so'rov / 60 s → Deny
  - `/api/v1/products`, `/api/v1/catalog`: 120 so'rov / 60 s → Challenge
- Hujum paytida: Firewall → **Attack Challenge Mode** (vaqtincha).
- Keyin `SEC_WAF_CONFIRMED=1` qo'shing.

### 5. Ro'yxatdan o'tishda CAPTCHA (bepul)
Cloudflare → Turnstile → Add widget (domen: production domeningiz). Vercel env'ga
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` va `TURNSTILE_SECRET_KEY` qo'shing, keyin qayta deploy qiling.

## Kreditlar qanday himoyalangan
- **Yechish**: `reserve_credits` balans qatorini qulflaydi (`FOR UPDATE`). Bitta render faqat bir
  marta yechiladi, balans manfiy bo'lolmaydi (`CHECK >= 0`), bitta akkauntda bir vaqtda 3 tadan
  ortiq render ketmaydi. Kredit pullik AI chaqiruvidan **oldin** yechiladi va xatoda aynan shu
  miqdor bir marta qaytariladi.
- **Berish**: faqat server funksiyalari orqali (`grant_trial_credits`, `claim_monthly_credits`,
  admin funksiyalari). Ularni faqat `service_role` chaqira oladi, brauzer esa bazaga umuman kira
  olmaydi.
- **Bepul kredit farming**: SMS bo'lmasa ham bitta tarmoqdan sutkasiga 3 ta (Turnstile yoqilsa
  10 ta), bitta qurilmadan 30 kunda 2 ta bepul paket beriladi. Undan ortig'i 0 kredit bilan
  ochiladi va telefon tasdiqlangach beriladi.
- **Tarix**: `credit_ledger`ni hech kim (server ham) o'zgartira yoki o'chira olmaydi. Akkaunt
  o'chirilsa ham tarix saqlanib qoladi.
- **To'lov**: admin tasdiqlashda olingan so'm summasi buyurtma summasidan kam bo'lsa, tasdiqlash
  rad etiladi.

## Muammo topsangiz
Xavfsizlik muammosini ochiq issue sifatida yozmang. To'g'ridan-to'g'ri loyiha egasiga xabar bering.
