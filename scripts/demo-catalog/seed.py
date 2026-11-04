# -*- coding: utf-8 -*-
"""Seeds demo workshops + ~150 catalog products into Supabase (idempotent: re-running replaces demo data).

    python3 scripts/demo-catalog/seed.py            # seed
    python3 scripts/demo-catalog/seed.py --purge    # remove only the demo data

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local. Nothing secret is stored here.
Demo owners are identified by the @demo.carvision.uz e-mail domain.
"""
import hashlib
import json
import os
import random
import re
import secrets
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import data  # noqa: E402
import images  # noqa: E402

env = {}
for line in open(os.path.join(ROOT, '.env.local'), encoding='utf-8'):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.strip())
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"')
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
DEMO_DOMAIN = '@demo.carvision.uz'


def call(method, path, body=None, headers=None, raw=None, ok=(200, 201, 204)):
    h = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
    h.update(headers or {})
    payload = raw
    if body is not None:
        payload = json.dumps(body).encode()
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(URL + path, data=payload, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read().decode() or 'null'
            return r.status, json.loads(txt) if txt.strip().startswith(('{', '[', 'n')) else txt
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        if e.code in ok:
            return e.code, txt
        raise RuntimeError(f'{method} {path} -> {e.code}: {txt[:300]}')


def rest(method, table, body=None, query='', prefer='return=representation'):
    return call(method, f'/rest/v1/{table}{query}', body, {'Prefer': prefer})[1]


def find_user(email):
    page = 1
    while True:
        _, res = call('GET', f'/auth/v1/admin/users?page={page}&per_page=200')
        users = res.get('users', []) if isinstance(res, dict) else []
        for u in users:
            if (u.get('email') or '').lower() == email:
                return u['id']
        if len(users) < 200:
            return None
        page += 1


def ensure_owner(key, s):
    uid = find_user(s['email'])
    if not uid:
        _, u = call('POST', '/auth/v1/admin/users', dict(
            email=s['email'], password=secrets.token_urlsafe(24), email_confirm=True,
            app_metadata={'role': 'b2b_seller'}, user_metadata={'full_name': s['owner'], 'demo': True}))
        uid = u['id']
    rest('POST', 'profiles', [dict(id=uid, role='b2b_seller', full_name=s['owner'], phone=s['phone'], preferred_locale='uz', phone_verified=True)],
         '?on_conflict=id', 'resolution=merge-duplicates,return=minimal')
    shop = rest('GET', 'shops', query=f'?owner_id=eq.{uid}&select=id')
    shop_fields = dict(owner_id=uid, shop_name=s['name'], city=s['city'], district=s['district'], exact_address=s['addr'],
                       geo_lat=s['lat'], geo_lng=s['lng'], phone=s['phone'], is_verified=True, current_plan_code='PRO_800',
                       plan_expires_at=(datetime.now(timezone.utc) + timedelta(days=365)).isoformat(), credits_balance=800,
                       watermark_enabled=False, max_devices=3, rating_avg=s['rating'], rating_count=s['rc'])
    if shop:
        rest('PATCH', 'shops', shop_fields, f'?id=eq.{shop[0]["id"]}', 'return=minimal')
        return uid, shop[0]['id']
    shop_fields['referral_code'] = secrets.token_hex(5).upper()
    return uid, rest('POST', 'shops', [shop_fields])[0]['id']


def purge_items(shop_id):
    rest('DELETE', 'catalog_items', query=f'?shop_id=eq.{shop_id}', prefer='return=minimal')  # images/fitment cascade
    # remove stored files of this shop
    try:
        _, files = call('POST', '/storage/v1/object/list/catalog', dict(prefix=f'{shop_id}/', limit=1000))
        names = [f'{shop_id}/{f["name"]}' for f in files if f.get('name')]
        if names:
            call('DELETE', '/storage/v1/object/catalog', dict(prefixes=names))
    except Exception as e:  # storage cleanup is best-effort
        print('  storage cleanup skipped:', str(e)[:100])


# --------------------------------------------------------------------------- text
def col_name(item, lang):
    c = item['attrs'].get('color')
    if not c or c not in data.COL:
        return c or ''
    return data._col(c, lang)


def describe(item, lang):
    i = {'uz': 0, 'ru': 1, 'en': 2}[lang]
    if item['cat'] == 'wheels':
        m = item['model']
        intro = data.INTRO['wheels'][i].format(brand=item['brand'], model=m['model'], dia=m['dia'], wid=m['wid'], pcd=m['pcd'], et=m['et'],
                                                col=col_name(item, lang))
    else:
        intro = data.INTRO[item['cat']][i].format(brand=item['brand'])
    feats = [data.FE[f][i] for f in item['feats']]
    if item['inst'] > 0 and 'install' not in item['feats']:
        feats.append(data.FE['install'][i])
    return intro + '\n\n' + '\n'.join('• ' + f for f in feats)


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]


