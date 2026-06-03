# Milestone 5 — Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Zayna Home collection page as editable OS 2.0 sections — `collection-hero` → `category-pills` → faceted `main-collection` (sort + native Shopify storefront filters + infinite scroll) — wired through `templates/collection.json`, serving both named collections and the `/collections/all` catalog, reproducing the live Hydrogen collection page 1:1 in look and content.

**Architecture:** `templates/collection.json` composes three sections. `collection-hero` ports `CollectionHero.tsx` (eyebrow, italic-period title, intro, meta grid) and auto-switches its copy when `collection.handle == 'all'`. `category-pills` ports `CategoryPills.tsx` (a menu-driven pill row: wrapped on desktop, an edge-faded horizontal scroller on mobile). `main-collection` ports the Hydrogen `FilterBar.tsx` sort dropdown **and adds** native Shopify storefront filters (`collection.filters`, `?filter.*` params) in a drawer reusing `snippets/aside.liquid`, the product grid via `snippets/product-card.liquid`, empty states, and the Hydrogen `InfiniteResourceSection.tsx` auto-loading "Show more" pattern. A per-template `assets/collection.js` carries the collection-only controllers (pill scroller fades, sort change, filter apply, infinite scroll) and uses the **Section Rendering API** (`?section_id=`) for no-reload sort/filter/pagination, matching Hydrogen's SPA feel. Filters fall back to plain GET form submission without JS.

**Tech Stack:** Liquid (OS 2.0 sections + JSON template, `{% paginate %}`, `collection.filters`, `collection.sort_by`, Section Rendering API), Tailwind v4 (existing `@theme` tokens), vanilla JS (`fetch` + `DOMParser` + `IntersectionObserver`).

**Plan series context:** Plan 5 of 10. Builds on Milestones 1–4. Reuses `@theme` tokens, `snippets/product-card.liquid` (object-contain image, condition/bestseller/Nieuw badges, sold overlay, price), `snippets/icon.liquid` (lucide inline SVGs; `x` and `chevron-left/right` already exist), and `snippets/aside.liquid` + the generic drawer controller in `assets/theme.js` (opens via `[data-aside-open="<type>"]`, closes via `[data-aside-close]` / backdrop / Escape, dispatches `aside:open` / `aside:close`). Work on branch `feat/milestone-5-collection`.

**Verification model:** No unit runner. Each task: `npm run build:css` (exit 0) + `npx shopify theme check` (0 ERRORS; the 3 pre-existing false-positive warnings may remain). Run all commands from `/Users/altugsogutoglu/Herd/zayna-theme`. Final task drives the live preview at `http://127.0.0.1:9292` with Playwright MCP and measures (no eyeballing).

---

## Source-of-truth content (extracted from the Hydrogen app)

Read these for exact 1:1 markup/content; do not import any React:
- `zayna-home/app/components/collection/CollectionHero.tsx` — hero structure, punctuation treatment, meta grid.
- `zayna-home/app/components/collection/CategoryPills.tsx` — pill row, desktop wrap vs mobile scroller + edge fades, active state.
- `zayna-home/app/components/collection/FilterBar.tsx` — sticky bar, product count, sort dropdown + `SORT_OPTIONS`.
- `zayna-home/app/components/InfiniteResourceSection.tsx` — auto-load on scroll + "Show more" fallback link, divider line.
- `zayna-home/app/routes/($locale).collections.$handle.tsx` and `($locale).collections.all.tsx` — page composition, eyebrow/title/intro/meta copy, empty states, grid classes, eager-image counts.

**Decisions locked with the user (2026-06-04):**
1. **Sort + native Shopify storefront filters.** Hydrogen's `FilterBar` is sort-only; the user chose to *add* native Shopify facets (`collection.filters`) on top. The filter UI has no Hydrogen source — it is designed here to match the Zayna FilterBar aesthetic and reuses the existing drawer shell.
2. **Scope = `templates/collection.json` only**, serving both named collections and `/collections/all` (same template in Liquid). The collections-directory page (`list-collections`) is deferred to a later milestone.

**Exact Dutch copy (verbatim from Hydrogen):**
- Named collection: eyebrow `Collectie`; title = `collection.title`; intro = `collection.description` (fallback editable); meta `Voorraad` / `Op voorraad`, `Verzending` / `Vanuit NL · 1–3 dagen`, `Retour` / `14 dagen retourrecht`; empty `Deze collectie wordt aangevuld.` + `Bekijk de complete collectie of kom snel terug.`
- `/collections/all`: eyebrow `De collectie`; title `Alle producten.`; intro `Bekijk de complete collectie van Zayna Home — stijlvolle keuken- en woonproducten, geselecteerd op design, kwaliteit en functie.`; empty `De collectie wordt aangevuld.` + `Kom snel terug — nieuwe producten zijn onderweg.`
- Sort options: `Nieuwste eerst`, `Prijs · laag naar hoog`, `Prijs · hoog naar laag`.
- Pills aria: `Bladeren per categorie`; first pill label `Alle`.
- Desktop breadcrumb: left `{{ shop.name }} · Collectie`, right `Vanuit Nederland`.
- SEO band aria: `Over deze collectie`; source `collection.metafields.custom.seo_text.value` (whitespace preserved).

