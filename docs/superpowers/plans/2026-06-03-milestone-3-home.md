# Milestone 3 — Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Zayna Home homepage as seven editable OS 2.0 sections (Hero, ValueProps, FreshlyListed, CuratedEdit, FounderNote, JournalTeaser, Newsletter) plus a reusable `product-card` snippet, and an `index.json` template that reproduces the live homepage by default while letting the client reorder/edit everything.

**Architecture:** Each home block becomes a section with `{% schema %}` settings/blocks and Dutch defaults matching the live site. A shared `snippets/product-card.liquid` (used here and by Milestones 4–7) renders the product tile with hover-swap image, condition/bestseller/new badges, sold overlay, and price. The CuratedEdit carousel uses a native scroll-snap track with prev/next buttons and an optional continuous auto-drift driven by a small controller added to `assets/theme.js` (reduced-motion safe). `index.json` lists the sections in the live render order.

**Tech Stack:** Liquid (OS 2.0 sections, blocks, `collection`/`collection_list`/`blog`/`image_picker` settings, `{% form %}`), Tailwind v4, vanilla JS.

**Plan series context:** Plan 3 of 10. Builds on Milestones 1–2: reuses `@theme` tokens, `snippets/icon.liquid` (extended here), the section/schema + locale conventions, and the `assets/theme.js` IIFE (extended here). Work on branch `feat/milestone-3-home`.

**Verification model:** No unit runner. Each task: `npm run build:css` (exit 0) + `npx shopify theme check` (0 errors; the 3 pre-existing false-positive warnings may remain). Run all commands from `/Users/altugsogutoglu/Herd/zayna-theme`.

**IMPORTANT Shopify gotcha (learned in M2):** `url`-type settings cannot have arbitrary defaults — Shopify rejects them on upload. Any setting needing a URL/mailto default uses `type: "text"`. `collection`/`collection_list`/`blog`/`image_picker`/`page` settings cannot take a default at all (omit `default`).

**Source-of-truth content** (from the Hydrogen app, already extracted):
- Render order: Hero, ValueProps, FreshlyListed, CuratedEdit, FounderNote, JournalTeaser, Newsletter.
- Product card metafields: `custom.condition` (values map: new / "new without tags" / "nieuw zonder prijskaartje" → "new without tags" badge (sage); very good / heel goed → "very good" (stone); good / goed → "good" (stone-soft)), `custom.bestseller` (== "true"/"1"). "Nieuw" badge when product created < 7 days ago. Sold overlay label "Uitverkocht". Price falls back to "prijs op aanvraag" when 0.

---

### Task 0: Branch + scrollbar utility

**Files:**
- Modify: `src/tailwind.css`

- [ ] **Step 1: Create branch**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && git checkout -b feat/milestone-3-home && git branch --show-current
```
Expected: `feat/milestone-3-home`.

- [ ] **Step 2: Add a `.no-scrollbar` utility to `src/tailwind.css`**

Append this at the end of the `@layer utilities { … }` block (right after the `.sr-only` rule, inside the same `@layer utilities`):

```css
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
```

- [ ] **Step 3: Build + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && grep -c no-scrollbar assets/tailwind.css
git add src/tailwind.css assets/tailwind.css
git commit -m "feat: no-scrollbar utility for carousels"
```
Expected: build 0; grep ≥ 1.

---

### Task 1: Extend the icon snippet

Add the four ValueProps icons (lucide paths).

**Files:**
- Modify: `snippets/icon.liquid`

- [ ] **Step 1: Add four `when` cases** before the `{%- endcase -%}` in `snippets/icon.liquid`:

```liquid
    {%- when 'sparkles' -%}
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
    {%- when 'shield-check' -%}
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>
    {%- when 'truck' -%}
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
    {%- when 'file-text' -%}
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add snippets/icon.liquid assets/tailwind.css
git commit -m "feat: add sparkles, shield-check, truck, file-text icons"
```
Expected: 0 errors.

---

### Task 2: Product card snippet

The reusable tile. Usage: `{% render 'product-card', product: product, loading: 'lazy' %}`.

**Files:**
- Create: `snippets/product-card.liquid`

- [ ] **Step 1: Create `snippets/product-card.liquid`**

