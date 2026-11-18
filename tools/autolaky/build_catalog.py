"""Turn downloaded regular product pages into data/catalog.json and WebP product photos."""
import re, html, json, os, sys, subprocess, io, collections, unicodedata
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
import threading
_locks = collections.defaultdict(threading.Lock)

WD = os.path.dirname(os.path.abspath(__file__))
SITE = sys.argv[1]
RAW = f'{WD}/raw'
IMGDIR = f'{SITE}/assets/img/p'
CACHE = f'{WD}/imgcache'
os.makedirs(IMGDIR, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
MAX_IMG = 2

def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

# top level categories of the new shop (source category id -> key, label)
TOP = {
    '262': ('lakovani', 'Laky a základy'),
    '1501': ('priprava', 'Příprava povrchu'),
    '1502': ('naradi', 'Nářadí a pomůcky'),
    '551': ('kosmetika', 'Autokosmetika'),
    '309': ('prumyslove', 'Průmyslové barvy'),
}

ALLOWED = {'p', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'br', 'table', 'tr', 'td', 'th', 'tbody', 'thead'}
def clean_html(h):
    h = re.sub(r'<(script|style|iframe|figure|noscript)[^>]*>.*?</\1>', '', h, flags=re.S | re.I)
    def tag(m):
        close, name = m.group(1), m.group(2).lower()
        if name in ('h1', 'h5', 'h6'): name = 'h4'
        if name == 'h2': name = 'h3'
        if name not in ALLOWED: return ' ' if name in ('div', 'span', 'a') else ''
        return f'<{close}{name}>' if name != 'br' else '<br>'
    h = re.sub(r'<(/?)([a-zA-Z0-9]+)[^>]*>', tag, h)
    h = html.unescape(h).replace('\xa0', ' ')
    h = re.sub(r'[ \t\r\n]+', ' ', h)
    for _ in range(3): h = re.sub(r'<(p|li|h[234]|strong|b|em|i|ul|ol)>\s*</\1>', '', h)
    h = re.sub(r'(<br>\s*){2,}', '<br>', h)
    return h.strip()

def tab(s, tid):
    i = s.find(f'id="{tid}"')
    if i < 0: return ''
    i = s.find('>', i) + 1
    j = s.find('class="tab-pane', i)
    seg = s[i:j if j > 0 else i + 60000]
    k = seg.rfind('<a href="#tabs')
    return seg[:k] if k > 0 else seg

def parse(s, url):
    m = re.search(r'<script type="application/ld\+json">(\{"@context": "http://schema.org/","@type": "Product".*?)</script>', s, re.S)
    if not m: return None
    d = json.loads(m.group(1))
    bc = re.search(r'"@type": "BreadcrumbList",\s*"itemListElement":\s*(\[.*?\])\}', s, re.S)
    crumbs = json.loads(bc.group(1)) if bc else []
    crumbs = [(re.search(r'_k(\d+)/$', c['item']['@id']).group(1), c['item']['name']) for c in crumbs if re.search(r'_k(\d+)/$', c['item']['@id'])]
    pid = int(d['productID'])
    o = d['offers']
    variants = []
    for vm in re.finditer(r"gtm_prva\[(\d+)\] = \{[^}]*'variationName': '((?:[^'\\]|\\.)*)'[^}]*'price': ([\d.]+)", s):
        variants.append({'v': int(vm.group(1)), 'l': json.loads('"' + vm.group(2).replace('\\\'', "'") + '"'), 'czk': float(vm.group(3))})
    variants.sort(key=lambda x: x['czk'])
    # tracking data for the main product (availability, discount)
    tr = re.search(r'"products":\[\{"id":"?' + str(pid) + r'[_"].*?\}\]', s)
    trs = tr.group(0) if tr else ''
    avail = re.search(r'"availability":"([^"]*)"', trs)
    avail = json.loads('"' + avail.group(1) + '"') if avail else ''
    pwd = re.search(r'"priceWithoutDiscount":([\d.]+)', trs)
    code = re.search(r'"productCode":"([^"]*)"', trs)
    sale = bool(re.search(r'V\\u00fdprodej|Výprodej', trs)) or any(c[1] == 'Výprodej skladu' for c in crumbs)
    price = float(o['price']) if 'price' in o else (float(o['lowPrice']) if 'lowPrice' in o else None)
    instock = 'InStock' in json.dumps(o)
    desc = clean_html(tab(s, 'tabs-1'))
    short = html.unescape(d.get('description', '')).strip()
    # parameters tab: name/value rows
    tabs = dict((b.strip(), a) for a, b in re.findall(r'data-tab-target="#([^"]+)"[^>]*>([^<]+)<', s))
    params = []
    if 'Parametry' in tabs:
        rows = re.findall(r'<td[^>]*>\s*(.*?)\s*</td>\s*<td[^>]*>\s*(.*?)\s*</td>', tab(s, tabs['Parametry']), re.S)
        params = [[re.sub(r'<[^>]+>', '', html.unescape(a)).strip(' :'), re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html.unescape(b))).strip()] for a, b in rows][:14]
        params = [p for p in params if p[0] and p[1] and p[0] != 'Kód odstínu']
    howto = clean_html(tab(s, tabs['Pracovní postup'])) if 'Pracovní postup' in tabs else ''
    dl = [(u, re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html.unescape(t))).strip()) for u, t in re.findall(r'<a[^>]+href="(/data/[^"]+\.pdf[^"]*)"[^>]*>(.*?)</a>', s, re.S)]
    brand = html.unescape(html.unescape(d.get('brand', {}).get('name', ''))).strip()
    return {
        'pid': pid, 'name': re.sub(r'\s+', ' ', html.unescape(d['name'])).strip(), 'brand': brand,
        'code': code.group(1) if code else d.get('sku', ''), 'czk': price,
        'reg': float(pwd.group(1)) if pwd and price and float(pwd.group(1)) > price + .5 else None,
        'stock': instock, 'avail': avail, 'sale': sale,
        'img': d.get('image', []) if isinstance(d.get('image'), list) else [d.get('image')],
        'short': short, 'desc': desc, 'howto': howto, 'params': params, 'dl': dl[:4], 'crumbs': crumbs, 'var': variants, 'src': url,
    }

