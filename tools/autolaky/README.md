# Aktualizace dat

```bash
python3 tools/autolaky/fetch.py                       # stáhne sitemapy, výpisy značek a stránky příslušenství (cache v raw/)
python3 tools/autolaky/build_colors.py autolaky       # data/brands.json + data/colors/*.json (odstíny podle kódu)
python3 tools/autolaky/build_catalog.py autolaky      # data/catalog.json + WebP fotky příslušenství
```
Potřeba: Python 3, Pillow, curl. Stahování je šetrné (max. 4 paralelní požadavky, vše se cachuje) a respektuje robots.txt (nepoužívá /graphql).
Odstíny se skládají z URL v sitemapě (≈134 000 produktů = odstín × forma × SEO varianty) a z filtru „Kód barvy“ na první stránce výpisu každé značky.
