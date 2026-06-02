# Milestone 2 — Global Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce the Zayna Home global chrome — announcement marquee, sticky header with desktop nav + mega menu, mobile menu drawer, footer, payment icons, and a Markets language/currency switcher — as editable OS 2.0 sections, so every page is framed exactly like the live Hydrogen site.

**Architecture:** Two section groups already referenced by `layout/theme.liquid` get filled in: `header-group.json` (announcement-bar + header sections) and `footer-group.json` (footer section). Navigation is Shopify-menu-driven (`main-menu`, `footer` linklists) with section settings/blocks supplying the mega-panel extras. A small vanilla controller in `assets/theme.js` drives the mobile/search/cart drawers using the `.overlay` CSS shipped in Milestone 1. Icons come from a new `snippets/icon.liquid` (inline lucide SVG paths). All visible strings route through `locales/*.json`.

**Tech Stack:** Liquid (OS 2.0 sections, section groups, blocks, linklists, `localization` form), Tailwind v4 utility classes, vanilla JS.

**Plan series context:** Plan 2 of 10. Builds on Milestone 1 (`docs/.../2026-06-03-milestone-1-foundation.md`): reuses the `@theme` tokens, the `.overlay`/`.marquee`/`mega-reveal`/`mobile-menu-item-in` CSS, the `{% schema %}` convention from `placeholder.liquid`, and the `{{ '…' | t }}` locale pattern.

**Verification model:** Same as Milestone 1 — no unit runner. Each task verifies via `npm run build:css` (exit 0), `npx shopify theme check` (0 errors), and at the end a `shopify theme dev` visual parity pass. Run all commands from `/Users/altugsogutoglu/Herd/zayna-theme`. Work on branch `feat/milestone-2-global-chrome` (the controller creates it before Task 1).

**Source of truth for 1:1 content** (from the Hydrogen app, already extracted — do not re-derive):
- Announcement messages (Dutch), in order: `Gratis verzending vanaf €100`, `Voor 23:00 besteld, morgen verzonden`, `Met zorg ingepakt vanuit Nederland`. Free-shipping threshold = 100 EUR.
- Header nav source: `main-menu` linklist. Logo = shop name in `font-display text-2xl`. CTAs order (right): mobile-menu toggle (mobile only), account link (desktop only, `/account`, label "Inloggen"/"Account"), search toggle, cart toggle (badge = `cart.item_count`).
- Mega panels in the live site: **Shop** (eyebrow "De collectie", italic blurb "Stijlvol, praktisch en zorgvuldig geselecteerd. Verzonden vanuit Nederland.", edits = child collection links, CTA "Alle collecties bekijken" → /collections, featured "Nieuw deze week", aside "Klantenservice": Verzending `/policies/shipping-policy`, Retourneren `/policies/refund-policy`, Contact `/pages/contact`) and **Journal** (edits: Alle artikelen `/blogs/journal`, etc., featured "Lees mee").
- Footer columns: brand blurb ("Stijlvolle keuken- en woonproducten, zorgvuldig geselecteerd en verzonden vanuit Nederland."), **Klantenservice** (footer linklist + "Track jouw order" `/pages/track-order`), **Juridisch** (Algemene voorwaarden `/policies/terms-of-service`, Privacybeleid `/policies/privacy-policy`, Retourbeleid `/policies/refund-policy`, Verzending `/policies/shipping-policy`), **Contact** (`mailto:info@zaynahome.nl`, Instagram `https://www.instagram.com/zaynahome.nl`). Bottom bar: payment icons, business IDs (KvK `97745200`, BTW `NL005285507B86`), `© <year> Zayna Home`, language switcher.
- Payment methods, in order: ideal, bancontact, klarna, visa, mastercard.

---

### Task 0: Branch + locale strings for chrome

**Files:**
- Modify: `locales/nl.default.json`
- Modify: `locales/en.json`

- [ ] **Step 1: Create the branch**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && git checkout -b feat/milestone-2-global-chrome && git branch --show-current
```
Expected: prints `feat/milestone-2-global-chrome`.

- [ ] **Step 2: Add chrome strings to `locales/nl.default.json`**

Merge these keys into the existing JSON (keep existing keys; add a top-level `"layout"` object and extend `"general"`). The full file becomes:

```json
{
  "general": {
    "accessibility": {
      "skip_to_content": "Ga naar inhoud",
      "close": "Sluiten",
      "menu": "Menu",
      "open_menu": "Menu openen",
      "search": "Zoeken",
      "cart": "Winkelmand",
      "account": "Account",
      "instagram": "Instagram"
    },
    "search": {
      "title": "Zoeken",
      "placeholder": "Zoek in de collectie",
      "submit": "Zoek"
    },
    "cart": {
      "title": "Winkelmand",
      "empty": "Je winkelwagen is leeg",
      "checkout": "Afrekenen"
    },
    "newsletter": {
      "heading": "Blijf op de hoogte",
      "submit": "Inschrijven"
    },
    "404": {
      "title": "Pagina niet gevonden",
      "subtext": "De pagina die je zocht bestaat niet meer.",
      "link": "Terug naar home"
    }
  },
  "layout": {
    "header": {
      "login": "Inloggen",
      "account": "Account",
      "all_collections": "Alle collecties"
    },
    "footer": {
      "service": "Klantenservice",
      "legal": "Juridisch",
      "contact": "Contact",
      "track_order": "Track jouw order",
      "language": "Taal",
      "currency": "Valuta"
    }
  },
  "products": {
    "product": {
      "add_to_cart": "In winkelwagen",
      "sold_out": "Uitverkocht",
      "unavailable": "Niet beschikbaar",
      "price": "Prijs"
    }
  }
}
```

- [ ] **Step 3: Add the same keys (English) to `locales/en.json`**

```json
{
  "general": {
    "accessibility": {
      "skip_to_content": "Skip to content",
      "close": "Close",
      "menu": "Menu",
      "open_menu": "Open menu",
      "search": "Search",
      "cart": "Cart",
      "account": "Account",
      "instagram": "Instagram"
    },
    "search": {
      "title": "Search",
      "placeholder": "Search the collection",
      "submit": "Search"
    },
    "cart": {
      "title": "Cart",
      "empty": "Your cart is empty",
      "checkout": "Checkout"
    },
    "newsletter": {
      "heading": "Stay in the loop",
      "submit": "Subscribe"
    },
    "404": {
      "title": "Page not found",
      "subtext": "The page you were looking for no longer exists.",
      "link": "Back to home"
    }
  },
  "layout": {
    "header": {
      "login": "Log in",
      "account": "Account",
      "all_collections": "All collections"
    },
    "footer": {
      "service": "Customer service",
      "legal": "Legal",
      "contact": "Contact",
      "track_order": "Track your order",
      "language": "Language",
      "currency": "Currency"
    }
  },
  "products": {
    "product": {
      "add_to_cart": "Add to cart",
      "sold_out": "Sold out",
      "unavailable": "Unavailable",
      "price": "Price"
    }
  }
}
```

- [ ] **Step 4: Validate and commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && node -e "JSON.parse(require('fs').readFileSync('locales/nl.default.json')); JSON.parse(require('fs').readFileSync('locales/en.json')); console.log('valid')"
git add locales/nl.default.json locales/en.json
git commit -m "feat: add chrome locale strings (header, footer)"
```
Expected: prints `valid`, commit succeeds.

