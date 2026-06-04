# Milestone 7 — Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build search 1:1 with the Hydrogen source — a debounced predictive dropdown in the header search aside (products + collections + pages + articles) plus a full `/search` results page (products infinite-scroll grid + pages + articles groups), with empty / no-term / no-results states.

**Architecture:** Two surfaces, both no-reload. **(1) Predictive dropdown:** a static search `<form>` + an empty `[data-predictive-results]` region live in the search aside (`theme.liquid`, outside the swapped region so they keep focus/state). A dedicated `sections/predictive-search.liquid` renders the four result groups from the global `predictive_search` object. `assets/search.js` debounces the input (~200 ms), fetches `GET /search/suggest?section_id=predictive-search&q=…&resources[type]=product,collection,page,article&resources[limit]=…`, parses the returned `<div id="shopify-section-predictive-search">`, and swaps its inner `[data-predictive-results-list]` into `[data-predictive-results]` — the exact fetch→parse→swap idea proven in `collection.js`/`cart.js`. **(2) Full page:** `templates/search.json` → `sections/main-search.liquid` renders header + form + results from the Liquid `search` object. Products are paginated with `{% paginate search.results by N %}` and infinite-scrolled via the M5 Section-Rendering loader (`?section_id=main-search&page=N`, append `[data-product-grid]` children, swap `[data-load-more]`). Pages and articles are rendered from the **un-paginated** `search.results` (referenced outside the paginate block), partitioned by `object_type` — so they appear in full while products page in.

**Tech Stack:** Shopify Liquid (OS 2.0 sections/snippets/JSON templates), Predictive Search API (section rendering), Storefront `search` object + `{% paginate %}` + Section Rendering API, Tailwind v4 (CLI build), vanilla JS.

---

## Decisions locked (from this session's AskUserQuestion)

1. **Predictive transport:** rendered section (`/search/suggest?section_id=predictive-search`). Reuse the established fetch→parse→swap→rebind pattern; no client-side markup building.
2. **Dropdown categories:** 4 content types — products, collections, pages, articles. **Query suggestions dropped** — the rendered predictive section cannot natively emit `SearchQuerySuggestion` autocomplete the way the Storefront API does. Cleanest 1:1 on the visible rows.
3. **Full-page pagination:** infinite scroll, reusing the M5 collection loader pattern (IntersectionObserver + Section Rendering API).
4. **Substring matching:** accept the prefix-only divergence. Shopify's Liquid Predictive Search API matches word-starts only; Hydrogen's cached-catalog substring backfill (`mergeSubstringProductMatches`, e.g. "vat" in "handvat") has no server equivalent. Document as a platform-limit divergence (like M5 facets, M6 promo) and save a wiki decision page. The full `/search` page uses the regular `search` object, which is broader than predictive.

## Source-of-truth mapping (Hydrogen → Liquid)

| Hydrogen | This milestone |
|---|---|
| `SearchFormPredictive.tsx` (debounced fetcher, `goToSearch`, aside close) | static form in `theme.liquid` search aside + `assets/search.js` |
| `SearchResultsPredictive.tsx` (`.Products/.Collections/.Pages/.Articles/.Empty/.Skeleton`) | `sections/predictive-search.liquid` (groups + no-results) + skeleton in aside body |
| `SearchResultsPredictive.Queries` (datalist) | **dropped** (decision 2) |
| `SearchForm.tsx` (`method="get"`, `name="q"`, cmd+k focus) | full-page form in `main-search.liquid` + cmd+k handler in `search.js` |
| `SearchResults.tsx` (`.Products` paginated, `.Pages`, `.Articles`, `.Empty`) | `sections/main-search.liquid` results groups |
| `routes/($locale).search.tsx` (regular branch: products paginated + pages + articles; header eyebrow/h1/count; no-term + empty states) | `sections/main-search.liquid` + `templates/search.json` |
| `mergeSubstringProductMatches` (substring backfill) | **dropped** — documented divergence (decision 4) |
| `SEARCH_QUERY` `pageBy: 8` | `settings`/section setting `products_per_page` (default 24 for infinite scroll) |

## File structure

