# Autolaky – koncept nového e-shopu

Statický frontend (HTML + CSS + vanilla JS, bez buildu) pro autolaky-eshop.com, vizuálně inspirovaný patike.ch – stejný designový jazyk jako koncept Montana Cans (tmavý rám, zaoblené plochy, plovoucí pill menu, obří „ghost“ nápisy), laděný do autolaků: pozadí stránky se přebarví podle vybraného odstínu.

**Jde o neoficiální návrh** – stránka má trvalý pruh „KONCEPT“, vodoznak a `noindex`.

## Co umí
- **Vyhledávač odstínů** – 42 242 barev, 58 značek (osobní auta, motocykly, truck & bus). Hledání podle kódu nebo názvu v jedné značce i napříč všemi, filtr formy (sprej / pistole / tužka) a orientační barevný filtr.
- **Detail odstínu** – volba formy (sprej 400 ml, do pistole 100 ml uni/metalíza, opravná tužka 2v1, motolak), doplňkové sady pro opravu, množstevní sleva od 3 ks, kde u značky najít kód, pracovní postup. Produkty jsou vlastní SVG ilustrace v barvě odstínu.
- **Shop příslušenství** – 1 021 produktů (laky a základy, příprava povrchu, nářadí, autokosmetika, průmyslové barvy) s fotkami, popisy, pracovními postupy, parametry a technickými listy.
- Košík (localStorage), objednávka zatím přes e-mail (mailto), stránka prodejen a poradna „Kde je kód barvy“.

## Spuštění lokálně
```bash
cd autolaky
python3 -m http.server 8000   # http://localhost:8000
```
Data se načítají přes `fetch`, otevření `index.html` přímo ze souboru nefunguje.

## Nasazení
Kořenový `index.html` přesměruje do `autolaky/`. Settings → Pages → Source: **GitHub Actions** (workflow `.github/workflows/pages.yml` nasazuje při pushi do `main`), případně „Deploy from a branch“ (main, /root).

## Struktura
- `index.html`, `css/style.css`, `js/app.js` – router (`#/`, `#/barvy`, `#/barvy/:značka`, `#/barva/:značka/:kód`, `#/shop/:kat/:podkat`, `#/p/:id`, `#/kod-barvy`, `#/prodejny`)
- `data/brands.json` – značky, počty odstínů, ceny forem; `data/colors/<značka>.json` – odstíny (načítají se až při otevření značky)
- `data/catalog.json` – příslušenství; `assets/img/p/` – fotky (WebP)

## Poctivě: co je odhad a co chybí
- **Náhledy barev jsou orientační** – zdrojový e-shop neuvádí HEX hodnoty, barva náhledu je odvozená z názvu odstínu (~92 % odstínů, zbytek má neutrální vzor). Ikonické odstíny v carouselu mají ručně nastavený náhled.
- **Ceny barev jsou ceníkové podle formy** (sprej 529 Kč, pistole 244/297 Kč, tužka 471 Kč, motolak 807 Kč, dvouvrstvé perleti dráž) – stav 18. 11. 2026. U pistole si zákazník volí uni / metalízu, protože typ efektu z kódu nevyplývá.
- Sklad, platby a objednávky v reálném čase – statický web nic nesynchronizuje. Pro ostrý provoz napojit na stávající platformu (WPJ) nebo jiné řešení.
- Průmyslové palety RAL/NCS/Pantone (Marty's, Axalta) zatím nejsou ve vyhledávači; Belton RAL je v shopu.

Data se generují skripty v `tools/autolaky/` (viz README tam).
