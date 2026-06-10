# Milestone 8 — Blog & content pages

Port the Hydrogen blog, page, contact, track-order, policy, 404, and password
routes to Online Store 2.0 Liquid templates + sections, 1:1 with the live site.

Source (read for 1:1 reference, not reused):
`/Users/altugsogutoglu/Herd/zayna-home/app/routes/($locale).blogs.*`,
`.pages.$handle.tsx`, `.pages.contact.tsx`, `.pages.track-order.tsx`,
`.policies.$handle.tsx`, `.$.tsx` (404), and `root.tsx` ErrorBoundary.

## Conventions (already established, reuse — do not relearn)
- Section content = Dutch defaults editable in theme editor. Chrome UI strings
  go through `locales/*.json`. Most M8 copy is page content → Dutch section defaults.
- `.rich-text` class (src/tailwind.css) already replaces Hydrogen's `prose` — use it
  for all RTE/policy/article bodies.
- Tokens: `text-h1/h2/h3`, `text-label`, `font-display`, `font-signature`, colors
  `ink/ink-soft/clay/stone/stone-soft/cream/sage/danger/border-soft`. Page wrapper
  pattern: `mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-16` (or `max-w-7xl` for grids).
- Image alt gotcha: never put `| filter` inside `image_tag` named args. Precompute
  `assign x_alt = article.image.alt | default: article.title` then pass `alt: x_alt`.
- After any class change: `npm run build:css`, commit `assets/tailwind.css`.
- Icons available in snippets/icon.liquid: mail, instagram, user, package-check,
  arrow-right, file-text, search, lock, etc. (track-order uses user/mail/package-check;
  Hydrogen used UserRound/Mail/PackageSearch → map to user/mail/package-check).
- Do NOT hand-edit editor-managed JSON (index.json, header-group.json, footer-group.json).
  M8 adds its own new template JSON files only.

## Tasks (one section + its template each)

### Task 1 — Blog template (article grid)
- `sections/main-blog.liquid`: header with `Journal` eyebrow (`text-label text-clay`) +
  `blog.title` (`font-display text-h1`); `{% paginate blog.articles by: 12 %}` grid
  `grid-cols-1 md:grid-cols-2 gap-10`. Each card (matches Hydrogen ArticleItem):
  `aspect-[3/2]` image `object-cover` with `group-hover:scale-[1.02]`, date
  (`{{ article.published_at | date: '%-d %B %Y' }}` → Dutch via shop locale),
  `font-display text-h2` title, `line-clamp-3` excerpt. Default paginate nav at bottom
  (reuse the M5 pagination markup style; infinite scroll NOT required for blog — plain
  prev/next is fine and matches a simpler page).
- `templates/blog.json`: `{ "sections": { "main": { "type": "main-blog" } }, "order": ["main"] }`.

### Task 2 — Article template
- `sections/main-article.liquid`: `max-w-3xl` wrapper. Header: date eyebrow
  (`text-label text-clay`), `font-display text-h1` title, optional
  `By {{ article.author }}` (`text-ink-soft text-sm`, Dutch: "Door {author}").
  `aspect-[3/2]` hero image. Body `{{ article.content }}` in `<div class="rich-text">`.
- `templates/article.json`: section `main-article`.

### Task 3 — Generic page template
- `sections/main-page.liquid`: `max-w-3xl`. Eyebrow `Pagina` (or `Een briefje` when
  `page.handle == 'about'`). `font-display text-h1` `page.title`. Body `{{ page.content }}`
  in `.rich-text`. For `about`: wrap body in the SignedLetter pattern — body div +
  `<p class="mt-8 font-signature text-3xl text-ink">— Zayna</p>` (port SignedLetter.tsx).
- `templates/page.json`: section `main-page`.

