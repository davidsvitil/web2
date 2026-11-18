"""Download raw pages from autolaky-eshop.com (sitemaps, colour listings, regular product pages).
Polite: max 4 parallel requests, cached on disk (raw/), safe to re-run."""
import os, re, subprocess, sys, hashlib
from concurrent.futures import ThreadPoolExecutor

BASE = 'https://www.autolaky-eshop.com'
WD = os.path.dirname(os.path.abspath(__file__))
RAW = f'{WD}/raw'
for d in ('sm', 'lst', 'prod'): os.makedirs(f'{RAW}/{d}', exist_ok=True)

def get(url, dst, check=None):
    if os.path.exists(dst) and os.path.getsize(dst) > 1000: return dst
    for _ in range(4):
        subprocess.run(['curl', '-sSL', '-m', '90', '--retry', '3', '-A', 'Mozilla/5.0 (concept-site catalogue builder)', '-o', dst, url])
        if os.path.exists(dst) and (not check or check in open(dst, errors='ignore').read()): return dst
    print('FAIL', url, file=sys.stderr)

def loc(f): return re.findall(r'<loc>([^<]+)</loc>', open(f).read())

COLOR_PREFIX = re.compile(r'^(autolak-do-pistole|autolak-ve-spreji|opravna-tuzka-2v1|barva-na-auto|barva-ve-spreji|retusovaci-tuzka-2v1|polyuretanova-2k|bezzakladova-2k|matna-polyuretanova|akrylatova-1k-barva|akrylatova-2k-barva|motolak-ve-spreji|prumyslovy-lak-axalta|korekcni-tuzka|lakova-tuzka|opravna-lahvicka|autolaky-do-pistole|autolaky-ve-spreji)-')

def main():
    get(f'{BASE}/sitemap.xml', f'{RAW}/sm/index.xml', '</sitemapindex>')
    maps = loc(f'{RAW}/sm/index.xml')
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda u: get(u, f'{RAW}/sm/' + u.replace(BASE + '/', '').replace('/', '_'), '</urlset>'), maps))
    prods, secs = set(), []
    for u in maps:
        f = f'{RAW}/sm/' + u.replace(BASE + '/', '').replace('/', '_')
        if not os.path.exists(f): continue
        if 'sitemap_products.xml' in u: prods |= set(loc(f))
        if 'sitemap_products_sections' in u: secs = loc(f)
    open(f'{RAW}/products.txt', 'w').write('\n'.join(sorted(prods)))
    # colour listings: every brand section under spray / gun / touch-up pens (page 1 holds the full colour-code filter)
    lst = [s for s in secs if re.search(r'_k(463|405|525)/.+_k\d+/$', s)]
    regular = [u for u in prods if not COLOR_PREFIX.match(u.replace(BASE + '/', ''))]
    print('products', len(prods), 'colour sections', len(lst), 'regular', len(regular), file=sys.stderr)
    key = lambda u: hashlib.md5(u.encode()).hexdigest()[:12]
    open(f'{RAW}/lst/index.tsv', 'w').write('\n'.join(f'{key(u)}\t{u}' for u in lst))
    open(f'{RAW}/prod/index.tsv', 'w').write('\n'.join(f'{key(u)}\t{u}' for u in sorted(regular)))
    jobs = [(u, f'{RAW}/lst/{key(u)}.html') for u in lst] + [(u, f'{RAW}/prod/{key(u)}.html') for u in sorted(regular)]
    with ThreadPoolExecutor(4) as ex:
        for n, _ in enumerate(ex.map(lambda j: get(j[0], j[1], '</html>'), jobs), 1):
            if n % 100 == 0: print(n, '/', len(jobs), file=sys.stderr)
    print('done', file=sys.stderr)

if __name__ == '__main__':
    main()
