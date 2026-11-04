# -*- coding: utf-8 -*-
"""Demo catalog: workshops + ~150 realistic tuning products (uz source text, ru/en translations)."""

# ---------------------------------------------------------------- shops
SHOPS = {
    'apex': dict(email='apex.customs@demo.carvision.uz', phone='+998900000101', owner='Sanjar Usmonov',
                 name='Apex Customs Studio', city='Toshkent', district='Yunusobod',
                 addr="Amir Temur ko'chasi, 42", lat=41.3646, lng=69.2867, rating=4.9, rc=212),
    'dubai': dict(email='dubai.wheels@demo.carvision.uz', phone='+998900000102', owner='Alisher Qodirov',
                  name='Dubai Custom Wheels', city='Toshkent', district="Mirzo Ulug'bek",
                  addr="Mustaqillik shoh ko'chasi, 7", lat=41.3394, lng=69.3342, rating=4.8, rc=187),
    'autotune': dict(email='autotune.pro@demo.carvision.uz', phone='+998900000103', owner='Bekzod Rahimov',
                     name='Autotune Pro Tashkent', city='Toshkent', district='Chilonzor',
                     addr="Bunyodkor shoh ko'chasi, 18", lat=41.2755, lng=69.2043, rating=4.9, rc=164),
    'samarkand': dict(email='samarkand.lab@demo.carvision.uz', phone='+998900000104', owner='Sherzod Mirzaev',
                      name='Samarkand Tuning Lab', city='Samarqand', district='Registon',
                      addr="Registon ko'chasi, 55", lat=39.6542, lng=66.9757, rating=4.7, rc=96),
    'fergana': dict(email='fergana.studio@demo.carvision.uz', phone='+998900000105', owner='Mansur Karimov',
                    name='Fergana Tuning Studio', city="Farg'ona", district='Markaz',
                    addr="Al-Farg'oniy ko'chasi, 12", lat=40.3864, lng=71.7864, rating=4.6, rc=73),
    'bukhara': dict(email='bukhara.custom@demo.carvision.uz', phone='+998900000106', owner="Rustam Jo'rayev",
                    name='Buxoro Auto Custom', city='Buxoro', district='Markaz',
                    addr="G'ijduvon shoh ko'chasi, 29", lat=39.7747, lng=64.4286, rating=4.8, rc=58),
}

# ---------------------------------------------------------------- fitment groups
def F(slug, a=None, b=None):
    return (slug, a, b)

SEDAN_114 = [F('kia-k5', 2019, 2025), F('hyundai-sonata', 2019, 2025), F('toyota-camry', 2018, 2025), F('hyundai-elantra', 2020, 2025)]
SUV_114 = [F('kia-sportage', 2016, 2025), F('hyundai-tucson', 2016, 2025), F('toyota-rav4', 2019, 2025), F('kia-seltos', 2020, 2025)]
G_4X100 = [F('chevrolet-gentra', 2013, 2025), F('chevrolet-cobalt', 2012, 2025), F('chevrolet-nexia-3', 2016, 2025), F('chevrolet-lacetti', 2004, 2013)]
MALIBU = [F('chevrolet-malibu', 2016, 2025)]
GERMAN_112 = [F('mercedes-benz-e-class', 2016, 2024), F('bmw-5-series', 2017, 2023)]
BYD = [F('byd-han', 2020, 2025), F('byd-seal', 2022, 2025), F('byd-song-plus', 2021, 2025)]
TRACKER = [F('chevrolet-tracker', 2020, 2025), F('chevrolet-onix', 2020, 2025)]
LC = [F('toyota-land-cruiser', 2008, 2024), F('toyota-land-cruiser-prado', 2010, 2024)]
UNI = None  # universal

