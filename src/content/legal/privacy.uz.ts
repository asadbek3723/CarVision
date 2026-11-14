import type { LegalContext } from './context';
import type { LegalDoc } from './types';

export function privacyUz(c: LegalContext): LegalDoc {
  const contact = c.email
    ? `elektron pochta **${c.email}** yoki Platformadagi «Yordam» bo‘limi`
    : 'Platformadagi «Profil → Yordam» bo‘limi';
  return {
    eyebrow: 'HUQUQIY HUJJAT · SHAXSGA DOIR MA’LUMOTLAR',
    title: 'Maxfiylik siyosati',
    lead: `Ushbu Siyosat ${c.brand} platformasi (${c.site}) qaysi shaxsga doir ma’lumotlarni, qanday maqsadda va qanday huquqiy asosda yig‘ishi, qayerda va qancha muddat saqlashi, kimlarga uzatishi va ularni qanday himoya qilishini, shuningdek, sizning ma’lumotlaringizga oid huquqlaringizni batafsil tushuntiradi.`,
    sections: [
      {
        id: 'general',
        title: 'Umumiy qoidalar',
        blocks: [
          `Ushbu Maxfiylik siyosati (keyingi o‘rinlarda — **Siyosat**) O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonuni va boshqa qonunchilik hujjatlariga muvofiq ishlab chiqilgan.`,
          `Shaxsga doir ma’lumotlarning **operatori va egasi** — **${c.operator}** (keyingi o‘rinlarda — **Operator**), ${c.brand} platformasining egasi.`,
          'Siyosat Platformaning barcha Foydalanuvchilariga — saytga tashrif buyuruvchilar, Mijozlar, Ustaxonalar va ularning xodimlariga tatbiq etiladi.',
          'Platformada ro‘yxatdan o‘tish, ma’lumot kiritish, surat yuklash yoki buyurtma berish orqali siz ushbu Siyosatda bayon etilgan tartibda shaxsga doir ma’lumotlaringizga ishlov berilishiga **ongli, aniq va erkin rozilik** bildirasiz.',
          'Siyosat Foydalanish shartlarining ajralmas qismi hisoblanadi. Siyosatda ishlatilgan, lekin ta’rif berilmagan atamalar Foydalanish shartlaridagi ma’noda tushuniladi.',
          { note: '**Asosiy tamoyil:** biz faqat xizmatni ko‘rsatish uchun zarur bo‘lgan ma’lumotlarni yig‘amiz, ularni **sotmaymiz**, uchinchi shaxslarga reklama maqsadida bermaymiz va sizning suratlaringizdan sun’iy intellekt modellarini o‘qitish uchun foydalanmaymiz.' },
        ],
      },
      {
        id: 'definitions',
        title: 'Asosiy tushunchalar',
        blocks: [
          {
            list: [
              '**Shaxsga doir ma’lumotlar** — muayyan jismoniy shaxsga taalluqli bo‘lgan yoki uni identifikatsiya qilish imkonini beradigan har qanday axborot.',
              '**Sub’ekt** — shaxsga doir ma’lumotlari ishlov berilayotgan jismoniy shaxs (siz).',
              '**Ishlov berish** — ma’lumotlarni yig‘ish, tizimlashtirish, saqlash, o‘zgartirish, to‘ldirish, ulardan foydalanish, ularni berish, tarqatish, uzatish, egasizlantirish (anonimlashtirish) va yo‘q qilish bo‘yicha harakatlar.',
              '**Uchinchi shaxs** — Operator nomidan yoki Operator topshirig‘i bilan ma’lumotlarga ishlov beruvchi texnik hamkor (masalan, hosting yoki SMS xizmati).',
              '**Transchegaraviy uzatish** — ma’lumotlarni O‘zbekiston Respublikasi hududidan tashqariga uzatish.',
              '**Anonimlashtirish** — ma’lumotlarni muayyan shaxsga tegishliligini aniqlab bo‘lmaydigan holatga keltirish.',
            ],
          },
        ],
      },
      {
        id: 'data',
        title: 'Biz yig‘adigan ma’lumotlar',
        blocks: [
          'Biz quyidagi toifadagi ma’lumotlarni yig‘amiz. Ularning ko‘pchiligini siz o‘zingiz taqdim etasiz, bir qismi esa Platformadan foydalanganingizda avtomatik yaratiladi.',
          {
            table: {
              head: ['Toifa', 'Ma’lumotlar', 'Manba'],
              rows: [
                ['Hisob ma’lumotlari', 'Telefon raqami, ism, parol (faqat kriptografik xesh ko‘rinishida), Hisob roli (mijoz, ustaxona), til va valyuta sozlamalari, ro‘yxatdan o‘tgan sana', 'Siz'],
                ['Profil', 'Profil surati (avatar), qo‘shimcha aloqa ma’lumotlari (masalan, elektron pochta yoki Telegram), agar kiritsangiz', 'Siz'],
                ['Tasdiqlash', 'SMS-kod (faqat xesh ko‘rinishida), uni yuborish vaqti va urinishlar soni', 'Avtomatik'],
                ['Ustaxona ma’lumotlari', 'Ustaxona nomi, shahar, tuman, aniq manzil, telefon, to‘lov rekvizitlari, tarif, kreditlar balansi, tasdiqlanganlik holati', 'Ustaxona'],
                ['Avtomobil va suratlar', 'Siz yuklagan avtomobil suratlari, avtomatik aniqlangan marka va model, tanlangan mahsulotlar, yaratilgan vizualizatsiyalar va videolar', 'Siz / Avtomatik'],
                ['Buyurtmalar', 'Buyurtma raqami, mahsulotlar, summa, valyuta kursi, ism, telefon, izoh, to‘lov kvitansiyasi surati va uning xesh-qiymati, bank tranzaksiyasi raqami, buyurtma holati, olib ketish kodi, bekor qilish va qaytarish ma’lumotlari', 'Siz / Avtomatik'],
                ['Murojaatlar', '«Yordam» bo‘limi orqali yuborgan xabarlaringiz va ilovalar, vizualizatsiya bo‘yicha shikoyatlar', 'Siz'],
                ['Texnik ma’lumotlar', 'IP-manzil, brauzer va qurilma turi (User-Agent), kirish vaqti, faol seanslar, kirish urinishlari, xatolar jurnali', 'Avtomatik'],
                ['Bildirishnomalar', 'Push-obuna manzili va kalitlari (faqat ruxsat bersangiz)', 'Brauzer'],
                ['Kamera seansi', 'QR-kod orqali boshqa qurilmada suratga olish seansining identifikatori va yuklangan suratlar', 'Avtomatik'],
              ],
            },
          },
          'Biz **pasport ma’lumotlari, bank kartasining to‘liq raqami, CVV-kodi, biometrik ma’lumotlar** va maxsus toifadagi ma’lumotlarni (sog‘liq, din, siyosiy qarashlar va h.k.) so‘ramaymiz va yig‘maymiz. To‘lov kvitansiyasini yuklashdan oldin undagi ortiqcha ma’lumotlarni (masalan, balans) yashirishingiz mumkin, agar summa, sana va qabul qiluvchi ko‘rinib tursa.',
          'Avtomobil suratlarida davlat raqam belgisi yoki begona shaxslar ko‘rinishi mumkin. Biz ularni maqsadli ravishda tahlil qilmaymiz; imkon qadar suratni shunday oling-ki, unda begona odamlar bo‘lmasin.',
        ],
      },
      {
        id: 'purposes',
        title: 'Ma’lumotlardan foydalanish maqsadlari va huquqiy asoslar',
        blocks: [
          'Biz ma’lumotlarga faqat aniq, oldindan belgilangan va qonuniy maqsadlarda ishlov beramiz:',
          {
            table: {
              head: ['Maqsad', 'Ma’lumotlar', 'Huquqiy asos'],
              rows: [
                ['Ro‘yxatdan o‘tkazish, kirish va Hisobni himoya qilish', 'Hisob, tasdiqlash, texnik', 'Shartnomani bajarish; rozilik'],
                ['AI vizualizatsiyasini yaratish', 'Suratlar, avtomobil, tanlangan mahsulotlar', 'Shartnomani bajarish; rozilik'],
                ['Buyurtmani rasmiylashtirish, to‘lovni tekshirish, Ustaxonaga yetkazish, pulni qaytarish', 'Buyurtmalar, Hisob', 'Shartnomani bajarish'],
                ['Ustaxonaga to‘lovni o‘tkazish', 'Ustaxona rekvizitlari', 'Shartnomani bajarish'],
                ['Firibgarlik (soxta kvitansiya, ko‘p Hisob, bot) va suiiste’molning oldini olish', 'Texnik, buyurtmalar, kvitansiya xeshi', 'Operatorning qonuniy manfaati; qonun talabi'],
                ['Buyurtma holati va xavfsizlik haqida xabar berish', 'Telefon, push-obuna', 'Shartnomani bajarish; rozilik'],
                ['Murojaatlarga javob berish', 'Murojaatlar, Hisob', 'Shartnomani bajarish'],
                ['Buxgalteriya, soliq hisobi va davlat organlari so‘rovlari', 'Buyurtmalar, to‘lovlar', 'Qonun talabi'],
                ['Platformani yaxshilash va xatolarni tuzatish', 'Texnik (imkon qadar umumlashtirilgan)', 'Operatorning qonuniy manfaati'],
              ],
            },
          },
          'Biz ma’lumotlaringizdan **reklama SMS yoki xatlar yuborish uchun** alohida roziligingizsiz foydalanmaymiz. Buyurtma, xavfsizlik va xizmat bilan bog‘liq xabarlar reklama hisoblanmaydi.',
          'Maqsad o‘zgarganda biz qayta roziligingizni so‘raymiz, agar qonun boshqacha ruxsat bermasa.',
        ],
      },
      {
        id: 'ai-processing',
        title: 'Sun’iy intellekt yordamida ishlov berish',
        blocks: [
          'Vizualizatsiya yaratish, avtomobil marka va modelini aniqlash, surat sifatini tekshirish (suratda avtomobil borligi, barcha burchaklar bir xil mashinaga tegishliligi), mahsulot matnini yaxshilash va tarjima qilish uchun suratlar va matnlar sun’iy intellekt xizmatlariga yuboriladi.',
          'Hozirgi vaqtda quyidagi provayderlardan biri yoki bir nechtasi ishlatilishi mumkin (mavjudlik va sifatga qarab tizim avtomatik tanlaydi): **Google (Gemini)**, **OpenRouter** (u orqali boshqa modellar), **Fal.ai**, **Cloudflare Workers AI**, **OpenAI**.',
          'Provayderlarga faqat vazifani bajarish uchun zarur bo‘lgan ma’lumot yuboriladi: avtomobil surati va mahsulot surati yoki tavsifi. Ismingiz, telefoningiz va boshqa identifikatsiya ma’lumotlari **yuborilmaydi**.',
          'Biz siz yuklagan suratlardan o‘z modellarimizni o‘qitish uchun foydalanmaymiz va provayderlarning API xizmatlaridan ularning shartlariga ko‘ra mijoz ma’lumotlari bilan modelni o‘qitish o‘chirilgan rejimda foydalanishga intilamiz. Provayderlar ma’lumotlarni o‘z siyosatlariga muvofiq qisqa muddat saqlashi mumkin (masalan, suiiste’molni nazorat qilish uchun).',
          'Sun’iy intellekt tomonidan qabul qilingan qarorlar (masalan, «suratda avtomobil topilmadi») sizga nisbatan huquqiy oqibat keltirib chiqarmaydi: ular faqat kredit sarflanishidan oldin xizmat sifatini ta’minlaydi. Natijaga rozi bo‘lmasangiz, «Yordam» orqali odam tomonidan ko‘rib chiqishni so‘rashingiz mumkin.',
        ],
      },
      {
        id: 'sharing',
        title: 'Ma’lumotlarni kimlarga beramiz',
        blocks: [
          'Biz shaxsga doir ma’lumotlaringizni **sotmaymiz va ijaraga bermaymiz**. Ma’lumotlar faqat quyidagi hollarda va faqat zarur hajmda beriladi:',
          {
            list: [
              '**Ustaxonaga** — to‘lovingiz tasdiqlangandan keyin, buyurtmani bajarish uchun: ismingiz, telefon raqamingiz, izohingiz, buyurtma tarkibi. To‘lov tasdiqlanmaguncha Ustaxona sizning aloqa ma’lumotlaringizni ko‘rmaydi.',
              '**Mijozga** — Ustaxonaning nomi, manzili va telefoni, buyurtma uchun to‘lov tasdiqlangandan keyin.',
              '**Texnik hamkorlarga** (Operator topshirig‘i bilan ishlov beruvchilar) — xizmatni ko‘rsatish uchun, quyidagi jadvalda ko‘rsatilganidek.',
              '**Davlat organlariga** — faqat qonunda belgilangan asos va tartibda (sud, huquqni muhofaza qiluvchi organlar, soliq organlari so‘rovi).',
              '**Huquqiy vorisga** — Operator qayta tashkil etilganda yoki Platforma boshqa shaxsga o‘tganda, ushbu Siyosatga rioya qilish sharti bilan va sizni xabardor qilgan holda.',
            ],
          },
          {
            table: {
              head: ['Hamkor', 'Vazifasi', 'Qanday ma’lumot'],
              rows: [
                ['Supabase', 'Ma’lumotlar bazasi, autentifikatsiya, fayllar ombori', 'Platformadagi barcha ma’lumotlar'],
                ['Vercel', 'Sayt hostingi va server funksiyalari', 'Texnik ma’lumotlar, so‘rovlar'],
                ['Google, OpenRouter, Fal.ai, Cloudflare, OpenAI', 'Sun’iy intellekt xizmatlari', 'Suratlar va mahsulot matnlari (identifikatsiya ma’lumotlarisiz)'],
                ['Cloudflare Turnstile', 'Botlardan himoya', 'Texnik ma’lumotlar (IP, brauzer)'],
                ['Eskiz.uz', 'SMS yuborish', 'Telefon raqami va SMS matni'],
                ['Telegram', 'Operator administratorlariga to‘lovni tekshirish uchun xabar', 'Buyurtma raqami, summa, mijoz ismi va telefoni, kvitansiya surati'],
                ['Brauzer push-xizmatlari (Google, Apple, Mozilla)', 'Push-bildirishnomalarni yetkazish', 'Push-obuna manzili, bildirishnoma matni'],
              ],
            },
          },
          'Har bir hamkor ma’lumotlarga faqat Operator topshirig‘i doirasida, ushbu Siyosatda belgilangan maqsadlarda ishlov berishi va ularning maxfiyligini ta’minlashi shart.',
        ],
      },
      {
        id: 'storage',
        title: 'Ma’lumotlar qayerda saqlanadi va transchegaraviy uzatish',
        blocks: [
          'Platformaning texnik hamkorlari (hosting, ma’lumotlar bazasi, sun’iy intellekt provayderlari) serverlari O‘zbekiston Respublikasidan tashqarida, jumladan, Yevropa Ittifoqi va Amerika Qo‘shma Shtatlarida joylashgan bo‘lishi mumkin.',
          'Ushbu Siyosatni qabul qilish orqali siz yuqoridagi maqsadlarda shaxsga doir ma’lumotlaringizning **transchegaraviy uzatilishiga rozilik** bildirasiz. Uzatish faqat xizmatni ko‘rsatish uchun zarur hajmda, shifrlangan aloqa kanallari orqali amalga oshiriladi.',
          'Operator O‘zbekiston Respublikasi fuqarolarining shaxsga doir ma’lumotlarini saqlash va ularga ishlov berishga oid qonunchilik talablariga, shu jumladan ma’lumotlarni lokalizatsiya qilish talablariga rioya qilish choralarini ko‘radi.',
        ],
      },
      {
        id: 'retention',
        title: 'Saqlash muddatlari',
        blocks: [
          'Ma’lumotlar ishlov berish maqsadiga erishilguncha, lekin qonunda belgilangan muddatdan kam bo‘lmagan muddat saqlanadi:',
          {
            table: {
              head: ['Ma’lumotlar', 'Muddat'],
              rows: [
                ['Hisob va profil', 'Hisob mavjud bo‘lgan davrda; o‘chirish so‘rovidan keyin 30 kun ichida o‘chiriladi'],
                ['SMS tasdiqlash kodlari', `${c.otpMinutes} daqiqa amal qiladi, keyin yaroqsiz bo‘ladi va davriy ravishda o‘chiriladi`],
                ['Avtomobil suratlari va vizualizatsiyalar', 'Siz o‘chirguningizcha yoki Hisob o‘chirilguncha'],
                ['Buyurtmalar, to‘lovlar, kvitansiyalar', 'Buxgalteriya va soliq qonunchiligida belgilangan muddat (qoida tariqasida, kamida 5 yil); Hisob o‘chirilganda anonimlashtiriladi'],
                ['Xavfsizlik jurnallari (kirish urinishlari, administrator harakatlari)', '12 oygacha, tergov yoki nizo bo‘lsa — u hal bo‘lguncha'],
                ['Murojaatlar', 'Murojaat yopilgandan keyin 3 yilgacha'],
                ['Push-obuna', 'Siz bildirishnomalarni o‘chirguningizcha yoki obuna yaroqsiz bo‘lguncha'],
              ],
            },
          },
          'Muddat tugagach, ma’lumotlar o‘chiriladi yoki anonimlashtiriladi. Zaxira nusxalaridagi ma’lumotlar zaxira aylanish davri (odatda 30 kungacha) tugashi bilan o‘chiriladi.',
        ],
      },
      {
        id: 'security',
        title: 'Ma’lumotlarni himoya qilish choralari',
        blocks: [
          'Operator ma’lumotlarni ruxsatsiz kirish, o‘zgartirish, oshkor qilish yoki yo‘q qilishdan himoya qilish uchun huquqiy, tashkiliy va texnik choralarni ko‘radi, jumladan:',
          {
            list: [
              'barcha ulanishlar **HTTPS (TLS)** orqali shifrlanadi, HSTS siyosati qo‘llaniladi;',
              'parollar va SMS-kodlar ochiq ko‘rinishda saqlanmaydi — faqat bir tomonlama kriptografik **xesh** ko‘rinishida;',
              'ma’lumotlar bazasida qator darajasidagi xavfsizlik (Row Level Security) qoidalari: har bir foydalanuvchi faqat o‘z ma’lumotlarini ko‘radi;',
              'to‘lov kvitansiyalari **yopiq fayl omborida** saqlanadi va faqat qisqa muddatli imzolangan havola orqali administratorga ko‘rsatiladi;',
              'komissiya va to‘lov hisob-kitoblari faqat serverda bajariladi va brauzerga uzatilmaydi;',
              'administrator paneli ikki bosqichli himoyaga (hisob + maxsus PIN) ega, ruxsat etilgan IP-manzillar bilan cheklanishi mumkin, barcha harakatlar audit jurnaliga yoziladi;',
              'kirish urinishlari, SMS yuborish va boshqa so‘rovlar chastotasi cheklangan; botlardan himoya qo‘llaniladi;',
              'xodimlar va hamkorlar ma’lumotlarga faqat vazifasini bajarish uchun zarur hajmda kira oladi.',
            ],
          },
          'Internet orqali uzatish va elektron saqlashning hech bir usuli 100% xavfsiz emas. Biz ma’lumotlarni himoya qilishga intilamiz, ammo mutlaq xavfsizlikni kafolatlay olmaymiz. Hisobingiz xavfsizligi parolingizni sir saqlashingizga ham bog‘liq.',
        ],
      },
      {
        id: 'breach',
        title: 'Ma’lumotlar sizib chiqqan taqdirda',
        blocks: [
          'Shaxsga doir ma’lumotlarning xavfsizligi buzilganligi aniqlansa, Operator darhol buzilishni bartaraf etish va oqibatlarini kamaytirish choralarini ko‘radi.',
          'Agar buzilish sizning huquq va manfaatlaringiz uchun jiddiy xavf tug‘dirsa, Operator sizni va qonunda nazarda tutilgan hollarda vakolatli davlat organini qonunda belgilangan muddatlarda xabardor qiladi, nima sodir bo‘lganini va o‘zingizni himoya qilish uchun nima qilish kerakligini tushuntiradi.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookie fayllar va brauzer xotirasi',
        blocks: [
          'Platforma ishlashi uchun zarur bo‘lgan cookie fayllar va brauzerning lokal xotirasidan foydalaniladi. Biz **reklama cookie fayllarini va uchinchi tomon reklama trekerlarini ishlatmaymiz**.',
          {
            table: {
              head: ['Nomi / turi', 'Maqsadi', 'Muddati'],
              rows: [
                ['sb-…-auth-token (cookie)', 'Hisobga kirgan holatni saqlash (seans)', 'Seans yangilanib turadi; chiqishda o‘chiriladi'],
                ['NEXT_LOCALE (cookie)', 'Tanlangan tilni eslab qolish', '1 yilgacha'],
                ['cv_admin_session (cookie)', 'Faqat administratorlar uchun: admin paneli seansi', 'Qisqa muddat'],
                ['carvision_preferred_currency (lokal xotira)', 'Tanlangan valyuta', 'O‘chirmaguningizcha'],
                ['veloce_cart, veloce_cart_unselected (lokal xotira)', 'Savatcha tarkibi', 'O‘chirmaguningizcha'],
                ['carvision_saved_build (lokal xotira)', 'Vizualizatorda saqlangan tanlov', 'O‘chirmaguningizcha'],
                ['IndexedDB, Service Worker keshi', 'Internet uzilganda suratlarni navbatda saqlash, ilovani tez ochish (PWA)', 'O‘chirmaguningizcha'],
              ],
            },
          },
          'Siz brauzer sozlamalarida cookie fayllarni va sayt ma’lumotlarini o‘chirishingiz yoki bloklashingiz mumkin. Bunda Hisobga kirish va savatcha kabi funksiyalar ishlamasligi mumkin.',
          'Botlardan himoya (Cloudflare Turnstile) ishlaganda Cloudflare o‘z texnik cookie fayllarini o‘rnatishi mumkin.',
        ],
      },
      {
        id: 'rights',
        title: 'Sizning huquqlaringiz',
        blocks: [
          'Shaxsga doir ma’lumotlar sub’ekti sifatida siz quyidagi huquqlarga egasiz:',
          {
            list: [
              '**Ma’lumot olish** — Operator qaysi ma’lumotlaringizga, qanday maqsadda va qanday huquqiy asosda ishlov berayotgani, ularni kimlarga uzatgani va qancha muddat saqlashi haqida bilish;',
              '**Tanishish** — o‘zingizga oid ma’lumotlar nusxasini olish;',
              '**Tuzatish** — noto‘g‘ri yoki eskirgan ma’lumotlarni o‘zgartirish (ko‘pchiligini Profil sozlamalarida o‘zingiz qilishingiz mumkin);',
              '**O‘chirish** — ma’lumotlaringiz va Hisobingizni o‘chirishni talab qilish (qonunan saqlanishi shart bo‘lgan ma’lumotlar bundan mustasno, ular anonimlashtiriladi);',
              '**Rozilikni qaytarib olish** — istalgan vaqtda; bu qaytarib olishdan oldin amalga oshirilgan ishlov berishning qonuniyligiga ta’sir qilmaydi, ammo Platformaning ayrim funksiyalari ishlamay qolishi mumkin;',
              '**Cheklash va e’tiroz** — ma’lumotlardan muayyan maqsadda foydalanishga qarshilik bildirish;',
              '**Shikoyat qilish** — huquqlaringiz buzilgan deb hisoblasangiz, shaxsga doir ma’lumotlar sohasidagi vakolatli davlat organiga yoki sudga murojaat qilish.',
            ],
          },
          `So‘rov yuborish uchun: ${contact}. Xavfsizlik maqsadida biz so‘rov Hisob egasi tomonidan yuborilganini tasdiqlashni so‘raymiz (masalan, Hisobga bog‘langan raqamga SMS-kod orqali).`,
          'Biz so‘rovga qonunda belgilangan muddatda, lekin **30 kalendar kundan** kechiktirmay javob beramiz. So‘rovni bajarish bepul; asossiz yoki haddan tashqari takroriy so‘rovlar rad etilishi mumkin.',
        ],
      },
      {
        id: 'notifications',
        title: 'Bildirishnomalar va xabarlar',
        blocks: [
          'Push-bildirishnomalar faqat brauzer yoki qurilmangizda aniq ruxsat berganingizdan keyin yuboriladi. Ruxsatni istalgan vaqtda Profil sozlamalarida yoki brauzer sozlamalarida o‘chirishingiz mumkin.',
          'SMS faqat tasdiqlash kodlari va xizmat bilan bog‘liq muhim xabarlar uchun yuboriladi.',
          'Reklama xabarlari faqat alohida roziligingiz bilan yuboriladi va har bir xabarda obunadan chiqish imkoniyati bo‘ladi.',
        ],
      },
      {
        id: 'children',
        title: 'Bolalar ma’lumotlari',
        blocks: [
          'Platforma 16 yoshga to‘lmagan shaxslar uchun mo‘ljallanmagan. Biz 16 yoshga to‘lmagan bolalarning ma’lumotlarini bila turib yig‘maymiz.',
          'Agar siz ota-ona yoki qonuniy vakil bo‘lsangiz va farzandingiz bizga ma’lumot berganini bilsangiz, biz bilan bog‘laning — biz ushbu ma’lumotlarni o‘chiramiz.',
        ],
      },
      {
        id: 'sellers-data',
        title: 'Ustaxonalar uchun qo‘shimcha qoidalar',
        blocks: [
          'Ustaxona buyurtma orqali olgan Mijoz ma’lumotlarining (ism, telefon, izoh) **mustaqil operatori** hisoblanadi va ular uchun O‘zbekiston Respublikasi qonunchiligiga muvofiq javob beradi.',
          'Ustaxona Mijoz ma’lumotlaridan faqat ushbu buyurtmani bajarish (bog‘lanish, topshirish, kafolat xizmati) uchun foydalanishi mumkin. Ularni reklama ro‘yxatlariga qo‘shish, sotish yoki uchinchi shaxslarga berish taqiqlanadi.',
          'Ustaxona xodimlari Platformaga kirishda alohida Hisoblardan yoki ruxsat etilgan qurilmalardan foydalanishi va parolni xodimlar o‘rtasida ochiq tarqatmasligi lozim.',
        ],
      },
      {
        id: 'changes',
        title: 'Siyosatga o‘zgartirishlar',
        blocks: [
          'Operator Siyosatni yangilashi mumkin. Joriy versiya raqami va kuchga kirgan sanasi sahifaning yuqori qismida ko‘rsatiladi.',
          'Ma’lumotlarga ishlov berish maqsadlari yoki uchinchi shaxslar doirasi jiddiy o‘zgarganda biz sizni Platformada yoki boshqa mavjud kanal orqali oldindan xabardor qilamiz va qonun talab qilgan hollarda qayta rozilik so‘raymiz.',
          'Siyosat o‘zbek, rus va ingliz tillarida e’lon qilinadi. Matnlar o‘rtasida tafovut bo‘lsa, **o‘zbek tilidagi matn** ustuvor hisoblanadi.',
        ],
      },
      {
        id: 'contact',
        title: 'Operator va aloqa',
        blocks: [
          {
            table: {
              head: ['Ma’lumot', 'Qiymat'],
              rows: [
                ['Shaxsga doir ma’lumotlar operatori', c.operator],
                ['Platforma', `${c.brand} — ${c.site}`],
                ...(c.tin ? [['STIR', c.tin]] : []),
                ['Manzil', c.legalAddress ?? 'Toshkent shahri, O‘zbekiston Respublikasi'],
                ['Ma’lumotlar bo‘yicha so‘rovlar', c.email ?? 'Platformadagi «Profil → Yordam» bo‘limi'],
                ['Javob berish muddati', '30 kalendar kungacha'],
              ],
            },
          },
        ],
      },
    ],
  };
}