```liquid
{%- liquid
  assign primary = product.featured_image
  assign secondary = null
  for img in product.images
    unless img.id == primary.id
      assign secondary = img
      break
    endunless
  endfor

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

  assign is_sold = false
  unless product.available
    assign is_sold = true
  endunless

  assign is_new = false
  assign now_s = 'now' | date: '%s'
  assign created_s = product.created_at | date: '%s'
  assign age = now_s | minus: created_s
  if created_s != blank and age < 604800
    assign is_new = true
  endif

  assign is_bestseller = false
  assign bs = product.metafields.custom.bestseller.value
  if bs == true or bs == 'true' or bs == '1'
    assign is_bestseller = true
  endif

  assign status_badge = ''
  if is_bestseller
    assign status_badge = 'Bestseller'
  elsif is_new
    assign status_badge = 'Nieuw'
  endif
-%}
<div class="group relative">
  <a href="{{ product.url }}" class="block focus-visible:outline-none">
    <div class="zh-frame relative aspect-[4/5] overflow-hidden">
      {%- if primary -%}
        {{ primary | image_url: width: 600 | image_tag:
          loading: loading,
          sizes: '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
          widths: '300, 400, 600, 800',
          alt: primary.alt | default: product.title,
          class: 'absolute inset-0 h-full w-full object-contain transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.24,1)] group-hover:scale-[1.04]' }}
        {%- if secondary -%}
          {{ secondary | image_url: width: 600 | image_tag:
            loading: 'lazy',
            sizes: '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
            alt: '',
            class: 'absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-[900ms] ease-out motion-safe:group-hover:opacity-100' }}
        {%- endif -%}
      {%- else -%}
        <div class="absolute inset-0 grid place-items-center px-6 text-center">
          <div>
            <span aria-hidden="true" class="mx-auto mb-3 block h-px w-10 bg-stone-soft"></span>
            <span class="font-display italic text-sm text-stone block leading-snug">Afbeelding volgt</span>
            <span class="mt-1 block text-[11px] uppercase tracking-[0.18em] text-stone-soft line-clamp-2">{{ product.title }}</span>
          </div>
        </div>
      {%- endif -%}

      {%- if cond_label != blank -%}
        <div class="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          <span class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide {{ cond_style }}">{{ cond_label }}</span>
        </div>
      {%- endif -%}

      {%- if is_sold == false and status_badge != blank -%}
        <span class="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 bg-surface/95 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink">
          <span aria-hidden="true" class="block h-1 w-1 rounded-full bg-clay"></span>
          {{ status_badge }}
        </span>
      {%- endif -%}

      {%- if is_sold -%}
        <div class="absolute inset-0 bg-white/60 grid place-items-center pointer-events-none" aria-hidden="true">
          <span class="font-display italic text-sold -rotate-12 text-2xl">Uitverkocht</span>
        </div>
      {%- endif -%}
    </div>

    <div class="mt-4 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <h3 class="min-w-0 min-h-[2.5em] font-display text-[15px] sm:text-base md:text-[17px] leading-[1.25] text-ink line-clamp-2 transition-colors duration-300 group-hover:text-clay sm:min-h-0">{{ product.title }}</h3>
      <div class="shrink-0 text-left sm:pt-0.5 sm:text-right">
        {%- if product.price and product.price > 0 -%}
          <span class="text-price tabular-nums text-ink">{{ product.price | money }}</span>
        {%- else -%}
          <span class="font-display italic text-sm text-stone">prijs op aanvraag</span>
        {%- endif -%}
      </div>
    </div>
    <span aria-hidden="true" class="mt-3 block h-px w-6 bg-border-soft transition-all duration-500 group-hover:w-14 group-hover:bg-clay/70"></span>
  </a>
</div>
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add snippets/product-card.liquid assets/tailwind.css
git commit -m "feat: reusable product-card snippet"
```
Expected: 0 errors.

---

### Task 3: Hero section

Image hero when an image is set, else the typographic fallback hero. Both pull headline/eyebrow/subhead/CTA from settings.

**Files:**
- Create: `sections/hero.liquid`

- [ ] **Step 1: Create `sections/hero.liquid`**

