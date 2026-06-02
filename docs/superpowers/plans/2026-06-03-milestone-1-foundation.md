# Milestone 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Zayna Home Online Store 2.0 theme skeleton — Tailwind v4 build pipeline, design tokens, brand fonts, the `theme.liquid` shell, theme settings, and locale files — so the theme builds, passes `shopify theme check`, and previews a correctly-styled blank page via `shopify theme dev`.

**Architecture:** Standard Shopify OS 2.0 theme. Tailwind v4 source in `src/tailwind.css` (with `@theme` tokens copied verbatim from the Hydrogen app and `@font-face` declarations) compiles via the Tailwind CLI to a single committed `assets/tailwind.css`. Brand woff2 fonts are copied into `assets/` and referenced by relative `url()` (Shopify serves all `assets/` files from one CDN folder, so relative URLs in the compiled CSS resolve against the sibling font files). The `theme.liquid` layout loads the compiled CSS and `theme.js`, sets `<html lang>` from the active locale, and mounts a cart-drawer placeholder for later milestones.

**Tech Stack:** Shopify CLI 3.93.2, Liquid, Tailwind CSS v4 (`@tailwindcss/cli`), Theme Check, JSON templates.

**Plan series context:** This is Plan 1 of 10, one per spec milestone (see `docs/superpowers/specs/2026-06-03-hydrogen-to-liquid-theme-design.md`). Foundation locks in the conventions (Tailwind pipeline, token names, section-schema pattern, locale-string pattern) that every later milestone reuses. Subsequent milestone plans are written just-in-time before execution.

**Verification model (read once):** Themes have no unit-test runner. Every task verifies through theme-native tooling instead:
- **Build:** `npm run build:css` must succeed and write `assets/tailwind.css`.
- **Lint:** `npx shopify theme check` must report **0 errors** (warnings about missing later-milestone templates are acceptable and noted where they occur).
- **Preview (final task only):** `shopify theme dev` renders the page and we confirm background `#FAF5F2`, Inter body text, Fraunces headings.

All work happens in `/Users/altugsogutoglu/Herd/zayna-theme`. Run every command from that directory.

---

### Task 1: Repo scaffold, package.json, and build pipeline

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.theme-check.yml`
- Create directories: `assets/`, `config/`, `layout/`, `sections/`, `snippets/`, `blocks/`, `templates/`, `templates/customer/`, `locales/`, `src/`

- [ ] **Step 1: Create the directory skeleton**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
mkdir -p assets config layout sections snippets blocks templates templates/customer locales src
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "zayna-theme",
  "private": true,
  "version": "0.1.0",
  "description": "Zayna Home Shopify Online Store 2.0 theme",
  "scripts": {
    "build:css": "tailwindcss -i ./src/tailwind.css -o ./assets/tailwind.css --minify",
    "watch:css": "tailwindcss -i ./src/tailwind.css -o ./assets/tailwind.css --watch",
    "check": "shopify theme check",
    "dev": "shopify theme dev"
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4.1.6",
    "tailwindcss": "^4.1.6"
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
node_modules/
.DS_Store
*.log
.shopify/
```

- [ ] **Step 4: Create `.theme-check.yml`**

```yaml
extends: theme-check:recommended
ignore:
  - node_modules/
  - docs/
```

- [ ] **Step 5: Install dependencies**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm install
```
Expected: `node_modules/` created, `tailwindcss` and `@tailwindcss/cli` present, exit 0.

- [ ] **Step 6: Verify the Tailwind CLI is callable**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npx tailwindcss --help | head -3
```
Expected: Tailwind CLI help text (confirms the binary resolves).