**Sort key mapping (Hydrogen label → Shopify `sort_by`):** `Nieuwste eerst` → `created-descending`; `Prijs · laag naar hoog` → `price-ascending`; `Prijs · hoog naar laag` → `price-descending`. Shopify applies `?sort_by=` to `collection.products` automatically inside `{% paginate %}`.

**Grid classes (verbatim):** `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12 md:gap-x-7 md:gap-y-14 lg:gap-x-8 lg:gap-y-16`. First 8 products `loading: 'eager'`, rest `lazy`.

**IMPORTANT Shopify gotchas (carried from M1–M4):**
- `url`-type settings cannot have a default — use `type: "text"` for any URL default. `collection`/`collection_list`/`blog`/`image_picker`/`page` settings take no default. `link_list` MAY take a default but this plan leaves it unset (merchant assigns the categories menu).
- NEVER put a `| filter` inside `image_tag` (or any filter) named args — Liquid parses it as a separate filter and silently drops later args. Precompute into a variable first (`assign x = ... | default: ...`), then pass `alt: x`.
- Do NOT hand-edit editor-managed files (`templates/index.json`, `sections/header-group.json`, `sections/footer-group.json`). `templates/collection.json` is NEW and created here — that is fine. `layout/theme.liquid` is NOT touched (the filter drawer is rendered section-local).
- After any markup class change run `npm run build:css` and commit `assets/tailwind.css`.
- Section content uses Dutch defaults editable in the theme editor; aria-labels stay inline Dutch (matches the M4 gallery snippet). No locale-file edits are required this milestone.

**Storefront filters prerequisite (note for the checkpoint, not a code step):** native facets only render when the merchant has enabled filters in **Shopify admin → Online Store → Search & Discovery → Filters**. When none are configured, `collection.filters` is empty: the "Filteren" button and drawer auto-hide, and the page degrades to sort-only (still a faithful Hydrogen match). Confirm at least one filter (e.g. Price, Availability) is enabled before the Playwright parity pass.

---

### Task 1: Branch + icons + category pills

Ports `CategoryPills.tsx`. A `category-pill` snippet renders one pill (active = `bg-ink text-surface`, inactive = bordered with hover). The `category-pills` section renders the `Alle` pill plus links from a chosen menu, twice: a wrapped desktop `<ul>` and a mobile horizontal scroller with gradient edge fades (behavior wired in Task 2). Hidden entirely when there is only the `Alle` pill (matches Hydrogen returning `null` for ≤1 pill). Also adds the three new icons used later by `main-collection`.

**Files:**
- Create: `snippets/category-pill.liquid`
- Create: `sections/category-pills.liquid`
- Modify: `snippets/icon.liquid` (add `sliders`, `chevron-down`, `check`)

- [ ] **Step 1: Create branch**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && git pull --rebase origin main && git checkout -b feat/milestone-5-collection && git branch --show-current
```
Expected: `feat/milestone-5-collection`.

- [ ] **Step 2: Create `snippets/category-pill.liquid`**

```liquid
{%- comment -%}
  One category pill link. Ported 1:1 from app/components/collection/CategoryPills.tsx (PillLink).
  Usage: {% render 'category-pill', label: label, url: url, active: active %}
{%- endcomment -%}
{%- if active -%}
  <a href="{{ url }}" aria-current="true" class="inline-flex items-center whitespace-nowrap rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 bg-ink text-surface">{{ label }}</a>
{%- else -%}
  <a href="{{ url }}" aria-current="false" class="inline-flex items-center whitespace-nowrap rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 border border-border-soft text-ink-soft hover:border-ink hover:text-ink">{{ label }}</a>
{%- endif -%}
```

- [ ] **Step 3: Create `sections/category-pills.liquid`**

```liquid
{%- comment -%}
  Category pills. Ported 1:1 from app/components/collection/CategoryPills.tsx.
  "Alle" pill + links from the chosen menu (collections). Mobile edge-fades wired by assets/collection.js.
  Hidden when only the "Alle" pill exists (Hydrogen renders null for <=1 pill).
{%- endcomment -%}
{%- liquid
  assign menu = section.settings.menu
  assign pill_count = 1
  if menu != blank
    assign pill_count = menu.links.size | plus: 1
  endif

  assign all_active = false
  if collection.handle == 'all' or request.path == routes.all_products_collection_url or request.path == '/collections'
    assign all_active = true
  endif
-%}
{%- if pill_count > 1 -%}
  <nav aria-label="Bladeren per categorie" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 mb-8">
    {%- comment -%} Desktop: wrapped {%- endcomment -%}
    <ul class="hidden flex-wrap items-center gap-2 sm:gap-3 md:flex">
      <li>{% render 'category-pill', label: 'Alle', url: routes.all_products_collection_url, active: all_active %}</li>
      {%- for link in menu.links -%}
        {%- assign is_active = false -%}
        {%- if link.url == collection.url -%}{%- assign is_active = true -%}{%- endif -%}
        <li>{% render 'category-pill', label: link.title, url: link.url, active: is_active %}</li>
      {%- endfor -%}
    </ul>
    {%- comment -%} Mobile: horizontal scroller with edge fades {%- endcomment -%}
    <div data-pills-scroller class="relative -mx-4 sm:-mx-6 md:hidden">
      <span data-pills-fade="left" class="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-bg to-transparent transition-opacity duration-300 opacity-0 sm:w-12"></span>
      <span data-pills-fade="right" class="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg to-transparent transition-opacity duration-300 sm:w-12"></span>
      <div data-pills-track class="no-scrollbar overflow-x-auto px-4 sm:px-6">
        <ul class="flex items-center gap-2 py-1 sm:gap-3">
          <li class="shrink-0">{% render 'category-pill', label: 'Alle', url: routes.all_products_collection_url, active: all_active %}</li>
          {%- for link in menu.links -%}
            {%- assign is_active = false -%}
            {%- if link.url == collection.url -%}{%- assign is_active = true -%}{%- endif -%}
            <li class="shrink-0">{% render 'category-pill', label: link.title, url: link.url, active: is_active %}</li>
          {%- endfor -%}
        </ul>
      </div>
    </div>
  </nav>
{%- endif -%}