---

### Task 1: Icon snippet (inline lucide SVGs)

**Files:**
- Create: `snippets/icon.liquid`

- [ ] **Step 1: Create `snippets/icon.liquid`**

Renders a lucide-style inline SVG. Usage: `{% render 'icon', name: 'search', size: 20 %}`. Default size 20, stroke 1.5, `aria-hidden`.

```liquid
{%- liquid
  assign icon_size = size | default: 20
  assign icon_stroke = stroke | default: 1.5
-%}
<svg xmlns="http://www.w3.org/2000/svg" width="{{ icon_size }}" height="{{ icon_size }}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{{ icon_stroke }}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{% if class %} class="{{ class }}"{% endif %}>
  {%- case name -%}
    {%- when 'search' -%}
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    {%- when 'shopping-bag' -%}
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
    {%- when 'menu' -%}
      <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
    {%- when 'user' -%}
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    {%- when 'mail' -%}
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    {%- when 'arrow-right' -%}
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    {%- when 'instagram' -%}
      <rect width="20" height="20" x="2" y="2" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
    {%- when 'x' -%}
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    {%- when 'loader' -%}
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  {%- endcase -%}
</svg>
```

- [ ] **Step 2: Build + theme check + commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -2
git add snippets/icon.liquid assets/tailwind.css
git commit -m "feat: inline lucide icon snippet"
```
Expected: build exits 0; theme check 0 errors.

---

### Task 2: Announcement bar section

Marquee of editable messages. The live site has 3 messages repeated; we expose them as `message` blocks and render two duplicated halves so the CSS `translateX(-50%)` loop is seamless. Reduced-motion and `sr-only` handling come from the Milestone-1 `.marquee` CSS.

**Files:**
- Create: `sections/announcement-bar.liquid`

- [ ] **Step 1: Create `sections/announcement-bar.liquid`**

```liquid
{%- if section.blocks.size > 0 -%}
  <div class="bg-ink text-surface">
    <div class="marquee py-2.5">
      <div class="marquee__track text-[11px] uppercase tracking-[0.18em]" aria-hidden="true">
        {%- for i in (1..2) -%}
          {%- for block in section.blocks -%}
            <span class="flex items-center whitespace-nowrap" {{ block.shopify_attributes }}>
              {{ block.settings.text }}
              <span aria-hidden="true" class="mx-6 inline-block h-[5px] w-[5px] shrink-0 rotate-45 bg-clay/80 align-middle"></span>
            </span>
          {%- endfor -%}
        {%- endfor -%}
      </div>
      <p class="sr-only">
        {%- for block in section.blocks -%}{{ block.settings.text }}. {% endfor -%}
      </p>
    </div>
  </div>
{%- endif -%}