- [ ] **Step 7: Commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
git add package.json package-lock.json .gitignore .theme-check.yml
git commit -m "chore: scaffold theme repo and build tooling"
```

---

### Task 2: Brand fonts as theme assets

Copy the exact woff2 files the Hydrogen app uses into `assets/` with short stable names. The `@font-face` rules are added in Task 3's CSS source.

**Files:**
- Create: `assets/fraunces-wght-normal.woff2`
- Create: `assets/fraunces-wght-italic.woff2`
- Create: `assets/inter-wght-normal.woff2`
- Create: `assets/inter-wght-italic.woff2`
- Create: `assets/caveat-400.woff2`
- Create: `assets/caveat-500.woff2`

- [ ] **Step 1: Copy the six woff2 files from the Hydrogen project's node_modules**

Run:
```bash
SRC=/Users/altugsogutoglu/Herd/zayna-home/node_modules
DST=/Users/altugsogutoglu/Herd/zayna-theme/assets
cp "$SRC/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2" "$DST/fraunces-wght-normal.woff2"
cp "$SRC/@fontsource-variable/fraunces/files/fraunces-latin-wght-italic.woff2" "$DST/fraunces-wght-italic.woff2"
cp "$SRC/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2" "$DST/inter-wght-normal.woff2"
cp "$SRC/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2" "$DST/inter-wght-italic.woff2"
cp "$SRC/@fontsource/caveat/files/caveat-latin-400-normal.woff2" "$DST/caveat-400.woff2"
cp "$SRC/@fontsource/caveat/files/caveat-latin-500-normal.woff2" "$DST/caveat-500.woff2"
```

- [ ] **Step 2: Verify all six files are present and non-empty**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && ls -l assets/*.woff2
```
Expected: six `.woff2` files listed, each with a non-zero size.

- [ ] **Step 3: Commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
git add assets/*.woff2
git commit -m "feat: add brand fonts (Fraunces, Inter, Caveat) as theme assets"
```

---

### Task 3: Tailwind source with design tokens + @font-face, and first build

Port the `@theme` tokens, base layer, utilities, `.rich-text` component styles, and the drawer/marquee/view-transition CSS from the Hydrogen app. Replace the npm `@fontsource` `@import`s with `@font-face` rules pointing at the copied assets via relative `url()`.

**Files:**
- Create: `src/tailwind.css`
- Generates: `assets/tailwind.css` (committed build output)

- [ ] **Step 1: Create `src/tailwind.css`**

```css
@import 'tailwindcss';

/* Tell Tailwind v4 where class names live in this theme. */
@source '../sections/**/*.liquid';
@source '../snippets/**/*.liquid';
@source '../blocks/**/*.liquid';
@source '../templates/**/*.{liquid,json}';
@source '../layout/**/*.liquid';

