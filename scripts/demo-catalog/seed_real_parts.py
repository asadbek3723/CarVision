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
import time
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
    # Services for every car (paint): no fitment rows, `attributes.universal = True` instead.
    'universal': [],
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
    dict(
        key='cobalt-headlight-03',
        car='cobalt',
        file='cobalt/cobalt-headlight-03.webp',
        brand='Sonar-style',
        price=260, install=30, stock=4,
        attrs=dict(part='headlight', zone='front', style='Amber LED signature', light_source='LED projector',
                   drl='amber LED pattern', housing='black', set_of=2, warranty_months=12),
        text={
            'uz': ("Sariq LED naqshli projektor oldi faralar — Cobalt",
                   "Qora korpus, linzali projektor va sariq LED naqshli kunduzgi chiroq hamda burilish chirog'i. "
                   "Chevrolet Cobalt 2012+ uchun, zavod ulagichiga mos. Komplektda 2 dona."),
            'ru': ("Передние фары с янтарным LED-узором и линзой — Cobalt",
                   "Чёрный корпус, линзованный проектор и янтарные LED ДХО с поворотником в виде узора. "
                   "Для Chevrolet Cobalt 2012+, штатный разъём. В комплекте 2 шт."),
            'en': ("Amber LED signature projector headlights — Cobalt",
                   "Black housing, projector lens and an amber LED pattern for the daytime light and turn signal. "
                   "For Chevrolet Cobalt 2012+, factory connector. Set of 2."),
            'ar': ("مصابيح أمامية بعدسة ونقش LED كهرماني — Cobalt",
                   "هيكل أسود وعدسة بروجكتور ونقش LED كهرماني للضوء النهاري وإشارة الانعطاف. "
                   "لسيارة Chevrolet Cobalt 2012+، موصل أصلي. طقم من قطعتين."),
            'tr': ("Amber LED desenli projektörlü ön farlar — Cobalt",
                   "Siyah gövde, projektör mercek ve gündüz farı ile sinyal için amber LED desen. "
                   "Chevrolet Cobalt 2012+ için, orijinal soket. 2 adet takım."),
            'kk': ("Сары LED өрнекті линзалы алдыңғы шамдар — Cobalt",
                   "Қара корпус, линзалы проектор және күндізгі шам мен бұрылыс үшін сары LED өрнек. "
                   "Chevrolet Cobalt 2012+ үшін, зауыттық қосқыш. Жиынтықта 2 дана."),
            'ky': ("Сары LED оймолуу линзалуу алдыңкы фаралар — Cobalt",
                   "Кара корпус, линзалуу проектор жана күндүзгү жарык менен бурулуш үчүн сары LED оймо. "
                   "Chevrolet Cobalt 2012+ үчүн, заводдук туташтыргыч. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши бо нақши LED-и зард ва линза — Cobalt",
                   "Корпуси сиёҳ, проектори линзадор ва нақши зарди LED барои чароғи рӯзона ва гардишнамо. "
                   "Барои Chevrolet Cobalt 2012+, пайвасткунаки заводӣ. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='cobalt-headlight-04',
        car='cobalt',
        file='cobalt/cobalt-headlight-04.webp',
        brand='Eagle Eye-style',
        price=280, install=30, stock=4,
        attrs=dict(part='headlight', zone='front', style='Crystal LED ring', light_source='LED projector',
                   drl='crystal LED segment ring', turn_signal='round amber', housing='black', set_of=2, warranty_months=12),
        text={
            'uz': ("Kristall LED halqali projektor oldi faralar — Cobalt",
                   "Linza atrofida kristall LED bo'laklardan iborat kunduzgi chiroq halqasi, dumaloq sariq burilish chirog'i va qora korpus. "
                   "Chevrolet Cobalt 2012+ uchun. Komplektda 2 dona."),
            'ru': ("Фары с кристальным LED-кольцом и линзой — Cobalt",
                   "Кольцо ДХО из кристальных LED-сегментов вокруг линзы, круглый жёлтый поворотник и чёрный корпус. "
                   "Для Chevrolet Cobalt 2012+. В комплекте 2 шт."),
            'en': ("Crystal LED ring projector headlights — Cobalt",
                   "A daytime light ring of crystal LED segments around the projector, a round amber turn signal and a black housing. "
                   "For Chevrolet Cobalt 2012+. Set of 2."),
            'ar': ("مصابيح بعدسة وحلقة LED كريستالية — Cobalt",
                   "حلقة ضوء نهاري من مقاطع LED كريستالية حول العدسة وإشارة انعطاف كهرمانية دائرية وهيكل أسود. "
                   "لسيارة Chevrolet Cobalt 2012+. طقم من قطعتين."),
            'tr': ("Kristal LED halkalı projektörlü ön farlar — Cobalt",
                   "Mercek çevresinde kristal LED parçalardan gündüz farı halkası, yuvarlak amber sinyal ve siyah gövde. "
                   "Chevrolet Cobalt 2012+ için. 2 adet takım."),
            'kk': ("Кристалды LED сақиналы линзалы шамдар — Cobalt",
                   "Линза айналасында кристалды LED бөліктерден күндізгі шам сақинасы, дөңгелек сары бұрылыс шамы және қара корпус. "
                   "Chevrolet Cobalt 2012+ үшін. Жиынтықта 2 дана."),
            'ky': ("Кристалл LED шакекчелүү линзалуу фаралар — Cobalt",
                   "Линзанын айланасында кристалл LED бөлүктөрдөн күндүзгү жарык шакекчеси, тегерек сары бурулуш жарыгы жана кара корпус. "
                   "Chevrolet Cobalt 2012+ үчүн. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши бо ҳалқаи кристаллии LED ва линза — Cobalt",
                   "Ҳалқаи чароғи рӯзона аз қисмҳои кристаллии LED дар атрофи линза, гардишнамои мудаввари зард ва корпуси сиёҳ. "
                   "Барои Chevrolet Cobalt 2012+. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='cobalt-headlight-05',
        car='cobalt',
        file='cobalt/cobalt-headlight-05.webp',
        brand='DEPO-style',
        price=250, install=30, stock=5,
        attrs=dict(part='headlight', zone='front', style='Triple light guide', light_source='projector',
                   drl='three white LED light guides', housing='black', set_of=2, warranty_months=12),
        text={
            'uz': ("Uch chiziqli LED DRL projektor oldi faralar — Cobalt",
                   "Uchta oq LED yorug'lik chizig'idan iborat kunduzgi chiroq, linzali projektor va qora korpus. "
                   "Chevrolet Cobalt 2012+ uchun, zavod ulagichiga mos. Komplektda 2 dona."),
            'ru': ("Фары с тройной LED-полосой ДХО и линзой — Cobalt",
                   "ДХО из трёх белых LED-световодов, линзованный проектор и чёрный корпус. "
                   "Для Chevrolet Cobalt 2012+, штатный разъём. В комплекте 2 шт."),
            'en': ("Triple-line LED DRL projector headlights — Cobalt",
                   "Daytime light of three white LED light guides, a projector lens and a black housing. "
                   "For Chevrolet Cobalt 2012+, factory connector. Set of 2."),
            'ar': ("مصابيح بعدسة وضوء نهاري LED بثلاثة خطوط — Cobalt",
                   "ضوء نهاري من ثلاثة أدلة ضوء LED بيضاء وعدسة بروجكتور وهيكل أسود. "
                   "لسيارة Chevrolet Cobalt 2012+، موصل أصلي. طقم من قطعتين."),
            'tr': ("Üç çizgili LED DRL projektörlü ön farlar — Cobalt",
                   "Üç beyaz LED ışık çizgisinden gündüz farı, projektör mercek ve siyah gövde. "
                   "Chevrolet Cobalt 2012+ için, orijinal soket. 2 adet takım."),
            'kk': ("Үш сызықты LED DRL линзалы шамдар — Cobalt",
                   "Үш ақ LED жарық сызығынан күндізгі шам, линзалы проектор және қара корпус. "
                   "Chevrolet Cobalt 2012+ үшін, зауыттық қосқыш. Жиынтықта 2 дана."),
            'ky': ("Үч сызыктуу LED DRL линзалуу фаралар — Cobalt",
                   "Үч ак LED жарык сызыгынан күндүзгү жарык, линзалуу проектор жана кара корпус. "
                   "Chevrolet Cobalt 2012+ үчүн, заводдук туташтыргыч. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши бо DRL-и сехаттаи LED ва линза — Cobalt",
                   "Чароғи рӯзона аз се хати сафеди рӯшноии LED, проектори линзадор ва корпуси сиёҳ. "
                   "Барои Chevrolet Cobalt 2012+, пайвасткунаки заводӣ. Маҷмӯа 2 адад."),
        },
    ),
    # Coloured front rings: red or RGB light at the front is not allowed on the road, the texts say so.
    dict(
        key='cobalt-headlight-06',
        car='cobalt',
        file='cobalt/cobalt-headlight-06.webp',
        brand='Sonar-style',
        price=290, install=35, stock=3,
        attrs=dict(part='headlight', zone='front', style='Red segmented ring', light_source='LED projector',
                   drl='red segmented LED ring', housing='smoked black', road_legal_colour=False, set_of=2, warranty_months=12),
        text={
            'uz': ("Qizil LED halqali projektor oldi faralar — Cobalt",
                   "Linza atrofida bo'lakli qizil LED halqa va ichki qizil yoritish, qoraytirilgan korpus. Chevrolet Cobalt 2012+. "
                   "Qizil yoritish faqat ko'rgazma uchun: yo'lda oldingi qizil chiroq taqiqlangan. Komplektda 2 dona."),
            'ru': ("Фары с красным LED-кольцом и линзой — Cobalt",
                   "Сегментное красное LED-кольцо вокруг линзы и красная подсветка внутри, тонированный корпус. Chevrolet Cobalt 2012+. "
                   "Красная подсветка только для выставок: красный свет спереди на дороге запрещён. В комплекте 2 шт."),
            'en': ("Red LED ring projector headlights — Cobalt",
                   "A segmented red LED ring around the projector and red inner lighting in a smoked housing. Chevrolet Cobalt 2012+. "
                   "The red lighting is for shows only: red light at the front is not allowed on the road. Set of 2."),
            'ar': ("مصابيح بعدسة وحلقة LED حمراء — Cobalt",
                   "حلقة LED حمراء مقطعة حول العدسة وإضاءة داخلية حمراء في هيكل مدخن. Chevrolet Cobalt 2012+. "
                   "الإضاءة الحمراء للعروض فقط: الضوء الأحمر في الأمام غير مسموح على الطريق. طقم من قطعتين."),
            'tr': ("Kırmızı LED halkalı projektörlü ön farlar — Cobalt",
                   "Mercek çevresinde parçalı kırmızı LED halka ve kırmızı iç aydınlatma, füme gövde. Chevrolet Cobalt 2012+. "
                   "Kırmızı aydınlatma yalnızca gösteri içindir: önde kırmızı ışık yolda yasaktır. 2 adet takım."),
            'kk': ("Қызыл LED сақиналы линзалы шамдар — Cobalt",
                   "Линза айналасында бөлікті қызыл LED сақина және ішкі қызыл жарық, күңгірт корпус. Chevrolet Cobalt 2012+. "
                   "Қызыл жарық тек көрмеге арналған: жолда алдыңғы қызыл шамға тыйым салынған. Жиынтықта 2 дана."),
            'ky': ("Кызыл LED шакекчелүү линзалуу фаралар — Cobalt",
                   "Линзанын айланасында бөлүктүү кызыл LED шакекче жана ички кызыл жарык, күңүрт корпус. Chevrolet Cobalt 2012+. "
                   "Кызыл жарык көргөзмө үчүн гана: жолдо алдыңкы кызыл жарык тыюу салынган. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши бо ҳалқаи сурхи LED ва линза — Cobalt",
                   "Ҳалқаи қисмбандии сурхи LED дар атрофи линза ва рӯшноии дохилии сурх, корпуси тира. Chevrolet Cobalt 2012+. "
                   "Рӯшноии сурх танҳо барои намоиш: чароғи сурхи пеш дар роҳ манъ аст. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='cobalt-headlight-07',
        car='cobalt',
        file='cobalt/cobalt-headlight-07.webp',
        brand='Eagle Eye-style',
        price=320, install=40, stock=3,
        attrs=dict(part='headlight', zone='front', style='RGB hexagon ring', light_source='LED projector',
                   drl='multicolour RGB hexagon ring', housing='black', road_legal_colour=False, set_of=2, warranty_months=12),
        text={
            'uz': ("RGB olti burchakli halqali projektor faralar — Cobalt",
                   "Linza atrofida ko'p rangli RGB olti burchakli LED halqa, qora korpus. Chevrolet Cobalt 2012+, ulash ustaxonada. "
                   "Rangli rejim faqat ko'rgazma uchun, yo'lda oq yoki sariq rang ishlatiladi. Komplektda 2 dona."),
            'ru': ("Фары с RGB-кольцом в форме шестиугольника — Cobalt",
                   "Многоцветное RGB LED-кольцо в форме шестиугольника вокруг линзы, чёрный корпус. Chevrolet Cobalt 2012+, подключение в мастерской. "
                   "Цветной режим только для выставок, на дороге белый или жёлтый. В комплекте 2 шт."),
            'en': ("RGB hexagon ring projector headlights — Cobalt",
                   "A multicolour RGB hexagon LED ring around the projector in a black housing. Chevrolet Cobalt 2012+, wired at the workshop. "
                   "The colour modes are for shows only; on the road use white or amber. Set of 2."),
            'ar': ("مصابيح بعدسة وحلقة RGB سداسية — Cobalt",
                   "حلقة LED سداسية RGB متعددة الألوان حول العدسة في هيكل أسود. Chevrolet Cobalt 2012+، التوصيل في الورشة. "
                   "أوضاع الألوان للعروض فقط، وعلى الطريق الأبيض أو الكهرماني. طقم من قطعتين."),
            'tr': ("RGB altıgen halkalı projektörlü farlar — Cobalt",
                   "Mercek çevresinde çok renkli RGB altıgen LED halka, siyah gövde. Chevrolet Cobalt 2012+, bağlantı atölyede. "
                   "Renkli modlar yalnızca gösteri içindir, yolda beyaz veya amber kullanılır. 2 adet takım."),
            'kk': ("RGB алтыбұрышты сақиналы линзалы шамдар — Cobalt",
                   "Линза айналасында көп түсті RGB алтыбұрышты LED сақина, қара корпус. Chevrolet Cobalt 2012+, қосу шеберханада. "
                   "Түсті режим тек көрмеге арналған, жолда ақ не сары түс қолданылады. Жиынтықта 2 дана."),
            'ky': ("RGB алты бурчтуу шакекчелүү линзалуу фаралар — Cobalt",
                   "Линзанын айланасында көп түстүү RGB алты бурчтуу LED шакекче, кара корпус. Chevrolet Cobalt 2012+, туташтыруу устаканада. "
                   "Түстүү режим көргөзмө үчүн гана, жолдо ак же сары түс колдонулат. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши бо ҳалқаи шашкунҷаи RGB ва линза — Cobalt",
                   "Ҳалқаи бисёррангаи шашкунҷаи RGB LED дар атрофи линза, корпуси сиёҳ. Chevrolet Cobalt 2012+, пайвастнамоӣ дар устохона. "
                   "Реҷаи рангӣ танҳо барои намоиш, дар роҳ ранги сафед ё зард истифода мешавад. Маҷмӯа 2 адад."),
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
    # ---------------------------------------------------- Cobalt rear bumpers
    dict(
        key='cobalt-rear-bumper-01',
        car='cobalt',
        category='body_kit',
        file='cobalt/cobalt-rear-bumper-01.webp',
        brand='OEM+ Replica',
        price=170, install=40, stock=5,
        attrs=dict(part='rear_bumper', slot='bumper', zone='rear', style='Sport diffuser', material='fiberglass',
                   diffuser='black', exhaust='twin oval tip cut-outs', finish='primer, painted to car colour', warranty_months=12),
        text={
            'uz': ("Qora diffuzorli sport orqa bamper — Cobalt",
                   "Qora diffuzor, yon havo kanallari va ikki tomonlama oval glushitel uchliklari uchun joy. Parktronik teshiklari bor. "
                   "Chevrolet Cobalt 2012+. Grunt holida, o'rnatishda mashina rangiga bo'yaladi, diffuzor qora qoladi."),
            'ru': ("Спортивный задний бампер с чёрным диффузором — Cobalt",
                   "Чёрный диффузор, боковые воздуховоды и вырезы под двойные овальные насадки глушителя. Есть отверстия под парктроник. "
                   "Chevrolet Cobalt 2012+. В грунте, красится в цвет авто, диффузор остаётся чёрным."),
            'en': ("Sport rear bumper with black diffuser — Cobalt",
                   "Black diffuser, side vents and cut-outs for twin oval exhaust tips, with parking sensor holes. "
                   "Chevrolet Cobalt 2012+. Supplied in primer and painted to the car's colour; the diffuser stays black."),
            'ar': ("مصد خلفي رياضي بموزع هواء أسود — Cobalt",
                   "موزع هواء أسود وفتحات جانبية وفتحات لطرفي عادم بيضاويين، مع فتحات لحساسات الركن. "
                   "Chevrolet Cobalt 2012+. بطبقة أساس ويُطلى بلون السيارة، ويبقى الموزع أسود."),
            'tr': ("Siyah difüzörlü spor arka tampon — Cobalt",
                   "Siyah difüzör, yan hava kanalları ve çift oval egzoz ucu yuvaları, park sensörü delikleri. "
                   "Chevrolet Cobalt 2012+. Astarlı gelir, aracın rengine boyanır, difüzör siyah kalır."),
            'kk': ("Қара диффузорлы спорттық артқы бампер — Cobalt",
                   "Қара диффузор, бүйір ауа арналары және қос сопақ шығару ұштарына орын, парктроник тесіктері бар. "
                   "Chevrolet Cobalt 2012+. Грунтпен келеді, көлік түсіне боялады, диффузор қара қалады."),
            'ky': ("Кара диффузорлуу спорттук арткы бампер — Cobalt",
                   "Кара диффузор, капталдагы аба каналдары жана кош сүйрү чыгаруу учтарына орун, парктроник тешиктери бар. "
                   "Chevrolet Cobalt 2012+. Грунт менен келет, унаанын түсүнө боёлот, диффузор кара калат."),
            'tg': ("Бампери қафои варзишӣ бо диффузори сиёҳ — Cobalt",
                   "Диффузори сиёҳ, каналҳои паҳлуии ҳаво ва ҷой барои ду нӯги байзашакли ихроҷ, сӯрохиҳои парктроник. "
                   "Chevrolet Cobalt 2012+. Бо грунт, ба ранги мошин ранг карда мешавад, диффузор сиёҳ мемонад."),
        },
    ),
    dict(
        key='cobalt-rear-bumper-02',
        car='cobalt',
        category='body_kit',
        file='cobalt/cobalt-rear-bumper-02.webp',
        brand='Maxton-style',
        price=210, install=45, stock=4,
        attrs=dict(part='rear_bumper', slot='bumper', zone='rear', style='Diffuser with reflectors', material='fiberglass',
                   diffuser='black with fins', reflectors='red, built into the diffuser', exhaust='twin oval tip cut-outs',
                   finish='primer, painted to car colour', warranty_months=12),
        text={
            'uz': ("Qizil reflektorli diffuzorli orqa bamper — Cobalt",
                   "Qanotchali qora diffuzor, unga o'rnatilgan ikkita qizil reflektor va oval glushitel uchliklari uchun joy. "
                   "Chevrolet Cobalt 2012+. Asosiy qismi mashina rangiga bo'yaladi, diffuzor qora qoladi."),
            'ru': ("Задний бампер с диффузором и красными катафотами — Cobalt",
                   "Чёрный диффузор с рёбрами, два встроенных красных катафота и вырезы под овальные насадки. "
                   "Chevrolet Cobalt 2012+. Основная часть красится в цвет авто, диффузор остаётся чёрным."),
            'en': ("Diffuser rear bumper with red reflectors — Cobalt",
                   "Finned black diffuser with two built-in red reflectors and cut-outs for oval exhaust tips. "
                   "Chevrolet Cobalt 2012+. The body is painted to the car's colour; the diffuser stays black."),
            'ar': ("مصد خلفي بموزع هواء وعواكس حمراء — Cobalt",
                   "موزع هواء أسود بزعانف مع عاكسين أحمرين مدمجين وفتحات لأطراف عادم بيضاوية. "
                   "Chevrolet Cobalt 2012+. يُطلى الجسم بلون السيارة ويبقى الموزع أسود."),
            'tr': ("Kırmızı reflektörlü difüzörlü arka tampon — Cobalt",
                   "Kanatçıklı siyah difüzör, iki dahili kırmızı reflektör ve oval egzoz ucu yuvaları. "
                   "Chevrolet Cobalt 2012+. Gövde aracın rengine boyanır, difüzör siyah kalır."),
            'kk': ("Қызыл шағылыстырғышты диффузорлы артқы бампер — Cobalt",
                   "Қанатшалы қара диффузор, екі кірістірілген қызыл шағылыстырғыш және сопақ шығару ұштарына орын. "
                   "Chevrolet Cobalt 2012+. Негізгі бөлігі көлік түсіне боялады, диффузор қара қалады."),
            'ky': ("Кызыл чагылдыргычтуу диффузорлуу арткы бампер — Cobalt",
                   "Канатчалуу кара диффузор, эки орнотулган кызыл чагылдыргыч жана сүйрү чыгаруу учтарына орун. "
                   "Chevrolet Cobalt 2012+. Негизги бөлүгү унаанын түсүнө боёлот, диффузор кара калат."),
            'tg': ("Бампери қафо бо диффузор ва инъикоскунандаҳои сурх — Cobalt",
                   "Диффузори сиёҳи болдор, ду инъикоскунандаи сурхи сохташуда ва ҷой барои нӯгҳои байзашакли ихроҷ. "
                   "Chevrolet Cobalt 2012+. Қисми асосӣ ба ранги мошин ранг карда мешавад, диффузор сиёҳ мемонад."),
        },
    ),
    dict(
        key='cobalt-rear-bumper-03',
        car='cobalt',
        category='body_kit',
        file='cobalt/cobalt-rear-bumper-03.webp',
        brand='Maxton-style',
        price=240, install=50, stock=3,
        attrs=dict(part='rear_bumper', slot='bumper', zone='rear', style='Aggressive diffuser', material='fiberglass',
                   diffuser='gloss black with fins', centre_light='red', exhaust='twin rectangular chrome tips',
                   finish='primer, painted to car colour', warranty_months=12),
        text={
            'uz': ("To'rtburchak uchlikli agressiv diffuzor orqa bamper — Cobalt",
                   "Yaltiroq qora qanotchali diffuzor, markazda qizil chiroq va ikkita to'rtburchak xrom glushitel uchligi. "
                   "Chevrolet Cobalt 2012+. Asosiy qismi mashina rangiga bo'yaladi, diffuzor qora qoladi."),
            'ru': ("Агрессивный задний бампер с прямоугольными насадками — Cobalt",
                   "Глянцево-чёрный диффузор с рёбрами, красный фонарь по центру и две прямоугольные хромированные насадки. "
                   "Chevrolet Cobalt 2012+. Основная часть красится в цвет авто, диффузор остаётся чёрным."),
            'en': ("Aggressive diffuser rear bumper with square tips — Cobalt",
                   "Gloss black finned diffuser, a red centre light and two rectangular chrome exhaust tips. "
                   "Chevrolet Cobalt 2012+. The body is painted to the car's colour; the diffuser stays black."),
            'ar': ("مصد خلفي جريء بموزع هواء وأطراف عادم مربعة — Cobalt",
                   "موزع هواء أسود لامع بزعانف وضوء أحمر في الوسط وطرفا عادم كروم مستطيلان. "
                   "Chevrolet Cobalt 2012+. يُطلى الجسم بلون السيارة ويبقى الموزع أسود."),
            'tr': ("Dikdörtgen uçlu agresif difüzörlü arka tampon — Cobalt",
                   "Parlak siyah kanatçıklı difüzör, ortada kırmızı lamba ve iki dikdörtgen krom egzoz ucu. "
                   "Chevrolet Cobalt 2012+. Gövde aracın rengine boyanır, difüzör siyah kalır."),
            'kk': ("Тікбұрышты ұштары бар агрессивті диффузорлы артқы бампер — Cobalt",
                   "Жылтыр қара қанатшалы диффузор, ортасында қызыл шам және екі тікбұрышты хром шығару ұшы. "
                   "Chevrolet Cobalt 2012+. Негізгі бөлігі көлік түсіне боялады, диффузор қара қалады."),
            'ky': ("Тик бурчтуу учтары бар агрессивдүү диффузорлуу арткы бампер — Cobalt",
                   "Жылтыр кара канатчалуу диффузор, ортосунда кызыл жарык жана эки тик бурчтуу хром чыгаруу учу. "
                   "Chevrolet Cobalt 2012+. Негизги бөлүгү унаанын түсүнө боёлот, диффузор кара калат."),
            'tg': ("Бампери қафои агрессивӣ бо диффузор ва нӯгҳои росткунҷа — Cobalt",
                   "Диффузори сиёҳи ҷилодори болдор, чароғи сурх дар марказ ва ду нӯги хромии росткунҷаи ихроҷ. "
                   "Chevrolet Cobalt 2012+. Қисми асосӣ ба ранги мошин ранг карда мешавад, диффузор сиёҳ мемонад."),
        },
    ),
    # ----------------------------------------------------- Cobalt tail lights
    dict(
        key='cobalt-taillight-01',
        car='cobalt',
        file='cobalt/cobalt-taillight-01.webp',
        brand='Sonar-style',
        price=190, install=20, stock=6,
        attrs=dict(part='taillight', zone='rear', style='C-shaped light bar', light_source='LED light guide',
                   lens='smoked red', set_of=2, warranty_months=12),
        text={
            'uz': ("C shaklidagi LED lentali qoraytirilgan stoplar — Cobalt",
                   "Ikki qavatli C shaklidagi LED yorug'lik lentasi va qoraytirilgan qizil shisha. Chevrolet Cobalt 2012+ uchun, "
                   "zavod korpusi o'rniga tushadi. Komplektda 2 dona."),
            'ru': ("Тонированные LED-фонари с C-образной полосой — Cobalt",
                   "Двухъярусная C-образная LED-полоса и тонированное красное стекло. Для Chevrolet Cobalt 2012+, "
                   "ставятся на место штатных. В комплекте 2 шт."),
            'en': ("Smoked LED tail lights with C-shaped light bar — Cobalt",
                   "Two-tier C-shaped LED light bar behind a smoked red lens. For Chevrolet Cobalt 2012+, "
                   "replaces the factory units. Set of 2."),
            'ar': ("مصابيح خلفية LED مدخنة بشريط ضوئي على شكل C — Cobalt",
                   "شريط LED ضوئي من طبقتين على شكل C خلف عدسة حمراء مدخنة. لسيارة Chevrolet Cobalt 2012+، "
                   "تحل محل المصابيح الأصلية. طقم من قطعتين."),
            'tr': ("C şeklinde ışık bantlı füme LED stoplar — Cobalt",
                   "İki katlı C şeklinde LED ışık bandı ve füme kırmızı cam. Chevrolet Cobalt 2012+ için, "
                   "orijinal stopların yerine takılır. 2 adet takım."),
            'kk': ("C пішінді LED жолақты күңгірт артқы шамдар — Cobalt",
                   "Екі қабатты C пішінді LED жарық жолағы және күңгірт қызыл шыны. Chevrolet Cobalt 2012+ үшін, "
                   "зауыттық шамдардың орнына қойылады. Жиынтықта 2 дана."),
            'ky': ("C формасындагы LED тилкелүү күңүрт арткы фаралар — Cobalt",
                   "Эки кабаттуу C формасындагы LED жарык тилкеси жана күңүрт кызыл айнек. Chevrolet Cobalt 2012+ үчүн, "
                   "заводдук фаралардын ордуна коюлат. Комплектте 2 даана."),
            'tg': ("Чароғҳои қафои LED-и тира бо хати рӯшноии C-шакл — Cobalt",
                   "Хати дуқабатаи C-шакли рӯшноии LED ва шишаи сурхи тира. Барои Chevrolet Cobalt 2012+, "
                   "ба ҷои чароғҳои заводӣ насб мешаванд. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='cobalt-taillight-02',
        car='cobalt',
        file='cobalt/cobalt-taillight-02.webp',
        brand='Eagle Eye-style',
        price=175, install=20, stock=7,
        attrs=dict(part='taillight', zone='rear', style='Triple LED bars', light_source='LED',
                   lens='red', set_of=2, warranty_months=12),
        text={
            'uz': ("Uch qatorli LED stoplar — Cobalt",
                   "Uchta gorizontal LED chiziqli stop va qizil shisha, pastida qaytarish chirog'i. Chevrolet Cobalt 2012+ uchun, "
                   "zavod korpusi o'rniga tushadi. Komplektda 2 dona."),
            'ru': ("Задние LED-фонари с тремя полосами — Cobalt",
                   "Три горизонтальные LED-полосы, красное стекло и фонарь заднего хода внизу. Для Chevrolet Cobalt 2012+, "
                   "ставятся на место штатных. В комплекте 2 шт."),
            'en': ("Triple-bar LED tail lights — Cobalt",
                   "Three horizontal LED bars behind a red lens, with the reversing light at the bottom. For Chevrolet Cobalt 2012+, "
                   "replaces the factory units. Set of 2."),
            'ar': ("مصابيح خلفية LED بثلاثة أشرطة — Cobalt",
                   "ثلاثة أشرطة LED أفقية خلف عدسة حمراء وضوء الرجوع في الأسفل. لسيارة Chevrolet Cobalt 2012+، "
                   "تحل محل المصابيح الأصلية. طقم من قطعتين."),
            'tr': ("Üç bantlı LED stoplar — Cobalt",
                   "Kırmızı cam arkasında üç yatay LED bant, altta geri vites lambası. Chevrolet Cobalt 2012+ için, "
                   "orijinal stopların yerine takılır. 2 adet takım."),
            'kk': ("Үш жолақты LED артқы шамдар — Cobalt",
                   "Қызыл шыны артында үш көлденең LED жолақ, төменде артқа жүру шамы. Chevrolet Cobalt 2012+ үшін, "
                   "зауыттық шамдардың орнына қойылады. Жиынтықта 2 дана."),
            'ky': ("Үч тилкелүү LED арткы фаралар — Cobalt",
                   "Кызыл айнектин артында үч туурасынан LED тилке, ылдыйда артка жүрүү жарыгы. Chevrolet Cobalt 2012+ үчүн, "
                   "заводдук фаралардын ордуна коюлат. Комплектте 2 даана."),
            'tg': ("Чароғҳои қафои LED бо се хат — Cobalt",
                   "Се хати уфуқии LED дар паси шишаи сурх, чароғи ақибравӣ дар поён. Барои Chevrolet Cobalt 2012+, "
                   "ба ҷои чароғҳои заводӣ насб мешаванд. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='cobalt-taillight-03',
        car='cobalt',
        file='cobalt/cobalt-taillight-03.webp',
        brand='DEPO-style',
        price=185, install=20, stock=6,
        attrs=dict(part='taillight', zone='rear', style='Smoked curved LED bars', light_source='LED',
                   lens='smoked red', set_of=2, warranty_months=12),
        text={
            'uz': ("Egilgan LED chiziqli qoraytirilgan stoplar — Cobalt",
                   "To'rtta egilgan qizil LED chiziq, qoraytirilgan korpus va pastida oq qaytarish chirog'i. Chevrolet Cobalt 2012+ uchun, "
                   "zavod korpusi o'rniga tushadi. Komplektda 2 dona."),
            'ru': ("Тонированные фонари с изогнутыми LED-полосами — Cobalt",
                   "Четыре изогнутые красные LED-полосы, тонированный корпус и белый фонарь заднего хода внизу. Для Chevrolet Cobalt 2012+, "
                   "ставятся на место штатных. В комплекте 2 шт."),
            'en': ("Smoked tail lights with curved LED bars — Cobalt",
                   "Four curved red LED bars in a smoked housing, with a white reversing light at the bottom. For Chevrolet Cobalt 2012+, "
                   "replaces the factory units. Set of 2."),
            'ar': ("مصابيح خلفية مدخنة بأشرطة LED منحنية — Cobalt",
                   "أربعة أشرطة LED حمراء منحنية في هيكل مدخن وضوء رجوع أبيض في الأسفل. لسيارة Chevrolet Cobalt 2012+، "
                   "تحل محل المصابيح الأصلية. طقم من قطعتين."),
            'tr': ("Kavisli LED bantlı füme stoplar — Cobalt",
                   "Füme gövdede dört kavisli kırmızı LED bant, altta beyaz geri vites lambası. Chevrolet Cobalt 2012+ için, "
                   "orijinal stopların yerine takılır. 2 adet takım."),
            'kk': ("Иілген LED жолақты күңгірт артқы шамдар — Cobalt",
                   "Күңгірт корпуста төрт иілген қызыл LED жолақ, төменде ақ артқа жүру шамы. Chevrolet Cobalt 2012+ үшін, "
                   "зауыттық шамдардың орнына қойылады. Жиынтықта 2 дана."),
            'ky': ("Ийилген LED тилкелүү күңүрт арткы фаралар — Cobalt",
                   "Күңүрт корпуста төрт ийилген кызыл LED тилке, ылдыйда ак артка жүрүү жарыгы. Chevrolet Cobalt 2012+ үчүн, "
                   "заводдук фаралардын ордуна коюлат. Комплектте 2 даана."),
            'tg': ("Чароғҳои қафои тира бо хатҳои хамидаи LED — Cobalt",
                   "Чор хати хамидаи сурхи LED дар корпуси тира, чароғи сафеди ақибравӣ дар поён. Барои Chevrolet Cobalt 2012+, "
                   "ба ҷои чароғҳои заводӣ насб мешаванд. Маҷмӯа 2 адад."),
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

# ------------------------------------------------------------ universal paint
# One template per language; {c} is the colour name, {f} the finish. The photo is a sample of the paint the AI
# matches; `swatch` is the paint's visible tone (not the shadow) for the card and the render prompt.
PAINT_TEXT = {
    'uz': ("{c} — kuzovni to'liq bo'yash", "Kuzovni to'liq qayta bo'yash: {f}, ustidan himoya laki. Barcha mashinalar uchun; narx sedan uchun, katta kuzovda farq qilishi mumkin."),
    'ru': ("{c} — полная покраска кузова", "Полная перекраска кузова: {f}, защитный лак сверху. Для всех автомобилей; цена для седана, для большого кузова может отличаться."),
    'en': ("{c} — full body repaint", "Full body repaint: {f} with a protective clear coat. For every car; the price is for a sedan and may differ for larger bodies."),
    'ar': ("{c} — طلاء كامل للهيكل", "إعادة طلاء كاملة للهيكل: {f} مع طبقة ورنيش واقية. لكل السيارات؛ السعر لسيارة سيدان وقد يختلف للهياكل الأكبر."),
    'tr': ("{c} — tam kaporta boyası", "Tam kaporta boyası: {f}, üstüne koruyucu vernik. Tüm araçlar için; fiyat sedan içindir, büyük gövdelerde farklı olabilir."),
    'kk': ("{c} — кузовты толық бояу", "Кузовты толық қайта бояу: {f}, үстінен қорғаныш лак. Барлық көліктерге; баға седанға, үлкен кузовта өзгеше болуы мүмкін."),
    'ky': ("{c} — кузовду толук боёо", "Кузовду толук кайра боёо: {f}, үстүнөн коргоочу лак. Бардык унааларга; баа седан үчүн, чоң кузовдо башкача болушу мүмкүн."),
    'tg': ("{c} — ранги пурраи кузов", "Ранги пурраи нави кузов: {f}, болояш лаки муҳофизатӣ. Барои ҳамаи мошинҳо; нарх барои седан, барои кузови калон метавонад фарқ кунад."),
}
FINISH_TEXT = {
    'matte': {'uz': 'mat (yaltiramaydigan) qoplama', 'ru': 'матовое покрытие без блеска', 'en': 'a matte finish with no gloss',
              'ar': 'لمسة نهائية مطفأة بلا لمعان', 'tr': 'parlamayan mat yüzey', 'kk': 'жылтырамайтын күңгірт бет',
              'ky': 'жалтырабаган күңүрт бет', 'tg': 'сатҳи хираи бедурахш'},
    'metallic': {'uz': "metallik zarrachali yaltiroq bo'yoq", 'ru': 'блестящая краска с металлическими частицами', 'en': 'a gloss paint with metallic flake',
                 'ar': 'طلاء لامع بجزيئات معدنية', 'tr': 'metalik pullu parlak boya', 'kk': 'металл бөлшектері бар жылтыр бояу',
                 'ky': 'металл бөлүкчөлүү жалтырак боёк', 'tg': 'ранги ҷилодор бо зарраҳои металлӣ'},
    'gloss': {'uz': "yaltiroq (gloss) bo'yoq", 'ru': 'глянцевая краска', 'en': 'a gloss solid paint',
              'ar': 'طلاء لامع', 'tr': 'parlak düz boya', 'kk': 'жылтыр бояу', 'ky': 'жалтырак боёк', 'tg': 'ранги ҷилодор'},
}


def paint(n, swatch, finish, price, names):
    return dict(
        key=f'universal-paint-{n}', car='universal', category='wrap_paint', file=f'universal/universal-paint-{n}.webp',
        brand='CarVision Paint', price=price, install=0, stock=99,
        attrs=dict(universal=True, swatch=swatch, finish=finish, method='full_repaint', color_name=names['en']),
        text={l: (PAINT_TEXT[l][0].format(c=names[l]), PAINT_TEXT[l][1].format(f=FINISH_TEXT[finish][l])) for l in PAINT_TEXT},
    )


PARTS += [
    paint('01', '#2B2B2B', 'matte', 700, dict(uz='Mat qora', ru='Матовый чёрный', en='Matte Black', ar='أسود مطفأ', tr='Mat Siyah',
                                             kk='Күңгірт қара', ky='Күңүрт кара', tg='Сиёҳи хира')),
    paint('02', '#6E1527', 'metallic', 650, dict(uz='Bordo metallik', ru='Бордовый металлик', en='Burgundy Metallic', ar='عنابي معدني',
                                                tr='Bordo Metalik', kk='Бордо металлик', ky='Бордо металлик', tg='Бордои металлӣ')),
    paint('03', '#3A3D3C', 'metallic', 650, dict(uz='Grafit kulrang metallik', ru='Графитовый металлик', en='Graphite Grey Metallic',
                                                ar='رمادي غرافيتي معدني', tr='Grafit Gri Metalik', kk='Графит сұр металлик',
                                                ky='Графит боз металлик', tg='Хокистарии графитии металлӣ')),
    paint('04', '#E8A93A', 'gloss', 650, dict(uz='Sport sariq', ru='Спортивный жёлтый', en='Racing Yellow', ar='أصفر رياضي',
                                             tr='Yarış Sarısı', kk='Спорттық сары', ky='Спорттук сары', tg='Зарди варзишӣ')),
    paint('05', '#16205A', 'metallic', 650, dict(uz="To'q ko'k metallik", ru='Тёмно-синий металлик', en='Midnight Blue Metallic',
                                                ar='أزرق داكن معدني', tr='Gece Mavisi Metalik', kk='Қою көк металлик',
                                                ky='Кочкул көк металлик', tg='Кабуди торики металлӣ')),
]

# ------------------------------------------------------------ universal wheels
# Sold for every car: the size and bolt pattern are picked for the customer's car when ordering, so the
# attributes name no single pcd/diameter. Portrait photos were widened to 4:3 by continuing their own backdrop.
WHEEL_TEXT = {
    'uz': ("{n} disklar", "{f}. Komplektda 4 dona. O'lchami va bolt naqshi (masalan 4x100, 4x114.3, 5x115) mashinangizga qarab buyurtmada tanlanadi; narx o'lchamga qarab o'zgaradi. Shina montaji va balansirovka bilan o'rnatiladi."),
    'ru': ("Диски {n}", "{f}. В комплекте 4 шт. Размер и разболтовка (например 4x100, 4x114.3, 5x115) подбираются под ваш автомобиль при заказе; цена зависит от размера. Установка с шиномонтажом и балансировкой."),
    'en': ("{n} wheels", "{f}. Set of 4. The size and bolt pattern (for example 4x100, 4x114.3, 5x115) are matched to your car when ordering; the price depends on the size. Fitted with tyre mounting and balancing."),
    'ar': ("جنوط {n}", "{f}. طقم من 4 قطع. يُختار المقاس ونمط البراغي (مثل 4x100 و4x114.3 و5x115) لسيارتك عند الطلب، ويتغير السعر حسب المقاس. التركيب مع تركيب الإطارات وموازنتها."),
    'tr': ("{n} jantlar", "{f}. 4 adet takım. Ölçü ve bijon düzeni (örneğin 4x100, 4x114.3, 5x115) siparişte aracınıza göre seçilir; fiyat ölçüye göre değişir. Lastik montajı ve balans ile takılır."),
    'kk': ("{n} дискілері", "{f}. Жиынтықта 4 дана. Өлшемі мен болт үлгісі (мысалы 4x100, 4x114.3, 5x115) тапсырыста көлігіңізге қарай таңдалады; баға өлшемге байланысты. Шина монтажы мен теңгерумен орнатылады."),
    'ky': ("{n} дисктери", "{f}. Комплектте 4 даана. Өлчөмү жана болт үлгүсү (мисалы 4x100, 4x114.3, 5x115) буйрутмада унааңызга жараша тандалат; баасы өлчөмгө жараша. Шина монтажы жана тең салмактоо менен орнотулат."),
    'tg': ("Дискҳои {n}", "{f}. Маҷмӯа 4 адад. Андоза ва нақшаи болтҳо (масалан 4x100, 4x114.3, 5x115) ҳангоми фармоиш барои мошини шумо интихоб мешавад; нарх аз андоза вобаста аст. Бо монтажи шина ва мувозинат насб мешавад."),
}
WHEEL_FINISH = {
    'silver_machined': {'uz': "Kumushrang, old yuzasi frezalangan (yaltiroq)", 'ru': 'Серебристые с проточенной лицевой частью', 'en': 'Silver with a machined face',
                        'ar': 'فضية بواجهة مخروطة لامعة', 'tr': 'Gümüş, ön yüzü elmas kesim', 'kk': 'Күміс түсті, алдыңғы беті жонылған',
                        'ky': 'Күмүш түстүү, алдыңкы бети жонулган', 'tg': 'Нуқрагин, рӯяи пеш тарошидашуда'},
    'gloss_black': {'uz': 'Yaltiroq qora', 'ru': 'Глянцево-чёрные', 'en': 'Gloss black', 'ar': 'أسود لامع', 'tr': 'Parlak siyah',
                    'kk': 'Жылтыр қара', 'ky': 'Жалтырак кара', 'tg': 'Сиёҳи ҷилодор'},
    'black_machined': {'uz': "Qora, old yuzasi frezalangan", 'ru': 'Чёрные с проточенной лицевой частью', 'en': 'Black with a machined face',
                       'ar': 'سوداء بواجهة مخروطة', 'tr': 'Siyah, ön yüzü elmas kesim', 'kk': 'Қара, алдыңғы беті жонылған',
                       'ky': 'Кара, алдыңкы бети жонулган', 'tg': 'Сиёҳ, рӯяи пеш тарошидашуда'},
    'grey_machined': {'uz': "Grafit kulrang, old yuzasi frezalangan", 'ru': 'Графитовые с проточенной лицевой частью', 'en': 'Graphite grey with a machined face',
                      'ar': 'رمادي غرافيتي بواجهة مخروطة', 'tr': 'Grafit gri, ön yüzü elmas kesim', 'kk': 'Графит сұр, алдыңғы беті жонылған',
                      'ky': 'Графит боз, алдыңкы бети жонулган', 'tg': 'Хокистарии графитӣ, рӯяи пеш тарошидашуда'},
    'black_machined_blue': {'uz': "Qora, frezalangan yuza, ichki gardishi ko'k", 'ru': 'Чёрные с проточкой и синим внутренним ободом', 'en': 'Black with a machined face and a blue inner barrel',
                            'ar': 'سوداء بواجهة مخروطة وحافة داخلية زرقاء', 'tr': 'Siyah, elmas kesim, iç çember mavi', 'kk': 'Қара, жонылған бет, ішкі шеңбері көк',
                            'ky': 'Кара, жонулган бет, ички алкагы көк', 'tg': 'Сиёҳ, рӯяи тарошида, ҳалқаи дохилӣ кабуд'},
    'black_machined_red': {'uz': "Qora, frezalangan yuza, ichki gardishi qizil", 'ru': 'Чёрные с проточкой и красным внутренним ободом', 'en': 'Black with a machined face and a red inner barrel',
                           'ar': 'سوداء بواجهة مخروطة وحافة داخلية حمراء', 'tr': 'Siyah, elmas kesim, iç çember kırmızı', 'kk': 'Қара, жонылған бет, ішкі шеңбері қызыл',
                           'ky': 'Кара, жонулган бет, ички алкагы кызыл', 'tg': 'Сиёҳ, рӯяи тарошида, ҳалқаи дохилӣ сурх'},
    'black_bronze_turquoise': {'uz': "Qora, bronza tusli yuza, ichki gardishi firuza", 'ru': 'Чёрные с бронзовой лицевой частью и бирюзовым ободом', 'en': 'Black with a bronze-tinted face and a turquoise inner barrel',
                               'ar': 'سوداء بواجهة برونزية وحافة داخلية فيروزية', 'tr': 'Siyah, bronz tonlu yüz, iç çember turkuaz', 'kk': 'Қара, қола реңді бет, ішкі шеңбері көгілдір',
                               'ky': 'Кара, коло түстүү бет, ички алкагы көгүш', 'tg': 'Сиёҳ, рӯяи биринҷӣ, ҳалқаи дохилӣ фирӯзаӣ'},
    'steel_black': {'uz': "Qora po'lat disk, oddiy va mustahkam", 'ru': 'Чёрные стальные, простые и прочные', 'en': 'Black steel, simple and strong',
                    'ar': 'فولاذية سوداء بسيطة ومتينة', 'tr': 'Siyah çelik, sade ve sağlam', 'kk': 'Қара болат, қарапайым әрі берік',
                    'ky': 'Кара болот, жөнөкөй жана бекем', 'tg': 'Пӯлоди сиёҳ, оддӣ ва мустаҳкам'},
    'black_polished_lip': {'uz': "Qora to'r naqshli markaz, sayqallangan chuqur gardish va boltlar", 'ru': 'Чёрный сетчатый центр, полированная глубокая полка и болты', 'en': 'Black mesh centre with a polished deep lip and rivets',
                           'ar': 'مركز شبكي أسود مع حافة عميقة مصقولة ومسامير', 'tr': 'Siyah örgü merkez, cilalı derin dudak ve perçinler', 'kk': 'Қара торлы орта, жылтыратылған терең жиек пен болттар',
                           'ky': 'Кара тор борбор, жылмаланган терең алкак жана болттор', 'tg': 'Маркази тӯрии сиёҳ, лаби чуқури сайқалдода ва болтҳо'},
    'gold_polished_lip': {'uz': "Oltinrang to'r naqshli markaz, sayqallangan chuqur gardish va boltlar", 'ru': 'Золотистый сетчатый центр, полированная глубокая полка и болты', 'en': 'Gold mesh centre with a polished deep lip and rivets',
                          'ar': 'مركز شبكي ذهبي مع حافة عميقة مصقولة ومسامير', 'tr': 'Altın örgü merkez, cilalı derin dudak ve perçinler', 'kk': 'Алтын түсті торлы орта, жылтыратылған терең жиек пен болттар',
                          'ky': 'Алтын түстүү тор борбор, жылмаланган терең алкак жана болттор', 'tg': 'Маркази тӯрии тиллоранг, лаби чуқури сайқалдода ва болтҳо'},
    'silver': {'uz': 'Kumushrang, zavod uslubida', 'ru': 'Серебристые, в заводском стиле', 'en': 'Silver, factory style',
               'ar': 'فضية بأسلوب المصنع', 'tr': 'Gümüş, fabrika tarzı', 'kk': 'Күміс түсті, зауыттық стильде',
               'ky': 'Күмүш түстүү, заводдук стилде', 'tg': 'Нуқрагин, бо услуби заводӣ'},
}


def wheel(n, model, brand, finish, price, more=()):
    return dict(
        key=f'universal-wheel-{n}', car='universal', category='wheels', file=f'universal/universal-wheel-{n}.webp',
        more=[f'universal/{m}.webp' for m in more], brand=brand, price=price, install=25, stock=8,
        attrs=dict(universal=True, part='wheel', set_of=4, finish=finish, sizes='matched to the car on order'),
        text={l: (WHEEL_TEXT[l][0].format(n=model), WHEEL_TEXT[l][1].format(f=WHEEL_FINISH[finish][l])) for l in WHEEL_TEXT},
    )


PARTS += [
    wheel('01', 'HRE-style 15-spoke', 'HRE-style', 'silver_machined', 560, more=['universal-wheel-01b']),
    wheel('02', 'Ever Trust Y-spoke', 'Ever Trust', 'gloss_black', 420),
    wheel('03', 'Elegant multi-spoke deep dish', 'Elegant', 'black_machined', 480),
    wheel('04', 'Vossen-style 15-spoke Graphite', 'Vossen-style', 'grey_machined', 380),
    wheel('05', 'Vossen-style 15-spoke Black', 'Vossen-style', 'black_machined', 340),
    wheel('06', 'Vossen-style 15-spoke Blue', 'Vossen-style', 'black_machined_blue', 350),
    wheel('07', 'Vossen-style 15-spoke Red', 'Vossen-style', 'black_machined_red', 350),
    wheel('08', 'Vossen-style 15-spoke Turquoise', 'Vossen-style', 'black_bronze_turquoise', 360),
    wheel('09', 'Twister 10-spoke', 'OEM+ Replica', 'black_machined', 380),
    wheel('10', 'Steel', 'OEM Steel', 'steel_black', 120),
    wheel('11', 'BBS RS-style mesh Black', 'BBS-style', 'black_polished_lip', 560),
    wheel('12', 'BBS RS-style mesh Gold', 'BBS-style', 'gold_polished_lip', 560),
    wheel('13', 'Chevrolet 12-spoke', 'OEM', 'silver_machined', 300),
    wheel('14', 'Chevrolet 6-spoke', 'OEM', 'silver', 240),
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
    # A dropped connection (SSL EOF, timeout) is retried; an HTTP error answer is not.
    for attempt in range(4):
        req = urllib.request.Request(URL + path, data=payload, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                txt = r.read().decode()
                return json.loads(txt) if txt.strip() else None
        except urllib.error.HTTPError as e:
            raise RuntimeError(f'{method} {path} -> {e.code}: {e.read().decode()[:300]}')
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == 3:
                raise
            time.sleep(1.5 * (attempt + 1))


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

    def stored(file):
        return f'{shop_id}/{os.path.basename(file)}'

    def files_of(p):
        # `file` is the cover; `more` are extra photos of the same product, shown after it
        return [p['file'], *p.get('more', [])]

    for p in parts:
        # Replace an earlier copy (images and fitment cascade).
        rest('DELETE', f'catalog_items?shop_id=eq.{shop_id}&attributes->>seed_key=eq.{p["key"]}', prefer='return=minimal')
    if purge:
        call('DELETE', '/storage/v1/object/catalog', dict(prefixes=[stored(f) for p in parts for f in files_of(p)]))
        print(f'{len(parts)} parts removed.')
        return

    now = datetime.now(timezone.utc).isoformat()
    for p in parts:
        urls = []
        for file in files_of(p):
            with open(os.path.join(ASSETS, file), 'rb') as f:
                call('POST', f'/storage/v1/object/catalog/{stored(file)}', raw=f.read(),
                     headers={'Content-Type': 'image/webp', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000'})
            urls.append(f'{URL}/storage/v1/object/public/catalog/{stored(file)}')
        url = urls[0]
        name, desc = p['text']['uz']
        # Same key, same id: a re-run keeps links, carts and bookings pointing at the part.
        item_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f'carvision-seed:{p["key"]}'))
        rest('POST', 'catalog_items', [dict(
            id=item_id, shop_id=shop_id, category=p.get('category', 'lighting'), name=name, brand=p['brand'], description=desc,
            price_cents=p['price'] * 100, input_currency='USD', input_price=p['price'], stock=p['stock'],
            # A service (paint) is the work itself: no separate install price.
            install_available=p['install'] > 0, install_price_cents=p['install'] * 100,
            attributes={**p['attrs'], 'seed_key': p['key']}, status='PUBLISHED', cover_image_url=url,
            published_at=now, source_lang='uz',
            translations={l: dict(name=t[0], description=t[1], manual=False) for l, t in p['text'].items() if l != 'uz'},
            translations_hash=hashlib.sha1(f'{name}\u0000{desc}'.encode()).hexdigest(),
        )], prefer='return=minimal')
        rest('POST', 'catalog_item_images', [dict(item_id=item_id, url=u, kind='STUDIO', position=i) for i, u in enumerate(urls)],
             prefer='return=minimal')
        fitment = [dict(item_id=item_id, model_id=model_ids[slug], year_from=a, year_to=b) for slug, a, b in CARS[p['car']]]
        if fitment:
            rest('POST', 'catalog_item_fitment', fitment, prefer='return=minimal')
        print(f'  [{p["car"]}] {name}  ->  {item_id}')
    print(f'Done: {len(parts)} parts; car parts fitted to their own car only, universal ones to every car.')


if __name__ == '__main__':
    main()
