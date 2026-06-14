// Zayna Home — fast, optimistic cart controller.
// Loaded once globally from the cart-drawer section.
(() => {
  'use strict';

  if (window.__zhCartInit) return;
  window.__zhCartInit = true;

  let actionBusy = false;

  const pendingUpdates = new Map();
  const lineSyncing = new Set();

  let quantityTimer = null;
  let quantityRequestRunning = false;
  let flushRequestedAfterCurrent = false;
  let quantityVersion = 0;

  const QUANTITY_DEBOUNCE = 140;

  const sectionsForPath = () => {
    const ids = ['cart-drawer'];

    if (document.querySelector('[data-cart-page]')) {
      ids.unshift('main-cart');
    }

    return ids.join(',');
  };

  function updateCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = count;
      element.classList.toggle('hidden', count <= 0);
    });
  }

  function getPrimaryCartRoot() {
    return (
      document.querySelector('[data-cart-drawer]') ||
      document.querySelector('[data-cart-page]')
    );
  }

  function syncCountFromVisibleQuantities() {
    const root = getPrimaryCartRoot();

    if (!root) return;

    const quantities = Array.from(
      root.querySelectorAll('[data-cart-line]')
    ).map((line) => {
      const optimistic = line.getAttribute('data-optimistic-quantity');

      if (optimistic !== null) {
        return Number.parseInt(optimistic, 10) || 0;
      }

      const quantity = line.querySelector('[data-line-qty]');

      return quantity
        ? Number.parseInt(quantity.textContent, 10) || 0
        : 0;
    });

    updateCount(
      quantities.reduce((total, quantity) => total + quantity, 0)
    );
  }

  function syncCountFromDom() {
    const countElement = document.querySelector(
      '[data-cart-drawer] [data-cart-total-count]'
    );

    if (!countElement) return;

    updateCount(
      Number.parseInt(
        countElement.getAttribute('data-count'),
        10
      ) || 0
    );
  }

  function captureCartViewState() {
    const activeElement = document.activeElement;
    const activeButton = activeElement?.closest?.('[data-cart-change]');
    const activeLine = activeButton?.closest?.('[data-cart-line]');

    const drawerScroller = document.querySelector(
      '[data-cart-drawer] .overflow-y-auto'
    );
    const pageScroller = document.querySelector(
      '[data-cart-page] .overflow-y-auto'
    );

    return {
      drawerScrollTop: drawerScroller?.scrollTop || 0,
      pageScrollTop: pageScroller?.scrollTop || 0,
      focusLineKey: activeLine?.getAttribute('data-line-key') || '',
      focusStep: activeButton?.getAttribute('data-step') || '',
    };
  }

  function restoreCartViewState(state) {
    if (!state) return;

    const drawerScroller = document.querySelector(
      '[data-cart-drawer] .overflow-y-auto'
    );
    const pageScroller = document.querySelector(
      '[data-cart-page] .overflow-y-auto'
    );

    if (drawerScroller) {
      drawerScroller.scrollTop = state.drawerScrollTop;
    }

    if (pageScroller) {
      pageScroller.scrollTop = state.pageScrollTop;
    }

    if (!state.focusLineKey || !state.focusStep) return;

    const selector =
      '[data-cart-line][data-line-key="' +
      CSS.escape(state.focusLineKey) +
      '"] [data-cart-change][data-step="' +
      CSS.escape(state.focusStep) +
      '"]';

    const nextFocus = document.querySelector(selector);

    nextFocus?.focus({ preventScroll: true });
  }

  function swap(html, wrapperSelector) {
    if (!html) return;

    const parsed = new DOMParser().parseFromString(
      html,
      'text/html'
    );
    const fresh = parsed.querySelector(wrapperSelector);
    const current = document.querySelector(wrapperSelector);

    if (fresh && current) {
      current.innerHTML = fresh.innerHTML;
    }
  }

  function applySections(sections) {
    const viewState = captureCartViewState();

    if (sections?.['cart-drawer']) {
      swap(
        sections['cart-drawer'],
        '[data-cart-drawer]'
      );
    }

    if (sections?.['main-cart']) {
      swap(
        sections['main-cart'],
        '[data-cart-page]'
      );
    }

    syncCountFromDom();
    bindUpsell();

    window.requestAnimationFrame(() => {
      restoreCartViewState(viewState);
    });
  }

  async function postJSON(url, body = {}) {
    const payload = {
      ...body,
      sections: sectionsForPath(),
      sections_url: window.location.pathname,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw data;
    }

    return data;
  }

  function setActionBusy(state) {
    actionBusy = state;

    document
      .querySelectorAll('[data-cart-drawer], [data-cart-page]')
      .forEach((root) => {
        if (state) {
          root.setAttribute('aria-busy', 'true');
        } else {
          root.removeAttribute('aria-busy');
        }
      });
  }

  function setLineSyncState(lineKey, state) {
    document
      .querySelectorAll(
        '[data-cart-line][data-line-key="' +
          CSS.escape(lineKey) +
          '"]'
      )
      .forEach((line) => {
        if (state) {
          line.setAttribute('aria-busy', 'true');
        } else {
          line.removeAttribute('aria-busy');
          line.removeAttribute('data-optimistic-quantity');
        }
      });
  }

  function optimisticChange(lineKey, quantity) {
    document
      .querySelectorAll(
        '[data-cart-line][data-line-key="' +
          CSS.escape(lineKey) +
          '"]'
      )
      .forEach((line) => {
        line.setAttribute(
          'data-optimistic-quantity',
          String(Math.max(0, quantity))
        );

        const quantityElement = line.querySelector('[data-line-qty]');

        if (quantityElement && quantity > 0) {
          quantityElement.textContent = String(quantity);
        }

        line
          .querySelectorAll('[data-cart-change][data-step]')
          .forEach((button) => {
            const isIncrease =
              button.getAttribute('data-step') === 'inc';

            button.setAttribute(
              'data-quantity',
              String(
                isIncrease
                  ? quantity + 1
                  : Math.max(0, quantity - 1)
              )
            );

            if (!isIncrease) {
              button.disabled = quantity <= 1;
            }
          });
      });

    syncCountFromVisibleQuantities();
  }

  function scheduleQuantityFlush(delay = QUANTITY_DEBOUNCE) {
    window.clearTimeout(quantityTimer);

    quantityTimer = window.setTimeout(() => {
      flushQuantityUpdates();
    }, delay);
  }

  function change(lineKey, quantity) {
    if (!lineKey || Number.isNaN(quantity)) return;

    const safeQuantity = Math.max(0, quantity);

    optimisticChange(lineKey, safeQuantity);
    pendingUpdates.set(lineKey, safeQuantity);
    quantityVersion += 1;

    scheduleQuantityFlush(
      safeQuantity === 0 ? 0 : QUANTITY_DEBOUNCE
    );
  }

  async function refreshCartFromServer() {
    const data = await postJSON('/cart/update.js', {});
    applySections(data.sections);
  }

  async function flushQuantityUpdates() {
    window.clearTimeout(quantityTimer);
    quantityTimer = null;

    if (quantityRequestRunning) {
      flushRequestedAfterCurrent = true;
      return;
    }

    if (pendingUpdates.size === 0) return;

    quantityRequestRunning = true;
    flushRequestedAfterCurrent = false;

    const requestVersion = quantityVersion;
    const updates = Object.fromEntries(pendingUpdates);

    pendingUpdates.clear();

    Object.keys(updates).forEach((lineKey) => {
      lineSyncing.add(lineKey);
      setLineSyncState(lineKey, true);
    });

    try {
      const data = await postJSON('/cart/update.js', {
        updates,
      });

      const newerChangesExist =
        quantityVersion !== requestVersion ||
        pendingUpdates.size > 0;

      if (!newerChangesExist) {
        applySections(data.sections);

        lineSyncing.forEach((lineKey) => {
          setLineSyncState(lineKey, false);
        });

        lineSyncing.clear();
      }
    } catch (error) {
      console.error('Zayna cart quantity update failed:', error);

      pendingUpdates.clear();
      flushRequestedAfterCurrent = false;

      try {
        await refreshCartFromServer();
      } catch (refreshError) {
        console.error(
          'Zayna cart refresh failed:',
          refreshError
        );
      }

      lineSyncing.forEach((lineKey) => {
        setLineSyncState(lineKey, false);
      });

      lineSyncing.clear();
    } finally {
      quantityRequestRunning = false;

      if (
        flushRequestedAfterCurrent ||
        pendingUpdates.size > 0
      ) {
        flushRequestedAfterCurrent = false;
        scheduleQuantityFlush(0);
      }
    }
  }

  async function settleQuantityUpdates() {
    if (quantityTimer) {
      window.clearTimeout(quantityTimer);
      quantityTimer = null;
    }

    if (pendingUpdates.size > 0) {
      await flushQuantityUpdates();
    }

    while (quantityRequestRunning) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 30);
      });
    }

    if (pendingUpdates.size > 0) {
      await flushQuantityUpdates();
    }
  }

  async function add(formData) {
    if (actionBusy) return;

    await settleQuantityUpdates();

    setActionBusy(true);

    formData.append(
      'sections',
      sectionsForPath()
    );
    formData.append(
      'sections_url',
      window.location.pathname
    );

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw data;
      }

      applySections(data.sections);

      if (!document.querySelector('[data-cart-page]')) {
        open();
      }
    } catch (error) {
      console.error('Zayna cart add failed:', error);
    } finally {
      setActionBusy(false);
    }
  }

  async function applyDiscount(code) {
    if (actionBusy || !code) return;

    await settleQuantityUpdates();

    setActionBusy(true);

    try {
      await fetch(
        '/discount/' + encodeURIComponent(code),
        { method: 'GET' }
      ).catch(() => {});

      const data = await postJSON('/cart/update.js', {});

      applySections(data.sections);
    } catch (error) {
      console.error(
        'Zayna discount update failed:',
        error
      );
    } finally {
      setActionBusy(false);
    }
  }

  function open() {
    const trigger = document.querySelector(
      '[data-aside-open="cart"]'
    );

    trigger?.click();
  }

  const upsellCache = new Map();

  function bindUpsell() {
    document
      .querySelectorAll('[data-cart-upsell][data-url]')
      .forEach(async (element) => {
        const url = element.getAttribute('data-url');

        if (!url || element.dataset.loaded === url) return;

        element.dataset.loaded = url;

        if (upsellCache.has(url)) {
          element.innerHTML = upsellCache.get(url);
          return;
        }

        try {
          const response = await fetch(url);

          if (!response.ok) return;

          const parsed = new DOMParser().parseFromString(
            await response.text(),
            'text/html'
          );
          const fresh = parsed.querySelector(
            '[data-cart-upsell]'
          );

          if (fresh) {
            upsellCache.set(url, fresh.innerHTML);
            element.innerHTML = fresh.innerHTML;
          }
        } catch (error) {
          console.error('Zayna upsell load failed:', error);
        }
      });
  }

  document.addEventListener('click', (event) => {
    const changeButton = event.target.closest(
      '[data-cart-change]'
    );

    if (changeButton && !changeButton.disabled) {
      const lineKey =
        changeButton.getAttribute('data-line-key');
      const quantity = Number.parseInt(
        changeButton.getAttribute('data-quantity'),
        10
      );

      change(lineKey, quantity);
      return;
    }

    const promoToggle = event.target.closest(
      '[data-promo-toggle]'
    );

    if (promoToggle) {
      const expanded =
        promoToggle.getAttribute('aria-expanded') === 'true';

      promoToggle.setAttribute(
        'aria-expanded',
        expanded ? 'false' : 'true'
      );

      const panel = promoToggle.parentElement.querySelector(
        '[data-promo-panel]'
      );

      panel?.classList.toggle('hidden', expanded);
    }
  });

  document.addEventListener('submit', (event) => {
    const discountForm = event.target.closest(
      '[data-discount-form]'
    );

    if (discountForm) {
      event.preventDefault();

      const input = discountForm.querySelector(
        '[data-discount-input]'
      );

      if (input?.value.trim()) {
        applyDiscount(input.value.trim());
      }

      return;
    }

    const upsellForm = event.target.closest(
      '[data-upsell-add]'
    );

    if (upsellForm) {
      event.preventDefault();
      add(new FormData(upsellForm));
    }
  });

  window.ZaynaCart = {
    add,
    change,
    applyDiscount,
    open,
  };

  bindUpsell();
})();