# Zayna Home — Full SEO Audit

**Site:** https://zaynahome.nl/ (canonical) — redirected from zaynahome-store.myshopify.com
**Date:** 2026-06-11
**Business type:** E-commerce — Dutch home & kitchen goods (Japandi/minimalist), Shopify, custom Liquid theme (`zayna-theme`)
**Catalog:** 94 products · ~10 collections · 1 blog (`/blogs/nieuws`) · 1 page (`/pages/contact`)
**Market/locale:** nl-NL, EUR

---

## Executive Summary

### Overall SEO Health Score: **56 / 100**

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 22% | 78 | 17.2 |
| Content Quality | 23% | 45 | 10.4 |
| On-Page SEO | 20% | 62 | 12.4 |
| Schema / Structured Data | 10% | 10 | 1.0 |
| Performance (CWV) | 10% | 68 | 6.8 |
| AI Search Readiness | 10% | 61 | 6.1 |
| Images | 5% | 50 | 2.5 |
| **Total** | | | **56.4** |

**The story in one line:** The technical and infrastructure foundation is excellent (clean SSR, fast TTFB, strong security headers, best-in-class AI/agentic-commerce setup), but the store is held back by a **complete absence of structured data**, **thin content** (short descriptions, no About page, no reviews), and **no trust signals**. It is well built for transactional AI agents but nearly invisible for traditional SERP rich results and informational AI answers.

### Top 5 Critical Issues
1. **Zero JSON-LD structured data anywhere** — confirmed: 0 blocks on homepage and product pages, 0 in the entire theme (`grep "application/ld+json"` empty). Blocks all rich results and Google Shopping organic eligibility.
2. **No reviews / no `aggregateRating`** — no review app, no star snippets; competing against Bol.com listings with hundreds of reviews.
3. **Thin collection & product content** — collection pages have ~1 sentence; product descriptions 15–40 words. Cannot rank for category keywords (`bestekset 30-delig`, `voorraadpotten kopen`).
4. **No About / brand-entity page** — `/pages/over-ons` 404s. No crawlable brand story → no AI platform can describe the store, weak E-E-A-T.
5. **Price data anomaly** — `dubbelwandige-glas-350ml` shows €1,00 in product JSON. Fix before enabling Product schema or it ships a Shopping policy violation.

### Top 5 Quick Wins
1. Add Product + Offer + BreadcrumbList + FAQPage JSON-LD to `sections/main-product.liquid` (FAQ content already exists in `sections/product-faq.liquid`).
2. Switch image rendering to WebP via Shopify CDN (`image_url: ... format: 'webp'`) — currently **0** webp calls in theme.
3. Add `hreflang="nl-NL"` + `x-default` self-referential tags to `layout/theme.liquid` (currently 0).
4. Complete Open Graph product tags (`og:type`, `og:title`, `product:price:amount`, `product:availability`) — currently only `og:image*` present.
5. Write 80–150 word intro copy for all 10 collections in Shopify admin.

---

## Technical SEO — 78/100

**Strong:**
- Canonical tags present and correct on home and product pages.
- HTTPS, Cloudflare, HTTP 200, TTFB ~48ms, full-page total ~205ms.
- Security headers: `x-content-type-options: nosniff`, `x-frame-options: DENY`, CSP (`block-all-mixed-content; frame-ancestors 'none'; upgrade-insecure-requests`), HSTS (`max-age=7889238`).
- Server-side rendered HTML (no SPA shell) — fully crawlable.
- robots.txt is well beyond Shopify default: inline agent instructions, UCP/MCP endpoints, correct AJAX/facet blocks, explicit adsbot-google block.
- `lang="nl"` set on `<html>`.

**Gaps:**
| Severity | Issue | Fix |
|---|---|---|
| High | No `hreflang` tags (0 found) | Add self-referential `nl-NL` + `x-default` in `layout/theme.liquid` |
| Medium | Single-filter facet URLs (`?filter.p.tag=…`) crawlable/indexable | `noindex,follow` when filter/`current_tags` param present |
| Low | HSTS lacks `includeSubDomains; preload` | Extend HSTS directive (Shopify-managed; verify in admin) |
| Low | CSP has no `script-src` / `default-src` | Tighten CSP if theme controls it |

---

## Content Quality — 45/100

**Strong:** Meta descriptions are present and well-written on home and product pages (corrects an earlier finding). Product descriptions are original Dutch copy.

**Gaps:**
- Product descriptions too short (15–40 words) — below the ~134–167 word self-contained passage that AI answer engines and long-tail SERP reward.
- Collection pages: ~1 sentence of copy, no editorial intro, no buying guides, no FAQ.
- **No About / brand page** (`/pages/over-ons` 404). KvK 97745200 / VAT NL005285507B86 are buried in product footers, not on a trust page.
- No customer reviews / UGC anywhere.
- Blog (`/blogs/nieuws`) is effectively empty — no editorial layer for informational queries.
- PAA questions for core keywords ("Hoeveel bestek per persoon?", "Zijn glazen rietjes vaatwasserbestendig?") are unaddressed on-site.

---

## On-Page SEO — 62/100

**Strong:** Title tags and meta descriptions present and descriptive; single H1 per page; canonicals correct.

