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