{% schema %}
{
  "name": "Category pills",
  "tag": "section",
  "settings": [
    { "type": "link_list", "id": "menu", "label": "Categories menu", "info": "A menu of collection links. The 'Alle' pill is added automatically. The row hides if the menu is empty." }
  ],
  "presets": [{ "name": "Category pills" }]
}
{% endschema %}
```

- [ ] **Step 4: Add the new icons to `snippets/icon.liquid`**

Add these `when` cases before the final `{%- endcase -%}` in `snippets/icon.liquid` (lucide paths):

```liquid
    {%- when 'sliders' -%}
      <line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>
    {%- when 'chevron-down' -%}
      <path d="m6 9 6 6 6-6"/>
    {%- when 'check' -%}
      <path d="M20 6 9 17l-5-5"/>
```

- [ ] **Step 5: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add snippets/category-pill.liquid sections/category-pills.liquid snippets/icon.liquid assets/tailwind.css
git commit -m "feat(collection): category-pills section + pill snippet + sliders/chevron-down/check icons"
```
Expected: build exits 0; theme check shows no new errors.

---

### Task 2: `assets/collection.js` — collection-page controllers

The collection-only controllers, loaded once from `main-collection`. Four concerns: (1) mobile pill scroller edge-fades + scroll-active-into-view (port of the Embla fade behavior), (2) sort `<select>` change, (3) filter form apply + active-pill removal + clear-all, (4) infinite scroll (port of `InfiniteResourceSection.tsx`). Sort/filter/clear replace the whole section via the Section Rendering API; infinite scroll appends the next page's cards and swaps the sentinel. Idempotent via a global guard.

**Files:**
- Create: `assets/collection.js`

- [ ] **Step 1: Create `assets/collection.js`**

```js
// Zayna Home — collection page controllers. Loaded once per collection page from main-collection.
(() => {
  'use strict';
  if (window.__zhCollectionInit) return;
  window.__zhCollectionInit = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* 1. Category pills: mobile scroller edge-fades + active into view */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-pills-scroller]').forEach((scroller) => {
    const track = scroller.querySelector('[data-pills-track]');
    const fadeL = scroller.querySelector('[data-pills-fade="left"]');
    const fadeR = scroller.querySelector('[data-pills-fade="right"]');
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const x = track.scrollLeft;
      if (fadeL) fadeL.style.opacity = x > 4 ? '1' : '0';
      if (fadeR) fadeR.style.opacity = x < max - 4 ? '1' : '0';
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    const active = track.querySelector('[aria-current="true"]');
    if (active) {
      const offset = active.offsetLeft - (track.clientWidth - active.clientWidth) / 2;
      track.scrollLeft = Math.max(0, offset);
    }
  });

  /* ---------------------------------------------------------------- */
  /* 2-4. Faceted grid controllers                                    */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-collection]').forEach((root) => {
    const sectionId = root.getAttribute('data-section-id');
    const baseUrl = root.getAttribute('data-collection-url');
    if (!sectionId || !baseUrl) return;
    let busy = false;

    const fetchSection = async (search) => {
      const url = baseUrl + '?' + search + (search ? '&' : '') + 'section_id=' + encodeURIComponent(sectionId);
      const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error('section fetch failed: ' + res.status);
      return res.text();
    };

    // Whole-section replace (sort / filter apply / clear / remove a pill)
    const replaceSection = async (params) => {
      if (busy) return;
      busy = true;
      params.delete('page');
      const search = params.toString();
      root.setAttribute('aria-busy', 'true');
      try {
        const html = await fetchSection(search);
        const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-collection]');
        if (fresh) root.innerHTML = fresh.innerHTML;
        window.history.pushState({}, '', baseUrl + (search ? '?' + search : ''));
        bind();
        if (!reduce) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        console.error(e);
        window.location.search = search; // hard fallback
      } finally {
        busy = false;
        root.removeAttribute('aria-busy');
      }
    };

    const currentParams = () => new URLSearchParams(window.location.search);

    const closeFilters = () => {
      // The drawer controller in theme.js toggles the `expanded` class on the overlay.
      const open = document.querySelector('.overlay[data-aside="filters"].expanded');
      const close = open && open.querySelector('[data-aside-close]');
      if (close) close.click();
    };

    // Infinite scroll: append next page, swap sentinel
    const bindInfinite = () => {
      const sentinel = root.querySelector('[data-load-more]');
      if (!sentinel) return;
      const link = sentinel.querySelector('[data-load-more-link]');
      if (!link) return;

      const loadNext = async () => {
        if (busy) return;
        busy = true;
        sentinel.setAttribute('aria-busy', 'true');
        const textEl = link.querySelector('[data-load-more-text]');
        const loadingLabel = link.getAttribute('data-loading-label');
        if (textEl && loadingLabel) textEl.textContent = loadingLabel;
        try {
          const href = link.getAttribute('href') || '';
          const qs = (href.split('?')[1] || '') + '&section_id=' + encodeURIComponent(sectionId);
          const res = await fetch(baseUrl + '?' + qs, { headers: { 'X-Requested-With': 'fetch' } });
          const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
          const freshGrid = doc.querySelector('[data-product-grid]');
          const grid = root.querySelector('[data-product-grid]');
          if (freshGrid && grid) {
            while (freshGrid.firstElementChild) grid.appendChild(freshGrid.firstElementChild);
          }
          const freshSentinel = doc.querySelector('[data-load-more]');
          if (freshSentinel) {
            sentinel.replaceWith(freshSentinel);
          } else {
            sentinel.remove();
          }
          window.history.replaceState({}, '', href);
        } catch (e) {
          console.error(e);
          if (textEl) textEl.textContent = link.getAttribute('data-retry-label') || 'Opnieuw proberen';
        } finally {
          busy = false;
          bindInfinite(); // (re)observe the swapped-in sentinel
        }
      };

      link.addEventListener('click', (e) => { e.preventDefault(); loadNext(); });
      if ('IntersectionObserver' in window && !reduce) {
        const io = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) loadNext();
        }, { rootMargin: '600px 0px 600px 0px' });
        io.observe(sentinel);
      }
    };

    // (Re)attach listeners to controls inside the (possibly replaced) section
    function bind() {
      const sort = root.querySelector('[data-sort-select]');
      if (sort) sort.addEventListener('change', () => {
        const p = currentParams();
        p.set('sort_by', sort.value);
        replaceSection(p);
      });

      const form = root.querySelector('[data-filter-form]');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = new URLSearchParams(new FormData(form));
        const cur = currentParams();
        if (!p.has('sort_by') && cur.get('sort_by')) p.set('sort_by', cur.get('sort_by'));
        for (const [k, v] of Array.from(p.entries())) if (v === '') p.delete(k);
        replaceSection(p);
        closeFilters();
      });

      root.querySelectorAll('[data-filter-clear]').forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        const cur = currentParams();
        if (cur.get('sort_by')) p.set('sort_by', cur.get('sort_by'));
        replaceSection(p);
        closeFilters();
      }));

      root.querySelectorAll('[data-filter-remove]').forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        const qs = (a.getAttribute('href') || '').split('?')[1] || '';
        replaceSection(new URLSearchParams(qs));
      }));

      bindInfinite();
    }

    bind();
  });
})();
```