**Gaps:**
| Severity | Issue | Fix |
|---|---|---|
| High | No breadcrumb nav or `BreadcrumbList` | Add visible breadcrumbs + schema to product/collection templates |
| High | Open Graph incomplete (only `og:image*`) | Add `og:type=product`, `og:title`, `og:description`, `product:price:amount/currency`, `product:availability` |
| Medium | Title ↔ H1 inconsistency (e.g. product title shorter/longer than H1) | Align; format `[Name] – [key spec] \| Zayna Home`, front-load material/volume |
| Medium | Key specs (ml, set size, materiaal) buried below fold | Lead descriptions + add spec table above fold |
| Low | No cross-collection internal links | Add category cross-links + related-collection blocks |

---

## Schema / Structured Data — 10/100

**Critical — nothing implemented.** Verified three ways: 0 JSON-LD blocks on homepage, 0 on product page, 0 across the entire theme source. Product data is rendered only into a `data-product-json` `<script type="application/json">` element, which Google does **not** treat as structured data.

**Missing (all high-value):** `Product` + `Offer`, `BreadcrumbList`, `Organization` (logo, sameAs), `WebSite` + `SearchAction`, `FAQPage` (content already exists in `sections/product-faq.liquid`).

**Note:** When schema is added, also include `gtin`/`mpn` (from Shopify barcode/SKU) for Google Shopping feed matching, and set `availability` dynamically from `product.available`.

---

## Performance (CWV) — 68/100

**Strong:** TTFB ~48ms, SSR, Cloudflare edge, HTML ~136KB. Scripts deferred, images lazy-loaded.

**Gaps:**
- **All product images served as PNG; 0 WebP calls in theme.** PNG photos are 2–5× larger than WebP → directly hurts LCP.
- No `<link rel="preload" fetchpriority="high">` for the LCP hero/gallery image.
- Embla carousel JS (category pills + curated slider) adds main-thread work; verify INP.

*(PageSpeed/CrUX field data unavailable — PSI quota exhausted during audit. Scores above are lab/structural estimates.)*

---

## Images — 50/100

- Main product images have descriptive alt text; **thumbnail (gallery dot-nav) images have empty `alt=""`**.
- All images PNG — convert to WebP/AVIF via Shopify CDN format param.
- Sitemap `<image:caption>` tags are all empty (alt text flows into these once populated).
- No responsive `srcset` with WebP.

---

## AI Search Readiness (GEO) — 61/100

**Best-in-class transactional/agentic setup (AI shopping-agent sub-score 82/100):**
- robots.txt → `/agents.md`, `/.well-known/ucp`, UCP/MCP endpoint `/api/ucp/mcp`.
- `agents.md` complete (6-step UCP flow, buyer-approval invariant, read-only endpoints, policies).
- `/.well-known/ucp` = full UCP 2026-04-08 merchant profile (checkout, fulfillment, catalog, 3 payment handlers).
- All AI crawlers allowed (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot).

**Informational-GEO gaps (why score isn't higher):**
- No JSON-LD (same root cause as Schema section) → 0 Google AI Overview product cards.
- Descriptions too short to cite (target 134–167 words).
- `/llms.txt` exists but just mirrors `agents.md` — should be a curated site-map document instead.
- `sitemap_agentic_discovery.xml` near-empty (only `/agents.md`).
- No brand entity presence (no About page, no Wikipedia/YouTube/Reddit signals).
- `/.well-known/ucp` service URLs reference internal `hivfyi-jp.myshopify.com` not `zaynahome.nl`.

**Platform readiness:** Google AIO 35 · ChatGPT 52 · Perplexity 48 · Bing Copilot 44 · AI Shopping Agents 82.

---

## SXO — 36/100 (search-experience / intent match)

For Dutch transactional keywords the store is structurally present but **invisible for category terms**:
- Collection pages (e.g. `bestek-lepels`, 7 products, 1 sentence) lose to IKEA/Bijenkorf/CookingLife PLPs (20–200 products, filters, 150–300 word category copy, review counts, `ItemList` schema).
- Product pages lack the star snippets that Bol.com/Xenos win on.
- **Gift-buyer persona entirely uncaptured** — no `/collections/cadeau` page, no gift framing, despite a gift-worthy assortment (high-conversion opportunity).
- No third-party trust score (Kiyoh/Trustpilot) — Dutch shoppers benchmark on these before buying from unfamiliar stores.

Persona scores: Price-shopper 35 · Gift-buyer 27 · Quality-seeker 33 (out of 100).

---

## Sitemaps

Shopify-managed index at `/sitemap.xml` → products (94) · pages (1) · collections (10) · blogs (1) · `sitemap_agentic_discovery.xml`. Format valid, auto-maintained (not editable). Two quality notes: agentic-discovery sitemap is near-empty; image captions empty.

---

## Methodology / Limitations
- Live-fetch + theme-source analysis. 8 specialist passes (technical, content, schema, sitemap, performance, GEO, e-commerce, SXO).
- No Google Search Console / GA4 access → no impressions, CTR, or indexation-coverage data.
- PSI/CrUX field CWV unavailable (quota) → performance scores are lab/structural.
- Review counts assessed from page fetch; a client-side review app, if present, may not have been captured.
