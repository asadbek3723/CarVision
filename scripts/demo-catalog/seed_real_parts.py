# -*- coding: utf-8 -*-
"""Adds the real-photo parts (headlights, bumpers) of Chevrolet Cobalt and Gentra to the catalog (idempotent: re-running replaces them).

    python3 -I scripts/demo-catalog/seed_real_parts.py                  # add / replace all
    python3 -I scripts/demo-catalog/seed_real_parts.py --car gentra     # only one car
    python3 -I scripts/demo-catalog/seed_real_parts.py --purge          # remove them (with --car: only that car)

Every part is fitted ONLY to its own car (see CARS, no end year) and is not universal: with no car chosen the shop lists
them with every other part; once a car is chosen (by hand or from a photo) only that car keeps them.
Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local. Nothing secret is stored here.
"""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(HERE, 'assets')

SHOP_NAME = 'Chevrolet Performance Tuning Center'

# Vehicle-database slugs each car's parts are fitted to, with (year_from, year_to).
# No end year: fits every car from year_from up to the current year (the app caps picks at maxCarYear()).
# Gentra was sold as Daewoo Gentra in 2013-2015: same car, so both names get the fitment.
CARS = {
    'cobalt': [('chevrolet-cobalt', 2012, None)],
    'gentra': [('chevrolet-gentra', 2013, None), ('daewoo-gentra', 2013, None)],
}