### Task 4 — Contact page
- `sections/contact-form.liquid`: `max-w-3xl`. Header eyebrow `Contact` + heading
  `Stuur ons een bericht.` + intro paragraph (Dutch, verbatim from source). Grid
  `md:grid-cols-[2fr_1fr]`. Left: Shopify `{% form 'contact' %}` with Naam, E-mailadres
  (`type=email`), Onderwerp `<select>` (4 options: "Vraag over een product", "Vraag over
  een bestelling", "Retour of ruil", "Anders"), Bericht `<textarea>`. Success: render
  `form.posted_successfully?` → "Bedankt voor je bericht…"; errors → `form.errors`
  translated. Submit button `bg-stone text-white hover:bg-clay`. Right `<aside>`:
  mailto info@zaynahome.nl (mail icon), instagram @zaynahome.nl, reactietijd/verzending
  notes, bedrijfsgegevens (KvK 97745200, BTW NL005285507B86).
- `templates/page.contact.json`: section `contact-form`. (Shopify uses `page.contact`
  suffix template; assign template "contact" to the contact page in admin.)

### Task 5 — Track-order page
- `sections/track-order.liquid`: `max-w-3xl`. Header eyebrow `Klantenservice` + heading
  `Track jouw order.` + intro. Two bordered cards (`border border-border-soft bg-surface
  p-6 sm:p-8`): (1) user icon, "Via je account", link `/account/orders` styled as the
  stone button "Bekijk mijn bestellingen"; (2) mail icon, "Via je verzendbevestiging",
  body text. Footer note with package-check icon + link to `/pages/contact`.
- `templates/page.track-order.json`: section `track-order`.
- **DIVERGENCE (confirm):** the *spec* (design doc line 136) imagined an order-number+email
  lookup form. The *live Hydrogen source* has no form — just the two info cards above.
  Plan = match the live source (info cards), since live is the 1:1 truth. Flag for user.

### Task 6 — Policy template
- `sections/main-policy.liquid`: `max-w-3xl`. Back link `← Terug naar beleid` →
  hmm: Shopify has no policies-index page. Link back to home or drop the back link.
  Eyebrow `Juridisch`, `font-display` title (`clamp(2rem,6vw,3.5rem)` like source),
  body `{{ page.content }}` (policy renders through `policy.json`; in Liquid the policy
  body is on `page.content` of the policy page) in `.rich-text`. Contact aside at bottom
  ("Nog vragen?" → contact link + mailto).
- **DIVERGENCE (confirm):** Hydrogen injects anchor ids + builds a JS TOC and has
  hardcoded summary cards for `refund-policy`. In Liquid the policy HTML comes from
  Shopify admin; injecting heading ids requires fragile string munging. Plan = drop the
  auto-TOC and the refund summary cards (or expose summary cards as optional section
  blocks the client fills in). Simpler, robust, still on-brand. Flag for user.
- `templates/policy.json`: section `main-policy`.

### Task 7 — 404 template
- `sections/main-404.liquid`: centered, `min-h-[60vh]`. Big `404` (`font-display`),
  heading "Deze pagina bestaat niet (meer).", subtext, two buttons → home `/` and
  `/collections/all` ("Naar de homepage" / "Bekijk alle producten"). On-brand replacement
  for Hydrogen's bare ErrorBoundary.
- `templates/404.json`: section `main-404`.

### Task 8 — Password page
- `layout/password.liquid`: minimal standalone layout (Shopify requires a dedicated
  password layout; cannot reuse theme.liquid). `{{ content_for_header }}`,
  `{{ content_for_layout }}`, link the compiled `assets/tailwind.css`, fonts.
- `sections/password.liquid` (or inline in template): centered branded splash — logo/
  wordmark "Zayna Home", "Binnenkort open." message, `{% form 'storefront_password' %}`
  with password input + submit, `form.errors` handling. Optional newsletter line.
- `templates/password.json` (or `password.liquid`): section `password`.
- Store is currently password-protected (HANDOFF), so this is live-visible. Keep it clean.

### Task 9 — Locales + CSS + verify
- Add only genuinely-chrome strings to `locales/{nl.default,en}.json` if any (e.g. a
  `general.404.*` / `contact.*` family) — most copy stays as Dutch section defaults.
  Keep nl/en key parity.
- `npm run build:css` (exit 0), commit `assets/tailwind.css`.
- `npx shopify theme check` → 0 ERRORS (3 known false-positive warnings OK).
- Playwright drive at http://127.0.0.1:9292 (dev server already live): blog grid,
  an article, an about page (signature), contact form render + validation, track-order,
  a policy page, a 404 (`/nonexistent`), and the password splash. Measure, don't eyeball.

## Workflow
Branch `feat/milestone-8-blog-pages` off freshly-rebased main. Execute via
subagent-driven-development: implementer subagent builds Tasks 1–8, then a
spec-compliance reviewer (vs live Hydrogen) and a code-quality reviewer; fix findings.
Then Task 9 verify. Checkpoint for user preview before merge. `git pull --rebase
origin main` before pushing (client theme-editor auto-commits land on main).

## Decisions (resolved with user 2026-06-10)
1. Track-order → **info cards** (match live Hydrogen). No lookup form.
2. Policy → **drop auto-TOC and summary cards**. Clean header + rich-text body + contact aside.
3. Password page → **build it now** (store currently locked, live-visible).
