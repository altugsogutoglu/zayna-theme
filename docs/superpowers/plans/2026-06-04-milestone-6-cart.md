# Milestone 6 — Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full cart experience — a real AJAX cart drawer (replacing the M4 stub) plus a standalone `/cart` page — with line items, quantity steppers, remove, free-shipping progress, applied-discount entry, complementary upsell, popular-choices empty state, and live header badge, all 1:1 with the Hydrogen source.

**Architecture:** A single `cart-contents` snippet (port of Hydrogen's `CartMain` + `CartSummary` + `CartEmpty`) renders both surfaces via a `layout` param (`drawer` | `page`). A static `sections/cart-drawer.liquid` is mounted globally in `theme.liquid` (replacing the M4 `aside` cart render); the drawer overlay/header/script stay fixed while the inner `[data-cart-drawer]` content is swapped. Mutations use the **Cart Ajax API with the `sections`/`sections_url` parameters** — `/cart/change.js`, `/cart/add.js`, `/cart/update.js` return rendered section HTML in one round-trip (atomic mutate+render, no mutate-then-refetch race). This is the same Section-Rendering no-reload idea proven in `collection.js` (fetch → parse → replace innerHTML → rebind), delivered through the cart mutation response. The `/cart` page uses the identical mechanism (`sections: main-cart,cart-drawer`) so page and drawer stay in sync. Complementary upsell is fetched async through the Product Recommendations API (same pattern as M4 `related-products`). `assets/cart.js` exposes `window.ZaynaCart` so `product.js` add-to-cart calls into it.

**Tech Stack:** Shopify Liquid (OS 2.0 sections/snippets/JSON templates), Cart Ajax API + Section Rendering API, Tailwind v4 (CLI build), vanilla JS.

---

## Decisions locked (from this session's AskUserQuestion)

1. **Cart page UX:** AJAX, no reload. Page + drawer share `cart.js`; mutations re-render via the `sections` param and swap in place.
2. **Promo codes:** Discount-code field **only**. Applied via `GET /discount/{code}` (native discount cookie) + cart re-render; applied cart-level discounts display read-only from `cart.cart_level_discount_applications`. **Gift-card field dropped** — Liquid storefronts cannot redeem gift cards before checkout. **Discount removal dropped** — no robust pre-checkout removal endpoint exists; the applied code carries to checkout. This is a documented divergence (like M5's facets).
3. **Empty-cart feed:** Merchant-configurable collection (theme setting `cart_empty_collection`); block hides gracefully when unset.

## Source-of-truth mapping (Hydrogen → Liquid)

| Hydrogen | This milestone |
|---|---|
| `CartMain.tsx` (`CartMain` + `CartEmpty`) | `snippets/cart-contents.liquid` |
| `CartLineItem.tsx` (`CartLineItem`, `CartLineQuantity`, `CartLineRemoveButton`) | `snippets/cart-line-item.liquid` + `cart.js` change handler |
| `CartSummary.tsx` (`CartSummary`, `FreeShippingProgress`, `CartDiscounts`) | summary block in `cart-contents.liquid` + `cart.js` discount handler |
| `CartUpsell.tsx` | `sections/cart-upsell.liquid` (async-fetched) + placeholder in `cart-contents.liquid` |
| `CartSuggestions.tsx` (empty-cart bestsellers) | `cart_empty_collection` theme setting rendered in `cart-contents.liquid` empty branch |
| `routes/($locale).cart.tsx` | `sections/main-cart.liquid` + `templates/cart.json` |
| `AddToCartButton.tsx` AJAX | `cart.js` `window.ZaynaCart.add` + `product.js` edit |
| `lib/constants.ts` `FREE_SHIPPING_THRESHOLD = 100` | `settings.free_shipping_threshold` theme setting (default 100) |

## File structure

- **Create** `snippets/cart-line-item.liquid` — one cart line (image, title, options, qty stepper, remove, line price).
- **Create** `snippets/cart-contents.liquid` — lines list + upsell placeholder + summary footer, OR empty state + suggestions; branches on `layout`.
- **Create** `sections/cart-upsell.liquid` — complementary recommendations list (fetch-only, like `related-products`).
- **Create** `sections/cart-drawer.liquid` — overlay shell + `cart-contents` (`layout: drawer`) + `<script src=cart.js>`. Mounted globally.
- **Create** `sections/main-cart.liquid` — `/cart` page article + `cart-contents` (`layout: page`).
- **Create** `templates/cart.json` — wires `main-cart`.
- **Create** `assets/cart.js` — `window.ZaynaCart` controller (change/remove/discount/add), section swap, badge sync, upsell rebind.
- **Modify** `config/settings_schema.json` — add "Cart" settings group (`free_shipping_threshold`, `cart_empty_collection`).
- **Modify** `layout/theme.liquid:39-40` — replace the M4 cart `aside` capture+render with `{% section 'cart-drawer' %}`.
- **Modify** `assets/product.js` — replace the M4 add-to-cart stub (the `refreshCart`/`openCartDrawer` helpers + the two submit handlers) with calls to `window.ZaynaCart.add`; drop the now-unused `esc` helper.

## Data-hook contract (keep stable across files)

- Drawer swap wrapper: `[data-cart-drawer]` (inner content swapped; overlay/header/script outside it).
- Page swap wrapper: `[data-cart-page]` (inner content swapped).
- Authoritative count source (rendered in both): `[data-cart-total-count][data-count="{{ cart.item_count }}"]`.
- Header badge (existing, `header.liquid:150`): `[data-cart-count]`.
- Line: `[data-cart-line]`; quantity/remove buttons: `[data-cart-change][data-line-key][data-quantity]`.
- Discount form: `[data-discount-form]` with input `[data-discount-input]`.
- Promo toggle: `[data-promo-toggle]` / panel `[data-promo-panel]`.
- Upsell placeholder + fetched wrapper: `[data-cart-upsell]` (placeholder also carries `data-url`).
- Drawer open trigger (existing): `[data-aside-open="cart"]`; controller in `theme.js` toggles `.expanded` on `.overlay[data-aside="cart"]`.

---

## Task 1: Cart theme settings + verify foundation

**Files:**
- Modify: `config/settings_schema.json` (append a group before the closing `]`)

- [ ] **Step 1: Add the Cart settings group**

In `config/settings_schema.json`, the file currently ends with the `Layout` group then `]`. Add a comma after the `Layout` group's closing `}` and insert this group before the final `]`:

```json
  {
    "name": "Cart",
    "settings": [
      { "type": "range", "id": "free_shipping_threshold", "label": "Free shipping threshold (€)", "min": 0, "max": 500, "step": 5, "unit": "€", "default": 100, "info": "Drives the cart free-shipping progress bar. Set to 0 to hide the bar." },
      { "type": "collection", "id": "cart_empty_collection", "label": "Empty-cart suggestions collection", "info": "Products shown under “Populaire keuzes” when the cart is empty. Leave unset to hide. Tip: point this at a Bestsellers or featured collection." }
    ]
  }
```

(`collection` settings cannot declare a `default` — that's expected; the empty state hides when unset.)

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('config/settings_schema.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Theme check**

Run: `npx shopify theme check config/settings_schema.json`
Expected: 0 errors (the 3 known false-positive warnings elsewhere are unrelated).

- [ ] **Step 4: Commit**

```bash
git add config/settings_schema.json
git commit -m "feat(cart): add Cart theme settings (free-shipping threshold + empty-cart collection)"
```

---

## Task 2: `snippets/cart-line-item.liquid`

Port of `CartLineItem.tsx`. Renders one line. Quantity/remove are buttons carrying the target quantity; `cart.js` performs the mutation. Decrement disabled at quantity 1 (use remove to clear). Skips the synthetic `Default Title` option for single-variant products.

**Files:**
- Create: `snippets/cart-line-item.liquid`

- [ ] **Step 1: Write the snippet**

```liquid
{% doc %}
  Renders a single cart line item (image, title, options, quantity stepper, remove, line price).
  Quantity/remove buttons carry the target quantity; assets/cart.js submits the change.
  @param {object} line_item - A cart line_item object.
  @param {string} [layout] - 'drawer' (default) or 'page'.
  @example
  {% render 'cart-line-item', line_item: item, layout: 'drawer' %}
{% enddoc %}
{%- liquid
  assign li = line_item
  assign img = li.image
  assign show_options = false
  unless li.product.has_only_default_variant
    assign show_options = true
  endunless
  assign dec_qty = li.quantity | minus: 1
  assign inc_qty = li.quantity | plus: 1
-%}
<li data-cart-line data-line-key="{{ li.key }}" class="flex gap-4 py-5 border-b border-border-soft last:border-0">
  {%- if img -%}
    <a href="{{ li.url }}" class="block h-24 w-20 shrink-0 overflow-hidden bg-cream">
      {{ img | image_url: width: 200 | image_tag:
        loading: 'lazy', width: 100, height: 100,
        alt: li.title,
        class: 'h-full w-full object-cover' }}
    </a>
  {%- endif -%}

  <div class="flex flex-1 min-w-0 flex-col gap-1">
    <div class="flex items-start justify-between gap-2">
      <a href="{{ li.url }}" class="font-display text-base leading-snug text-ink hover:text-clay transition-colors line-clamp-2 break-words">{{ li.product.title }}</a>
      <button type="button" data-cart-change data-line-key="{{ li.key }}" data-quantity="0" aria-label="Verwijderen uit winkelmand" class="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center text-stone-soft hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone focus-visible:ring-offset-2">
        {% render 'icon', name: 'trash', size: 15 %}
      </button>
    </div>

    {%- if show_options -%}
      <ul class="flex flex-wrap gap-x-3">
        {%- for opt in li.options_with_values -%}
          {%- unless opt.value == 'Default Title' -%}
            <li><small class="text-xs text-ink-soft">{{ opt.name }}: {{ opt.value }}</small></li>
          {%- endunless -%}
        {%- endfor -%}
      </ul>
    {%- endif -%}

    {%- if li.selling_plan_allocation -%}
      <small class="text-xs text-ink-soft">{{ li.selling_plan_allocation.selling_plan.name }}</small>
    {%- endif -%}

    <div class="mt-2 flex items-center justify-between gap-3">
      <div class="inline-flex items-center h-10 border border-border-soft bg-surface select-none" role="group" aria-label="Aantal">
        <button type="button" data-cart-change data-line-key="{{ li.key }}" data-quantity="{{ dec_qty }}" aria-label="Aantal verlagen" {% if li.quantity <= 1 %}disabled{% endif %} class="grid h-full w-10 place-items-center text-ink-soft hover:text-clay disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:text-clay">
          {% render 'icon', name: 'minus', size: 14 %}
        </button>
        <span aria-live="polite" class="min-w-[2ch] text-center text-sm tabular-nums text-ink">{{ li.quantity }}</span>
        <button type="button" data-cart-change data-line-key="{{ li.key }}" data-quantity="{{ inc_qty }}" aria-label="Aantal verhogen" class="grid h-full w-10 place-items-center text-ink-soft hover:text-clay disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:text-clay">
          {% render 'icon', name: 'plus', size: 14 %}
        </button>
      </div>
      <div class="text-price text-ink shrink-0">{{ li.final_line_price | money }}</div>
    </div>
  </div>
</li>
```

- [ ] **Step 2: Add the `trash` icon to `snippets/icon.liquid`**

`icon.liquid` has `minus`, `plus`, `x` but no `trash`. Add a `when 'trash'` case (Lucide `trash-2`, matching Hydrogen's `Trash2`). Insert alongside the other `when` cases, inside the existing `<svg ... >` wrapper convention used by the snippet (match the surrounding cases' stroke attributes):

```liquid
    when 'trash'
      echo '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>'
```

(First open `snippets/icon.liquid` to confirm the exact echo/markup convention used by existing cases — e.g. whether paths are echoed inside a shared `<svg>` or each case prints its own `<svg>` — and match it precisely.)

- [ ] **Step 3: Theme check**

Run: `npx shopify theme check snippets/cart-line-item.liquid snippets/icon.liquid`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add snippets/cart-line-item.liquid snippets/icon.liquid
git commit -m "feat(cart): cart-line-item snippet + trash icon"
```

---

## Task 3: `snippets/cart-contents.liquid`

Port of `CartMain` + `CartSummary` + `CartEmpty` + `FreeShippingProgress` + `CartDiscounts`. One snippet, branches on `layout`. Renders the always-present `[data-cart-total-count]` so `cart.js` can read the authoritative count after any swap.

**Files:**
- Create: `snippets/cart-contents.liquid`

- [ ] **Step 1: Write the snippet**

```liquid
{% doc %}
  Cart body used by both the drawer and the /cart page. Renders line items + upsell
  placeholder + summary footer when the cart has items, otherwise the empty state
  with optional "Populaire keuzes" suggestions. Behavior wired by assets/cart.js.
  @param {string} layout - 'drawer' or 'page'.
  @example
  {% render 'cart-contents', layout: 'drawer' %}
{% enddoc %}
{%- liquid
  assign is_page = false
  if layout == 'page'
    assign is_page = true
  endif

  assign threshold = settings.free_shipping_threshold | default: 0
  assign threshold_cents = threshold | times: 100
  assign subtotal_cents = cart.items_subtotal_price
  assign remaining_cents = threshold_cents | minus: subtotal_cents
  if remaining_cents < 0
    assign remaining_cents = 0
  endif
  assign reached = false
  if threshold_cents > 0 and remaining_cents == 0
    assign reached = true
  endif
  assign pct = 0
  if threshold_cents > 0
    assign pct = subtotal_cents | times: 100 | divided_by: threshold_cents
    if pct > 100
      assign pct = 100
    endif
  endif

  assign first_item = cart.items | first
  assign upsell_pid = first_item.product.id
  capture upsell_url
    echo routes.product_recommendations_url
    echo '?section_id=cart-upsell&intent=complementary&limit=3&product_id='
    echo upsell_pid
  endcapture

  assign applied_discounts = cart.cart_level_discount_applications
-%}
<span data-cart-total-count data-count="{{ cart.item_count }}" hidden></span>
<section class="flex {% unless is_page %}h-full{% endunless %} flex-col bg-surface" aria-label="{% if is_page %}Winkelmand pagina{% else %}Winkelmand lade{% endif %}">
  {%- if cart.item_count > 0 -%}
    <div class="flex flex-1 flex-col {% unless is_page %}overflow-hidden{% endunless %}">
      <p class="sr-only">Producten in winkelmand</p>
      <div class="{% unless is_page %}flex-1 overflow-y-auto overscroll-contain{% endunless %} px-5 md:px-6 py-2 md:py-4">
        <ul>
          {%- for item in cart.items -%}
            {% render 'cart-line-item', line_item: item, layout: layout %}
          {%- endfor -%}
        </ul>
      </div>

      {%- if upsell_pid != blank -%}
        <div data-cart-upsell data-url="{{ upsell_url }}"></div>
      {%- endif -%}

      <div class="cart-drawer-footer border-t border-border-soft bg-surface px-5 md:px-6 pt-4 md:pt-5 space-y-4">
        {%- if threshold_cents > 0 -%}
          <div class="space-y-2">
            <p class="text-xs text-ink-soft">
              {%- if reached -%}
                Je komt in aanmerking voor gratis verzending <span aria-hidden="true">🎉</span>
              {%- else -%}
                Nog <span class="text-ink font-medium tabular-nums">{{ remaining_cents | money }}</span> tot gratis verzending
              {%- endif -%}
            </p>
            <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ pct }}" aria-label="Voortgang gratis verzending" class="h-1.5 w-full overflow-hidden rounded-full bg-border-soft">
              <div class="h-full rounded-full bg-clay transition-[width] duration-500" style="width: {{ pct }}%"></div>
            </div>
          </div>
        {%- endif -%}

        <div class="border-t border-border-soft/70 pt-1">
          <button type="button" data-promo-toggle aria-expanded="{% if applied_discounts.size > 0 %}true{% else %}false{% endif %}" aria-controls="cart-promo-{{ layout }}" class="flex w-full items-center justify-between py-2 text-left text-[13px] text-ink-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:text-ink">
            <span>Kortingscode{% if applied_discounts.size > 0 %}<span class="ml-2 text-[11px] uppercase tracking-[0.14em] text-clay">Toegepast</span>{% endif %}</span>
            {% render 'icon', name: 'chevron-down', size: 16 %}
          </button>
          <div id="cart-promo-{{ layout }}" data-promo-panel class="space-y-3 pt-2 pb-1 {% if applied_discounts.size == 0 %}hidden{% endif %}">
            {%- if applied_discounts.size > 0 -%}
              <ul class="space-y-1">
                {%- for d in applied_discounts -%}
                  <li class="flex items-center justify-between text-xs">
                    <span class="text-ink">{{ d.title }}</span>
                    <span class="text-clay tabular-nums">-{{ d.total_allocated_amount | money }}</span>
                  </li>
                {%- endfor -%}
              </ul>
            {%- endif -%}
            <form data-discount-form class="flex gap-2">
              <label for="discount-{{ layout }}" class="sr-only">Kortingscode</label>
              <input id="discount-{{ layout }}" data-discount-input type="text" name="discount" placeholder="Kortingscode" class="flex-1 border border-border-soft bg-surface px-3 h-10 text-sm text-ink focus:outline-none focus:border-stone">
              <button type="submit" aria-label="Kortingscode toepassen" class="h-10 px-4 bg-cream text-ink text-xs uppercase tracking-wide hover:bg-border-soft">Toepassen</button>
            </form>
          </div>
        </div>

        <div class="flex items-baseline justify-between">
          <span class="text-label text-ink-soft">Subtotaal</span>
          <span class="text-price text-ink">{{ cart.items_subtotal_price | money }}</span>
        </div>

        <div class="space-y-3">
          {% form 'cart' %}
            <button type="submit" name="checkout" class="flex w-full h-12 items-center justify-center bg-stone text-white text-sm uppercase tracking-wide hover:bg-clay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone focus-visible:ring-offset-2">Doorgaan naar afrekenen</button>
          {% endform %}
          <p class="text-xs text-center text-ink-soft">BTW en verzendkosten worden berekend bij het afrekenen.</p>
        </div>
      </div>
    </div>
  {%- else -%}
    {%- liquid
      assign empty_col = settings.cart_empty_collection
      assign has_suggestions = false
      if empty_col != blank and empty_col.products_count > 0
        assign has_suggestions = true
      endif
    -%}
    <div class="relative flex flex-1 flex-col {% unless is_page %}overflow-y-auto overscroll-contain{% endunless %} px-6 py-8 sm:px-8 sm:py-12">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 opacity-80" style="background: radial-gradient(70% 70% at 80% 10%, rgba(181,101,29,0.08), transparent 60%), radial-gradient(60% 60% at 10% 90%, rgba(138,154,123,0.10), transparent 60%);"></div>
      <div class="relative m-auto flex w-full max-w-md flex-col items-center py-4">
        <div class="max-w-xs text-center">
          <p class="mb-5 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.22em] text-clay">
            <span aria-hidden="true" class="block h-px w-8 bg-clay/60"></span>Winkelmand<span aria-hidden="true" class="block h-px w-8 bg-clay/60"></span>
          </p>
          <p class="font-display text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] tracking-[-0.01em] text-ink">Je winkelmand is nog leeg.</p>
          <p class="mt-4 text-[14px] leading-relaxed text-ink-soft">Bekijk onze collectie en ontdek stijlvolle producten voor je keuken en huis.</p>
          <a href="{{ routes.all_products_collection_url }}" class="group mt-7 inline-flex items-center justify-center gap-3 bg-ink px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] text-surface transition-colors hover:bg-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2">
            Bekijk collectie <span aria-hidden="true" class="text-base leading-none transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
        {%- if has_suggestions -%}
          <div class="mt-10 w-full sm:mt-12">
            <section aria-label="Populaire keuzes" class="w-full">
              <p class="text-label text-ink-soft mb-4">Populaire keuzes</p>
              <div class="grid grid-cols-2 gap-x-4 gap-y-8">
                {%- for product in empty_col.products limit: 4 -%}
                  {% render 'product-card', product: product, loading: 'lazy' %}
                {%- endfor -%}
              </div>
            </section>
          </div>
        {%- endif -%}
      </div>
    </div>
  {%- endif -%}
</section>
```

- [ ] **Step 2: Build CSS (new utility class combos may appear)**

Run: `npm run build:css`
Expected: exit 0.

- [ ] **Step 3: Theme check**

Run: `npx shopify theme check snippets/cart-contents.liquid`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add snippets/cart-contents.liquid assets/tailwind.css
git commit -m "feat(cart): cart-contents snippet (lines, summary, free-shipping, discount, empty state)"
```

---

## Task 4: `sections/cart-upsell.liquid`

Port of `CartUpsell.tsx`. Fetch-only section (never placed on a page directly) — rendered through the Product Recommendations API with `intent=complementary`, exactly like M4 `related-products`. `cart.js` fetches it into the `[data-cart-upsell]` placeholder emitted by `cart-contents`.

**Files:**
- Create: `sections/cart-upsell.liquid`

- [ ] **Step 1: Write the section**

```liquid
{%- comment -%}
  Complementary upsell ("Maak je set compleet") for the cart drawer/page.
  Fetched async by assets/cart.js via routes.product_recommendations_url with
  intent=complementary. Mirrors the related-products recommendations pattern.
{%- endcomment -%}
<div data-cart-upsell>
  {%- if recommendations.performed and recommendations.products_count > 0 -%}
    <section aria-label="Maak je set compleet" class="border-t border-border-soft px-5 md:px-6 py-4">
      <p class="text-label text-ink-soft mb-3">Maak je set compleet</p>
      <ul class="space-y-3">
        {%- for product in recommendations.products limit: 3 -%}
          {%- assign variant = product.selected_or_first_available_variant -%}
          <li class="flex items-center gap-3">
            {%- if product.featured_image -%}
              {{ product.featured_image | image_url: width: 96 | image_tag:
                loading: 'lazy', width: 48, height: 48,
                alt: product.title,
                class: 'h-12 w-12 shrink-0 object-cover' }}
            {%- endif -%}
            <div class="min-w-0 flex-1">
              <a href="{{ product.url }}" class="block truncate text-sm text-ink hover:text-clay transition-colors">{{ product.title }}</a>
              <p class="text-xs text-ink-soft">{{ product.price_min | money }}</p>
            </div>
            {%- if variant -%}
              <form data-upsell-add class="w-28 shrink-0">
                <input type="hidden" name="id" value="{{ variant.id }}">
                <button type="submit" {% unless variant.available %}disabled{% endunless %} class="w-full h-9 bg-ink text-white hover:bg-clay transition-colors text-[11px] uppercase tracking-[0.16em] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2">Toevoegen</button>
              </form>
            {%- endif -%}
          </li>
        {%- endfor -%}
      </ul>
    </section>
  {%- endif -%}
</div>

{% schema %}
{
  "name": "Cart upsell",
  "tag": "section"
}
{% endschema %}
```

- [ ] **Step 2: Build CSS + theme check**

Run: `npm run build:css && npx shopify theme check sections/cart-upsell.liquid`
Expected: build exit 0; 0 theme-check errors.

- [ ] **Step 3: Commit**

```bash
git add sections/cart-upsell.liquid assets/tailwind.css
git commit -m "feat(cart): cart-upsell section (complementary recommendations)"
```

---

## Task 5: `sections/cart-drawer.liquid` + mount in `theme.liquid`

The static, globally-mounted drawer. Overlay shell + header + `<script src=cart.js>` stay fixed; the inner `[data-cart-drawer]` (which holds `cart-contents`) is what `cart.js` swaps. Uses the same `.overlay`/`.close-outside`/`.expanded` CSS the drawer controller in `theme.js` already drives (pre-staged in `src/tailwind.css`).

**Files:**
- Create: `sections/cart-drawer.liquid`
- Modify: `layout/theme.liquid:39-40`

- [ ] **Step 1: Write the section**

```liquid
{%- comment -%}
  Global cart drawer. Mounted once in theme.liquid via {% section 'cart-drawer' %}.
  The overlay/header/script are fixed; assets/cart.js swaps the inner [data-cart-drawer]
  via the Cart Ajax API `sections` param. Opened by the document-delegated drawer
  controller in theme.js ([data-aside-open="cart"] toggles .overlay.expanded).
{%- endcomment -%}
<script src="{{ 'cart.js' | asset_url }}" defer="defer"></script>
<div class="overlay" data-aside="cart" role="dialog" aria-modal="true" aria-label="{{ 'general.cart.title' | t }}">
  <button type="button" class="close-outside" aria-label="{{ 'general.accessibility.close' | t }}" data-aside-close></button>
  <aside class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border-soft px-5 md:px-6 h-[var(--header-height)] shrink-0">
      <span class="text-label text-ink">{{ 'general.cart.title' | t }}</span>
      <button type="button" class="p-2 -m-2 text-ink hover:text-clay transition-colors" aria-label="{{ 'general.accessibility.close' | t }}" data-aside-close>
        {% render 'icon', name: 'x', size: 20 %}
      </button>
    </header>
    <div class="flex-1 min-h-0 flex flex-col" data-cart-drawer>
      {% render 'cart-contents', layout: 'drawer' %}
    </div>
  </aside>
</div>

{% schema %}
{
  "name": "Cart drawer",
  "tag": "section"
}
{% endschema %}
```

- [ ] **Step 2: Mount in `theme.liquid`, removing the M4 stub**

Replace lines 39-40 of `layout/theme.liquid`:

```liquid
    {%- capture cart_body -%}<div class="px-5 md:px-6 py-6 text-sm text-ink-soft" data-cart-drawer-body>{{ 'general.cart.empty' | t }}</div>{%- endcapture -%}
    {% render 'aside', type: 'cart', heading: 'general.cart.title' | t, aside_body: cart_body %}
```

with:

```liquid
    {% section 'cart-drawer' %}
```

- [ ] **Step 3: Build CSS + theme check**

Run: `npm run build:css && npx shopify theme check sections/cart-drawer.liquid layout/theme.liquid`
Expected: build exit 0; 0 errors.

- [ ] **Step 4: Commit**

```bash
git add sections/cart-drawer.liquid layout/theme.liquid assets/tailwind.css
git commit -m "feat(cart): global cart-drawer section, replaces M4 aside stub in theme.liquid"
```

---

## Task 6: `sections/main-cart.liquid` + `templates/cart.json`

Port of `routes/($locale).cart.tsx` default export. Page wrapper + `cart-contents` (`layout: page`). No `cart.js` script here — it's already global via `cart-drawer`.

**Files:**
- Create: `sections/main-cart.liquid`
- Create: `templates/cart.json`

- [ ] **Step 1: Write the section**

```liquid
{%- comment -%}
  Standalone /cart page. Mutations are AJAX (assets/cart.js swaps [data-cart-page]
  via the Cart Ajax API `sections` param: main-cart,cart-drawer). cart.js loads
  globally from the cart-drawer section.
{%- endcomment -%}
<article class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-16" data-cart-page>
  <header class="mb-10">
    <p class="text-label text-clay mb-3">{{ 'general.cart.title' | t }}</p>
    <h1 class="font-display text-h1">Je winkelmand.</h1>
  </header>
  {% render 'cart-contents', layout: 'page' %}
</article>

{% schema %}
{
  "name": "Cart",
  "tag": "section"
}
{% endschema %}
```

- [ ] **Step 2: Write the template**

```json
{
  "sections": {
    "main": {
      "type": "main-cart"
    }
  },
  "order": ["main"]
}
```

- [ ] **Step 3: Validate JSON + theme check**

Run: `node -e "JSON.parse(require('fs').readFileSync('templates/cart.json','utf8')); console.log('ok')" && npx shopify theme check sections/main-cart.liquid templates/cart.json`
Expected: `ok`; 0 errors.

- [ ] **Step 4: Commit**

```bash
git add sections/main-cart.liquid templates/cart.json
git commit -m "feat(cart): main-cart section + cart.json template"
```

---

## Task 7: `assets/cart.js`

The controller. Exposes `window.ZaynaCart` (`add`, `change`, `applyDiscount`, `open`). Mutations carry `sections`/`sections_url`; responses are swapped in; the header badge is read from the authoritative `[data-cart-total-count]` after each swap (works for both `change.js`, which returns the cart, and `add.js`, which returns only the added item). Upsell is (re)fetched after each swap. Drawer open/close stays owned by `theme.js`.

**Files:**
- Create: `assets/cart.js`

- [ ] **Step 1: Write the controller**

```javascript
// Zayna Home — cart controller. Loaded once globally from the cart-drawer section.
(() => {
  'use strict';
  if (window.__zhCartInit) return;
  window.__zhCartInit = true;

  let busy = false;

  const sectionsForPath = () => {
    const ids = ['cart-drawer'];
    if (document.querySelector('[data-cart-page]')) ids.unshift('main-cart');
    return ids.join(',');
  };

  function updateCount(n) {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = n;
      el.classList.toggle('hidden', !n);
    });
  }

  function syncCountFromDom() {
    const el = document.querySelector('[data-cart-drawer] [data-cart-total-count]');
    if (el) updateCount(parseInt(el.getAttribute('data-count'), 10) || 0);
  }

  function swap(html, wrapperSelector) {
    if (!html) return;
    const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector(wrapperSelector);
    const cur = document.querySelector(wrapperSelector);
    if (fresh && cur) cur.innerHTML = fresh.innerHTML;
  }

  function applySections(sections) {
    if (sections) {
      if (sections['cart-drawer']) swap(sections['cart-drawer'], '[data-cart-drawer]');
      if (sections['main-cart']) swap(sections['main-cart'], '[data-cart-page]');
    }
    syncCountFromDom();
    bindUpsell();
  }

  async function postJSON(url, body) {
    body.sections = sectionsForPath();
    body.sections_url = window.location.pathname;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    return data;
  }

  function setBusy(state) {
    busy = state;
    document.querySelectorAll('[data-cart-drawer], [data-cart-page]').forEach((r) => {
      if (state) r.setAttribute('aria-busy', 'true');
      else r.removeAttribute('aria-busy');
    });
  }

  async function change(lineKey, quantity) {
    if (busy) return;
    setBusy(true);
    try {
      const data = await postJSON('/cart/change.js', { id: lineKey, quantity });
      applySections(data.sections);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function add(formData) {
    if (busy) return;
    setBusy(true);
    formData.append('sections', sectionsForPath());
    formData.append('sections_url', window.location.pathname);
    try {
      const res = await fetch('/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw data;
      applySections(data.sections);
      open();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function applyDiscount(code) {
    if (busy || !code) return;
    setBusy(true);
    try {
      // Native discount cookie; response body (homepage) is discarded.
      await fetch('/discount/' + encodeURIComponent(code), { method: 'GET' }).catch(() => {});
      // No-op cart update to pull fresh sections reflecting the applied discount.
      const data = await postJSON('/cart/update.js', {});
      applySections(data.sections);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function open() {
    const trigger = document.querySelector('[data-aside-open="cart"]');
    if (trigger) trigger.click();
  }

  function bindUpsell() {
    document.querySelectorAll('[data-cart-upsell][data-url]').forEach(async (el) => {
      const url = el.getAttribute('data-url');
      if (!url || el.dataset.loaded === url) return;
      el.dataset.loaded = url;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const fresh = new DOMParser().parseFromString(await res.text(), 'text/html').querySelector('[data-cart-upsell]');
        if (fresh) el.innerHTML = fresh.innerHTML;
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Delegated handlers (survive section swaps — listeners live on document).
  document.addEventListener('click', (e) => {
    const changeBtn = e.target.closest('[data-cart-change]');
    if (changeBtn && !changeBtn.disabled) {
      change(changeBtn.getAttribute('data-line-key'), parseInt(changeBtn.getAttribute('data-quantity'), 10));
      return;
    }
    const toggle = e.target.closest('[data-promo-toggle]');
    if (toggle) {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const panel = toggle.parentElement.querySelector('[data-promo-panel]');
      if (panel) panel.classList.toggle('hidden', expanded);
    }
  });

  document.addEventListener('submit', (e) => {
    const discountForm = e.target.closest('[data-discount-form]');
    if (discountForm) {
      e.preventDefault();
      const input = discountForm.querySelector('[data-discount-input]');
      if (input && input.value.trim()) applyDiscount(input.value.trim());
      return;
    }
    const upsellForm = e.target.closest('[data-upsell-add]');
    if (upsellForm) {
      e.preventDefault();
      add(new FormData(upsellForm));
    }
  });

  window.ZaynaCart = { add, change, applyDiscount, open };

  // Initial upsell load for the server-rendered drawer.
  bindUpsell();
})();
```

- [ ] **Step 2: Theme check (asset JS isn't type-checked, but run the full check to confirm no regressions)**

Run: `npx shopify theme check`
Expected: 0 errors (3 known false-positive warnings allowed).

- [ ] **Step 3: Commit**

```bash
git add assets/cart.js
git commit -m "feat(cart): cart.js controller (Ajax sections mutate+swap, discount, upsell, window.ZaynaCart)"
```

---

## Task 8: Rewire `assets/product.js` add-to-cart to `window.ZaynaCart`

Replace the M4 stub (section "3. AJAX add-to-cart + drawer stub"): drop `refreshCart` and `openCartDrawer`; route both the main form and the sticky form through `window.ZaynaCart.add`. Drop the now-unused `esc` helper.

**Files:**
- Modify: `assets/product.js`

- [ ] **Step 1: Replace the add-to-cart block**

Replace everything from `if (form) {` (the main-form submit handler) through the closing of `function openCartDrawer() { ... }` (end of section 3) with:

```javascript
    /* -------------------------------------------------------------- */
    /* 3. AJAX add-to-cart (delegates to window.ZaynaCart from cart.js) */
    /* -------------------------------------------------------------- */
    const addViaCart = async (sourceForm, btns) => {
      const originals = btns.map((b) => b.textContent);
      btns.forEach((b) => { b.disabled = true; b.textContent = labels.adding || 'Toevoegen…'; });
      try {
        if (window.ZaynaCart && typeof window.ZaynaCart.add === 'function') {
          await window.ZaynaCart.add(new FormData(sourceForm));
        } else {
          await fetch('/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(sourceForm) });
          window.location.href = '/cart';
        }
      } catch (err) {
        console.error(err);
      } finally {
        btns.forEach((b, i) => { b.disabled = false; b.textContent = originals[i]; });
      }
    };

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (addBtn && addBtn.disabled) return;
        addViaCart(form, Array.from(root.querySelectorAll('[data-add-button]')));
      });
    }

    const stickyForm = root.querySelector('[data-sticky-form]');
    const stickyId = root.querySelector('[data-sticky-form] [data-variant-id]');
    if (stickyForm) {
      stickyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (stickyId && idInput) stickyId.value = idInput.value;
        addViaCart(stickyForm, Array.from(stickyForm.querySelectorAll('[data-add-button]')));
      });
    }
```

- [ ] **Step 2: Remove the now-unused `esc` helper**

Near the top of `product.js`, delete the line:

```javascript
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
```

Confirm `esc` has no other references first: `grep -n "esc(" assets/product.js` should return nothing after the section-3 replacement.

- [ ] **Step 3: Verify no leftover stub references**

Run: `grep -n "refreshCart\|openCartDrawer\|data-cart-drawer-body" assets/product.js`
Expected: no output.

- [ ] **Step 4: Theme check**

Run: `npx shopify theme check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add assets/product.js
git commit -m "refactor(product): route add-to-cart through window.ZaynaCart, drop M4 drawer stub"
```

---

## Task 9: Parity QA — build, theme check, and Playwright measurement

No unit runner. Verify by building, checking, and driving the live preview at `http://127.0.0.1:9292` with Playwright MCP. **Measure — never eyeball.** (User runs `shopify theme dev --store zaynahome-store.myshopify.com`.)

- [ ] **Step 1: Full build + theme check**

Run: `npm run build:css && npx shopify theme check`
Expected: build exit 0; theme check 0 ERRORS (≤3 known false-positive warnings).

- [ ] **Step 2: Empty-cart drawer**

Navigate to `http://127.0.0.1:9292/`. Click `[data-aside-open="cart"]`. Assert via `browser_evaluate`:
- `document.querySelector('.overlay[data-aside="cart"]').classList.contains('expanded') === true`
- empty headline `Je winkelmand is nog leeg.` present.
- If `cart_empty_collection` is set: `document.querySelectorAll('[aria-label="Populaire keuzes"] a').length >= 1`.
- Escape closes: after `browser_press_key Escape`, `expanded === false`.

- [ ] **Step 3: Add to cart from PDP opens the drawer with the line**

Navigate to a product page. Record `network_requests`. Click the add-to-cart submit. Assert:
- a POST to `/cart/add.js` occurred with `sections` in the body.
- no full navigation happened (`window.location.pathname` unchanged; SPA-style).
- drawer is `expanded`.
- `document.querySelectorAll('[data-cart-drawer] [data-cart-line]').length >= 1`.
- header badge: `document.querySelector('[data-cart-count]').textContent` equals the rendered `[data-cart-total-count]` `data-count`, and the badge is not `.hidden`.

- [ ] **Step 4: Quantity stepper + remove (drawer)**

In the open drawer:
- Read line quantity. Click `[data-cart-change]` increment. Assert a POST to `/cart/change.js`, then the displayed quantity increased by 1 and the line price (`getBoundingClientRect` exists + text changed) updated.
- Click decrement back to 1; assert the decrement button is now `disabled`.
- Click the remove button (`data-quantity="0"`). Assert the line count dropped and, if last line, the empty state rendered and the badge hidden.

- [ ] **Step 5: Free-shipping progress**

With items in the cart, assert the progressbar exists and its `aria-valuenow` is a number 0–100 consistent with subtotal vs `free_shipping_threshold` (compute: `Math.min(100, Math.round(subtotal/threshold*100))`). Add quantity and assert `aria-valuenow` (and the bar's inline `width`) increased.

- [ ] **Step 6: Discount entry**

Open the promo panel (`[data-promo-toggle]`; assert `[data-promo-panel]` loses `.hidden`). Submit a known test discount code via `[data-discount-form]`. Assert a `GET /discount/<code>` then a POST `/cart/update.js` occurred, and (if the code applies at cart level) a row appears under `[data-promo-panel]` and the toggle shows `Toegepast`. (If no test code is available, confirm the request sequence fires and the panel re-renders without error.)

- [ ] **Step 7: Upsell**

With items present, assert `[data-cart-upsell]` issued a GET to `routes.product_recommendations_url` (contains `section_id=cart-upsell` + `intent=complementary`). If recommendations exist for the product, assert `document.querySelectorAll('[data-cart-upsell] [data-upsell-add]').length >= 1`; clicking one adds it (POST `/cart/add.js`) and the line list grows.

- [ ] **Step 8: `/cart` page parity (AJAX)**

Navigate to `http://127.0.0.1:9292/cart`. Assert the page renders `[data-cart-page]` with line items and the same summary. Change a quantity; assert a POST `/cart/change.js` with `sections` including `main-cart`, the page swapped in place (no reload — `performance.navigation`/no new document), AND the drawer stayed in sync (`[data-cart-drawer] [data-cart-line]` count matches). Verify the checkout button is inside a `form[action="/cart"]`.

- [ ] **Step 9: Visual parity spot-check vs Hydrogen**

Compare drawer layout against the live Hydrogen site (header height, line spacing `py-5`, footer pinned at bottom in drawer via `.cart-drawer-footer`, sticky footer not scrolling while lines scroll). Use `getBoundingClientRect` to confirm the footer's bottom is at/above viewport bottom and the lines container scrolls independently.

- [ ] **Step 10: Record results + commit any fixes**

Document measured results inline in the task. Commit any QA fixes discovered:

```bash
git add -A
git commit -m "fix(cart): <specific parity fix from QA>"
```

---

## Self-review notes (spec coverage)

- Line items / qty / remove → Tasks 2, 7. Subtotal/summary → Task 3. Free-shipping bar → Task 3 (+ setting Task 1). Upsell → Tasks 3, 4, 7. Empty state + suggestions → Tasks 1, 3. Real AJAX drawer replacing M4 stub → Tasks 5, 7, 8. `/cart` page → Task 6. Discount (divergence) → Tasks 3, 7. Gift card + discount removal: intentionally omitted (platform limitation, documented above).
- Type/hook consistency: `[data-cart-change]`/`data-line-key`/`data-quantity`, `[data-cart-drawer]`, `[data-cart-page]`, `[data-cart-total-count]`, `[data-cart-upsell]`, `[data-discount-form]`/`[data-discount-input]`, `[data-promo-toggle]`/`[data-promo-panel]`, `window.ZaynaCart.add` — all defined in Task 7 and referenced consistently in Tasks 2/3/4/6/8.

## Merge checklist (after checkpoint approval)

1. `git pull --rebase origin main`
2. `git checkout main && git merge --no-ff feat/milestone-6-cart -m "Merge Milestone 6: Cart (AJAX drawer + /cart page, line items, free-shipping, discount, upsell, empty state)"`
3. `git pull --rebase origin main && git push origin main`
4. `git branch -d feat/milestone-6-cart`