def main():
    purge_only = '--purge' in sys.argv
    print('Owners & shops...')
    shop_ids = {}
    for key, s in data.SHOPS.items():
        uid, sid = ensure_owner(key, s)
        shop_ids[key] = sid
        print(f'  {s["name"]:28s} {sid}')
    for sid in shop_ids.values():
        purge_items(sid)
    if purge_only:
        print('Demo items removed.')
        return

    try:
        rest('GET', 'catalog_items', query='?select=source_lang&limit=1')
        has_tr = True
    except RuntimeError:
        has_tr = False
        print('NOTE: translations columns missing (migration 20261110000000_catalog_translations.sql not applied): seeding uz text only.')

    print('Vehicle models...')
    models = {}
    off = 0
    while True:
        batch = rest('GET', 'vehicle_models', query=f'?select=id,slug,name&limit=1000&offset={off}')
        models.update({m['slug']: m['id'] for m in batch})
        if len(batch) < 1000:
            break
        off += 1000
    missing = set()

    tmp = tempfile.mkdtemp(prefix='demo-catalog-')
    rnd = random.Random(42)
    now = datetime.now(timezone.utc)
    jobs = []
    for n, it in enumerate(data.ITEMS):
        sid = shop_ids[it['shop']]
        base = slugify(it['name'])
        variants = 2 if it['img']['k'] == 'wheel' else 1
        files = []
        for v in range(variants):
            fn = f'{base}-{v + 1}.jpg'
            files.append((fn, os.path.join(tmp, f'{n}-{v}.jpg'), v))
        jobs.append((it, sid, files))

    print(f'Rendering {sum(len(j[2]) for j in jobs)} images...')

    def render_job(args):
        it, sid, files = args
        for fn, path, v in files:
            images.render(it['img'], it['name'], path, variant=v)

    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as ex:
        list(ex.map(render_job, jobs))

    print('Uploading images...')

    def upload(args):
        sid, fn, path = args
        with open(path, 'rb') as f:
            call('POST', f'/storage/v1/object/catalog/{sid}/{fn}', raw=f.read(), headers={'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000'})
    ups = [(sid, fn, path) for it, sid, files in jobs for fn, path, v in files]
    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(upload, ups))

    print('Inserting products...')
    rows, rel = [], []
    for it, sid, files in jobs:
        pub = f'{URL}/storage/v1/object/public/catalog/{sid}/'
        desc = {l: describe(it, l) for l in ('uz', 'ru', 'en')}
        name = it['name']
        h = hashlib.sha1(f'{name}\u0000{desc["uz"]}'.encode()).hexdigest()
        created = now - timedelta(days=rnd.randint(0, 45), hours=rnd.randint(0, 23), minutes=rnd.randint(0, 59))
        item_id = __import__('uuid').uuid4().hex
        item_id = f'{item_id[:8]}-{item_id[8:12]}-{item_id[12:16]}-{item_id[16:20]}-{item_id[20:]}'
        attrs = {k: v for k, v in it['attrs'].items() if k in ('diameter', 'width', 'pcd', 'offset', 'swatch', 'material', 'color', 'universal')}
        rows.append(dict(
            id=item_id, shop_id=sid, category=it['cat'], name=name, brand=it['brand'], description=desc['uz'],
            price_cents=int(round(it['price'] * 100)), input_currency='USD', input_price=it['price'], stock=it['stock'],
            install_available=it['inst'] > 0, install_price_cents=int(it['inst'] * 100), attributes=attrs, status='PUBLISHED',
            cover_image_url=pub + files[0][0], published_at=created.isoformat(), created_at=created.isoformat(),
            **(dict(source_lang='uz', translations={l: dict(name=name, description=desc[l], manual=False) for l in ('ru', 'en')},
                   translations_hash=h) if has_tr else {})))
        for pos, (fn, _, v) in enumerate(files):
            rel.append(('catalog_item_images', dict(item_id=item_id, url=pub + fn, kind='STUDIO' if pos == 0 else 'ANGLE', position=pos)))
        seen = set()
        for slug, a, b in (it['fit'] or []):
            if slug in seen:
                continue
            seen.add(slug)
            mid = models.get(slug)
            fit = dict(item_id=item_id, year_from=a, year_to=b)
            if mid:
                fit['model_id'] = mid
            else:
                missing.add(slug)
                fit['custom_model'] = slug.replace('-', ' ').title()
            rel.append(('catalog_item_fitment', fit))

    for i in range(0, len(rows), 50):
        rest('POST', 'catalog_items', rows[i:i + 50], prefer='return=minimal')
    for table in ('catalog_item_images', 'catalog_item_fitment'):
        chunk = [r for t, r in rel if t == table]
        # PostgREST bulk insert needs identical keys across rows
        keys = set().union(*[c.keys() for c in chunk])
        chunk = [{k: c.get(k) for k in keys} for c in chunk]
        for i in range(0, len(chunk), 100):
            rest('POST', table, chunk[i:i + 100], prefer='return=minimal')
    print(f'Done: {len(rows)} products, {sum(1 for t, _ in rel if t == "catalog_item_images")} images, '
          f'{sum(1 for t, _ in rel if t == "catalog_item_fitment")} fitment rows.')
    if missing:
        print('Models not in vehicle DB (stored as custom_model):', ', '.join(sorted(missing)))


if __name__ == '__main__':
    main()