# ---------------------------------------------------------------- features (uz, ru, en)
FE = {
 'forged': ("6061-T6 alyuminiydan soxta (forged) tayyorlangan, quyma disklardan 25% gacha yengil",
            "Кованый из алюминия 6061-T6, до 25% легче литых дисков",
            "Forged from 6061-T6 aluminium, up to 25% lighter than cast wheels"),
 'flow': ("Flow-forming texnologiyasi: yengil, bardoshli va yo'l zarbalariga chidamli",
          "Технология flow-forming: легче, прочнее и устойчивее к ударам",
          "Flow-formed barrel: lighter, stronger and more impact resistant"),
 'cast': ("Past bosimli quyma, kundalik foydalanish uchun ishonchli va hamyonbop",
          "Литой диск низкого давления: надёжный и доступный для ежедневной езды",
          "Low-pressure cast construction: dependable and affordable for daily driving"),
 'jwl': ("JWL / VIA sertifikati: yuklama sinovlaridan o'tgan", "Сертификация JWL / VIA: прошли нагрузочные испытания", "JWL / VIA certified: load-tested to international standards"),
 'set4': ("Narx 4 donalik komplekt uchun. Markaziy qalpoqcha va halqalar kiradi", "Цена за комплект из 4 дисков. Колпачки и центрирующие кольца в комплекте", "Price per set of 4. Centre caps and hub rings included"),
 'tpms': ("TPMS datchiklari bilan mos keladi", "Совместимы с датчиками давления TPMS", "TPMS sensor compatible"),
 'brake': ("Kattalashtirilgan tormoz tizimiga joy qoldirilgan", "Запас по габаритам под увеличенные тормоза", "Clearance for big brake kits"),
 'concave': ("Chuqur konkav profil: agressiv sport ko'rinish", "Глубокий конкавный профиль: агрессивный спортивный вид", "Deep concave profile for an aggressive stance"),
 'finish': ("Ko'p qatlamli bo'yoq va shaffof lak: yorqinligi uzoq saqlanadi", "Многослойное покрытие и прозрачный лак: цвет долго не выцветает", "Multi-layer paint and clear coat: finish stays sharp for years"),
 'light': ("Yengil konstruksiya: g'ildirak massasi kamayadi, boshqaruv aniqroq", "Облегчённая конструкция снижает неподрессоренные массы и улучшает управляемость", "Lightweight build reduces unsprung mass for sharper handling"),
 'motor': ("Motorsportdan olingan dizayn", "Дизайн, перенесённый из автоспорта", "Design carried over from motorsport"),
 'warranty': ("Do'kon kafolati: 12 oy", "Гарантия магазина: 12 месяцев", "Shop warranty: 12 months"),
 'warranty24': ("Do'kon kafolati: 24 oy", "Гарантия магазина: 24 месяца", "Shop warranty: 24 months"),
 'oem_fit': ("Original mahkamlash nuqtalari: qo'shimcha qayta ishlash talab qilinmaydi", "Штатные крепления: доработка не требуется", "OEM mounting points: no modification required"),
 'plug': ("Plug-and-play ulanish, original simlar bilan mos", "Подключение plug-and-play к штатной проводке", "Plug-and-play fitment with the factory harness"),
 'canbus': ("CAN-bus xatosiz ishlaydi: bort kompyuterida xato chiqmaydi", "Работает без ошибок CAN-bus: бортовой компьютер не выдаёт сообщений", "CAN-bus ready: no dashboard errors or hyper-flash"),
 'ip67': ("IP67 himoya: chang va suvdan to'liq himoyalangan", "Защита IP67: полная пыле- и влагозащита", "IP67 rated: fully dust and water protected"),
 'led': ("Yuqori yorug'likli LED manbalar, xizmat muddati 30 000 soat", "Мощные светодиоды, ресурс до 30 000 часов", "High-output LEDs rated for up to 30,000 hours"),
 'dyn': ("Ketma-ket (dinamik) burilish ko'rsatkichi", "Динамический (бегущий) указатель поворота", "Sequential dynamic turn signal"),
 'drl': ("Yorqin kunduzgi yurish chiroqlari (DRL)", "Яркие дневные ходовые огни (DRL)", "Bright daytime running lights (DRL)"),
 'projector': ("Aniq kesim chizig'iga ega proyektor linza: qarshi haydovchini ko'r qilmaydi", "Проекторная линза с чёткой отсечкой: не слепит встречных водителей", "Projector lens with a sharp cut-off: no glare for oncoming drivers"),
 'ece': ("ECE / DOT talablariga mos", "Соответствует требованиям ECE / DOT", "ECE / DOT compliant"),
 'smoke': ("Tonirovkalangan (smoke) linza: zamonaviy sport ko'rinish", "Тонированная (smoke) линза: современный спортивный вид", "Smoked lens for a modern sport look"),
 'carbon': ("Haqiqiy uglerod tola (carbon fiber), 2x2 twill to'qima, UV-himoyali lak", "Настоящий углеволокно (карбон), плетение 2x2 twill, лак с УФ-защитой", "Genuine carbon fibre, 2x2 twill weave with UV-resistant clear coat"),
 'abs': ("Zarbaga chidamli ABS plastik, bo'yashga tayyor (primer bilan)", "Ударопрочный ABS-пластик, под покраску (в грунте)", "Impact-resistant ABS plastic, supplied primed and ready to paint"),
 'pu': ("Moslashuvchan poliuretan: yo'l to'siqlariga chidamli, sinmaydi", "Гибкий полиуретан: выдерживает бордюры и не трескается", "Flexible polyurethane: survives kerbs and won't crack"),
 'frp': ("Shisha tola (FRP) konstruksiya, yengil va mustahkam", "Конструкция из стеклопластика (FRP): лёгкая и жёсткая", "Fibreglass (FRP) construction, light and rigid"),
 'wind': ("Aerodinamik sinovdan o'tgan: yuqori tezlikda barqarorlikni oshiradi", "Аэродинамически проверен: повышает устойчивость на скорости", "Aero-tested: improves high-speed stability"),
 'tape': ("3M VHB qo'sh tomonlama lenta bilan o'rnatiladi, teshish shart emas", "Крепится на 3M VHB, сверлить кузов не нужно", "Mounts with 3M VHB tape: no drilling required"),
 'bolt': ("Mahkamlash to'plami (vint, qavs) kiradi", "В комплекте крепёж (винты, кронштейны)", "Mounting hardware included"),
 'adjust': ("Hujum burchagi sozlanadi (0–12°)", "Регулируемый угол атаки (0–12°)", "Adjustable angle of attack (0–12°)"),
 'gloss': ("Yorqin qora (gloss black) qoplama", "Глянцевое чёрное покрытие (gloss black)", "Gloss black finish"),
 'coil': ("32 darajali bosh va qayta tortish sozlamasi", "32-ступенчатая регулировка отбоя и сжатия", "32-way rebound and compression adjustment"),
 'height': ("Balandlik 30–60 mm oralig'ida bepul sozlanadi", "Высота кузова регулируется в диапазоне 30–60 мм", "Ride height adjustable between 30 and 60 mm"),
 'lower': ("Klirens 30 mm ga pasayadi: sport ko'rinish va past og'irlik markazi", "Занижение 30 мм: спортивный вид и более низкий центр тяжести", "30 mm drop: sportier stance and lower centre of gravity"),
 'comfort': ("Qulaylik saqlanadi: kundalik shahar haydashga mos", "Комфорт сохраняется: подходит для ежедневной городской езды", "Comfort preserved: suited to daily city driving"),
 'mono': ("Monotube konstruksiya, gaz bosimi bilan", "Монотрубная конструкция, газовое наполнение", "Monotube design, gas-pressure charged"),
 'steel': ("Zanglamaydigan po'lat korpus va rezba, tuzli yo'llarga chidamli", "Корпус и резьба из нержавеющей стали, устойчивы к реагентам", "Stainless steel body and thread, resistant to road salt"),
 'track': ("Trek va ko'cha uchun ishlab chiqilgan", "Разработана для трека и дорог общего пользования", "Developed for both track and street use"),
 'air': ("Havo bilan boshqariladigan podveska: bir tugma bilan balandlik o'zgaradi", "Пневмоподвеска: высота меняется одной кнопкой", "Air suspension: change ride height at the touch of a button"),
 'bush': ("Poliuretan vtulkalar: boshqaruv aniqligi oshadi", "Полиуретановые сайлентблоки: чётче реакция руля", "Polyurethane bushings: sharper steering response"),
 'alcantara': ("Alcantara qoplama, qo'lda tikilgan kontrast chok", "Отделка Alcantara, контрастная прошивка ручной работы", "Alcantara trim with hand-stitched contrast thread"),
 'leather': ("Birinchi navli teri (Nappa), nafas oluvchi perforatsiya", "Кожа Nappa первого сорта, перфорация для вентиляции", "Premium Nappa leather with breathable perforation"),
 'flat': ("Pastdan kesilgan (flat-bottom) shakl, 350 mm diametr", "Усечённая снизу форма (flat-bottom), диаметр 350 мм", "Flat-bottom shape, 350 mm diameter"),
 'fia': ("FIA 8855-1999 sertifikati: poyga uchun ruxsat etilgan", "Сертификат FIA 8855-1999: допущено к соревнованиям", "FIA 8855-1999 homologated for competition"),
 'airbag': ("Original airbag va rul tugmalari bilan mos (adapter bilan)", "Совместим со штатной подушкой и кнопками руля (через адаптер)", "Works with the factory airbag and wheel controls (via adapter)"),
 'carplay': ("Simsiz Apple CarPlay va Android Auto", "Беспроводные Apple CarPlay и Android Auto", "Wireless Apple CarPlay and Android Auto"),
 'qled': ("QLED ekran 2K, 8 yadroli protsessor, 8/128 GB xotira", "QLED-экран 2K, 8-ядерный процессор, 8/128 ГБ памяти", "2K QLED display, octa-core CPU, 8/128 GB memory"),
 'rgb': ("64 xil rang, telefon ilovasi orqali boshqariladi", "64 цвета, управление через приложение на смартфоне", "64 colours, controlled from a smartphone app"),
 'heat': ("Isitish funksiyasi va 3 darajali sozlash", "Функция подогрева, 3 уровня интенсивности", "Heating function with 3 intensity levels"),
 'perf': ("Perforatsiyalangan teri: yozda ham qulay", "Перфорированная кожа: комфорт даже летом", "Perforated leather keeps you cool in summer"),
 'custom': ("Avtomobil modeli uchun lekalo bo'yicha tikilgan", "Пошив по лекалам конкретной модели", "Tailored to the exact model pattern"),
 'ti': ("Titan quvurlar, og'irligi po'latga nisbatan 40% kam", "Титановые трубы, вес на 40% меньше стальных", "Titanium piping, 40% lighter than stainless steel"),
 'ss304': ("304 markali zanglamaydigan po'lat, kafolatlangan zanglamaslik", "Нержавеющая сталь 304, гарантия от коррозии", "304 stainless steel, built to resist corrosion"),
 'valve': ("Elektron klapan: pult va telefon orqali ovoz rejimi tanlanadi", "Электронная заслонка: режим звука через пульт и телефон", "Electronic valve: choose sound mode from remote or phone"),
 'sound': ("Chuqur va boy ovoz, tezlikda salon gulillashisiz", "Глубокий насыщенный звук без гула в салоне на трассе", "Deep, rich tone with no cabin drone at cruising speed"),
 'gain': ("Oqim 20% ga oshgan: quvvat va moment o'sishi", "Пропускная способность выше на 20%: прирост мощности и момента", "Up to 20% higher flow for a measurable power and torque gain"),
 'catback': ("Cat-back tizimi: katalizatordan keyingi to'liq qism", "Система cat-back: полная часть после катализатора", "Cat-back system: complete section after the catalytic converter"),
 'tips': ("Qo'sh 100 mm uchlik (tip), qizdirilganda ko'k rangga kiradi", "Двойные насадки 100 мм, при нагреве приобретают синий оттенок", "Dual 100 mm tips that take on a blue burn when hot"),
 'tig': ("TIG payvandlash, har bir chok qo'lda tekshiriladi", "TIG-сварка, каждый шов проверен вручную", "TIG-welded, every seam inspected by hand"),
 'wrapfilm': ("Havo kanalli plyonka: pufaksiz yopishtirish, qayta joylashtirish mumkin", "Плёнка с air-release каналами: без пузырей, возможна переклейка", "Air-release film: bubble-free application and repositionable"),
 'wrapyears': ("Xizmat muddati 5–7 yil, kuyishga va tirnalishga chidamli", "Срок службы 5–7 лет, стойкость к выцветанию и царапинам", "5–7 year service life, resists fading and scratches"),
 'strip': ("Olib tashlanganda kuzov bo'yog'iga zarar yetkazmaydi", "Снимается без вреда для заводского ЛКП", "Removes cleanly without damaging factory paint"),
 'ppf': ("O'z-o'zini tiklaydigan (self-healing) TPU qatlam: mayda tirnalishlar issiqlikda yo'qoladi", "Самовосстанавливающийся TPU-слой: мелкие царапины исчезают от тепла", "Self-healing TPU layer: light scratches vanish with heat"),
 'hydro': ("Gidrofob effekt: kir va suv yuzada ushlanmaydi", "Гидрофобный эффект: грязь и вода не задерживаются", "Hydrophobic effect: dirt and water slide right off"),
 'uv': ("99% UV va 60% infraqizil nurlarni to'sadi", "Блокирует 99% УФ и до 60% ИК-излучения", "Blocks 99% of UV and up to 60% of infrared heat"),
 'ceramic9h': ("9H qattiqlik: 2–3 yil himoya", "Твёрдость 9H: защита на 2–3 года", "9H hardness: 2–3 years of protection"),
 'wide': ("Kengligi 1,52 m: butun detalni bitta bo'lakda qoplaydi", "Ширина 1,52 м: детали оклеиваются цельным куском", "1.52 m wide: covers whole panels in a single piece"),
 'dash4k': ("4K (3840x2160) yozuv, Sony STARVIS 2 sensori", "Запись 4K (3840x2160), сенсор Sony STARVIS 2", "4K (3840x2160) recording with a Sony STARVIS 2 sensor"),
 'dual': ("Old va orqa kamera to'plami, tungi ko'rish yaxshilangan", "Комплект с передней и задней камерами, улучшенная ночная съёмка", "Front and rear camera set with enhanced night vision"),
 'wifi': ("Wi-Fi orqali telefonga ulanish, GPS yozuvi", "Подключение к смартфону по Wi-Fi, запись GPS", "Wi-Fi phone connection and GPS logging"),
 'park': ("Parkovka rejimi: to'xtab turganda ham yozadi", "Режим парковки: запись даже на стоянке", "Parking mode: records while the car is parked"),
 'brake6': ("6 porshenli monoblok kaliper, 380 mm teshikli disk", "6-поршневой моноблочный суппорт, перфорированный диск 380 мм", "6-piston monobloc caliper with 380 mm drilled rotor"),
 'pads': ("Past chang chiqaradigan seramik-organik kolodkalar", "Керамико-органические колодки с низким пылением", "Low-dust ceramic-organic compound pads"),
 'intake': ("Sovuq havo olish tizimi: dvigatel javobi tezlashadi", "Система холодного впуска: отклик двигателя становится острее", "Cold-air intake: noticeably crisper throttle response"),
 'rack': ("Yopiq yuk qutisi, 420 litr, ikki tomonlama ochiladi", "Закрытый бокс на 420 литров, открывается с обеих сторон", "420 litre roof box, opens from both sides"),
 'lug': ("Yengil po'lat yong'oq, 12x1.5, o'qlari kalitdan himoyalangan", "Лёгкие стальные гайки 12x1.5 с защитой от кражи", "Lightweight forged-steel lug nuts, 12x1.5 with anti-theft key"),
 'wintermat': ("3D lazer o'lchov bo'yicha tayyorlangan, chuqur qirrali: suv va loy chiqmaydi", "3D-лазерный замер, высокие борта: вода и грязь не выльются на пол", "Laser-measured 3D fit with deep raised edges: contains water and mud"),
 'sensor': ("Ishlash masofasi 0,3–2,5 m, ovoz va displey signali", "Дальность 0,3–2,5 м, звуковая и визуальная индикация", "0.3–2.5 m detection range with audible and visual alert"),
 'cam360': ("360° tasvir, 4 ta kamera, 1080p yozuv", "Обзор 360°, 4 камеры, запись 1080p", "360° surround view with 4 cameras and 1080p recording"),
 'radiator': ("2 qatlamli alyuminiy radiator: sovutish samaradorligi +35%", "Двухрядный алюминиевый радиатор: охлаждение эффективнее на 35%", "Double-core aluminium radiator: up to 35% better cooling"),
 'turbo': ("Turbo bosimini boshqarish: tez va aniq javob", "Точное управление давлением турбины: быстрый отклик", "Precise boost control for fast turbo response"),
 'install': ("Do'konda professional o'rnatish xizmati mavjud", "Доступна профессиональная установка в мастерской", "Professional installation available in our workshop"),
}

