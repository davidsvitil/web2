"""Build the car-colour database (data/colors/*.json) from sitemap URLs + brand listing pages.

Every colour on autolaky-eshop.com exists as separate products per form (spray / gun / touch-up pen)
and often under several SEO names. We collapse them to one record per brand + colour code + name
and remember which forms exist (with the source product id so an order can reference it)."""
import re, html, json, os, sys, unicodedata, collections, statistics

WD = os.path.dirname(os.path.abspath(__file__))
SITE = sys.argv[1]
RAW = f'{WD}/raw'
OUT = f'{SITE}/data/colors'
os.makedirs(OUT, exist_ok=True)

def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

# ---------- forms ----------
FORMS = {  # key: (prefix regexes, label)
    'spray': [r'autolak-ve-spreji', r'barva-na-auto-ve-spreji', r'autolaky-ve-spreji', r'barva-ve-spreji'],
    'gun':   [r'autolak-do-pistole', r'autolaky-do-pistole'],
    'pen':   [r'opravna-tuzka-2v1', r'retusovaci-tuzka-2v1', r'korekcni-tuzka-2v1', r'lakova-tuzka-2v1', r'opravna-lahvicka-2v1'],
    'moto':  [r'motolak-ve-spreji'],
}
FORM_RE = [(f, re.compile(r'^(' + p + r')-(.+)_z(\d+)/$')) for f, ps in FORMS.items() for p in ps]

# ---------- brand listings ----------
idx = dict(l.split('\t') for l in open(f'{RAW}/lst/index.tsv').read().split('\n') if l)
brands = {}          # brand slug -> {name, codes:set, forms:{form: count}, prices:{form:[...]}}
def filt(s, name):
    m = re.search(r'data-param-wrapper="' + name + r'">(.*?)</div>\s*</div>', s, re.S)
    if not m: return []
    return [(html.unescape(a).strip(), int(b)) for a, b in re.findall(r'custom-control-text">\s*(.*?)\s*<small>\(<span class="filter-count"[^>]*>(\d+)<', m.group(1), re.S)]

form_prices = collections.defaultdict(list)
listing_names = {}   # product id -> real product name
listing_imgs = {}
for key, url in idx.items():
    f = f'{RAW}/lst/{key}.html'
    if not os.path.exists(f): continue
    s = open(f, errors='ignore').read()
    path = url.split('.com/')[1]
    form = 'moto' if '_k1338/' in path else {'463': 'spray', '405': 'gun', '525': 'pen'}[re.match(r'[^/]+_k(\d+)/', path).group(1)]
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    h1 = html.unescape(re.sub(r'<[^>]+>', '', h1.group(1))).strip() if h1 else ''
    zn = filt(s, 'znacka-vozu')
    bname = zn[0][0] if len(zn) == 1 else re.sub(r'^.*(na vozy|na motocykly|na motocykl|na skútry|na elektromobily|ve spreji|do pistole|tužky 2v1|tužka 2v1|tužky)\s+', '', h1, flags=re.I).strip()
    bname = re.sub(r'\s*\(.*?\)', '', bname).strip() or h1
    codes = [c for c, _ in filt(s, 'kod-barvy')]
    for m in re.finditer(r'"name":"((?:[^"\\]|\\.)*)","vat":\d+,"price":([\d.]+).*?"url":"([^"]+)","imageUrl":"([^"]*)"', s):
        name = json.loads('"' + m.group(1) + '"')
        if '2ks' in name.lower(): form_prices[form + '2'].append(float(m.group(2))); continue
        if form == 'gun' and ('truck-laky' in path or 'uzitkove' in path): continue
        pid = re.search(r'_z(\d+)', m.group(3))
        if pid:
            listing_names[int(pid.group(1))] = re.sub(r'\s+', ' ', name).strip()
            listing_imgs[int(pid.group(1))] = m.group(4).replace('\\/', '/')
        form_prices[form].append(float(m.group(2)))
    bs = slugify(bname)
    if bs.endswith('-truck') and bs[:-6] in ('daf', 'man', 'scania', 'iveco', 'volvo', 'renault', 'mercedes'):
        bname = bname[:-6].strip() + ' truck'
    b = brands.setdefault(bs, {'name': bname, 'codes': set(), 'sections': set()})
    b['codes'] |= set(codes)
    b['sections'].add(path)