- **Create** `sections/predictive-search.liquid` — renders `[data-predictive-results-list]` with the four groups (products / collections / pages / articles) read from `predictive_search.resources`, plus a no-results block. This section's whole output is what `/search/suggest?section_id=` returns; JS extracts the inner list. Has a minimal `{% schema %}` (no settings needed, but required to be a valid section → empty settings array).
- **Create** `sections/main-search.liquid` — full `/search` page: header (eyebrow + h1 + count), search form, results (products paginated grid + pages group + articles group), empty + no-term states. Swap wrapper `[data-search]`; product grid `[data-product-grid]`; load-more sentinel `[data-load-more]`/`[data-load-more-link]` (same hooks as M5 so the loader is a near-copy).
- **Create** `templates/search.json` — wires `main-search`.
- **Create** `assets/search.js` — (a) predictive controller: debounce → fetch `section_id=predictive-search` → swap `[data-predictive-results]`; loading/empty/no-results; cmd+k opens aside + focuses; document-delegated; `window.__zhSearchInit` guard. (b) full-page infinite scroll for `[data-search]` (mirror of M5 `bindInfinite`).
- **Modify** `layout/theme.liquid:36-37` — replace the stub `search_body` capture with a real `<form action="{{ routes.search_url }}" method="get" role="search">` (hidden `type=product,page,article`, input `[data-predictive-input]`) + a `[data-predictive-results]` region (initial hint) + `<script src="{{ 'search.js' | asset_url }}" defer></script>`.
- **Modify** `locales/nl.default.json` + `locales/en.json` — extend `general.search` with the chrome strings shared by both surfaces (group headings, states, count).

## Data-hook contract (keep stable across files)

- Predictive input (in aside, static): `[data-predictive-input]` (also `type="search"`, `name="q"`).
- Predictive results region (in aside, static, swap target): `[data-predictive-results]`.
- Predictive section inner wrapper (swap source): `[data-predictive-results-list]`.
- Predictive section reports its term for the no-results copy via the rendered markup (no extra hook needed).
- Full page swap/scope root: `[data-search][data-section-id][data-search-url]`.
- Full page product grid: `[data-product-grid]`; each card cell `[data-search-product]` (only these are appended on load-more).
- Full page load-more sentinel/link/text: `[data-load-more]` / `[data-load-more-link]` / `[data-load-more-text]` (link carries `data-loading-label`, `data-retry-label` — same as M5).
- Search aside open trigger (existing): `[data-aside-open="search"]`; `theme.js` toggles `.expanded` on `.overlay[data-aside="search"]` and handles Escape + backdrop.

## Predictive section URL contract (what `search.js` requests)

```
/search/suggest?q=<term>&section_id=predictive-search&resources[type]=product,collection,page,article&resources[limit]=5&resources[limit_scope]=each
```
The section reads `predictive_search.resources.products|collections|pages|articles` and `predictive_search.terms`.

---

## Task 1: Search locale strings

**Files:**
- Modify: `locales/nl.default.json` (the `general.search` object, currently lines ~22-26)
- Modify: `locales/en.json` (the `general.search` object, currently lines ~22-26)

- [ ] **Step 1: Extend `general.search` in `locales/nl.default.json`**

Replace the existing `"search": { "title": …, "placeholder": …, "submit": … }` object with:

```json
    "search": {
      "title": "Zoeken",
      "placeholder": "Zoek naar producten…",
      "submit": "Zoeken",
      "start_typing": "Begin met typen om te zoeken.",
      "loading": "Laden…",
      "no_results": "Geen resultaten gevonden.",
      "products": "Producten",
      "collections": "Collecties",
      "pages": "Pagina's",
      "articles": "Artikelen",
      "result": {
        "one": "{{ count }} resultaat gevonden",
        "other": "{{ count }} resultaten gevonden"
      }
    },
```

- [ ] **Step 2: Extend `general.search` in `locales/en.json`**

```json
    "search": {
      "title": "Search",
      "placeholder": "Search for products…",
      "submit": "Search",
      "start_typing": "Start typing to search.",
      "loading": "Loading…",
      "no_results": "No results found.",
      "products": "Products",
      "collections": "Collections",
      "pages": "Pages",
      "articles": "Articles",
      "result": {
        "one": "{{ count }} result found",
        "other": "{{ count }} results found"
      }
    },
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('locales/nl.default.json','utf8'));JSON.parse(require('fs').readFileSync('locales/en.json','utf8'));console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add locales/nl.default.json locales/en.json
git commit -m "feat(search): add general.search chrome strings for M7"
```

---

## Task 2: Predictive results section

**Files:**
- Create: `sections/predictive-search.liquid`

Port of `SearchResultsPredictive.tsx` groups. Small 56×56 thumb rows. Products show thumb + title + price; collections + articles show thumb + title; pages show title-only. No-results block mirrors `SearchResultsPredictive.Empty`. Group headings via locale. The whole section is fetched via `?section_id=predictive-search`; `search.js` extracts `[data-predictive-results-list]`.

- [ ] **Step 1: Create `sections/predictive-search.liquid`**