# ---------------------------------------------------------------- category intros ({brand},{name},{extra})
INTRO = {
 'wheels': (
   "{brand} {model} — {dia}\"x{wid}J disk, PCD {pcd}, ET{et}, rang: {col}.",
   "{brand} {model} — диск {dia}\"x{wid}J, PCD {pcd}, ET{et}, цвет: {col}.",
   "{brand} {model} — {dia}\"x{wid}J wheel, PCD {pcd}, ET{et}, finish: {col}."),
 'body_kit': ("{brand} ishlab chiqargan aerodinamik detal: avtomobilga sport ko'rinish beradi va old o'qdagi ko'tarilish kuchini kamaytiradi.",
              "Аэродинамический элемент {brand}: придаёт автомобилю спортивный вид и снижает подъёмную силу на передней оси.",
              "Aerodynamic component by {brand}: gives the car a sporty look and reduces front-axle lift."),
 'lighting': ("{brand} optikasi: yorug'lik quvvati va ko'rinishni yaxshilaydi, tungi haydashni xavfsiz qiladi.",
              "Оптика {brand}: повышает яркость и видимость, делает ночную езду безопаснее.",
              "{brand} lighting: improves output and visibility for safer night driving."),
 'spoiler': ("{brand} spoyleri: orqa o'qda bosim kuchini oshiradi va kuzovga to'liq sport ko'rinish beradi.",
             "Спойлер {brand}: увеличивает прижимную силу на задней оси и завершает спортивный образ кузова.",
             "{brand} spoiler: adds rear downforce and completes the sporty silhouette."),
 'suspension': ("{brand} podveska yechimi: boshqaruv aniqligi va kuzov barqarorligini oshiradi.",
                "Решение {brand} для подвески: повышает точность управления и устойчивость кузова.",
                "{brand} suspension solution: sharpens handling and body control."),
 'interior': ("{brand} salon detali: qulaylik va sport uslubini birlashtiradi.",
              "Элемент салона {brand}: сочетает комфорт и спортивный стиль.",
              "{brand} interior upgrade: blends comfort with a sporty character."),
 'exhaust': ("{brand} chiqarish tizimi: ovoz, oqim va ko'rinishni yaxshilaydi.",
             "Выпускная система {brand}: улучшает звук, пропускную способность и внешний вид.",
             "{brand} exhaust system: improves sound, flow and appearance."),
 'wrap_paint': ("{brand} qoplamasi: avtomobil rangini o'zgartiradi yoki kuzovni himoya qiladi.",
                "Покрытие {brand}: меняет цвет автомобиля или защищает кузов.",
                "{brand} coating: transforms the colour of your car or protects its paint."),
 'other': ("{brand} aksessuari: avtomobilingizga qo'shimcha funksiya va ishonch beradi.",
           "Аксессуар {brand}: добавляет автомобилю функциональность и надёжность.",
           "{brand} accessory: adds functionality and confidence to your car."),
}

COL = {  # finish name -> (swatch hex, ru, uz)
 'Satin Black': ('#1c1c1f', 'матовый чёрный', 'mat qora'),
 'Gloss Black': ('#0d0d10', 'глянцевый чёрный', 'yaltiroq qora'),
 'Matte Graphite': ('#3a3d42', 'матовый графит', 'mat grafit'),
 'Brushed Titanium': ('#8d9096', 'шлифованный титан', 'jilolangan titan'),
 'Gloss Silver': ('#b9bcc2', 'глянцевый серебристый', 'yaltiroq kumush'),
 'Bronze': ('#7a5a3a', 'бронза', 'bronza'),
 'Gold': ('#c9a24b', 'золото', 'oltin'),
 'Gunmetal': ('#4a4e55', 'тёмный металл', 'gunmetal'),
 'Hyper Silver': ('#a9adb4', 'гипер-серебро', 'giper kumush'),
 'White': ('#ececec', 'белый', 'oq'),
 'Black Chrome': ('#232428', 'чёрный хром', 'qora xrom'),
 'Candy Red': ('#a3121b', 'красный', 'qizil'),
}


def _col(n, lang):
    c = COL[n]
    return n if lang == 'en' else (c[1] if lang == 'ru' else c[2])


ITEMS = []


def _add(shop, cat, brand, name, price, stock, inst, attrs, fit, feats, img, model=None, extra=None):
    ITEMS.append(dict(shop=shop, cat=cat, brand=brand, name=name, price=price, stock=stock, inst=inst,
                      attrs=attrs, fit=fit, feats=feats, img=img, model=model, extra=extra))


def W(shop, brand, model, dia, wid, pcd, et, col, mat, price, stock, fit, feats, style, n, inst=90):
    attrs = dict(diameter=dia, width=wid, pcd=pcd, offset=et, swatch=COL[col][0], material=mat, color=col)
    if fit is UNI:
        attrs['universal'] = True
    name = f'{brand} {model} {dia}"x{wid}J {col}'
    _add(shop, 'wheels', brand, name, price, stock, inst, attrs, fit, feats,
         dict(k='wheel', style=style, n=n, col=COL[col][0], lip=('#d5d8dd' if col in ('Black Chrome', 'Gloss Black', 'Satin Black') else COL[col][0])),
         model=dict(model=model, dia=dia, wid=wid, pcd=pcd, et=et, col=col))


def G(shop, cat, brand, name, price, stock, inst, fit, feats, img, attrs=None, extra=None):
    a = dict(attrs or {})
    if fit is UNI:
        a['universal'] = True
    _add(shop, cat, brand, name, price, stock, inst, a, fit, feats, img, extra=extra)