```liquid
{%- liquid
  assign s = section.settings
-%}
{%- if s.image != blank -%}
  <section class="relative -mt-[var(--header-height)] h-[88dvh] min-h-[560px] sm:h-[92dvh] sm:min-h-[640px] w-full overflow-hidden bg-cream isolate">
    {{ s.image | image_url: width: 2400 | image_tag:
      loading: 'eager',
      fetchpriority: 'high',
      sizes: '100vw',
      widths: '750, 1100, 1500, 2000, 2400',
      alt: s.image.alt | default: s.headline,
      class: 'absolute inset-0 h-full w-full object-cover' }}
    <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-t from-ink/85 from-0% via-ink/55 via-45% to-ink/25 to-100% sm:from-ink/80 sm:via-ink/40 sm:via-50% sm:to-ink/20"></div>
    <div aria-hidden="true" class="pointer-events-none absolute inset-0" style="background:radial-gradient(75% 55% at 50% 95%, rgba(31,28,26,0.45), transparent 70%);"></div>
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 h-[var(--header-height)] bg-gradient-to-b from-ink/40 to-transparent"></div>
    <div class="relative z-10 flex h-full flex-col">
      <div class="flex-1"></div>
      <div class="px-5 sm:px-10 pb-12 sm:pb-20">
        <div class="mx-auto max-w-7xl text-cream" style="text-shadow:0 1px 18px rgba(31,28,26,0.45);">
          {%- if s.eyebrow != blank -%}
            <p class="text-label text-cream/90 mb-4 flex items-center gap-3"><span aria-hidden="true" class="inline-block h-px w-8 bg-cream/60"></span>{{ s.eyebrow }}</p>
          {%- endif -%}
          <h1 class="font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.02] tracking-[-0.02em] max-w-3xl text-surface">{{ s.headline }}</h1>
          {%- if s.subhead != blank -%}
            <p class="mt-5 max-w-md text-base sm:text-lg leading-relaxed text-cream/95">{{ s.subhead }}</p>
          {%- endif -%}
          {%- if s.cta_label != blank -%}
            <a href="{{ s.cta_url | default: routes.all_products_collection_url }}" class="mt-9 inline-flex items-center gap-3 bg-surface text-ink px-7 py-3.5 text-sm uppercase tracking-[0.14em] hover:bg-cream transition-colors" style="text-shadow:none;">{{ s.cta_label }}<span aria-hidden="true" class="text-base leading-none">→</span></a>
          {%- endif -%}
        </div>
      </div>
    </div>
  </section>
{%- else -%}
  <section class="relative -mt-[var(--header-height)] w-full overflow-hidden bg-bg isolate">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0" style="background:radial-gradient(60% 70% at 78% 18%, rgba(181,101,29,0.10), transparent 60%), radial-gradient(50% 60% at 12% 90%, rgba(138,154,123,0.12), transparent 65%), linear-gradient(180deg, #F4ECE5 0%, #FAF5F2 55%, #F0EBE6 100%);"></div>
    <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-[8%] hidden w-px bg-border-soft md:block"></div>
    <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-[8%] hidden w-px bg-border-soft md:block"></div>
    <div class="relative z-10 mx-auto flex min-h-[78dvh] max-w-7xl flex-col px-5 pt-[calc(var(--header-height)+3rem)] pb-16 sm:px-10 sm:pt-[calc(var(--header-height)+5rem)] sm:pb-24 md:min-h-[86dvh]">
      <div class="mb-12 flex flex-wrap items-center justify-between gap-y-3 text-[10px] uppercase tracking-[0.22em] text-stone">
        <span class="flex items-center gap-3"><span aria-hidden="true" class="block h-px w-10 bg-stone-soft"></span>{{ s.meta_left | default: 'Zayna Home · Keuken & Wonen' }}</span>
        <span class="hidden font-display italic normal-case tracking-normal text-stone md:inline">{{ s.meta_center | default: 'Stijlvol, praktisch, betaalbaar.' }}</span>
        <span>{{ s.meta_right | default: 'Geselecteerd · Verzonden vanuit NL' }}</span>
      </div>
      <div class="grid flex-1 grid-cols-12 items-end gap-y-12 gap-x-8 md:gap-x-12">
        <div class="col-span-12 md:col-span-8">
          {%- if s.eyebrow != blank -%}
            <p class="text-label text-clay mb-6 flex items-center gap-3"><span aria-hidden="true" class="block h-px w-12 bg-clay/60"></span>{{ s.eyebrow }}</p>
          {%- endif -%}
          <h1 class="font-display text-[clamp(3rem,8.5vw,6.75rem)] leading-[0.98] tracking-[-0.035em] text-ink">{{ s.headline }}</h1>
        </div>
        <div class="col-span-12 md:col-span-4 md:pb-4">
          {%- if s.subhead != blank -%}
            <p class="max-w-[34ch] text-[15px] leading-[1.75] text-ink-soft">{{ s.subhead }}</p>
          {%- endif -%}
          {%- if s.cta_label != blank -%}
            <a href="{{ s.cta_url | default: routes.all_products_collection_url }}" class="group mt-7 inline-flex items-center gap-3 border-b border-ink pb-2 text-[11px] uppercase tracking-[0.22em] text-ink hover:border-clay hover:text-clay transition-colors">{{ s.cta_label }}<span aria-hidden="true" class="text-base leading-none transition-transform group-hover:translate-x-1">→</span></a>
          {%- endif -%}
        </div>
      </div>
    </div>
  </section>
{%- endif -%}

{% schema %}
{
  "name": "Hero",
  "tag": "section",
  "settings": [
    { "type": "image_picker", "id": "image", "label": "Background image", "info": "When empty, a typographic hero is shown." },
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Zayna Home" },
    { "type": "text", "id": "headline", "label": "Headline", "default": "Mooi wonen begint in de keuken." },
    { "type": "textarea", "id": "subhead", "label": "Subhead", "default": "Stijlvolle keuken- en woonproducten die je zichtbaar durft neer te zetten. Praktisch, betaalbaar en zorgvuldig geselecteerd." },
    { "type": "text", "id": "cta_label", "label": "CTA label", "default": "Bekijk de collectie" },
    { "type": "text", "id": "cta_url", "label": "CTA link", "default": "/collections/all" },
    { "type": "header", "content": "Typographic hero meta (shown when no image)" },
    { "type": "text", "id": "meta_left", "label": "Meta left", "default": "Zayna Home · Keuken & Wonen" },
    { "type": "text", "id": "meta_center", "label": "Meta center", "default": "Stijlvol, praktisch, betaalbaar." },
    { "type": "text", "id": "meta_right", "label": "Meta right", "default": "Geselecteerd · Verzonden vanuit NL" }
  ],
  "presets": [{ "name": "Hero" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/hero.liquid assets/tailwind.css
git commit -m "feat: hero section (image + typographic fallback)"
```