```liquid
{%- liquid
  assign res = predictive_search.resources
  assign products = res.products
  assign collections = res.collections
  assign pages = res.pages
  assign articles = res.articles
  assign term = predictive_search.terms
  assign total = 0
  assign total = total | plus: products.size | plus: collections.size | plus: pages.size | plus: articles.size
-%}
<div data-predictive-results-list>
  {%- if predictive_search.performed and total == 0 -%}
    <div class="py-8 text-center">
      <p class="font-display text-lg leading-snug text-ink">{{ 'general.search.no_results' | t }}</p>
      <p class="mt-2 text-sm leading-relaxed text-ink-soft">We vonden niets voor &ldquo;{{ term }}&rdquo;. Probeer een andere zoekterm of bekijk de hele collectie.</p>
    </div>
  {%- else -%}
    <div class="space-y-6">
      {%- if products.size > 0 -%}
        <div>
          <div class="mb-3 flex items-center gap-3">
            <span class="text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ 'general.search.products' | t }}</span>
            <span aria-hidden="true" class="h-px flex-1 bg-border-soft/70"></span>
          </div>
          <ul class="-mx-2">
            {%- for product in products -%}
              <li>
                <a href="{{ product.url }}" data-predictive-link class="group flex items-center gap-4 rounded-sm px-2 py-2.5 transition-colors hover:bg-cream/70 focus-visible:bg-cream/70 focus-visible:outline-none">
                  <span class="h-14 w-14 shrink-0 overflow-hidden bg-cream">
                    {%- if product.featured_image -%}
                      {%- assign p_alt = product.featured_image.alt | default: product.title -%}
                      {{ product.featured_image | image_url: width: 112 | image_tag: loading: 'lazy', width: 56, height: 56, alt: p_alt, class: 'h-full w-full object-cover' }}
                    {%- endif -%}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-display text-[15px] leading-snug text-ink transition-colors group-hover:text-clay">{{ product.title }}</span>
                    {%- if product.price and product.price > 0 -%}
                      <span class="mt-0.5 block text-price text-sm text-ink-soft">{{ product.price | money }}</span>
                    {%- endif -%}
                  </span>
                  <span aria-hidden="true" class="shrink-0 text-stone-soft opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">&rarr;</span>
                </a>
              </li>
            {%- endfor -%}
          </ul>
        </div>
      {%- endif -%}

      {%- if collections.size > 0 -%}
        <div>
          <div class="mb-3 flex items-center gap-3">
            <span class="text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ 'general.search.collections' | t }}</span>
            <span aria-hidden="true" class="h-px flex-1 bg-border-soft/70"></span>
          </div>
          <ul class="-mx-2">
            {%- for collection in collections -%}
              <li>
                <a href="{{ collection.url }}" data-predictive-link class="group flex items-center gap-4 rounded-sm px-2 py-2.5 transition-colors hover:bg-cream/70 focus-visible:bg-cream/70 focus-visible:outline-none">
                  <span class="h-14 w-14 shrink-0 overflow-hidden bg-cream">
                    {%- if collection.featured_image -%}
                      {%- assign c_alt = collection.featured_image.alt | default: collection.title -%}
                      {{ collection.featured_image | image_url: width: 112 | image_tag: loading: 'lazy', width: 56, height: 56, alt: c_alt, class: 'h-full w-full object-cover' }}
                    {%- endif -%}
                  </span>
                  <span class="min-w-0 flex-1 truncate font-display text-[15px] leading-snug text-ink transition-colors group-hover:text-clay">{{ collection.title }}</span>
                  <span aria-hidden="true" class="shrink-0 text-stone-soft opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">&rarr;</span>
                </a>
              </li>
            {%- endfor -%}
          </ul>
        </div>
      {%- endif -%}

      {%- if pages.size > 0 -%}
        <div>
          <div class="mb-3 flex items-center gap-3">
            <span class="text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ 'general.search.pages' | t }}</span>
            <span aria-hidden="true" class="h-px flex-1 bg-border-soft/70"></span>
          </div>
          <ul class="-mx-2">
            {%- for page in pages -%}
              <li>
                <a href="{{ page.url }}" data-predictive-link class="group flex items-center justify-between gap-4 rounded-sm px-2 py-2.5 transition-colors hover:bg-cream/70 focus-visible:bg-cream/70 focus-visible:outline-none">
                  <span class="min-w-0 truncate font-display text-[15px] text-ink transition-colors group-hover:text-clay">{{ page.title }}</span>
                  <span aria-hidden="true" class="shrink-0 text-stone-soft opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">&rarr;</span>
                </a>
              </li>
            {%- endfor -%}
          </ul>
        </div>
      {%- endif -%}

      {%- if articles.size > 0 -%}
        <div>
          <div class="mb-3 flex items-center gap-3">
            <span class="text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ 'general.search.articles' | t }}</span>
            <span aria-hidden="true" class="h-px flex-1 bg-border-soft/70"></span>
          </div>
          <ul class="-mx-2">
            {%- for article in articles -%}
              <li>
                <a href="{{ article.url }}" data-predictive-link class="group flex items-center gap-4 rounded-sm px-2 py-2.5 transition-colors hover:bg-cream/70 focus-visible:bg-cream/70 focus-visible:outline-none">
                  <span class="h-14 w-14 shrink-0 overflow-hidden bg-cream">
                    {%- if article.image -%}
                      {%- assign a_alt = article.image.alt | default: article.title -%}
                      {{ article.image | image_url: width: 112 | image_tag: loading: 'lazy', width: 56, height: 56, alt: a_alt, class: 'h-full w-full object-cover' }}
                    {%- endif -%}
                  </span>
                  <span class="min-w-0 flex-1 truncate font-display text-[15px] leading-snug text-ink transition-colors group-hover:text-clay">{{ article.title }}</span>
                  <span aria-hidden="true" class="shrink-0 text-stone-soft opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">&rarr;</span>
                </a>
              </li>
            {%- endfor -%}
          </ul>
        </div>
      {%- endif -%}
    </div>
  {%- endif -%}
</div>

{% schema %}
{
  "name": "Predictive Search",
  "settings": []
}
{% endschema %}
```