- [ ] **Step 2: Commit (no CSS change; classes appear in later tasks)**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add assets/collection.js
git commit -m "feat(collection): collection.js (pill fades, sort, filters, infinite scroll)"
```
Expected: no new errors.

---

### Task 3: `sections/collection-hero.liquid`

Ports `CollectionHero.tsx`: desktop breadcrumb row, eyebrow with trailing rule, the `font-display clamp` title with its **trailing-period-in-italic-clay** treatment, intro paragraph, and the optional 3-item meta grid. Auto-switches eyebrow/title/intro to the `/collections/all` copy when `collection.handle == 'all'`. All copy is editable; settings override the Hydrogen defaults.

**Files:**
- Create: `sections/collection-hero.liquid`

- [ ] **Step 1: Create `sections/collection-hero.liquid`**

```liquid
{%- comment -%}
  Collection hero. Ported 1:1 from app/components/collection/CollectionHero.tsx.
  Trailing period in the title renders italic clay (Hydrogen punctuation treatment).
  When collection.handle == 'all', uses the all-products copy.
{%- endcomment -%}
{%- liquid
  assign is_all = false
  if collection.handle == 'all'
    assign is_all = true
  endif

  assign eyebrow = section.settings.eyebrow
  if eyebrow == blank
    assign eyebrow = 'Collectie'
  endif
  if is_all and section.settings.all_eyebrow != blank
    assign eyebrow = section.settings.all_eyebrow
  endif

  assign hero_title = collection.title
  if is_all and section.settings.all_title != blank
    assign hero_title = section.settings.all_title
  endif

  assign intro = collection.description
  if intro == blank
    assign intro = section.settings.intro_fallback
  endif
  if is_all and section.settings.all_intro != blank
    assign intro = section.settings.all_intro
  endif

  assign last_char = hero_title | slice: -1
  assign title_main = hero_title
  assign trailing = ''
  if last_char == '.'
    assign cut = hero_title.size | minus: 1
    assign title_main = hero_title | slice: 0, cut
    assign trailing = '.'
  endif
-%}
<header class="relative isolate mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-6 pb-10 sm:pt-10 sm:pb-14 md:pt-16 md:pb-20">
  <div class="mb-10 hidden items-center justify-between text-[10px] uppercase tracking-[0.22em] text-stone md:flex">
    <span class="flex items-center gap-3">
      {{ shop.name }}
      <span class="block h-px w-10 bg-stone-soft"></span>
      <span class="font-display italic normal-case tracking-normal text-stone">{{ section.settings.breadcrumb_label | default: 'Collectie' }}</span>
    </span>
    <span>{{ section.settings.breadcrumb_right | default: 'Vanuit Nederland' }}</span>
  </div>

  <p class="text-label text-clay mb-4 flex items-center gap-3 sm:mb-5">
    {{ eyebrow }}
    <span class="block h-px w-10 bg-clay/60 sm:w-12"></span>
  </p>

  <h1 class="font-display text-[clamp(2.25rem,7.5vw,4.75rem)] leading-[1.02] tracking-[-0.025em] text-ink">{{ title_main }}{%- if trailing != '' -%}<span class="italic text-clay/80">{{ trailing }}</span>{%- endif -%}</h1>

  {%- if intro != blank -%}
    <p class="mt-6 max-w-2xl text-[15px] leading-[1.7] text-ink-soft sm:mt-7 md:text-base">{{ intro }}</p>
  {%- endif -%}

  {%- if section.settings.show_meta -%}
    <dl class="mt-8 grid grid-cols-3 gap-x-4 border-t border-border-soft pt-6 sm:mt-10 sm:gap-x-10 sm:pt-7 md:gap-x-14">
      <div class="flex flex-col gap-1.5">
        <dt class="text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ section.settings.meta_label_1 }}</dt>
        <dd class="font-display text-[15px] normal-case tracking-normal text-ink sm:text-base">{{ section.settings.meta_value_1 }}</dd>
      </div>
      <div class="flex flex-col gap-1.5">
        <dt class="text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ section.settings.meta_label_2 }}</dt>
        <dd class="font-display text-[15px] normal-case tracking-normal text-ink sm:text-base">{{ section.settings.meta_value_2 }}</dd>
      </div>
      <div class="flex flex-col gap-1.5">
        <dt class="text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ section.settings.meta_label_3 }}</dt>
        <dd class="font-display text-[15px] normal-case tracking-normal text-ink sm:text-base">{{ section.settings.meta_value_3 }}</dd>
      </div>
    </dl>
  {%- endif -%}
