# Zayna Home — Hydrogen → Liquid Theme (1:1 port)

**Date:** 2026-06-03
**Status:** Approved design, pre-implementation
**Source project:** `/Users/altugsogutoglu/Herd/zayna-home` (Shopify Hydrogen storefront)
**Target project:** `/Users/altugsogutoglu/Herd/zayna-theme` (Shopify Online Store 2.0 Liquid theme)

## Goal

Reproduce the existing Zayna Home Hydrogen storefront as a standard Shopify
Online Store 2.0 Liquid theme, visually and functionally 1:1, while making every
page merchant-editable through the Shopify theme editor via JSON templates and
sectioned page composition.

This is a **full reimplementation**, not a code port: Hydrogen is React/JS on
Oxygen (Cloudflare Workers); a Liquid theme is server-rendered by Shopify's theme
platform. None of the `.tsx` code carries over. The live Hydrogen site is the
visual/functional spec. Product data, metafields (feature badges, FAQs), and
catalog already live in Shopify and plug directly into Liquid.

## Decisions (locked during brainstorming)

- **Architecture:** Online Store 2.0 theme. Every visual block is a section with
  a `{% schema %}`; every page is a JSON template listing sections. Client can
  reorder/hide/duplicate/edit in the theme editor; shipped defaults reproduce the
  current site exactly.
- **Motivation:** merchant editing, simpler hosting/ops (no Oxygen deploy), lower
  maintenance (no Hydrogen build/codegen/JS overhead).
- **CSS:** keep the exact Tailwind v4 classes in Liquid markup; compile to a
  static `assets/tailwind.css` via Tailwind CLI. No Vite. Merchant editing is
  unaffected by the build; only a dev rebuilds CSS when markup classes change.
- **Build strategy (Approach C, hybrid):** build all structure and visible markup
  from scratch with Tailwind (exact 1:1 design, no Dawn CSS to fight), but reuse
  Shopify's proven interaction patterns for the hard plumbing — Cart AJAX +
  Section Rendering API, predictive search endpoint, Storefront `filter.*` facet
  params, classic `customer/*` templates, Markets switcher.
- **Customer accounts:** classic Liquid `customer/*` templates, styled to brand.
- **Localization:** multi-language/currency via Shopify Markets. Header
  language + currency switcher. All UI strings go through `locales/*.json`.
  `nl.default.json` carries current Dutch copy verbatim; `en.json` stubbed.

## Theme structure

```
zayna-theme/
├── assets/              # compiled tailwind.css, theme.js, icons, fonts, images
├── config/
│   ├── settings_schema.json   # theme settings (colors, fonts, brand)
│   └── settings_data.json     # saved settings values
├── layout/
│   └── theme.liquid           # <html> shell, loads tailwind.css + theme.js, cart drawer mount
├── sections/            # every visual block
├── snippets/            # reusable partials (product-card, price, icons, payment-icons…)
├── blocks/              # OS 2.0 theme blocks
├── templates/
│   ├── *.json                 # page templates listing sections
│   └── customer/*.liquid       # account templates
├── locales/             # nl.default.json, en.json …
└── src/
    └── tailwind.css           # Tailwind v4 source + @theme tokens
```

### Tailwind pipeline

- Design tokens (`bg`, fonts Fraunces/Inter/Caveat, spacing, colors) move into
  `src/tailwind.css` via Tailwind v4 `@theme`.
- Build: `npx @tailwindcss/cli -i src/tailwind.css -o assets/tailwind.css --minify`.
- `content` glob covers `sections/**`, `snippets/**`, `blocks/**`,
  `templates/**`, `layout/**` so classes in Liquid are detected.
- Fonts ship as theme assets (existing `@fontsource` woff2 files), loaded via
  `{{ 'inter.woff2' | asset_url }}`, not from npm at runtime.

## Sections, JSON templates & 1:1 component map

### JSON templates (default section order baked in)

| Template | Sections in default order |
|---|---|
| `index.json` | hero → freshly-listed → curated-edit → value-props → founder-note → journal-teaser → newsletter |
| `product.json` | main-product (blocks: gallery, info, price, buy-buttons, features, faq, care-shipping, trust-badges, zayna-note, sticky-atc) → related-products |
| `collection.json` | collection-hero → category-pills → main-collection (facet filter bar + grid + pagination/infinite) |
| `cart.json` | main-cart (line items, free-shipping progress, upsell, summary, suggestions) |
| `blog.json` / `article.json` | blog-banner → article-grid / main-article → article-footer |
| `page.json` + `page.contact.json` + `page.track-order.json` | rich-text/custom sections per page |
| `search.json` | main-search (results; predictive handled in header) |
| `list-collections.json`, `policy.json`, `password.json`, `404.json`, `gift_card.json` | standard sections |

### Component → section/snippet mapping

- **Global:** AnnouncementBar, Header + MegaMenu + MobileMenuPanel → header group
  (announcement-bar, header); Footer → `sections/footer`; PaymentIcons →
  `snippets/payment-icons`; Aside → cart-drawer mount in `theme.liquid`.