# ================================================================ WHEELS (dubai mostly)
W('dubai', 'BBS', 'CH-R II', 19, 8.5, '5x114.3', 38, 'Satin Black', 'Flow-formed aluminium', 2150, 6, SEDAN_114, ['flow', 'jwl', 'set4', 'tpms', 'warranty'], 'split', 5)
W('dubai', 'BBS', 'LM', 19, 9, '5x112', 35, 'Gold', 'Forged aluminium', 3480, 3, GERMAN_112, ['forged', 'concave', 'finish', 'set4', 'warranty24'], 'mesh', 20, 140)
W('dubai', 'BBS', 'SR', 18, 8, '5x114.3', 40, 'Hyper Silver', 'Flow-formed aluminium', 1480, 8, SEDAN_114 + SUV_114, ['flow', 'light', 'jwl', 'set4'], 'multi', 10)
W('dubai', 'Vossen', 'CVT', 20, 9, '5x114.3', 35, 'Matte Graphite', 'Flow-formed aluminium', 2380, 5, SEDAN_114 + SUV_114, ['flow', 'concave', 'finish', 'set4', 'tpms'], 'disc', 5)
W('dubai', 'Vossen', 'HF-5', 19, 8.5, '5x114.3', 35, 'Brushed Titanium', 'Flow-formed aluminium', 2260, 4, SEDAN_114, ['flow', 'concave', 'finish', 'set4'], 'multi', 5)
W('dubai', 'Vossen', 'S17-01', 20, 9, '5x112', 35, 'Bronze', 'Flow-formed aluminium', 2640, 4, GERMAN_112, ['flow', 'concave', 'finish', 'set4', 'warranty'], 'multi', 5)
W('dubai', 'Vossen', 'HF-3', 18, 8, '5x114.3', 40, 'Gloss Black', 'Flow-formed aluminium', 1790, 9, SEDAN_114, ['flow', 'light', 'set4', 'tpms'], 'multi', 5)
W('dubai', 'OZ Racing', 'Ultraleggera HLT', 19, 8.5, '5x112', 38, 'Gloss Black', 'Forged aluminium', 2980, 3, GERMAN_112, ['forged', 'light', 'motor', 'jwl', 'set4'], 'multi', 10, 120)
W('dubai', 'OZ Racing', 'Alleggerita HLT', 18, 8, '5x115', 40, 'Gunmetal', 'Flow-formed aluminium', 1620, 5, MALIBU, ['flow', 'light', 'motor', 'set4'], 'multi', 5)
W('dubai', 'Rotiform', 'LAS-R', 19, 8.5, '5x114.3', 38, 'Gloss Silver', 'Cast aluminium', 1990, 4, SEDAN_114, ['cast', 'concave', 'finish', 'set4'], 'mesh', 10)
W('dubai', 'Rotiform', 'BLQ-C', 19, 8.5, '5x112', 35, 'Matte Graphite', 'Cast aluminium', 1890, 5, GERMAN_112, ['cast', 'concave', 'finish', 'set4', 'tpms'], 'multi', 10)
W('dubai', 'Enkei', 'RPF1', 17, 9, '5x114.3', 35, 'Hyper Silver', 'Flow-formed aluminium', 1120, 10, SEDAN_114, ['light', 'motor', 'jwl', 'set4'], 'multi', 10)
W('dubai', 'Enkei', 'RPF1', 16, 7, '4x100', 40, 'Gloss Silver', 'Cast aluminium', 640, 12, G_4X100, ['light', 'motor', 'jwl', 'set4'], 'multi', 10, 60)
W('dubai', 'Rays', 'Volk Racing TE37 Ultra', 18, 9.5, '5x114.3', 22, 'Bronze', 'Forged aluminium', 4950, 2, SEDAN_114, ['forged', 'light', 'motor', 'jwl', 'warranty24'], 'multi', 6, 150)
W('dubai', 'Work', 'Meister S1 3P', 19, 9.5, '5x114.3', 22, 'Black Chrome', 'Forged aluminium', 5280, 2, SEDAN_114, ['forged', 'concave', 'finish', 'set4', 'warranty24'], 'split', 5, 150)
W('dubai', 'HRE', 'P101', 20, 9, '5x112', 30, 'Gunmetal', 'Forged aluminium', 6900, 2, GERMAN_112, ['forged', 'concave', 'finish', 'set4', 'warranty24'], 'multi', 5, 180)
W('dubai', 'Forgestar', 'F14 Drag', 19, 9, '5x114.3', 30, 'Gloss Black', 'Forged aluminium', 3950, 3, SEDAN_114, ['forged', 'light', 'track', 'set4'], 'multi', 5)
W('dubai', 'Advan', 'RG-D2', 18, 8, '5x114.3', 45, 'Gunmetal', 'Cast aluminium', 1380, 6, SEDAN_114 + SUV_114, ['cast', 'motor', 'jwl', 'set4'], 'multi', 10)
W('dubai', 'Konig', 'Countergram', 18, 8.5, '5x114.3', 30, 'Gunmetal', 'Flow-formed aluminium', 760, 14, SEDAN_114, ['flow', 'light', 'set4', 'tpms'], 'multi', 5, 70)
W('dubai', 'Brabus', 'Monoblock Z', 19, 8.5, '5x112', 38, 'Gloss Silver', 'Forged aluminium', 5400, 2, [F('mercedes-benz-e-class', 2016, 2024)], ['forged', 'concave', 'finish', 'warranty24', 'set4'], 'multi', 10, 160)
W('dubai', 'Black Rhino', 'Sidewinder', 20, 9, '6x139.7', 12, 'Gloss Black', 'Cast aluminium', 1560, 5, LC, ['cast', 'concave', 'finish', 'set4'], 'disc', 6)
W('dubai', 'Kosei', 'K1 TS', 16, 7, '4x100', 40, 'Hyper Silver', 'Cast aluminium', 420, 18, G_4X100, ['cast', 'light', 'jwl', 'set4'], 'multi', 5, 50)
W('fergana', 'Vossen', 'CV3-R', 17, 8, '4x100', 38, 'Matte Graphite', 'Cast aluminium', 980, 8, G_4X100, ['cast', 'concave', 'finish', 'set4'], 'multi', 5, 60)
W('samarkand', 'Tomason', 'TN4', 17, 7.5, '5x105', 40, 'Gunmetal', 'Cast aluminium', 720, 9, TRACKER, ['cast', 'finish', 'set4', 'tpms'], 'multi', 5, 60)
W('autotune', 'Rotiform', 'RSE', 18, 8, '5x114.3', 38, 'Hyper Silver', 'Cast aluminium', 1460, 5, SUV_114, ['cast', 'concave', 'finish', 'set4'], 'mesh', 12)

