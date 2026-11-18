/* Autolaky — concept storefront (vanilla JS, hash router, localStorage cart).
   Data: data/catalog.json (regular goods), data/brands.json + data/colors/<brand>.json (car paint shades). */
(async () => {
  'use strict';

  /* ---------- settings ---------- */
  const SRC = 'https://www.autolaky-eshop.com';
  const SHOP = {
    phone: '+420 228 229 183', phoneRaw: '+420228229183', email: 'info@autolaky-eshop.com',
    shipFrom: 69, bulkQty: 3, bulkPct: 5,
    terms: SRC + '/obchodni-podminky/', shipping: SRC + '/doprava/', payment: SRC + '/platba/', claims: SRC + '/reklamace/',
    instagram: 'https://www.instagram.com/autolakyeshopcom/', facebook: 'https://www.facebook.com/AutolakyAPrislusenstviBarvyProDumAPrumysl/',
    youtube: 'https://www.youtube.com/channel/UCrcgcFKxx88DctvabCEOSnA',
    company: 'Color index s.r.o.', ico: '07727585', dic: 'CZ07727585', seat: 'Mladoboleslavská 22, 197 00 Praha 9 – Kbely',
  };
  const STORES = [
    { key: 'branna', city: 'Dolní Branná', area: 'Krkonoše', addr: 'Dolní Branná 235, 543 62 Dolní Branná', person: 'Adéla Návesníková', mail: 'info@autolaky-eshop.com', hours: 'Po–Pá 8:00–16:30', last: '16:15', note: 'Hlavní sklad e-shopu, reklamace a vracení zásilek.' },
    { key: 'praha', city: 'Praha', area: 'Kbely', addr: 'Mladoboleslavská 22, 197 00 Praha 9 – Kbely', person: 'Jakub Deml', mail: 'kbely@autolaky-eshop.com', hours: 'Po–Pá 8:00–17:00', last: '16:45' },
    { key: 'liberec', city: 'Liberec', area: 'Vratislavice nad Nisou', addr: 'Tanvaldská 40, 463 11 Liberec', person: 'Gabriela Vaňková', mail: 'liberec@autolaky-eshop.com', hours: 'Po–Pá 8:30–12:30 · 13:00–17:00', last: '16:45' },
    { key: 'usti', city: 'Ústí nad Labem', area: 'Krásné Březno', addr: 'Drážďanská 562/87, 400 07 Ústí nad Labem', person: 'Matěj Fiala', mail: 'usti@autolaky-eshop.com', hours: 'Po–Pá 8:30–12:30 · 13:00–17:00', last: '16:45' },
  ];
  // Paint forms. Prices = current list prices of the source shop (18. 11. 2026); "two" = two-pack pearl shades (2 ks/bal).
  const FORMS = {
    s: { key: 'spray', name: 'Sprej 400 ml', short: 'Sprej', price: 529, two: 807, word: 'SPRAY',
         text: 'Natáčecí tryska s plochým rozstřikem jako u pistole. Jeden sprej vystačí na několik vrstev na plochu ¾ až 1 m².' },
    g: { key: 'gun', name: 'Do pistole 100 ml', short: 'Pistole', price: 297, uni: 244, two: 506, word: 'GUN',
         text: 'Báze pod bezbarvý lak (metalízy, perleti) nebo uni barva. Pro práci se stříkací pistolí, ředí se podle technického listu.' },
    p: { key: 'pen', name: 'Opravná tužka 2v1 · 20 ml', short: 'Tužka', price: 471, two: 667, word: 'TOUCH-UP',
         text: 'Lahvička se dvěma aplikátory – jemný hrot na škrábance a oděrky, štěteček na větší kamínky.' },
    m: { key: 'moto', name: 'Motolak ve spreji 400 ml', short: 'Motolak', price: 807, two: 807, word: 'MOTO',
         text: 'Originální odstín motocyklu namíchaný do spreje s natáčecí tryskou.' },
  };
  const KITS = {
    kit1: { name: 'Kompletní sada pro opravu sprejem', price: 613, text: 'Vše od přípravy podkladu (čistič, brusivo, plnič) po bezbarvý lak na závěr.' },
    kit2: { name: 'Prémiová sada pro opravu sprejem', price: 1327, text: 'Navíc 2K bezbarvý lak nejvyšší kvality, leštící pasta a mikrovláknová utěrka.' },
  };
  const PAGE = 24, SHADES_PAGE = 60;

  // Featured shades (hex = hand-tuned preview of the real paint; the catalogue swatches are estimates from the name)
  const HERO = [
    { b: 'skoda', c: 'LG6E', word: 'MAMBA', hex: '#6b9b2f', dark: '#0d1a05' },
    { b: 'volkswagen', c: 'LY3D', word: 'TORNADO', hex: '#d0142c', dark: '#2a0207' },
    { b: 'bmw', c: 'C16', word: 'LONG BEACH', hex: '#1f74de', dark: '#03142e' },
    { b: 'renault', c: 'J37', word: 'SIRIUS', hex: '#f2c200', dark: '#2a2000' },
    { b: 'bmw', c: 'C41', word: 'FROZEN', hex: '#d96a2b', dark: '#2a1004' },
    { b: 'audi', c: 'LZ7S', word: 'DAYTONA', hex: '#5f6469', dark: '#101214' },
    { b: 'mazda', c: '46V', word: 'SOUL RED', hex: '#a30f1f', dark: '#200206' },
    { b: 'porsche', c: 'M5C', word: 'MIAMI', hex: '#3192dc', dark: '#04172b' },
    { b: 'mercedes', c: '197', word: 'OBSIDIAN', hex: '#2a2c31', dark: '#08090a' },
  ];
  const CAT_STYLE = {
    lakovani:   { a: '#2b6cff', b: '#050f2a', sub: 'Bezbarvé laky · základy · plniče', ico: '◍' },
    priprava:   { a: '#ff8a1f', b: '#2a1202', sub: 'Brusiva · tmely · maskování', ico: '◫' },
    naradi:     { a: '#8b95a3', b: '#121519', sub: 'Pistole · kelímky · ochrana', ico: '⚒' },
    kosmetika:  { a: '#19c3b0', b: '#03221f', sub: 'Pasty · vosky · keramika', ico: '✦' },
    prumyslove: { a: '#e8c21a', b: '#2a2302', sub: 'RAL · NCS · Axalta', ico: '▦' },
  };
  const KIND = { car: 'Osobní auta', moto: 'Motocykly', truck: 'Truck & bus' };

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Math.round(v));
  const norm = x => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tight = x => norm(x).replace(/[^a-z0-9]/g, '');
  const pad = n => String(n).padStart(2, '0');
  const nf = n => new Intl.NumberFormat('cs-CZ').format(n);
  const root = document.documentElement;
  const main = $('#main');
  main.innerHTML = '<section class="stage full"><div class="loading"><span class="script">Míchám…</span></div></section>';

  let DATA, BR;
  try {
    [DATA, BR] = await Promise.all([
      fetch('data/catalog.json', { cache: 'no-cache' }).then(r => r.json()),
      fetch('data/brands.json', { cache: 'no-cache' }).then(r => r.json()),
    ]);
  } catch (e) {
    main.innerHTML = '<section class="stage full"><div class="loading">Katalog se nepodařilo načíst. Spusťte web přes server (viz README).</div></section>';
    return;
  }
  const P = DATA.products;
  const byId = Object.fromEntries(P.map(p => [p.id, p]));
  const CATS = DATA.cats;
  const catOf = k => CATS.find(c => c.key === k);
  const subOf = p => p.sub && catOf(p.cat)?.subs.find(s => s.key === p.sub);
  const BRANDS = BR.brands;
  const brandOf = k => BRANDS.find(b => b.k === k);
  const TOTAL_SHADES = BRANDS.reduce((s, b) => s + b.cnt, 0);

  // colour files, loaded on demand
  const colorCache = {};
  const loadBrand = k => colorCache[k] || (colorCache[k] = fetch(`data/colors/${k}.json`).then(r => r.json()).then(rows => rows.map((r, i) => {
    const hero = HERO.find(h => h.b === k && h.c === r[0]);
    return { i, c: r[0], n: r[1], f: r[2], pid: r[3], h: hero ? hero.hex : (r[4] || ''), fx: r[5] || '', two: !!r[6], b: k };
  })));

  /* ---------- colour rendering ---------- */
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgbHex = a => '#' + a.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const shade = (h, f) => rgbHex(hexRgb(h).map(x => f < 0 ? x * (1 + f) : x + (255 - x) * f));
  const lum = h => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const paintBg = (h, fx) => {
    if (!h) return 'repeating-linear-gradient(45deg,#6d7178 0 6px,#5a5e64 6px 12px)';
    if (fx === 'p') return `radial-gradient(120% 120% at 25% 20%, ${shade(h, .55)} 0%, ${h} 38%, ${shade(h, -.45)} 100%), ${h}`;
    if (fx === 'm') return `radial-gradient(110% 110% at 30% 25%, ${shade(h, .4)} 0%, ${h} 45%, ${shade(h, -.5)} 100%)`;
    return `linear-gradient(160deg, ${shade(h, .12)}, ${h} 60%, ${shade(h, -.15)})`;
  };
  function setColors(a, b) {
    root.style.setProperty('--c1', a);
    root.style.setProperty('--c2', b || shade(a, -.85));
    $('meta[name="theme-color"]').setAttribute('content', b || shade(a, -.85));
  }
  const stageFor = h => {
    if (!h) return ['#5b6068', '#0e0f11'];
    let a = h;
    while (lum(a) > .55) a = shade(a, -.12);   // keep white text readable on light paints
    if (lum(a) < .1) a = shade(a, .25);          // lift near-black so the gradient is visible
    return [a, shade(h, lum(h) > .7 ? -.8 : -.86)];
  };

  let uid = 0;
  /* Product illustration: spray can, paint tin or touch-up bottle in the given colour (own SVG artwork). */
  function productSVG(form, h, fx, code = '', size = '') {
    const id = 'g' + (++uid);
    const col = h || '#7b8088';
    const hi = shade(col, fx ? .5 : .28), lo = shade(col, -.55), mid = shade(col, -.15);
    const flake = fx ? `<rect x="0" y="0" width="200" height="400" fill="url(#${id}f)" opacity=".5"/>` : '';
    const defs = `<defs>
      <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${lo}"/><stop offset=".28" stop-color="${hi}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
      <linearGradient id="${id}m" x1="0" x2="1"><stop offset="0" stop-color="#5d636b"/><stop offset=".3" stop-color="#f4f6f8"/><stop offset=".6" stop-color="#aeb4bb"/><stop offset="1" stop-color="#4b5057"/></linearGradient>
      <linearGradient id="${id}k" x1="0" x2="1"><stop offset="0" stop-color="#111"/><stop offset=".35" stop-color="#4a4d52"/><stop offset="1" stop-color="#0b0b0c"/></linearGradient>
      <pattern id="${id}f" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#fff" opacity=".55"/><circle cx="4" cy="4" r=".5" fill="#fff" opacity=".35"/></pattern>
      <clipPath id="${id}c"><rect x="38" y="92" width="124" height="286" rx="14"/></clipPath>
    </defs>`;
    const label = (y, txt, sub) => `<g font-family="Inter,Arial,sans-serif" text-anchor="middle" fill="${lum(col) > .6 ? '#111' : '#fff'}">
      <text x="100" y="${y}" font-size="17" font-weight="900" font-style="italic" letter-spacing="1">${esc(txt)}</text>
      <text x="100" y="${y + 18}" font-size="10" font-weight="700" letter-spacing="2.5" opacity=".8">${esc(sub)}</text></g>`;
    if (form === 'g') { // paint tin
      return `<svg class="art ${size}" viewBox="0 0 200 400" role="img" aria-label="Plechovka s barvou">${defs}
        <ellipse cx="100" cy="368" rx="82" ry="12" fill="#000" opacity=".35"/>
        <rect x="22" y="150" width="156" height="214" rx="10" fill="url(#${id}m)"/>
        <rect x="22" y="206" width="156" height="118" fill="url(#${id}b)"/>${fx ? `<rect x="22" y="206" width="156" height="118" fill="url(#${id}f)" opacity=".45"/>` : ''}
        <rect x="22" y="206" width="156" height="6" fill="#000" opacity=".18"/><rect x="22" y="318" width="156" height="6" fill="#000" opacity=".18"/>
        <ellipse cx="100" cy="150" rx="78" ry="14" fill="#c9ced4"/><ellipse cx="100" cy="148" rx="64" ry="9" fill="url(#${id}m)"/>
        <path d="M30 152 Q100 90 170 152" fill="none" stroke="#8d939a" stroke-width="5"/>
        ${label(258, code || 'AUTOLAK', size === 'xl' ? 'DO PISTOLE · 100 ML' : 'GUN')}
      </svg>`;
    }
    if (form === 'p') { // touch-up bottle
      return `<svg class="art ${size}" viewBox="0 0 200 400" role="img" aria-label="Opravná tužka">${defs}
        <ellipse cx="100" cy="372" rx="46" ry="8" fill="#000" opacity=".35"/>
        <rect x="64" y="70" width="72" height="118" rx="12" fill="url(#${id}k)"/>
        <rect x="76" y="40" width="48" height="40" rx="8" fill="url(#${id}k)"/>
        <rect x="56" y="180" width="88" height="190" rx="22" fill="url(#${id}b)"/>${fx ? `<rect x="56" y="180" width="88" height="190" rx="22" fill="url(#${id}f)" opacity=".45"/>` : ''}
        <rect x="64" y="186" width="14" height="170" rx="7" fill="#fff" opacity=".22"/>
        <rect x="56" y="250" width="88" height="56" fill="#fff" opacity=".9"/>
        <g font-family="Inter,Arial,sans-serif" text-anchor="middle" fill="#111"><text x="100" y="276" font-size="15" font-weight="900" font-style="italic">${esc(code || '2v1')}</text><text x="100" y="294" font-size="8" font-weight="700" letter-spacing="2">TOUCH-UP</text></g>
      </svg>`;
    }
    // spray can (also moto)
    return `<svg class="art ${size}" viewBox="0 0 200 400" role="img" aria-label="Sprej s barvou">${defs}
      <ellipse cx="100" cy="384" rx="70" ry="10" fill="#000" opacity=".35"/>
      <rect x="72" y="18" width="56" height="44" rx="10" fill="url(#${id}b)"/>
      <rect x="92" y="10" width="16" height="12" rx="3" fill="url(#${id}k)"/>
      <path d="M48 96 Q48 62 100 58 Q152 62 152 96 Z" fill="url(#${id}m)"/>
      <rect x="38" y="92" width="124" height="286" rx="14" fill="url(#${id}b)"/>
      <g clip-path="url(#${id}c)">${flake}
        ${form === 'm' ? `<g opacity=".9">${Array.from({ length: 12 }, (_, i) => `<rect x="${38 + (i % 6) * 21}" y="${126 + Math.floor(i / 6) * 10}" width="10.5" height="10" fill="${(i + Math.floor(i / 6)) % 2 ? '#111' : '#fff'}"/><rect x="${48.5 + (i % 6) * 21}" y="${126 + Math.floor(i / 6) * 10}" width="10.5" height="10" fill="${(i + Math.floor(i / 6)) % 2 ? '#fff' : '#111'}"/>`).join('')}</g>` : `<rect x="38" y="128" width="124" height="6" fill="#fff" opacity=".85"/>`}
        <rect x="38" y="232" width="124" height="76" fill="#0e0f11" opacity=".82"/>
        <rect x="52" y="100" width="16" height="270" fill="#fff" opacity=".16"/>
      </g>
      <g font-family="Inter,Arial,sans-serif" text-anchor="middle" fill="#fff">
        <text x="100" y="268" font-size="${String(code).length > 7 ? 14 : 20}" font-weight="900" font-style="italic" letter-spacing="1">${esc(code || 'AUTOLAK')}</text>
        <text x="100" y="290" font-size="9" font-weight="700" letter-spacing="2.6" opacity=".8">${form === 'm' ? 'MOTOLAK' : 'AUTOLAK'} · 400 ML</text>
      </g>
      <rect x="38" y="360" width="124" height="18" rx="6" fill="url(#${id}m)"/>
    </svg>`;
  }

  /* ---------- prices ---------- */
  const formPrice = (shadeRec, fk, eff) => {
    const F = FORMS[fk];
    if (shadeRec.two) return F.two;
    if (fk === 'g' && eff === 'uni') return F.uni;
    return F.price;
  };
  const fromPrice = s => Math.min(...[...s.f].map(fk => s.two ? FORMS[fk].two : (fk === 'g' ? FORMS.g.uni : FORMS[fk].price)));
  const priceHtml = p => p.czk ? `${p.from ? '<small>od</small>' : ''}${fmt(p.czk)}${p.reg ? ` <s class="old">${fmt(p.reg)}</s>` : ''}` : '<small>cena na dotaz</small>';

  /* ---------- cart ---------- */
  // item kinds: c = colour {b,c,n,h,fx,f,e,pid,two}, p = product {id,v}, k = kit {id}
  const keyOf = i => i.t === 'c' ? `c|${i.b}|${i.pid}|${i.f}|${i.e || ''}` : i.t === 'p' ? `p|${i.id}|${i.v || ''}` : `k|${i.id}`;
  const lineOf = i => {
    if (i.t === 'c') {
      const unit = formPrice(i, i.f, i.e);
      const bulk = i.qty >= SHOP.bulkQty ? SHOP.bulkPct : 0;
      const b = brandOf(i.b);
      return { title: `${b ? b.n : i.b} ${i.c} ${i.n}`.trim(), sub: `${FORMS[i.f].name}${i.f === 'g' ? (i.two ? '' : i.e === 'uni' ? ' · uni' : ' · metalíza/perleť') : ''}${i.two ? ' · 2 ks/bal' : ''}`,
        unit: unit * (1 - bulk / 100), bulk, href: `#/barva/${i.b}/${encodeURIComponent(i.c)}?i=${i.i ?? ''}`, art: productSVG(i.f, i.h, i.fx, i.c), ref: i.pid };
    }
    if (i.t === 'k') return { title: KITS[i.id].name, sub: 'Doplňková sada', unit: KITS[i.id].price, art: productSVG('s', '#9aa1a9', 'm', 'KIT'), ref: i.id };
    const p = byId[i.id];
    if (!p) return null;
    const v = i.v ? p.var?.find(x => x.v === i.v) : null;
    return { title: p.name, sub: v ? `${p.varLabel}: ${v.l}` : (p.brand || ''), unit: v ? v.czk : p.czk, href: `#/p/${p.id}`, img: p.img[0], ref: v ? `${p.pid}/${v.v}` : p.pid };
  };
  const Cart = {
    items: (() => { try { return JSON.parse(localStorage.getItem('al-cart') || '[]').filter(i => i && i.qty > 0 && (i.t !== 'p' || byId[i.id])); } catch (e) { return []; } })(),
    save() { localStorage.setItem('al-cart', JSON.stringify(this.items)); renderBadge(); },
    add(item, qty = 1, label) {
      const k = keyOf(item);
      const hit = this.items.find(i => keyOf(i) === k);
      if (hit) hit.qty = Math.min(99, hit.qty + qty); else this.items.push({ ...item, qty: Math.min(99, qty) });
      this.save();
      const b = $('#cartCount'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      toast(`Přidáno do košíku · ${label || lineOf(item)?.title || ''}`);
    },
    set(idx, qty) { if (qty < 1) this.items.splice(idx, 1); else this.items[idx].qty = Math.min(99, qty); this.save(); renderDrawer(); },
    count() { return this.items.reduce((s, i) => s + i.qty, 0); },
    total() { return this.items.reduce((s, i) => s + (lineOf(i)?.unit || 0) * i.qty, 0); },
  };
  const renderBadge = () => { $('#cartCount').textContent = Cart.count(); };
  let toastT;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ---------- chrome ---------- */
  const pill = $('#pill'), menuBtn = $('#menuBtn');
  function renderChrome() {
    $('#pillMenu').innerHTML = `
      <a href="#/barvy" class="tile wide hot">Najít odstín podle kódu <span class="chev">›</span></a>
      <a href="#/barvy?t=car" class="tile"><span class="ico">◉</span>Osobní auta</a>
      <a href="#/barvy?t=moto" class="tile"><span class="ico">◎</span>Motocykly</a>
      <a href="#/barvy?t=truck" class="tile"><span class="ico">▣</span>Truck &amp; bus</a>
      <a href="#/kod-barvy" class="tile"><span class="ico">?</span>Kde je kód barvy</a>
      <a href="#/shop" class="tile wide">Příslušenství a laky <span class="chev">›</span></a>
      ${CATS.map(c => `<a href="#/shop/${c.key}" class="tile"><span class="ico">${CAT_STYLE[c.key]?.ico || '•'}</span>${esc(c.name)}</a>`).join('')}
      <a href="#/prodejny" class="tile"><span class="ico">⌂</span>Prodejny</a>
      <div class="pill-menu-foot"><a href="tel:${SHOP.phoneRaw}">${SHOP.phone}</a><a href="mailto:${SHOP.email}">${SHOP.email}</a></div>`;
  }
  function toggleMenu(force) {
    const open = force ?? !pill.classList.contains('open');
    pill.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
  }
  menuBtn.addEventListener('click', e => { e.stopPropagation(); toggleMenu(); });
  document.addEventListener('click', e => { if (!pill.contains(e.target)) toggleMenu(false); });

  /* ---------- drawer ---------- */
  const drawer = $('#drawer'), scrim = $('#scrim');
  function openDrawer() {
    renderDrawer(); scrim.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add('show'); drawer.classList.add('open'); });
    drawer.setAttribute('aria-hidden', 'false'); toggleMenu(false);
    setTimeout(() => $('#drawerClose').focus(), 50);
  }
  function closeDrawer() {
    scrim.classList.remove('show'); drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    setTimeout(() => { scrim.hidden = true; }, 300);
  }
  $('#cartBtn').addEventListener('click', openDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);

  let checkoutStep = false;
  function renderDrawer() {
    const body = $('#drawerBody');
    if (!Cart.items.length) {
      checkoutStep = false;
      body.innerHTML = `<div class="drawer-empty"><span class="script">Zatím prázdno…</span><p>Začni kódem barvy ze štítku vozu.</p><a class="btn" href="#/barvy" data-close>Najít odstín</a></div>`;
      return;
    }
    const lines = Cart.items.map((i, idx) => {
      const l = lineOf(i); if (!l) return '';
      return `<div class="line">
        <div class="line-art">${l.img ? `<img src="${l.img}" alt="" loading="lazy">` : l.art}</div>
        <div>${l.href ? `<a class="line-name" href="${l.href}" data-close>${esc(l.title)}</a>` : `<span class="line-name">${esc(l.title)}</span>`}
          <div class="line-var">${esc(l.sub)}${l.bulk ? ` · <b>−${l.bulk} %</b>` : ''}</div>
          <div class="qty"><button data-q="${idx}" data-d="-1" aria-label="Méně">−</button><input value="${i.qty}" readonly aria-label="Množství"><button data-q="${idx}" data-d="1" aria-label="Více">+</button></div></div>
        <div class="line-right"><b>${fmt(l.unit * i.qty)}</b><button class="line-del" data-del="${idx}">Odebrat</button></div>
      </div>`;
    }).join('');
    const tc = Cart.total();
    body.innerHTML = `${lines}
      <p class="ship">Barvy mícháme na zakázku podle kódu – expedice obvykle do 1–2 pracovních dnů. Od ${SHOP.bulkQty} ks stejného odstínu sleva ${SHOP.bulkPct} %.</p>
      <div class="sum"><span>Mezisoučet</span><b>${fmt(tc)}</b></div>
      <p class="fine" style="margin-top:-8px">Ceny vč. DPH. Doprava od ${fmt(SHOP.shipFrom)}, osobní odběr na prodejně zdarma.</p>
      ${checkoutStep ? checkoutForm() : `<button class="btn accent" id="goCheckout">Pokračovat k objednávce</button>`}`;
  }
  function checkoutForm() {
    return `<form class="checkout" id="checkout">
      <input class="field" name="name" placeholder="Jméno a příjmení" required autocomplete="name">
      <input class="field" name="email" type="email" placeholder="E-mail" required autocomplete="email">
      <input class="field" name="phone" type="tel" placeholder="Telefon" required autocomplete="tel">
      <input class="field" name="car" placeholder="Vůz a rok výroby (pro kontrolu odstínu) – nepovinné">
      <div class="radios">
        ${STORES.map((s, i) => `<label class="radio"><input type="radio" name="ship" value="Osobní odběr – ${s.city}" ${i === 0 ? 'checked' : ''}> Odběr: ${s.city} <span>zdarma</span></label>`).join('')}
        <label class="radio"><input type="radio" name="ship" value="Doručení na adresu"> Doručení na adresu <span>od ${fmt(SHOP.shipFrom)}</span></label>
      </div>
      <textarea class="field" name="addr" placeholder="Doručovací adresa (při doručení) a poznámka"></textarea>
      <div class="radios">
        <label class="radio"><input type="radio" name="pay" value="Platba převodem / online" checked> Převodem / online</label>
        <label class="radio"><input type="radio" name="pay" value="Dobírka / na prodejně"> Dobírka / na prodejně</label>
      </div>
      <label class="fine"><input type="checkbox" required> Souhlasím s <a class="link" href="${SHOP.terms}" target="_blank" rel="noopener">obchodními podmínkami</a>.</label>
      <button class="btn accent" type="submit">Odeslat objednávku</button>
      <p class="fine">Koncept: objednávka se odešle e-mailem na ${SHOP.email}. Potvrzení a platební údaje přijdou zpět.</p>
    </form>`;
  }
  $('#drawerBody').addEventListener('click', e => {
    const q = e.target.closest('[data-q]');
    if (q) { const i = +q.dataset.q; Cart.set(i, Cart.items[i].qty + +q.dataset.d); return; }
    const d = e.target.closest('[data-del]');
    if (d) { Cart.set(+d.dataset.del, 0); return; }
    if (e.target.id === 'goCheckout') { checkoutStep = true; renderDrawer(); $('#checkout input').focus(); return; }
    if (e.target.closest('[data-close]')) closeDrawer();
  });
  $('#drawerBody').addEventListener('submit', e => {
    if (e.target.id !== 'checkout') return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const rows = Cart.items.map(i => { const l = lineOf(i); return `• ${i.qty}× ${l.title} – ${l.sub} [#${l.ref}] – ${fmt(l.unit * i.qty)}`; }).join('\n');
    const text = `Dobrý den,\n\nposílám objednávku z webu:\n\n${rows}\n\nMezisoučet: ${fmt(Cart.total())} vč. DPH\nDoprava: ${f.ship}\nPlatba: ${f.pay}\nVůz: ${f.car || '–'}\n\nJméno: ${f.name}\nE-mail: ${f.email}\nTelefon: ${f.phone}\nAdresa / poznámka: ${f.addr || '–'}\n\nDěkuji.`;
    location.href = `mailto:${SHOP.email}?subject=${encodeURIComponent('Objednávka z webu – ' + f.name)}&body=${encodeURIComponent(text)}`;
    toast('Otevírám e-mail s objednávkou…');
  });

  /* ---------- shared blocks ---------- */
  const card = p => {
    const sub = subOf(p);
    const out = !p.stock;
    const quick = p.czk && !p.var;
    return `<article class="card ${out ? 'out' : ''}">
      <a class="card-img" href="#/p/${p.id}">${p.img[0] ? `<img src="${p.img[0]}" alt="${esc(p.name)}" loading="lazy">` : ''}${p.sale ? '<span class="flag sale">Výprodej</span>' : out ? '<span class="flag">Na objednávku</span>' : ''}</a>
      <div class="card-body">
        <span class="card-tag">${esc(sub ? sub.name : catOf(p.cat).name)}</span>
        <a class="card-name" href="#/p/${p.id}">${esc(p.name)}</a>
        ${p.var ? `<span class="sizes">${p.var.map(v => esc(v.l)).join(' · ')}</span>` : ''}
        <div class="card-price"><span>${priceHtml(p)}</span>${quick ? `<button class="add" data-add="${p.id}" aria-label="Do košíku: ${esc(p.name)}">+</button>` : `<a class="add ghosty" href="#/p/${p.id}" aria-label="${esc(p.name)}">›</a>`}</div>
      </div></article>`;
  };
  const shadeHref = s => `#/barva/${s.b}/${encodeURIComponent(s.c)}?i=${s.i}`;
  const formChips = s => [...s.f].map(k => `<i title="${FORMS[k].name}">${FORMS[k].short}</i>`).join('');
  const shadeCard = (s, showBrand) => `<a class="shade" href="${shadeHref(s)}">
      <span class="chipc" style="background:${paintBg(s.h, s.fx)}">${s.h ? '' : '?'}</span>
      <span class="shade-txt"><b>${showBrand ? esc(brandOf(s.b)?.n || '') + ' · ' : ''}${esc(s.c)}</b><span>${esc(s.n || 'bez názvu')}</span><em>${formChips(s)}</em></span>
      <span class="shade-price"><small>od</small> ${fmt(fromPrice(s))}</span></a>`;

  const ticker = () => {
    const items = [`${nf(TOTAL_SHADES)} odstínů`, 'Mícháme podle kódu na štítku', 'Sprej · pistole · tužka', '4 kamenné prodejny', `Od ${SHOP.bulkQty} ks sleva ${SHOP.bulkPct} %`, 'Poradíme s výběrem', 'Změříme odstín ze vzorku'];
    const row = items.map(x => `<span>${esc(x)}</span>`).join('');
    return `<div class="ticker" aria-label="${esc(items.join(', '))}"><div class="ticker-track" aria-hidden="true">${row}${row}</div></div>`;
  };

  const footer = () => `
    <section class="stage plain"><div class="stage-inner news" style="padding-top:var(--pad)">
      <div><span class="eyebrow">Poradna</span><div class="sec-head" style="margin:6px 0 0"><h2>Nevíš si <span class="script">rady?</span></h2></div>
      <p style="color:var(--ink-2);margin:10px 0 0;max-width:52ch">Zavolej nebo napiš – s výběrem odstínu, pracovním postupem i správným příslušenstvím pomůžeme. Když vůz už neodpovídá původní barvě, změříme odstín ze vzorku.</p></div>
      <div class="chips"><a class="btn" href="tel:${SHOP.phoneRaw}">${SHOP.phone}</a><a class="btn ghost" href="mailto:${SHOP.email}">${SHOP.email}</a></div>
    </div></section>
    <footer class="stage plain"><div class="stage-inner" style="padding-top:var(--pad)">
      <div class="footer">
        <div><img class="logo" src="assets/img/logo.svg" alt="Autolaky"><p style="margin:0;max-width:36ch">Autolaky míchané na zakázku podle kódu barvy – ve spreji, do pistole i v opravné tužce. Plus vše pro přípravu, lakování a péči o lak.</p></div>
        <div><h4>Barvy</h4><ul><li><a href="#/barvy?t=car">Osobní auta</a></li><li><a href="#/barvy?t=moto">Motocykly</a></li><li><a href="#/barvy?t=truck">Truck &amp; bus</a></li><li><a href="#/kod-barvy">Kde najít kód barvy</a></li></ul></div>
        <div><h4>Shop</h4><ul>${CATS.map(c => `<li><a href="#/shop/${c.key}">${esc(c.name)}</a></li>`).join('')}</ul></div>
        <div><h4>Kontakt</h4><ul><li><a href="tel:${SHOP.phoneRaw}">${SHOP.phone}</a></li><li><a href="mailto:${SHOP.email}">${SHOP.email}</a></li><li><a href="#/prodejny">Prodejny a otevírací doba</a></li><li><a href="${SHOP.terms}" target="_blank" rel="noopener">Obchodní podmínky</a> · <a href="${SHOP.claims}" target="_blank" rel="noopener">Reklamace</a></li><li><a href="${SHOP.instagram}" target="_blank" rel="noopener">Instagram</a> · <a href="${SHOP.facebook}" target="_blank" rel="noopener">Facebook</a> · <a href="${SHOP.youtube}" target="_blank" rel="noopener">YouTube</a></li></ul></div>
        <div class="footer-bottom"><span>© 2026 ${SHOP.company} · IČ ${SHOP.ico} · ${SHOP.seat}</span><span>Ceny vč. DPH · stav katalogu ${DATA.generated.split('-').reverse().join('. ')}</span></div>
      </div>
      <div class="mega" aria-hidden="true">Autolaky</div>
    </div></footer>`;

  /* ---------- finder (brand + code) ---------- */
  const finder = (big = false) => `
    <form class="finder ${big ? 'big' : ''}" id="finder" role="search">
      <label class="sr" for="fBrand">Značka</label>
      <select class="field" id="fBrand"><option value="">Všechny značky</option>
        ${Object.entries(KIND).map(([k, l]) => `<optgroup label="${l}">${BRANDS.filter(b => b.t === k).map(b => `<option value="${b.k}">${esc(b.n)}</option>`).join('')}</optgroup>`).join('')}
      </select>
      <label class="sr" for="fCode">Kód nebo název barvy</label>
      <input class="field" id="fCode" placeholder="Kód barvy, např. LF9R, LY9B, 197…" autocomplete="off">
      <button class="btn accent" type="submit">Hledat</button>
    </form>`;
  function bindFinder() {
    const f = $('#finder'); if (!f) return;
    f.addEventListener('submit', e => {
      e.preventDefault();
      const b = $('#fBrand').value, q = $('#fCode').value.trim();
      location.hash = b ? `#/barvy/${b}${q ? '?q=' + encodeURIComponent(q) : ''}` : `#/barvy${q ? '?q=' + encodeURIComponent(q) : ''}`;
    });
  }

  /* ---------- views ---------- */
  let cleanup = null, heroIndex = 0, renderToken = 0;

  function viewHome() {
    let cur = heroIndex;
    const featuredIds = ['marty-s-1k-bezbarvy-lak-ve-spreji-400ml', 'marty-s-hi-build-plnic-ve-spreji-cerny-500ml'];
    const pick = (cat, n) => P.filter(p => p.cat === cat && p.img.length && p.stock).slice(0, n);
    const featured = [...featuredIds.map(id => byId[id]).filter(Boolean), ...pick('lakovani', 3), ...pick('priprava', 2), ...pick('kosmetika', 3), ...pick('naradi', 2)].slice(0, 10);
    const forms = [['s', 'Autolaky ve spreji', 'Na menší plochy a díly'], ['g', 'Autolaky do pistole', 'Pro lakýrníky i kutily'], ['p', 'Opravné tužky 2v1', 'Na škrábance a kamínky'], ['m', 'Motolaky', 'Originální odstíny motorek']];
    main.innerHTML = `
      <section class="stage full hero" aria-roledescription="carousel">
        <div class="hero-top">
          <div class="chips"><a class="chip on" href="#/barvy">Všechny barvy <small>${nf(TOTAL_SHADES)}</small></a>${Object.entries(KIND).map(([k, l]) => `<a class="chip" href="#/barvy?t=${k}">${l} <small>${BRANDS.filter(b => b.t === k).length}</small></a>`).join('')}<a class="chip" href="#/shop">Příslušenství <small>${P.length}</small></a></div>
          <div class="counter" id="counter"></div>
        </div>
        <div class="ghost-word" id="ghost" aria-hidden="true"></div>
        <div class="track" id="track">${HERO.map((h, i) => `<div class="slide" data-i="${i}">${productSVG('s', h.hex, 'm', h.c)}</div>`).join('')}</div>
        <div class="hero-foot">
          <div id="heroText" aria-live="polite"></div>
          <div class="hero-ctrl">
            <button class="round" id="prev" aria-label="Předchozí">‹</button>
            <button class="round" id="next" aria-label="Další">›</button>
            <a class="btn" id="discover" href="#/barvy">Detail odstínu ›</a>
          </div>
        </div>
      </section>
      <section class="stage plain finder-stage"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">${nf(TOTAL_SHADES)} odstínů · ${BRANDS.length} značek</span><h2>Najdi svůj <span class="script">odstín</span></h2></div><a class="btn ghost" href="#/kod-barvy">Kde najdu kód barvy? ›</a></div>
        ${finder(true)}
        <div class="brand-pills">${BRANDS.filter(b => b.t === 'car').sort((a, b) => b.cnt - a.cnt).slice(0, 16).sort((a, b) => a.n.localeCompare(b.n, 'cs')).map(b => `<a class="chip soft" href="#/barvy/${b.k}">${esc(b.n)}</a>`).join('')}<a class="chip soft" href="#/barvy">Všechny ›</a></div>
      </div></section>
      ${ticker()}
      <section class="stage plain"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">Barvy podle kódu</span><h2>Vyber si <span class="script">formu</span></h2></div></div>
        <div class="cats forms-cats">
          ${forms.map(([k, t, s], i) => `<a class="cat" href="#/barvy${k === 'm' ? '?t=moto' : '?f=' + k}" style="--a:${HERO[(i * 2 + 1) % HERO.length].hex};--b:${HERO[(i * 2 + 1) % HERO.length].dark}">
            <span class="chev">›</span><div><span>${s}</span><br><b>${t}</b><br><span class="cnt">od ${fmt(k === 'g' ? FORMS.g.uni : FORMS[k].price)}</span></div>${productSVG(k, HERO[(i * 2 + 1) % HERO.length].hex, 'm', '')}</a>`).join('')}
        </div>
      </div></section>
      <section class="stage plain"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">Příslušenství</span><h2>Vše pro <span class="script">lakování</span></h2></div><a class="btn ghost" href="#/shop">Celý sortiment ›</a></div>
        <div class="cats">
          ${CATS.map((c, i) => { const s = CAT_STYLE[c.key] || {}; const img = P.find(p => p.cat === c.key && p.img.length && p.stock)?.img[0]; return `<a class="cat ${i === 0 ? 'big' : ''}" href="#/shop/${c.key}" style="--a:${s.a};--b:${s.b}">
            <span class="chev">›</span><div><span>${esc(s.sub || '')}</span><br><b>${esc(c.name)}</b><br><span class="cnt">${P.filter(p => p.cat === c.key).length} produktů</span></div>${img ? `<img src="${img}" alt="" loading="lazy" class="cat-photo">` : ''}</a>`; }).join('')}
        </div>
      </div></section>
      <section class="stage light"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">Často spolu</span><h2>K opravě <span class="script" style="color:#0e0f11">se hodí</span></h2></div><a class="btn dark" href="#/shop">Shop ›</a></div>
        <div class="grid">${featured.map(card).join('')}</div>
      </div></section>
      <section class="stage"><div class="stage-inner story" style="padding-top:var(--pad)">
        <div class="big-year" aria-hidden="true">KÓD</div>
        <div>
          <span class="eyebrow" style="color:var(--ink-2)">Jak to funguje</span>
          <div class="sec-head" style="margin:6px 0 18px"><h2>Ze štítku <span class="script">do spreje</span></h2></div>
          <p>Kód barvy najdeš na výrobním štítku vozu – podle značky ve dveřích, pod kapotou nebo v kufru. Barvu podle něj namícháme na zakázku na profesionálních mísicích strojích a naplníme do spreje, plechovky nebo opravné tužky.</p>
          <p>Štítek chybí nebo už auto nemá původní odstín? Stačí VIN u autorizovaného servisu, nebo přivez díl na prodejnu – odstín změříme spektrofotometrem.</p>
          <a class="btn" href="#/kod-barvy" style="margin-top:10px">Kde najdu kód barvy ›</a>
        </div>
      </div></section>
      <section class="perks">
        <div class="perk"><span class="num">01</span><b>Míchání na zakázku</b><p>Odstín podle kódu výrobce z kartotéky přes ${nf(TOTAL_SHADES)} barev.</p></div>
        <div class="perk"><span class="num">02</span><b>Plníme do sprejů</b><p>Libovolný odstín do spreje s natáčecí tryskou – práce jako s pistolí.</p></div>
        <div class="perk"><span class="num">03</span><b>Poradíme</b><p>Telefonicky i na 4 prodejnách: Dolní Branná, Praha, Liberec, Ústí n. L.</p></div>
        <div class="perk"><span class="num">04</span><b>Množstevní sleva</b><p>Od ${SHOP.bulkQty} kusů stejného odstínu automaticky −${SHOP.bulkPct} %.</p></div>
      </section>
      ${footer()}`;
    bindFinder();

    const track = $('#track'), slides = $$('.slide', track);
    function layout() {
      const w = track.clientWidth;
      const step = w < 600 ? w * 0.34 : Math.min(w * 0.2, 300);
      const n = HERO.length;
      slides.forEach((s, i) => {
        let d = i - cur;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        const ad = Math.abs(d);
        s.style.setProperty('--off', d === 0 ? 0 : Math.sign(d) * (step * (ad === 1 ? 1 : ad === 2 ? 1.75 : 2.4)));
        s.style.setProperty('--s', ad === 0 ? 1 : ad === 1 ? .62 : ad === 2 ? .46 : .3);
        s.style.setProperty('--o', ad > 2 ? 0 : ad === 2 ? .7 : 1);
        s.style.zIndex = 10 - ad;
        s.classList.toggle('is-center', d === 0);
        s.setAttribute('aria-hidden', d !== 0);
      });
    }
    async function show(i) {
      cur = heroIndex = (i + HERO.length) % HERO.length;
      const h = HERO[cur];
      setColors(h.hex, h.dark);
      layout();
      const g = $('#ghost'); g.classList.add('swap');
      setTimeout(() => { g.textContent = h.word; g.classList.remove('swap'); }, 200);
      $('#counter').textContent = `${pad(cur + 1)} / ${pad(HERO.length)}`;
      const b = brandOf(h.b);
      const rows = await loadBrand(h.b);
      if (heroIndex !== cur) return;
      const s = rows.find(r => r.c === h.c) || rows[0];
      $('#heroText').innerHTML = `<div class="fade-up"><span class="eyebrow" style="color:var(--ink-2)">${esc(b.n)} · kód ${esc(s.c)}</span>
        <h1 class="hero-title">${esc(s.n)}</h1><span class="hero-script script">${[...s.f].map(k => FORMS[k].short).join(' · ')}</span>
        <div class="hero-price">od <b>${fmt(fromPrice(s))}</b></div></div>`;
      $('#discover').href = shadeHref(s);
    }
    $('#prev').onclick = () => show(cur - 1);
    $('#next').onclick = () => show(cur + 1);
    track.addEventListener('click', e => {
      const s = e.target.closest('.slide'); if (!s) return;
      const i = +s.dataset.i;
      if (i === cur) location.hash = $('#discover').getAttribute('href'); else show(i);
    });
    let sx = null;
    track.addEventListener('pointerdown', e => { sx = e.clientX; });
    track.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 40) show(cur + (e.clientX < sx ? 1 : -1)); sx = null; });
    const onKey = e => { if (e.target.closest('input,textarea,select')) return; if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', layout);
    const auto = setInterval(() => { if (!document.hidden && !main.matches(':hover')) show(cur + 1); }, 6500);
    show(cur);
    $('#ghost').textContent = HERO[cur].word;
    return () => { clearInterval(auto); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', layout); };
  }

  /* all brands + global search */
  function viewBrands(params) {
    const t = params.get('t') || '', q0 = params.get('q') || '', f0 = params.get('f') || '';
    setColors(...(t === 'moto' ? ['#d9662a', '#2a1004'] : t === 'truck' ? ['#e8c21a', '#2a2302'] : ['#1f74de', '#03142e']));
    const list = BRANDS.filter(b => !t || b.t === t).filter(b => !f0 || b.f[f0]);
    main.innerHTML = `
      <section class="stage full"><div class="stage-inner">
        <div class="shop-head"><span class="eyebrow" style="color:var(--ink-2)">Barvy podle kódu · ${nf(TOTAL_SHADES)} odstínů</span>
          <h1>${t ? KIND[t] : f0 ? FORMS[f0].short + 'y' : 'Odstíny'}<span class="script">${f0 ? 'vyber značku vozu' : 'vyber značku nebo zadej kód'}</span></h1></div>
        ${finder()}
        <div class="toolbar"><div class="chips">
          <a class="chip ${!t && !f0 ? 'on' : ''}" href="#/barvy">Vše <small>${BRANDS.length}</small></a>
          ${Object.entries(KIND).map(([k, l]) => `<a class="chip ${t === k ? 'on' : ''}" href="#/barvy?t=${k}">${l} <small>${BRANDS.filter(b => b.t === k).length}</small></a>`).join('')}
          ${['s', 'g', 'p'].map(k => `<a class="chip ${f0 === k ? 'on' : ''}" href="#/barvy?f=${k}">${FORMS[k].short} <small>${BRANDS.filter(b => b.f[k]).length}</small></a>`).join('')}
        </div></div>
        <div id="results"></div>
        <div class="brands" id="brands">
          ${list.map(b => `<a class="brand" href="#/barvy/${b.k}${f0 ? '?f=' + f0 : ''}"><b>${esc(b.n)}</b><span>${nf(b.cnt)} odstínů</span><em>${Object.keys(b.f).map(k => FORMS[k].short).join(' · ')}</em><i class="chev">›</i></a>`).join('')}
        </div>
      </div></section>
      ${ticker()}${footer()}`;
    bindFinder();
    if (t) $('#fBrand').value = '';
    $('#fCode').value = q0;
    if (q0) globalSearch(q0);
  }
  async function globalSearch(q) {
    const tok = ++renderToken;
    const box = $('#results');
    box.innerHTML = `<p class="empty"><span class="script">Hledám „${esc(q)}“ ve všech značkách…</span></p>`;
    const all = (await Promise.all(BRANDS.map(b => loadBrand(b.k)))).flat();
    if (tok !== renderToken) return;
    const tq = tight(q), nq = norm(q);
    const hits = all.filter(s => tight(s.c) === tq).concat(all.filter(s => tight(s.c) !== tq && (tight(s.c).startsWith(tq) || norm(s.n).includes(nq))));
    box.innerHTML = hits.length ? `<div class="sec-head" style="margin:6px 0 16px"><h2 style="font-size:28px">${nf(hits.length)} výsledků pro „${esc(q)}“</h2></div>
      <div class="shades">${hits.slice(0, 120).map(s => shadeCard(s, true)).join('')}</div>${hits.length > 120 ? '<p class="fine" style="margin-top:12px">Zobrazeno prvních 120 – upřesni hledání nebo vyber značku.</p>' : ''}` :
      `<p class="empty">Kód „${esc(q)}“ jsme nenašli. Zkus ho zadat bez mezer, nebo vyber značku. Neznáš kód? <a class="link" href="#/kod-barvy">Poradíme, kde ho najdeš</a>.</p>`;
    $('#brands').style.display = 'none';
  }

  /* one brand: list of shades */
  async function viewBrand(k, params) {
    const b = brandOf(k);
    if (!b) return viewNotFound();
    const tok = ++renderToken;
    setColors(...(b.t === 'moto' ? ['#d9662a', '#2a1004'] : b.t === 'truck' ? ['#e8c21a', '#2a2302'] : ['#1f74de', '#03142e']));
    main.innerHTML = '<section class="stage full"><div class="loading"><span class="script">Načítám odstíny…</span></div></section>';
    const rows = await loadBrand(k);
    if (tok !== renderToken) return;
    const st = { q: params.get('q') || '', f: params.get('f') || '', h: '', shown: SHADES_PAGE };
    const hues = [['', 'Vše'], ['#16171a', 'Černá'], ['#eef0f0', 'Bílá'], ['#b8bcc2', 'Stříbrná'], ['#8b8f95', 'Šedá'], ['#b3191f', 'Červená'], ['#1f4f9c', 'Modrá'], ['#2f6b3a', 'Zelená'], ['#f0c419', 'Žlutá'], ['#e0661c', 'Oranžová'], ['#5e3d2a', 'Hnědá'], ['#c2a160', 'Zlatá/béžová'], ['#5b2a6e', 'Fialová']];
    const baseHue = h => { if (!h) return ''; let best = '', bd = 1e9; const [r, g, bb] = hexRgb(h); for (const [x] of hues.slice(1)) { const [r2, g2, b2] = hexRgb(x); const d = (r - r2) ** 2 + (g - g2) ** 2 + (bb - b2) ** 2; if (d < bd) { bd = d; best = x; } } return best; };
    rows.forEach(r => { r.bh = baseHue(r.h); });
    main.innerHTML = `
      <section class="stage full"><div class="stage-inner">
        <div class="shop-head"><span class="eyebrow" style="color:var(--ink-2)"><a href="#/barvy?t=${b.t}">‹ ${KIND[b.t]}</a> · ${nf(b.cnt)} odstínů</span>
          <h1>${esc(b.n)}<span class="script">${b.t === 'moto' ? 'motolaky na míru' : 'autolaky na míru podle kódu'}</span></h1></div>
        <div class="toolbar">
          <div class="chips" id="formChips"><button class="chip ${!st.f ? 'on' : ''}" data-f="">Vše</button>${Object.keys(b.f).map(f => `<button class="chip ${st.f === f ? 'on' : ''}" data-f="${f}">${FORMS[f].short} <small>${nf(b.f[f])}</small></button>`).join('')}</div>
          <div class="tools"><label class="sr" for="q">Kód nebo název</label><input class="field wide" id="q" type="search" placeholder="Kód nebo název barvy…" value="${esc(st.q)}"></div>
        </div>
        <div class="hues" id="hues">${hues.map(([h, l]) => `<button class="hue ${!h ? 'on all' : ''}" data-h="${h}" title="${l}" aria-label="${l}" style="${h ? `--sw:${paintBg(h, 'm')}` : ''}">${h ? '' : 'Vše'}</button>`).join('')}<span class="fine">Barevný filtr a náhledy jsou orientační – odvozené z názvu odstínu.</span></div>
        <div class="shades" id="list"></div>
        <div class="more" id="more"></div>
        ${b.t === 'car' ? `<div class="hint"><b>Kde u ${esc(b.n)} najdu kód barvy?</b> ${esc(codeHint(b.k))} <a class="link" href="#/kod-barvy">Více ›</a></div>` : ''}
      </div></section>
      ${ticker()}${footer()}`;
    const draw = () => {
      const tq = tight(st.q), nq = norm(st.q.trim());
      let list = rows.filter(r => (!st.f || r.f.includes(st.f)) && (!st.h || r.bh === st.h));
      if (nq) {
        const exact = list.filter(r => tight(r.c) === tq);
        list = exact.concat(list.filter(r => tight(r.c) !== tq && (tight(r.c).includes(tq) || norm(r.n).includes(nq))));
      }
      $('#list').innerHTML = list.length ? list.slice(0, st.shown).map(s => shadeCard(s)).join('') : `<p class="empty" style="grid-column:1/-1">Nic jsme nenašli. Zkus kód bez mezer a pomlček, nebo <a class="link" href="#/barvy?q=${encodeURIComponent(st.q)}">hledej ve všech značkách</a>.</p>`;
      const rest = list.length - st.shown;
      $('#more').innerHTML = rest > 0 ? `<button class="btn ghost" id="moreBtn">Zobrazit další (${nf(rest)})</button>` : '';
    };
    $('#q').addEventListener('input', e => { st.q = e.target.value; st.shown = SHADES_PAGE; draw(); });
    $('#formChips').addEventListener('click', e => { const c = e.target.closest('[data-f]'); if (!c) return; st.f = c.dataset.f; $$('#formChips .chip').forEach(x => x.classList.toggle('on', x === c)); st.shown = SHADES_PAGE; draw(); });
    $('#hues').addEventListener('click', e => { const c = e.target.closest('[data-h]'); if (!c) return; st.h = c.dataset.h; $$('#hues .hue').forEach(x => x.classList.toggle('on', x === c)); st.shown = SHADES_PAGE; draw(); });
    $('#more').addEventListener('click', e => { if (e.target.id === 'moreBtn') { st.shown += SHADES_PAGE; draw(); } });
    draw();
  }

  function codeHint(k) {
    const H = {
      skoda: 'Na štítku v zavazadlovém prostoru (u rezervy / pod podlahou kufru) a v servisní knížce – čtyřmístný kód typu 9P9 nebo LF9E.',
      volkswagen: 'Samolepka v kufru u rezervního kola a servisní knížka. Kód má obvykle tvar L + 3 znaky (např. LC9A) nebo 2 znaky + písmeno.',
      audi: 'Samolepka v kufru u rezervy a servisní knížka (např. LY7C, LZ9Y).',
      seat: 'Samolepka v kufru u rezervy a servisní knížka.',
      ford: 'Štítek na B-sloupku u řidiče (u starších vozů na zámkové příčce pod kapotou). Kód barvy bývá v řádku „Paint“.',
      bmw: 'Pod kapotou na horní části blatníku / tlumiče nebo na B-sloupku. Trojmístný kód (např. 475, A96).',
      mercedes: 'Na štítku ve dveřích řidiče nebo pod kapotou u zámku. Trojmístný kód (např. 197, 149).',
      toyota: 'Na štítku na B-sloupku u řidiče, údaj „C/TR“ – první tři znaky jsou kód barvy (např. 040).',
      renault: 'Na štítku ve dveřích nebo pod kapotou, kód o třech znacích (např. TEKNA, NV676 → 676).',
      peugeot: 'Na štítku ve dveřích nebo pod kapotou, třímístný kód písmen (např. KTV).',
      citroen: 'Na štítku ve dveřích nebo pod kapotou, třímístný kód písmen (např. EZW).',
      opel: 'Na štítku pod kapotou nebo ve dveřích, často s prefixem „Z“ (např. Z20R).',
      hyundai: 'Na štítku na B-sloupku u řidiče, údaj „PAINT“.', kia: 'Na štítku na B-sloupku u řidiče, údaj „PAINT“.',
      mitsubishi: 'V zádveří u řidiče nebo spolujezdce, případně v motorovém prostoru.',
    };
    return H[k] || 'Nejčastěji na výrobním štítku ve dveřích (B-sloupek), pod kapotou nebo v kufru. Když štítek chybí, kód podle VIN zdarma sdělí autorizovaný servis.';
  }

  /* one shade: detail */
  async function viewColor(k, code, params) {
    const b = brandOf(k);
    if (!b) return viewNotFound();
    const tok = ++renderToken;
    const rows = await loadBrand(k);
    if (tok !== renderToken) return;
    const i = params.get('i');
    const same = rows.filter(r => r.c === code);
    const s = (i !== null && rows[+i] && rows[+i].c === code) ? rows[+i] : same[0];
    if (!s) return viewNotFound();
    const [c1, c2] = stageFor(s.h);
    setColors(c1, c2);
    let form = [...s.f].includes(params.get('f')) ? params.get('f') : s.f[0];
    let eff = 'met';  // uni vs. metallic is not known from the code alone – the customer picks it for gun paint
    let kit = '';
    const others = same.filter(r => r !== s);
    const neighbours = rows.slice(Math.max(0, s.i - 4), s.i + 6).filter(r => r !== s).slice(0, 8);
    main.innerHTML = `
      <section class="stage full"><div class="pd">
        <div class="pd-tabs">
          <a class="chip soft" href="#/barvy/${k}">‹ ${esc(b.n)}</a>
          <button class="chip soft on" data-tab="overview">Přehled</button>
          <button class="chip soft" data-tab="howto">Postup</button>
          <button class="chip soft" data-tab="details">Detaily</button>
        </div>
        <div class="pd-info">
          <span class="eyebrow" style="color:var(--ink-2)">${esc(b.n)} · kód barvy</span>
          <h1><span class="code">${esc(s.c)}</span> ${esc(s.n)}</h1>
          <span class="hero-script script">${s.fx === 'p' ? 'perleť' : s.fx === 'm' ? 'metalíza' : 'namícháme na zakázku'}${s.two ? ' · dvouvrstvá (2 ks/bal)' : ''}</span>
          <div id="tab-overview">
            <div class="forms" id="forms" role="radiogroup" aria-label="Forma">
              ${[...s.f].map(fk => `<button class="form ${fk === form ? 'on' : ''}" role="radio" aria-checked="${fk === form}" data-form="${fk}">
                <span class="form-art">${productSVG(fk, s.h, s.fx, '')}</span><b>${FORMS[fk].short}</b><small>${FORMS[fk].name.replace(/^[^0-9·]*/, '') || ''}</small><em>${fmt(s.two ? FORMS[fk].two : fk === 'g' ? FORMS.g.uni : FORMS[fk].price)}${fk === 'g' && !s.two ? '+' : ''}</em></button>`).join('')}
            </div>
            <p class="pd-desc" id="formText"></p>
            <div id="extra"></div>
            ${others.length ? `<p class="fine">Stejný kód má u ${esc(b.n)} i ${others.map(o => `<a class="link" href="${shadeHref(o)}">${esc(o.n || 'jiný odstín')}</a>`).join(', ')} – zkontroluj název na štítku.</p>` : ''}
          </div>
          <div id="tab-howto" class="rich" hidden>
            <h3>1 · Příprava</h3><p>Místo opravy umyj, odmasti a přebrus (P400–P800 pro sprej, P1000+ pro tužku). Okolí zamaskuj.</p>
            <h3>2 · Základ</h3><p>Na holý kov nebo plast nanes základ / plnič, po zaschnutí jemně přebrus.</p>
            <h3>3 · Barva</h3><p>Nanášej v tenkých vrstvách s odvětráním mezi vrstvami. Odstín vždy nejdřív vyzkoušej na nástřikové kartě – zvlášť u metalíz a perletí.</p>
            <h3>4 · Bezbarvý lak</h3><p>Metalízy a perleti jsou báze pod lak – na závěr bezbarvý lak (1K nebo 2K). Uni barvy lze nechat bez laku, lak zvýší lesk a odolnost.</p>
            <p><a class="link" href="#/shop/lakovani">Bezbarvé laky, základy a plniče ›</a></p>
          </div>
          <div id="tab-details" hidden>
            <table class="spec"><tbody>
              <tr><td>Značka</td><td>${esc(b.n)}</td></tr>
              <tr><td>Kód barvy</td><td>${esc(s.c)}</td></tr>
              <tr><td>Název odstínu</td><td>${esc(s.n || '–')}</td></tr>
              <tr><td>Dostupné formy</td><td>${[...s.f].map(fk => FORMS[fk].name).join('<br>')}</td></tr>
              <tr><td>Kde najdu kód</td><td>${esc(codeHint(k))}</td></tr>
              <tr><td>Číslo produktu</td><td>${[...s.f].map(fk => `${FORMS[fk].short}: ${s.pid['sgpm'.indexOf(fk)]}`).join(' · ')}</td></tr>
            </tbody></table>
            <p class="pd-note">Náhled barvy na obrazovce je pouze orientační (odvozený z názvu). Barvu mícháme podle receptury výrobce vozu.</p>
          </div>
        </div>
        <div class="pd-media"><div class="art-stage" id="art"></div><span class="swatch-note">${s.h ? 'orientační náhled odstínu' : 'náhled odstínu není k dispozici'}</span></div>
        <div class="pd-buy">
          <div class="pd-price" id="pdPrice"></div>
          <div class="qty"><button data-step="-1" aria-label="Méně">−</button><input id="qty" type="number" min="1" max="99" value="1" aria-label="Množství"><button data-step="1" aria-label="Více">+</button></div>
          <button class="btn accent" id="buy">Do košíku</button>
          <span class="fine" id="bulkNote">Od ${SHOP.bulkQty} ks −${SHOP.bulkPct} %</span>
        </div>
      </div></section>
      ${neighbours.length ? `<section class="stage plain"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">${esc(b.n)}</span><h2>Sousední <span class="script">odstíny</span></h2></div><a class="btn ghost" href="#/barvy/${k}">Všech ${nf(b.cnt)} ›</a></div>
        <div class="shades">${neighbours.map(x => shadeCard(x)).join('')}</div></div></section>` : ''}
      <section class="stage light"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">K opravě se hodí</span><h2>Dokonči <span class="script" style="color:#0e0f11">opravu</span></h2></div><a class="btn dark" href="#/shop">Shop ›</a></div>
        <div class="grid">${P.filter(p => p.stock && p.img.length && /bezbarv|plnič|plnic|odmaš|nástřik|brusn/i.test(p.name)).slice(0, 5).map(card).join('')}</div>
      </div></section>
      ${footer()}`;

    function update() {
      $$('#forms .form').forEach(x => { const on = x.dataset.form === form; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      $('#art').innerHTML = productSVG(form, s.h, s.fx, s.c, 'xl');
      $('#formText').textContent = FORMS[form].text;
      const ex = [];
      if (form === 'g' && !s.two) ex.push(`<div class="opts" id="eff"><span>Typ odstínu</span>
        <button class="chip soft ${eff === 'uni' ? 'on' : ''}" data-eff="uni">Uni (plná barva) · ${fmt(FORMS.g.uni)}</button>
        <button class="chip soft ${eff === 'met' ? 'on' : ''}" data-eff="met">Metalíza / perleť · ${fmt(FORMS.g.price)}</button></div>`);
      if (form === 's' || form === 'm') ex.push(`<div class="kits" id="kits"><span>Doplňková sada (volitelně)</span>
        ${Object.entries(KITS).map(([kk, K]) => `<label class="kit ${kit === kk ? 'on' : ''}"><input type="checkbox" data-kit="${kk}" ${kit === kk ? 'checked' : ''}><b>${K.name}</b><small>${K.text}</small><em>+ ${fmt(K.price)}</em></label>`).join('')}</div>`);
      $('#extra').innerHTML = ex.join('');
      const unit = formPrice(s, form, eff);
      $('#pdPrice').innerHTML = `${fmt(unit + (kit ? KITS[kit].price : 0))}<small style="margin-left:8px">${kit ? 'vč. sady' : 'vč. DPH'}</small>`;
      history.replaceState(null, '', `#/barva/${k}/${encodeURIComponent(s.c)}?i=${s.i}&f=${form}`);
    }
    $('#forms').addEventListener('click', e => { const x = e.target.closest('[data-form]'); if (!x) return; form = x.dataset.form; if (form !== 's' && form !== 'm') kit = ''; update(); });
    $('#extra').addEventListener('click', e => {
      const x = e.target.closest('[data-eff]'); if (x) { eff = x.dataset.eff; update(); }
    });
    $('#extra').addEventListener('change', e => { const x = e.target.closest('[data-kit]'); if (!x) return; kit = x.checked ? x.dataset.kit : ''; update(); });
    $$('[data-tab]').forEach(bt => bt.addEventListener('click', () => {
      $$('[data-tab]').forEach(x => x.classList.toggle('on', x === bt));
      ['overview', 'howto', 'details'].forEach(t => { $('#tab-' + t).hidden = bt.dataset.tab !== t; });
    }));
    $$('[data-step]').forEach(bt => bt.addEventListener('click', () => { const q = $('#qty'); q.value = Math.min(99, Math.max(1, (+q.value || 1) + +bt.dataset.step)); }));
    $('#buy').addEventListener('click', () => {
      const qty = Math.max(1, Math.min(99, +$('#qty').value || 1));
      Cart.add({ t: 'c', b: k, c: s.c, n: s.n, h: s.h, fx: s.fx, f: form, e: form === 'g' && !s.two ? eff : '', pid: s.pid['sgpm'.indexOf(form)], two: s.two, i: s.i }, qty, `${b.n} ${s.c} · ${FORMS[form].short}`);
      if (kit) Cart.add({ t: 'k', id: kit }, 1, KITS[kit].name);
    });
    update();
  }

  /* regular shop */
  const shopState = { q: '', sort: 'rec', stock: false, shown: PAGE, key: '' };
  function viewShop(catKey, subKey) {
    const c = catOf(catKey);
    const s = c && subKey ? c.subs.find(x => x.key === subKey) : null;
    const st = CAT_STYLE[catKey];
    setColors(...(st ? [st.a, st.b] : ['#8b95a3', '#121519']));
    const key = `${catKey}/${subKey}`;
    if (shopState.key !== key) { shopState.key = key; shopState.shown = PAGE; }
    const subs = c ? c.subs.filter(x => P.some(p => p.cat === c.key && p.sub === x.key)) : [];
    main.innerHTML = `
      <section class="stage full"><div class="stage-inner">
        <div class="shop-head"><span class="eyebrow" style="color:var(--ink-2)">Shop · ${c ? esc(st?.sub || '') : 'celý sortiment'}</span>
          <h1>${c ? esc(s ? s.name : c.name) : 'Příslušenství'}<span class="script">${c ? 'vše pro opravu laku' : 'pro lakování, přípravu a péči'}</span></h1></div>
        <div class="toolbar">
          <div class="chips"><a class="chip ${!c ? 'on' : ''}" href="#/shop">Vše <small>${P.length}</small></a>
            ${CATS.map(x => `<a class="chip ${c && c.key === x.key ? 'on' : ''}" href="#/shop/${x.key}">${esc(x.name)} <small>${P.filter(p => p.cat === x.key).length}</small></a>`).join('')}</div>
          <div class="tools">
            <label class="sr" for="q">Hledat</label><input class="field" id="q" type="search" placeholder="Hledat…" value="${esc(shopState.q)}">
            <label class="sr" for="sort">Řazení</label>
            <select class="field" id="sort">${[['rec', 'Doporučené'], ['asc', 'Cena ↑'], ['desc', 'Cena ↓'], ['az', 'A–Z']].map(([v, l]) => `<option value="${v}" ${shopState.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div>
        </div>
        ${subs.length > 1 ? `<div class="chips subchips">
          <a class="chip soft ${!s ? 'on' : ''}" href="#/shop/${c.key}">Vše</a>
          ${subs.map(x => `<a class="chip soft ${s && s.key === x.key ? 'on' : ''}" href="#/shop/${c.key}/${x.key}">${esc(x.name)} <small>${P.filter(p => p.cat === c.key && p.sub === x.key).length}</small></a>`).join('')}</div>` : ''}
        <label class="toggle"><input type="checkbox" id="stockOnly" ${shopState.stock ? 'checked' : ''}> Jen skladem</label>
        <div class="grid" id="grid"></div>
        <div class="more" id="more"></div>
      </div></section>
      ${ticker()}${footer()}`;
    const draw = () => {
      const q = norm(shopState.q.trim());
      const list = P.filter(p => (!c || p.cat === c.key) && (!s || p.sub === s.key) && (!shopState.stock || p.stock)
        && (!q || norm(`${p.name} ${p.brand} ${p.code}`).includes(q)));
      if (shopState.sort === 'rec') list.sort((a, b) => (b.stock - a.stock) || (b.img.length ? 1 : 0) - (a.img.length ? 1 : 0));
      if (shopState.sort === 'asc') list.sort((a, b) => (a.czk || 1e9) - (b.czk || 1e9));
      if (shopState.sort === 'desc') list.sort((a, b) => (b.czk || 0) - (a.czk || 0));
      if (shopState.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
      $('#grid').innerHTML = list.length ? list.slice(0, shopState.shown).map(card).join('') : `<p class="empty" style="grid-column:1/-1">Nic jsme nenašli. Zkus jiný výraz.</p>`;
      const rest = list.length - shopState.shown;
      $('#more').innerHTML = rest > 0 ? `<button class="btn ghost" id="moreBtn">Zobrazit další (${rest})</button>` : '';
    };
    $('#q').addEventListener('input', e => { shopState.q = e.target.value; shopState.shown = PAGE; draw(); });
    $('#sort').addEventListener('change', e => { shopState.sort = e.target.value; draw(); });
    $('#stockOnly').addEventListener('change', e => { shopState.stock = e.target.checked; shopState.shown = PAGE; draw(); });
    $('#more').addEventListener('click', e => { if (e.target.id === 'moreBtn') { shopState.shown += PAGE; draw(); } });
    draw();
  }

  function viewProduct(id, vParam) {
    const p = byId[id];
    if (!p) return viewNotFound();
    const st = CAT_STYLE[p.cat] || { a: '#8b95a3', b: '#121519' };
    setColors(st.a, st.b);
    const c = catOf(p.cat), sub = subOf(p);
    const sib = P.filter(x => x.cat === p.cat && (!p.sub || x.sub === p.sub));
    const k = sib.indexOf(p);
    const prev = sib[(k - 1 + sib.length) % sib.length], next = sib[(k + 1) % sib.length];
    const related = sib.filter(x => x !== p && x.stock && x.img.length).slice(0, 5);
    let sel = p.var?.find(x => String(x.v) === vParam) || (p.var ? p.var[0] : null);
    main.innerHTML = `
      <section class="stage full"><div class="pd">
        <div class="pd-tabs">
          <a class="chip soft" href="#/shop/${p.cat}${p.sub ? '/' + p.sub : ''}">‹ Zpět</a>
          <button class="chip soft on" data-tab="overview">Přehled</button>
          ${p.desc ? '<button class="chip soft" data-tab="desc">Popis</button>' : ''}
          ${p.howto ? '<button class="chip soft" data-tab="howto">Postup</button>' : ''}
          <button class="chip soft" data-tab="details">Parametry</button>
        </div>
        <div class="pd-info">
          <span class="eyebrow" style="color:var(--ink-2)">${esc(c.name)}${sub ? ' · ' + esc(sub.name) : ''}</span>
          <h1 class="pname">${esc(p.name)}</h1>
          <span class="hero-script script">${esc(p.brand || (sub ? sub.name : c.name))}</span>
          <div id="tab-overview">
            ${p.short ? `<p class="pd-desc">${esc(p.short)}</p>` : ''}
            ${p.var ? `<div class="picker"><div class="picker-head"><b>${esc(p.varLabel)}</b></div><div class="sizes-pick">${p.var.map(v => `<button class="chip soft ${sel && sel.v === v.v ? 'on' : ''}" data-v="${v.v}">${esc(v.l)} · ${fmt(v.czk)}</button>`).join('')}</div></div>` : ''}
            <div class="chips">${p.brand ? `<span class="chip soft">${esc(p.brand)}</span>` : ''}<span class="chip soft">${esc(p.avail || (p.stock ? 'skladem' : 'na objednávku'))}</span><span class="chip soft">Odběr na 4 prodejnách</span></div>
          </div>
          <div id="tab-desc" class="rich" hidden>${p.desc || ''}</div>
          <div id="tab-howto" class="rich" hidden>${p.howto || ''}</div>
          <div id="tab-details" hidden>
            <table class="spec"><tbody>
              ${(p.params || []).map(([a, b2]) => `<tr><td>${esc(a)}</td><td>${esc(b2)}</td></tr>`).join('')}
              <tr><td>Kategorie</td><td>${esc(c.name)}${sub ? ' · ' + esc(sub.name) : ''}</td></tr>
              ${p.code ? `<tr><td>Kód produktu</td><td>${esc(p.code)}</td></tr>` : ''}
              <tr><td>Dostupnost</td><td>${esc(p.avail || '–')}</td></tr>
              <tr><td>Doprava</td><td>od ${fmt(SHOP.shipFrom)}, osobní odběr zdarma</td></tr>
            </tbody></table>
            ${(p.dl || []).map(([u, t]) => `<p><a class="link" href="${esc(u)}" target="_blank" rel="noopener">${esc(t || 'Dokument ke stažení')} ›</a></p>`).join('')}
            <p><a class="link" href="${esc(p.src)}" target="_blank" rel="noopener">Produkt na současném e-shopu ›</a></p>
          </div>
        </div>
        <div class="pd-media">
          ${p.img[0] ? `<img id="mainImg" class="boxed" src="${p.img[0]}" alt="${esc(p.name)}">` : productSVG('s', st.a, 'm', '', 'xl')}
          ${p.img.length > 1 ? `<div class="thumbs">${p.img.map((src, i) => `<button class="thumb ${i === 0 ? 'on' : ''}" data-img="${src}" aria-label="Foto ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div class="pd-buy">
          <div class="pd-price" id="pdPrice"></div>
          <div class="qty"><button data-step="-1" aria-label="Méně">−</button><input id="qty" type="number" min="1" max="99" value="1" aria-label="Množství"><button data-step="1" aria-label="Více">+</button></div>
          <button class="btn accent" id="buy" ${p.czk ? '' : 'disabled'}>Do košíku</button>
          <div class="pd-nav"><a class="round" href="#/p/${prev.id}" aria-label="Předchozí">‹</a><a class="round" href="#/p/${next.id}" aria-label="Další">›</a></div>
        </div>
      </div></section>
      ${related.length ? `<section class="stage plain"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">${esc(sub ? sub.name : c.name)}</span><h2>Mohlo by <span class="script">se hodit</span></h2></div></div>
        <div class="grid">${related.map(card).join('')}</div></div></section>` : ''}
      ${footer()}`;
    const upd = () => {
      const price = sel ? sel.czk : p.czk;
      $('#pdPrice').innerHTML = price ? `${fmt(price)}${!sel && p.reg ? ` <s class="old">${fmt(p.reg)}</s>` : ''}<small style="margin-left:8px">vč. DPH</small>` : '<small>cena na dotaz</small>';
      $$('[data-v]').forEach(b2 => b2.classList.toggle('on', !!sel && +b2.dataset.v === sel.v));
    };
    $('.picker')?.addEventListener('click', e => { const b2 = e.target.closest('[data-v]'); if (!b2) return; sel = p.var.find(x => x.v === +b2.dataset.v); history.replaceState(null, '', `#/p/${p.id}?v=${sel.v}`); upd(); });
    $$('[data-tab]').forEach(bt => bt.addEventListener('click', () => {
      $$('[data-tab]').forEach(x => x.classList.toggle('on', x === bt));
      ['overview', 'desc', 'howto', 'details'].forEach(t => { const el = $('#tab-' + t); if (el) el.hidden = bt.dataset.tab !== t; });
    }));
    $('.pd-media').addEventListener('click', e => {
      const th = e.target.closest('.thumb'); if (!th) return;
      $('#mainImg').src = th.dataset.img; $$('.thumb').forEach(x => x.classList.toggle('on', x === th));
    });
    $$('[data-step]').forEach(bt => bt.addEventListener('click', () => { const q = $('#qty'); q.value = Math.min(99, Math.max(1, (+q.value || 1) + +bt.dataset.step)); }));
    $('#buy').addEventListener('click', () => Cart.add({ t: 'p', id: p.id, v: sel ? sel.v : null }, Math.max(1, +$('#qty').value || 1), p.name));
    upd();
  }

  function viewCodeGuide() {
    setColors('#e8c21a', '#2a2302');
    const list = ['skoda', 'volkswagen', 'audi', 'ford', 'bmw', 'mercedes', 'toyota', 'renault', 'peugeot', 'opel', 'hyundai', 'mitsubishi'];
    main.innerHTML = `
      <section class="stage full"><div class="stage-inner story" style="min-height:calc(100svh - 32px)">
        <div><span class="eyebrow" style="color:var(--ink-2)">Poradna</span>
          <div class="sec-head" style="margin:6px 0 20px"><h2 style="font-size:clamp(44px,7vw,100px)">Kde je <span class="script">kód barvy?</span></h2></div>
          <p>Kód barvy je údaj výrobce, podle kterého namícháme přesný odstín. Najdeš ho na výrobním štítku – podle značky ve dveřích (B-sloupek), pod kapotou, v kufru nebo v servisní knížce.</p>
          <p>Štítek chybí? Zavolej s číslem VIN libovolnému autorizovanému servisu tvé značky – kód barvy ti zdarma sdělí. U vozů, které už neodpovídají původní barvě, změříme odstín přímo na prodejně nebo ze zaslaného vzorku (např. víčko nádrže).</p>
          <a class="btn" href="#/barvy" style="margin-top:12px">Mám kód – hledat ›</a></div>
        <div class="big-year" aria-hidden="true">VIN</div>
      </div></section>
      <section class="stage plain"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">Podle značky</span><h2>Nejčastější <span class="script">umístění</span></h2></div></div>
        <ol class="timeline">${list.map(k => `<li><b><a href="#/barvy/${k}">${esc(brandOf(k)?.n || k)}</a></b><p>${esc(codeHint(k))}</p></li>`).join('')}</ol>
        <p class="fine" style="margin-top:18px">Umístění se liší podle modelu a roku výroby – berte jako orientační vodítko.</p>
      </div></section>
      <section class="stage light"><div class="stage-inner story" style="padding-top:var(--pad)">
        <div><span class="eyebrow">Tužka, sprej, nebo pistole?</span><div class="sec-head" style="margin:6px 0 18px"><h2>Co vybrat</h2></div>
          <p><b>Opravná tužka</b> – kamínky a škrábance do pár milimetrů. <b>Sprej</b> – menší plochy do ~1 m² (zrcátko, nárazník, část dveří). <b>Do pistole</b> – větší plochy a profesionální výsledek, potřebuješ kompresor a pistoli.</p></div>
        <p class="quote">„Odstín vždy nejdřív<br>vyzkoušej na kartě.“</p>
      </div></section>
      ${footer()}`;
  }

  function viewStores() {
    setColors('#19c3b0', '#03221f');
    main.innerHTML = `
      <section class="stage full"><div class="stage-inner">
        <div class="shop-head"><span class="eyebrow" style="color:var(--ink-2)">Kontakt</span><h1>Prodejny<span class="script">mícháme i na počkání</span></h1></div>
        <div class="contact" style="margin-top:34px">
          <div style="display:grid;gap:16px">
            <div class="box"><h3>Zákaznická linka</h3><p class="lg"><a href="tel:${SHOP.phoneRaw}">${SHOP.phone}</a></p><p><a class="link" href="mailto:${SHOP.email}">${SHOP.email}</a></p>
              <p style="color:var(--ink-2)">Poradíme s odstínem, postupem i příslušenstvím. Firmám a stálým zákazníkům nabízíme individuální ceny.</p></div>
            <div class="box"><h3>Adresa e-shopu · reklamace a vracení</h3><p class="lg">${SHOP.company}<br>Dolní Branná 235<br>543 62 Dolní Branná</p></div>
          </div>
          <iframe class="map" title="Mapa – prodejna Praha-Kbely" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=Mladoboleslavsk%C3%A1%2022%2C%20Praha%209&z=14&output=embed"></iframe>
        </div>
      </div></section>
      <section class="stage plain"><div class="stage-inner" style="padding-top:var(--pad)">
        <div class="sec-head"><div><span class="eyebrow">4 kamenné prodejny</span><h2>Zastav <span class="script">se</span></h2></div></div>
        <div class="stores">${STORES.map(s => `<div class="box store"><h3>${esc(s.area)}</h3><p class="lg">${esc(s.city)}</p><p>${esc(s.addr)}</p>
          <p style="color:var(--ink-2)">${esc(s.hours)} · So–Ne zavřeno<br>Míchání do ${s.last}</p>${s.note ? `<p class="fine">${esc(s.note)}</p>` : ''}
          <p>${esc(s.person)} · <a class="link" href="mailto:${s.mail}">${s.mail}</a></p>
          <a class="btn ghost" href="https://maps.google.com/?q=${encodeURIComponent(s.addr)}" target="_blank" rel="noopener">Navigovat ›</a></div>`).join('')}</div>
      </div></section>
      <section class="stage plain"><div class="stage-inner contact" style="padding-top:var(--pad)">
        <div class="box"><h3>Provozovatel</h3><p>${SHOP.company}<br>${SHOP.seat}</p><p>IČ ${SHOP.ico} · DIČ ${SHOP.dic}<br>Spisová značka C 306464, Městský soud v Praze</p></div>
        <div class="box"><h3>Nákup</h3><p><a class="link" href="${SHOP.shipping}" target="_blank" rel="noopener">Možnosti dopravy</a> · <a class="link" href="${SHOP.payment}" target="_blank" rel="noopener">Platba</a> · <a class="link" href="${SHOP.terms}" target="_blank" rel="noopener">Obchodní podmínky</a> · <a class="link" href="${SHOP.claims}" target="_blank" rel="noopener">Reklamace</a></p></div>
      </div></section>
      ${footer()}`;
  }

  function viewNotFound() {
    setColors('#d0142c', '#2a0207');
    main.innerHTML = `<section class="stage full"><div class="stage-inner" style="display:grid;place-items:center;min-height:calc(100svh - 32px);text-align:center">
      <div><div class="big-year">404</div><p class="quote" style="margin:20px 0">Tenhle odstín jsme nenamíchali…</p><a class="btn" href="#/">Domů</a></div></div></section>`;
  }

  /* ---------- router ---------- */
  async function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    toggleMenu(false);
    renderToken++;
    const [path, qs] = location.hash.replace(/^#/, '').split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(qs || '');
    main.classList.remove('page-enter'); void main.offsetWidth; main.classList.add('page-enter');
    window.scrollTo({ top: 0, behavior: 'instant' });
    let r;
    if (!parts.length) r = viewHome();
    else if (parts[0] === 'barvy' && parts[1]) r = await viewBrand(parts[1], params);
    else if (parts[0] === 'barvy') r = viewBrands(params);
    else if (parts[0] === 'barva') r = await viewColor(parts[1], parts[2], params);
    else if (parts[0] === 'shop') r = viewShop(parts[1], parts[2]);
    else if (parts[0] === 'p') r = viewProduct(parts[1], params.get('v'));
    else if (parts[0] === 'kod-barvy') r = viewCodeGuide();
    else if (parts[0] === 'prodejny' || parts[0] === 'kontakt') r = viewStores();
    else r = viewNotFound();
    if (typeof r === 'function') cleanup = r;
    const h = main.querySelector('h1');
    document.title = (h && parts.length ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) + ' · ' : '') + 'Autolaky na míru podle kódu barvy';
  }

  main.addEventListener('click', e => {
    const a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); Cart.add({ t: 'p', id: a.dataset.add, v: null }, 1, byId[a.dataset.add]?.name); }
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); toggleMenu(false); } });
  window.addEventListener('hashchange', route);
  renderChrome();
  renderBadge();
  route();
})();