---

### Task 4: ValueProps section

**Files:**
- Create: `sections/value-props.liquid`

- [ ] **Step 1: Create `sections/value-props.liquid`**

```liquid
<section aria-label="{{ section.settings.aria | default: 'Waarom Zayna Home' }}" class="border-y border-border-soft bg-bg/60">
  <ul class="mx-auto grid max-w-7xl grid-cols-2 gap-y-10 gap-x-6 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:gap-x-10 lg:px-10 lg:py-16">
    {%- for block in section.blocks -%}
      <li class="flex flex-col" {{ block.shopify_attributes }}>
        {% render 'icon', name: block.settings.icon, size: 22, class: 'mb-3 text-clay' %}
        <h3 class="font-display text-xl leading-snug tracking-[-0.01em] text-ink">{{ block.settings.label }}</h3>
        <p class="mt-2 max-w-[28ch] text-sm leading-relaxed text-ink-soft">{{ block.settings.body }}</p>
      </li>
    {%- endfor -%}
  </ul>
</section>

{% schema %}
{
  "name": "Value props",
  "tag": "section",
  "blocks": [
    {
      "type": "prop",
      "name": "Value prop",
      "settings": [
        { "type": "select", "id": "icon", "label": "Icon", "default": "sparkles", "options": [
          { "value": "sparkles", "label": "Sparkles" },
          { "value": "shield-check", "label": "Shield" },
          { "value": "truck", "label": "Truck" },
          { "value": "file-text", "label": "Document" }
        ] },
        { "type": "text", "id": "label", "label": "Label", "default": "Zorgvuldig geselecteerd" },
        { "type": "textarea", "id": "body", "label": "Body", "default": "Elk product is gekozen op design, kwaliteit en functie." }
      ]
    }
  ],
  "max_blocks": 4,
  "presets": [
    {
      "name": "Value props",
      "blocks": [
        { "type": "prop", "settings": { "icon": "sparkles", "label": "Zorgvuldig geselecteerd", "body": "Elk product is gekozen op design, kwaliteit en functie. Geen rommel, alleen mooie stukken." } },
        { "type": "prop", "settings": { "icon": "shield-check", "label": "Veilig verpakt", "body": "Glaswerk wordt zorgvuldig ingepakt met beschermingsmateriaal, zodat alles heel aankomt." } },
        { "type": "prop", "settings": { "icon": "truck", "label": "Verzonden vanuit NL", "body": "Bestellingen worden binnen 1–3 werkdagen verzonden vanuit Nederland." } },
        { "type": "prop", "settings": { "icon": "file-text", "label": "Eerlijke productinfo", "body": "Materiaal, afmetingen en inhoud staan altijd duidelijk vermeld. Geen verrassingen." } }
      ]
    }
  ]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/value-props.liquid assets/tailwind.css
git commit -m "feat: value props section"
```

---

### Task 5: FreshlyListed section

Grid of up to 8 product cards from a chosen collection (defaults to all products newest-first if none chosen).

**Files:**
- Create: `sections/freshly-listed.liquid`

- [ ] **Step 1: Create `sections/freshly-listed.liquid`**