- [ ] **Step 2: Theme check the new file**

Run: `npx shopify theme check sections/predictive-search.liquid`
Expected: 0 errors (template-level warnings about unused vars are acceptable).

- [ ] **Step 3: Commit**

```bash
git add sections/predictive-search.liquid
git commit -m "feat(search): predictive-search section (products/collections/pages/articles + no-results)"
```

---

## Task 3: Mount the real search aside (form + results region + script)

**Files:**
- Modify: `layout/theme.liquid:36-37`

Replace the stub. The form + results region + script sit OUTSIDE any swapped region (the aside body itself is static; only `[data-predictive-results]` innerHTML is swapped), so input focus and the script survive. Form `method="get"` to `routes.search_url` with hidden `type` so Enter goes to the full page. Skeleton-style initial hint matches `SearchResultsPredictive.Skeleton`/`Empty` intent (just a hint here; skeleton shows during loading via JS).

- [ ] **Step 1: Replace lines 36-37 of `layout/theme.liquid`**

Find:

```liquid
    {%- capture search_body -%}<div class="px-5 md:px-6 py-6 text-sm text-ink-soft">{{ 'general.search.placeholder' | t }}</div>{%- endcapture -%}
    {% render 'aside', type: 'search', heading: 'general.search.title' | t, aside_body: search_body %}
```

Replace with:

```liquid
    {%- capture search_heading -%}{{ 'general.search.title' | t }}{%- endcapture -%}
    {%- capture search_body -%}
      <div class="px-5 md:px-6 py-6">
        <form action="{{ routes.search_url }}" method="get" role="search" class="group flex items-center gap-3 border-b-2 border-ink/15 pb-3 transition-colors focus-within:border-clay" data-predictive-form>
          <span aria-hidden="true" class="shrink-0 text-stone-soft transition-colors group-focus-within:text-clay">{% render 'icon', name: 'search', size: 20 %}</span>
          <input type="search" name="q" data-predictive-input placeholder="{{ 'general.search.placeholder' | t }}" autocomplete="off" autocorrect="off" spellcheck="false" class="min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-stone-soft focus:outline-none" aria-label="{{ 'general.search.title' | t }}" />
          <input type="hidden" name="type" value="product,page,article" />
          <button type="submit" class="shrink-0 bg-ink px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-surface transition-colors hover:bg-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2">{{ 'general.search.submit' | t }}</button>
        </form>
        <div class="mt-6" data-predictive-results aria-live="polite">
          <p class="text-sm text-ink-soft">{{ 'general.search.start_typing' | t }}</p>
        </div>
      </div>
    {%- endcapture -%}
    {% render 'aside', type: 'search', heading: search_heading, aside_body: search_body %}
    <script src="{{ 'search.js' | asset_url }}" defer></script>
```

- [ ] **Step 2: Theme check**

Run: `npx shopify theme check layout/theme.liquid`
Expected: 0 errors (the 3 known repo-wide false-positive warnings may still appear).

- [ ] **Step 3: Commit**

```bash
git add layout/theme.liquid
git commit -m "feat(search): mount real search aside (form + predictive results region + script)"
```

---

## Task 4: Predictive + infinite-scroll controller (`assets/search.js`)

**Files:**
- Create: `assets/search.js`

Two responsibilities. **(A) Predictive:** debounce the aside input, fetch the predictive section, swap `[data-predictive-results]`, show a skeleton while loading and a hint when empty, cmd+k opens the aside and focuses, close-on-link-click. **(B) Full-page infinite scroll:** mirror M5 `bindInfinite` scoped to `[data-search]`. Document-delegated where possible; guarded by `window.__zhSearchInit`.

- [ ] **Step 1: Create `assets/search.js`**

