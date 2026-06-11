# Zayna Home — SEO Action Plan

Prioritized: **Critical** (fix now) > **High** (this week) > **Medium** (this month) > **Low** (backlog).
File paths reference the `zayna-theme` repo.

---

## CRITICAL

### C1 — Add Product / Offer / BreadcrumbList / FAQPage JSON-LD
**File:** `sections/main-product.liquid` (+ `sections/product-faq.liquid` content already exists)
The single highest-impact fix. Unlocks Google rich results, Shopping organic listings, and AI Overview product cards. Add inside the product section:

```liquid
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {{ product.title | json }},
  "description": {{ product.description | strip_html | json }},
  "url": {{ canonical_url | json }},
  "image": [{% for img in product.images %}"https:{{ img | image_url: width: 1200, format: 'webp' }}"{% unless forloop.last %},{% endunless %}{% endfor %}],
  "brand": { "@type": "Brand", "name": {{ shop.name | json }} },
  "sku": {{ product.selected_or_first_available_variant.sku | default: product.id | json }},
  "offers": {
    "@type": "Offer",
    "url": {{ canonical_url | json }},
    "priceCurrency": "EUR",
    "price": "{{ product.selected_or_first_available_variant.price | divided_by: 100.0 }}",
    "availability": "https://schema.org/{% if product.available %}InStock{% else %}OutOfStock{% endif %}",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": { "@type": "Organization", "name": {{ shop.name | json }} }
  }
}
</script>
```
Then add `BreadcrumbList` (Home > Collection > Product via `product.collections.first`), `FAQPage` (loop the existing FAQ Q/A), and `Organization` + `WebSite`+`SearchAction` in `layout/theme.liquid`. **Validate every type in Google Rich Results Test after deploy.**

### C2 — Fix the €1,00 price anomaly before schema goes live
**Where:** Shopify admin → product `dubbelwandige-glas-350ml`
Its `data-product-json` shows `price: 100` (€1,00). Correct it (or add a legitimate compare-at). If schema ships first, this submits €1,00 to Google Shopping = price-mismatch policy violation.

### C3 — Create the About / brand-entity page
**Where:** Shopify admin → new page `/pages/over-ons` (currently 404)
Brand story, Japandi curation angle, Dutch origin + warehouse, founding context, KvK 97745200 / VAT NL005285507B86 prominent. Link it in footer + `agents.md`. Gives Google E-E-A-T and every AI platform the raw material to describe the brand.

---

## HIGH

### H1 — Switch all images to WebP
**Files:** `snippets/product-gallery.liquid`, `snippets/product-card.liquid`, `sections/curated-edit.liquid`, others using `image_url`/`img_url` (0 `format: 'webp'` calls today).
Change to `{{ image | image_url: width: 1200, format: 'webp' }}` and add WebP `srcset`. 2–5× smaller images → LCP win.

### H2 — Launch reviews + `aggregateRating`
Install Judge.me (free tier) or Shopify native reviews. Post-purchase review-request email. Even 5–10 reviews/product unlocks star snippets and material E-E-A-T uplift. Feed `aggregateRating` into the C1 Product schema.

### H3 — Add `hreflang` self-referential tags
**File:** `layout/theme.liquid` `<head>` (0 today)
```liquid
<link rel="alternate" hreflang="nl-NL" href="{{ canonical_url }}">
<link rel="alternate" hreflang="x-default" href="{{ canonical_url }}">
```

### H4 — Complete Open Graph product tags
**File:** `sections/main-product.liquid` head (only `og:image*` present today)
Add `og:type=product`, `og:title`, `og:description`, `og:url`, `product:price:amount`, `product:price:currency=EUR`, `product:availability`. Enables Meta/Pinterest product catalogs.

### H5 — Fix empty thumbnail alt text
**File:** `snippets/product-gallery.liquid`
Thumbnails render `alt=""`. Pass the same alt string to thumbnail and main image.

---

## MEDIUM

### M1 — Collection intro copy (all 10 collections)
80–150 word category descriptions in Shopify admin (use cases, materials, care, curation angle). Verify `main-collection.liquid` renders `{{ collection.description }}` even when... it's the ranking lever for `bestekset 30-delig`, `voorraadpotten kopen`, etc.

### M2 — Add breadcrumbs (visible nav)
Pairs with C1's `BreadcrumbList`. Add a Home > Collection > Product nav strip in `main-product.liquid` and Home > Collection in `main-collection.liquid`.

### M3 — `noindex` thin facet pages
Single-filter collection URLs (`?filter.p.tag=…`) are indexable. Add `noindex,follow` when a `filter.`/`current_tags` param is present.

### M4 — Add FAQ blocks answering PAA
Put "Hoeveel bestek per persoon?", "Zijn glazen rietjes vaatwasserbestendig?" etc. on relevant collection/product pages (with `FAQPage` schema from C1). Earns a second SERP entry.

### M5 — Gift collection + framing
Create `/collections/cadeau-keuken` (15–20 hero SKUs), add "Ideaal als cadeau" badges, gift-wrap option at cart. Captures the unaddressed gift-buyer persona.

### M6 — Fix `/llms.txt` (separate from agents.md)
Rewrite as a true llmstxt.org site-map: one-paragraph brand description + curated links to key collections/policies, pointing to `agents.md` for the commerce protocol. Keep `agents.md` as the transaction document.

### M7 — Expand product descriptions to ~150 words
Lead with "what + who for", then material / dimensions / use-case / one differentiator. Prioritize top-20 bestsellers. Helps long-tail SERP + AI citation.

---

## LOW

- **L1** — Preload LCP image: `<link rel="preload" as="image" fetchpriority="high" href="{{ product.featured_image | image_url: width: 1200, format: 'webp' }}">` in `main-product.liquid`.
- **L2** — Populate image alt text in admin (flows into empty sitemap `<image:caption>`).
- **L3** — Enrich `sitemap_agentic_discovery.xml` (add llms.txt, /.well-known/ucp, over-ons, /collections/all).
- **L4** — Align title ↔ H1 wording; front-load ml/material.
- **L5** — Register Kiyoh/Trustpilot (free), collect 25+ shop reviews, show score in header.
- **L6** — Consider `zaynahome.nl` (not `hivfyi-jp.myshopify.com`) in `/.well-known/ucp` service URLs for strict UCP validators.
- **L7** — Cross-collection internal links + "Andere klanten bekeken ook" on PDPs.
- **L8** — HSTS `includeSubDomains; preload`; tighten CSP `script-src`.

---

## Sequenced Roadmap

| Week | Focus | Items |
|---|---|---|
| 1 | Structured data + data hygiene | C1, C2, C3, H4, H3 |
| 2 | Trust + media | H2, H1, H5, M2 |
| 3 | Content depth | M1, M7, M4, M6 |
| 4 | Conversion + crawl hygiene | M5, M3, L1–L8 |

**Biggest single lever:** C1 (JSON-LD). It alone moves Schema 10→~75 and lifts AI Overview / Shopping eligibility, raising the overall health score from ~56 to the mid-60s before any content work.