idx = dict(l.split('\t') for l in open(f'{RAW}/prod/index.tsv').read().split('\n') if l)
items = []
for key, url in idx.items():
    f = f'{RAW}/prod/{key}.html'
    if not os.path.exists(f): continue
    p = parse(open(f, errors='ignore').read(), url)
    if p: items.append(p)
print('parsed', len(items), file=sys.stderr)

# ---------- categories ----------
cats = collections.OrderedDict((v[0], {'key': v[0], 'name': v[1], 'subs': collections.OrderedDict()}) for v in TOP.values())
products = []
for p in items:
    top = next((c for c in p['crumbs'] if c[0] in TOP), None)
    if not top:
        # products living only under the colour sections (repair kits, empty cans…) -> tools
        top = ('1502', TOP['1502'][1])
    ck = TOP[top[0]][0]
    i = [c[0] for c in p['crumbs']].index(top[0]) if top in p['crumbs'] else -1
    sub = p['crumbs'][i + 1] if 0 <= i < len(p['crumbs']) - 1 else None
    sk = None
    if sub:
        sk = slugify(sub[1])
        cats[ck]['subs'].setdefault(sk, {'key': sk, 'name': sub[1], 'n': 0})['n'] += 1
    slug = re.sub(r'_z\d+/?$', '', p['src'].split('.com/')[1])
    prod = {'id': slug, 'pid': p['pid'], 'cat': ck, 'sub': sk, 'name': p['name'], 'brand': p['brand'], 'code': p['code'],
            'czk': p['czk'], 'stock': 1 if p['stock'] else 0, 'avail': p['avail'], 'short': p['short'], 'desc': p['desc'],
            'src': p['src']}
    if p['reg']: prod['reg'] = p['reg']
    if p['sale']: prod['sale'] = 1
    if p['params']: prod['params'] = p['params']
    if p['howto'] and len(p['howto']) > 40: prod['howto'] = p['howto']
    if p['dl']: prod['dl'] = [[('https://www.autolaky-eshop.com' + u) if u.startswith('/') else u, t] for u, t in p['dl']]
    if len(p['var']) > 1:
        prod['var'] = [{'v': v['v'], 'l': re.sub(r'^[^:]{1,40}:\s*', '', v['l']), 'czk': v['czk']} for v in p['var']]
        lab = re.match(r'^([^:]{1,40}):', p['var'][0]['l'])
        prod['varLabel'] = lab.group(1) if lab else 'Varianta'
        prod['czk'] = min(v['czk'] for v in p['var'])
        prod['from'] = len({v['czk'] for v in p['var']}) > 1
    prod['_imgs'] = p['img'][:MAX_IMG]
    products.append(prod)

# ---------- images ----------
def img_job(args):
    url, dst = args
    if os.path.exists(dst): return dst
    cache = os.path.join(CACHE, re.sub(r'[^a-zA-Z0-9.]', '_', url.split('?')[0][-80:]))
    with _locks[cache]:
        return _img(url, dst, cache)

def _img(url, dst, cache):
    def ok(fn):
        try: Image.open(fn).verify(); return True
        except Exception: return False
    if not os.path.exists(cache) or not ok(cache):
        subprocess.run(['curl', '-sSL', '-m', '60', '--retry', '3', '-o', cache, url])
    try:
        im = Image.open(cache)
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.split()[-1]); im = bg
        im = im.convert('RGB'); im.thumbnail((560, 560))
        im.save(dst, 'WEBP', quality=76, method=5)
        return dst
    except Exception as e:
        print('IMG FAIL', url, e, file=sys.stderr); return None

jobs = []
for p in products:
    p['img'] = []
    for n, u in enumerate(p.pop('_imgs')):
        if not u: continue
        dst = f'{IMGDIR}/{p["pid"]}-{n}.webp'
        jobs.append((u, dst)); p['img'].append(f'assets/img/p/{p["pid"]}-{n}.webp')
print('images', len(jobs), file=sys.stderr)
with ThreadPoolExecutor(4) as ex:
    done = {d for d in ex.map(img_job, jobs) if d}
for p in products:
    p['img'] = [i for i in p['img'] if f'{SITE}/{i}' in done]

products.sort(key=lambda p: (list(cats).index(p['cat']), p['sub'] or '', p['name'].lower()))
cats_out = [{'key': c['key'], 'name': c['name'], 'subs': [{'key': s['key'], 'name': s['name']} for s in sorted(c['subs'].values(), key=lambda s: -s['n'])]} for c in cats.values()]
json.dump({'generated': '2026-11-18', 'cats': cats_out, 'products': products}, open(f'{SITE}/data/catalog.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('products', len(products), 'size', os.path.getsize(f'{SITE}/data/catalog.json') // 1024, 'KB', file=sys.stderr)
print(collections.Counter(p['cat'] for p in products), file=sys.stderr)
for c in cats_out: print(c['key'], [s['name'] for s in c['subs']], file=sys.stderr)