# ================================================================ BODY KITS (apex + fergana)
G('apex', 'body_kit', 'AC Schnitzer', 'AC Schnitzer Front Spoiler Elements BMW 5 Series G30', 1180, 3, 320, [F('bmw-5-series', 2017, 2023)], ['carbon', 'tape', 'bolt', 'wind'], dict(k='car', part='lip', col='#2d3138'), dict(color='Carbon', material='Carbon fibre'))
G('apex', 'body_kit', 'Brabus', 'Brabus Aero Front Lip Mercedes E-Class W213', 1650, 2, 380, [F('mercedes-benz-e-class', 2016, 2024)], ['carbon', 'wind', 'oem_fit', 'warranty24'], dict(k='car', part='lip', col='#23262b'), dict(material='Carbon fibre'))
G('apex', 'body_kit', 'Carbon Garage', 'Carbon Garage Rear Diffuser BMW 5 Series G30', 890, 3, 240, [F('bmw-5-series', 2017, 2023)], ['carbon', 'wind', 'bolt'], dict(k='car', part='diffuser', col='#2d3138'), dict(material='Carbon fibre'))
G('apex', 'body_kit', 'Apex Aero', 'Apex Aero Full Body Kit Chevrolet Cobalt Sport', 420, 6, 280, [F('chevrolet-cobalt', 2012, 2025)], ['abs', 'pu', 'bolt', 'wind'], dict(k='car', part='full', col='#3b82f6'), dict(color='Primer'))
G('apex', 'body_kit', 'Apex Aero', 'Apex Aero Front Bumper Lip Chevrolet Gentra', 160, 14, 70, [F('chevrolet-gentra', 2013, 2025)], ['abs', 'tape', 'bolt'], dict(k='car', part='lip', col='#1f2937'), dict(color='Gloss Black'))
G('apex', 'body_kit', 'Apex Aero', 'Apex Aero Side Skirts Chevrolet Gentra', 190, 9, 90, [F('chevrolet-gentra', 2013, 2025)], ['abs', 'pu', 'tape'], dict(k='car', part='skirt', col='#1f2937'), dict(color='Primer'))
G('apex', 'body_kit', 'Apex Aero', 'Apex Aero GT Rear Diffuser Chevrolet Cobalt', 210, 8, 90, [F('chevrolet-cobalt', 2012, 2025)], ['abs', 'wind', 'bolt'], dict(k='car', part='diffuser', col='#1f2937'), dict(color='Gloss Black'))
G('apex', 'body_kit', 'Hamann', 'Hamann Wide Fender Flares Toyota Land Cruiser 300', 2850, 1, 650, [F('toyota-land-cruiser', 2021, 2025)], ['frp', 'bolt', 'wind', 'warranty24'], dict(k='car', part='flare', col='#4b5563'), dict(material='Fibreglass'))
G('apex', 'body_kit', 'Duke Dynamics', 'Duke Dynamics Front Bumper Kia K5 GT-Line Aero', 760, 3, 260, [F('kia-k5', 2019, 2025)], ['abs', 'pu', 'oem_fit', 'bolt'], dict(k='car', part='bumper', col='#374151'), dict(color='Primer'))
G('apex', 'body_kit', 'Maxton Design', 'Maxton Design Front Splitter Hyundai Sonata DN8', 340, 5, 120, [F('hyundai-sonata', 2019, 2025)], ['abs', 'tape', 'bolt', 'gloss'], dict(k='car', part='lip', col='#111827'), dict(color='Gloss Black'))
G('apex', 'body_kit', 'Maxton Design', 'Maxton Design Side Skirts Hyundai Sonata DN8', 380, 4, 140, [F('hyundai-sonata', 2019, 2025)], ['abs', 'tape', 'gloss'], dict(k='car', part='skirt', col='#111827'), dict(color='Gloss Black'))
G('apex', 'body_kit', 'Larte Design', 'Larte Design Aero Kit Toyota Camry XV70 (Front + Side + Rear)', 1420, 2, 450, [F('toyota-camry', 2018, 2025)], ['abs', 'pu', 'wind', 'bolt', 'warranty'], dict(k='car', part='full', col='#ef4444'), dict(color='Primer'))
G('fergana', 'body_kit', 'Duke Dynamics', 'Duke Dynamics Front Lip Chevrolet Malibu', 280, 6, 110, MALIBU, ['abs', 'tape', 'wind'], dict(k='car', part='lip', col='#1f2937'), dict(color='Gloss Black'))
G('fergana', 'body_kit', 'Apex Aero', 'Wide Fender Flares Set 4 pcs Universal 50 mm', 240, 10, 160, UNI, ['pu', 'bolt', 'tape'], dict(k='car', part='flare', col='#475569'), dict(color='Matte Black'))
G('fergana', 'body_kit', 'Carbon Garage', 'Carbon Garage Hood Chevrolet Tracker', 1290, 2, 200, [F('chevrolet-tracker', 2020, 2025)], ['carbon', 'oem_fit', 'wind', 'warranty'], dict(k='car', part='hood', col='#2d3138'), dict(material='Carbon fibre'))
G('apex', 'body_kit', 'Rowen', 'Rowen Carbon Front Canards Pair Universal', 310, 6, 80, UNI, ['carbon', 'tape', 'wind'], dict(k='car', part='lip', col='#2d3138'), dict(material='Carbon fibre'))
G('apex', 'body_kit', 'Liberty Walk', 'Liberty Walk Style Over-Fender Kit Toyota Camry', 3200, 1, 900, [F('toyota-camry', 2018, 2025)], ['frp', 'bolt', 'wind', 'warranty'], dict(k='car', part='flare', col='#f59e0b'), dict(color='Primer'))
G('samarkand', 'body_kit', 'Duke Dynamics', 'Duke Dynamics Front Splitter Kia Sportage NQ5', 420, 4, 140, [F('kia-sportage', 2021, 2025)], ['abs', 'pu', 'tape', 'wind'], dict(k='car', part='lip', col='#1f2937'), dict(color='Gloss Black'))
G('samarkand', 'body_kit', 'Apex Aero', 'Rear Bumper Diffuser Chevrolet Onix Sport', 195, 7, 90, [F('chevrolet-onix', 2020, 2025)], ['abs', 'bolt', 'wind'], dict(k='car', part='diffuser', col='#1f2937'), dict(color='Gloss Black'))

# ================================================================ LIGHTING
G('samarkand', 'lighting', 'Depo', 'Depo Full LED Headlights Toyota Camry XV70 Sport Look', 890, 5, 180, [F('toyota-camry', 2018, 2024)], ['led', 'projector', 'drl', 'dyn', 'plug', 'ece', 'warranty'], dict(k='head', col='#7dd3fc', amber=True))
G('samarkand', 'lighting', 'Vland', 'Vland LED Tail Lights Kia K5 Sequential', 540, 6, 140, [F('kia-k5', 2019, 2025)], ['led', 'dyn', 'plug', 'canbus', 'smoke'], dict(k='tail', col='#ef4444', bar=True))
G('samarkand', 'lighting', 'Vland', 'Vland Smoked LED Tail Lights Hyundai Sonata DN8', 510, 5, 140, [F('hyundai-sonata', 2019, 2025)], ['led', 'dyn', 'smoke', 'plug', 'canbus'], dict(k='tail', col='#7f1d1d', bar=True))
G('samarkand', 'lighting', 'TYC', 'TYC Projector LED Headlights Chevrolet Cobalt', 380, 8, 130, [F('chevrolet-cobalt', 2012, 2025)], ['led', 'projector', 'drl', 'dyn', 'plug', 'warranty'], dict(k='head', col='#93c5fd', amber=False))
G('samarkand', 'lighting', 'TYC', 'TYC Angel-Eye LED Headlights Chevrolet Gentra', 420, 6, 130, [F('chevrolet-gentra', 2013, 2025)], ['led', 'projector', 'drl', 'plug', 'ece'], dict(k='head', col='#bae6fd', amber=False))
G('samarkand', 'lighting', 'Eagle Eyes', 'Eagle Eyes LED Headlights Chevrolet Malibu', 620, 3, 150, MALIBU, ['led', 'projector', 'drl', 'dyn', 'ece'], dict(k='head', col='#7dd3fc', amber=True))
G('samarkand', 'lighting', 'Morimoto', 'Morimoto XB LED Headlights Hyundai Elantra CN7', 780, 3, 170, [F('hyundai-elantra', 2020, 2025)], ['led', 'projector', 'drl', 'dyn', 'plug', 'warranty24'], dict(k='head', col='#67e8f9', amber=True))
G('apex', 'lighting', 'Vland', 'Vland Dynamic LED Tail Lights Chevrolet Cobalt', 360, 7, 120, [F('chevrolet-cobalt', 2012, 2025)], ['led', 'dyn', 'plug', 'canbus'], dict(k='tail', col='#ef4444', bar=False))
G('apex', 'lighting', 'Osram', 'Osram LEDriving H7 Night Breaker LED Pair', 125, 40, 20, UNI, ['led', 'canbus', 'ip67', 'ece', 'warranty'], dict(k='bulb', col='#e0f2fe'))
G('apex', 'lighting', 'Philips', 'Philips Ultinon Pro9100 H7 LED Pair 5800K', 145, 35, 20, UNI, ['led', 'canbus', 'ip67', 'ece'], dict(k='bulb', col='#f0f9ff'))
G('apex', 'lighting', 'Aozoom', 'Aozoom Bi-LED Projector Lens 3.0" Retrofit Kit', 330, 10, 160, UNI, ['led', 'projector', 'ip67', 'warranty'], dict(k='lens', col='#38bdf8'))
G('fergana', 'lighting', 'Hella', 'Hella Rallye 4000 LED Driving Lights Pair', 420, 6, 90, UNI, ['led', 'ip67', 'ece'], dict(k='fog', col='#fef08a'))
G('fergana', 'lighting', 'Diode Dynamics', 'Diode Dynamics SS3 Pro Yellow LED Fog Lights', 290, 8, 80, UNI, ['led', 'ip67', 'warranty24'], dict(k='fog', col='#facc15'))
G('fergana', 'lighting', 'Baja Designs', 'Baja Designs 40" LED Light Bar Combo', 960, 3, 140, UNI, ['led', 'ip67', 'warranty24'], dict(k='bar_light', col='#e0f2fe'))
G('bukhara', 'lighting', 'Apex Aero', 'Apex 8-LED Underglow Kit RGB App Control', 95, 25, 40, UNI, ['rgb', 'ip67', 'bolt'], dict(k='glow', col='#a78bfa'))
G('bukhara', 'lighting', 'Vland', 'Vland LED Tail Lights Chevrolet Tracker Full Width Bar', 480, 4, 130, [F('chevrolet-tracker', 2020, 2025)], ['led', 'dyn', 'plug', 'canbus'], dict(k='tail', col='#ef4444', bar=True))