```liquid
{%- liquid
  assign coll = section.settings.collection
  if coll != blank
    assign products = coll.products
  else
    assign products = collections.all.products
  endif
-%}
{%- if products.size > 0 -%}
  <section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
    <div class="flex items-end justify-between mb-10">
      <div>
        <p class="text-label text-clay mb-3">{{ section.settings.eyebrow }}</p>
        <h2 class="text-h2 font-display">{{ section.settings.heading }}</h2>
      </div>
      <a href="{{ section.settings.link_url | default: routes.all_products_collection_url }}" class="text-sm text-ink-soft hover:text-ink">{{ section.settings.link_label }} →</a>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
      {%- for product in products limit: 8 -%}
        {% render 'product-card', product: product, loading: 'lazy' %}
      {%- endfor -%}
    </div>
  </section>
{%- endif -%}

{% schema %}
{
  "name": "Freshly listed",
  "tag": "section",
  "settings": [
    { "type": "collection", "id": "collection", "label": "Collection", "info": "Defaults to all products if empty." },
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Net binnen" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Nieuw in de shop" },
    { "type": "text", "id": "link_label", "label": "Link label", "default": "Alles bekijken" },
    { "type": "text", "id": "link_url", "label": "Link URL", "default": "/collections/all" }
  ],
  "presets": [{ "name": "Freshly listed" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/freshly-listed.liquid assets/tailwind.css
git commit -m "feat: freshly listed product grid section"
```

---

### Task 6: CuratedEdit carousel + carousel JS

Collections carousel: scroll-snap track (cards duplicated for seamless drift), prev/next buttons, continuous auto-drift (reduced-motion safe).

**Files:**
- Create: `sections/curated-edit.liquid`
- Modify: `assets/theme.js`

- [ ] **Step 1: Append the carousel controller to `assets/theme.js`**