/* ---- Brand fonts (served from assets/, relative URLs resolve on CDN) ---- */
@font-face {
  font-family: 'Fraunces Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('fraunces-wght-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Fraunces Variable';
  font-style: italic;
  font-display: swap;
  font-weight: 100 900;
  src: url('fraunces-wght-italic.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('inter-wght-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter Variable';
  font-style: italic;
  font-display: swap;
  font-weight: 100 900;
  src: url('inter-wght-italic.woff2') format('woff2');
}
@font-face {
  font-family: 'Caveat';
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url('caveat-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Caveat';
  font-style: normal;
  font-display: swap;
  font-weight: 500;
  src: url('caveat-500.woff2') format('woff2');
}

@theme {
  /* Colors */
  --color-bg: #FAF5F2;
  --color-surface: #FFFFFF;
  --color-ink: #2A2520;
  --color-ink-soft: #564E47;
  --color-stone: #78716C;
  --color-stone-soft: #A8A29E;
  --color-clay: #B5651D;
  --color-sage: #8A9A7B;
  --color-cream: #F0EBE6;
  --color-border-soft: #E8E1DA;
  --color-sold: #9B8B7D;
  --color-danger: #B23A48;

  /* Product tile tints — warm rotating palette (Bellezza-inspired) */
  --color-tile-peach: #F4DCC9;
  --color-tile-blush: #ECD2C9;
  --color-tile-sage:  #DDE2D2;
  --color-tile-sand:  #E9DFD0;

  /* Fonts */
  --font-display: 'Fraunces Variable', Georgia, serif;
  --font-sans: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-signature: 'Caveat', cursive;

  /* Type scale */
  --text-hero: 3.5rem;
  --text-hero--line-height: 1.05;
  --text-hero--letter-spacing: -0.02em;
  --text-h1: 2.5rem;
  --text-h1--line-height: 1.1;
  --text-h1--letter-spacing: -0.015em;
  --text-h2: 2rem;
  --text-h2--line-height: 1.15;
  --text-h2--letter-spacing: -0.01em;
  --text-h3: 1.5rem;
  --text-h3--line-height: 1.25;
  --text-label: 0.75rem;
  --text-label--line-height: 1;
  --text-label--letter-spacing: 0.12em;
  --text-price: 1.125rem;
  --text-price--line-height: 1.2;
}

:root {
  --aside-width: 480px;
  --header-height: 72px;
  --header-height-mobile: 56px;
}

@layer base {
  html {
    background-color: var(--color-bg);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    scrollbar-gutter: stable;
  }
  body {
    background-color: var(--color-bg);
    color: var(--color-ink);
    font-family: var(--font-sans);
    line-height: 1.65;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    font-weight: 400;
    color: var(--color-ink);
  }
  .font-signature { font-family: var(--font-signature); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer utilities {
  .text-hero { font-size: var(--text-hero); line-height: var(--text-hero--line-height); letter-spacing: var(--text-hero--letter-spacing); }
  .text-label { font-size: var(--text-label); line-height: var(--text-label--line-height); letter-spacing: var(--text-label--letter-spacing); text-transform: uppercase; }
  .text-price { font-size: var(--text-price); line-height: var(--text-price--line-height); font-variant-numeric: tabular-nums; }
  .transition-soft { transition: all 240ms cubic-bezier(0.2, 0.6, 0.2, 1); }
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip-path: inset(50%); white-space: nowrap; border-width: 0;
  }
}

@layer components {
  .rich-text { color: var(--color-ink-soft); font-size: 1rem; line-height: 1.8; }
  .rich-text > * + * { margin-top: 1.25rem; }
  .rich-text h1, .rich-text h2, .rich-text h3,
  .rich-text h4, .rich-text h5, .rich-text h6 {
    font-family: var(--font-display); font-weight: 400; color: var(--color-ink);
    line-height: 1.2; letter-spacing: -0.01em;
  }
  .rich-text h2 { font-size: 1.5rem; margin-top: 2.75rem; }
  .rich-text h3 { font-size: 1.25rem; margin-top: 2.25rem; }
  .rich-text h4 { font-size: 1.0625rem; margin-top: 1.75rem; }
  .rich-text :is(h2, h3, h4, h5, h6) + * { margin-top: 0.75rem; }
  .rich-text a {
    color: var(--color-clay); text-decoration: underline;
    text-decoration-thickness: 1px; text-underline-offset: 3px;
    transition: color 200ms ease;
  }
  .rich-text a:hover { color: var(--color-ink); }
  .rich-text strong, .rich-text b { color: var(--color-ink); font-weight: 600; }
  .rich-text em, .rich-text i { font-style: italic; }
  .rich-text ul, .rich-text ol { padding-left: 1.5rem; }
  .rich-text ul { list-style: disc; }
  .rich-text ol { list-style: decimal; }
  .rich-text li { margin-top: 0.5rem; padding-left: 0.25rem; }
  .rich-text li::marker { color: var(--color-clay); }
  .rich-text blockquote {
    border-left: 2px solid var(--color-clay); padding-left: 1.25rem;
    font-family: var(--font-display); font-style: italic; font-size: 1.125rem;
    color: var(--color-stone);
  }
  .rich-text hr { border: 0; border-top: 1px solid var(--color-border-soft); margin: 2.75rem 0; }
  .rich-text table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
  .rich-text :is(th, td) { border: 1px solid var(--color-border-soft); padding: 0.625rem 0.875rem; text-align: left; }
  .rich-text th { color: var(--color-ink); font-weight: 600; background: var(--color-cream); }
}

/* ---- Aside / drawer (used by cart-drawer in Milestone 6) ---- */
html:has(.overlay.expanded) { overflow: hidden; }
.overlay aside {
  background: var(--color-surface);
  box-shadow: -24px 0 64px -16px rgba(42, 37, 32, 0.22);
  height: 100vh; height: 100dvh;
  width: min(92vw, 440px);
  position: fixed; right: 0; top: 0;
  transform: translateX(100%);
  transition: transform 320ms cubic-bezier(0.22, 0.61, 0.24, 1);
  z-index: 50; overscroll-behavior: contain;
}
@media (min-width: 768px) { .overlay aside { width: var(--aside-width); } }
.overlay {
  background: rgba(42, 37, 32, 0.38);
  inset: 0; opacity: 0; pointer-events: none; position: fixed;
  transition: opacity 280ms ease-out, visibility 0s linear 280ms;
  visibility: hidden; z-index: 40;
  -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
}
.overlay .close-outside {
  background: transparent; border: none; cursor: pointer;
  height: 100%; inset: 0; position: absolute; width: 100%;
}
.overlay.expanded {
  opacity: 1; pointer-events: auto; visibility: visible;
  transition: opacity 280ms ease-out, visibility 0s linear 0s;
}
.overlay.expanded aside { transform: translateX(0); }
.cart-drawer-footer { padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0)); }

/* ---- Announcement marquee (used by announcement-bar in Milestone 2) ---- */
.marquee {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%);
}
.marquee__track {
  display: flex; width: max-content; flex-wrap: nowrap;
  animation: marquee 42s linear infinite; will-change: transform;
}
@keyframes marquee { to { transform: translateX(-50%); } }
.marquee:hover .marquee__track { animation-play-state: paused; }
@media (max-width: 640px) { .marquee__track { animation-duration: 26s; } }
@media (prefers-reduced-motion: reduce) {
  .marquee { -webkit-mask-image: none; mask-image: none; }
  .marquee__track { animation: none; }
}

