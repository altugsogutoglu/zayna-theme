# Milestone 4 — Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Zayna Home product page as an editable OS 2.0 `main-product` section (block-driven: gallery, info, features, specs, buy-buttons+trust-badges, description, zayna-note, care-shipping) plus a `product-faq` section and a `related-products` section, wired to the existing `custom.*` metafields, reproducing the live Hydrogen product page 1:1 (incl. full pinch/pan/double-tap gallery lightbox and AJAX add-to-cart that opens the cart drawer).

**Architecture:** One `sections/main-product.liquid` renders the two-column article (sticky gallery left, info column right). Blocks render in two passes: the `gallery` block goes in the left column; all other blocks loop in editor order in the right column, so the merchant can reorder/hide/edit them while the shipped `block_order` reproduces the live layout. A per-template `assets/product.js` carries the product-only controllers (gallery carousel + lightbox + zoom, variant selection, AJAX add-to-cart, sticky bar, related-products fetch); it is loaded from inside `main-product`. The Hydrogen `custom.faqs` band renders as its own `product-faq` section placed **above** `related-products` in `product.json` (client preference). Add-to-cart POSTs to `/cart/add.js`, updates the header `[data-cart-count]`, and opens the existing cart drawer with a confirmation stub (Milestone 6 replaces the drawer body via the Section Rendering API).

**Tech Stack:** Liquid (OS 2.0 section + blocks, `{% form 'product' %}`, metafields, `recommendations` object + Product Recommendations URL), Tailwind v4 (existing `@theme` tokens), vanilla JS (Pointer Events for zoom, `fetch` for cart + recommendations).

**Plan series context:** Plan 4 of 10. Builds on Milestones 1–3. Reuses `@theme` tokens, `snippets/product-card.liquid` (in related-products), `snippets/payment-icons.liquid` (in trust badges), `snippets/aside.liquid` (the cart drawer shell — opened, not rebuilt here), the `[data-cart-count]` badge in `sections/header.liquid`, the `[data-cart-drawer-body]` mount in `layout/theme.liquid`, and the `aside:open` / `aside:close` events dispatched by `assets/theme.js`. Work on branch `feat/milestone-4-product`.

**Verification model:** No unit runner. Each task: `npm run build:css` (exit 0) + `npx shopify theme check` (0 ERRORS; the 3 pre-existing false-positive warnings may remain). Run all commands from `/Users/altugsogutoglu/Herd/zayna-theme`.

---

## Source-of-truth content (extracted from the Hydrogen app)

Read these for exact 1:1 markup/content; do not import any React:
- `zayna-home/app/routes/($locale).products.$handle.tsx` — page composition + `PRODUCT_FRAGMENT` (which metafields).
- `zayna-home/app/components/product/{ProductGallery,ProductInfo,ProductFeatures,ProductFaq,CareShipping,TrustBadges,ZaynaNote,StickyAddToCart,RelatedProducts}.tsx`
- `zayna-home/app/components/{ProductForm,AddToCartButton,ConditionBadge,SoldOverlay}.tsx`

**Metafields already in the store (namespace `custom`):** `condition`, `intro`, `features` (list of keys), `zayna_note`, `size_note`, `materials`, `dimensions`, `faqs` (JSON array of `{question, answer}`), `bestseller` (used by product-card). All read via `product.metafields.custom.<key>.value`.