Add this as a SECOND IIFE at the very end of the file (after the existing drawer IIFE's closing `})();`):

```js
// ---- Curated carousel: prev/next + continuous drift -----------------------
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('[data-carousel-track]');
    if (!track) return;
    const step = () => Math.min(track.clientWidth * 0.8, 380);
    const prev = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

    if (reduce || track.dataset.autoscroll !== 'true') return;
    let paused = false;
    root.addEventListener('pointerenter', () => { paused = true; });
    root.addEventListener('pointerleave', () => { paused = false; });
    root.addEventListener('focusin', () => { paused = true; });
    root.addEventListener('focusout', () => { paused = false; });
    const half = () => track.scrollWidth / 2;
    const tick = () => {
      if (!paused) {
        track.scrollLeft += 0.5;
        if (track.scrollLeft >= half()) track.scrollLeft -= half();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
})();
```

- [ ] **Step 2: Create `sections/curated-edit.liquid`**

```liquid
{%- liquid
  assign edits = section.settings.collection_list
-%}
{%- if edits != blank and edits.size > 0 -%}
  <section class="py-20" data-carousel>
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <div class="mb-12 flex flex-wrap items-end justify-between gap-y-4">
        <div>
          <p class="text-label text-clay mb-3 flex items-center gap-3"><span aria-hidden="true" class="block h-px w-10 bg-clay/60"></span>{{ section.settings.eyebrow }}</p>
          <h2 class="font-display text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.05] tracking-[-0.02em]">{{ section.settings.heading }}</h2>
        </div>
        <div class="flex items-center gap-5">
          <div class="hidden items-center gap-2 md:flex">
            <button type="button" data-carousel-prev aria-label="Vorige collecties" class="grid h-10 w-10 place-items-center rounded-full border border-border-soft text-ink transition-colors duration-300 hover:border-ink hover:text-clay"><span aria-hidden="true" class="text-sm leading-none">←</span></button>
            <button type="button" data-carousel-next aria-label="Volgende collecties" class="grid h-10 w-10 place-items-center rounded-full border border-border-soft text-ink transition-colors duration-300 hover:border-ink hover:text-clay"><span aria-hidden="true" class="text-sm leading-none">→</span></button>
          </div>
          <a href="{{ section.settings.link_url | default: routes.collections_url }}" class="text-[11px] uppercase tracking-[0.22em] text-ink-soft hover:text-clay transition-colors border-b border-border-soft hover:border-clay pb-1">{{ section.settings.link_label }} →</a>
        </div>
      </div>
    </div>
    <div class="relative">
      <ul class="no-scrollbar flex gap-x-6 md:gap-x-8 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 sm:px-6 lg:px-10" data-carousel-track data-autoscroll="true">
        {%- for pass in (1..2) -%}
          {%- for c in edits -%}
            <li class="min-w-0 shrink-0 grow-0 basis-[80%] sm:basis-[46%] lg:basis-[31.5%] snap-start" {% if pass == 2 %}aria-hidden="true"{% endif %}>
              <a href="{{ c.url }}" class="group block focus-visible:outline-none" {% if pass == 2 %}tabindex="-1"{% endif %}>
                <div class="relative aspect-[4/5] overflow-hidden bg-cream">
                  {%- if c.featured_image -%}
                    {{ c.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', sizes: '(min-width:1024px) 32vw, (min-width:640px) 46vw, 80vw', alt: c.title, class: 'absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]' }}
                  {%- else -%}
                    <div aria-hidden="true" class="absolute inset-0 grid place-items-center text-center px-8" style="background:radial-gradient(70% 80% at 30% 20%, rgba(181,101,29,0.10), transparent 65%), linear-gradient(180deg, #F4ECE5, #EDE4DC);">
                      <div>
                        <span class="block text-[10px] uppercase tracking-[0.22em] text-stone mb-3">{{ forloop.index | prepend: '0' | slice: -2, 2 }} · Collectie</span>
                        <span class="font-display italic text-2xl leading-snug text-ink/70">{{ c.title }}</span>
                        <span aria-hidden="true" class="mx-auto mt-4 block h-px w-10 bg-stone-soft"></span>
                      </div>
                    </div>
                  {%- endif -%}
                  <span aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/55 via-ink/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
                  <span class="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-surface opacity-0 transition-all duration-500 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"><span class="block h-px w-6 bg-surface/70"></span>Bekijken</span>
                </div>
                <div class="mt-4 flex items-baseline justify-between gap-4">
                  <div>
                    <h3 class="font-display text-h3 leading-tight text-ink transition-colors group-hover:text-clay">{{ c.title }}</h3>
                    <p class="mt-1 text-sm text-ink-soft">{{ c.description | strip_html | truncate: 60 | default: 'Bekijk de collectie.' }}</p>
                  </div>
                  <span aria-hidden="true" class="mt-3 block h-px w-6 bg-border-soft transition-all duration-500 group-hover:w-14 group-hover:bg-clay/70 shrink-0"></span>
                </div>
              </a>
            </li>
          {%- endfor -%}
        {%- endfor -%}
      </ul>
    </div>
  </section>
{%- endif -%}

{% schema %}
{
  "name": "Curated edit",
  "tag": "section",
  "settings": [
    { "type": "collection_list", "id": "collection_list", "label": "Collections", "limit": 12 },
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Collecties" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Voor elke hoek van je huis." },
    { "type": "text", "id": "link_label", "label": "Link label", "default": "Alle collecties" },
    { "type": "text", "id": "link_url", "label": "Link URL", "default": "/collections" }
  ],
  "presets": [{ "name": "Curated edit" }]
}
{% endschema %}
```

- [ ] **Step 3: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/curated-edit.liquid assets/theme.js assets/tailwind.css
git commit -m "feat: curated edit collections carousel"
```

---

### Task 7: FounderNote section

**Files:**
- Create: `sections/founder-note.liquid`

- [ ] **Step 1: Create `sections/founder-note.liquid`**

```liquid
{%- liquid
  assign s = section.settings
-%}
<section class="bg-cream">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-24 grid gap-12 md:grid-cols-[1fr_2fr] items-center">
    <div class="aspect-[4/5] max-w-sm bg-stone-soft/20 overflow-hidden">
      {%- if s.image != blank -%}
        {{ s.image | image_url: width: 800 | image_tag: loading: 'lazy', sizes: '(min-width:768px) 33vw, 100vw', alt: s.image.alt | default: 'Zayna Home', class: 'h-full w-full object-cover' }}
      {%- else -%}
        <div class="h-full w-full grid place-items-center text-ink-soft text-sm">Portrait</div>
      {%- endif -%}
    </div>
    <div>
      <p class="text-label text-clay mb-4">{{ s.eyebrow }}</p>
      <h2 class="text-3xl md:text-4xl font-display mb-6">{{ s.heading }}</h2>
      <div class="text-ink-soft leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 rich-text">{{ s.body }}</div>
      <p class="mt-8 font-signature text-3xl text-ink">— {{ s.signature }}</p>
    </div>
  </div>
</section>

{% schema %}
{
  "name": "Founder note",
  "tag": "section",
  "settings": [
    { "type": "image_picker", "id": "image", "label": "Portrait image" },
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Welkom" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Mooi dat je er bent." },
    { "type": "richtext", "id": "body", "label": "Body", "default": "<p>Zayna Home is een Nederlandse webshop voor stijlvolle keuken- en woonproducten — gekozen op design, kwaliteit en functie.</p><p>Van glaswerk en voorraadpotten tot kruidenpotten met labels en slimme keukentools. Producten die mooi staan én dagelijks meegaan, zorgvuldig verpakt en verzonden vanuit Nederland.</p><p>Veel plezier met rondkijken.</p>" },
    { "type": "text", "id": "signature", "label": "Signature", "default": "Zayna" }
  ],
  "presets": [{ "name": "Founder note" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/founder-note.liquid assets/tailwind.css
git commit -m "feat: founder note section"
```

---

### Task 8: JournalTeaser section

Two latest articles from a chosen blog.

**Files:**
- Create: `sections/journal-teaser.liquid`

- [ ] **Step 1: Create `sections/journal-teaser.liquid`**

```liquid
{%- liquid
  assign blog_obj = blogs[section.settings.blog]
-%}
{%- if blog_obj.articles.size > 0 -%}
  <section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-20">
    <div class="flex items-end justify-between mb-10">
      <div>
        <p class="text-label text-ink-soft mb-3">{{ section.settings.eyebrow }}</p>
        <h2 class="text-3xl md:text-4xl font-display">{{ section.settings.heading }}</h2>
      </div>
      <a href="{{ blog_obj.url }}" class="text-sm text-ink-soft hover:text-ink">{{ section.settings.link_label }} →</a>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      {%- for article in blog_obj.articles limit: 2 -%}
        <a href="{{ article.url }}" class="group block transition-soft active:scale-[0.98] focus-visible:outline-none">
          <div class="relative aspect-[3/2] overflow-hidden bg-cream">
            {%- if article.image -%}
              {{ article.image | image_url: width: 900 | image_tag: loading: 'lazy', sizes: '(min-width:768px) 46vw, 100vw', alt: article.image.alt | default: article.title, class: 'h-full w-full object-cover transition-soft group-hover:scale-[1.02]' }}
            {%- endif -%}
          </div>
          <div class="mt-4">
            <h3 class="font-display text-h3">{{ article.title }}</h3>
            {%- if article.excerpt != blank -%}
              <p class="mt-2 text-sm text-ink-soft line-clamp-2">{{ article.excerpt | strip_html }}</p>
            {%- endif -%}
          </div>
        </a>
      {%- endfor -%}
    </div>
  </section>
{%- endif -%}

{% schema %}
{
  "name": "Journal teaser",
  "tag": "section",
  "settings": [
    { "type": "blog", "id": "blog", "label": "Blog" },
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Journal" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Nieuwste artikelen" },
    { "type": "text", "id": "link_label", "label": "Link label", "default": "Alle artikelen" }
  ],
  "presets": [{ "name": "Journal teaser" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/journal-teaser.liquid assets/tailwind.css
git commit -m "feat: journal teaser section"
```

---

### Task 9: Newsletter section

Uses Shopify's `{% form 'customer' %}` for email marketing signup.

**Files:**
- Create: `sections/newsletter.liquid`

- [ ] **Step 1: Create `sections/newsletter.liquid`**

```liquid
{%- liquid
  assign s = section.settings
-%}
<section aria-labelledby="newsletter-heading" class="relative isolate overflow-hidden bg-ink text-surface">
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 opacity-[0.08]" style="background:radial-gradient(50% 60% at 80% 20%, rgba(181,101,29,0.65), transparent 60%), radial-gradient(60% 70% at 10% 90%, rgba(138,154,123,0.5), transparent 65%);"></div>
  <div class="relative mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:px-10 lg:py-28">
    <div>
      <p class="text-label mb-4 flex items-center gap-3 text-clay"><span aria-hidden="true" class="block h-px w-10 bg-clay/70"></span>{{ s.eyebrow }}</p>
      <h2 id="newsletter-heading" class="font-display text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.05] tracking-[-0.02em]">{{ s.heading }}</h2>
      <p class="mt-5 max-w-[44ch] text-base leading-relaxed text-surface/80">{{ s.body }}</p>
    </div>
    {%- form 'customer', class: 'flex flex-col justify-end' -%}
      <input type="hidden" name="contact[tags]" value="newsletter">
      <label for="newsletter-email" class="mb-3 text-[10px] uppercase tracking-[0.22em] text-surface/70">{{ s.field_label }}</label>
      {%- if form.posted_successfully? -%}
        <p class="text-sm text-surface">{{ s.success | default: 'Bedankt voor je inschrijving!' }}</p>
      {%- else -%}
        <div class="flex flex-col gap-3 sm:flex-row">
          <input id="newsletter-email" type="email" name="contact[email]" required autocomplete="email" placeholder="{{ s.placeholder }}" class="flex-1 border-b border-surface/40 bg-transparent px-1 py-3 text-base text-surface placeholder:text-surface/40 focus:border-clay focus:outline-none">
          <button type="submit" class="group inline-flex items-center justify-center gap-3 bg-surface px-7 py-3 text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:bg-cream">{{ s.submit_label }}<span aria-hidden="true" class="text-base leading-none transition-transform group-hover:translate-x-1">→</span></button>
        </div>
        <p class="mt-4 text-[11px] leading-relaxed text-surface/55">{{ s.disclaimer }}</p>
      {%- endif -%}
    {%- endform -%}
  </div>
</section>

{% schema %}
{
  "name": "Newsletter",
  "tag": "section",
  "settings": [
    { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "Nieuwsbrief" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Ontvang nieuwe producten als eerste." },
    { "type": "textarea", "id": "body", "label": "Body", "default": "Schrijf je in en ontvang updates over nieuwe collecties, styling-tips en aanbiedingen. Geen spam, altijd uit te schrijven." },
    { "type": "text", "id": "field_label", "label": "Field label", "default": "E-mailadres" },
    { "type": "text", "id": "placeholder", "label": "Placeholder", "default": "jij@voorbeeld.nl" },
    { "type": "text", "id": "submit_label", "label": "Submit label", "default": "Inschrijven" },
    { "type": "textarea", "id": "disclaimer", "label": "Disclaimer", "default": "Door je in te schrijven ga je akkoord met het ontvangen van e-mails van Zayna Home. Je gegevens worden niet gedeeld." }
  ],
  "presets": [{ "name": "Newsletter" }]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add sections/newsletter.liquid assets/tailwind.css
git commit -m "feat: newsletter section"
```

---

### Task 10: index.json template + remove placeholder

**Files:**
- Modify: `templates/index.json`
- Delete: `sections/placeholder.liquid`

- [ ] **Step 1: Replace `templates/index.json`**

```json
{
  "sections": {
    "hero": { "type": "hero", "settings": {} },
    "value-props": {
      "type": "value-props",
      "blocks": {
        "p1": { "type": "prop", "settings": { "icon": "sparkles", "label": "Zorgvuldig geselecteerd", "body": "Elk product is gekozen op design, kwaliteit en functie. Geen rommel, alleen mooie stukken." } },
        "p2": { "type": "prop", "settings": { "icon": "shield-check", "label": "Veilig verpakt", "body": "Glaswerk wordt zorgvuldig ingepakt met beschermingsmateriaal, zodat alles heel aankomt." } },
        "p3": { "type": "prop", "settings": { "icon": "truck", "label": "Verzonden vanuit NL", "body": "Bestellingen worden binnen 1–3 werkdagen verzonden vanuit Nederland." } },
        "p4": { "type": "prop", "settings": { "icon": "file-text", "label": "Eerlijke productinfo", "body": "Materiaal, afmetingen en inhoud staan altijd duidelijk vermeld. Geen verrassingen." } }
      },
      "block_order": ["p1", "p2", "p3", "p4"]
    },
    "freshly-listed": { "type": "freshly-listed", "settings": {} },
    "curated-edit": { "type": "curated-edit", "settings": {} },
    "founder-note": { "type": "founder-note", "settings": {} },
    "journal-teaser": { "type": "journal-teaser", "settings": { "blog": "journal" } },
    "newsletter": { "type": "newsletter", "settings": {} }
  },
  "order": ["hero", "value-props", "freshly-listed", "curated-edit", "founder-note", "journal-teaser", "newsletter"]
}
```

- [ ] **Step 2: Delete the now-unused placeholder section**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && rm sections/placeholder.liquid
```

- [ ] **Step 3: Build + theme check + commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && node -e "JSON.parse(require('fs').readFileSync('templates/index.json')); console.log('valid')" && npx shopify theme check 2>&1 | grep -iE 'offense|error' | tail -1
git add templates/index.json sections/placeholder.liquid assets/tailwind.css
git commit -m "feat: homepage index.json with all home sections; drop placeholder"
```
Expected: JSON valid; 0 errors.

---

### Task 11: Live preview parity (controller-run)

- [ ] Boot `shopify theme dev` and verify against https://zaynahome.nl: hero (typographic until a hero image is set), value props row, "Nieuw in de shop" product grid (cards with hover image swap, badges, prices), collections carousel (drifts, pauses on hover, prev/next work), founder note, journal teaser (needs a `journal` blog with articles), newsletter form. Merchant config notes: set Hero image, CuratedEdit collection_list, FreshlyListed collection, FounderNote portrait, JournalTeaser blog in the theme editor for full parity.

---

## Definition of done (Milestone 3)
- `npm run build:css` + `npx shopify theme check` clean (≤3 known false-positive warnings).
- Homepage renders all 7 sections in order via `index.json`; placeholder removed.
- `product-card` snippet renders image hover-swap, condition/bestseller/new badges, sold overlay, price fallback.
- Carousel drifts and is controllable; reduced-motion disables drift.
- Newsletter posts via `{% form 'customer' %}`.
- Committed on `feat/milestone-3-home`.

## Hand-off to Milestone 4 (Product)
Builds `main-product` (gallery, info, price, buy buttons, features, faq, care-shipping, trust-badges, zayna-note, sticky-atc blocks) + related-products, reusing `product-card`, `icon`, and the metafield-reading patterns established here.
```
