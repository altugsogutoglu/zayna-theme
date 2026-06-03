# Zayna Home theme — session handoff

Paste the prompt below into a fresh session to continue from Milestone 4.

---

Continue building the Zayna Home Shopify theme. You're picking up a multi-milestone
project already in progress. Read this fully before doing anything.

## What we're doing
Porting an existing Shopify Hydrogen storefront to a standard Shopify Online Store 2.0
Liquid theme, 1:1 visually/functionally, with every page made of editable sections +
JSON templates. The live Hydrogen site is the design spec; none of its React code is
reused, but the same Shopify store/metafields back both.

## Locations
- Theme repo (the work): /Users/altugsogutoglu/Herd/zayna-theme
- Source Hydrogen app (read for 1:1 reference only): /Users/altugsogutoglu/Herd/zayna-home/app
- Approved design spec: zayna-theme/docs/superpowers/specs/2026-06-03-hydrogen-to-liquid-theme-design.md
- Completed plans (read these to absorb conventions): zayna-theme/docs/superpowers/plans/
  2026-06-03-milestone-1-foundation.md, -milestone-2-global-chrome.md, -milestone-3-home.md
- Shopify store: zaynahome-store.myshopify.com (Dutch content; public domain zaynahome.nl, password-protected)

## Status: Milestones 1-3 DONE and merged to main
1 Foundation (Tailwind CLI build + @theme tokens + fonts + theme.liquid shell + settings + locales)
2 Global chrome (announcement bar, header + mega menu, mobile drawer, footer, payment icons, Markets switcher)
3 Home (hero, value-props, freshly-listed, curated-edit carousel, founder-note, journal-teaser, newsletter + index.json)

## Remaining milestones (do in order, ONE per session-checkpoint)
4 Product: main-product section with blocks (gallery, info, price, buy-buttons, features,
  faq, care-shipping, trust-badges, zayna-note, sticky-atc) + related-products + product.json.
  Source: zayna-home/app/components/product/*, routes/($locale).products.$handle.tsx.
  Product metafields already in store: custom.condition, custom.bestseller, custom.features, custom.faqs.
5 Collection: collection-hero, category-pills, faceted main-collection grid (Storefront filter.* params),
  pagination + infinite scroll. Source: app/components/collection/*, routes/($locale).collections.$handle.tsx.
6 Cart: main-cart + AJAX cart drawer via Section Rendering API, free-shipping progress, upsell, suggestions.
  The drawer shell already exists: snippets/aside.liquid + the drawer controller in assets/theme.js
  (open via [data-aside-open="cart"], body injects at [data-cart-drawer-body]).
7 Search: predictive dropdown (/search/suggest.json) in the search aside + main-search results template.
8 Blog & pages: blog/article templates + journal sections, page/contact/track-order templates, policies, 404, password.
9 Accounts: classic templates/customer/* (login, register, account, order, addresses, reset, activate), brand-styled.
10 Parity QA: side-by-side pass per breakpoint, fix drift, finalize locale strings.

## Workflow (per milestone) — use the superpowers skills
1. Read the relevant Hydrogen source components for exact 1:1 content.
2. Write a bite-sized plan to docs/superpowers/plans/2026-06-03-milestone-N-*.md (writing-plans skill).
3. git pull --rebase origin main, then create branch feat/milestone-N-*, commit the plan.
4. Execute via subagent-driven-development: ONE implementer subagent (general-purpose) for the
   build tasks, then a spec-compliance reviewer subagent, then a code-quality reviewer subagent;
   fix findings, re-review until approved.
5. Verify (no unit tests exist): `npm run build:css` exits 0; `npx shopify theme check` reports 0
   ERRORS (3 known false-positive warnings are fine); then drive the live preview with Playwright
   MCP at http://127.0.0.1:9292 (the user runs `shopify theme dev --store zaynahome-store.myshopify.com`).
6. Checkpoint: pause and let the user preview/approve before merging.
7. git pull --rebase origin main, merge branch to main, push, delete branch.

## Hard-won gotchas (DO NOT relearn these)
- Shopify<->GitHub integration is ACTIVE on this repo: the user's theme-editor edits auto-commit to
  main ("Update from Shopify ..." commits) and code pushes flow to the live theme. ALWAYS
  `git pull --rebase origin main` before pushing. Do NOT hand-edit files the user manages in the
  editor (templates/index.json, sections/header-group.json, sections/footer-group.json) — new
  milestones add their own files (product.json, collection.json, etc.).
- Tailwind v4 via CLI: after any markup class change run `npm run build:css`; commit assets/tailwind.css.
  Source is src/tailwind.css (@theme tokens). Content globs cover sections/snippets/blocks/templates/layout.
- Setting defaults: `url`-type settings CANNOT have a default (use type `text` for URL/mailto defaults).
  `collection`/`collection_list`/`blog`/`image_picker`/`page` settings cannot take a default at all.
- NEVER put a `| filter` inside image_tag (or any filter) named args, e.g. `alt: x | default: y` —
  Liquid parses it as a separate filter and silently drops later args (it dropped a whole class=).
  Precompute into a variable first (assign primary_alt = ...), then pass `alt: primary_alt`.
- Continuous auto-scroll carousels: do NOT use CSS scroll-snap-mandatory (it cancels JS drift every
  frame). Accumulate scroll in a float var and assign scrollLeft (scrollLeft += 0.5 never advances
  because the browser rounds it). See the carousel IIFE in assets/theme.js for the working pattern.
- Headings get color:ink from @layer base; on dark sections add an explicit light text color (text-surface).
- Reusable pieces already built: snippets/product-card.liquid (image hover-swap, condition/bestseller/
  Nieuw badges, sold overlay, price; image fit is object-contain by user choice), snippets/icon.liquid
  (lucide inline SVGs), snippets/aside.liquid (drawer shell), snippets/payment-icons.liquid,
  snippets/localization-form.liquid, snippets/footer-*.liquid. theme.js has the drawer controller
  (focus-trap + return) and the carousel controller.
- Verification discipline: never claim something is fixed without measuring it (the user caught two
  false "it's fixed" claims). Use Playwright browser_evaluate to measure getBoundingClientRect /
  scrollLeft etc., not just eyeballing screenshots.
- Section content uses Dutch defaults editable in the theme editor; chrome UI strings go through locales/*.json.

Start with Milestone 4. First read the Hydrogen product components and the product route, then write the
Milestone 4 plan and confirm it with me before implementing.