**Block → Hydrogen mapping (and three faithful realizations of the spec's block list):**
- `gallery` ← ProductGallery (left column, sticky).
- `info` ← ProductInfo header: vendor eyebrow, title, **price + compare-at** (the spec's "price" block is folded into `info`, exactly as Hydrogen renders price under the title), condition badge + availability row, intro paragraph.
- `features` ← ProductFeatures (metafield-driven icon grid).
- `specs` ← ProductInfo specs `<dl>` (category/size/material/dimensions/sku).
- `buy_buttons` ← ProductForm **+ TrustBadges** (the spec's "trust-badges" block is folded into `buy_buttons`, matching Hydrogen where `<TrustBadges/>` sits inside the form wrapper tight under the button at `space-y-4`).
- `description` ← ProductInfo description paragraph.
- `zayna_note` ← ZaynaNote (metafield-driven).
- `care_shipping` ← CareShipping accordion (3 rows).
- **Sticky ATC** ← StickyAddToCart, rendered section-level (no editable settings; it observes the main add button), not a block.
- **FAQ** ← ProductFaq → own `product-faq` section, placed above `related-products`.

**Right-column order (matches Hydrogen exactly):** info → features → specs → buy_buttons(+trust) → description → zayna_note → care_shipping.

**Condition mapping (reuse the product-card case):** `new` / `new without tags` / `nieuw zonder prijskaartje` → label `new without tags`, style `bg-sage/15 text-sage`; `very good` / `heel goed` → `very good`, `bg-stone/15 text-stone`; `good` / `goed` → `good`, `bg-stone-soft/20 text-stone`.

**Availability copy (Dutch, editable via `info` settings):** in stock = `Op voorraad — verzending binnen 1–3 werkdagen`; sold = `Uitverkocht`. Price-on-request (amount 0) = `Prijs op aanvraag`.

**IMPORTANT Shopify gotchas (from M1–M3):**
- `url`-type settings cannot have a default — use `type: "text"` for any URL default. `collection`/`collection_list`/`blog`/`image_picker`/`page` settings take no default.
- NEVER put a `| filter` inside `image_tag` (or any filter) named args (e.g. `alt: x | default: y`) — Liquid parses it as a separate filter and silently drops later args. Precompute into a variable first, then pass `alt: primary_alt`.
- Do NOT hand-edit editor-managed files (`templates/index.json`, `sections/header-group.json`, `sections/footer-group.json`). `templates/product.json` is NEW and created here — that is fine.
- After any markup class change run `npm run build:css` and commit `assets/tailwind.css`.

---

### Task 1: Branch + product-feature snippet (icon + label registry)

Ports `ProductFeatures.tsx` (the 19-entry registry: Dutch label + custom SVG glyph per key). One snippet renders the full `<li>` for a given `key`; unknown keys render nothing.

**Files:**
- Create: `snippets/product-feature.liquid`

- [ ] **Step 1: Create branch**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && git checkout -b feat/milestone-4-product && git branch --show-current
```
Expected: `feat/milestone-4-product`.

- [ ] **Step 2: Create `snippets/product-feature.liquid`**

```liquid
{%- comment -%}
  Renders one product feature badge (icon + Dutch label) for a feature key.
  Ported 1:1 from app/components/product/ProductFeatures.tsx. Unknown keys render nothing.
  Usage: {% render 'product-feature', key: key %}
{%- endcomment -%}
{%- liquid
  assign f_label = ''
  case key
    when 'induction'        assign f_label = 'Inductiegeschikt'
    when 'oven_safe'        assign f_label = 'Ovenbestendig'
    when 'dishwasher_safe'  assign f_label = 'Vaatwasserbestendig'
    when 'freezer_safe'     assign f_label = 'Vriezerbestendig'
    when 'microwave_safe'   assign f_label = 'Magnetronbestendig'
    when 'heat_resistant'   assign f_label = 'Hittebestendig'
    when 'non_stick'        assign f_label = 'Antiaanbaklaag'
    when 'zero_toxins'      assign f_label = 'Zonder schadelijke stoffen'
    when 'utensil_safe'     assign f_label = 'Bestekbestendig'
    when 'stay_cool'        assign f_label = 'Handvat blijft koel'
    when 'food_safe'        assign f_label = 'Voedselveilig'
    when 'bpa_free'         assign f_label = 'BPA-vrij'
    when 'airtight'         assign f_label = 'Luchtdicht'
    when 'reusable'         assign f_label = 'Herbruikbaar'
    when 'leak_proof'       assign f_label = 'Lekvrij'
    when 'scratch_resistant' assign f_label = 'Krasvast'
    when 'stackable'        assign f_label = 'Stapelbaar'
    when 'borosilicate'     assign f_label = 'Borosilicaatglas'
    when 'eco_friendly'     assign f_label = 'Duurzaam'
  endcase
-%}
{%- if f_label != blank -%}
  <li class="flex flex-col items-center gap-2.5 text-center">
    <span class="grid h-14 w-14 place-items-center rounded-xl border border-border-soft text-ink">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
        {%- case key -%}
          {%- when 'induction' -%}
            <rect x="3" y="3.5" width="18" height="17" rx="2.5"/><path d="M6 9.5c1.8-2 3.4-2 5 0s3.2 2 5 0"/><path d="M6 14c1.8-2 3.4-2 5 0s3.2 2 5 0"/>
          {%- when 'oven_safe' -%}
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="8.5" x2="21" y2="8.5"/><line x1="6.5" y1="5.7" x2="11.5" y2="5.7"/><rect x="6.5" y="11.5" width="11" height="6.5" rx="1"/>
          {%- when 'dishwasher_safe' -%}
            <rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="7" x2="20" y2="7"/><path d="M12 10.5c1.6 2 2.6 3.2 2.6 4.6a2.6 2.6 0 1 1-5.2 0c0-1.4 1-2.6 2.6-4.6z"/>
          {%- when 'freezer_safe' -%}
            <line x1="12" y1="3" x2="12" y2="21"/><line x1="3.4" y1="7.5" x2="20.6" y2="16.5"/><line x1="20.6" y1="7.5" x2="3.4" y2="16.5"/><path d="M12 3l-1.6 1.6M12 3l1.6 1.6M12 21l-1.6-1.6M12 21l1.6-1.6"/>
          {%- when 'microwave_safe' -%}
            <rect x="3" y="5" width="18" height="14" rx="2"/><line x1="15" y1="5" x2="15" y2="19"/><path d="M6 9h6M6 12h6M6 15h6"/><circle cx="17.8" cy="9" r="0.5" fill="currentColor" stroke="none"/>
          {%- when 'heat_resistant' -%}
            <path d="M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-1.8.8-3.2 2-4.5.4 1.2 1.2 2 2.3 2.2C12 8.8 11 6 12 3z"/>
          {%- when 'non_stick' -%}
            <line x1="4" y1="19" x2="20" y2="19"/><path d="M12 5c2 2.6 3.2 4.2 3.2 6a3.2 3.2 0 0 1-6.4 0c0-1.8 1.2-3.4 3.2-6z"/>
          {%- when 'zero_toxins' -%}
            <path d="M12 3l7 2.5v5.2c0 4.2-3 7.1-7 8.3-4-1.2-7-4.1-7-8.3V5.5z"/><path d="M9 11.8l2 2 4-4.2"/>
          {%- when 'utensil_safe' -%}
            <path d="M7 3v4a2 2 0 0 0 4 0V3"/><line x1="9" y1="7" x2="9" y2="21"/><ellipse cx="16" cy="6.5" rx="2" ry="3.5"/><line x1="16" y1="10" x2="16" y2="21"/>
          {%- when 'stay_cool' -%}
            <path d="M14 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0z"/><line x1="12" y1="9" x2="12" y2="14"/>
          {%- when 'food_safe' -%}
            <circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>
          {%- when 'bpa_free' -%}
            <circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/><path d="M9 9.5h2.2a1.6 1.6 0 0 1 0 3.2H9V9.5z"/>
          {%- when 'airtight' -%}
            <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><rect x="6" y="8" width="12" height="12" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/>
          {%- when 'reusable' -%}
            <path d="M5 12a7 7 0 0 1 11.9-5"/><path d="M19 12a7 7 0 0 1-11.9 5"/><path d="M17 4v3.2h-3.2"/><path d="M7 20v-3.2h3.2"/>
          {%- when 'leak_proof' -%}
            <path d="M12 4c3 4 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5 5-9z"/><line x1="5.5" y1="18.5" x2="18.5" y2="5.5"/>
          {%- when 'scratch_resistant' -%}
            <path d="M12 4l5 5-5 11-5-11z"/><line x1="7" y1="9" x2="17" y2="9"/>
          {%- when 'stackable' -%}
            <rect x="5" y="13.5" width="14" height="5.5" rx="1"/><rect x="7" y="8.5" width="10" height="4" rx="1"/><rect x="9" y="4" width="6" height="3" rx="1"/>
          {%- when 'borosilicate' -%}
            <path d="M8 3h8"/><path d="M9.5 3v5.5l-3 8.5a1.8 1.8 0 0 0 1.7 2.5h7.6a1.8 1.8 0 0 0 1.7-2.5l-3-8.5V3"/><line x1="7.6" y1="14" x2="16.4" y2="14"/>
          {%- when 'eco_friendly' -%}
            <path d="M5 19c0-8 6-13 14-14 0 8-5 14-13 14H5z"/><path d="M9 15c2-3 4-4.6 7-6"/>
        {%- endcase -%}
      </svg>
    </span>
    <span class="text-[11px] leading-tight text-ink-soft">{{ f_label }}</span>
  </li>
{%- endif -%}
```

- [ ] **Step 3: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add snippets/product-feature.liquid assets/tailwind.css
git commit -m "feat(product): product-feature snippet (icon + label registry)"
```
Expected: build 0; theme check shows no new errors.

---

### Task 2: `product.js` — product-page controllers

The product-only controllers, loaded from `main-product`. Five IIFEs: (1) gallery carousel + lightbox + pinch/pan/double-tap zoom, (2) variant selection, (3) AJAX add-to-cart + drawer stub, (4) sticky add-to-cart bar, (5) related-products fetch. Faithful ports of `ProductGallery.tsx`, `ProductForm.tsx`, `AddToCartButton.tsx`, `StickyAddToCart.tsx`, `RelatedProducts.tsx`.

**Files:**
- Create: `assets/product.js`

- [ ] **Step 1: Create `assets/product.js`**

```js
// Zayna Home — product page controllers. Loaded once per product page from main-product.
(() => {
  'use strict';
  if (window.__zhProductInit) return;
  window.__zhProductInit = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* 1. Gallery: mobile carousel + desktop main/thumbs + lightbox     */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-gallery]').forEach((root) => {
    const slideUrls = JSON.parse(root.getAttribute('data-images') || '[]'); // [{src, srcset, alt, w, h}]
    if (!slideUrls.length) return;

    // --- mobile swipe carousel ---
    const track = root.querySelector('[data-gallery-track]');
    const counter = root.querySelector('[data-gallery-counter]');
    const dotsWrap = root.querySelectorAll('[data-gallery-dots]'); // mobile dots
    const setCounter = (i) => { if (counter) counter.textContent = (i + 1) + ' / ' + slideUrls.length; };
    const setDots = (i) => dotsWrap.forEach((dw) => dw.querySelectorAll('[data-gallery-dot]').forEach((d, di) => {
      const on = di === i;
      d.setAttribute('aria-current', on ? 'true' : 'false');
      d.className = 'h-1.5 transition-all duration-300 ' + (on ? 'w-7 bg-ink' : 'w-1.5 bg-stone-soft hover:bg-stone');
    }));
    let mobileIndex = 0;
    if (track) {
      const slides = Array.from(track.children);
      let raf = 0;
      track.addEventListener('scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const mid = track.scrollLeft + track.clientWidth / 2;
          let best = 0, bestD = Infinity;
          slides.forEach((s, i) => {
            const c = s.offsetLeft + s.clientWidth / 2;
            const d = Math.abs(c - mid);
            if (d < bestD) { bestD = d; best = i; }
          });
          if (best !== mobileIndex) { mobileIndex = best; setCounter(best); setDots(best); }
        });
      }, { passive: true });
      root.querySelectorAll('[data-gallery-dot]').forEach((d) => {
        d.addEventListener('click', () => {
          const i = Number(d.getAttribute('data-gallery-dot'));
          if (track && slides[i]) track.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' });
        });
      });
      track.querySelectorAll('[data-gallery-open]').forEach((btn) => {
        btn.addEventListener('click', () => openLightbox(Number(btn.getAttribute('data-gallery-open'))));
      });
    }

    // --- desktop main + thumbnails ---
    const main = root.querySelector('[data-gallery-main-btn] img');
    const mainBtn = root.querySelector('[data-gallery-main-btn]');
    let desktopIndex = 0;
    const setMain = (i) => {
      desktopIndex = i;
      if (main) {
        main.src = slideUrls[i].src;
        if (slideUrls[i].srcset) main.srcset = slideUrls[i].srcset;
        main.alt = slideUrls[i].alt || '';
      }
      root.querySelectorAll('[data-gallery-thumb]').forEach((t, ti) => {
        const on = ti === i;
        t.className = 'relative aspect-square overflow-hidden bg-cream transition-all duration-300 focus-visible:outline-none ' +
          (on ? 'ring-2 ring-stone' : 'opacity-80 hover:opacity-100');
      });
    };
    root.querySelectorAll('[data-gallery-thumb]').forEach((t) => {
      t.addEventListener('click', () => setMain(Number(t.getAttribute('data-gallery-thumb'))));
    });
    if (mainBtn) mainBtn.addEventListener('click', () => openLightbox(desktopIndex));

    /* ---- lightbox ---- */
    const box = root.querySelector('[data-gallery-lightbox]');
    if (!box) return;
    const boxTrack = box.querySelector('[data-lightbox-track]');
    const boxSlides = Array.from(boxTrack ? boxTrack.children : []);
    const boxCounter = box.querySelector('[data-lightbox-counter]');
    const boxDotsWrap = box.querySelector('[data-lightbox-dots]');
    let lbIndex = 0;
    let prevOverflow = '';

    const setLb = (i, instant) => {
      lbIndex = Math.max(0, Math.min(slideUrls.length - 1, i));
      if (boxTrack && boxSlides[lbIndex]) {
        boxTrack.scrollTo({ left: boxSlides[lbIndex].offsetLeft, behavior: instant ? 'auto' : 'smooth' });
      }
      if (boxCounter) boxCounter.textContent = (lbIndex + 1) + ' / ' + slideUrls.length;
      if (boxDotsWrap) boxDotsWrap.querySelectorAll('[data-lightbox-dot]').forEach((d, di) => {
        const on = di === lbIndex;
        d.setAttribute('aria-current', on ? 'true' : 'false');
        d.className = 'h-1.5 transition-all duration-300 ' + (on ? 'w-7 bg-surface' : 'w-1.5 bg-surface/30 hover:bg-surface/60');
      });
      resetAllZoom();
    };

    function openLightbox(i) {
      box.classList.remove('hidden');
      box.classList.add('flex');
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setLb(i, true);
      const closeBtn = box.querySelector('[data-lightbox-close]');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }
    function closeLightbox() {
      box.classList.add('hidden');
      box.classList.remove('flex');
      document.body.style.overflow = prevOverflow;
      resetAllZoom();
      if (mainBtn) mainBtn.focus({ preventScroll: true });
    }

    box.querySelectorAll('[data-lightbox-close]').forEach((b) => b.addEventListener('click', closeLightbox));
    const prevBtn = box.querySelector('[data-lightbox-prev]');
    const nextBtn = box.querySelector('[data-lightbox-next]');
    if (prevBtn) prevBtn.addEventListener('click', () => setLb(lbIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setLb(lbIndex + 1));
    if (boxDotsWrap) boxDotsWrap.querySelectorAll('[data-lightbox-dot]').forEach((d) => {
      d.addEventListener('click', () => setLb(Number(d.getAttribute('data-lightbox-dot'))));
    });
    // Track scroll → sync index (when dragging on touch)
    if (boxTrack) {
      let lraf = 0;
      boxTrack.addEventListener('scroll', () => {
        if (lraf) return;
        lraf = requestAnimationFrame(() => {
          lraf = 0;
          const mid = boxTrack.scrollLeft + boxTrack.clientWidth / 2;
          let best = 0, bestD = Infinity;
          boxSlides.forEach((s, i) => {
            const c = s.offsetLeft + s.clientWidth / 2;
            const d = Math.abs(c - mid);
            if (d < bestD) { bestD = d; best = i; }
          });
          if (best !== lbIndex) {
            lbIndex = best;
            if (boxCounter) boxCounter.textContent = (best + 1) + ' / ' + slideUrls.length;
            if (boxDotsWrap) boxDotsWrap.querySelectorAll('[data-lightbox-dot]').forEach((d, di) => {
              const on = di === best;
              d.setAttribute('aria-current', on ? 'true' : 'false');
              d.className = 'h-1.5 transition-all duration-300 ' + (on ? 'w-7 bg-surface' : 'w-1.5 bg-surface/30 hover:bg-surface/60');
            });
            resetAllZoom();
          }
        });
      }, { passive: true });
    }
    document.addEventListener('keydown', (e) => {
      if (box.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') setLb(lbIndex + 1);
      else if (e.key === 'ArrowLeft') setLb(lbIndex - 1);
    });

    /* ---- per-slide pinch / pan / double-tap zoom (port of ZoomableImage) ---- */
    const MIN = 1, MAX = 4, DT_MS = 280, DT_SCALE = 2.5;
    const zoomers = boxSlides.map((slide) => setupZoom(slide));
    function resetAllZoom() {
      zoomers.forEach((z, i) => z.reset(i !== lbIndex));
      // re-enable horizontal drag when no slide is zoomed
      if (boxTrack) boxTrack.style.overflowX = 'auto';
    }
    function setupZoom(slide) {
      const wrapper = slide.querySelector('[data-zoom-wrapper]');
      const target = slide.querySelector('[data-zoom-target]');
      if (!wrapper || !target) return { reset() {} };
      const meta = JSON.parse(slide.getAttribute('data-zoom-meta') || '{}'); // {w,h}
      const pointers = new Map();
      let gs = { distance: 0, scale: 1, panX: 0, panY: 0, px: 0, py: 0 };
      let tf = { scale: 1, x: 0, y: 0 };
      let zoomed = false, lastTap = 0, moved = false;

      const write = (animate) => {
        target.style.transitionDuration = animate ? '240ms' : '0ms';
        target.style.transform = 'translate3d(' + tf.x + 'px,' + tf.y + 'px,0) scale(' + tf.scale + ')';
        wrapper.style.cursor = tf.scale > 1.01 ? 'grab' : 'zoom-in';
      };
      const setTf = (scale, x, y, animate) => {
        const cs = Math.max(MIN, Math.min(MAX, scale));
        const r = wrapper.getBoundingClientRect();
        const W = r.width, H = r.height;
        const img = target.querySelector('img');
        const iw = meta.w || (img && img.naturalWidth) || 0;
        const ih = meta.h || (img && img.naturalHeight) || 0;
        let dW = W, dH = H;
        if (iw && ih) {
          const ratio = iw / ih;
          if (ratio > W / H) { dW = W; dH = W / ratio; } else { dH = H; dW = H * ratio; }
        }
        const maxX = Math.max(0, (dW * cs - W) / 2);
        const maxY = Math.max(0, (dH * cs - H) / 2);
        tf = { scale: cs, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
        write(animate);
        const isZ = cs > 1.01;
        if (isZ !== zoomed) { zoomed = isZ; if (boxTrack) boxTrack.style.overflowX = isZ ? 'hidden' : 'auto'; }
      };
      const reset = () => { tf = { scale: 1, x: 0, y: 0 }; write(false); if (zoomed) { zoomed = false; if (boxTrack) boxTrack.style.overflowX = 'auto'; } };

      wrapper.addEventListener('pointerdown', (e) => {
        wrapper.setPointerCapture && wrapper.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        moved = false;
        if (pointers.size === 2) {
          const [a, b] = Array.from(pointers.values());
          gs = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: tf.scale, panX: tf.x, panY: tf.y, px: (a.x + b.x) / 2, py: (a.y + b.y) / 2 };
        } else if (pointers.size === 1) {
          gs.panX = tf.x; gs.panY = tf.y; gs.px = e.clientX; gs.py = e.clientY;
        }
      });
      wrapper.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [a, b] = Array.from(pointers.values());
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (!gs.distance) return;
          const ns = gs.scale * (dist / gs.distance);
          const r = wrapper.getBoundingClientRect();
          const fx = gs.px - (r.x + r.width / 2);
          const fy = gs.py - (r.y + r.height / 2);
          const k = Math.max(MIN, Math.min(MAX, ns)) / gs.scale;
          setTf(ns, fx - (fx - gs.panX) * k, fy - (fy - gs.panY) * k);
          moved = true;
        } else if (pointers.size === 1 && tf.scale > 1.01) {
          const dx = e.clientX - gs.px, dy = e.clientY - gs.py;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
          setTf(tf.scale, gs.panX + dx, gs.panY + dy);
        }
      });
      const up = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size === 1) {
          const [rem] = Array.from(pointers.values());
          gs.panX = tf.x; gs.panY = tf.y; gs.px = rem.x; gs.py = rem.y;
        }
        if (pointers.size === 0 && !moved) {
          const now = performance.now();
          if (now - lastTap < DT_MS) {
            if (tf.scale > 1.01) setTf(1, 0, 0, true);
            else {
              const r = wrapper.getBoundingClientRect();
              const fx = e.clientX - (r.x + r.width / 2), fy = e.clientY - (r.y + r.height / 2);
              setTf(DT_SCALE, fx * (1 - DT_SCALE), fy * (1 - DT_SCALE), true);
            }
            lastTap = 0;
          } else lastTap = now;
        }
      };
      wrapper.addEventListener('pointerup', up);
      wrapper.addEventListener('pointercancel', up);
      return { reset };
    }
  });

  /* ---------------------------------------------------------------- */
  /* 2. Variant selection                                             */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-product-root]').forEach((root) => {
    const dataEl = root.querySelector('[data-product-json]');
    if (!dataEl) return;
    let pdata;
    try { pdata = JSON.parse(dataEl.textContent); } catch { return; }
    const variants = pdata.variants || [];
    const form = root.querySelector('[data-product-form] form');
    const idInput = root.querySelector('[data-variant-id]');
    const addBtn = root.querySelector('[data-add-button]');
    const priceEl = root.querySelector('[data-price]');
    const compareEl = root.querySelector('[data-compare-price]');
    const availEl = root.querySelector('[data-availability]');
    const availDot = root.querySelector('[data-availability-dot]');
    const stickyPrice = root.querySelector('[data-sticky-price]');
    const labels = pdata.labels || {};

    const selected = {}; // position(1-based) -> value
    root.querySelectorAll('[data-option-button][data-selected="true"]').forEach((b) => {
      selected[b.getAttribute('data-option-position')] = b.getAttribute('data-value');
    });

    const findVariant = () => variants.find((v) =>
      (v.options || []).every((val, i) => selected[String(i + 1)] === undefined || selected[String(i + 1)] === val)
    );

    const apply = (v) => {
      if (!v) return;
      if (idInput) idInput.value = v.id;
      if (priceEl) priceEl.innerHTML = (v.price === 0)
        ? '<span class="font-display italic text-xl text-stone">' + (labels.price_on_request || 'Prijs op aanvraag') + '</span>'
        : '<span class="font-display text-2xl tabular-nums text-ink">' + v.price_formatted + '</span>';
      if (compareEl) {
        if (v.compare_at_price && v.compare_at_price > v.price) {
          compareEl.innerHTML = v.compare_at_formatted;
          compareEl.classList.remove('hidden');
        } else { compareEl.innerHTML = ''; compareEl.classList.add('hidden'); }
      }
      if (stickyPrice) stickyPrice.textContent = v.price === 0 ? (labels.price_on_request || 'Prijs op aanvraag') : v.price_formatted;
      const avail = !!v.available;
      if (availEl) availEl.textContent = avail ? (labels.in_stock || '') : (labels.sold || 'Uitverkocht');
      if (availEl) availEl.className = 'inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] ' + (avail ? 'text-stone' : 'text-sold');
      if (availDot) availDot.className = 'block h-1.5 w-1.5 rounded-full ' + (avail ? 'bg-sage' : 'bg-sold');
      root.querySelectorAll('[data-add-button]').forEach((b) => {
        b.disabled = !avail;
        b.textContent = avail ? (labels.add || 'In winkelmand') : (labels.sold || 'Uitverkocht');
      });
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', u);
      } catch {}
    };

    root.querySelectorAll('[data-option-button]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pos = btn.getAttribute('data-option-position');
        selected[pos] = btn.getAttribute('data-value');
        root.querySelectorAll('[data-option-position="' + pos + '"]').forEach((b) => {
          const on = b === btn;
          b.setAttribute('data-selected', on ? 'true' : 'false');
          b.className = optionClass(on, b.getAttribute('data-available') === 'true');
        });
        apply(findVariant());
      });
    });
    function optionClass(selectedState, available) {
      return 'inline-flex items-center gap-2 px-4 h-10 text-sm transition-colors border ' +
        (selectedState ? 'border-ink text-ink bg-cream' : 'border-border-soft text-ink-soft hover:border-stone hover:text-ink') +
        (available ? '' : ' opacity-40 line-through');
    }

    // quantity stepper
    const qtyInput = root.querySelector('[data-qty-input]');
    root.querySelectorAll('[data-qty-dec]').forEach((b) => b.addEventListener('click', () => {
      if (!qtyInput) return; qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1); syncQty();
    }));
    root.querySelectorAll('[data-qty-inc]').forEach((b) => b.addEventListener('click', () => {
      if (!qtyInput) return; qtyInput.value = Math.min(99, (parseInt(qtyInput.value, 10) || 1) + 1); syncQty();
    }));
    function syncQty() {
      const v = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
      const out = root.querySelector('[data-qty-value]');
      if (out) out.textContent = v;
    }

    // wishlist toggle (visual only, matches Hydrogen local state)
    root.querySelectorAll('[data-wishlist]').forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      b.className = wishClass(!on);
      const heart = b.querySelector('svg');
      if (heart) heart.classList.toggle('fill-clay', !on);
    }));
    function wishClass(on) {
      return 'h-14 w-14 shrink-0 grid place-items-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 ' +
        (on ? 'border-clay/50 text-clay bg-clay/5' : 'border-border-soft text-ink-soft hover:text-clay hover:border-clay/40');
    }

    /* -------------------------------------------------------------- */
    /* 3. AJAX add-to-cart + drawer stub                              */
    /* -------------------------------------------------------------- */
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (addBtn && addBtn.disabled) return;
        const original = addBtn ? addBtn.textContent : '';
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = labels.adding || 'Toevoegen…'; }
        try {
          const res = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form),
          });
          if (!res.ok) throw new Error('add failed');
          await refreshCart(pdata.title);
          openCartDrawer();
        } catch (err) {
          console.error(err);
        } finally {
          if (addBtn) { addBtn.disabled = false; addBtn.textContent = original; }
        }
      });
    }

    async function refreshCart(title) {
      try {
        const cart = await (await fetch('/cart.js', { headers: { Accept: 'application/json' } })).json();
        document.querySelectorAll('[data-cart-count]').forEach((el) => {
          el.textContent = cart.item_count;
          el.classList.toggle('hidden', cart.item_count === 0);
        });
        const body = document.querySelector('[data-cart-drawer-body]');
        if (body) {
          body.innerHTML =
            '<div class="px-5 md:px-6 py-8 space-y-5">' +
            '<p class="text-sm text-ink">' + (labels.added || 'Toegevoegd aan winkelmand') + '</p>' +
            '<p class="font-display text-lg text-ink">' + (title || '') + '</p>' +
            '<p class="text-sm text-ink-soft">' + (labels.cart_count || 'Aantal artikelen') + ': <span class="tabular-nums">' + cart.item_count + '</span></p>' +
            '<a href="/checkout" class="block w-full h-14 bg-ink text-white hover:bg-clay transition-colors font-medium tracking-[0.18em] text-[12px] uppercase grid place-items-center">' + (labels.checkout || 'Afrekenen') + '</a>' +
            '</div>';
        }
      } catch (err) { console.error(err); }
    }
    function openCartDrawer() {
      const trigger = document.querySelector('[data-aside-open="cart"]');
      if (trigger) trigger.click();
    }
  });

  /* ---------------------------------------------------------------- */
  /* 4. Sticky add-to-cart bar (mobile)                               */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-sticky-atc]').forEach((bar) => {
    const targetId = bar.getAttribute('data-observe');
    const target = targetId ? document.getElementById(targetId) : null;
    let visible = false, drawerOpen = false;
    const render = () => {
      const show = visible && !drawerOpen;
      bar.classList.toggle('translate-y-full', !show);
      bar.classList.toggle('translate-y-0', show);
      if (show) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    };
    if (target) {
      new IntersectionObserver(([entry]) => { visible = !entry.isIntersecting; render(); }, { rootMargin: '0px 0px -40% 0px' })
        .observe(target);
    }
    document.addEventListener('aside:open', () => { drawerOpen = true; render(); });
    document.addEventListener('aside:close', () => { drawerOpen = false; render(); });
    render();
  });

  /* ---------------------------------------------------------------- */
  /* 5. Related products fetch (Product Recommendations API)          */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-related-products][data-url]').forEach(async (el) => {
    try {
      const res = await fetch(el.getAttribute('data-url'));
      if (!res.ok) return;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const fresh = doc.querySelector('[data-related-products]');
      if (fresh) el.innerHTML = fresh.innerHTML;
    } catch (err) { console.error(err); }
  });
})();
```

- [ ] **Step 2: Commit (no CSS change yet; classes appear in later tasks)**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add assets/product.js
git commit -m "feat(product): product.js (gallery+zoom, variants, ajax cart, sticky, related)"
```
Expected: no new errors.

---

### Task 3: Product gallery snippet

Ports `ProductGallery.tsx`: empty state, mobile swipe carousel (counter + zoom hint + dots), desktop main + thumbnails, and a pre-rendered full-screen lightbox (slides for pinch/pan zoom, arrows, dots, counter, close). Sold overlay when unavailable. `product.js` (Task 2) wires all behavior; this is the markup + the `data-images` JSON it reads.

**Files:**
- Create: `snippets/product-gallery.liquid`

- [ ] **Step 1: Create `snippets/product-gallery.liquid`**

```liquid
{%- comment -%}
  Product image gallery. Ported 1:1 from app/components/product/ProductGallery.tsx.
  Behavior wired by assets/product.js via the data-* hooks. Pass: product, is_sold.
{%- endcomment -%}
{%- liquid
  assign imgs = product.images
-%}
<div data-gallery
  data-images='[
    {%- for image in imgs -%}
      {%- assign alt = image.alt | default: product.title | escape -%}
      {"src": {{ image | image_url: width: 1600 | json }}, "srcset": {{ image | image_url: width: 1200 | json }}, "alt": {{ alt | json }}, "w": {{ image.width | default: 0 }}, "h": {{ image.height | default: 0 }} }{%- unless forloop.last -%},{%- endunless -%}
    {%- endfor -%}
  ]'>
  {%- if imgs.size == 0 -%}
    <div>
      <div class="relative aspect-[4/5] overflow-hidden bg-cream grid place-items-center text-center px-8">
        <div>
          <span aria-hidden="true" class="mx-auto mb-5 block h-px w-12 bg-stone-soft"></span>
          <p class="font-display italic text-2xl text-stone leading-snug">Photographing this piece soon.</p>
          <p class="mt-3 text-sm text-ink-soft max-w-xs mx-auto">In the meantime, the details and care notes below describe it.</p>
        </div>
        {%- if is_sold -%}
          <div class="absolute inset-0 bg-white/60 grid place-items-center pointer-events-none" aria-hidden="true"><span class="font-display italic text-sold -rotate-12 text-5xl">Uitverkocht</span></div>
        {%- endif -%}
      </div>
    </div>
  {%- else -%}
    {%- assign first = imgs | first -%}
    {%- assign first_alt = first.alt | default: product.title -%}

    {%- comment -%} Mobile / tablet swipe carousel {%- endcomment -%}
    <div class="md:hidden">
      <div class="relative">
        <div data-gallery-track class="no-scrollbar flex overflow-x-auto snap-x snap-mandatory scroll-smooth">
          {%- for image in imgs -%}
            {%- assign img_alt = image.alt | default: '' -%}
            {%- assign mob_loading = 'lazy' -%}{%- if forloop.first -%}{%- assign mob_loading = 'eager' -%}{%- endif -%}
            <button type="button" data-gallery-open="{{ forloop.index0 }}" aria-label="Vergroot afbeelding {{ forloop.index }} van {{ imgs.size }}" class="relative shrink-0 grow-0 basis-full snap-start aspect-[4/5] bg-cream overflow-hidden cursor-zoom-in focus-visible:outline-none">
              {{ image | image_url: width: 1000 | image_tag: loading: mob_loading, sizes: '100vw', widths: '400, 600, 800, 1000', alt: img_alt, class: 'h-full w-full object-cover pointer-events-none select-none' }}
            </button>
          {%- endfor -%}
        </div>
        {%- if is_sold -%}
          <div class="absolute inset-0 bg-white/60 grid place-items-center pointer-events-none" aria-hidden="true"><span class="font-display italic text-sold -rotate-12 text-5xl">Uitverkocht</span></div>
        {%- endif -%}
        {%- if imgs.size > 1 -%}
          <span data-gallery-counter class="pointer-events-none absolute top-3 left-3 inline-flex items-center bg-surface/95 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-ink tabular-nums">1 / {{ imgs.size }}</span>
        {%- endif -%}
        <span class="pointer-events-none absolute bottom-3 right-3 h-9 w-9 grid place-items-center bg-surface/95 backdrop-blur text-ink shadow-sm">{% render 'icon', name: 'zoom-in', size: 15 %}</span>
      </div>
      {%- if imgs.size > 1 -%}
        <div data-gallery-dots class="mt-4 flex justify-center gap-2">
          {%- for image in imgs -%}
            <button type="button" data-gallery-dot="{{ forloop.index0 }}" aria-label="Naar afbeelding {{ forloop.index }}" aria-current="{% if forloop.first %}true{% else %}false{% endif %}" class="h-1.5 transition-all duration-300 {% if forloop.first %}w-7 bg-ink{% else %}w-1.5 bg-stone-soft hover:bg-stone{% endif %}"></button>
          {%- endfor -%}
        </div>
      {%- endif -%}
    </div>

    {%- comment -%} Desktop main + thumbnails {%- endcomment -%}
    <div class="hidden md:block">
      <button type="button" data-gallery-main-btn aria-label="Vergroot afbeelding" class="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2">
        <div class="relative aspect-[4/5] overflow-hidden bg-cream cursor-zoom-in group">
          {{ first | image_url: width: 1200 | image_tag: loading: 'eager', fetchpriority: 'high', sizes: '(min-width: 1024px) 50vw, 100vw', widths: '600, 900, 1200', alt: first_alt, class: 'h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]' }}
          {%- if is_sold -%}
            <div class="absolute inset-0 bg-white/60 grid place-items-center pointer-events-none" aria-hidden="true"><span class="font-display italic text-sold -rotate-12 text-5xl">Uitverkocht</span></div>
          {%- endif -%}
          <span class="absolute bottom-3 right-3 h-10 w-10 grid place-items-center bg-surface/95 backdrop-blur text-ink shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">{% render 'icon', name: 'zoom-in', size: 16 %}</span>
        </div>
      </button>
      {%- if imgs.size > 1 -%}
        <div class="mt-4 grid grid-cols-5 gap-3">
          {%- for image in imgs -%}
            <button type="button" data-gallery-thumb="{{ forloop.index0 }}" aria-label="Toon afbeelding {{ forloop.index }}" class="relative aspect-square overflow-hidden bg-cream transition-all duration-300 focus-visible:outline-none {% if forloop.first %}ring-2 ring-stone{% else %}opacity-80 hover:opacity-100{% endif %}">
              {{ image | image_url: width: 240 | image_tag: loading: 'lazy', sizes: '120px', alt: '', class: 'h-full w-full object-cover' }}
            </button>
          {%- endfor -%}
        </div>
      {%- endif -%}
    </div>

    {%- comment -%} Lightbox {%- endcomment -%}
    <div data-gallery-lightbox class="hidden fixed inset-0 z-[100] bg-ink/95 backdrop-blur-sm flex-col" role="dialog" aria-modal="true" aria-label="Productfoto">
      <div class="flex items-center justify-between px-4 sm:px-6 h-14 text-surface/85">
        <span data-lightbox-counter class="text-[10px] uppercase tracking-[0.24em] tabular-nums">1 / {{ imgs.size }}</span>
        <button type="button" data-lightbox-close aria-label="Sluiten" class="h-10 w-10 grid place-items-center hover:text-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface/60">{% render 'icon', name: 'x', size: 20 %}</button>
      </div>
      <div class="relative flex-1 min-h-0">
        <div data-lightbox-track class="no-scrollbar h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex">
          {%- for image in imgs -%}
            {%- assign lb_alt = image.alt | default: product.title -%}
            <div class="shrink-0 grow-0 basis-full snap-center h-full px-2 sm:px-8" data-zoom-meta='{"w": {{ image.width | default: 0 }}, "h": {{ image.height | default: 0 }}}'>
              <div class="h-full w-full grid place-items-center overflow-hidden">
                <div data-zoom-wrapper class="relative h-full w-full select-none touch-none cursor-zoom-in">
                  <div data-zoom-target class="absolute inset-0" style="transition-property:transform;transition-timing-function:cubic-bezier(0.22,0.61,0.24,1);will-change:transform;transform:translate3d(0,0,0) scale(1);">
                    {{ image | image_url: width: 2000 | image_tag: loading: 'lazy', sizes: '100vw', widths: '800, 1200, 1600, 2000', alt: lb_alt, class: 'h-full w-full object-contain pointer-events-none select-none' }}
                  </div>
                </div>
              </div>
            </div>
          {%- endfor -%}
        </div>
        {%- if imgs.size > 1 -%}
          <button type="button" data-lightbox-prev aria-label="Vorige afbeelding" class="hidden md:grid absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 place-items-center bg-surface/10 hover:bg-surface/25 text-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface/60">{% render 'icon', name: 'chevron-left', size: 22 %}</button>
          <button type="button" data-lightbox-next aria-label="Volgende afbeelding" class="hidden md:grid absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 place-items-center bg-surface/10 hover:bg-surface/25 text-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface/60">{% render 'icon', name: 'chevron-right', size: 22 %}</button>
        {%- endif -%}
      </div>
      {%- if imgs.size > 1 -%}
        <div data-lightbox-dots class="px-4 sm:px-6 pb-5 pt-3 flex justify-center gap-2">
          {%- for image in imgs -%}
            <button type="button" data-lightbox-dot="{{ forloop.index0 }}" aria-label="Naar afbeelding {{ forloop.index }}" aria-current="{% if forloop.first %}true{% else %}false{% endif %}" class="h-1.5 transition-all duration-300 {% if forloop.first %}w-7 bg-surface{% else %}w-1.5 bg-surface/30 hover:bg-surface/60{% endif %}"></button>
          {%- endfor -%}
        </div>
      {%- endif -%}
    </div>
  {%- endif -%}
</div>
```

- [ ] **Step 2: Add the gallery icons to `snippets/icon.liquid`**

Add these `when` cases before the final `{%- endcase -%}` in `snippets/icon.liquid` (lucide paths):

```liquid
    {%- when 'zoom-in' -%}
      <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>
    {%- when 'chevron-left' -%}
      <path d="m15 18-6-6 6-6"/>
    {%- when 'chevron-right' -%}
      <path d="m9 18 6-6-6-6"/>
    {%- when 'heart' -%}
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    {%- when 'minus' -%}
      <path d="M5 12h14"/>
    {%- when 'plus' -%}
      <path d="M5 12h14"/><path d="M12 5v14"/>
    {%- when 'lock' -%}
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    {%- when 'package-check' -%}
      <path d="m16 16 2 2 4-4"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>
```

- [ ] **Step 3: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add snippets/product-gallery.liquid snippets/icon.liquid assets/tailwind.css
git commit -m "feat(product): gallery snippet + gallery/zoom/heart/lock icons"
```
Expected: build 0; no new errors.

---

### Task 4: `related-products` section (Product Recommendations)

Ports `RelatedProducts.tsx`. Standard Shopify Product Recommendations pattern: on first paint `recommendations.performed` is false, so the section renders a placeholder carrying `data-url`; `product.js` fetches the rendered section and swaps it in. When fetched via the recommendations URL, the grid renders with `snippets/product-card`.

**Files:**
- Create: `sections/related-products.liquid`

- [ ] **Step 1: Create `sections/related-products.liquid`**

```liquid
{%- liquid
  assign rec_url = routes.product_recommendations_url | append: '?section_id=' | append: section.id | append: '&product_id=' | append: product.id | append: '&limit=4&intent=related'
-%}
<div data-related-products{% unless recommendations.performed %} data-url="{{ rec_url }}"{% endunless %}>
  {%- if recommendations.performed and recommendations.products_count > 0 -%}
    <section aria-label="{{ section.settings.heading | default: 'Aanbevolen producten' }}" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pb-24">
      <h2 class="font-display text-2xl text-ink mb-8">{{ section.settings.heading }}</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-12 md:gap-x-7">
        {%- for product in recommendations.products -%}
          {% render 'product-card', product: product, loading: 'lazy' %}
        {%- endfor -%}
      </div>
    </section>
  {%- endif -%}
</div>

{% schema %}
{
  "name": "Related products",
  "tag": "section",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Misschien vind je dit ook mooi" }
  ],
  "presets": [{ "name": "Related products" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/related-products.liquid assets/tailwind.css
git commit -m "feat(product): related-products section (recommendations API)"
```
Expected: build 0; no new errors.

---

### Task 5: `product-faq` section

Ports `ProductFaq.tsx` + the `CareShipping` accordion UI, reading the `custom.faqs` JSON metafield. Full-width band on `bg-cream`; renders nothing when empty. The accordion uses a native `<details>/<summary>` so it needs no JS.

**Files:**
- Create: `sections/product-faq.liquid`

- [ ] **Step 1: Create `sections/product-faq.liquid`**

```liquid
{%- liquid
  assign faqs = product.metafields.custom.faqs.value
-%}
{%- if faqs != blank and faqs.size > 0 -%}
  <section aria-label="{{ section.settings.heading | default: 'Veelgestelde vragen' }}" class="border-t border-border-soft bg-cream">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-16 sm:py-24">
      <p class="text-[11px] uppercase tracking-[0.28em] text-clay text-center mb-3">{{ section.settings.eyebrow }}</p>
      <h2 class="font-display text-2xl sm:text-3xl text-ink text-center mb-10 sm:mb-12">{{ section.settings.heading }}</h2>
      <div class="divide-y divide-border-soft border-y border-border-soft">
        {%- for faq in faqs -%}
          <details class="group/acc">
            <summary class="w-full flex items-center justify-between py-5 text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span class="flex items-center gap-4">
                <span class="text-[10px] uppercase tracking-[0.22em] text-stone tabular-nums">+</span>
                <span class="font-display text-lg text-ink group-hover/acc:text-clay transition-colors">{{ faq.question }}</span>
              </span>
              {% render 'icon', name: 'plus', size: 14, class: 'transition-transform duration-300 text-ink-soft group-open/acc:rotate-45' %}
            </summary>
            <div class="pb-6 pr-2 pl-9 text-[14px] text-ink-soft leading-[1.75]">
              <p class="whitespace-pre-line">{{ faq.answer }}</p>
            </div>
          </details>
        {%- endfor -%}
      </div>
    </div>
  </section>
{%- endif -%}

{% schema %}
{
  "name": "Product FAQ",
  "tag": "section",
  "settings": [
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Goed om te weten" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Veelgestelde vragen" }
  ],
  "presets": [{ "name": "Product FAQ" }]
}
{% endschema %}
```

> Note: the `+` → `—` toggle glyph in Hydrogen's `AccordionItem` is reproduced here by rotating the lucide `plus` icon 45° on `[open]` (the `group-open/acc:rotate-45` class), matching the live behavior. The leading `+` text indicator stays `+`; this is an acceptable 1:1-equivalent for the no-JS `<details>` approach. Care-shipping (Task 6) uses the same pattern.

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/product-faq.liquid assets/tailwind.css
git commit -m "feat(product): product-faq section (custom.faqs accordion)"
```
Expected: build 0; no new errors.

---

### Task 6: `main-product` section (all blocks + sticky ATC + variant JSON)

The core section. Two-pass block rendering: `gallery` left (sticky), all other blocks right in editor order. Sticky ATC + the `[data-product-json]` payload + the `product.js` include live at section level.

**Files:**
- Create: `sections/main-product.liquid`

- [ ] **Step 1: Create `sections/main-product.liquid`**

```liquid
{%- liquid
  assign cv = product.selected_or_first_available_variant
  assign is_sold = false
  unless cv.available
    assign is_sold = true
  endunless

  assign cond_raw = product.metafields.custom.condition.value | downcase | strip
  assign cond_label = ''
  assign cond_style = ''
  case cond_raw
    when 'new', 'new without tags', 'nieuw zonder prijskaartje'
      assign cond_label = 'new without tags'
      assign cond_style = 'bg-sage/15 text-sage'
    when 'very good', 'heel goed'
      assign cond_label = 'very good'
      assign cond_style = 'bg-stone/15 text-stone'
    when 'good', 'goed'
      assign cond_label = 'good'
      assign cond_style = 'bg-stone-soft/20 text-stone'
  endcase
-%}
<section data-product-root class="relative">
  <article class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12 grid gap-12 md:grid-cols-2">
    {%- comment -%} Left column: gallery block(s) {%- endcomment -%}
    <div class="md:sticky md:top-24 md:self-start">
      {%- for block in section.blocks -%}
        {%- if block.type == 'gallery' -%}
          <div {{ block.shopify_attributes }}>
            {% render 'product-gallery', product: product, is_sold: is_sold %}
          </div>
        {%- endif -%}
      {%- endfor -%}
    </div>

    {%- comment -%} Right column: every non-gallery block, in editor order {%- endcomment -%}
    <div class="space-y-8">
      {%- for block in section.blocks -%}
        {%- case block.type -%}

          {%- when 'info' -%}
            <div {{ block.shopify_attributes }} class="space-y-8">
              <header>
                {%- if block.settings.show_vendor -%}
                  <p class="text-label text-clay mb-5 flex items-center gap-3"><span aria-hidden="true" class="block h-px w-10 bg-clay/60"></span>{{ product.vendor | default: 'Zayna Home' }}</p>
                {%- endif -%}
                <h1 class="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.015em] text-ink">{{ product.title }}</h1>
                <div class="mt-5 flex items-baseline gap-3">
                  <span data-price>
                    {%- if cv.price and cv.price > 0 -%}
                      <span class="font-display text-2xl tabular-nums text-ink">{{ cv.price | money }}</span>
                    {%- else -%}
                      <span class="font-display italic text-xl text-stone">{{ block.settings.price_on_request }}</span>
                    {%- endif -%}
                  </span>
                  <span data-compare-price class="text-ink-soft line-through text-sm {% if cv.compare_at_price == blank or cv.compare_at_price <= cv.price %}hidden{% endif %}">{%- if cv.compare_at_price and cv.compare_at_price > cv.price -%}{{ cv.compare_at_price | money }}{%- endif -%}</span>
                </div>
              </header>

              <div class="flex flex-wrap items-center gap-3">
                {%- if cond_label != blank -%}
                  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide {{ cond_style }}">{{ cond_label }}</span>
                {%- endif -%}
                <span data-availability class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] {% if is_sold %}text-sold{% else %}text-stone{% endif %}">
                  <span aria-hidden="true" data-availability-dot class="block h-1.5 w-1.5 rounded-full {% if is_sold %}bg-sold{% else %}bg-sage{% endif %}"></span>
                  {% if is_sold %}{{ block.settings.sold_text }}{% else %}{{ block.settings.in_stock_text }}{% endif %}
                </span>
              </div>

              {%- assign intro = product.metafields.custom.intro.value -%}
              {%- if intro != blank -%}
                <p class="max-w-prose text-[15px] leading-[1.7] text-ink-soft sm:text-base">{{ intro }}</p>
              {%- endif -%}
            </div>

          {%- when 'features' -%}
            {%- assign feats = product.metafields.custom.features.value -%}
            {%- if feats != blank and feats.size > 0 -%}
              <div {{ block.shopify_attributes }} class="border-t border-border-soft pt-6">
                <ul class="grid grid-cols-3 gap-x-3 gap-y-6">
                  {%- for key in feats -%}
                    {% render 'product-feature', key: key %}
                  {%- endfor -%}
                </ul>
              </div>
            {%- endif -%}

          {%- when 'specs' -%}
            {%- liquid
              assign size_note = product.metafields.custom.size_note.value
              assign materials = product.metafields.custom.materials.value
              assign dimensions = product.metafields.custom.dimensions.value
              assign sku = cv.sku
              assign has_specs = false
              if size_note != blank or materials != blank or dimensions != blank or product.type != blank or sku != blank
                assign has_specs = true
              endif
            -%}
            {%- if has_specs -%}
              <dl {{ block.shopify_attributes }} class="grid grid-cols-[6.5rem,1fr] sm:grid-cols-[7rem,1fr] gap-y-3 gap-x-5 text-sm border-t border-border-soft pt-6">
                {%- if product.type != blank -%}
                  <dt class="text-label text-stone pt-0.5">{{ block.settings.label_category }}</dt><dd class="text-ink leading-snug">{{ product.type }}</dd>
                {%- endif -%}
                {%- if size_note != blank -%}
                  <dt class="text-label text-stone pt-0.5">{{ block.settings.label_size }}</dt><dd class="text-ink leading-snug">{{ size_note }}</dd>
                {%- endif -%}
                {%- if materials != blank -%}
                  <dt class="text-label text-stone pt-0.5">{{ block.settings.label_material }}</dt><dd class="text-ink leading-snug">{{ materials }}</dd>
                {%- endif -%}
                {%- if dimensions != blank -%}
                  <dt class="text-label text-stone pt-0.5">{{ block.settings.label_dimensions }}</dt><dd class="text-ink leading-snug">{{ dimensions }}</dd>
                {%- endif -%}
                {%- if sku != blank -%}
                  <dt class="text-label text-stone pt-0.5">{{ block.settings.label_sku }}</dt><dd class="text-ink leading-snug tabular-nums" data-sku>{{ sku }}</dd>
                {%- endif -%}
              </dl>
            {%- endif -%}

          {%- when 'buy_buttons' -%}
            <div {{ block.shopify_attributes }} class="space-y-4 pt-2">
              <div data-product-form>
                {%- form 'product', product, class: 'space-y-6' -%}
                  <input type="hidden" name="id" value="{{ cv.id }}" data-variant-id>
                  {%- unless product.has_only_default_variant -%}
                    {%- for option in product.options_with_values -%}
                      {%- if option.values.size > 1 -%}
                        <div>
                          <h5 class="text-label text-stone mb-3">{{ option.name }}</h5>
                          <div class="flex flex-wrap gap-2">
                            {%- for value in option.values -%}
                              {%- assign is_sel = false -%}
                              {%- if option.selected_value == value -%}{%- assign is_sel = true -%}{%- endif -%}
                              <button type="button" data-option-button data-option-position="{{ option.position }}" data-value="{{ value | escape }}" data-selected="{% if is_sel %}true{% else %}false{% endif %}" data-available="true" class="inline-flex items-center gap-2 px-4 h-10 text-sm transition-colors border {% if is_sel %}border-ink text-ink bg-cream{% else %}border-border-soft text-ink-soft hover:border-stone hover:text-ink{% endif %}">
                                {%- if value.swatch.color or value.swatch.image -%}
                                  <span aria-hidden="true" class="block h-4 w-4 rounded-full border border-border-soft" style="background-color: {{ value.swatch.color | default: 'transparent' }};">
                                    {%- if value.swatch.image -%}{{ value.swatch.image | image_url: width: 32 | image_tag: alt: '', class: 'h-full w-full rounded-full object-cover' }}{%- endif -%}
                                  </span>
                                {%- endif -%}
                                <span>{{ value }}</span>
                              </button>
                            {%- endfor -%}
                          </div>
                        </div>
                      {%- endif -%}
                    {%- endfor -%}
                  {%- endunless -%}

                  <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div class="inline-flex items-center justify-between h-14 border border-border-soft bg-surface select-none w-full sm:w-[9rem] shrink-0" role="group" aria-label="Aantal">
                      <button type="button" data-qty-dec aria-label="Aantal verlagen" class="h-full w-12 grid place-items-center text-ink-soft hover:text-clay transition-colors focus-visible:outline-none focus-visible:text-clay">{% render 'icon', name: 'minus', size: 15 %}</button>
                      <span aria-live="polite" data-qty-value class="font-display text-[15px] tabular-nums text-ink">1</span>
                      <input type="hidden" name="quantity" value="1" data-qty-input>
                      <button type="button" data-qty-inc aria-label="Aantal verhogen" class="h-full w-12 grid place-items-center text-ink-soft hover:text-clay transition-colors focus-visible:outline-none focus-visible:text-clay">{% render 'icon', name: 'plus', size: 15 %}</button>
                    </div>
                    <div class="flex flex-1 gap-3 min-w-0">
                      <div id="product-add-to-cart" class="flex-1 min-w-0">
                        <button type="submit" data-add-button {% if is_sold %}disabled{% endif %} class="group/btn relative w-full h-14 bg-ink text-white hover:bg-clay transition-colors font-medium tracking-[0.18em] text-[12px] uppercase disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 inline-flex items-center justify-center gap-3">{% if is_sold %}{{ block.settings.sold_label }}{% else %}{{ block.settings.add_label }}{% endif %}</button>
                      </div>
                      {%- if block.settings.show_wishlist -%}
                        <button type="button" data-wishlist aria-pressed="false" aria-label="Bewaar voor later" class="h-14 w-14 shrink-0 grid place-items-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 border-border-soft text-ink-soft hover:text-clay hover:border-clay/40">{% render 'icon', name: 'heart', size: 18 %}</button>
                      {%- endif -%}
                    </div>
                  </div>
                {%- endform -%}
              </div>

              {%- comment -%} Trust badges (folded into buy_buttons, as in Hydrogen) {%- endcomment -%}
              {%- if block.settings.show_trust -%}
                <div class="pt-1">
                  <ul class="grid grid-cols-3 gap-2.5">
                    <li class="flex flex-col items-center gap-2 rounded-xl border border-border-soft bg-surface px-2 py-4 text-center">{% render 'icon', name: 'lock', size: 20, class: 'text-clay' %}<span class="text-[11px] font-medium leading-tight text-ink-soft">{{ block.settings.trust_1 }}</span></li>
                    <li class="flex flex-col items-center gap-2 rounded-xl border border-border-soft bg-surface px-2 py-4 text-center">{% render 'icon', name: 'truck', size: 20, class: 'text-clay' %}<span class="text-[11px] font-medium leading-tight text-ink-soft">{{ block.settings.trust_2 }}</span></li>
                    <li class="flex flex-col items-center gap-2 rounded-xl border border-border-soft bg-surface px-2 py-4 text-center">{% render 'icon', name: 'package-check', size: 20, class: 'text-clay' %}<span class="text-[11px] font-medium leading-tight text-ink-soft">{{ block.settings.trust_3 }}</span></li>
                  </ul>
                  <div class="mt-3.5 flex items-center justify-center">{% render 'payment-icons', compact: true %}</div>
                </div>
              {%- endif -%}
            </div>

          {%- when 'description' -%}
            {%- if product.description != blank -%}
              <p {{ block.shopify_attributes }} class="max-w-prose text-[15px] leading-[1.75] text-ink-soft border-t border-border-soft pt-6">{{ product.description | strip_html }}</p>
            {%- endif -%}

          {%- when 'zayna_note' -%}
            {%- assign note = product.metafields.custom.zayna_note.value -%}
            {%- if note != blank -%}
              <figure {{ block.shopify_attributes }} class="max-w-2xl">
                <blockquote class="font-display italic text-2xl leading-snug text-ink-soft border-l-2 border-clay pl-6">&ldquo;{{ note }}&rdquo;</blockquote>
                <figcaption class="mt-4 pl-6 font-signature text-2xl text-ink">— {{ block.settings.signature }}</figcaption>
              </figure>
            {%- endif -%}

          {%- when 'care_shipping' -%}
            <div {{ block.shopify_attributes }} class="divide-y divide-border-soft border-y border-border-soft">
              {%- for i in (1..3) -%}
                {%- assign t_key = 'row' | append: i | append: '_title' -%}
                {%- assign b_key = 'row' | append: i | append: '_body' -%}
                {%- assign row_title = block.settings[t_key] -%}
                {%- assign row_body = block.settings[b_key] -%}
                {%- if row_title != blank -%}
                  {%- assign is_open = false -%}
                  {%- if block.settings.default_open == i -%}{%- assign is_open = true -%}{%- endif -%}
                  <details class="group/acc"{% if is_open %} open{% endif %}>
                    <summary class="w-full flex items-center justify-between py-5 text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span class="flex items-center gap-4">
                        <span class="text-[10px] uppercase tracking-[0.22em] text-stone tabular-nums">+</span>
                        <span class="font-display text-lg text-ink group-hover/acc:text-clay transition-colors">{{ row_title }}</span>
                      </span>
                      {% render 'icon', name: 'plus', size: 14, class: 'transition-transform duration-300 text-ink-soft group-open/acc:rotate-45' %}
                    </summary>
                    <div class="pb-6 pr-2 pl-9 text-[14px] text-ink-soft leading-[1.75] rich-text">{{ row_body }}</div>
                  </details>
                {%- endif -%}
              {%- endfor -%}
            </div>

        {%- endcase -%}
      {%- endfor -%}
    </div>
  </article>

  {%- comment -%} Mobile sticky add-to-cart bar {%- endcomment -%}
  {%- if cv -%}
    <div data-sticky-atc data-observe="product-add-to-cart" inert class="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-surface/95 backdrop-blur px-4 py-3 transition-transform duration-300 md:hidden translate-y-full">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate font-display text-sm text-ink">{{ product.title }}</p>
          <p class="text-price text-ink" data-sticky-price>{% if cv.price and cv.price > 0 %}{{ cv.price | money }}{% else %}{{ section.settings.price_on_request | default: 'Prijs op aanvraag' }}{% endif %}</p>
        </div>
        <form method="post" action="/cart/add" data-sticky-form class="w-1/2 shrink-0">
          <input type="hidden" name="id" value="{{ cv.id }}" data-variant-id>
          <button type="submit" data-add-button {% if is_sold %}disabled{% endif %} class="w-full h-14 bg-ink text-white hover:bg-clay transition-colors font-medium tracking-[0.18em] text-[12px] uppercase disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center">{% if is_sold %}Uitverkocht{% else %}In winkelmand{% endif %}</button>
        </form>
      </div>
    </div>
  {%- endif -%}

  {%- comment -%} Variant data + labels for product.js {%- endcomment -%}
  <script type="application/json" data-product-json>
    {
      "title": {{ product.title | json }},
      "labels": {
        "add": "In winkelmand", "sold": "Uitverkocht", "adding": "Toevoegen…",
        "added": "Toegevoegd aan winkelmand", "checkout": "Afrekenen",
        "cart_count": "Aantal artikelen", "in_stock": {{ 'Op voorraad — verzending binnen 1–3 werkdagen' | json }},
        "price_on_request": "Prijs op aanvraag"
      },
      "variants": [
        {%- for v in product.variants -%}
          {
            "id": {{ v.id }},
            "available": {{ v.available }},
            "price": {{ v.price }},
            "price_formatted": {{ v.price | money | json }},
            "compare_at_price": {{ v.compare_at_price | default: 0 }},
            "compare_at_formatted": {{ v.compare_at_price | money | json }},
            "options": {{ v.options | json }}
          }{%- unless forloop.last -%},{%- endunless -%}
        {%- endfor -%}
      ]
    }
  </script>
  <script src="{{ 'product.js' | asset_url }}" defer></script>
</section>

{% schema %}
{
  "name": "Product",
  "tag": "section",
  "settings": [
    { "type": "text", "id": "price_on_request", "label": "Sticky bar price-on-request text", "default": "Prijs op aanvraag" }
  ],
  "blocks": [
    { "type": "gallery", "name": "Gallery", "limit": 1, "settings": [] },
    {
      "type": "info", "name": "Title, price & intro", "limit": 1,
      "settings": [
        { "type": "checkbox", "id": "show_vendor", "label": "Show vendor", "default": true },
        { "type": "text", "id": "in_stock_text", "label": "In-stock text", "default": "Op voorraad — verzending binnen 1–3 werkdagen" },
        { "type": "text", "id": "sold_text", "label": "Sold text", "default": "Uitverkocht" },
        { "type": "text", "id": "price_on_request", "label": "Price-on-request text", "default": "Prijs op aanvraag" }
      ]
    },
    { "type": "features", "name": "Feature badges", "limit": 1, "settings": [] },
    {
      "type": "specs", "name": "Specifications", "limit": 1,
      "settings": [
        { "type": "text", "id": "label_category", "label": "Category label", "default": "Categorie" },
        { "type": "text", "id": "label_size", "label": "Size label", "default": "Maat" },
        { "type": "text", "id": "label_material", "label": "Material label", "default": "Materiaal" },
        { "type": "text", "id": "label_dimensions", "label": "Dimensions label", "default": "Afmetingen" },
        { "type": "text", "id": "label_sku", "label": "SKU label", "default": "Artikelnr." }
      ]
    },
    {
      "type": "buy_buttons", "name": "Buy buttons & trust", "limit": 1,
      "settings": [
        { "type": "text", "id": "add_label", "label": "Add to cart label", "default": "In winkelmand" },
        { "type": "text", "id": "sold_label", "label": "Sold label", "default": "Uitverkocht" },
        { "type": "checkbox", "id": "show_wishlist", "label": "Show wishlist button", "default": true },
        { "type": "header", "content": "Trust badges" },
        { "type": "checkbox", "id": "show_trust", "label": "Show trust badges", "default": true },
        { "type": "text", "id": "trust_1", "label": "Badge 1", "default": "Veilig betalen" },
        { "type": "text", "id": "trust_2", "label": "Badge 2", "default": "Verzending 1–3 werkdagen" },
        { "type": "text", "id": "trust_3", "label": "Badge 3", "default": "Zorgvuldig verpakt vanuit NL" }
      ]
    },
    { "type": "description", "name": "Description", "limit": 1, "settings": [] },
    {
      "type": "zayna_note", "name": "Zayna note", "limit": 1,
      "settings": [ { "type": "text", "id": "signature", "label": "Signature", "default": "Zayna" } ]
    },
    {
      "type": "care_shipping", "name": "Care & shipping", "limit": 1,
      "settings": [
        { "type": "range", "id": "default_open", "label": "Open row by default", "min": 0, "max": 3, "step": 1, "default": 1 },
        { "type": "text", "id": "row1_title", "label": "Row 1 title", "default": "Onderhoud" },
        { "type": "richtext", "id": "row1_body", "label": "Row 1 body", "default": "<p>Glaswerk en keukentools zijn vaatwasserbestendig tenzij anders vermeld. Was textiel volgens het waslabel. Handwas wordt aanbevolen voor het beste resultaat op de lange termijn.</p>" },
        { "type": "text", "id": "row2_title", "label": "Row 2 title", "default": "Verzending" },
        { "type": "richtext", "id": "row2_body", "label": "Row 2 body", "default": "<p>Wij verzenden binnen 1–3 werkdagen vanuit Nederland. Levering in NL 1–2 werkdagen, België 2–3 werkdagen, EU 3–5 werkdagen. Glaswerk wordt zorgvuldig verpakt met beschermingsmateriaal.</p>" },
        { "type": "text", "id": "row3_title", "label": "Row 3 title", "default": "Retourneren" },
        { "type": "richtext", "id": "row3_body", "label": "Row 3 body", "default": "<p>Niet tevreden? Je kunt je bestelling binnen 14 dagen na ontvangst retourneren, mits het product ongebruikt en in originele verpakking is. Beschadigd ontvangen? Stuur binnen 48 uur een foto naar info@zaynahome.nl.</p>" }
      ]
    }
  ]
}
{% endschema %}
```

> Note on `default_open`: Hydrogen opens the first accordion row (`defaultOpenIndex={0}`). The range setting is 1-based (1 = first row open); `0` = none open. Default `1` reproduces Hydrogen.
> Note on the sticky form: it POSTs natively to `/cart/add` as a no-JS fallback. With `product.js` loaded, the sticky `[data-add-button]` is inside `[data-product-root]`; the AJAX handler is bound to the main `[data-product-form] form` only, so the sticky bar's own `<form>` is enhanced separately — add a one-line binding in product.js section 3 (see Step 2).

- [ ] **Step 2: Wire the sticky form to AJAX in `assets/product.js`**

In `assets/product.js`, inside the `[data-product-root]` loop (section 3, right after the main `form.addEventListener('submit', …)` block closes), append a handler for the sticky form so the mobile bar also adds via AJAX and opens the drawer:

```js
    const stickyForm = root.querySelector('[data-sticky-form]');
    if (stickyForm) {
      stickyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // keep the sticky variant id in sync with the main selection
        const sid = root.querySelector('[data-sticky-form] [data-variant-id]');
        if (sid && idInput) sid.value = idInput.value;
        try {
          const res = await fetch('/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(stickyForm) });
          if (!res.ok) throw new Error('add failed');
          await refreshCart(pdata.title);
          openCartDrawer();
        } catch (err) { console.error(err); }
      });
    }