- **Home:** Hero, FreshlyListed, CuratedEdit, FounderNote (SignedLetter),
  ValueProps, JournalTeaser, Newsletter → one section each.
- **Product:** ProductGallery, ProductInfo, ProductForm, ProductPrice,
  AddToCartButton, ConditionBadge, SoldOverlay → blocks inside `main-product`;
  ProductFeatures, ProductFaq, CareShipping, TrustBadges, ZaynaNote → blocks
  driven by existing metafields; StickyAddToCart → block; RelatedProducts → own
  section.
- **Collection:** CollectionHero, CategoryPills, FilterBar → `main-collection`;
  ProductItem / ProductImage → `snippets/product-card`; Paginated /
  InfiniteResourceSection → pagination + infinite-scroll JS.
- **Cart:** CartMain, CartLineItem, CartSummary, CartUpsell, FreeShippingProgress,
  CartSuggestions → `main-cart` + cart-drawer snippet.
- **Search:** SearchForm(Predictive), SearchResults(Predictive), api.suggestions →
  predictive search snippet + `main-search`.

### Dropped (Shopify-native, not needed)

- Custom `sitemap.*` routes → Shopify auto-generates `/sitemap.xml`.
- `discount.$code` → native `/discount/CODE`.
- `robots.txt` route → `templates/robots.txt.liquid`.
- `MockShopNotice` → dev-only, not ported.

## Hard plumbing (reused Shopify patterns)

- **Cart drawer:** `theme.js` posts to `/cart/add.js`, `/cart/change.js`;
  re-renders drawer via Section Rendering API (`?sections=cart-drawer`). Instant
  slide-in cart, live line edits, free-shipping progress, upsell, suggestions —
  matching current `Aside` + `CartMain` without full reload.
- **Predictive search:** header search calls `/search/suggest.json` (or predictive
  section endpoint), renders product/collection/article suggestions in a dropdown.
  Full results = `main-search` with `{{ search.results }}` + pagination.
- **Faceted filtering:** FilterBar + CategoryPills → Shopify Storefront filters via
  `collection.filters` + `?filter.*` params. Grid re-renders via Section Rendering
  API on change (no reload). Sort via `?sort_by=`. Infinite scroll = `paginate` +
  IntersectionObserver fetching `?page=N` and appending grid items.
- **Customer accounts (classic):** `templates/customer/login`, `register`,
  `account`, `order`, `addresses`, `reset`, `activate` styled with Tailwind tokens
  to match as closely as classic forms allow. Replaces Customer Account API routes.
- **Markets (multi-language/currency):** header language + currency switcher using
  `localization` objects + `{% form 'localization' %}`. All UI strings via
  `locales/*.json` (`{{ '…' | t }}`). `nl.default.json` = current Dutch copy
  verbatim; `en.json` stubbed. Product/collection/page content translates via
  Shopify Translate & Adapt (Markets), not the theme.
- **track-order:** rebuilt as `page.track-order` template with an order-status
  lookup form (order number + email → Shopify order status page), since Hydrogen's
  custom route has no direct theme equivalent.

## Build order (milestones)

Each milestone is independently reviewable in the theme editor against the live
Hydrogen site, building from the shell outward. Each is committed to the
`zayna-theme` repo as it lands.

1. **Foundation** — repo scaffold, Tailwind pipeline + `@theme` tokens, fonts as
   assets, `theme.liquid` shell, `settings_schema.json` (brand colors/fonts),
   `nl.default.json` + `en.json` skeleton, `shopify.theme.toml` for
   `shopify theme dev`. Deliverable: blank styled theme that builds and previews.
2. **Global chrome** — announcement-bar, header (mega menu + mobile panel), footer,
   payment-icons, cart-drawer mount + Markets switcher. Deliverable: correct
   header/footer on every page.
3. **Home** — all 7 home sections + `index.json` defaults reproducing the homepage.
4. **Product** — `main-product` with all blocks wired to existing metafields +
   related-products + product-card snippet.
5. **Collection** — collection-hero, category-pills, faceted `main-collection`
   grid, pagination + infinite scroll.
6. **Cart** — `main-cart` + AJAX drawer (Section Rendering), free-shipping
   progress, upsell, suggestions.
7. **Search** — predictive dropdown + `main-search` results.
8. **Blog & pages** — blog/article templates + journal sections,
   page/contact/track-order templates, policies, 404, password.
9. **Accounts** — classic `customer/*` templates styled to brand.
10. **Parity QA** — side-by-side pass against live site per breakpoint, fix drift,
    finalize locale strings, dev handoff notes.

## Success criteria

- Every page renders 1:1 with the live Hydrogen site across mobile/tablet/desktop.
- Every visible block is an editable section/block in the theme editor; default
  content reproduces the current site.
- Cart, predictive search, faceted filtering, and infinite scroll behave like the
  Hydrogen versions (no full-page reloads where the current site avoids them).
- Theme builds via Tailwind CLI to a single committed `assets/tailwind.css`.
- All UI strings are translatable via `locales/*.json`; Dutch is the default.
- Classic customer account flows work and are brand-styled.
- Theme passes `shopify theme check` and previews via `shopify theme dev`.
```