```javascript
// Zayna Home — search controllers (predictive dropdown + full-page infinite scroll).
(() => {
  'use strict';
  if (window.__zhSearchInit) return;
  window.__zhSearchInit = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* A. Predictive dropdown                                           */
  /* ---------------------------------------------------------------- */
  const SECTION = 'predictive-search';
  const SUGGEST = '/search/suggest';
  const LIMIT = 5;

  const input = document.querySelector('[data-predictive-input]');
  const region = document.querySelector('[data-predictive-results]');

  const skeleton = () => {
    let rows = '';
    for (let i = 0; i < 4; i++) {
      rows +=
        '<li class="flex items-center gap-4 px-2 py-2.5">' +
        '<div class="h-14 w-14 shrink-0 bg-border-soft/50"></div>' +
        '<div class="min-w-0 flex-1 space-y-2">' +
        '<div class="h-3 w-3/5 rounded bg-border-soft/60"></div>' +
        '<div class="h-2.5 w-16 rounded bg-border-soft/40"></div>' +
        '</div></li>';
    }
    return (
      '<div aria-hidden="true" class="animate-pulse">' +
      '<div class="mb-3 h-2 w-20 rounded bg-border-soft/70"></div>' +
      '<ul class="-mx-2 space-y-1">' + rows + '</ul></div>'
    );
  };

  if (input && region) {
    const startHint = region.innerHTML;
    let timer = null;
    let lastTerm = '';
    let controller = null;

    const render = (html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('[data-predictive-results-list]');
      region.innerHTML = fresh ? fresh.outerHTML : startHint;
    };

    const run = async (term) => {
      if (controller) controller.abort();
      controller = new AbortController();
      const params = new URLSearchParams();
      params.set('q', term);
      params.set('section_id', SECTION);
      params.set('resources[type]', 'product,collection,page,article');
      params.set('resources[limit]', String(LIMIT));
      params.set('resources[limit_scope]', 'each');
      try {
        const res = await fetch(SUGGEST + '?' + params.toString(), {
          headers: { 'X-Requested-With': 'fetch' },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('suggest failed: ' + res.status);
        render(await res.text());
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    };

    input.addEventListener('input', () => {
      const term = input.value.trim();
      if (timer) clearTimeout(timer);
      if (term === '') {
        lastTerm = '';
        region.innerHTML = startHint;
        return;
      }
      if (term === lastTerm) return;
      lastTerm = term;
      region.innerHTML = skeleton();
      timer = setTimeout(() => run(term), 200);
    });
  }

  // Close the aside when a predictive result is chosen.
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-predictive-link]')) {
      const overlay = document.querySelector('.overlay[data-aside="search"].expanded');
      const close = overlay && overlay.querySelector('[data-aside-close]');
      if (close) close.click();
    }
  });

  // cmd+k / ctrl+k opens the search aside and focuses the input.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const trigger = document.querySelector('[data-aside-open="search"]');
      if (trigger) trigger.click();
      const field = document.querySelector('[data-predictive-input]');
      if (field) setTimeout(() => field.focus(), 50);
    }
  });

  /* ---------------------------------------------------------------- */
  /* B. Full-page infinite scroll (mirror of collection.js)          */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-search]').forEach((root) => {
    const sectionId = root.getAttribute('data-section-id');
    const baseUrl = root.getAttribute('data-search-url');
    if (!sectionId || !baseUrl) return;
    let busy = false;
    let observer = null;

    const bindInfinite = () => {
      if (observer) { observer.disconnect(); observer = null; }
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
          if (!res.ok) throw new Error('load more failed: ' + res.status);
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
          bindInfinite();
        }
      };

      link.addEventListener('click', (e) => { e.preventDefault(); loadNext(); });
      if ('IntersectionObserver' in window && !reduce) {
        observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) loadNext();
        }, { rootMargin: '600px 0px 600px 0px' });
        observer.observe(sentinel);
      }
    };

    bindInfinite();
  });
})();
```

- [ ] **Step 2: Theme check (asset is JS; run repo-wide check)**

Run: `npx shopify theme check 2>&1 | tail -5`
Expected: 0 errors (3 known false-positive warnings acceptable).

- [ ] **Step 3: Commit**

```bash
git add assets/search.js
git commit -m "feat(search): search.js — debounced predictive dropdown + full-page infinite scroll"
```

---

## Task 5: Full results page (`sections/main-search.liquid`)

**Files:**
- Create: `sections/main-search.liquid`

Port of `routes/($locale).search.tsx` regular branch + `SearchResults.tsx`. Header (eyebrow + h1 + count), form, then: no-term state, OR empty state, OR results. Products = `{% paginate search.results by N %}` filtered to `object_type == 'product'`, rendered via the `product-card` snippet inside `[data-product-grid]`, with the M5 load-more sentinel. Pages + articles = `search.results` referenced OUTSIDE the paginate block (full set), partitioned by `object_type`, rendered as index rows. Section content is Dutch defaults via schema settings (editor-editable); group headings via locale.

> **Why pages/articles are outside the paginate block:** Liquid's `search` object is a single mixed query (`type=product,page,article`). `{% paginate search.results %}` pages the whole mixed list; referencing `search.results` *outside* the block yields the full unpaginated set, so pages/articles render in full while products page in. The infinite-scroll loader only appends `[data-product-grid]` children, so re-fetched pages/articles markup is ignored — no duplication.