# ================================================================ SPOILERS
G('apex', 'spoiler', 'APR Performance', 'APR GTC-300 Adjustable Wing 61" Carbon', 1890, 2, 180, UNI, ['carbon', 'adjust', 'wind', 'bolt', 'warranty24'], dict(k='spoiler', type='gt', col='#2d3138'), dict(material='Carbon fibre'))
G('apex', 'spoiler', 'Voltex', 'Voltex Type 7 GT Wing 1500 mm Dry Carbon', 2450, 1, 200, UNI, ['carbon', 'adjust', 'wind', 'bolt'], dict(k='spoiler', type='gt', col='#1f2229'), dict(material='Carbon fibre'))
G('apex', 'spoiler', 'Maxton Design', 'Maxton Design Trunk Lip Spoiler Kia K5', 260, 7, 70, [F('kia-k5', 2019, 2025)], ['abs', 'tape', 'gloss'], dict(k='spoiler', type='lip', col='#111827'), dict(color='Gloss Black'))
G('apex', 'spoiler', 'Maxton Design', 'Maxton Design Trunk Spoiler Hyundai Sonata DN8', 290, 6, 70, [F('hyundai-sonata', 2019, 2025)], ['abs', 'tape', 'gloss'], dict(k='spoiler', type='lip', col='#111827'), dict(color='Gloss Black'))
G('apex', 'spoiler', 'TRD Style', 'TRD Style Duckbill Spoiler Toyota Camry', 310, 5, 80, [F('toyota-camry', 2018, 2025)], ['abs', 'tape', 'wind'], dict(k='spoiler', type='duck', col='#1f2937'), dict(color='Gloss Black'))
G('apex', 'spoiler', 'Apex Aero', 'Apex Aero Ducktail Spoiler Chevrolet Gentra', 120, 15, 40, [F('chevrolet-gentra', 2013, 2025)], ['abs', 'tape', 'gloss'], dict(k='spoiler', type='duck', col='#111827'), dict(color='Gloss Black'))
G('apex', 'spoiler', 'Apex Aero', 'Apex Aero GT Wing Chevrolet Cobalt Carbon Look', 165, 10, 60, [F('chevrolet-cobalt', 2012, 2025)], ['abs', 'adjust', 'bolt'], dict(k='spoiler', type='gt', col='#374151'), dict(color='Carbon look'))
G('fergana', 'spoiler', 'Duke Dynamics', 'Duke Dynamics Trunk Spoiler Chevrolet Malibu', 210, 6, 60, MALIBU, ['abs', 'tape', 'wind'], dict(k='spoiler', type='lip', col='#111827'), dict(color='Gloss Black'))
G('fergana', 'spoiler', 'Carbon Garage', 'Carbon Garage M-Performance Spoiler BMW 5 Series G30', 640, 3, 100, [F('bmw-5-series', 2017, 2023)], ['carbon', 'tape', 'wind', 'oem_fit'], dict(k='spoiler', type='lip', col='#2d3138'), dict(material='Carbon fibre'))
G('fergana', 'spoiler', 'Brabus', 'Brabus Style Trunk Spoiler Mercedes E-Class W213', 590, 3, 100, [F('mercedes-benz-e-class', 2016, 2024)], ['carbon', 'tape', 'wind', 'oem_fit'], dict(k='spoiler', type='lip', col='#23262b'), dict(material='Carbon fibre'))
G('samarkand', 'spoiler', 'Apex Aero', 'Roof Spoiler Chevrolet Tracker Gloss Black', 185, 8, 50, [F('chevrolet-tracker', 2020, 2025)], ['abs', 'tape', 'wind'], dict(k='spoiler', type='roof', col='#111827'), dict(color='Gloss Black'))
G('samarkand', 'spoiler', 'Maxton Design', 'Maxton Design Roof Spoiler Kia Sportage', 230, 5, 60, [F('kia-sportage', 2016, 2025)], ['abs', 'tape', 'wind'], dict(k='spoiler', type='roof', col='#1f2937'), dict(color='Gloss Black'))
G('bukhara', 'spoiler', 'Vorsteiner', 'Vorsteiner Style Carbon Rear Spoiler BYD Han', 520, 3, 90, [F('byd-han', 2020, 2025)], ['carbon', 'tape', 'wind'], dict(k='spoiler', type='lip', col='#2d3138'), dict(material='Carbon fibre'))
G('bukhara', 'spoiler', 'Maxton Design', 'Maxton Design Carbon Trunk Lip BYD Seal', 480, 3, 90, [F('byd-seal', 2022, 2025)], ['carbon', 'tape', 'wind'], dict(k='spoiler', type='lip', col='#2d3138'), dict(material='Carbon fibre'))

# ================================================================ SUSPENSION (autotune)
G('autotune', 'suspension', 'KW', 'KW V3 Coilover Kit BMW 5 Series G30', 3290, 2, 450, [F('bmw-5-series', 2017, 2023)], ['coil', 'height', 'steel', 'track', 'warranty24'], dict(k='coilover', col='#facc15'))
G('autotune', 'suspension', 'KW', 'KW V1 Coilover Kit Mercedes E-Class W213', 2180, 2, 420, [F('mercedes-benz-e-class', 2016, 2024)], ['height', 'steel', 'comfort', 'warranty24'], dict(k='coilover', col='#facc15'))
G('autotune', 'suspension', 'Bilstein', 'Bilstein B14 PSS Coilover Toyota Camry', 1480, 3, 380, [F('toyota-camry', 2018, 2025)], ['height', 'mono', 'steel', 'comfort', 'warranty24'], dict(k='coilover', col='#2563eb'))
G('autotune', 'suspension', 'Bilstein', 'Bilstein B8 Performance Shock Absorbers Kia K5 (Set 4)', 960, 4, 300, [F('kia-k5', 2019, 2025)], ['mono', 'track', 'comfort', 'warranty'], dict(k='shock', col='#facc15'))
G('autotune', 'suspension', 'TEIN', 'TEIN Flex Z Coilover Hyundai Sonata DN8', 1320, 3, 380, [F('hyundai-sonata', 2019, 2025)], ['height', 'coil', 'steel', 'warranty24'], dict(k='coilover', col='#ef4444'))
G('autotune', 'suspension', 'BC Racing', 'BC Racing BR Series Coilover Chevrolet Malibu', 1180, 3, 360, MALIBU, ['height', 'coil', 'steel', 'track'], dict(k='coilover', col='#3b82f6'))
G('autotune', 'suspension', 'BC Racing', 'BC Racing BR Series Coilover Chevrolet Cobalt', 690, 5, 260, [F('chevrolet-cobalt', 2012, 2025)], ['height', 'coil', 'steel'], dict(k='coilover', col='#ef4444'))
G('autotune', 'suspension', 'Eibach', 'Eibach Pro-Kit Lowering Springs Hyundai Elantra', 290, 10, 220, [F('hyundai-elantra', 2020, 2025)], ['lower', 'comfort', 'warranty24'], dict(k='spring', col='#ef4444'))
G('autotune', 'suspension', 'Eibach', 'Eibach Pro-Kit Lowering Springs Chevrolet Gentra', 190, 14, 180, [F('chevrolet-gentra', 2013, 2025)], ['lower', 'comfort'], dict(k='spring', col='#ef4444'))
G('autotune', 'suspension', 'H&R', 'H&R Sport Springs Kia Sportage', 320, 7, 240, [F('kia-sportage', 2016, 2025)], ['lower', 'comfort', 'warranty24'], dict(k='spring', col='#2563eb'))
G('autotune', 'suspension', 'Air Lift', 'Air Lift Performance 3H Air Suspension Kit Toyota Land Cruiser', 3890, 1, 700, LC, ['air', 'height', 'track', 'warranty'], dict(k='air', col='#9ca3af'))
G('autotune', 'suspension', 'Accuair', 'Accuair e-Level Air Suspension Management Kit', 2260, 2, 500, UNI, ['air', 'height', 'warranty'], dict(k='air', col='#374151'))
G('autotune', 'suspension', 'Whiteline', 'Whiteline Front Sway Bar 27 mm Adjustable', 245, 8, 140, [F('chevrolet-cobalt', 2012, 2025), F('chevrolet-gentra', 2013, 2025)], ['bush', 'track'], dict(k='bar', col='#ef4444'))
G('autotune', 'suspension', 'Powerflex', 'Powerflex Black Series Polyurethane Bushing Kit', 210, 12, 160, UNI, ['bush', 'steel', 'warranty'], dict(k='bar', col='#111827'))
G('autotune', 'suspension', 'Cusco', 'Cusco Front Strut Tower Brace', 260, 6, 70, UNI, ['steel', 'track', 'bolt'], dict(k='bar', col='#ef4444'))
G('bukhara', 'suspension', 'KYB', 'KYB Excel-G Gas Shock Absorbers Chevrolet Gentra (Set 4)', 240, 16, 160, [F('chevrolet-gentra', 2013, 2025)], ['mono', 'comfort', 'warranty'], dict(k='shock', col='#facc15'))