# brand aliases seen in product slugs
ALIAS = {'vw': 'volkswagen', 'mercedes-benz': 'mercedes', 'ssangyong': 'ssangyong-kgm'}
NICE = {'ssangyong-kgm': 'SsangYong (KGM)', 'daf': 'DAF', 'man': 'MAN', 'iveco': 'Iveco', 'scania': 'Scania', 'aprilia': 'Aprilia', 'ducati': 'Ducati', 'harley-davidson': 'Harley-Davidson', 'kawasaki': 'Kawasaki', 'piaggio': 'Piaggio', 'neoplan-bus': 'Neoplan Bus', 'setra-bus': 'Setra Bus', 'renault-truck': 'Renault Truck', 'volvo-truck': 'Volvo Truck', 'mercedes-truck': 'Mercedes Truck', 'citroen': 'Citroën', 'kia': 'Kia'}
MERGE = {}
for k in list(brands):
    if k.endswith('-truck') and k[:-6] in ('daf', 'man', 'scania', 'iveco') and k[:-6] in brands:
        brands[k[:-6]]['codes'] |= brands[k]['codes']; brands[k[:-6]]['sections'] |= brands[k]['sections']
        MERGE[k] = k[:-6]
for k, v in NICE.items():
    if k in brands: brands[k]['name'] = v
brand_slugs = sorted(brands, key=len, reverse=True)
print('brands', len(brands), file=sys.stderr)

# ---------- colour records from sitemap ----------
urls = [u.split('.com/')[1] for u in open(f'{RAW}/products.txt').read().split('\n') if u]
records = {}   # (brand, code, name) -> rec
code_slug_cache = {}
def code_slugs(bs):
    if bs not in code_slug_cache:
        code_slug_cache[bs] = sorted({(slugify(c), c) for c in brands[bs]['codes'] if slugify(c)}, key=lambda x: -len(x[0]))
    return code_slug_cache[bs]

unmatched = collections.Counter()
for u in urls:
    for form, rx in FORM_RE:
        m = rx.match(u)
        if m: break
    else:
        continue
    rest, pid = m.group(2), int(m.group(3))
    if re.match(r'(ncs|ral|pantone)-', rest):  # industrial palettes handled elsewhere
        continue
    bs = next((b for b in brand_slugs if rest == b or rest.startswith(b + '-')), None)
    if not bs:
        first = rest.split('-')[0]
        bs = ALIAS.get(first)
        if bs and bs in brands: rest = bs + '-' + rest[len(first):].lstrip('-')
        else:
            unmatched[first] += 1; continue
    tail = rest[len(bs):].lstrip('-')
    bs = MERGE.get(bs, bs)
    if tail.startswith('vw-') and bs == 'volkswagen': tail = tail[3:]
    code = None
    for cs, c in code_slugs(bs):
        if tail == cs or tail.startswith(cs + '-'):
            code = c; tail = tail[len(cs):].lstrip('-'); break
    real = listing_names.get(pid)
    if not code:
        parts = tail.split('-', 1)
        code, tail = parts[0].upper(), (parts[1] if len(parts) > 1 else '')
    name = tail.replace('-', ' ').upper().strip()
    two = bool(re.search(r'\b2KS BAL$', name))
    name = re.sub(r'\s*\b2KS BAL$', '', name)
    if real:  # prefer the true spelling from a listing
        rn = re.sub(r'^.*?\b' + re.escape(code) + r'\b\s*', '', real, flags=re.I).strip()
        rn = re.sub(r'\s*2ks/bal\.?$', '', rn, flags=re.I)
        if rn and slugify(rn) == slugify(name): name = rn
    k = (bs, slugify(code), slugify(name))
    r = records.setdefault(k, {'b': bs, 'c': code, 'n': name, 'f': {}})
    r['f'].setdefault(form, pid)
    if two: r['x'] = 1

print('colour records', len(records), 'unmatched', unmatched.most_common(15), file=sys.stderr)