- [ ] **Step 1: Create `sections/main-search.liquid`**

```liquid
{%- liquid
  assign per_page = section.settings.products_per_page | default: 24
  assign terms = search.terms
  assign all_pages = search.results | where: 'object_type', 'page'
  assign all_articles = search.results | where: 'object_type', 'article'
  assign product_total = 0
  for item in search.results
    if item.object_type == 'product'
      assign product_total = product_total | plus: 1
    endif
  endfor
-%}
<section
  class="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10"
  data-search
  data-section-id="{{ section.id }}"
  data-search-url="{{ routes.search_url }}"
>
  <header class="relative isolate pt-6 pb-10 sm:pt-10 sm:pb-14">
    <p class="text-label text-clay mb-4 flex items-center gap-3 sm:mb-5">
      <span aria-hidden="true" class="block h-px w-10 bg-clay/60 sm:w-12"></span>
      {{ section.settings.eyebrow }}
    </p>
    <h1 class="font-display text-[clamp(2.25rem,7.5vw,4.75rem)] leading-[1.02] tracking-[-0.025em] text-ink">
      {%- if search.performed and terms != blank -%}
        Resultaten voor <span class="italic text-clay/80">&ldquo;{{ terms }}&rdquo;</span>
      {%- else -%}
        {{ section.settings.heading_no_term }}
      {%- endif -%}
    </h1>
    {%- if search.performed and search.results.size > 0 -%}
      {%- assign count_label = 'general.search.result' | t: count: search.results.size -%}
      <p class="mt-4 text-[15px] text-ink-soft">{{ count_label }}</p>
    {%- endif -%}

    <div class="mt-8 max-w-xl">
      <form action="{{ routes.search_url }}" method="get" role="search" class="group flex items-center gap-3 border-b-2 border-ink/15 pb-3 transition-colors focus-within:border-clay">
        <span aria-hidden="true" class="shrink-0 text-stone-soft transition-colors group-focus-within:text-clay">{% render 'icon', name: 'search', size: 20 %}</span>
        <input type="search" name="q" value="{{ terms | escape }}" placeholder="{{ 'general.search.placeholder' | t }}" autocomplete="off" class="min-w-0 flex-1 bg-transparent text-lg text-ink placeholder:text-stone-soft focus:outline-none" aria-label="{{ 'general.search.title' | t }}" />
        <input type="hidden" name="type" value="product,page,article" />
        <button type="submit" class="shrink-0 bg-ink px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-surface transition-colors hover:bg-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2">{{ 'general.search.submit' | t }}</button>
      </form>
    </div>
  </header>

  {%- if search.performed == false or terms == blank -%}
    <div class="border-t border-border-soft py-20 text-center sm:py-28">
      <p class="font-display text-2xl italic text-stone sm:text-3xl">{{ section.settings.heading_no_term }}</p>
      <p class="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">{{ section.settings.no_term_body }}</p>
    </div>
  {%- elsif search.results.size == 0 -%}
    <div class="border-t border-border-soft py-20 text-center sm:py-28">
      <p class="font-display text-2xl italic text-stone sm:text-3xl">{{ section.settings.empty_heading }}</p>
      <p class="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">{{ section.settings.empty_body }}</p>
      {%- assign empty_url = section.settings.empty_button_url | default: routes.all_products_collection_url -%}
      <a href="{{ empty_url }}" class="group mt-8 inline-flex items-center justify-center gap-3 bg-ink px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] text-surface transition-colors hover:bg-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2">
        {{ section.settings.empty_button_label }}
        <span aria-hidden="true" class="text-base leading-none transition-transform group-hover:translate-x-1">&rarr;</span>
      </a>
    </div>
  {%- else -%}
    <div class="space-y-16 sm:space-y-20">
      {%- if product_total > 0 -%}
        <section>
          <div class="mb-8 flex items-baseline justify-between border-b border-border-soft pb-4">
            <h2 class="font-display text-h3 normal-case tracking-normal text-ink">{{ 'general.search.products' | t }}</h2>
          </div>
          {%- paginate search.results by per_page -%}
            <div data-product-grid class="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-7 md:gap-y-14 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
              {%- for item in search.results -%}
                {%- if item.object_type == 'product' -%}
                  <div data-search-product>{% render 'product-card', product: item %}</div>
                {%- endif -%}
              {%- endfor -%}
            </div>
            {%- if paginate.next -%}
              <div data-load-more class="mt-14 flex justify-center">
                <a
                  href="{{ paginate.next.url }}"
                  data-load-more-link
                  data-loading-label="{{ 'general.search.loading' | t }}"
                  data-retry-label="Opnieuw proberen"
                  rel="next"
                  class="inline-flex items-center justify-center gap-2 border border-ink/15 px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:border-clay hover:text-clay"
                >
                  <span data-load-more-text>Meer laden</span>
                  <span aria-hidden="true">&darr;</span>
                </a>
              </div>
            {%- endif -%}
          {%- endpaginate -%}
        </section>
      {%- endif -%}

      {%- if all_pages.size > 0 -%}
        <section>
          <div class="mb-8 flex items-baseline justify-between border-b border-border-soft pb-4">
            <h2 class="font-display text-h3 normal-case tracking-normal text-ink">{{ 'general.search.pages' | t }}</h2>
            <span class="text-label text-stone-soft">{{ all_pages.size }}</span>
          </div>
          <div>
            {%- for item in all_pages -%}
              <a href="{{ item.url }}" class="group flex items-center justify-between gap-4 border-b border-border-soft py-4 transition-colors hover:border-clay/40">
                <span class="font-display text-lg leading-snug text-ink transition-colors group-hover:text-clay">{{ item.title }}</span>
                <span aria-hidden="true" class="shrink-0 text-base leading-none text-stone-soft transition-all duration-300 group-hover:translate-x-1 group-hover:text-clay">&rarr;</span>
              </a>
            {%- endfor -%}
          </div>
        </section>
      {%- endif -%}

      {%- if all_articles.size > 0 -%}
        <section>
          <div class="mb-8 flex items-baseline justify-between border-b border-border-soft pb-4">
            <h2 class="font-display text-h3 normal-case tracking-normal text-ink">{{ 'general.search.articles' | t }}</h2>
            <span class="text-label text-stone-soft">{{ all_articles.size }}</span>
          </div>
          <div>
            {%- for item in all_articles -%}
              <a href="{{ item.url }}" class="group flex items-center justify-between gap-4 border-b border-border-soft py-4 transition-colors hover:border-clay/40">
                <span class="font-display text-lg leading-snug text-ink transition-colors group-hover:text-clay">{{ item.title }}</span>
                <span aria-hidden="true" class="shrink-0 text-base leading-none text-stone-soft transition-all duration-300 group-hover:translate-x-1 group-hover:text-clay">&rarr;</span>
              </a>
            {%- endfor -%}
          </div>
        </section>
      {%- endif -%}
    </div>
  {%- endif -%}
</section>

{% schema %}
{
  "name": "Search results",
  "tag": "section",
  "settings": [
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Zoeken" },
    { "type": "text", "id": "heading_no_term", "label": "Heading (no search term)", "default": "Wat zoek je?" },
    { "type": "range", "id": "products_per_page", "min": 8, "max": 48, "step": 4, "label": "Products per page", "default": 24 },
    { "type": "header", "content": "No-term state" },
    { "type": "textarea", "id": "no_term_body", "label": "No-term body", "default": "Zoek naar producten, pagina's en artikelen, of bekijk de volledige collectie." },
    { "type": "header", "content": "Empty (no results) state" },
    { "type": "text", "id": "empty_heading", "label": "Empty heading", "default": "Geen resultaten gevonden." },
    { "type": "textarea", "id": "empty_body", "label": "Empty body", "default": "Probeer een andere zoekterm of bekijk onze volledige collectie." },
    { "type": "text", "id": "empty_button_label", "label": "Empty button label", "default": "Bekijk collectie" },
    { "type": "url", "id": "empty_button_url", "label": "Empty button link" }
  ]
}
{% endschema %}
```