# Stable keys: a re-run finds and replaces the same products. `file` is relative to assets/.
PARTS = [
    dict(
        key='cobalt-headlight-01',
        car='cobalt',
        file='cobalt/cobalt-headlight-01.webp',
        brand='Sonar-style',
        price=240, install=25, stock=6,
        attrs=dict(part='headlight', zone='front', style='Angel Eye', light_source='LED + projector',
                   drl='LED halo ring', housing='black', lens='clear polycarbonate', set_of=2, warranty_months=12),
        text={
            'uz': ("Angel Eye LED projektor oldi faralar — Cobalt",
                   "LED halo halqali kunduzgi chiroq va linzali projektor, qora korpus. Chevrolet Cobalt 2012+ uchun, "
                   "zavod ulagichiga mos, simni kesish shart emas. Komplektda 2 dona."),
            'ru': ("Передние фары Angel Eye LED с линзой — Cobalt",
                   "Дневные ходовые огни LED-кольцом и линзованный проектор, чёрный корпус. Для Chevrolet Cobalt 2012+, "
                   "штатный разъём, без врезки в проводку. В комплекте 2 шт."),
            'en': ("Angel Eye LED projector headlights — Cobalt",
                   "LED halo-ring daytime running light and a projector lens in a black housing. For Chevrolet Cobalt 2012+, "
                   "plugs into the factory connector, no wire cutting. Set of 2."),
            'ar': ("مصابيح أمامية Angel Eye LED بعدسة — Cobalt",
                   "ضوء نهاري بحلقة LED وعدسة بروجكتور في هيكل أسود. لسيارة Chevrolet Cobalt 2012+، "
                   "تتصل بالموصل الأصلي دون قص الأسلاك. طقم من قطعتين."),
            'tr': ("Angel Eye LED projektörlü ön farlar — Cobalt",
                   "LED halka gündüz farı ve projektör mercek, siyah gövde. Chevrolet Cobalt 2012+ için, "
                   "orijinal soketle takılır, kablo kesmeye gerek yok. 2 adet takım."),
            'kk': ("Angel Eye LED линзалы алдыңғы шамдар — Cobalt",
                   "LED сақиналы күндізгі шам және линзалы проектор, қара корпус. Chevrolet Cobalt 2012+ үшін, "
                   "зауыттық қосқышқа сай, сымды кесу қажет емес. Жиынтықта 2 дана."),
            'ky': ("Angel Eye LED линзалуу алдыңкы фаралар — Cobalt",
                   "LED шакекчелүү күндүзгү жарык жана линзалуу проектор, кара корпус. Chevrolet Cobalt 2012+ үчүн, "
                   "заводдук туташтыргычка ылайык, зымды кесүүнүн кереги жок. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши Angel Eye LED бо линза — Cobalt",
                   "Чароғи рӯзонаи ҳалқаи LED ва проектори линзадор, корпуси сиёҳ. Барои Chevrolet Cobalt 2012+, "
                   "ба пайвасткунаки заводӣ мувофиқ, буридани сим лозим нест. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='cobalt-headlight-02',
        car='cobalt',
        file='cobalt/cobalt-headlight-02.webp',
        brand='DEPO-style',
        price=165, install=20, stock=9,
        attrs=dict(part='headlight', zone='front', style='Black housing', light_source='halogen projector + reflector',
                   housing='black', lens='clear polycarbonate', bulb='H7 / H1', set_of=2, warranty_months=6),
        text={
            'uz': ("Qora korpusli projektor oldi faralar — Cobalt",
                   "Yaqin nur uchun linzali projektor va reflektorli uzoq nur, qora ichki korpus. Chevrolet Cobalt 2012+, "
                   "zavod mahkamlagichlari va ulagichiga mos. Komplektda 2 dona."),
            'ru': ("Передние фары в чёрном корпусе с линзой — Cobalt",
                   "Линзованный проектор ближнего света и рефлектор дальнего, чёрный внутренний корпус. Chevrolet Cobalt 2012+, "
                   "штатные крепления и разъём. В комплекте 2 шт."),
            'en': ("Black housing projector headlights — Cobalt",
                   "Projector lens for low beam and a reflector high beam in a black inner housing. Chevrolet Cobalt 2012+, "
                   "factory mounts and connector. Set of 2."),
            'ar': ("مصابيح أمامية بهيكل أسود وعدسة — Cobalt",
                   "عدسة بروجكتور للضوء القريب وعاكس للضوء البعيد في هيكل داخلي أسود. Chevrolet Cobalt 2012+، "
                   "تثبيت وموصل أصليان. طقم من قطعتين."),
            'tr': ("Siyah gövdeli projektörlü ön farlar — Cobalt",
                   "Kısa far için projektör mercek, uzun far için reflektör, siyah iç gövde. Chevrolet Cobalt 2012+, "
                   "orijinal bağlantı noktaları ve soket. 2 adet takım."),
            'kk': ("Қара корпусты линзалы алдыңғы шамдар — Cobalt",
                   "Жақын жарыққа линзалы проектор, алыс жарыққа рефлектор, қара ішкі корпус. Chevrolet Cobalt 2012+, "
                   "зауыттық бекіткіштер мен қосқыш. Жиынтықта 2 дана."),
            'ky': ("Кара корпустуу линзалуу алдыңкы фаралар — Cobalt",
                   "Жакынкы жарык үчүн линзалуу проектор, алыскы жарык үчүн рефлектор, кара ички корпус. Chevrolet Cobalt 2012+, "
                   "заводдук бекиткичтер жана туташтыргыч. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши корпуси сиёҳ бо линза — Cobalt",
                   "Проектори линзадор барои нури наздик ва рефлектор барои нури дур, корпуси дохилии сиёҳ. Chevrolet Cobalt 2012+, "
                   "маҳкамкунакҳо ва пайвасткунаки заводӣ. Маҷмӯа 2 адад."),
        },
    ),
    # --------------------------------------------------------- Cobalt bumpers
    # Photos are of white cars with the number plate blurred. The bumper is sold unpainted and painted in the
    # customer's colour, so the texts name no colour (the render paints it in the car's colour too).
    dict(
        key='cobalt-bumper-01',
        car='cobalt',
        category='body_kit',
        file='cobalt/cobalt-bumper-01.webp',
        brand='OEM+ Replica',
        price=180, install=40, stock=5,
        attrs=dict(part='front_bumper', slot='bumper', zone='front', style='Sport lip', material='fiberglass',
                   fog_lights='LED DRL bars', finish='primer, painted to car colour', warranty_months=12),
        text={
            'uz': ("LED DRL chiroqli sport oldi bamper — Cobalt",
                   "Pastki lipli sport oldi bamper, tuman chiroqlari o'rnida LED kunduzgi chiroq bloklari. Chevrolet Cobalt 2012+ uchun, "
                   "zavod mahkamlagichlariga tushadi. Grunt holida, o'rnatishda mashina rangiga bo'yaladi."),
            'ru': ("Спортивный передний бампер с LED ДХО — Cobalt",
                   "Спортивный передний бампер с нижней губой и LED-блоками ДХО на месте противотуманок. Для Chevrolet Cobalt 2012+, "
                   "штатные крепления. Поставляется в грунте, красится в цвет авто при установке."),
            'en': ("Sport front bumper with LED DRL lights — Cobalt",
                   "Sport front bumper with a lower lip and LED daytime running light units in place of the fog lamps. For Chevrolet Cobalt 2012+, "
                   "factory mounts. Supplied in primer and painted to the car's colour when fitted."),
            'ar': ("مصد أمامي رياضي بأضواء نهارية LED — Cobalt",
                   "مصد أمامي رياضي بشفة سفلية ووحدات إضاءة نهارية LED مكان أضواء الضباب. لسيارة Chevrolet Cobalt 2012+، "
                   "تثبيت أصلي. يُورَّد بطبقة أساس ويُطلى بلون السيارة عند التركيب."),
            'tr': ("LED DRL ışıklı spor ön tampon — Cobalt",
                   "Alt lipli spor ön tampon, sis farı yerinde LED gündüz farı üniteleri. Chevrolet Cobalt 2012+ için, "
                   "orijinal bağlantı noktaları. Astarlı gelir, montajda aracın rengine boyanır."),
            'kk': ("LED DRL шамдары бар спорттық алдыңғы бампер — Cobalt",
                   "Төменгі ерні бар спорттық алдыңғы бампер, тұман шамдарының орнында LED күндізгі шам блоктары. Chevrolet Cobalt 2012+ үшін, "
                   "зауыттық бекіткіштер. Грунтпен келеді, орнатқанда көлік түсіне боялады."),
            'ky': ("LED DRL жарыктары бар спорттук алдыңкы бампер — Cobalt",
                   "Төмөнкү эрини бар спорттук алдыңкы бампер, туман фараларынын ордунда LED күндүзгү жарык блоктору. Chevrolet Cobalt 2012+ үчүн, "
                   "заводдук бекиткичтер. Грунт менен келет, орнотууда унаанын түсүнө боёлот."),
            'tg': ("Бампери пеши варзишӣ бо чароғҳои LED DRL — Cobalt",
                   "Бампери пеши варзишӣ бо лаби поёнӣ ва блокҳои чароғи рӯзонаи LED дар ҷои чароғҳои туман. Барои Chevrolet Cobalt 2012+, "
                   "маҳкамкунакҳои заводӣ. Бо грунт меояд, ҳангоми насб ба ранги мошин ранг карда мешавад."),
        },
    ),
    dict(
        key='cobalt-bumper-02',
        car='cobalt',
        category='body_kit',
        file='cobalt/cobalt-bumper-02.webp',
        brand='Maxton-style',
        price=260, install=50, stock=3,
        attrs=dict(part='front_bumper', slot='bumper', zone='front', style='Aggressive sport', material='fiberglass',
                   accents='red fog frames, chrome strips, black splitter', grille='honeycomb mesh',
                   finish='primer, painted to car colour', warranty_months=12),
        text={
            'uz': ("Qizil ramkali agressiv sport oldi bamper — Cobalt",
                   "Keskin qirrali sport bamper: qizil ramkali havo kanallari, xrom chiziqlar, qora splitter va asal katak to'r. "
                   "Chevrolet Cobalt 2012+. Asosiy qismi o'rnatishda mashina rangiga bo'yaladi, qizil va qora detallar o'zgarmaydi."),
            'ru': ("Агрессивный спортивный бампер с красными рамками — Cobalt",
                   "Спортивный бампер с острыми гранями: воздухозаборники в красных рамках, хромированные полосы, чёрный сплиттер и сетка-соты. "
                   "Chevrolet Cobalt 2012+. Основная часть красится в цвет авто, красные и чёрные детали остаются."),
            'en': ("Aggressive sport front bumper with red frames — Cobalt",
                   "Sharp-edged sport bumper: red-framed air intakes, chrome strips, a black splitter and honeycomb mesh. "
                   "Chevrolet Cobalt 2012+. The body is painted to the car's colour when fitted; the red and black trims stay."),
            'ar': ("مصد أمامي رياضي جريء بإطارات حمراء — Cobalt",
                   "مصد رياضي بحواف حادة: فتحات هواء بإطارات حمراء وشرائط كروم وموزع هواء أسود وشبكة خلية نحل. "
                   "Chevrolet Cobalt 2012+. يُطلى الجسم بلون السيارة عند التركيب وتبقى القطع الحمراء والسوداء."),
            'tr': ("Kırmızı çerçeveli agresif spor ön tampon — Cobalt",
                   "Keskin hatlı spor tampon: kırmızı çerçeveli hava girişleri, krom şeritler, siyah splitter ve bal peteği ızgara. "
                   "Chevrolet Cobalt 2012+. Gövde montajda aracın rengine boyanır, kırmızı ve siyah parçalar kalır."),
            'kk': ("Қызыл жақтаулы агрессивті спорттық бампер — Cobalt",
                   "Өткір қырлы спорттық бампер: қызыл жақтаулы ауа кірістері, хром жолақтар, қара сплиттер және ұя тор. "
                   "Chevrolet Cobalt 2012+. Негізгі бөлігі көлік түсіне боялады, қызыл және қара бөлшектер қалады."),
            'ky': ("Кызыл алкактуу агрессивдүү спорттук бампер — Cobalt",
                   "Курч кырдуу спорттук бампер: кызыл алкактуу аба киргизгичтер, хром тилкелер, кара сплиттер жана уя тор. "
                   "Chevrolet Cobalt 2012+. Негизги бөлүгү унаанын түсүнө боёлот, кызыл жана кара бөлүктөр калат."),
            'tg': ("Бампери пеши варзишии агрессивӣ бо чорчӯбаҳои сурх — Cobalt",
                   "Бампери варзишӣ бо канорҳои тез: даромадгоҳҳои ҳаво бо чорчӯбаи сурх, хатҳои хромӣ, сплиттери сиёҳ ва тӯри шонашакл. "
                   "Chevrolet Cobalt 2012+. Қисми асосӣ ба ранги мошин ранг карда мешавад, қисмҳои сурх ва сиёҳ мемонанд."),
        },
    ),
    dict(
        key='cobalt-bumper-03',
        car='cobalt',
        category='body_kit',
        file='cobalt/cobalt-bumper-03.webp',
        brand='OEM+ Replica',
        price=150, install=40, stock=6,
        attrs=dict(part='front_bumper', slot='bumper', zone='front', style='OEM+ lip', material='fiberglass',
                   fog_lights='round fog lamps', finish='primer, painted to car colour', warranty_months=12),
        text={
            'uz': ("Lipli OEM+ oldi bamper, dumaloq tuman faralari bilan — Cobalt",
                   "Zavod shakliga yaqin oldi bamper: pastki lip, kengaytirilgan pastki havo kanali va dumaloq tuman faralari uchun joy. "
                   "Chevrolet Cobalt 2012+. Grunt holida, o'rnatishda mashina rangiga bo'yaladi."),
            'ru': ("Передний бампер OEM+ с губой и круглыми ПТФ — Cobalt",
                   "Бампер близкий к заводской форме: нижняя губа, расширенный нижний воздухозаборник и места под круглые противотуманки. "
                   "Chevrolet Cobalt 2012+. Поставляется в грунте, красится в цвет авто при установке."),
            'en': ("OEM+ lip front bumper with round fog lamps — Cobalt",
                   "Close-to-factory front bumper with a lower lip, a wider lower intake and housings for round fog lamps. "
                   "Chevrolet Cobalt 2012+. Supplied in primer and painted to the car's colour when fitted."),
            'ar': ("مصد أمامي OEM+ بشفة وأضواء ضباب دائرية — Cobalt",
                   "مصد قريب من الشكل الأصلي بشفة سفلية وفتحة هواء سفلية أعرض ومواضع لأضواء ضباب دائرية. "
                   "Chevrolet Cobalt 2012+. يُورَّد بطبقة أساس ويُطلى بلون السيارة عند التركيب."),
            'tr': ("Lipli OEM+ ön tampon, yuvarlak sis farlı — Cobalt",
                   "Fabrika formuna yakın ön tampon: alt lip, genişletilmiş alt hava girişi ve yuvarlak sis farı yuvaları. "
                   "Chevrolet Cobalt 2012+. Astarlı gelir, montajda aracın rengine boyanır."),
            'kk': ("Ерні бар OEM+ алдыңғы бампер, дөңгелек тұман шамдарымен — Cobalt",
                   "Зауыттық пішінге жақын бампер: төменгі ерін, кеңейтілген төменгі ауа кірісі және дөңгелек тұман шамдарына орын. "
                   "Chevrolet Cobalt 2012+. Грунтпен келеді, орнатқанда көлік түсіне боялады."),
            'ky': ("Эрини бар OEM+ алдыңкы бампер, тегерек туман фаралары менен — Cobalt",
                   "Заводдук формага жакын бампер: төмөнкү эрин, кеңейтилген төмөнкү аба киргизгич жана тегерек туман фараларына орун. "
                   "Chevrolet Cobalt 2012+. Грунт менен келет, орнотууда унаанын түсүнө боёлот."),
            'tg': ("Бампери пеши OEM+ бо лаб ва чароғҳои мудаввари туман — Cobalt",
                   "Бампери наздик ба шакли заводӣ: лаби поёнӣ, даромадгоҳи васеъи поёнӣ ва ҷой барои чароғҳои мудаввари туман. "
                   "Chevrolet Cobalt 2012+. Бо грунт меояд, ҳангоми насб ба ранги мошин ранг карда мешавад."),
        },
    ),
    # ------------------------------------------------------------------ Gentra
    dict(
        key='gentra-headlight-01',
        car='gentra',
        file='gentra/gentra-headlight-01.webp',
        brand='Eagle Eye-style',
        price=210, install=25, stock=7,
        attrs=dict(part='headlight', zone='front', style='LED DRL strip', light_source='projector + reflector',
                   drl='white LED strip', housing='chrome inner', turn_signal='amber', set_of=2, warranty_months=12),
        text={
            'uz': ("LED DRL lentali projektor oldi faralar — Gentra",
                   "Oq LED kunduzgi chiroq lentasi, linzali projektor va xrom ichki korpus, sariq burilish chirog'i. "
                   "Chevrolet Gentra 2013+ uchun, zavod ulagichiga mos. Komplektda 2 dona."),
            'ru': ("Передние фары с LED-лентой ДХО и линзой — Gentra",
                   "Белая LED-лента ДХО, линзованный проектор и хромированный внутренний корпус, жёлтый поворотник. "
                   "Для Chevrolet Gentra 2013+, штатный разъём. В комплекте 2 шт."),
            'en': ("LED DRL strip projector headlights — Gentra",
                   "White LED daytime running strip, projector lens and a chrome inner housing with an amber turn signal. "
                   "For Chevrolet Gentra 2013+, factory connector. Set of 2."),
            'ar': ("مصابيح أمامية بشريط LED نهاري وعدسة — Gentra",
                   "شريط LED نهاري أبيض وعدسة بروجكتور وهيكل داخلي كروم مع إشارة انعطاف كهرمانية. "
                   "لسيارة Chevrolet Gentra 2013+، موصل أصلي. طقم من قطعتين."),
            'tr': ("LED DRL şeritli projektörlü ön farlar — Gentra",
                   "Beyaz LED gündüz şeridi, projektör mercek ve krom iç gövde, turuncu sinyal. "
                   "Chevrolet Gentra 2013+ için, orijinal soket. 2 adet takım."),
            'kk': ("LED DRL таспалы линзалы алдыңғы шамдар — Gentra",
                   "Ақ LED күндізгі таспа, линзалы проектор және хромды ішкі корпус, сары бұрылыс шамы. "
                   "Chevrolet Gentra 2013+ үшін, зауыттық қосқыш. Жиынтықта 2 дана."),
            'ky': ("LED DRL тасмалуу линзалуу алдыңкы фаралар — Gentra",
                   "Ак LED күндүзгү тасма, линзалуу проектор жана хромдуу ички корпус, сары бурулуш жарыгы. "
                   "Chevrolet Gentra 2013+ үчүн, заводдук туташтыргыч. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши бо тасмаи LED DRL ва линза — Gentra",
                   "Тасмаи сафеди LED-и рӯзона, проектори линзадор ва корпуси дохилии хромӣ, гардишнамои зард. "
                   "Барои Chevrolet Gentra 2013+, пайвасткунаки заводӣ. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='gentra-headlight-02',
        car='gentra',
        file='gentra/gentra-headlight-02.webp',
        brand='Sonar-style',
        price=290, install=35, stock=4,
        attrs=dict(part='headlight', zone='front', style='RGB DRL', light_source='projector + reflector',
                   drl='multicolour RGB LED strip', housing='black', turn_signal='amber', set_of=2, warranty_months=12),
        text={
            'uz': ("RGB rang o'zgaruvchan DRL projektor faralar — Gentra",
                   "Ko'p rangli RGB LED kunduzgi chiroq lentasi, linzali projektor va qora korpus. "
                   "Chevrolet Gentra 2013+ uchun, ulash ustaxonada bajariladi. Komplektda 2 dona."),
            'ru': ("Фары с RGB ДХО меняющего цвет и линзой — Gentra",
                   "Многоцветная RGB LED-лента ДХО, линзованный проектор и чёрный корпус. "
                   "Для Chevrolet Gentra 2013+, подключение выполняется в мастерской. В комплекте 2 шт."),
            'en': ("Colour-changing RGB DRL projector headlights — Gentra",
                   "Multicolour RGB LED daytime running strip, projector lens and a black housing. "
                   "For Chevrolet Gentra 2013+, wired up at the workshop. Set of 2."),
            'ar': ("مصابيح بروجكتور بضوء نهاري RGB متغير اللون — Gentra",
                   "شريط LED نهاري RGB متعدد الألوان وعدسة بروجكتور وهيكل أسود. "
                   "لسيارة Chevrolet Gentra 2013+، يتم التوصيل في الورشة. طقم من قطعتين."),
            'tr': ("Renk değiştiren RGB DRL projektörlü farlar — Gentra",
                   "Çok renkli RGB LED gündüz şeridi, projektör mercek ve siyah gövde. "
                   "Chevrolet Gentra 2013+ için, bağlantı atölyede yapılır. 2 adet takım."),
            'kk': ("Түсі өзгеретін RGB DRL линзалы шамдар — Gentra",
                   "Көп түсті RGB LED күндізгі таспа, линзалы проектор және қара корпус. "
                   "Chevrolet Gentra 2013+ үшін, қосу шеберханада жасалады. Жиынтықта 2 дана."),
            'ky': ("Түсү өзгөргөн RGB DRL линзалуу фаралар — Gentra",
                   "Көп түстүү RGB LED күндүзгү тасма, линзалуу проектор жана кара корпус. "
                   "Chevrolet Gentra 2013+ үчүн, туташтыруу устаканада жасалат. Комплектте 2 даана."),
            'tg': ("Чароғҳои проекторӣ бо DRL-и RGB-и рангивазкунанда — Gentra",
                   "Тасмаи бисёррангаи RGB LED-и рӯзона, проектори линзадор ва корпуси сиёҳ. "
                   "Барои Chevrolet Gentra 2013+, пайвастнамоӣ дар устохона. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='gentra-headlight-03',
        car='gentra',
        file='gentra/gentra-headlight-03.webp',
        brand='OEM+ Replica',
        price=340, install=35, stock=3,
        attrs=dict(part='headlight', zone='front', style='Full LED matrix', light_source='18 LED modules',
                   drl='crystal LED light guide', housing='black', turn_signal='amber', set_of=2, warranty_months=12),
        text={
            'uz': ("18 LED modulli to'liq LED oldi faralar — Gentra",
                   "Asosiy nur uchun 18 ta LED modul, kristall LED kunduzgi chiroq yo'lagi, qora korpus va sariq burilish chirog'i. "
                   "Chevrolet Gentra 2013+ uchun. Komplektda 2 dona."),
            'ru': ("Полностью светодиодные фары с 18 LED-модулями — Gentra",
                   "18 LED-модулей основного света, кристальная LED-полоса ДХО, чёрный корпус и жёлтый поворотник. "
                   "Для Chevrolet Gentra 2013+. В комплекте 2 шт."),
            'en': ("Full LED headlights with 18 LED modules — Gentra",
                   "18 LED modules for the main beam, a crystal LED daytime light guide, black housing and amber turn signal. "
                   "For Chevrolet Gentra 2013+. Set of 2."),
            'ar': ("مصابيح LED كاملة بـ 18 وحدة LED — Gentra",
                   "18 وحدة LED للضوء الرئيسي ودليل ضوء نهاري LED كريستالي وهيكل أسود وإشارة انعطاف كهرمانية. "
                   "لسيارة Chevrolet Gentra 2013+. طقم من قطعتين."),
            'tr': ("18 LED modüllü tam LED ön farlar — Gentra",
                   "Ana ışık için 18 LED modül, kristal LED gündüz ışık bandı, siyah gövde ve turuncu sinyal. "
                   "Chevrolet Gentra 2013+ için. 2 adet takım."),
            'kk': ("18 LED модульді толық LED алдыңғы шамдар — Gentra",
                   "Негізгі жарыққа 18 LED модуль, кристалды LED күндізгі жолақ, қара корпус және сары бұрылыс шамы. "
                   "Chevrolet Gentra 2013+ үшін. Жиынтықта 2 дана."),
            'ky': ("18 LED модулдуу толук LED алдыңкы фаралар — Gentra",
                   "Негизги жарык үчүн 18 LED модуль, кристалл LED күндүзгү тилке, кара корпус жана сары бурулуш жарыгы. "
                   "Chevrolet Gentra 2013+ үчүн. Комплектте 2 даана."),
            'tg': ("Чароғҳои пурра LED бо 18 модули LED — Gentra",
                   "18 модули LED барои нури асосӣ, хати кристаллии LED-и рӯзона, корпуси сиёҳ ва гардишнамои зард. "
                   "Барои Chevrolet Gentra 2013+. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='gentra-headlight-04',
        car='gentra',
        file='gentra/gentra-headlight-04.webp',
        brand='TYC-style',
        price=195, install=25, stock=8,
        attrs=dict(part='headlight', zone='front', style='Dotted LED DRL', light_source='projector + reflector',
                   drl='white dotted LED', housing='black', turn_signal='amber', set_of=2, warranty_months=6),
        text={
            'uz': ("Nuqtali LED DRL qora projektor faralar — Gentra",
                   "Nuqtali oq LED kunduzgi chiroq, linzali projektor va qora ichki korpus, sariq burilish chirog'i. "
                   "Chevrolet Gentra 2013+, zavod mahkamlagichlariga mos. Komplektda 2 dona."),
            'ru': ("Чёрные фары с точечными LED ДХО и линзой — Gentra",
                   "Точечные белые LED ДХО, линзованный проектор и чёрный внутренний корпус, жёлтый поворотник. "
                   "Chevrolet Gentra 2013+, штатные крепления. В комплекте 2 шт."),
            'en': ("Dotted LED DRL black projector headlights — Gentra",
                   "Dotted white LED daytime running light, projector lens and a black inner housing with an amber turn signal. "
                   "Chevrolet Gentra 2013+, factory mounts. Set of 2."),
            'ar': ("مصابيح بروجكتور سوداء بضوء نهاري LED منقط — Gentra",
                   "ضوء نهاري LED أبيض منقط وعدسة بروجكتور وهيكل داخلي أسود مع إشارة انعطاف كهرمانية. "
                   "Chevrolet Gentra 2013+، تثبيت أصلي. طقم من قطعتين."),
            'tr': ("Noktalı LED DRL siyah projektörlü farlar — Gentra",
                   "Noktalı beyaz LED gündüz farı, projektör mercek ve siyah iç gövde, turuncu sinyal. "
                   "Chevrolet Gentra 2013+, orijinal bağlantı noktaları. 2 adet takım."),
            'kk': ("Нүктелі LED DRL қара линзалы шамдар — Gentra",
                   "Нүктелі ақ LED күндізгі шам, линзалы проектор және қара ішкі корпус, сары бұрылыс шамы. "
                   "Chevrolet Gentra 2013+, зауыттық бекіткіштер. Жиынтықта 2 дана."),
            'ky': ("Чекиттүү LED DRL кара линзалуу фаралар — Gentra",
                   "Чекиттүү ак LED күндүзгү жарык, линзалуу проектор жана кара ички корпус, сары бурулуш жарыгы. "
                   "Chevrolet Gentra 2013+, заводдук бекиткичтер. Комплектте 2 даана."),
            'tg': ("Чароғҳои сиёҳи проекторӣ бо DRL-и нуқтагии LED — Gentra",
                   "Чароғи рӯзонаи нуқтагии сафеди LED, проектори линзадор ва корпуси дохилии сиёҳ, гардишнамои зард. "
                   "Chevrolet Gentra 2013+, маҳкамкунакҳои заводӣ. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='gentra-headlight-05',
        car='gentra',
        file='gentra/gentra-headlight-05.webp',
        brand='DEPO-style',
        price=230, install=25, stock=5,
        attrs=dict(part='headlight', zone='front', style='Full black smoked', light_source='projector + reflector',
                   drl='LED light guide', housing='smoked black', set_of=2, warranty_months=6),
        text={
            'uz': ("To'liq qora (smoked) projektor oldi faralar — Gentra",
                   "To'liq qoraytirilgan korpus, linzali projektor, LED yorug'lik yo'lagi va qora burilish chirog'i qismi. "
                   "Chevrolet Gentra 2013+ uchun, zavod ulagichiga mos. Komplektda 2 dona."),
            'ru': ("Полностью чёрные (smoked) фары с линзой — Gentra",
                   "Полностью тонированный корпус, линзованный проектор, LED-световод и чёрная секция поворотника. "
                   "Для Chevrolet Gentra 2013+, штатный разъём. В комплекте 2 шт."),
            'en': ("Full black smoked projector headlights — Gentra",
                   "Fully smoked housing, projector lens, LED light guide and a blacked-out turn signal section. "
                   "For Chevrolet Gentra 2013+, factory connector. Set of 2."),
            'ar': ("مصابيح بروجكتور سوداء بالكامل (مدخنة) — Gentra",
                   "هيكل مدخن بالكامل وعدسة بروجكتور ودليل ضوء LED وقسم إشارة انعطاف أسود. "
                   "لسيارة Chevrolet Gentra 2013+، موصل أصلي. طقم من قطعتين."),
            'tr': ("Tamamen siyah (füme) projektörlü ön farlar — Gentra",
                   "Tamamen füme gövde, projektör mercek, LED ışık bandı ve siyah sinyal bölümü. "
                   "Chevrolet Gentra 2013+ için, orijinal soket. 2 adet takım."),
            'kk': ("Толық қара (smoked) линзалы алдыңғы шамдар — Gentra",
                   "Толық күңгірттелген корпус, линзалы проектор, LED жарық жолағы және қара бұрылыс бөлігі. "
                   "Chevrolet Gentra 2013+ үшін, зауыттық қосқыш. Жиынтықта 2 дана."),
            'ky': ("Толук кара (smoked) линзалуу алдыңкы фаралар — Gentra",
                   "Толук күңүрттөлгөн корпус, линзалуу проектор, LED жарык тилкеси жана кара бурулуш бөлүгү. "
                   "Chevrolet Gentra 2013+ үчүн, заводдук туташтыргыч. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши пурра сиёҳ (smoked) бо линза — Gentra",
                   "Корпуси пурра тиракардашуда, проектори линзадор, хати рӯшноии LED ва қисми сиёҳи гардишнамо. "
                   "Барои Chevrolet Gentra 2013+, пайвасткунаки заводӣ. Маҷмӯа 2 адад."),
        },
    ),
]

env = {}
for line in open(os.path.join(ROOT, '.env.local'), encoding='utf-8'):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.strip())
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"')
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']


def call(method, path, body=None, headers=None, raw=None):
    h = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
    h.update(headers or {})
    payload = raw
    if body is not None:
        payload = json.dumps(body).encode()
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(URL + path, data=payload, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt.strip() else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{method} {path} -> {e.code}: {e.read().decode()[:300]}')


def rest(method, path, body=None, prefer='return=representation'):
    return call(method, f'/rest/v1/{path}', body, {'Prefer': prefer})


def main():
    purge = '--purge' in sys.argv
    only = sys.argv[sys.argv.index('--car') + 1] if '--car' in sys.argv else None
    if only and only not in CARS:
        sys.exit(f'Unknown car "{only}". Known: {", ".join(CARS)}')
    parts = [p for p in PARTS if not only or p['car'] == only]

    shops = rest('GET', f'shops?shop_name=eq.{urllib.request.quote(SHOP_NAME)}&select=id')
    if not shops:
        sys.exit(f'Shop "{SHOP_NAME}" not found.')
    shop_id = shops[0]['id']

    model_ids = {}
    for car in {p['car'] for p in parts}:
        for slug, _, _ in CARS[car]:
            found = rest('GET', f'vehicle_models?slug=eq.{slug}&select=id')
            if not found:
                sys.exit(f'Vehicle model "{slug}" not found.')
            model_ids[slug] = found[0]['id']

    def stored(p):
        return f'{shop_id}/{os.path.basename(p["file"])}'

    for p in parts:
        # Replace an earlier copy (images and fitment cascade).
        rest('DELETE', f'catalog_items?shop_id=eq.{shop_id}&attributes->>seed_key=eq.{p["key"]}', prefer='return=minimal')
    if purge:
        call('DELETE', '/storage/v1/object/catalog', dict(prefixes=[stored(p) for p in parts]))
        print(f'{len(parts)} parts removed.')
        return

    now = datetime.now(timezone.utc).isoformat()
    for p in parts:
        with open(os.path.join(ASSETS, p['file']), 'rb') as f:
            call('POST', f'/storage/v1/object/catalog/{stored(p)}', raw=f.read(),
                 headers={'Content-Type': 'image/webp', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000'})
        url = f'{URL}/storage/v1/object/public/catalog/{stored(p)}'
        name, desc = p['text']['uz']
        item_id = str(uuid.uuid4())
        rest('POST', 'catalog_items', [dict(
            id=item_id, shop_id=shop_id, category=p.get('category', 'lighting'), name=name, brand=p['brand'], description=desc,
            price_cents=p['price'] * 100, input_currency='USD', input_price=p['price'], stock=p['stock'],
            install_available=True, install_price_cents=p['install'] * 100,
            attributes={**p['attrs'], 'seed_key': p['key']}, status='PUBLISHED', cover_image_url=url,
            published_at=now, source_lang='uz',
            translations={l: dict(name=t[0], description=t[1], manual=False) for l, t in p['text'].items() if l != 'uz'},
            translations_hash=hashlib.sha1(f'{name}\u0000{desc}'.encode()).hexdigest(),
        )], prefer='return=minimal')
        rest('POST', 'catalog_item_images', [dict(item_id=item_id, url=url, kind='STUDIO', position=0)], prefer='return=minimal')
        rest('POST', 'catalog_item_fitment',
             [dict(item_id=item_id, model_id=model_ids[slug], year_from=a, year_to=b) for slug, a, b in CARS[p['car']]],
             prefer='return=minimal')
        print(f'  [{p["car"]}] {name}  ->  {item_id}')
    print(f'Done: {len(parts)} parts, each fitted to its own car only.')


if __name__ == '__main__':
    main()