# ================================================================ INTERIOR
G('samarkand', 'interior', 'Recaro', 'Recaro Sportster CS Sport Seat Alcantara Black', 1280, 4, 220, UNI, ['alcantara', 'fia', 'heat', 'warranty24'], dict(k='seat', col='#1f2937', acc='#ef4444'))
G('samarkand', 'interior', 'Recaro', 'Recaro Pole Position Racing Seat Carbon FIA', 2150, 2, 260, UNI, ['carbon', 'fia', 'alcantara', 'warranty24'], dict(k='seat', col='#111827', acc='#f59e0b'))
G('samarkand', 'interior', 'Sparco', 'Sparco Evo QRT Performance Seat Pair', 990, 5, 200, UNI, ['alcantara', 'track', 'warranty'], dict(k='seat', col='#27272a', acc='#3b82f6'))
G('samarkand', 'interior', 'Momo', 'Momo Prototipo 350 mm Flat-Bottom Steering Wheel Leather', 420, 8, 110, UNI, ['leather', 'flat', 'airbag'], dict(k='wheelsteer', col='#18181b', acc='#ef4444'))
G('samarkand', 'interior', 'Sparco', 'Sparco Corsa 335 Racing Steering Wheel Suede', 390, 6, 110, UNI, ['alcantara', 'flat', 'fia'], dict(k='wheelsteer', col='#18181b', acc='#3b82f6'))
G('samarkand', 'interior', 'Hamann', 'Hamann Carbon Flat-Bottom Steering Wheel BMW 5 Series G30', 1450, 2, 240, [F('bmw-5-series', 2017, 2023)], ['carbon', 'alcantara', 'flat', 'airbag', 'warranty'], dict(k='wheelsteer', col='#0f172a', acc='#60a5fa'))
G('autotune', 'interior', 'Teyes', 'Teyes CC3 2K Android Head Unit Chevrolet Malibu', 590, 7, 120, MALIBU, ['carplay', 'qled', 'plug', 'warranty'], dict(k='screen', col='#0ea5e9'))
G('autotune', 'interior', 'Teyes', 'Teyes CC3 2K Android Head Unit Kia K5 / Sonata', 620, 6, 120, [F('kia-k5', 2019, 2025), F('hyundai-sonata', 2019, 2025)], ['carplay', 'qled', 'plug', 'warranty'], dict(k='screen', col='#22c55e'))
G('autotune', 'interior', 'Carlinkit', 'Carlinkit Tbox Ambient Android Box', 160, 20, 30, UNI, ['carplay', 'wifi'], dict(k='screen', col='#a78bfa'))
G('apex', 'interior', 'Apex Aero', 'Ambient Interior Light Kit 64 Colours Fibre Optic', 135, 22, 90, UNI, ['rgb', 'plug', 'canbus'], dict(k='ambient', col='#a78bfa'))
G('apex', 'interior', 'Alcantara', 'Alcantara Dashboard Wrap Kit Toyota Camry', 780, 3, 350, [F('toyota-camry', 2018, 2025)], ['alcantara', 'custom', 'oem_fit'], dict(k='dash', col='#1f2937', acc='#ef4444'))
G('fergana', 'interior', 'Apex Aero', 'Nappa Leather Seat Covers Full Set Chevrolet Gentra', 340, 8, 120, [F('chevrolet-gentra', 2013, 2025)], ['leather', 'perf', 'custom', 'heat'], dict(k='seat', col='#3f3f46', acc='#d4a574'))
G('fergana', 'interior', 'Apex Aero', 'Nappa Leather Seat Covers Full Set Chevrolet Cobalt', 340, 9, 120, [F('chevrolet-cobalt', 2012, 2025)], ['leather', 'perf', 'custom', 'heat'], dict(k='seat', col='#27272a', acc='#ef4444'))
G('bukhara', 'interior', 'Apex Aero', 'Carbon Pedal Set Sport Aluminium (3 pcs)', 75, 30, 30, UNI, ['abs', 'bolt', 'oem_fit'], dict(k='pedals', col='#52525b'))
G('bukhara', 'interior', 'Weathertech', 'Weathertech 3D Floor Mats Toyota Camry Full Set', 260, 8, 0, [F('toyota-camry', 2018, 2025)], ['wintermat', 'custom', 'warranty'], dict(k='mats', col='#1f2937'))
G('bukhara', 'interior', 'Weathertech', 'Weathertech 3D Floor Mats Chevrolet Malibu Full Set', 245, 8, 0, MALIBU, ['wintermat', 'custom', 'warranty'], dict(k='mats', col='#292524'))

# ================================================================ EXHAUST
G('autotune', 'exhaust', 'Akrapovič', 'Akrapovič Evolution Line Titanium Cat-Back BMW 5 Series G30', 6900, 1, 450, [F('bmw-5-series', 2017, 2023)], ['ti', 'catback', 'valve', 'sound', 'tips', 'warranty24'], dict(k='exhaust', tips=4, tipcol='blue', body='#9ca3af'))
G('autotune', 'exhaust', 'Remus', 'Remus Sport Exhaust Mercedes E-Class W213 E300', 3280, 2, 380, [F('mercedes-benz-e-class', 2016, 2024)], ['ss304', 'catback', 'valve', 'sound', 'tips', 'warranty24'], dict(k='exhaust', tips=2, tipcol='black', body='#9ca3af'))
G('autotune', 'exhaust', 'Milltek Sport', 'Milltek Sport Cat-Back Toyota Camry 2.5', 1480, 3, 280, [F('toyota-camry', 2018, 2025)], ['ss304', 'catback', 'sound', 'tips', 'tig', 'warranty24'], dict(k='exhaust', tips=2, tipcol='chrome', body='#a1a1aa'))
G('autotune', 'exhaust', 'Borla', 'Borla S-Type Cat-Back Kia Stinger 3.3T', 2150, 2, 320, [F('kia-stinger', 2018, 2023)], ['ss304', 'catback', 'sound', 'gain', 'tig', 'warranty24'], dict(k='exhaust', tips=2, tipcol='chrome', body='#a1a1aa'))
G('autotune', 'exhaust', 'Fi Exhaust', 'Fi Exhaust Valvetronic Muffler Kia K5 2.5 with Remote', 1180, 4, 260, [F('kia-k5', 2019, 2025)], ['ss304', 'valve', 'sound', 'tips', 'warranty'], dict(k='exhaust', tips=2, tipcol='blue', body='#9ca3af'))
G('autotune', 'exhaust', 'Fi Exhaust', 'Fi Exhaust Valvetronic Muffler Hyundai Sonata DN8', 1150, 4, 260, [F('hyundai-sonata', 2019, 2025)], ['ss304', 'valve', 'sound', 'tips', 'warranty'], dict(k='exhaust', tips=2, tipcol='blue', body='#9ca3af'))
G('autotune', 'exhaust', 'Invidia', 'Invidia N1 Cat-Back Chevrolet Malibu 2.0T', 980, 3, 240, MALIBU, ['ss304', 'catback', 'sound', 'gain', 'warranty'], dict(k='exhaust', tips=1, tipcol='ti', body='#a1a1aa'))
G('bukhara', 'exhaust', 'Apex Sound', 'Apex Sound Sport Muffler Chevrolet Gentra Stainless', 210, 12, 90, [F('chevrolet-gentra', 2013, 2025)], ['ss304', 'sound', 'tips', 'warranty'], dict(k='exhaust', tips=1, tipcol='chrome', body='#a1a1aa'))
G('bukhara', 'exhaust', 'Apex Sound', 'Apex Sound Sport Muffler Chevrolet Cobalt Dual Tip', 235, 10, 90, [F('chevrolet-cobalt', 2012, 2025)], ['ss304', 'sound', 'tips', 'tig', 'warranty'], dict(k='exhaust', tips=2, tipcol='chrome', body='#a1a1aa'))
G('bukhara', 'exhaust', 'Remus', 'Remus Stainless Tailpipe Tips 100 mm Pair Universal', 290, 14, 40, UNI, ['ss304', 'tips', 'bolt'], dict(k='tip', tipcol='blue'))
G('bukhara', 'exhaust', 'Smartpipe', 'Smartpipe Remote Exhaust Cutout Valve 63 mm Universal', 320, 9, 120, UNI, ['valve', 'ss304', 'sound'], dict(k='valve', body='#9ca3af'))
G('bukhara', 'exhaust', 'HKS', 'HKS Hi-Power Titanium Muffler Universal Single Tip', 760, 3, 150, UNI, ['ti', 'sound', 'tips'], dict(k='exhaust', tips=1, tipcol='blue', body='#d4d4d8'))
G('bukhara', 'exhaust', 'Tomei', 'Tomei Expreme Ti Cat-Back Universal 90 mm', 1180, 2, 200, UNI, ['ti', 'catback', 'gain', 'sound', 'tig'], dict(k='exhaust', tips=1, tipcol='blue', body='#d4d4d8'))
G('autotune', 'exhaust', 'Eisenmann', 'Eisenmann 200-Cell Sport Catalytic Downpipe Kia K5 GT', 890, 3, 300, [F('kia-k5', 2019, 2025)], ['ss304', 'gain', 'sound', 'tig'], dict(k='downpipe'))