# ---------- approximate swatch from colour name (display only) ----------
HUES = [
    (r'\b(black|schwarz|noir|nero|negro|preto|cerna|zwart|svart|onyx|ebony|obsidian|phantom|midnight|nera)\b', '#16171a'),
    (r'\b(anthra\w*|graphit\w*|graphite|carbon|gunmetal|grafit\w*|meteor|magnet\w*|dark grey|dark gray|dunkelgrau)\b', '#3c3f44'),
    (r'\b(white|weiss|weis|blanc|blanche|bianco|blanco|branco|wit|bila|ivory|alabaster|pearl white|glacier|polar|alpin\w*|candy|snow|cristal)\b', '#eef0f0'),
    (r'\b(silver|silber|argent\w*|plata|prata|zilver|stribrna|titan\w*|platin\w*|alu\w*|chrom\w*|moonstone|steel|stahl)\b', '#b8bcc2'),
    (r'\b(grey|gray|grau|gris|grigio|cinza|grijs|seda|slate|ash|cement|stone|smoke|shadow|pewter|granit\w*|nardo|chalk|cool)\b', '#8b8f95'),
    (r'\b(red|rot|rouge|rosso|rojo|vermelho|rood|cervena|crimson|ruby|rubin\w*|scarlet|cherry|kirsch\w*|bordeaux|burgundy|garnet|carmine|tornado|flame|magma|lava|wine|merlot|corrida|chili|tomato|candy red)\b', '#b3191f'),
    (r'\b(orange|apricot|aprikot\w*|arancio|naranja|laranja|oranje|tangerine|papaya|copper|kupfer|cuivre|rame|cobre|sunset|amber)\b', '#e0661c'),
    (r'\b(yellow|gelb|jaune|giallo|amarillo|amarelo|geel|zluta|lemon|zitron\w*|canary|sun\w*|mustard|ptt)\b', '#f0c419'),
    (r'\b(gold|golden|or|oro|ouro|champagne|sahara|sand\w*|desert|bronze|brass|honey)\b', '#c2a160'),
    (r'\b(beige|creme|cream|crema|ecru|vanill\w*|cashmere|kaschmir|taupe|mocca|mokka|latte|elfenbein|avorio|sable)\b', '#d8c7a5'),
    (r'\b(brown|braun|brun|marron|marrone|castano|bruin|hneda|chocolate|cocoa|kakao|coffee|kaffee|havanna|havana|nougat|chestnut|mahagon\w*|mahogany|nutria|terra|cognac|tabac\w*|walnut)\b', '#5e3d2a'),
    (r'\b(green|gruen|grun|vert|verte|verde|groen|zelena|olive|oliv\w*|jade|emerald|smaragd|lime|mint|forest|wald\w*|tanne\w*|moss|racing green|khaki|kaki|lind\w*|turquoise|tuerkis|turkis|petrol)\b', '#2f6b3a'),
    (r'\b(blue|blau|bleu|blu|azul|azzurro|blauw|modra|navy|marine|ocean|ozean|sapphire|saphir|cobalt|kobalt|indigo|azure|sky|himmel\w*|aqua|denim|royal|lapis|atlantic|nordsee\w*|petrol|race blue|ice blue|baltic)\b', '#1f4f9c'),
    (r'\b(violet|viol\w*|purple|purpur|lila|lilac|aubergine|plum|pflaume|amethyst|magenta|mauve|fialova|berry)\b', '#5b2a6e'),
    (r'\b(pink|rosa|rose|ros[ée]|fuchsia|ruzova|flamingo|coral|koral\w*|salmon|lachs)\b', '#d86a8f'),
]
LIGHT = r'\b(light|hell|clair|chiaro|claro|pale|pastel|svetla|silk)\b'
DARK = r'\b(dark|dunkel|fonce|foncé|scuro|oscuro|deep|tief|tmava|night|nacht)\b'
EFFECT_MET = r'\b(met|metallic|metal\w*|metalizado|metallizzato|mica|metalic)\b'
EFFECT_PEARL = r'\b(pearl|perl\w*|perla|nacre|nacré|xirallic|crystal|kristall)\b'

def mix(hexc, f):
    n = int(hexc[1:], 16); rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    rgb = [round(x + (255 - x) * f) if f > 0 else round(x * (1 + f)) for x in rgb]
    return '#' + ''.join(f'{x:02x}' for x in rgb)

DE = [('schwarz', 'black'), ('weiss', 'white'), ('weis', 'white'), ('silber', 'silver'), ('grau', 'grey'), ('blau', 'blue'), ('gruen', 'green'),
      ('gelb', 'yellow'), ('braun', 'brown'), ('rot', 'red'), ('orange', 'orange'), ('beige', 'beige'), ('violett', 'violet'), ('gold', 'gold'),
      ('bila', 'white'), ('cerna', 'black'), ('seda', 'grey'), ('modra', 'blue'), ('zelena', 'green'), ('cervena', 'red'), ('stribrna', 'silver'), ('zluta', 'yellow'),
      ('oranzova', 'orange'), ('fialova', 'violet'), ('bezova', 'beige'), ('hneda', 'brown'), ('zlata', 'gold'), ('ruzova', 'pink'), ('metaliza', 'metallic'), ('perlet', 'pearl')]
