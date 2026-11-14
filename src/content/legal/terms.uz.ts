import type { LegalContext } from './context';
import type { LegalDoc } from './types';

export function termsUz(c: LegalContext): LegalDoc {
  const contact = c.email
    ? `elektron pochta: **${c.email}** yoki Platformadagi «Yordam» bo‘limi`
    : 'Platformadagi «Profil → Yordam» bo‘limi';
  return {
    eyebrow: 'HUQUQIY HUJJAT · OMMAVIY OFERTA',
    title: 'Foydalanish shartlari',
    lead: `Ushbu hujjat ${c.brand} platformasidan (${c.site} sayti, uning barcha til versiyalari, mobil ilova sifatida o‘rnatiladigan versiyasi va ular bilan bog‘liq xizmatlar) foydalanish tartibini, Operator, mijozlar va ustaxonalar o‘rtasidagi huquq va majburiyatlarni belgilaydi. Platformadan foydalanishni boshlash orqali siz ushbu shartlarni to‘liq va so‘zsiz qabul qilasiz.`,
    sections: [
      {
        id: 'general',
        title: 'Umumiy qoidalar',
        blocks: [
          `Ushbu Foydalanish shartlari (keyingi o‘rinlarda — **Shartlar**) O‘zbekiston Respublikasi Fuqarolik kodeksiga muvofiq **ommaviy oferta** hisoblanadi va ${c.brand} platformasi egasi va operatori — **${c.operator}** (keyingi o‘rinlarda — **Operator**) tomonidan har qanday shaxsga taklif etiladi.`,
          'Quyidagi harakatlardan har biri ofertaning to‘liq va so‘zsiz **aksepti** (qabul qilinishi) hisoblanadi: Platformada ro‘yxatdan o‘tish; hisobga kirish; buyurtma rasmiylashtirish; to‘lov kvitansiyasini yuklash; ustaxona sifatida mahsulot joylashtirish; tarif yoki kreditlarni sotib olish; Platformaning har qanday funksiyasidan foydalanish.',
          'Aksept qilingan paytdan boshlab Foydalanuvchi va Operator o‘rtasida ushbu Shartlarda bayon etilgan shartlarda shartnoma tuzilgan hisoblanadi. Shartnoma yozma shaklda tuzilgan hisoblanadi va qog‘ozda imzolashni talab qilmaydi.',
          'Platformadan foydalanish, shuningdek, **Maxfiylik siyosati** bilan tartibga solinadi. Maxfiylik siyosati ushbu Shartlarning ajralmas qismi hisoblanadi.',
          'Agar siz Shartlarning biror bandiga rozi bo‘lmasangiz, Platformadan foydalanishni darhol to‘xtatishingiz shart.',
          { note: '**Muhim:** Platforma onlayn vizualizatsiya xizmati va ustaxonalar mahsulotlari uchun vositachi bozor (marketplace) hisoblanadi. Mahsulotlarning sotuvchisi, o‘rnatish xizmatlarining ijrochisi va ularning sifati uchun javobgar shaxs — mahsulotni joylashtirgan **ustaxona**dir. Operator to‘lovni qabul qilish, nazorat qilish va ustaxonaga o‘tkazishni tashkil etadi.' },
        ],
      },
      {
        id: 'definitions',
        title: 'Atamalar va ta’riflar',
        blocks: [
          'Ushbu Shartlarda quyidagi atamalar ishlatiladi:',
          {
            list: [
              `**Platforma** — ${c.site} veb-sayti, uning barcha sahifalari, til versiyalari, progressiv veb-ilova (PWA) sifatida o‘rnatiladigan versiyasi, dasturiy interfeyslari (API) va ular orqali ko‘rsatiladigan xizmatlar majmui.`,
              `**Operator** — ${c.operator}, Platformaning egasi va uni boshqaruvchi shaxs.`,
              '**Foydalanuvchi** — Platformaga kirgan, ro‘yxatdan o‘tgan yoki uning har qanday funksiyasidan foydalanayotgan har qanday jismoniy yoki yuridik shaxs.',
              '**Mijoz** — Platformada avtomobil tyuning mahsulotlari va xizmatlarini ko‘rib chiqadigan, vizualizatsiya qiladigan va buyurtma beradigan Foydalanuvchi.',
              '**Ustaxona (Sotuvchi)** — Platformada o‘z mahsulotlari va xizmatlarini joylashtiradigan, Operator tomonidan tasdiqlangan avtomobil tyuning, detaling yoki ehtiyot qismlar bo‘yicha yakka tartibdagi tadbirkor yoki yuridik shaxs.',
              '**Hisob (akkaunt)** — Foydalanuvchining telefon raqami va paroli orqali kiriladigan shaxsiy sahifasi.',
              '**Mahsulot (Detal)** — Ustaxona tomonidan Platformaga joylashtirilgan tovar yoki xizmat: disk, bamper, kuzov kiti, spoyler, fara, plyonka, bo‘yoq, tonirovka, keramik qoplama, polirovka va boshqalar.',
              '**Vizualizatsiya (Render)** — Foydalanuvchi yuklagan avtomobil suratiga sun’iy intellekt yordamida tanlangan mahsulotlarni qo‘yib hosil qilingan tasvir yoki video.',
              '**Kredit** — Platformadagi ichki hisob birligi; bitta muvaffaqiyatli vizualizatsiya bitta (yoki tarifda ko‘rsatilgan miqdordagi) kreditni sarflaydi. Kredit pul mablag‘i emas, uni naqd pulga almashtirib bo‘lmaydi.',
              '**Tarif** — Ustaxonalar uchun belgilangan muddatga (30 kun) beriladigan kreditlar miqdori, qurilmalar soni va boshqa imkoniyatlar to‘plami.',
              '**Buyurtma** — Mijozning bir Ustaxonaning bir yoki bir nechta Mahsulotini sotib olish to‘g‘risidagi so‘rovi.',
              '**Kvitansiya** — Mijoz to‘lovni amalga oshirganini tasdiqlovchi bank ilovasi skrinshoti yoki chek tasviri.',
              '**Olib ketish kodi** — To‘lov tasdiqlangach Mijozga beriladigan, Mahsulotni Ustaxonada topshirish uchun ishlatiladigan maxfiy kod.',
              '**Kontent** — Platformadagi har qanday matn, surat, video, logotip, dizayn, dasturiy kod va boshqa materiallar.',
            ],
          },
        ],
      },
      {
        id: 'acceptance',
        title: 'Shartlarning kuchga kirishi va o‘zgartirilishi',
        blocks: [
          'Shartlar Platformada e’lon qilingan paytdan boshlab kuchga kiradi va Operator tomonidan bekor qilinmaguncha amal qiladi.',
          'Operator Shartlarni bir tomonlama o‘zgartirish huquqiga ega. Yangi tahrir Platformada e’lon qilingan kundan boshlab kuchga kiradi, agar tahrirning o‘zida boshqa muddat ko‘rsatilmagan bo‘lsa.',
          'Mijozlar va Ustaxonalarning huquqlarini sezilarli darajada cheklaydigan o‘zgarishlar haqida Operator kamida **7 (yetti) kalendar kun** oldin Platformada, push-xabarnoma yoki boshqa mavjud aloqa kanali orqali ogohlantiradi.',
          'O‘zgarishlar kuchga kirgandan keyin Platformadan foydalanishni davom ettirish yangi tahrirni qabul qilish hisoblanadi. Yangi tahrirga rozi bo‘lmagan Foydalanuvchi Platformadan foydalanishni to‘xtatishi va hisobini o‘chirishni so‘rashi mumkin.',
          'O‘zgarishlar ular kuchga kirgunga qadar rasmiylashtirilgan va to‘langan Buyurtmalarga, agar qonunda boshqacha belgilanmagan bo‘lsa, tatbiq etilmaydi.',
          'Hujjatning joriy versiyasi raqami va kuchga kirgan sanasi sahifaning yuqori qismida ko‘rsatiladi.',
        ],
      },
      {
        id: 'eligibility',
        title: 'Foydalanuvchilarga qo‘yiladigan talablar',
        blocks: [
          'Platformadan to‘liq muomala layoqatiga ega bo‘lgan, **18 (o‘n sakkiz) yoshga** to‘lgan jismoniy shaxslar, shuningdek, qonunda belgilangan tartibda ro‘yxatdan o‘tgan yakka tartibdagi tadbirkorlar va yuridik shaxslar foydalanishi mumkin.',
          '16 yoshdan 18 yoshgacha bo‘lgan shaxslar Platformani faqat ota-onasi yoki boshqa qonuniy vakilining roziligi bilan va faqat ko‘rish hamda vizualizatsiya maqsadida ishlatishi mumkin; bunday shaxslar Buyurtma bera olmaydi.',
          'Yuridik shaxs yoki yakka tartibdagi tadbirkor nomidan harakat qilayotgan shaxs o‘zining tegishli vakolatlarga ega ekanligini kafolatlaydi. Vakolati bo‘lmagan holda qilingan harakatlar uchun javobgarlik ana shu shaxsning o‘zida qoladi.',
          'Platformadan foydalanish O‘zbekiston Respublikasi qonunchiligi yoki Foydalanuvchi joylashgan davlat qonunchiligi bilan taqiqlangan bo‘lsa, Foydalanuvchi Platformadan foydalanmasligi shart.',
        ],
      },
      {
        id: 'account',
        title: 'Ro‘yxatdan o‘tish va hisob xavfsizligi',
        blocks: [
          'Ro‘yxatdan o‘tish uchun Foydalanuvchi o‘zining amaldagi mobil telefon raqamini, ismini va parolni ko‘rsatadi. Operator SMS orqali tasdiqlash kodini yuborishi mumkin.',
          `SMS-kod **${c.otpMinutes} daqiqa** davomida amal qiladi; bitta kod uchun ko‘pi bilan **${c.otpAttempts} marta** noto‘g‘ri kiritishga ruxsat beriladi, kodni qayta yuborish esa kamida 60 soniyadan keyin mumkin. Bu cheklovlar Hisobni ruxsatsiz kirishdan himoya qilish uchun o‘rnatilgan.`,
          'Soxta (avtomatlashtirilgan) ro‘yxatdan o‘tishning oldini olish uchun Operator Cloudflare Turnstile yoki shunga o‘xshash tekshiruvni qo‘llashi mumkin.',
          'Foydalanuvchi quyidagilarga majbur:',
          {
            list: [
              'faqat o‘ziga tegishli, haqiqiy va to‘liq ma’lumotlarni ko‘rsatish hamda ular o‘zgarganda o‘z vaqtida yangilash;',
              'parolni sir saqlash, uni uchinchi shaxslarga bermaslik va boshqa xizmatlarda ishlatilmaydigan murakkab parol tanlash;',
              'Hisobga ruxsatsiz kirilganiga shubha tug‘ilsa, darhol parolni o‘zgartirish va Operatorga xabar berish;',
              'bitta shaxs nomiga bir nechta Hisob ochmaslik (ayniqsa bepul kreditlarni qayta-qayta olish maqsadida).',
            ],
          },
          'Hisob orqali amalga oshirilgan barcha harakatlar Hisob egasi tomonidan amalga oshirilgan hisoblanadi, agar Hisob egasi ruxsatsiz kirish haqida Operatorga oldindan xabar bergan bo‘lmasa.',
          'Ustaxona tarifiga qarab bir vaqtning o‘zida faol bo‘lishi mumkin bo‘lgan qurilmalar soni cheklanadi. Cheklovdan oshib ketganda eng eski seans yopilishi mumkin.',
        ],
      },
      {
        id: 'services',
        title: 'Platforma xizmatlari',
        blocks: [
          'Platforma quyidagi asosiy xizmatlarni taqdim etadi:',
          {
            list: [
              '**AI vizualizator** — avtomobil suratiga disklar, kuzov elementlari, spoylerlar, faralar, rang, plyonka, tonirovka va boshqa o‘zgarishlarni sun’iy intellekt yordamida qo‘yib ko‘rsatish;',
              '**Katalog va do‘kon** — tasdiqlangan Ustaxonalarning Mahsulotlarini narx, rasm, tavsif va avtomobilga mosligi bilan ko‘rsatish, «Mening mashinam» filtri;',
              '**Buyurtma va to‘lov** — Mahsulotni sotib olish, to‘lovni Operator kartasiga o‘tkazish, kvitansiyani yuklash va Olib ketish kodini olish;',
              '**Ustaxona kabineti** — Mahsulotlar ombori, AI yordamida rasm va matnni yaxshilash, avtomatik tarjima, buyurtmalar, kodni tekshirish, statistika;',
              '**Smart kamera** — telefon orqali avtomobilni bir necha burchakdan suratga olish (shu jumladan QR-kod orqali boshqa qurilmada);',
              '**Bildirishnomalar** — buyurtma holati va boshqa muhim voqealar haqida push-xabarnomalar (faqat Foydalanuvchi ruxsat berganda).',
            ],
          },
          'Operator xizmatlar tarkibini, dizaynini va funksiyalarini oldindan ogohlantirmasdan o‘zgartirish, yangilash, vaqtincha to‘xtatish yoki bekor qilish huquqiga ega; bunda to‘langan, lekin hali ko‘rsatilmagan xizmatlar bo‘yicha Foydalanuvchi huquqlari saqlanadi.',
          'Platforma «boricha» (as is) va «mavjud bo‘lganicha» (as available) taqdim etiladi. Operator Platformaning uzluksiz va xatosiz ishlashini ta’minlash uchun oqilona choralar ko‘radi, ammo texnik ishlar, uchinchi tomon xizmatlaridagi uzilishlar va fors-major holatlarida tanaffuslar bo‘lishi mumkin.',
        ],
      },
      {
        id: 'ai',
        title: 'Sun’iy intellekt vizualizatsiyasi',
        blocks: [
          '**Vizualizatsiya illyustrativ xarakterga ega.** U Mahsulot avtomobilda qanday ko‘rinishi haqida taxminiy tasavvur beradi, ammo haqiqiy rang, o‘lcham, proporsiya, yorug‘lik, material fakturasi va o‘rnatish natijasi bilan to‘liq mos kelishi kafolatlanmaydi.',
          'Vizualizatsiya Mahsulotning avtomobilga texnik jihatdan mos kelishini (masalan, diskning o‘lchami, boltlar joylashuvi, vylet, kuzovga mahkamlash usuli) tasdiqlamaydi. Texnik moslik buyurtma berishdan oldin Ustaxona bilan aniqlashtirilishi shart.',
          'Vizualizatsiya uchun Foydalanuvchi yuklagan suratlar Operatorning texnik hamkorlari bo‘lgan sun’iy intellekt xizmatlariga (masalan, Google Gemini, OpenRouter, Fal.ai, Cloudflare Workers AI, OpenAI) faqat tasvirni yaratish maqsadida yuboriladi. Batafsil — Maxfiylik siyosatida.',
          'Kredit faqat **muvaffaqiyatli** yakunlangan vizualizatsiya uchun yechiladi. Agar vizualizatsiya xato, vaqt tugashi yoki provayder rad etishi sababli yakunlanmasa, kredit avtomatik ravishda qaytariladi. Bir xil so‘rov uchun keshdan olingan natija kredit sarflamasligi mumkin.',
          'Natija sifatidan norozi bo‘lgan Foydalanuvchi «Muammo haqida xabar berish» funksiyasi orqali murojaat qilishi mumkin; Operator murojaatni ko‘rib chiqib, o‘z ixtiyoriga ko‘ra kreditni qaytarishi mumkin.',
          'Bepul tarifda yaratilgan vizualizatsiyalarga «Tuned by CarVision» suv belgisi (watermark) qo‘yiladi. Suv belgisini olib tashlash, kesish yoki yashirish taqiqlanadi.',
          'Foydalanuvchi quyidagi suratlarni yuklamaslikka majbur: begona shaxslarning yuzlari aniq ko‘rinadigan suratlar (ularning roziligisiz); boshqa shaxsga tegishli avtomobilning egasi roziligisiz olingan suratlari; uchinchi shaxslarning mualliflik huquqi bilan himoyalangan suratlar; qonunga xilof, odobsiz yoki zararli mazmundagi tasvirlar.',
          'Operator Platforma suiiste’mol qilinishining oldini olish uchun yuklangan suratni avtomatik tekshirishi mumkin (masalan, suratda avtomobil borligi va barcha burchaklar bir xil avtomobilga tegishliligi). Tekshiruvdan o‘tmagan surat vizualizatsiya uchun qabul qilinmasligi mumkin; bunda kredit yechilmaydi.',
        ],
      },
      {
        id: 'plans',
        title: 'Tariflar, kreditlar va ularning to‘lovi (Ustaxonalar uchun)',
        blocks: [
          'Ustaxonalar uchun tariflar, ularning narxi, kreditlar soni, qurilmalar soni va boshqa imkoniyatlari Platformaning «Tariflar» sahifasida e’lon qilinadi. E’lon qilingan ma’lumot ushbu Shartlarning ajralmas qismi hisoblanadi.',
          'Har bir tarif **30 (o‘ttiz) kalendar kun**ga beriladi. Avtomatik uzaytirish va kartadan avtomatik yechib olish amalga oshirilmaydi: tarif har safar Ustaxona to‘lov qilgandan va Operator uni tasdiqlagandan keyin faollashtiriladi.',
          'Tarif bilan berilgan kreditlar tarif muddati tugashi bilan kuchini yo‘qotadi va keyingi davrga o‘tkazilmaydi. Bonus kreditlar (sinov, taklif dasturi, Operator sovg‘asi) agar boshqacha ko‘rsatilmagan bo‘lsa, berilgan kundan boshlab 12 oy amal qiladi.',
          'Narxlar AQSh dollarida ko‘rsatilishi mumkin; to‘lov O‘zbekiston Respublikasi so‘mida, to‘lov kunidagi Platformada ko‘rsatilgan kurs bo‘yicha amalga oshiriladi.',
          'Tarif muddati tugagach, Ustaxona hisobi «muddati o‘tgan» holatiga o‘tadi: Mahsulotlar, buyurtmalar tarixi va boshqa ma’lumotlar saqlanadi, ammo yangi vizualizatsiya yaratish to‘xtatiladi.',
          'Tarif uchun to‘langan summa, tarif faollashtirilgandan keyin, qonunda nazarda tutilgan hollardan tashqari, qaytarilmaydi. Tarif xato faollashtirilgan yoki umuman faollashtirilmagan bo‘lsa, Ustaxona murojaati asosida summa to‘liq qaytariladi yoki tarif to‘g‘ri faollashtiriladi.',
          'Kreditlar boshqa Hisobga o‘tkazilmaydi, sotilmaydi va naqd pulga almashtirilmaydi.',
        ],
      },
      {
        id: 'catalog',
        title: 'Katalog, Mahsulot ma’lumotlari va narxlar',
        blocks: [
          'Mahsulot nomi, tavsifi, suratlari, narxi, mavjudligi, mosligi (qaysi avtomobil modellariga to‘g‘ri kelishi) va boshqa xususiyatlari **Ustaxona** tomonidan kiritiladi. Ushbu ma’lumotlarning to‘g‘riligi va to‘liqligi uchun Ustaxona javob beradi.',
          'Mahsulot tavsifi va nomi sun’iy intellekt yordamida Platformaning boshqa tillariga avtomatik tarjima qilinishi mumkin. Tarjimada noaniqlik bo‘lsa, Ustaxona kiritgan asl matn ustuvor hisoblanadi.',
          'Platformada narxlar Foydalanuvchi tanlagan valyutada ma’lumot uchun ko‘rsatilishi mumkin. Buyurtma uchun to‘lanadigan aniq summa so‘mda, buyurtma rasmiylashtirilgan paytdagi kurs bo‘yicha belgilanadi va to‘lov ko‘rsatmalarida aks ettiriladi.',
          '«Universal» deb belgilangan Mahsulot ko‘pchilik avtomobillarga mos keladi, biroq o‘lcham, bolt joylashuvi va boshqa texnik parametrlar buyurtma paytida Ustaxona tomonidan avtomobilingizga moslab tanlanadi va bu narxga ta’sir qilishi mumkin.',
          'Operator Platformadagi Mahsulot ma’lumotlarini tekshirishi, Shartlarga zid bo‘lgan Mahsulotni ogohlantirmasdan yashirishi yoki o‘chirishi mumkin, ammo barcha Mahsulotlarni oldindan tekshirish majburiyatini olmaydi.',
          'Platformada ko‘rsatilgan rasm va narxdagi aniq texnik xato (masalan, narxdagi ortiqcha yoki tushib qolgan raqam) Buyurtmani shu xato narxda bajarish majburiyatini keltirib chiqarmaydi; bunday holda Buyurtma bekor qilinadi va to‘langan summa to‘liq qaytariladi.',
        ],
      },
      {
        id: 'orders',
        title: 'Buyurtma berish va to‘lov tartibi',
        blocks: [
          'Buyurtma quyidagi tartibda amalga oshiriladi:',
          {
            ordered: true,
            list: [
              'Mijoz Mahsulotni savatga qo‘shadi va Buyurtmani rasmiylashtiradi; har bir Ustaxona uchun alohida Buyurtma yaratiladi.',
              'Platforma to‘lanadigan aniq summani (so‘mda), to‘lov qabul qiluvchi karta rekvizitlarini va to‘lov muddatini ko‘rsatadi. Summa Platformaning serverida ma’lumotlar bazasidagi narxlar asosida hisoblanadi; brauzer yuborgan summa inobatga olinmaydi.',
              'Mijoz ko‘rsatilgan summani to‘liq hajmda ko‘rsatilgan kartaga o‘tkazadi va to‘lov kvitansiyasini Platformaga yuklaydi.',
              'Operator kvitansiyani tekshiradi. Tasdiqlangandan so‘ng Mahsulot zaxiradan chiqariladi, Mijozga **Olib ketish kodi** beriladi, Ustaxonaga esa Mijozning ismi, telefon raqami va izohi yetkaziladi.',
              'Mijoz Ustaxonaga kelib, Olib ketish kodini aytadi; Ustaxona kodni Platformada tekshiradi va Mahsulotni topshiradi (yoki o‘rnatish xizmatini ko‘rsatadi).',
            ],
          },
          `Operator to‘lovni Ustaxona nomidan va uning topshirig‘iga ko‘ra qabul qiluvchi **vositachi** sifatida ishtirok etadi. Operator xizmat haqi (komissiya) — Buyurtma summasining **${c.commissionPct}%** — Ustaxonaga o‘tkaziladigan summadan ushlab qolinadi; Mijozdan qo‘shimcha komissiya olinmaydi.`,
          'To‘lov faqat Platformada ko‘rsatilgan rekvizitlarga amalga oshirilishi shart. Platformadan tashqarida, Ustaxonaga to‘g‘ridan-to‘g‘ri yoki uchinchi shaxslarga qilingan to‘lovlar uchun Operator javobgar emas va bunday to‘lovlar Platforma kafolatlari bilan himoyalanmaydi.',
          'Kvitansiya rad etilishi mumkin, agar: summa to‘liq bo‘lmasa; to‘lov boshqa kartaga qilingan bo‘lsa; kvitansiya o‘qib bo‘lmaydigan, tahrirlangan, takroran ishlatilgan yoki soxta bo‘lsa; to‘lov Operator hisobvarag‘iga kelib tushmagan bo‘lsa. Rad etilgan Buyurtma bekor qilinadi. Agar pul haqiqatan o‘tkazilgan bo‘lsa, Mijoz «Yordam» bo‘limi orqali murojaat qiladi va to‘lov tasdiqlangach mablag‘ qaytariladi yoki Buyurtma tiklanadi.',
          '**Soxta yoki tahrirlangan kvitansiya yuklash firibgarlik hisoblanadi.** Bunday holda Hisob ogohlantirishsiz bloklanadi, qurilma cheklanishi mumkin va tegishli ma’lumotlar huquqni muhofaza qiluvchi organlarga yuborilishi mumkin.',
          'Olib ketish kodini uchinchi shaxslarga bermang. Kod bilan Mahsulotni olgan shaxs Mahsulotni Mijozning o‘zi olgan deb hisoblanadi.',
          'Platforma orqali amalga oshirilgan har bir to‘lov uchun buyurtma raqami, summa, kurs va holat Hisobda saqlanadi; Mijoz buyurtma bo‘yicha elektron chekni (kvitansiya sahifasini) yuklab olishi mumkin.',
        ],
      },
      {
        id: 'cancellation',
        title: 'Buyurtmani bekor qilish va pulni qaytarish',
        blocks: [
          `**Mijoz tomonidan bekor qilish.** Mijoz to‘lov tasdiqlangan paytdan boshlab **${c.cancelHours} soat** ichida, Mahsulot hali topshirilmagan va Ustaxonaga to‘lov o‘tkazilmagan bo‘lsa, Buyurtmani Platformada o‘zi bekor qilishi mumkin. Bunda to‘langan summaning **${c.refundPct}%** qismi Mijozga qaytariladi; qolgan **${c.retainedPct}%** Mahsulotni zaxiralash, to‘lovni qayta ishlash va Ustaxona xarajatlarini qoplash uchun ushlab qolinadi.`,
          `${c.cancelHours} soatlik muddat o‘tgach yoki Mahsulot topshirilgandan keyin Buyurtmani Platforma orqali bekor qilib bo‘lmaydi. Bunday hollarda Mahsulotni qaytarish yoki almashtirish masalasi Ustaxona bilan iste’molchilar huquqlarini himoya qilish to‘g‘risidagi qonunchilikka muvofiq hal qilinadi.`,
          '**To‘liq (100%) qaytarish** quyidagi hollarda amalga oshiriladi:',
          {
            list: [
              'Ustaxona Buyurtmani bajarishdan bosh tortsa yoki Mahsulot mavjud bo‘lmay qolsa;',
              'Ustaxona tasdiqlangan Buyurtma bo‘yicha Mijoz bilan oqilona muddatda bog‘lanmasa yoki Mahsulotni topshirmasa;',
              'Narx yoki Mahsulot ma’lumotlarida aniq texnik xato aniqlansa (9-bo‘lim);',
              'Operator Buyurtmani o‘z tashabbusi bilan bekor qilsa (Mijozning qoidabuzarligi holatlari bundan mustasno);',
              'to‘lov xatosi yoki ikki marta to‘lov (ortiqcha to‘langan qism) aniqlansa.',
            ],
          },
          'Qaytarish Operator tomonidan Mijoz to‘lov qilgan kartaga (yoki Mijoz ko‘rsatgan boshqa o‘z nomidagi kartaga) bank o‘tkazmasi orqali amalga oshiriladi. Qaytarish bekor qilish tasdiqlangan kundan boshlab, qoida tariqasida, **10 (o‘n) bank ish kuni** ichida amalga oshiriladi; mablag‘ning kartaga tushish vaqti bankka bog‘liq.',
          'Qaytarilgan summa to‘lov paytida qayd etilgan so‘mdagi summa asosida hisoblanadi; valyuta kursi o‘zgarishi qaytariladigan summaga ta’sir qilmaydi.',
          'Mahsulotning sifati, nuqsonlari, kafolat va o‘rnatish xizmatlariga oid talablar O‘zbekiston Respublikasining «Iste’molchilarning huquqlarini himoya qilish to‘g‘risida»gi Qonuniga muvofiq Ustaxonaga taqdim etiladi. Operator Mijoz va Ustaxona o‘rtasida aloqani ta’minlash va nizoni hal qilishda ko‘maklashadi.',
          { note: 'Ushbu bo‘limdagi hech bir qoida qonun bilan iste’molchiga berilgan va shartnoma bilan cheklab bo‘lmaydigan huquqlarni cheklamaydi.' },
        ],
      },
      {
        id: 'sellers',
        title: 'Ustaxonalarning huquq va majburiyatlari',
        blocks: [
          'Ustaxona Platformada savdo qilish uchun Operator tomonidan tasdiqlanishi (verifikatsiyadan o‘tishi) shart. Operator tasdiqlash uchun ro‘yxatdan o‘tganlik hujjatlari, manzil, telefon va to‘lov rekvizitlarini so‘rashi mumkin. Tasdiqlanmagan Ustaxonaning Mahsulotlari ommaviy katalogda ko‘rsatilmaydi.',
          'Ustaxona quyidagilarga majbur:',
          {
            list: [
              'faqat qonuniy, o‘ziga tegishli yoki sotish huquqiga ega bo‘lgan Mahsulotlarni joylashtirish;',
              'Mahsulotning haqiqiy surati, aniq narxi, mavjudligi, texnik xususiyatlari va avtomobillarga mosligini ko‘rsatish hamda ular o‘zgarganda darhol yangilash;',
              'tasdiqlangan Buyurtmani bajarish, Mijozni o‘z vaqtida qabul qilish va Mahsulotni faqat to‘g‘ri Olib ketish kodi bo‘yicha topshirish;',
              'Mahsulot va xizmatlarga qonunda belgilangan kafolatni berish, nuqsonli Mahsulot bo‘yicha iste’molchi talablarini ko‘rib chiqish;',
              'soliq va boshqa majburiy to‘lovlarni o‘zi to‘lash, qonunda talab qilingan hollarda Mijozga fiskal chek yoki hisob-faktura berish;',
              'Mijozning shaxsiy ma’lumotlaridan faqat Buyurtmani bajarish uchun foydalanish, ularni uchinchi shaxslarga bermaslik va reklama yuborish uchun ishlatmaslik;',
              'Mijozni Platformadan tashqarida to‘lov qilishga undamaslik.',
            ],
          },
          `**Ustaxonaga to‘lov.** Buyurtma summasidan Operatorning ${c.commissionPct}% komissiyasi ushlab qolingan holda, qolgan summa Mijozning bekor qilish muddati (${c.cancelHours} soat) tugagandan va Mahsulot topshirilgandan so‘ng Ustaxona Platformada ko‘rsatgan rekvizitlarga bank o‘tkazmasi orqali o‘tkaziladi. Rekvizitlardagi xato tufayli kechikkan yoki noto‘g‘ri o‘tkazilgan to‘lovlar uchun Ustaxona javobgar.`,
          'Ustaxona Platformada joylashtirgan suratlari va matnlari bo‘yicha Operatorga ularni Platformada, katalogda, qidiruv tizimlari uchun, reklama materiallarida va ijtimoiy tarmoqlarda Platformani targ‘ib qilish maqsadida bepul, nomutlaq, butun dunyo hududida foydalanish huquqini (litsenziyasini) beradi.',
          'Ustaxona AI yordamida yaxshilangan rasm va matnlarni e’lon qilishdan oldin tekshirishi shart; ular Mahsulotni noto‘g‘ri tasvirlashi mumkin emas.',
          'Shartlar qo‘pol yoki takroran buzilganda, Mijozlardan asosli shikoyatlar ko‘p kelganda yoki firibgarlik aniqlanganda Operator Ustaxonani katalogdan vaqtincha yashirish, Hisobini to‘xtatib qo‘yish yoki tasdiqni bekor qilish huquqiga ega. Bunda Ustaxonaga to‘lanishi lozim bo‘lgan summalar nizo hal qilinguncha ushlab turilishi mumkin.',
        ],
      },
      {
        id: 'legality',
        title: 'Avtomobilga o‘zgartirish kiritishning qonuniyligi',
        blocks: [
          'Avtomobil konstruksiyasiga, tashqi ko‘rinishiga va jihozlariga o‘zgartirish kiritish (shu jumladan oyna tonirovkasi, faralar va yoritish moslamalari, glushitel va chiqarish tizimi, podveska, disk va shinalar o‘lchami, kuzov rangi) O‘zbekiston Respublikasining yo‘l harakati xavfsizligi to‘g‘risidagi qonunchiligi bilan tartibga solinadi va ayrim hollarda vakolatli organlarning ruxsati yoki ro‘yxatdan o‘tkazilishini talab qiladi.',
          'Platformada vizualizatsiya qilinishi yoki sotilishi Mahsulotni ma’lum avtomobilda o‘rnatish va ishlatish qonuniy ekanligini anglatmaydi. O‘zgartirishning qonuniyligini tekshirish, zarur ruxsatnomalarni olish va ro‘yxatdan o‘tkazish **avtomobil egasining** zimmasida.',
          'Operator Mahsulotni o‘rnatish yoki ishlatish oqibatida yuzaga kelgan jarimalar, ro‘yxatdan o‘tkazishni rad etish, sug‘urta to‘lovini rad etish yoki boshqa oqibatlar uchun javob bermaydi.',
        ],
      },
      {
        id: 'content',
        title: 'Foydalanuvchi kontenti',
        blocks: [
          'Foydalanuvchi Platformaga yuklagan suratlar, matnlar, sharhlar va boshqa materiallarga (Foydalanuvchi kontenti) bo‘lgan huquqlar Foydalanuvchida qoladi.',
          'Kontentni yuklash orqali Foydalanuvchi Operatorga ushbu kontentni saqlash, qayta ishlash (shu jumladan sun’iy intellekt xizmatlariga yuborish), ko‘paytirish va Foydalanuvchiga ko‘rsatish uchun zarur bo‘lgan bepul, nomutlaq litsenziyani beradi. Litsenziya kontent o‘chirilgunga yoki Hisob o‘chirilgunga qadar amal qiladi (qonunda saqlash talab qilinadigan ma’lumotlar bundan mustasno).',
          'Operator Foydalanuvchi yaratgan vizualizatsiyani uning alohida yozma roziligisiz reklama maqsadida ommaviy e’lon qilmaydi.',
          'Foydalanuvchi o‘zi yuklagan kontent uchinchi shaxslarning huquqlarini (mualliflik huquqi, shaxsiy hayot daxlsizligi, tasvirga bo‘lgan huquq) buzmasligini kafolatlaydi va bunday huquqbuzarlik bo‘yicha da’volar uchun mustaqil javob beradi.',
        ],
      },
      {
        id: 'ip',
        title: 'Intellektual mulk',
        blocks: [
          `Platformaning dasturiy ta’minoti, dizayni, interfeysi, ${c.brand} nomi va logotipi, matnlari, ma’lumotlar bazasining tuzilishi va boshqa elementlari Operatorga tegishli yoki Operator ulardan qonuniy asosda foydalanadi va O‘zbekiston Respublikasining intellektual mulk to‘g‘risidagi qonunchiligi bilan himoyalangan.`,
          'Foydalanuvchiga Platformadan faqat ushbu Shartlarda nazarda tutilgan maqsadlarda shaxsiy foydalanish uchun cheklangan, nomutlaq, o‘tkazib bo‘lmaydigan huquq beriladi.',
          'Platforma elementlarini Operatorning yozma roziligisiz nusxalash, o‘zgartirish, tarqatish, sotish, ijaraga berish, dekompilyatsiya qilish yoki ulardan hosila asarlar yaratish taqiqlanadi.',
          'Foydalanuvchi o‘z hisobida yaratilgan vizualizatsiyalardan shaxsiy maqsadda, shuningdek, Ustaxona o‘z mijozlariga ko‘rsatish va o‘z mahsulotlarini reklama qilish uchun foydalanishi mumkin; bunda suv belgisi (agar mavjud bo‘lsa) saqlanishi shart.',
        ],
      },
      {
        id: 'prohibited',
        title: 'Taqiqlangan harakatlar',
        blocks: [
          'Foydalanuvchiga quyidagilar taqiqlanadi:',
          {
            list: [
              'soxta, tahrirlangan yoki boshqa shaxsga tegishli to‘lov kvitansiyasini yuklash;',
              'boshqa shaxs nomidan Hisob ochish yoki o‘zgalar Hisobidan foydalanish;',
              'bepul kreditlar yoki bonuslarni olish uchun bir nechta Hisob ochish;',
              'Platformaga avtomatlashtirilgan vositalar (bot, skript, parser) orqali Operator ruxsatisiz ommaviy so‘rov yuborish, ma’lumotlarni yig‘ish (scraping), so‘rovlar chastotasi cheklovlarini chetlab o‘tish;',
              'Platforma xavfsizligini buzishga, zaifliklarni izlashga (Operator bilan kelishilgan holatlardan tashqari), boshqa Foydalanuvchilar ma’lumotlariga kirishga urinish;',
              'zararli dastur, virus yoki Platforma ishiga xalaqit beruvchi kod yuklash;',
              'Platformani qonunga xilof faoliyat, firibgarlik, pul yuvish yoki o‘g‘irlangan mol-mulk bilan savdo qilish uchun ishlatish;',
              'Ustaxona yoki boshqa Foydalanuvchilarni haqorat qilish, tahdid qilish, ular haqida yolg‘on ma’lumot tarqatish;',
              'Mijozni Platformadan chetlab o‘tib to‘g‘ridan-to‘g‘ri to‘lov qilishga undash;',
              'suv belgisini olib tashlash yoki Platforma cheklovlarini texnik yo‘l bilan chetlab o‘tish.',
            ],
          },
          'Taqiqlangan harakat aniqlanganda Operator ogohlantirishsiz kontentni o‘chirish, funksiyalarni cheklash, Hisobni bloklash, kreditlarni bekor qilish va yetkazilgan zararni qoplashni talab qilish huquqiga ega.',
        ],
      },
      {
        id: 'termination',
        title: 'Hisobni to‘xtatish va o‘chirish',
        blocks: [
          `Foydalanuvchi istalgan vaqtda Hisobini o‘chirishni so‘rashi mumkin: ${contact}. So‘rov Hisob egasi ekanligi tasdiqlangandan so‘ng **30 (o‘ttiz) kalendar kun** ichida bajariladi.`,
          'Hisob o‘chirilganda shaxsiy ma’lumotlar o‘chiriladi yoki anonimlashtiriladi; buxgalteriya, soliq va to‘lov hisobi uchun qonunan saqlanishi shart bo‘lgan ma’lumotlar (buyurtma summasi, sanasi, to‘lov tasdig‘i) qonunda belgilangan muddat davomida shaxsni aniqlab bo‘lmaydigan shaklda saqlanadi.',
          'Bajarilmagan Buyurtmalar yoki hal qilinmagan nizolar mavjud bo‘lsa, Hisobni o‘chirish ular yakunlanguncha kechiktirilishi mumkin.',
          'Hisob o‘chirilganda foydalanilmagan kreditlar va tarif muddatining qolgan qismi kuchini yo‘qotadi va pul bilan qoplanmaydi.',
          'Operator Shartlar buzilganda, qonun talabiga ko‘ra yoki Hisob 24 oydan ortiq faol bo‘lmaganda Hisobni to‘xtatib qo‘yishi yoki o‘chirishi mumkin. Faol bo‘lmagan Hisob o‘chirilishidan oldin Operator mavjud aloqa kanali orqali ogohlantiradi.',
        ],
      },
      {
        id: 'disclaimer',
        title: 'Kafolatlardan voz kechish',
        blocks: [
          'Qonun ruxsat bergan darajada Operator quyidagilarni kafolatlamaydi: Platformaning uzluksiz va xatosiz ishlashini; vizualizatsiya natijasining haqiqiy o‘rnatish natijasiga to‘liq mos kelishini; Ustaxonalar joylashtirgan ma’lumotlarning to‘liq va aniqligini; Platformaning Foydalanuvchining muayyan maqsadlariga mos kelishini.',
          'Operator Ustaxona tomonidan sotilgan Mahsulotning sifati, kafolati, o‘rnatish sifati va xavfsizligi uchun sotuvchi sifatida javob bermaydi; bu majburiyatlar Ustaxona zimmasida. Bu qoida Operatorning to‘lovni qabul qilish va qaytarish bo‘yicha ushbu Shartlarda belgilangan majburiyatlarini cheklamaydi.',
        ],
      },
      {
        id: 'liability',
        title: 'Javobgarlik va uning chegaralari',
        blocks: [
          'Tomonlar o‘z majburiyatlarini bajarmaganlik yoki lozim darajada bajarmaganlik uchun O‘zbekiston Respublikasi qonunchiligiga va ushbu Shartlarga muvofiq javob beradi.',
          'Qonun ruxsat bergan darajada Operator boy berilgan foyda, ma’lumotlarning yo‘qolishi, biznes to‘xtab qolishi kabi bilvosita zararlar uchun javob bermaydi.',
          'Operatorning muayyan Buyurtma bo‘yicha umumiy javobgarligi ushbu Buyurtma uchun Mijoz tomonidan amalda to‘langan summa bilan, tarif bo‘yicha esa oxirgi to‘langan tarif narxi bilan cheklanadi, agar qonunda boshqacha belgilanmagan bo‘lsa.',
          'Javobgarlik cheklovlari Operatorning qasddan yoki qo‘pol ehtiyotsizlik bilan yetkazgan zarariga, shuningdek, qonun bo‘yicha cheklab bo‘lmaydigan javobgarlikka tatbiq etilmaydi.',
          'Foydalanuvchi Shartlarni buzganligi sababli Operatorga yoki uchinchi shaxslarga yetkazilgan zarar (shu jumladan da’volar, jarimalar va yuridik xarajatlar) uchun javob beradi.',
        ],
      },
      {
        id: 'force-majeure',
        title: 'Fors-major holatlari',
        blocks: [
          'Tomonlar majburiyatlarni bajarmaganlik uchun, agar bu yengib bo‘lmaydigan kuch (fors-major) holatlari — tabiiy ofatlar, yong‘in, epidemiya, urush harakatlari, davlat organlarining qarorlari, ommaviy elektr yoki internet uzilishlari, bank tizimlaridagi nosozliklar, uchinchi tomon xizmat ko‘rsatuvchilarining (hosting, AI provayderlar, SMS operatorlari) ishdan chiqishi natijasi bo‘lsa, javobgarlikdan ozod qilinadi.',
          'Fors-major holatiga duch kelgan tomon imkon qadar tezroq ikkinchi tomonni xabardor qiladi. Majburiyatlarni bajarish muddati bunday holatlar davom etgan vaqtga uzaytiriladi.',
        ],
      },
      {
        id: 'third-party',
        title: 'Uchinchi tomon xizmatlari va havolalar',
        blocks: [
          'Platforma ishlashi uchun uchinchi tomon xizmatlaridan foydalaniladi: hosting va ma’lumotlar bazasi (Vercel, Supabase), sun’iy intellekt provayderlari, SMS xizmati (Eskiz.uz), Telegram, brauzer push-xizmatlari, Cloudflare. Bu xizmatlarning ishlashi ularning o‘z shartlari bilan tartibga solinadi.',
          'Platformada uchinchi tomon saytlariga havolalar bo‘lishi mumkin. Operator bunday saytlarning mazmuni va ularning maxfiylik amaliyoti uchun javob bermaydi.',
        ],
      },
      {
        id: 'disputes',
        title: 'Murojaatlar va nizolarni hal qilish',
        blocks: [
          `Platforma bo‘yicha savol, shikoyat va talablar quyidagi kanal orqali yuboriladi: ${contact}. Murojaatda Hisobga bog‘langan telefon raqami, buyurtma raqami (agar mavjud bo‘lsa) va muammoning batafsil tavsifi ko‘rsatilishi lozim.`,
          'Operator murojaatni olgan kundan boshlab **15 (o‘n besh) kalendar kun** ichida javob beradi; qo‘shimcha tekshiruv talab etilsa, muddat Foydalanuvchini xabardor qilgan holda uzaytirilishi mumkin.',
          'Nizolar avvalo muzokaralar va talabnoma (pretenziya) tartibida hal qilinadi. Kelishuvga erishilmasa, nizo O‘zbekiston Respublikasi qonunchiligiga muvofiq, Operator joylashgan joydagi vakolatli sudda ko‘rib chiqiladi; iste’molchi qonunda nazarda tutilgan hollarda o‘zi yashaydigan joydagi sudga murojaat qilish huquqini saqlab qoladi.',
          'Ushbu Shartlarga va ulardan kelib chiqadigan munosabatlarga **O‘zbekiston Respublikasi qonunchiligi** qo‘llaniladi.',
        ],
      },
      {
        id: 'final',
        title: 'Yakuniy qoidalar',
        blocks: [
          'Agar Shartlarning biror qoidasi haqiqiy emas deb topilsa, bu qolgan qoidalarning haqiqiyligiga ta’sir qilmaydi.',
          'Operatorning biror huquqdan foydalanmasligi bu huquqdan voz kechish hisoblanmaydi.',
          'Foydalanuvchi Shartlar bo‘yicha huquq va majburiyatlarini Operatorning yozma roziligisiz uchinchi shaxsga o‘tkaza olmaydi. Operator o‘z huquq va majburiyatlarini Platformaning huquqiy vorisiga Foydalanuvchini xabardor qilgan holda o‘tkazishi mumkin.',
          'Shartlar o‘zbek, rus va ingliz tillarida e’lon qilinadi. Matnlar o‘rtasida tafovut bo‘lsa, **o‘zbek tilidagi matn** ustuvor hisoblanadi.',
          'Elektron xabarnomalar (Platformadagi bildirishnoma, push-xabar, SMS, elektron pochta) tomonlar o‘rtasidagi yozma xabar hisoblanadi.',
        ],
      },
      {
        id: 'operator',
        title: 'Operator rekvizitlari va aloqa',
        blocks: [
          {
            table: {
              head: ['Ma’lumot', 'Qiymat'],
              rows: [
                ['Operator', c.operator],
                ['Platforma', `${c.brand} — ${c.site}`],
                ...(c.tin ? [['STIR', c.tin]] : []),
                ['Manzil', c.legalAddress ?? 'Toshkent shahri, O‘zbekiston Respublikasi'],
                ['Murojaat uchun', c.email ?? 'Platformadagi «Profil → Yordam» bo‘limi'],
                ['Ish vaqti', 'Dushanba–Juma, 9:00–18:00 (Toshkent vaqti)'],
              ],
            },
          },
        ],
      },
    ],
  };
}