```

- [ ] **Step 3: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/main-product.liquid assets/product.js assets/tailwind.css
git commit -m "feat(product): main-product section (blocks + variants + sticky atc)"
```
Expected: build 0; no new errors.

---

### Task 7: `product.json` template

New file (not editor-managed). Order: `main-product` → `product-faq` → `related-products` (FAQ above related, per client). `block_order` reproduces the Hydrogen right-column order.

**Files:**
- Create: `templates/product.json`

- [ ] **Step 1: Create `templates/product.json`**

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "gallery": { "type": "gallery", "settings": {} },
        "info": { "type": "info", "settings": {} },
        "features": { "type": "features", "settings": {} },
        "specs": { "type": "specs", "settings": {} },
        "buy_buttons": { "type": "buy_buttons", "settings": {} },
        "description": { "type": "description", "settings": {} },
        "zayna_note": { "type": "zayna_note", "settings": {} },
        "care_shipping": { "type": "care_shipping", "settings": {} }
      },
      "block_order": ["gallery", "info", "features", "specs", "buy_buttons", "description", "zayna_note", "care_shipping"],
      "settings": {}
    },
    "product-faq": { "type": "product-faq", "settings": {} },
    "related": { "type": "related-products", "settings": {} }
  },
  "order": ["main", "product-faq", "related"]
}
```

- [ ] **Step 2: Validate JSON + build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && node -e "JSON.parse(require('fs').readFileSync('templates/product.json')); console.log('valid')" && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add templates/product.json assets/tailwind.css
git commit -m "feat(product): product.json template (main-product, faq, related)"
```
Expected: JSON valid; build 0; no new errors.