# ================================================================ WRAP / PAINT (apex + fergana)
G('apex', 'wrap_paint', '3M', '3M 2080 Satin Black Metallic Wrap Film 1.52 x 18 m', 920, 6, 1400, UNI, ['wrapfilm', 'wrapyears', 'strip', 'wide'], dict(k='roll', col='#1f2933', sheen='#4b5563'), dict(color='Satin Black Metallic', material='Cast vinyl'))
G('apex', 'wrap_paint', 'Avery Dennison', 'Avery Dennison SW900 Matte Metallic Grey Wrap 1.52 x 18 m', 960, 5, 1400, UNI, ['wrapfilm', 'wrapyears', 'strip', 'wide'], dict(k='roll', col='#6b7280', sheen='#d1d5db'), dict(color='Matte Metallic Grey', material='Cast vinyl'))
G('apex', 'wrap_paint', 'Avery Dennison', 'Avery Dennison SW900 Colour Flow Chameleon Wrap 1.52 x 18 m', 1380, 3, 1600, UNI, ['wrapfilm', 'wrapyears', 'strip', 'wide'], dict(k='roll', col='#0ea5e9', sheen='#a21caf'), dict(color='Colour Flow', material='Cast vinyl'))
G('apex', 'wrap_paint', 'KPMF', 'KPMF Candy Red Gloss Wrap Film 1.52 x 18 m', 1040, 4, 1500, UNI, ['wrapfilm', 'wrapyears', 'strip', 'wide'], dict(k='roll', col='#b91c1c', sheen='#fecaca'), dict(color='Candy Red', material='Cast vinyl'))
G('apex', 'wrap_paint', 'Oracal', 'Oracal 970RA Matte Military Green Wrap 1.52 x 15 m', 780, 4, 1400, UNI, ['wrapfilm', 'strip', 'wide'], dict(k='roll', col='#4d5b3a', sheen='#a3b18a'), dict(color='Military Green', material='Cast vinyl'))
G('apex', 'wrap_paint', 'XPEL', 'XPEL Ultimate Plus PPF Clear Roll 1.52 x 15 m', 1850, 3, 2200, UNI, ['ppf', 'hydro', 'wrapyears', 'wide'], dict(k='ppf', col='#e0f2fe'), dict(color='Clear', material='TPU'))
G('apex', 'wrap_paint', 'XPEL', 'XPEL Stealth Satin PPF Roll 1.52 x 15 m', 2150, 2, 2400, UNI, ['ppf', 'hydro', 'wrapyears', 'wide'], dict(k='ppf', col='#9ca3af'), dict(color='Satin', material='TPU'))
G('apex', 'wrap_paint', 'SunTek', 'SunTek Ultra PPF Pre-Cut Front Bumper Kit Chevrolet Tracker', 380, 6, 260, [F('chevrolet-tracker', 2020, 2025)], ['ppf', 'hydro', 'custom'], dict(k='ppf', col='#bae6fd'), dict(color='Clear', material='TPU'))
G('fergana', 'wrap_paint', 'Llumar', 'Llumar CTX Ceramic Window Tint 35% Full Car Roll', 520, 10, 160, UNI, ['uv', 'wrapyears', 'strip'], dict(k='roll', col='#0f172a', sheen='#475569'), dict(color='Dark 35%', material='Ceramic film'))
G('fergana', 'wrap_paint', 'Llumar', 'Llumar Air Blue 50% Windshield Film Heat Shield', 240, 12, 90, UNI, ['uv', 'wrapyears'], dict(k='roll', col='#1e3a8a', sheen='#93c5fd'), dict(color='Blue 50%', material='Ceramic film'))
G('fergana', 'wrap_paint', 'Gtechniq', 'Gtechniq Crystal Serum Ultra Ceramic Coating 30 ml', 165, 18, 600, UNI, ['ceramic9h', 'hydro', 'wrapyears'], dict(k='bottle', col='#1d4ed8', label='#f8fafc'), dict(material='SiO2 / Ceramic'))
G('fergana', 'wrap_paint', 'Gyeon', 'Gyeon Q² Mohs+ Ceramic Coating 50 ml', 140, 20, 550, UNI, ['ceramic9h', 'hydro'], dict(k='bottle', col='#111827', label='#f97316'), dict(material='SiO2 / Ceramic'))
G('fergana', 'wrap_paint', 'Plasti Dip', 'Plasti Dip Matte Black Spray 311 g (Set of 6)', 85, 30, 0, UNI, ['strip', 'hydro'], dict(k='spray', col='#111827'), dict(color='Matte Black'))
G('fergana', 'wrap_paint', 'Apex Aero', '4D Gloss Carbon Fibre Vinyl 1.52 x 18 m', 210, 14, 400, UNI, ['wrapfilm', 'strip', 'wide'], dict(k='roll', col='#18181b', sheen='#52525b'), dict(color='Gloss Carbon', material='Vinyl'))

# ================================================================ OTHER (autotune/bukhara/fergana)
G('autotune', 'other', 'Brembo', 'Brembo GT 6-Piston Big Brake Kit 380 mm BMW 5 Series', 6200, 1, 650, [F('bmw-5-series', 2017, 2023)], ['brake6', 'track', 'warranty24'], dict(k='brake', col='#dc2626'))
G('autotune', 'other', 'Brembo', 'Brembo Max Drilled Front Brake Discs Toyota Camry (Pair)', 360, 8, 120, [F('toyota-camry', 2018, 2025)], ['pads', 'track', 'warranty'], dict(k='brake', col='#374151'))
G('autotune', 'other', 'Carbotech', 'Carbotech XP10 Track Brake Pads Front Hyundai Sonata', 310, 6, 80, [F('hyundai-sonata', 2019, 2025)], ['pads', 'track'], dict(k='brake', col='#fbbf24'))
G('autotune', 'other', 'Apex Aero', 'Brake Caliper Covers Red Aluminium Set of 4', 95, 24, 40, UNI, ['ss304', 'bolt'], dict(k='brake', col='#ef4444'))
G('autotune', 'other', 'Muteki', 'Muteki SR48 Open-End Lug Nuts 12x1.5 Black (20 pcs)', 78, 40, 20, UNI, ['lug', 'steel', 'warranty'], dict(k='nuts', col='#111827'))
G('autotune', 'other', 'K&N', 'K&N Typhoon Cold Air Intake Kia K5 2.5', 360, 6, 110, [F('kia-k5', 2019, 2025)], ['intake', 'gain', 'warranty24'], dict(k='intake', col='#ef4444'))
G('autotune', 'other', 'Mishimoto', 'Mishimoto Aluminium Performance Radiator Hyundai Elantra', 540, 4, 200, [F('hyundai-elantra', 2020, 2025)], ['radiator', 'steel', 'warranty24'], dict(k='radiator', col='#9ca3af'))
G('autotune', 'other', 'HKS', 'HKS SSQV Blow-Off Valve Universal', 395, 5, 90, UNI, ['turbo', 'steel', 'warranty'], dict(k='valve', body='#ef4444'))
G('bukhara', 'other', '70mai', '70mai A800S 4K Dual Dash Cam Front + Rear', 185, 25, 30, UNI, ['dash4k', 'dual', 'wifi', 'park'], dict(k='dashcam', col='#18181b'))
G('bukhara', 'other', 'Viofo', 'Viofo A129 Pro Duo 4K Dash Cam with GPS', 240, 14, 35, UNI, ['dash4k', 'dual', 'wifi', 'park'], dict(k='dashcam', col='#27272a'))
G('bukhara', 'other', 'Steelmate', 'Steelmate Wireless Parking Sensors 4 pcs with LED Display', 85, 22, 40, UNI, ['sensor', 'ip67', 'plug'], dict(k='sensor', col='#18181b'))
G('bukhara', 'other', 'Apex Aero', '360° Surround View Camera System 4-Camera HD', 310, 8, 160, UNI, ['cam360', 'wifi', 'plug'], dict(k='dashcam', col='#0f172a'))
G('fergana', 'other', 'Thule', 'Thule Motion XT L Roof Box 450 L Black Glossy', 620, 5, 20, UNI, ['rack', 'steel', 'warranty'], dict(k='box', col='#111827'))
G('fergana', 'other', 'Thule', 'Thule WingBar Evo Roof Rack Toyota RAV4', 340, 6, 60, [F('toyota-rav4', 2019, 2025)], ['rack', 'steel', 'oem_fit', 'warranty'], dict(k='box', col='#374151'))
G('fergana', 'other', 'H&R', 'H&R Wheel Spacers 20 mm Pair Hub-Centric', 120, 15, 40, UNI, ['steel', 'bolt', 'warranty'], dict(k='nuts', col='#9ca3af'))
G('fergana', 'other', 'Steelmate', 'Steelmate TPMS External Tyre Pressure Sensors (4 pcs)', 78, 25, 0, UNI, ['sensor', 'ip67'], dict(k='sensor', col='#0f766e'))
