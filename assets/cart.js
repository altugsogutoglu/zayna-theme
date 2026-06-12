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

  // Quantity changes are optimistic and debounced: the UI updates on every
  // click, rapid clicks coalesce into one request carrying the final quantity,
  // and requests are serialized so responses never apply out of order.
  const pendingQty = new Map(); // lineKey -> latest target quantity
  const debounceTimers = new Map();
  let chain = Promise.resolve();

  function optimisticChange(lineKey, quantity) {
    document.querySelectorAll('[data-cart-line][data-line-key="' + CSS.escape(lineKey) + '"]').forEach((line) => {
      line.classList.add('is-updating');
      if (quantity <= 0) return;
      const qty = line.querySelector('[data-line-qty]');
      if (qty) qty.textContent = quantity;
      // Re-target the stepper buttons so further clicks step from the new
      // quantity before the server re-render lands.
      line.querySelectorAll('[data-cart-change][data-step]').forEach((btn) => {
        const inc = btn.getAttribute('data-step') === 'inc';
        btn.setAttribute('data-quantity', String(inc ? quantity + 1 : quantity - 1));
        if (!inc) btn.disabled = quantity <= 1;
      });
    });
  }

  function change(lineKey, quantity) {
    optimisticChange(lineKey, quantity);
    pendingQty.set(lineKey, quantity);
    clearTimeout(debounceTimers.get(lineKey));
    debounceTimers.set(lineKey, setTimeout(() => {
      chain = chain.then(() => sendChange(lineKey));
    }, quantity === 0 ? 0 : 250));
  }

  async function sendChange(lineKey) {
    if (!pendingQty.has(lineKey)) return;
    const quantity = pendingQty.get(lineKey);
    pendingQty.delete(lineKey);
    setBusy(true);
    try {
      const data = await postJSON('/cart/change.js', { id: lineKey, quantity });
      // If more changes were queued while this was in flight, this response is
      // already stale — let the next one render.
      if (pendingQty.size === 0) applySections(data.sections);
    } catch (e) {
      console.error(e);
      // Optimistic DOM may now disagree with the real cart; re-render from server.
      try {
        const data = await postJSON('/cart/update.js', {});
        applySections(data.sections);
      } catch (_) { /* offline; leave DOM as-is */ }
    } finally {
      if (pendingQty.size === 0) {
        document.querySelectorAll('[data-cart-line].is-updating').forEach((line) => line.classList.remove('is-updating'));
      }
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
      // On the /cart page the cart is already visible; don't slide the drawer over it.
      if (!document.querySelector('[data-cart-page]')) open();
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

  // Section swaps wipe the element (and its dataset.loaded marker), so cache
  // the fetched upsell HTML module-side to avoid refetching on every cart change.
  const upsellCache = new Map(); // url -> innerHTML

  function bindUpsell() {
    document.querySelectorAll('[data-cart-upsell][data-url]').forEach(async (el) => {
      const url = el.getAttribute('data-url');
      if (!url || el.dataset.loaded === url) return;
      el.dataset.loaded = url;
      if (upsellCache.has(url)) {
        el.innerHTML = upsellCache.get(url);
        return;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const fresh = new DOMParser().parseFromString(await res.text(), 'text/html').querySelector('[data-cart-upsell]');
        if (fresh) {
          upsellCache.set(url, fresh.innerHTML);
          el.innerHTML = fresh.innerHTML;
        }
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