---

### Task 8: Live preview parity (controller-run)

Run by the controlling session, not a subagent. User runs `shopify theme dev --store zaynahome-store.myshopify.com`; drive `http://127.0.0.1:9292` with Playwright MCP against the live Hydrogen product page.

- [ ] Open a product with multiple images + variants. Verify, **measuring with `browser_evaluate` (not eyeballing)**:
  - **Layout:** two-column on desktop (gallery sticky on scroll), single column on mobile. Compare `getBoundingClientRect` of gallery vs. info column.
  - **Gallery desktop:** thumbnail click swaps main image (`data-gallery-main-img` `src` changes); main click opens lightbox (`[data-gallery-lightbox]` loses `hidden`); arrows + ←/→ keys + dots change slide; Esc closes; body `overflow` is `hidden` while open.
  - **Gallery mobile (resize to 390px):** swipe carousel scrolls; counter + dots update on scroll; tap opens lightbox; double-tap zoom + pinch path (simulate via `browser_evaluate` reading `[data-zoom-target]` transform after dispatching pointer events) — confirm `scale` > 1 after double-tap.
  - **Variants:** clicking an option pill updates `[data-variant-id]`, the `[data-price]` text, availability text/dot, and the URL `?variant=`. A sold-out variant disables `[data-add-button]` and sets label `Uitverkocht`.
  - **Add to cart:** click adds (network POST `/cart/add.js` 200), `[data-cart-count]` increments and un-hides, the cart drawer opens (`.overlay[data-aside="cart"]` gains `expanded`) with the confirmation stub + `Afrekenen` link.
  - **Sticky bar (mobile):** scroll past the main button → `[data-sticky-atc]` slides up (`translate-y-0`); opening any drawer hides it; its add button works.
  - **Features/specs/zayna/care/faq:** feature badges match `custom.features`; specs rows match metafields; zayna note shows `custom.zayna_note`; care-shipping accordion opens/closes (row 1 open by default); FAQ band renders `custom.faqs` **above** related products.
  - **Related products:** `[data-related-products]` populates via the recommendations fetch (4 cards) or stays empty if none.