</header>

{% schema %}
{
  "name": "Collection hero",
  "tag": "section",
  "settings": [
    { "type": "header", "content": "Breadcrumb (desktop)" },
    { "type": "text", "id": "breadcrumb_label", "label": "Breadcrumb label", "default": "Collectie" },
    { "type": "text", "id": "breadcrumb_right", "label": "Breadcrumb right", "default": "Vanuit Nederland" },
    { "type": "header", "content": "Copy" },
    { "type": "text", "id": "eyebrow", "label": "Eyebrow (named collections)", "default": "Collectie" },
    { "type": "textarea", "id": "intro_fallback", "label": "Intro fallback", "info": "Used when a collection has no description.", "default": "Geselecteerd op design, kwaliteit en functie." },
    { "type": "header", "content": "All-products page (/collections/all)" },
    { "type": "text", "id": "all_eyebrow", "label": "Eyebrow", "default": "De collectie" },
    { "type": "text", "id": "all_title", "label": "Title", "default": "Alle producten." },
    { "type": "textarea", "id": "all_intro", "label": "Intro", "default": "Bekijk de complete collectie van Zayna Home — stijlvolle keuken- en woonproducten, geselecteerd op design, kwaliteit en functie." },
    { "type": "header", "content": "Meta grid" },
    { "type": "checkbox", "id": "show_meta", "label": "Show meta grid", "default": true },
    { "type": "text", "id": "meta_label_1", "label": "Meta 1 label", "default": "Voorraad" },
    { "type": "text", "id": "meta_value_1", "label": "Meta 1 value", "default": "Op voorraad" },
    { "type": "text", "id": "meta_label_2", "label": "Meta 2 label", "default": "Verzending" },
    { "type": "text", "id": "meta_value_2", "label": "Meta 2 value", "default": "Vanuit NL · 1–3 dagen" },
    { "type": "text", "id": "meta_label_3", "label": "Meta 3 label", "default": "Retour" },
    { "type": "text", "id": "meta_value_3", "label": "Meta 3 value", "default": "14 dagen retourrecht" }
  ],
  "presets": [{ "name": "Collection hero" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/collection-hero.liquid assets/tailwind.css
git commit -m "feat(collection): collection-hero section (eyebrow, italic-period title, meta grid)"
```
Expected: build exits 0; no new errors.

---

### Task 4: `sections/main-collection.liquid`

The faceted grid. Ports `FilterBar.tsx` (sticky bar: product count + sort dropdown) and **adds** native Shopify storefront filters (`collection.filters`) in a drawer (reusing `snippets/aside.liquid`), an active-filter pill row + clear-all, the product grid via `snippets/product-card.liquid`, both empty states, the Hydrogen infinite-scroll sentinel ("Show more"), and the optional SEO band. Loads `assets/collection.js` (Task 2). The whole section is wrapped in `[data-collection]` so the Section Rendering API can replace it; the `<script>` sits OUTSIDE that wrapper so it is never re-injected on replace.

**Files:**
- Create: `sections/main-collection.liquid`

- [ ] **Step 1: Create `sections/main-collection.liquid`**

```liquid
{%- comment -%}
  Faceted collection grid. Sort (port of FilterBar.tsx) + native Shopify storefront
  filters (collection.filters) + infinite scroll (port of InfiniteResourceSection.tsx).
  Behavior wired by assets/collection.js via the data-* hooks. Used for named
  collections and /collections/all. Filters only render when enabled in
  Search & Discovery; otherwise the page is sort-only.
{%- endcomment -%}
<script src="{{ 'collection.js' | asset_url }}" defer="defer"></script>
{%- liquid
  assign per_page = section.settings.products_per_page | default: 12
  assign sort_now = collection.sort_by | default: collection.default_sort_by

  assign has_filters = false
  for f in collection.filters
    assign has_filters = true
    break
  endfor

  assign active_count = 0
  assign any_active = false
  for f in collection.filters
    assign active_count = active_count | plus: f.active_values.size
    if f.active_values.size > 0
      assign any_active = true
    endif
    if f.type == 'price_range'
      if f.min_value.value != blank or f.max_value.value != blank
        assign active_count = active_count | plus: 1
        assign any_active = true
      endif
    endif
  endfor

  assign clear_url = collection.url
  if sort_now != blank
    assign clear_url = collection.url | append: '?sort_by=' | append: sort_now
  endif
-%}
<div data-collection data-section-id="{{ section.id }}" data-collection-url="{{ collection.url }}" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pb-24">
  {%- paginate collection.products by per_page -%}

  {%- comment -%} FilterBar (sticky) {%- endcomment -%}
  <div class="sticky top-[var(--header-height)] z-20 -mx-4 sm:-mx-6 lg:-mx-10 mb-8 border-y border-border-soft bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <div class="flex flex-wrap items-center justify-between gap-4 py-4">
        <div class="flex items-baseline gap-4">
          <p class="text-[11px] uppercase tracking-[0.22em] text-stone"><span class="tabular-nums text-ink">{{ collection.products_count }}</span> {% if collection.products_count == 1 %}product{% else %}producten{% endif %}</p>
          {%- if has_filters -%}
            <button type="button" data-aside-open="filters" class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone hover:text-ink transition-colors">
              {% render 'icon', name: 'sliders', size: 14 %} Filteren
              {%- if active_count > 0 -%}<span class="inline-grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] text-surface tabular-nums">{{ active_count }}</span>{%- endif -%}
            </button>
          {%- endif -%}
        </div>
        <label class="relative flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-stone">
          <span class="hidden sm:inline-block">Sorteer op</span>
          <span class="relative inline-flex items-center">
            <select data-sort-select form="CollectionFilterForm-{{ section.id }}" name="sort_by" aria-label="Producten sorteren" class="appearance-none bg-transparent border-0 border-b border-border-soft text-ink font-display normal-case tracking-normal text-[15px] pr-8 pl-1 py-1 focus:outline-none focus:border-clay cursor-pointer">
              <option value="created-descending"{% if sort_now == 'created-descending' %} selected{% endif %}>Nieuwste eerst</option>
              <option value="price-ascending"{% if sort_now == 'price-ascending' %} selected{% endif %}>Prijs · laag naar hoog</option>
              <option value="price-descending"{% if sort_now == 'price-descending' %} selected{% endif %}>Prijs · hoog naar laag</option>
            </select>
            <span class="pointer-events-none absolute right-1 text-ink-soft">{% render 'icon', name: 'chevron-down', size: 14 %}</span>
          </span>
        </label>
      </div>
    </div>
  </div>

  {%- comment -%} Active filter pills {%- endcomment -%}
  {%- if any_active -%}
    <div class="mb-8 flex flex-wrap items-center gap-2">
      {%- for f in collection.filters -%}
        {%- for v in f.active_values -%}
          <a href="{{ v.url_to_remove }}" data-filter-remove class="inline-flex items-center gap-1.5 rounded-full border border-border-soft px-3 py-1.5 text-[11px] text-ink-soft hover:border-ink hover:text-ink transition-colors">{{ v.label }} {% render 'icon', name: 'x', size: 12 %}</a>
        {%- endfor -%}
        {%- if f.type == 'price_range' and f.min_value.value != blank or f.type == 'price_range' and f.max_value.value != blank -%}
          <a href="{{ f.url_to_remove }}" data-filter-remove class="inline-flex items-center gap-1.5 rounded-full border border-border-soft px-3 py-1.5 text-[11px] text-ink-soft hover:border-ink hover:text-ink transition-colors">{{ f.label }} {% render 'icon', name: 'x', size: 12 %}</a>
        {%- endif -%}
      {%- endfor -%}
      <a href="{{ clear_url }}" data-filter-clear class="ml-1 text-[11px] uppercase tracking-[0.18em] text-stone hover:text-ink transition-colors">Wis alles</a>
    </div>
  {%- endif -%}

  {%- comment -%} Grid / empty states {%- endcomment -%}
  {%- if collection.products_count == 0 -%}
    {%- if any_active -%}
      <div class="border-t border-border-soft py-24 text-center">
        <p class="font-display italic text-2xl text-stone">Geen producten gevonden met deze filters.</p>
        <p class="mt-3 text-sm text-ink-soft">Pas de filters aan of <a href="{{ clear_url }}" data-filter-clear class="underline hover:text-ink">wis alles</a>.</p>
      </div>
    {%- else -%}
      <div class="border-t border-border-soft py-24 text-center">
        <p class="font-display italic text-2xl text-stone">{{ section.settings.empty_title | default: 'Deze collectie wordt aangevuld.' }}</p>
        <p class="mt-3 text-sm text-ink-soft">{{ section.settings.empty_body | default: 'Bekijk de complete collectie of kom snel terug.' }}</p>
      </div>
    {%- endif -%}
  {%- else -%}
    <div data-product-grid role="region" aria-label="{{ collection.title | escape }}" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12 md:gap-x-7 md:gap-y-14 lg:gap-x-8 lg:gap-y-16">
      {%- for product in collection.products -%}
        {%- assign p_loading = 'lazy' -%}
        {%- if forloop.index <= 8 -%}{%- assign p_loading = 'eager' -%}{%- endif -%}
        {% render 'product-card', product: product, loading: p_loading %}
      {%- endfor -%}
    </div>

    {%- if paginate.next -%}
      <div data-load-more class="mt-16 flex flex-col items-center gap-4" aria-live="polite">
        <span aria-hidden="true" class="block h-px w-12 bg-stone-soft"></span>
        <a href="{{ paginate.next.url }}" data-load-more-link data-loading-label="{{ section.settings.loading_label | default: 'Meer laden…' }}" data-retry-label="Opnieuw proberen" class="inline-flex items-center gap-3 px-6 py-3 text-xs uppercase tracking-[0.16em] text-ink-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:text-ink">
          <span data-load-more-text>{{ section.settings.load_more_label | default: 'Meer producten' }}</span>
          <span aria-hidden="true" class="text-base leading-none">↓</span>
        </a>
      </div>
    {%- endif -%}
  {%- endif -%}

  {%- comment -%} SEO band {%- endcomment -%}
  {%- assign seo_text = collection.metafields.custom.seo_text.value -%}
  {%- if seo_text != blank -%}
    <section aria-label="Over deze collectie" class="mt-20 border-t border-border-soft pt-12">
      <div class="max-w-2xl text-sm leading-relaxed text-ink-soft whitespace-pre-line">{{ seo_text }}</div>
    </section>
  {%- endif -%}

  {%- comment -%} Filter drawer (reuses snippets/aside.liquid; section-local overlay) {%- endcomment -%}
  {%- if has_filters -%}
    {%- capture filter_body -%}
      <form id="CollectionFilterForm-{{ section.id }}" data-filter-form action="{{ collection.url }}" method="get" class="flex h-full flex-col">
        <div class="flex-1 space-y-8 px-5 md:px-6 py-6">
          {%- for f in collection.filters -%}
            <fieldset class="m-0 border-0 p-0">
              <legend class="text-label text-ink mb-4">{{ f.label }}</legend>
              {%- case f.type -%}
                {%- when 'price_range' -%}
                  <div class="flex items-center gap-3">
                    <label class="flex-1">
                      <span class="sr-only">Van</span>
                      <input type="number" name="{{ f.min_value.param_name }}" value="{{ f.min_value.value }}" placeholder="Van" min="0" inputmode="numeric" class="w-full border border-border-soft bg-surface px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none">
                    </label>
                    <span class="text-stone-soft">–</span>
                    <label class="flex-1">
                      <span class="sr-only">Tot</span>
                      <input type="number" name="{{ f.max_value.param_name }}" value="{{ f.max_value.value }}" placeholder="Tot" min="0" inputmode="numeric" class="w-full border border-border-soft bg-surface px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none">
                    </label>
                  </div>
                {%- else -%}
                  <ul class="space-y-2.5">
                    {%- for v in f.values -%}
                      <li>
                        <label class="flex cursor-pointer items-center gap-3 text-sm {% if v.count == 0 and v.active == false %}opacity-40{% endif %}">
                          <input type="checkbox" name="{{ v.param_name }}" value="{{ v.value }}"{% if v.active %} checked{% endif %} class="peer sr-only">
                          <span class="grid h-4 w-4 place-items-center border border-border-soft text-transparent transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface">{% render 'icon', name: 'check', size: 11 %}</span>
                          <span class="text-ink-soft">{{ v.label }}</span>
                          <span class="ml-auto text-[11px] tabular-nums text-stone-soft">{{ v.count }}</span>
                        </label>
                      </li>
                    {%- endfor -%}
                  </ul>
              {%- endcase -%}
            </fieldset>
          {%- endfor -%}
        </div>
        <div class="flex shrink-0 items-center gap-3 border-t border-border-soft p-5 md:px-6">
          <a href="{{ clear_url }}" data-filter-clear class="text-[11px] uppercase tracking-[0.18em] text-stone hover:text-ink transition-colors">Wis alles</a>
          <button type="submit" class="ml-auto inline-flex h-12 items-center justify-center bg-ink px-8 text-[12px] uppercase tracking-[0.18em] text-surface hover:bg-clay transition-colors">Toepassen</button>
        </div>
      </form>
    {%- endcapture -%}
    {% render 'aside', type: 'filters', heading: 'Filteren', aside_body: filter_body %}
  {%- endif -%}

  {%- endpaginate -%}
</div>

{% schema %}
{
  "name": "Collection grid",
  "tag": "section",
  "settings": [
    { "type": "range", "id": "products_per_page", "min": 8, "max": 48, "step": 4, "label": "Products per page", "default": 12 },
    { "type": "text", "id": "load_more_label", "label": "Load-more label", "default": "Meer producten" },
    { "type": "text", "id": "loading_label", "label": "Loading label", "default": "Meer laden…" },
    { "type": "header", "content": "Empty state (no filters)" },
    { "type": "text", "id": "empty_title", "label": "Empty title", "default": "Deze collectie wordt aangevuld." },
    { "type": "textarea", "id": "empty_body", "label": "Empty body", "default": "Bekijk de complete collectie of kom snel terug." }
  ],
  "presets": [{ "name": "Collection grid" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/main-collection.liquid assets/tailwind.css
git commit -m "feat(collection): main-collection section (filterbar, facets drawer, grid, infinite scroll, seo)"
```
Expected: build exits 0; no new errors. (A `ParserBlankNodes`/`UnusedAssign`-style warning is acceptable only if it is one of the 3 known pre-existing warnings; new ERRORS are not.)

---

### Task 5: `templates/collection.json` + full theme check

Wires the three sections in the Hydrogen order. This single template serves named collections and `/collections/all`.

**Files:**
- Create: `templates/collection.json`

- [ ] **Step 1: Create `templates/collection.json`**

```json
{
  "sections": {
    "collection-hero": { "type": "collection-hero", "settings": {} },
    "category-pills": { "type": "category-pills", "settings": {} },
    "main-collection": { "type": "main-collection", "settings": {} }
  },
  "order": ["collection-hero", "category-pills", "main-collection"]
}
```

- [ ] **Step 2: Full build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -20
git add templates/collection.json assets/tailwind.css
git commit -m "feat(collection): collection.json template (hero + pills + grid)"
```
Expected: build exits 0; theme check reports 0 ERRORS (≤3 known pre-existing warnings OK).

---

### Task 6: Live preview parity verification + checkpoint

No unit tests exist; verify against the running preview and the live Hydrogen site, measuring (not eyeballing) per the project's verification discipline. The user runs `shopify theme dev --store zaynahome-store.myshopify.com` (preview at `http://127.0.0.1:9292`).

- [ ] **Step 1: Confirm at least one storefront filter is enabled**

In Shopify admin → Online Store → Search & Discovery → Filters, ensure Price and Availability (and any product-type) filters are active for collections. Without this, `collection.filters` is empty and the "Filteren" button/drawer correctly do not render. (Ask the user to confirm rather than assuming.)

- [ ] **Step 2: Drive the preview with Playwright MCP**

Navigate and verify each, capturing evidence:
- `http://127.0.0.1:9292/collections/all` — hero shows `De collectie` / `Alle producten.` (trailing period italic clay), meta grid present, product grid 2/3/4 cols at 375/768/1280px (measure with `browser_evaluate` reading `getComputedStyle(grid).gridTemplateColumns`).
- A named collection (e.g. `/collections/<handle>`) — hero shows `Collectie` / the collection title + description.
- Category pills: at 375px the row scrolls horizontally and the right edge-fade is visible (measure `[data-pills-fade="right"]` opacity == "1"); the active pill is `bg-ink`.
- Sort: change the dropdown → grid re-renders without a full navigation (assert `window.location.search` contains `sort_by=price-ascending` and the first product price ≤ the last; assert no full page reload via a sentinel `window.__navMarker`).
- Filters: open the drawer (`[data-aside-open="filters"]`), check a facet, Toepassen → URL gains `filter.*`, count updates, active pill appears, "Wis alles" clears it.
- Infinite scroll: with >12 products, scroll near the sentinel → next page cards append (assert `[data-product-grid]` child count increases and the sentinel either advances or is removed on the last page).
- Empty/filtered-empty states render the correct Dutch copy.

- [ ] **Step 3: Side-by-side against the live Hydrogen site**

Compare hero spacing/type, pill styling, FilterBar sticky offset (`top: var(--header-height)`), and grid gaps against the live collection page. Note any drift; fix in the relevant section file, re-run `npm run build:css`, and re-verify before committing the fix.

- [ ] **Step 4: Checkpoint — pause for user approval**

Report verification evidence (measured grid columns, search-param assertions, append counts, screenshots). **Do not merge.** Wait for the user to preview/approve. After approval: `git pull --rebase origin main`, merge `feat/milestone-5-collection` into `main`, push, delete the branch (per the handoff workflow).

---

## Self-Review

**Spec coverage:** collection-hero (Task 3), category-pills (Task 1), sort (Task 4 FilterBar), native filters (Task 4 drawer + active pills), pagination/infinite scroll (Task 2 + Task 4 sentinel), empty states (Task 4), SEO band (Task 4), `/collections/all` copy switch (Task 3), template wiring (Task 5), verification (Task 6). All handoff M5 items covered; faceted filtering added per the user decision; collections-index deferred per the user decision.

**Placeholder scan:** No TBD/TODO; every code step contains complete, runnable content.

**Type/hook consistency:** JS hooks used in Task 2 match markup emitted in Tasks 1/4 exactly — `[data-pills-scroller]`, `[data-pills-track]`, `[data-pills-fade="left|right"]`, `[data-collection]`, `[data-section-id]`, `[data-collection-url]`, `[data-sort-select]`, `[data-filter-form]` (`id="CollectionFilterForm-<section.id>"`), `[data-filter-clear]`, `[data-filter-remove]`, `[data-product-grid]`, `[data-load-more]`, `[data-load-more-link]` (`data-loading-label`, `data-retry-label`, `[data-load-more-text]`). Drawer type `filters` matches the generic `[data-aside-open="filters"]` / `.overlay[data-aside="filters"]` controller. `sort_by` values match Shopify's accepted keys.