@keyframes mega-reveal {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes mobile-menu-item-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Run the build**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css
```
Expected: command exits 0 and writes `assets/tailwind.css`.

- [ ] **Step 3: Verify the build output contains the tokens and font faces**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && \
  grep -c "fraunces-wght-normal.woff2" assets/tailwind.css && \
  grep -c "#FAF5F2\|#faf5f2" assets/tailwind.css
```
Expected: first number ≥ 1 (font face present), second ≥ 1 (bg token present). If the second is 0, the value may be lowercased by minify — re-run with `grep -ci faf5f2`.

- [ ] **Step 4: Commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
git add src/tailwind.css assets/tailwind.css
git commit -m "feat: tailwind source with design tokens, font faces, and first build"
```

---

### Task 4: Theme settings (brand colors + typography)

Expose brand colors and font pickers in the theme editor so the client can adjust globals. These settings are read by sections in later milestones; Foundation only needs them to exist and validate.

**Files:**
- Create: `config/settings_schema.json`
- Create: `config/settings_data.json`

- [ ] **Step 1: Create `config/settings_schema.json`**

```json
[
  {
    "name": "theme_info",
    "theme_name": "Zayna Home",
    "theme_version": "0.1.0",
    "theme_author": "Zayna Home",
    "theme_documentation_url": "https://zayna.home",
    "theme_support_url": "https://zayna.home"
  },
  {
    "name": "Colors",
    "settings": [
      { "type": "color", "id": "color_bg", "label": "Background", "default": "#FAF5F2" },
      { "type": "color", "id": "color_surface", "label": "Surface", "default": "#FFFFFF" },
      { "type": "color", "id": "color_ink", "label": "Ink (text)", "default": "#2A2520" },
      { "type": "color", "id": "color_ink_soft", "label": "Ink soft", "default": "#564E47" },
      { "type": "color", "id": "color_clay", "label": "Clay (accent)", "default": "#B5651D" },
      { "type": "color", "id": "color_sage", "label": "Sage", "default": "#8A9A7B" },
      { "type": "color", "id": "color_border_soft", "label": "Soft border", "default": "#E8E1DA" }
    ]
  },
  {
    "name": "Typography",
    "settings": [
      { "type": "font_picker", "id": "font_heading", "label": "Heading font", "default": "assistant_n4" },
      { "type": "font_picker", "id": "font_body", "label": "Body font", "default": "assistant_n4" },
      {
        "type": "paragraph",
        "content": "The brand fonts (Fraunces, Inter, Caveat) ship as theme assets and are applied in CSS. These pickers are a fallback for merchant overrides."
      }
    ]
  },
  {
    "name": "Layout",
    "settings": [
      { "type": "range", "id": "page_width", "label": "Page width", "min": 1200, "max": 1600, "step": 20, "unit": "px", "default": 1400 }
    ]
  }
]
```

- [ ] **Step 2: Create `config/settings_data.json`**

```json
{
  "current": "Default",
  "presets": {
    "Default": {}
  }
}
```

- [ ] **Step 3: Verify JSON validity**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && \
  node -e "JSON.parse(require('fs').readFileSync('config/settings_schema.json')); JSON.parse(require('fs').readFileSync('config/settings_data.json')); console.log('valid')"
```
Expected: prints `valid`.

- [ ] **Step 4: Commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
git add config/settings_schema.json config/settings_data.json
git commit -m "feat: theme settings schema for brand colors and typography"
```

---

### Task 5: Locale files (Dutch default + English stub)

Establish the locale-string convention every later section follows: no hardcoded UI copy — all strings go through `{{ '…' | t }}`. Dutch is the default; English is stubbed for Markets expansion.

**Files:**
- Create: `locales/nl.default.json`
- Create: `locales/en.json`

- [ ] **Step 1: Create `locales/nl.default.json`**

```json
{
  "general": {
    "accessibility": {
      "skip_to_content": "Ga naar inhoud",
      "close": "Sluiten",
      "menu": "Menu"
    },
    "search": {
      "title": "Zoeken",
      "placeholder": "Zoek producten…",
      "submit": "Zoeken"
    },
    "cart": {
      "title": "Winkelwagen",
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

- [ ] **Step 2: Create `locales/en.json`**

```json
{
  "general": {
    "accessibility": {
      "skip_to_content": "Skip to content",
      "close": "Close",
      "menu": "Menu"
    },
    "search": {
      "title": "Search",
      "placeholder": "Search products…",
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

- [ ] **Step 3: Verify JSON validity**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && \
  node -e "JSON.parse(require('fs').readFileSync('locales/nl.default.json')); JSON.parse(require('fs').readFileSync('locales/en.json')); console.log('valid')"
```
Expected: prints `valid`.

- [ ] **Step 4: Commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
git add locales/nl.default.json locales/en.json
git commit -m "feat: Dutch default and English locale files"
```

---

### Task 6: The `theme.liquid` shell and a minimal index template

The layout is the HTML shell every page renders into: it sets `<html lang>` from the active locale, the `theme-color` meta, loads the compiled CSS and (placeholder) JS, renders the header/footer section groups by reference, and mounts the cart-drawer placeholder. A minimal `index.json` + placeholder section give `shopify theme dev` something to render and satisfy the required-files check.

**Files:**
- Create: `layout/theme.liquid`
- Create: `assets/theme.js`
- Create: `sections/placeholder.liquid`
- Create: `templates/index.json`

- [ ] **Step 1: Create `assets/theme.js` (empty entry point for later milestones)**

```js
// Zayna Home theme entry point.
// Cart drawer, predictive search, and faceted filtering JS land in later milestones.
(() => {
  'use strict';
  document.documentElement.classList.add('js');
})();
```

- [ ] **Step 2: Create `layout/theme.liquid`**

```liquid
<!doctype html>
<html lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#FAF5F2">
    <link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
    <link rel="icon" type="image/svg+xml" href="{{ 'favicon.svg' | asset_url }}">

    <title>
      {{ page_title }}{% if current_tags %} &ndash; {{ current_tags | join: ', ' }}{% endif %}{% unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless %}
    </title>
    {% if page_description %}
      <meta name="description" content="{{ page_description | escape }}">
    {% endif %}

    {{ content_for_header }}

    <link rel="stylesheet" href="{{ 'tailwind.css' | asset_url }}">
    <script src="{{ 'theme.js' | asset_url }}" defer></script>
  </head>
  <body class="min-h-dvh font-sans text-ink antialiased">
    <a class="sr-only" href="#MainContent">{{ 'general.accessibility.skip_to_content' | t }}</a>

    {% sections 'header-group' %}

    <main id="MainContent" role="main">
      {{ content_for_layout }}
    </main>

    {% sections 'footer-group' %}

    {%- comment -%} Cart drawer mounts here in Milestone 6. {%- endcomment -%}
    <div id="CartDrawer" data-cart-drawer hidden></div>
  </body>
</html>
```

- [ ] **Step 3: Create the `header-group` and `footer-group` section group stubs**

These satisfy the `{% sections %}` references until Milestone 2 fills them in.

Create `sections/header-group.json`:
```json
{
  "type": "header",
  "name": "Header group",
  "sections": {
    "placeholder": { "type": "placeholder" }
  },
  "order": ["placeholder"]
}
```

Create `sections/footer-group.json`:
```json
{
  "type": "footer",
  "name": "Footer group",
  "sections": {},
  "order": []
}
```

- [ ] **Step 4: Create `sections/placeholder.liquid`**

```liquid
<div class="mx-auto max-w-[1400px] px-6 py-16 text-center">
  <p class="text-label text-stone">Zayna Home</p>
  <h1 class="mt-3 text-h2 font-display">{{ section.settings.heading }}</h1>
  <p class="mt-4 text-ink-soft">{{ section.settings.body }}</p>
</div>

{% schema %}
{
  "name": "Placeholder",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Foundation ready" },
    { "type": "text", "id": "body", "label": "Body", "default": "Background, fonts, and tokens are wired up." }
  ],
  "presets": [{ "name": "Placeholder" }]
}
{% endschema %}
```

- [ ] **Step 5: Create `templates/index.json`**

```json
{
  "sections": {
    "placeholder": {
      "type": "placeholder",
      "settings": {
        "heading": "Foundation ready",
        "body": "Background #FAF5F2, Inter body, Fraunces headings."
      }
    }
  },
  "order": ["placeholder"]
}
```

- [ ] **Step 6: Rebuild CSS so classes used in the new Liquid are present**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npm run build:css
```
Expected: exits 0, `assets/tailwind.css` rewritten.

- [ ] **Step 7: Run Theme Check**

Run:
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && npx shopify theme check
```
Expected: **0 errors**. Warnings are acceptable (e.g. suggestions on the placeholder). If any **error** references a missing required file, create it per the message and re-run.

- [ ] **Step 8: Commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
git add layout/theme.liquid assets/theme.js sections/placeholder.liquid \
  sections/header-group.json sections/footer-group.json templates/index.json assets/tailwind.css
git commit -m "feat: theme.liquid shell, section groups, and minimal index template"
```

---

### Task 7: Live preview parity check and Shopify CLI config

Confirm the foundation renders correctly against a real store via `shopify theme dev`, then capture the store connection so later milestones can preview consistently.

**Files:**
- Create: `shopify.theme.toml`

- [ ] **Step 1: Start the dev preview**

Run (replace `<your-store>.myshopify.com` with the Zayna Home dev store):
```bash
cd /Users/altugsogutoglu/Herd/zayna-theme && shopify theme dev --store <your-store>.myshopify.com
```
Expected: the CLI authenticates (browser opens on first run), uploads a dev theme, and prints a local preview URL (e.g. `http://127.0.0.1:9292`). Leave it running.

- [ ] **Step 2: Verify visual foundation in the browser**

Open the printed preview URL. Confirm:
- Page background is warm off-white `#FAF5F2` (not white).
- The "Foundation ready" heading renders in **Fraunces** (serif, display).
- Body text renders in **Inter** (sans).
- Browser DevTools → Network shows the woff2 files loading 200 from the CDN, and `tailwind.css` loading 200.

Expected: all four confirmed. If the background is white, the CSS link or `assets/tailwind.css` build is wrong — re-check Task 3.

- [ ] **Step 3: Stop the preview and record the store config**

Stop with Ctrl-C, then create `shopify.theme.toml` (replace the store handle):
```toml
[environments.development]
store = "<your-store>.myshopify.com"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/altugsogutoglu/Herd/zayna-theme
git add shopify.theme.toml
git commit -m "chore: record Shopify dev store environment"
```

---

## Definition of done (Milestone 1)

- `npm run build:css` produces `assets/tailwind.css` containing the brand tokens and `@font-face` rules.
- `npx shopify theme check` reports 0 errors.
- `shopify theme dev` renders a page with `#FAF5F2` background, Fraunces headings, Inter body, and fonts loading from `assets/`.
- Theme settings expose brand colors and typography in the editor.
- `locales/nl.default.json` (default) and `locales/en.json` exist and validate.
- All work is committed to the `zayna-theme` repo.

## Hand-off to Milestone 2 (Global chrome)

The next plan builds `announcement-bar` and `header` into `header-group.json`, the `footer` into `footer-group.json`, the `payment-icons` snippet, the Markets language/currency switcher, and replaces the placeholder section. It reuses: the `@theme` tokens, the `.marquee` and `.overlay` CSS already shipped here, the `{{ '…' | t }}` locale pattern, and the `{% schema %}` section convention from `placeholder.liquid`.
```