- [ ] Note any drift for fix; re-run after fixes. Record merchant-config notes (none required — product page is fully metafield/variant-driven).

---

## Definition of done (Milestone 4)
- `npm run build:css` exits 0; `npx shopify theme check` shows 0 ERRORS (≤3 known false-positive warnings).
- `templates/product.json` renders `main-product` → `product-faq` → `related-products`.
- Gallery: mobile carousel, desktop main+thumbnails, lightbox with arrows/keys/dots and pinch/pan/double-tap zoom (1:1 with `ProductGallery.tsx`).
- Variant selection updates price/availability/URL/add button; single-value options hidden.
- AJAX add posts to `/cart/add.js`, updates `[data-cart-count]`, opens the cart drawer with a confirmation stub (full drawer = M6).
- Sticky mobile add-to-cart bar appears on scroll, hides behind drawers, and adds.
- Features, specs, description, zayna-note, care-shipping, trust-badges all render from settings/metafields and reproduce the live page.
- Committed on `feat/milestone-4-product`.

## Self-review notes (spec coverage)
- Spec `main-product` blocks gallery/info/price/buy-buttons/features/faq/care-shipping/trust-badges/zayna-note/sticky-atc all covered: price→folded into `info`; trust-badges→folded into `buy_buttons` (Hydrogen-faithful); faq→own section above related; sticky-atc→section-level element; plus added `specs` + `description` blocks (Hydrogen ProductInfo content). ✅
- related-products section + product-card reuse. ✅
- product.json template. ✅
- Metafields: condition, intro, features, zayna_note, size_note, materials, dimensions, faqs all read. ✅
- No `| filter` inside `image_tag` named args (alts precomputed to vars). ✅
- No defaults on `image_picker`/`collection`/etc. (none used). ✅

## Hand-off to Milestone 5 (Collection)
Builds `collection-hero`, `category-pills`, faceted `main-collection` (Storefront `filter.*`), pagination + infinite scroll, reusing `snippets/product-card.liquid` and the section/JSON-template + locale conventions established here.
```