def approx(name):
    low = slugify(name).replace('-', ' ')
    # split German / Czech compounds: "oryxweiss" -> "oryx white", "hellgrau" -> "hell grey"
    for a, b in DE:
        low = re.sub(r'(?<=\w)' + a + r'\b', ' ' + b, low)
        low = re.sub(r'\b' + a + r'(?=\w)', b + ' ', low)
    hexc = None
    best = None
    for rx, h in HUES:
        m = None
        for m in re.finditer(rx, low): pass
        if m and (best is None or m.start() > best[0]):  # last colour word wins ("silver blue" -> blue)
            best = (m.start(), h)
    if best: hexc = best[1]
    if not hexc: return None, None
    if re.search(LIGHT, low): hexc = mix(hexc, .35)
    if re.search(DARK, low): hexc = mix(hexc, -.4)
    fx = 'p' if re.search(EFFECT_PEARL, low) else 'm' if re.search(EFFECT_MET, low) else None
    return hexc, fx

# Czech colour words lose their diacritics in product URLs – put them back
CZ = {'CERVENA': 'ČERVENÁ', 'ZELENA': 'ZELENÁ', 'BILA': 'BÍLÁ', 'CERNA': 'ČERNÁ', 'SEDA': 'ŠEDÁ', 'MODRA': 'MODRÁ', 'STRIBRNA': 'STŘÍBRNÁ',
      'ZLUTA': 'ŽLUTÁ', 'ORANZOVA': 'ORANŽOVÁ', 'HNEDA': 'HNĚDÁ', 'BEZOVA': 'BÉŽOVÁ', 'FIALOVA': 'FIALOVÁ', 'METALIZA': 'METALÍZA',
      'ZLATA': 'ZLATÁ', 'SVETLE': 'SVĚTLE', 'SVETLA': 'SVĚTLÁ', 'TMAVE': 'TMAVĚ', 'TMAVA': 'TMAVÁ', 'PERLET': 'PERLEŤ', 'LEDOVA': 'LEDOVÁ',
      'RUZOVA': 'RŮŽOVÁ', 'SEDOBILA': 'ŠEDOBÍLÁ', 'SNEHOBILA': 'SNĚHOBÍLÁ', 'SNEHOVA': 'SNĚHOVÁ', 'MECHOVA': 'MECHOVÁ', 'OLIVOVA': 'OLIVOVÁ',
      'VINOVA': 'VÍNOVÁ', 'NEBESKY': 'NEBESKY', 'KRIDOVA': 'KŘÍDOVÁ', 'PISKOVA': 'PÍSKOVÁ', 'MEDENA': 'MĚDĚNÁ', 'KOVOVA': 'KOVOVÁ', 'MATNA': 'MATNÁ'}
def czfix(n):
    return re.sub(r'\b[A-Z]+\b', lambda m: CZ.get(m.group(0), m.group(0)), n)
for r in records.values(): r['n'] = czfix(r['n'])

# ---------- write per-brand files ----------
by_brand = collections.defaultdict(list)
for r in records.values(): by_brand[r['b']].append(r)
index = []
for bs, lst in sorted(by_brand.items(), key=lambda x: slugify(brands[x[0]]['name'])):
    lst.sort(key=lambda r: (r['c'].lower(), r['n']))
    rows = []
    for r in lst:
        h, fx = approx(r['n'])
        row = [r['c'], r['n'], ''.join(k[0] for k in ('spray', 'gun', 'pen', 'moto') if k in r['f']),
               [r['f'].get(k, 0) for k in ('spray', 'gun', 'pen', 'moto')]]
        row.append(h or '')
        if fx or r.get('x'): row.append(fx or '')
        if r.get('x'): row.append(1)
        rows.append(row)
    json.dump(rows, open(f'{OUT}/{bs}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    forms = collections.Counter(c for row in rows for c in row[2])
    kind = 'moto' if all(s.startswith('autolaky-ve-spreji_k463/motolaky') for s in brands[bs]['sections']) else \
           'truck' if any('truck' in s or '-bus_' in s or 'john-deere' in s for s in brands[bs]['sections']) and not any(re.search(r'na-vozy', s) for s in brands[bs]['sections']) else 'car'
    index.append({'k': bs, 'n': brands[bs]['name'], 't': kind, 'cnt': len(rows), 'f': dict(forms)})

price = {f: statistics.median(v) for f, v in form_prices.items() if v}
pmin = {f: min(v) for f, v in form_prices.items() if v}
json.dump({'brands': index, 'price': price, 'priceMin': pmin}, open(f'{SITE}/data/brands.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('brands written', len(index), 'colours', sum(b['cnt'] for b in index), 'price', price, pmin, file=sys.stderr)
print(collections.Counter(tuple(sorted(collections.Counter(form_prices[f]).most_common(4))) for f in form_prices), file=sys.stderr)