{% schema %}
{
  "name": "Announcement bar",
  "tag": "section",
  "blocks": [
    {
      "type": "message",
      "name": "Message",
      "settings": [
        { "type": "text", "id": "text", "label": "Text", "default": "Gratis verzending vanaf €100" }
      ]
    }
  ],
  "max_blocks": 6,
  "presets": [
    {
      "name": "Announcement bar",
      "blocks": [
        { "type": "message", "settings": { "text": "Gratis verzending vanaf €100" } },
        { "type": "message", "settings": { "text": "Voor 23:00 besteld, morgen verzonden" } },
        { "type": "message", "settings": { "text": "Met zorg ingepakt vanuit Nederland" } }
      ]
    }
  ]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -2
git add sections/announcement-bar.liquid assets/tailwind.css
git commit -m "feat: announcement bar marquee section"
```
Expected: build 0; theme check 0 errors.

---

### Task 3: Header section (logo, desktop nav, CTAs, cart badge) + mega menu

Sticky header. Desktop nav from `main-menu`. Top-level items WITH child links render a hover mega-panel; items without render a plain underline-grow link. Mega-panel "edits" = the item's child links; the italic blurb, CTA, featured collection, and aside links come from per-item `mega_panel` blocks matched by the item's title (case-insensitive). CTAs: mobile toggle, account, search, cart.

**Files:**
- Create: `sections/header.liquid`

- [ ] **Step 1: Create `sections/header.liquid`**

```liquid
{%- liquid
  assign menu = section.settings.menu
-%}
<header
  class="sticky top-0 z-30 border-b border-border-soft bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75"
  data-header
>
  <div class="mx-auto flex h-[var(--header-height)] max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-10">
    <a href="{{ routes.root_url }}" class="shrink-0">
      <span class="font-display text-2xl tracking-tight text-ink">{{ shop.name }}</span>
    </a>

    <nav aria-label="Hoofdnavigatie" class="hidden md:flex items-center gap-7" data-nav>
      {%- for link in linklists[menu].links -%}
        {%- assign panel_key = link.title | downcase | strip -%}
        {%- if link.links.size > 0 -%}
          <div class="group/mega relative" data-mega-item>
            <a href="{{ link.url }}" class="group relative inline-flex items-center py-2" aria-haspopup="true">
              <span class="text-[11px] uppercase tracking-[0.2em] transition-colors text-ink-soft group-hover:text-ink">{{ link.title }}</span>
              <span aria-hidden="true" class="absolute inset-x-0 -bottom-0.5 block h-px origin-left bg-clay transition-transform duration-300 ease-out scale-x-0 group-hover:scale-x-100"></span>
            </a>
            {%- comment -%} Mega panel — revealed on hover/focus of the parent item {%- endcomment -%}
            {%- assign panel_block = null -%}
            {%- for block in section.blocks -%}
              {%- assign bk = block.settings.nav_title | downcase | strip -%}
              {%- if block.type == 'mega_panel' and bk == panel_key -%}
                {%- assign panel_block = block -%}
              {%- endif -%}
            {%- endfor -%}
            <div
              role="region"
              aria-label="{{ link.title }}"
              class="invisible absolute inset-x-0 top-full z-40 opacity-0 transition-[opacity,visibility] duration-200 group-hover/mega:visible group-hover/mega:opacity-100 group-focus-within/mega:visible group-focus-within/mega:opacity-100"
              data-mega-panel
            >
              <div class="border-y border-border-soft bg-bg/98 shadow-[0_24px_60px_-30px_rgba(42,37,32,0.35)] backdrop-blur supports-[backdrop-filter]:bg-bg/95">
                <div class="mx-auto grid max-w-7xl grid-cols-12 gap-x-10 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
                  <div class="col-span-3">
                    <p class="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-clay">
                      <span aria-hidden="true" class="block h-px w-8 bg-clay/60"></span>
                      {{ panel_block.settings.eyebrow | default: link.title }}
                    </p>
                    {%- if panel_block.settings.blurb != blank -%}
                      <p class="font-display italic text-lg leading-relaxed text-stone max-w-[28ch]">{{ panel_block.settings.blurb }}</p>
                    {%- endif -%}
                    {%- if panel_block.settings.aside_heading != blank -%}
                      <div class="mt-10">
                        <p class="mb-3 text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ panel_block.settings.aside_heading }}</p>
                        <ul class="space-y-2">
                          {%- if panel_block.settings.aside_menu != blank -%}
                            {%- for l in linklists[panel_block.settings.aside_menu].links -%}
                              <li><a href="{{ l.url }}" class="text-[13px] text-ink-soft hover:text-clay transition-colors">{{ l.title }}</a></li>
                            {%- endfor -%}
                          {%- endif -%}
                        </ul>
                      </div>
                    {%- endif -%}
                  </div>

                  <div class="col-span-5">
                    <p class="mb-6 text-[10px] uppercase tracking-[0.22em] text-stone-soft">Bekijken</p>
                    <ul class="-mx-3">
                      {%- for child in link.links -%}
                        <li>
                          <a href="{{ child.url }}" class="group flex items-center justify-between gap-4 rounded-sm px-3 py-3 transition-colors hover:bg-cream/60">
                            <span class="min-w-0">
                              <span class="block font-display text-[clamp(1.05rem,1.1vw,1.2rem)] leading-snug text-ink transition-colors group-hover:text-clay">{{ child.title }}</span>
                            </span>
                            <span aria-hidden="true" class="shrink-0 text-stone-soft transition-all duration-300 group-hover:translate-x-1 group-hover:text-clay">→</span>
                          </a>
                        </li>
                      {%- endfor -%}
                    </ul>
                    {%- if panel_block.settings.cta_text != blank -%}
                      <a href="{{ panel_block.settings.cta_url | default: routes.collections_url }}" class="group mt-5 inline-flex items-center gap-3 border-t border-border-soft pt-5 text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:text-clay">
                        <span>{{ panel_block.settings.cta_text }}</span>
                        <span aria-hidden="true" class="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </a>
                    {%- endif -%}
                  </div>

                  <div class="col-span-4">
                    {%- assign fc = panel_block.settings.featured_collection -%}
                    {%- if panel_block.settings.featured_title != blank -%}
                      <a href="{% if fc != blank %}{{ fc.url }}{% else %}{{ panel_block.settings.cta_url | default: routes.collections_url }}{% endif %}" class="group relative block overflow-hidden bg-cream">
                        <div class="relative aspect-[4/5] w-full overflow-hidden">
                          {%- if fc != blank and fc.featured_image -%}
                            {{ fc.featured_image | image_url: width: 600 | image_tag: loading: 'lazy', class: 'absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]', alt: fc.title }}
                          {%- else -%}
                            <span aria-hidden="true" class="absolute inset-0" style="background:radial-gradient(70% 90% at 30% 20%, rgba(181,101,29,0.12), transparent 65%), radial-gradient(60% 70% at 80% 80%, rgba(138,154,123,0.16), transparent 60%), linear-gradient(180deg, #F4ECE5, #E8E1DA);"></span>
                          {%- endif -%}
                          <span aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/60 via-ink/15 to-transparent"></span>
                          <div class="absolute inset-x-6 bottom-6 text-surface">
                            <p class="mb-2 text-[10px] uppercase tracking-[0.22em] opacity-90">Uitgelicht</p>
                            <p class="font-display text-2xl leading-tight">{{ panel_block.settings.featured_title }}</p>
                            {%- if panel_block.settings.featured_body != blank -%}
                              <p class="mt-2 max-w-[28ch] text-[13px] leading-relaxed opacity-90">{{ panel_block.settings.featured_body }}</p>
                            {%- endif -%}
                          </div>
                        </div>
                      </a>
                    {%- endif -%}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {%- else -%}
          <a href="{{ link.url }}" class="group relative py-2">
            <span class="text-[11px] uppercase tracking-[0.2em] transition-colors {% if link.active %}text-ink{% else %}text-ink-soft group-hover:text-ink{% endif %}">{{ link.title }}</span>
            <span aria-hidden="true" class="absolute inset-x-0 -bottom-0.5 block h-px origin-left bg-clay transition-transform duration-300 ease-out {% if link.active %}scale-x-100{% else %}scale-x-0 group-hover:scale-x-100{% endif %}"></span>
          </a>
        {%- endif -%}
      {%- endfor -%}
    </nav>

    <nav class="ml-auto flex items-center gap-3 sm:gap-4" aria-label="{{ 'general.accessibility.menu' | t }}">
      <button type="button" class="md:hidden p-2 -m-2 text-ink" aria-label="{{ 'general.accessibility.open_menu' | t }}" data-aside-open="mobile">
        {% render 'icon', name: 'menu', size: 22 %}
      </button>
      <a href="{{ routes.account_url }}" aria-label="{{ 'layout.header.login' | t }}" class="hidden md:inline-flex p-2 -m-2 text-ink hover:text-clay transition-colors rounded">
        {% render 'icon', name: 'user', size: 20 %}
      </a>
      <button type="button" class="p-2 -m-2 text-ink hover:text-clay transition-colors rounded" aria-label="{{ 'general.accessibility.search' | t }}" data-aside-open="search">
        {% render 'icon', name: 'search', size: 20 %}
      </button>
      <a href="{{ routes.cart_url }}" class="relative p-2 -m-2 text-ink hover:text-clay transition-colors rounded" aria-label="{{ 'general.accessibility.cart' | t }}" data-aside-open="cart">
        {% render 'icon', name: 'shopping-bag', size: 20 %}
        <span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-clay text-[10px] font-medium text-surface flex items-center justify-center tabular-nums {% if cart == empty or cart.item_count == 0 %}hidden{% endif %}" data-cart-count>{{ cart.item_count }}</span>
      </a>
    </nav>
  </div>
</header>

{% schema %}
{
  "name": "Header",
  "tag": "section",
  "settings": [
    { "type": "link_list", "id": "menu", "label": "Menu", "default": "main-menu" }
  ],
  "blocks": [
    {
      "type": "mega_panel",
      "name": "Mega panel",
      "settings": [
        { "type": "text", "id": "nav_title", "label": "Matches nav item titled", "info": "Case-insensitive match against a top-level menu item that has sub-links.", "default": "Shop" },
        { "type": "text", "id": "eyebrow", "label": "Eyebrow", "default": "De collectie" },
        { "type": "textarea", "id": "blurb", "label": "Blurb", "default": "Stijlvol, praktisch en zorgvuldig geselecteerd. Verzonden vanuit Nederland." },
        { "type": "text", "id": "cta_text", "label": "CTA text", "default": "Alle collecties bekijken" },
        { "type": "url", "id": "cta_url", "label": "CTA link" },
        { "type": "header", "content": "Featured tile" },
        { "type": "text", "id": "featured_title", "label": "Featured title", "default": "Nieuw deze week" },
        { "type": "textarea", "id": "featured_body", "label": "Featured body", "default": "Net binnen — onze nieuwste producten voor je keuken en huis." },
        { "type": "collection", "id": "featured_collection", "label": "Featured collection (image)" },
        { "type": "header", "content": "Aside" },
        { "type": "text", "id": "aside_heading", "label": "Aside heading", "default": "Klantenservice" },
        { "type": "link_list", "id": "aside_menu", "label": "Aside menu" }
      ]
    }
  ],
  "max_blocks": 4,
  "presets": [
    {
      "name": "Header",
      "blocks": [
        { "type": "mega_panel", "settings": { "nav_title": "Shop", "eyebrow": "De collectie", "cta_text": "Alle collecties bekijken", "featured_title": "Nieuw deze week", "aside_heading": "Klantenservice" } }
      ]
    }
  ]
}
{% endschema %}
```

- [ ] **Step 2: Build + theme check + commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -2
git add sections/header.liquid assets/tailwind.css
git commit -m "feat: header section with menu-driven nav and mega panel"
```
Expected: build 0; theme check 0 errors.

---

### Task 4: Drawer controller in theme.js + aside snippet + mobile menu

Replace the Milestone-1 `assets/theme.js` stub with a drawer controller, add a reusable `aside` snippet (the `.overlay` + slide-in `<aside>` shell), and a `mobile-menu` snippet for the mobile drawer body. Update `layout/theme.liquid` to render the three asides (mobile=real body, search/cart=placeholder bodies for Milestones 6 & 7) and remove the old `#CartDrawer` div.

**Files:**
- Modify: `assets/theme.js`
- Create: `snippets/aside.liquid`
- Create: `snippets/mobile-menu.liquid`
- Modify: `layout/theme.liquid`

- [ ] **Step 1: Replace `assets/theme.js`**

```js
// Zayna Home theme entry point.
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  // ---- Drawer / aside controller -------------------------------------------
  // Triggers:  [data-aside-open="mobile|search|cart"]
  // Asides:    .overlay[data-aside="mobile|search|cart"]
  // Close:     [data-aside-close], backdrop .close-outside, Escape
  function getOverlay(type) {
    return document.querySelector('.overlay[data-aside="' + type + '"]');
  }
  function openAside(type) {
    const overlay = getOverlay(type);
    if (!overlay) return;
    overlay.classList.add('expanded');
    const focusable = overlay.querySelector('input, button, a, [tabindex]');
    if (focusable) focusable.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('aside:open', { detail: { type } }));
  }
  function closeAside(overlay) {
    if (!overlay) return;
    overlay.classList.remove('expanded');
  }
  function closeAll() {
    document.querySelectorAll('.overlay.expanded').forEach(closeAside);
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-aside-open]');
    if (opener) {
      e.preventDefault();
      openAside(opener.getAttribute('data-aside-open'));
      return;
    }
    if (e.target.closest('[data-aside-close]') || e.target.classList.contains('close-outside')) {
      e.preventDefault();
      closeAll();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
})();
```

- [ ] **Step 2: Create `snippets/aside.liquid`**

Reusable overlay + slide-in panel. Params: `type`, `heading`. Body is provided by the caller via the `{%- capture -%}` pattern: callers pass pre-rendered HTML in a variable named `aside_body`.

```liquid
<div class="overlay" data-aside="{{ type }}" role="dialog" aria-modal="true" aria-label="{{ heading }}">
  <button type="button" class="close-outside" aria-label="{{ 'general.accessibility.close' | t }}" data-aside-close></button>
  <aside class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border-soft px-5 md:px-6 h-[var(--header-height)] shrink-0">
      <span class="text-label text-ink">{{ heading }}</span>
      <button type="button" class="p-2 -m-2 text-ink hover:text-clay transition-colors" aria-label="{{ 'general.accessibility.close' | t }}" data-aside-close>
        {% render 'icon', name: 'x', size: 20 %}
      </button>
    </header>
    <div class="flex-1 overflow-y-auto overscroll-contain">
      {{ aside_body }}
    </div>
  </aside>
</div>
```

- [ ] **Step 3: Create `snippets/mobile-menu.liquid`**

Mobile drawer body — Home + menu items as large display links, then a collections grid (child links of the first mega item, falling back to none), then account/search/contact rows, then footer note. Uses `main-menu`.

```liquid
{%- liquid
  assign menu = section_menu | default: 'main-menu'
-%}
<div class="flex h-full flex-col bg-bg">
  <nav aria-label="Hoofdnavigatie" class="relative px-6 pt-8 pb-2 sm:px-8">
    <p class="mb-5 text-[10px] uppercase tracking-[0.22em] text-stone-soft">{{ 'general.accessibility.menu' | t }}</p>
    <ul class="space-y-1">
      <li>
        <a href="{{ routes.root_url }}" data-aside-close class="group block border-b border-border-soft/70 py-4 font-display text-[clamp(2rem,7vw,2.75rem)] leading-[1.05] tracking-[-0.015em] transition-colors {% if request.page_type == 'index' %}text-clay{% else %}text-ink hover:text-clay{% endif %}">
          <span class="flex items-center justify-between gap-4"><span>Home</span><span aria-hidden="true" class="text-base text-stone-soft transition-all duration-300 group-hover:translate-x-1 group-hover:text-clay">→</span></span>
        </a>
      </li>
      {%- for link in linklists[menu].links -%}
        {%- assign t = link.title | downcase -%}
        {%- unless t == 'home' -%}
          <li>
            <a href="{{ link.url }}" data-aside-close class="group block border-b border-border-soft/70 py-4 font-display text-[clamp(2rem,7vw,2.75rem)] leading-[1.05] tracking-[-0.015em] transition-colors {% if link.active %}text-clay{% else %}text-ink hover:text-clay{% endif %}">
              <span class="flex items-center justify-between gap-4"><span>{{ link.title }}</span><span aria-hidden="true" class="text-base text-stone-soft transition-all duration-300 group-hover:translate-x-1 group-hover:text-clay">→</span></span>
            </a>
          </li>
        {%- endunless -%}
      {%- endfor -%}
    </ul>
  </nav>

  <section aria-label="Account" class="relative px-6 pb-8 sm:px-8 mt-4">
    <ul class="divide-y divide-border-soft border-y border-border-soft">
      <li>
        <button type="button" data-aside-open="search" class="flex w-full items-center justify-between py-4 text-[14px] uppercase tracking-[0.18em] text-ink transition-colors hover:text-clay">
          <span class="inline-flex items-center gap-3">{% render 'icon', name: 'search', size: 16 %}{{ 'general.accessibility.search' | t }}</span>
          <span aria-hidden="true" class="text-stone-soft">→</span>
        </button>
      </li>
      <li>
        <a href="{{ routes.account_url }}" data-aside-close class="flex w-full items-center justify-between py-4 text-[14px] uppercase tracking-[0.18em] text-ink transition-colors hover:text-clay">
          <span class="inline-flex items-center gap-3">{% render 'icon', name: 'user', size: 16 %}{{ 'layout.header.login' | t }}</span>
          <span aria-hidden="true" class="text-stone-soft">→</span>
        </a>
      </li>
    </ul>
  </section>

  <div class="relative mt-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:px-8">
    <div class="border-t border-border-soft pt-6">
      <p class="font-display italic text-stone">Stijlvol wonen, vanuit Nederland.</p>
      <p class="mt-2 max-w-[28ch] text-[13px] leading-relaxed text-ink-soft">Zorgvuldig geselecteerde producten voor je keuken en huis. Verzonden binnen 1–3 werkdagen.</p>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Update `layout/theme.liquid` to render the asides**

Replace the line `<div id="CartDrawer" data-cart-drawer hidden></div>` with the three asides. Add this block immediately before `</body>`:

```liquid
    {%- capture mobile_body -%}{% render 'mobile-menu' %}{%- endcapture -%}
    {% render 'aside', type: 'mobile', heading: shop.name, aside_body: mobile_body %}

    {%- capture search_body -%}<div class="px-5 md:px-6 py-6 text-sm text-ink-soft">{{ 'general.search.placeholder' | t }}</div>{%- endcapture -%}
    {% render 'aside', type: 'search', heading: 'general.search.title' | t, aside_body: search_body %}

    {%- capture cart_body -%}<div class="px-5 md:px-6 py-6 text-sm text-ink-soft" data-cart-drawer-body>{{ 'general.cart.empty' | t }}</div>{%- endcapture -%}
    {% render 'aside', type: 'cart', heading: 'general.cart.title' | t, aside_body: cart_body %}
```

The exact `old_string` to remove is:
```liquid
    {%- comment -%} Cart drawer mounts here in Milestone 6. {%- endcomment -%}
    <div id="CartDrawer" data-cart-drawer hidden></div>
```

- [ ] **Step 5: Build + theme check + commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -2
git add assets/theme.js snippets/aside.liquid snippets/mobile-menu.liquid layout/theme.liquid assets/tailwind.css
git commit -m "feat: drawer controller, aside snippet, mobile menu"
```
Expected: build 0; theme check 0 errors.

---

### Task 5: Payment icons snippet

**Files:**
- Create: `snippets/payment-icons.liquid`

- [ ] **Step 1: Create `snippets/payment-icons.liquid`**

Reproduces the five framed payment marks (ideal, bancontact, klarna, visa, mastercard) as inline SVG, height 24.

```liquid
{%- liquid
  assign h = icon_height | default: 24
  assign w = h | times: 1.58 | round
-%}
<ul aria-label="Geaccepteerde betaalmethoden" class="flex flex-wrap items-center gap-1.5">
  <li class="leading-none">
    <svg role="img" aria-label="iDEAL" width="{{ w }}" height="{{ h }}" viewBox="0 0 38 24" class="rounded-[3px] ring-1 ring-black/10"><rect width="38" height="24" rx="3" fill="#fff"/><text x="19" y="16" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700"><tspan fill="#000">i</tspan><tspan fill="#cc0066">DEAL</tspan></text></svg>
  </li>
  <li class="leading-none">
    <svg role="img" aria-label="Bancontact" width="{{ w }}" height="{{ h }}" viewBox="0 0 38 24" class="rounded-[3px] ring-1 ring-black/10"><rect width="38" height="24" rx="3" fill="#fff"/><rect x="6" y="9" width="14" height="6" rx="1" fill="#005498"/><rect x="18" y="9" width="14" height="6" rx="1" fill="#ffd800"/></svg>
  </li>
  <li class="leading-none">
    <svg role="img" aria-label="Klarna" width="{{ w }}" height="{{ h }}" viewBox="0 0 38 24" class="rounded-[3px] ring-1 ring-black/10"><rect width="38" height="24" rx="3" fill="#ffb3c7"/><text x="19" y="16" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#0a0b09">Klarna</text></svg>
  </li>
  <li class="leading-none">
    <svg role="img" aria-label="Visa" width="{{ w }}" height="{{ h }}" viewBox="0 0 38 24" class="rounded-[3px] ring-1 ring-black/10"><rect width="38" height="24" rx="3" fill="#fff"/><text x="19" y="16" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-style="italic" font-weight="700" fill="#1a1f71">VISA</text></svg>
  </li>
  <li class="leading-none">
    <svg role="img" aria-label="Mastercard" width="{{ w }}" height="{{ h }}" viewBox="0 0 38 24" class="rounded-[3px] ring-1 ring-black/10"><rect width="38" height="24" rx="3" fill="#fff"/><circle cx="16" cy="12" r="6" fill="#eb001b"/><circle cx="23" cy="12" r="6" fill="#f79e1b" fill-opacity="0.9"/></svg>
  </li>
</ul>
```

- [ ] **Step 2: Build + theme check + commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -2
git add snippets/payment-icons.liquid assets/tailwind.css
git commit -m "feat: payment icons snippet"
```
Expected: build 0; theme check 0 errors.

---

### Task 6: Footer section + Markets language/currency switcher

Four-column footer + bottom bar with payment icons, business IDs, copyright, and a Markets language + currency switcher (replaces the static `NL · EN` switcher with a real `localization` form).

**Files:**
- Create: `sections/footer.liquid`
- Create: `snippets/localization-form.liquid`

- [ ] **Step 1: Create `snippets/localization-form.liquid`**

Renders language and/or currency selectors using the `localization` form. Hidden when only one option exists.

```liquid
<div class="flex items-center gap-4 text-xs">
  {%- if localization.available_languages.size > 1 -%}
    {%- form 'localization', id: 'footer-lang', class: 'flex items-center' -%}
      <label class="sr-only" for="footer-lang-select">{{ 'layout.footer.language' | t }}</label>
      <select id="footer-lang-select" name="locale_code" class="bg-transparent text-ink-soft hover:text-ink transition-colors focus:outline-none cursor-pointer" onchange="this.form.submit()">
        {%- for language in localization.available_languages -%}
          <option value="{{ language.iso_code }}" {% if language.iso_code == localization.language.iso_code %}selected{% endif %}>{{ language.endonym_name | capitalize }}</option>
        {%- endfor -%}
      </select>
    {%- endform -%}
  {%- endif -%}
  {%- if localization.available_countries.size > 1 -%}
    {%- form 'localization', id: 'footer-currency', class: 'flex items-center' -%}
      <label class="sr-only" for="footer-currency-select">{{ 'layout.footer.currency' | t }}</label>
      <select id="footer-currency-select" name="country_code" class="bg-transparent text-ink-soft hover:text-ink transition-colors focus:outline-none cursor-pointer" onchange="this.form.submit()">
        {%- for country in localization.available_countries -%}
          <option value="{{ country.iso_code }}" {% if country.iso_code == localization.country.iso_code %}selected{% endif %}>{{ country.name }} ({{ country.currency.iso_code }} {{ country.currency.symbol }})</option>
        {%- endfor -%}
      </select>
    {%- endform -%}
  {%- endif -%}
</div>
```

- [ ] **Step 2: Create `sections/footer.liquid`**

```liquid
<footer class="mt-24 border-t border-border-soft bg-cream">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 grid gap-12 md:grid-cols-4">
    <div class="md:col-span-1">
      <p class="font-signature text-3xl text-ink">{{ section.settings.brand_name | default: shop.name }}</p>
      <p class="mt-3 max-w-sm text-sm text-ink-soft">{{ section.settings.blurb }}</p>
    </div>

    <nav aria-label="{{ 'layout.footer.service' | t }}">
      {% render 'footer-heading', text: 'layout.footer.service' | t %}
      <ul class="space-y-2.5">
        {%- for link in linklists[section.settings.service_menu].links -%}
          <li>{% render 'footer-link', url: link.url, label: link.title %}</li>
        {%- endfor -%}
        <li>{% render 'footer-link', url: '/pages/track-order', label: 'layout.footer.track_order' | t %}</li>
      </ul>
    </nav>

    <nav aria-label="{{ 'layout.footer.legal' | t }}">
      {% render 'footer-heading', text: 'layout.footer.legal' | t %}
      <ul class="space-y-2.5">
        <li>{% render 'footer-link', url: '/policies/terms-of-service', label: 'Algemene voorwaarden' %}</li>
        <li>{% render 'footer-link', url: '/policies/privacy-policy', label: 'Privacybeleid' %}</li>
        <li>{% render 'footer-link', url: '/policies/refund-policy', label: 'Retourbeleid' %}</li>
        <li>{% render 'footer-link', url: '/policies/shipping-policy', label: 'Verzending' %}</li>
      </ul>
    </nav>

    <div>
      {% render 'footer-heading', text: 'layout.footer.contact' | t %}
      <ul class="space-y-2.5">
        <li>{% render 'footer-link', url: section.settings.contact_email_url, label: section.settings.contact_email_label %}</li>
        <li>{% render 'footer-link', url: section.settings.instagram_url, label: 'Instagram', icon: 'instagram' %}</li>
      </ul>
    </div>
  </div>

  <div class="border-t border-border-soft">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6 flex flex-col items-center gap-5 text-xs text-ink-soft sm:flex-row sm:justify-between sm:gap-4">
      {% render 'payment-icons' %}
      <dl class="flex items-center gap-4 sm:gap-5">
        <div class="flex items-baseline gap-1.5">
          <dt class="text-[10px] uppercase tracking-[0.18em] text-stone-soft">KvK</dt>
          <dd class="tabular-nums">{{ section.settings.kvk }}</dd>
        </div>
        <span aria-hidden="true" class="h-3 w-px bg-border-soft"></span>
        <div class="flex items-baseline gap-1.5">
          <dt class="text-[10px] uppercase tracking-[0.18em] text-stone-soft">BTW</dt>
          <dd class="tabular-nums">{{ section.settings.btw }}</dd>
        </div>
      </dl>
      <div class="order-last flex items-center gap-4 sm:order-none">
        <span>© {{ 'now' | date: '%Y' }} {{ section.settings.brand_name | default: shop.name }}</span>
        {% render 'localization-form' %}
      </div>
    </div>
  </div>
</footer>

{% schema %}
{
  "name": "Footer",
  "tag": "section",
  "settings": [
    { "type": "text", "id": "brand_name", "label": "Brand name", "default": "Zayna Home" },
    { "type": "textarea", "id": "blurb", "label": "Brand blurb", "default": "Stijlvolle keuken- en woonproducten, zorgvuldig geselecteerd en verzonden vanuit Nederland." },
    { "type": "link_list", "id": "service_menu", "label": "Service menu", "default": "footer" },
    { "type": "text", "id": "contact_email_label", "label": "Contact email label", "default": "info@zaynahome.nl" },
    { "type": "url", "id": "contact_email_url", "label": "Contact email link", "default": "mailto:info@zaynahome.nl" },
    { "type": "url", "id": "instagram_url", "label": "Instagram URL", "default": "https://www.instagram.com/zaynahome.nl" },
    { "type": "header", "content": "Business identifiers" },
    { "type": "text", "id": "kvk", "label": "KvK", "default": "97745200" },
    { "type": "text", "id": "btw", "label": "BTW", "default": "NL005285507B86" }
  ],
  "presets": [{ "name": "Footer" }]
}
{% endschema %}
```

Note: `contact_email_url` default is `mailto:` — if theme check rejects a `mailto:` default on a `url` setting, change that setting `type` to `text` and keep the default.

- [ ] **Step 3: Create the two footer helper snippets**

`snippets/footer-heading.liquid`:
```liquid
<p class="mb-5 flex items-center gap-2.5 text-label text-ink">
  <span aria-hidden="true" class="block h-px w-6 bg-clay/70"></span>
  {{ text }}
</p>
```

`snippets/footer-link.liquid`:
```liquid
{%- liquid
  assign cls = 'group relative inline-flex items-center gap-2 font-display text-[15px] leading-snug text-ink-soft transition-colors duration-300 hover:text-ink'
  assign is_external = false
  if url contains 'http' or url contains 'mailto:'
    assign is_external = true
  endif
-%}
<a href="{{ url }}" class="{{ cls }}"{% if url contains 'http' %} target="_blank" rel="noopener noreferrer"{% endif %}>
  {%- if icon != blank -%}{% render 'icon', name: icon, size: 16 %}{%- endif -%}
  {{ label }}
  <span aria-hidden="true" class="pointer-events-none absolute -bottom-1 left-0 block h-px w-full origin-left scale-x-0 bg-clay transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
</a>
```

- [ ] **Step 4: Build + theme check + commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -2
git add sections/footer.liquid snippets/localization-form.liquid snippets/footer-heading.liquid snippets/footer-link.liquid assets/tailwind.css
git commit -m "feat: footer section with Markets localization switcher"
```
Expected: build 0; theme check 0 errors.

---

### Task 7: Wire sections into the section groups

Replace the placeholder in `header-group.json` with announcement-bar + header, and put footer into `footer-group.json`.

**Files:**
- Modify: `sections/header-group.json`
- Modify: `sections/footer-group.json`

- [ ] **Step 1: Replace `sections/header-group.json`**

```json
{
  "type": "header",
  "name": "Header group",
  "sections": {
    "announcement-bar": {
      "type": "announcement-bar",
      "blocks": {
        "m1": { "type": "message", "settings": { "text": "Gratis verzending vanaf €100" } },
        "m2": { "type": "message", "settings": { "text": "Voor 23:00 besteld, morgen verzonden" } },
        "m3": { "type": "message", "settings": { "text": "Met zorg ingepakt vanuit Nederland" } }
      },
      "block_order": ["m1", "m2", "m3"]
    },
    "header": {
      "type": "header",
      "settings": { "menu": "main-menu" },
      "blocks": {
        "shop": {
          "type": "mega_panel",
          "settings": {
            "nav_title": "Shop",
            "eyebrow": "De collectie",
            "blurb": "Stijlvol, praktisch en zorgvuldig geselecteerd. Verzonden vanuit Nederland.",
            "cta_text": "Alle collecties bekijken",
            "featured_title": "Nieuw deze week",
            "featured_body": "Net binnen — onze nieuwste producten voor je keuken en huis.",
            "aside_heading": "Klantenservice"
          }
        }
      },
      "block_order": ["shop"]
    }
  },
  "order": ["announcement-bar", "header"]
}
```

- [ ] **Step 2: Replace `sections/footer-group.json`**

```json
{
  "type": "footer",
  "name": "Footer group",
  "sections": {
    "footer": {
      "type": "footer",
      "settings": {
        "brand_name": "Zayna Home",
        "blurb": "Stijlvolle keuken- en woonproducten, zorgvuldig geselecteerd en verzonden vanuit Nederland.",
        "service_menu": "footer"
      }
    }
  },
  "order": ["footer"]
}
```

- [ ] **Step 3: Build + theme check + commit**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css && npx shopify theme check 2>&1 | tail -3
git add sections/header-group.json sections/footer-group.json assets/tailwind.css
git commit -m "feat: wire announcement, header, footer into section groups"
```
Expected: build 0; theme check 0 errors. The `placeholder` section is now unused by the chrome but still referenced by `templates/index.json` — leave it; Milestone 3 replaces the homepage.

---

### Task 8: Live preview parity pass

- [ ] **Step 1: Start dev and verify chrome**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && shopify theme dev --store zaynahome-store.myshopify.com
```
Open the preview URL. Verify against the live site (https://zaynahome.nl):
- Announcement marquee scrolls the 3 Dutch messages over `bg-ink`.
- Sticky header: logo left, nav center (Shop, Journal, etc. from `main-menu`), CTAs right (account/search/cart icons).
- Hovering a nav item with sub-links opens the mega panel (eyebrow, edits = child links, featured tile, Klantenservice aside).
- Cart icon shows a clay badge only when `cart.item_count > 0`.
- Mobile (resize < 768px): hamburger opens the slide-in mobile menu; Escape and backdrop close it; search/cart icons open their (placeholder) drawers.
- Footer: 4 columns (brand, Klantenservice, Juridisch, Contact), bottom bar with payment icons, KvK/BTW, copyright, and the language/currency switcher.

- [ ] **Step 2: Note any drift** for the controller to fix, then Ctrl-C to stop.

---

## Definition of done (Milestone 2)
- `npm run build:css` and `npx shopify theme check` both clean.
- Header group renders announcement bar + header; footer group renders footer; both visible on every template.
- Mega menu, mobile drawer, and search/cart drawer open/close all work.
- Markets language/currency switcher renders when multiple locales/countries are active.
- All chrome strings come from `locales/*.json`.
- Work committed on `feat/milestone-2-global-chrome`.

## Hand-off to Milestone 3 (Home)
Builds the 7 home sections (Hero, FreshlyListed, CuratedEdit, ValueProps, FounderNote, JournalTeaser, Newsletter) and an `index.json` that replaces the `placeholder` section. Reuses: `snippets/icon.liquid`, the section/block schema convention, and the locale pattern established here.
```
