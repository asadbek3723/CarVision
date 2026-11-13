# -*- coding: utf-8 -*-
"""Adds the two Chevrolet Cobalt front headlights to the catalog (idempotent: re-running replaces them).

    python3 -I scripts/demo-catalog/seed_cobalt_headlights.py           # add / replace
    python3 -I scripts/demo-catalog/seed_cobalt_headlights.py --purge   # remove them

Both parts are fitted ONLY to `chevrolet-cobalt` (2012 onwards, no end year) and are not universal: with no car chosen the
shop lists them with every other part; once a car is chosen (by hand or from a photo) only a Cobalt keeps them.
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
ASSETS = os.path.join(HERE, 'assets', 'cobalt')

SHOP_NAME = 'Chevrolet Performance Tuning Center'
MODEL_SLUG = 'chevrolet-cobalt'
# No end year: fits every Cobalt from 2012 up to the current year (the app caps picks at maxCarYear()).
YEARS = (2012, None)

# Stable keys: a re-run finds and replaces the same two products.
PARTS = [
    dict(
        key='cobalt-headlight-01',
        file='cobalt-headlight-01.webp',
        brand='Sonar-style',
        price=240, install=25, stock=6,
        attrs=dict(part='headlight', zone='front', style='Angel Eye', light_source='LED + projector',
                   drl='LED halo ring', housing='black', lens='clear polycarbonate', set_of=2, warranty_months=12),
        text={
            'uz': ("Angel Eye LED projektor oldi faralar — Cobalt",
                   "LED halo halqali kunduzgi chiroq va linzali projektor, qora korpus. Chevrolet Cobalt 2012–2025 uchun, "
                   "zavod ulagichiga mos, simni kesish shart emas. Komplektda 2 dona."),
            'ru': ("Передние фары Angel Eye LED с линзой — Cobalt",
                   "Дневные ходовые огни LED-кольцом и линзованный проектор, чёрный корпус. Для Chevrolet Cobalt 2012–2025, "
                   "штатный разъём, без врезки в проводку. В комплекте 2 шт."),
            'en': ("Angel Eye LED projector headlights — Cobalt",
                   "LED halo-ring daytime running light and a projector lens in a black housing. For Chevrolet Cobalt 2012–2025, "
                   "plugs into the factory connector, no wire cutting. Set of 2."),
            'ar': ("مصابيح أمامية Angel Eye LED بعدسة — Cobalt",
                   "ضوء نهاري بحلقة LED وعدسة بروجكتور في هيكل أسود. لسيارة Chevrolet Cobalt 2012–2025، "
                   "تتصل بالموصل الأصلي دون قص الأسلاك. طقم من قطعتين."),
            'tr': ("Angel Eye LED projektörlü ön farlar — Cobalt",
                   "LED halka gündüz farı ve projektör mercek, siyah gövde. Chevrolet Cobalt 2012–2025 için, "
                   "orijinal soketle takılır, kablo kesmeye gerek yok. 2 adet takım."),
            'kk': ("Angel Eye LED линзалы алдыңғы шамдар — Cobalt",
                   "LED сақиналы күндізгі шам және линзалы проектор, қара корпус. Chevrolet Cobalt 2012–2025 үшін, "
                   "зауыттық қосқышқа сай, сымды кесу қажет емес. Жиынтықта 2 дана."),
            'ky': ("Angel Eye LED линзалуу алдыңкы фаралар — Cobalt",
                   "LED шакекчелүү күндүзгү жарык жана линзалуу проектор, кара корпус. Chevrolet Cobalt 2012–2025 үчүн, "
                   "заводдук туташтыргычка ылайык, зымды кесүүнүн кереги жок. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши Angel Eye LED бо линза — Cobalt",
                   "Чароғи рӯзонаи ҳалқаи LED ва проектори линзадор, корпуси сиёҳ. Барои Chevrolet Cobalt 2012–2025, "
                   "ба пайвасткунаки заводӣ мувофиқ, буридани сим лозим нест. Маҷмӯа 2 адад."),
        },
    ),
    dict(
        key='cobalt-headlight-02',
        file='cobalt-headlight-02.webp',
        brand='DEPO-style',
        price=165, install=20, stock=9,
        attrs=dict(part='headlight', zone='front', style='Black housing', light_source='halogen projector + reflector',
                   housing='black', lens='clear polycarbonate', bulb='H7 / H1', set_of=2, warranty_months=6),
        text={
            'uz': ("Qora korpusli projektor oldi faralar — Cobalt",
                   "Yaqin nur uchun linzali projektor va reflektorli uzoq nur, qora ichki korpus. Chevrolet Cobalt 2012–2025, "
                   "zavod mahkamlagichlari va ulagichiga mos. Komplektda 2 dona."),
            'ru': ("Передние фары в чёрном корпусе с линзой — Cobalt",
                   "Линзованный проектор ближнего света и рефлектор дальнего, чёрный внутренний корпус. Chevrolet Cobalt 2012–2025, "
                   "штатные крепления и разъём. В комплекте 2 шт."),
            'en': ("Black housing projector headlights — Cobalt",
                   "Projector lens for low beam and a reflector high beam in a black inner housing. Chevrolet Cobalt 2012–2025, "
                   "factory mounts and connector. Set of 2."),
            'ar': ("مصابيح أمامية بهيكل أسود وعدسة — Cobalt",
                   "عدسة بروجكتور للضوء القريب وعاكس للضوء البعيد في هيكل داخلي أسود. Chevrolet Cobalt 2012–2025، "
                   "تثبيت وموصل أصليان. طقم من قطعتين."),
            'tr': ("Siyah gövdeli projektörlü ön farlar — Cobalt",
                   "Kısa far için projektör mercek, uzun far için reflektör, siyah iç gövde. Chevrolet Cobalt 2012–2025, "
                   "orijinal bağlantı noktaları ve soket. 2 adet takım."),
            'kk': ("Қара корпусты линзалы алдыңғы шамдар — Cobalt",
                   "Жақын жарыққа линзалы проектор, алыс жарыққа рефлектор, қара ішкі корпус. Chevrolet Cobalt 2012–2025, "
                   "зауыттық бекіткіштер мен қосқыш. Жиынтықта 2 дана."),
            'ky': ("Кара корпустуу линзалуу алдыңкы фаралар — Cobalt",
                   "Жакынкы жарык үчүн линзалуу проектор, алыскы жарык үчүн рефлектор, кара ички корпус. Chevrolet Cobalt 2012–2025, "
                   "заводдук бекиткичтер жана туташтыргыч. Комплектте 2 даана."),
            'tg': ("Чароғҳои пеши корпуси сиёҳ бо линза — Cobalt",
                   "Проектори линзадор барои нури наздик ва рефлектор барои нури дур, корпуси дохилии сиёҳ. Chevrolet Cobalt 2012–2025, "
                   "маҳкамкунакҳо ва пайвасткунаки заводӣ. Маҷмӯа 2 адад."),
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
    shops = rest('GET', f'shops?shop_name=eq.{urllib.request.quote(SHOP_NAME)}&select=id')
    if not shops:
        sys.exit(f'Shop "{SHOP_NAME}" not found.')
    shop_id = shops[0]['id']
    models = rest('GET', f'vehicle_models?slug=eq.{MODEL_SLUG}&select=id')
    if not models:
        sys.exit(f'Vehicle model "{MODEL_SLUG}" not found.')
    model_id = models[0]['id']

    for p in PARTS:
        # Replace an earlier copy (images and fitment cascade).
        rest('DELETE', f'catalog_items?shop_id=eq.{shop_id}&attributes->>seed_key=eq.{p["key"]}', prefer='return=minimal')
    if purge:
        call('DELETE', '/storage/v1/object/catalog', dict(prefixes=[f'{shop_id}/{p["file"]}' for p in PARTS]))
        print('Cobalt headlights removed.')
        return

    now = datetime.now(timezone.utc).isoformat()
    for p in PARTS:
        with open(os.path.join(ASSETS, p['file']), 'rb') as f:
            call('POST', f'/storage/v1/object/catalog/{shop_id}/{p["file"]}', raw=f.read(),
                 headers={'Content-Type': 'image/webp', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000'})
        url = f'{URL}/storage/v1/object/public/catalog/{shop_id}/{p["file"]}'
        name, desc = p['text']['uz']
        item_id = str(uuid.uuid4())
        rest('POST', 'catalog_items', [dict(
            id=item_id, shop_id=shop_id, category='lighting', name=name, brand=p['brand'], description=desc,
            price_cents=p['price'] * 100, input_currency='USD', input_price=p['price'], stock=p['stock'],
            install_available=True, install_price_cents=p['install'] * 100,
            attributes={**p['attrs'], 'seed_key': p['key']}, status='PUBLISHED', cover_image_url=url,
            published_at=now, source_lang='uz',
            translations={l: dict(name=t[0], description=t[1], manual=False) for l, t in p['text'].items() if l != 'uz'},
            translations_hash=hashlib.sha1(f'{name}\u0000{desc}'.encode()).hexdigest(),
        )], prefer='return=minimal')
        rest('POST', 'catalog_item_images', [dict(item_id=item_id, url=url, kind='STUDIO', position=0)], prefer='return=minimal')
        rest('POST', 'catalog_item_fitment', [dict(item_id=item_id, model_id=model_id, year_from=YEARS[0], year_to=YEARS[1])],
             prefer='return=minimal')
        print(f'  {name}  ->  {item_id}')
    print('Done: 2 Cobalt headlights, fitted to Chevrolet Cobalt only.')


if __name__ == '__main__':
    main()