- [ ] **Step 2: Theme check**

Run: `npx shopify theme check sections/main-search.liquid`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add sections/main-search.liquid
git commit -m "feat(search): main-search section (products infinite-scroll grid + pages + articles + states)"
```

---

## Task 6: Search template

**Files:**
- Create: `templates/search.json`

- [ ] **Step 1: Create `templates/search.json`**

```json
{
  "sections": {
    "main": {
      "type": "main-search"
    }
  },
  "order": ["main"]
}
```

- [ ] **Step 2: Theme check**

Run: `npx shopify theme check templates/search.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add templates/search.json
git commit -m "feat(search): search.json template wiring main-search"
```

---

## Task 7: Build CSS + full theme check

**Files:**
- Modify: `assets/tailwind.css` (generated)

Any new Tailwind classes introduced in Tasks 2/3/5 must be compiled. Run the CLI build and commit the output.

- [ ] **Step 1: Build CSS**

Run: `npm run build:css`
Expected: exits 0 (sub-second).

- [ ] **Step 2: Full theme check**

Run: `npx shopify theme check 2>&1 | tail -8`
Expected: 0 errors. Only the 3 known repo-wide false-positive warnings.

- [ ] **Step 3: Commit the built CSS (if changed)**

```bash
git add assets/tailwind.css
git commit -m "build(search): compile Tailwind for M7 search markup" || echo "no css change"
```

---

## Task 8: Parity QA with Playwright (measure, don't eyeball)

**Prereq:** user runs `shopify theme dev --store zaynahome-store.myshopify.com`; preview at `http://127.0.0.1:9292`.

This is where real bugs surface (M5 rich-text, M6 form-cart). Verify with measurements, not screenshots alone.

- [ ] **Step 1: Predictive dropdown fires + swaps (no reload)**
  - Navigate to `http://127.0.0.1:9292/`. Click `[data-aside-open="search"]`; assert `.overlay[data-aside="search"]` has class `expanded`.
  - Type a known term (e.g. a real product word) into `[data-predictive-input]`.
  - Assert a `GET /search/suggest?...section_id=predictive-search...` request fired (network log). Assert NO full-page navigation occurred.
  - Assert `[data-predictive-results] [data-predictive-results-list]` exists and contains ≥1 `[data-predictive-link]`. Count rows per group.
  - Clear the input → assert region returns to the start hint.
  - Type gibberish → assert the no-results block renders.

- [ ] **Step 2: Debounce**
  - Type 5 chars rapidly; assert only 1 (final) `/search/suggest` request resolved (earlier ones aborted). Check network request count.

- [ ] **Step 3: Selection closes the aside**
  - Click a `[data-predictive-link]`; assert navigation to the target and the overlay no longer has `expanded` (or is removed on nav).

- [ ] **Step 4: Enter / submit → full page**
  - Type a term, press Enter; assert URL is `/search?q=<term>&type=product%2Cpage%2Carticle` and `[data-search]` is present.

- [ ] **Step 5: Full page results + groups**
  - On `/search?q=<term>`, assert the h1 shows `Resultaten voor "<term>"` and the count line matches `search.results.size`.
  - Assert Products grid `[data-product-grid]` has `[data-search-product]` cells; assert Pages and Articles groups render if present.

- [ ] **Step 6: Infinite scroll (if >per_page products)**
  - Use a broad term that returns > `products_per_page` products. Scroll to `[data-load-more]`; assert a `GET /search?...&page=2&section_id=main-search` request fired and `[data-product-grid]` child count increased, with NO full-page reload. Assert the sentinel swapped/removed at the last page.

- [ ] **Step 7: Empty + no-term states**
  - `/search?q=zzzzzznope&type=product,page,article` → assert empty-state heading + "Bekijk collectie" button.
  - `/search` (no q) → assert no-term state copy.

- [ ] **Step 8: cmd+k**
  - From `/`, press Meta+K; assert the search aside opens and `[data-predictive-input]` is focused (`document.activeElement`).

- [ ] **Step 9: Fix any findings, re-run the affected checks, then build:css + theme check again if markup changed. Commit fixes.**

---

## Task 9: Document the prefix-only divergence (wiki)

**Files:**
- Create: `/Users/altugsogutoglu/Herd/claude-obsidian/wiki/decisions/2026-06-04-zayna-predictive-search-prefix-only-divergence.md`

Follow the M5/M6 decision-page precedent. Capture: Hydrogen's `mergeSubstringProductMatches` substring backfill; Shopify Liquid Predictive Search API is prefix-only with no server-side catalog-scan equivalent; decision to accept the divergence (predictive matches word-starts; full `/search` page uses the broader regular search); rejected alternative (client-side catalog substring scan) and why (client complexity + per-session catalog payload). Update the vault index, log, and hot cache as in M5/M6.

> Offer this to the user before writing (per the global "offer, don't auto-save" rule). Use the `claude-obsidian:save` skill if they accept.

---

## Self-review checklist (done while writing)

- **Spec coverage:** predictive (4 groups + no-results) ✓ Task 2/3/4; full page (products paginated + pages + articles + count + eyebrow/h1) ✓ Task 5; no-term + empty states ✓ Task 5; cmd+k ✓ Task 4; debounce + abort ✓ Task 4; infinite scroll ✓ Task 4/5; query suggestions dropped (decision 2) ✓; substring backfill dropped (decision 4, documented Task 9) ✓.
- **Type/hook consistency:** `[data-predictive-input]`, `[data-predictive-results]`, `[data-predictive-results-list]`, `[data-predictive-link]`, `[data-search]`/`[data-section-id]`/`[data-search-url]`, `[data-product-grid]`/`[data-search-product]`, `[data-load-more]`/`[data-load-more-link]`/`[data-load-more-text]` used identically across section + JS. ✓
- **Gotchas honored:** no `|` filter inside tag named args (count label precomputed into `count_label`, empty_url precomputed); `url` setting has no default (empty_button_url left default-less, falls back to `routes.all_products_collection_url`); script kept OUTSIDE the swapped region; `window.__zhSearchInit` guard; IntersectionObserver disconnected before rebind; document-delegated link-close handler survives swaps; `templates/search.json` is a new milestone template (safe to create, not editor-managed). ✓
```