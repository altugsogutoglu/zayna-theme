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
  const REMOVAL_ANIMATION_MS = 170;


  function formatMoney(cents, root) {
    const locale = root?.getAttribute('data-money-locale') ||
      document.documentElement.lang ||
      'nl-NL';
    const currency = root?.getAttribute('data-money-currency') || 'EUR';

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(cents / 100);
    } catch (error) {
      return '€ ' + (cents / 100).toFixed(2).replace('.', ',');
    }
  }

  function getLineQuantity(line) {
    const optimistic = line.getAttribute('data-optimistic-quantity');

    if (optimistic !== null) {
      return Number.parseInt(optimistic, 10) || 0;
    }

    const stored = line.getAttribute('data-current-quantity');

    if (stored !== null) {
      return Number.parseInt(stored, 10) || 0;
    }

    const quantity = line.querySelector('[data-line-qty]');

    return quantity
      ? Number.parseInt(quantity.textContent, 10) || 0
      : 0;
  }

  function updateOptimisticMoney() {
    document.querySelectorAll('[data-cart-money-root]').forEach((root) => {
      let subtotalCents = 0;

      root.querySelectorAll('[data-cart-line]').forEach((line) => {
        const quantity = getLineQuantity(line);
        const unitPriceCents = Number.parseInt(
          line.getAttribute('data-unit-price-cents'),
          10
        ) || 0;
        const linePriceCents = Math.max(0, quantity * unitPriceCents);
        const linePrice = line.querySelector('[data-line-price]');

        line.setAttribute('data-current-quantity', String(quantity));

        if (linePrice) {
          linePrice.setAttribute(
            'data-line-price-cents',
            String(linePriceCents)
          );
          linePrice.textContent = formatMoney(linePriceCents, root);
        }

        subtotalCents += linePriceCents;
      });

      root.setAttribute(
        'data-cart-subtotal-cents',
        String(subtotalCents)
      );

      const subtotal = root.querySelector('[data-cart-subtotal]');

      if (subtotal) {
        subtotal.textContent = formatMoney(subtotalCents, root);
      }

      const thresholdCents = Number.parseInt(
        root.getAttribute('data-free-shipping-threshold-cents'),
        10
      ) || 0;

      if (thresholdCents <= 0) return;

      const remainingCents = Math.max(
        0,
        thresholdCents - subtotalCents
      );
      const percentage = Math.min(
        100,
        Math.max(0, (subtotalCents / thresholdCents) * 100)
      );
      const message = root.querySelector(
        '[data-free-shipping-message]'
      );
      const progress = root.querySelector(
        '[data-free-shipping-progress]'
      );
      const progressFill = root.querySelector(
        '[data-free-shipping-progress-fill]'
      );

      if (message) {
        if (remainingCents === 0) {
          message.innerHTML =
            'Je komt in aanmerking voor gratis verzending ' +
            '<span aria-hidden="true">🎉</span>';
        } else {
          message.innerHTML =
            'Nog <span class="text-ink font-medium tabular-nums" ' +
            'data-free-shipping-remaining>' +
            formatMoney(remainingCents, root) +
            '</span> tot gratis verzending';
        }
      }

      if (progress) {
        progress.setAttribute(
          'aria-valuenow',
          String(Math.round(percentage))
        );
      }

      if (progressFill) {
        progressFill.style.width = percentage + '%';
      }
    });
  }

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


  function getDisplayedCartCount() {
    const counter = document.querySelector('[data-cart-count]');

    return counter
      ? Number.parseInt(counter.textContent, 10) || 0
      : 0;
  }

  function setAddFormState(form, state) {
    if (!form) return;

    const button = form.querySelector('[data-cart-add-button]');
    const label = button?.querySelector('[data-cart-add-label]');
    const icon = button?.querySelector('[data-cart-add-icon]');
    const card = form.closest('.zh-product-card');
    const status = card?.querySelector('[data-cart-add-status]');

    if (!button) return;

    if (!button.dataset.defaultLabel && label) {
      button.dataset.defaultLabel = label.textContent.trim();
    }

    if (!button.dataset.defaultIcon && icon) {
      button.dataset.defaultIcon = icon.textContent.trim();
    }

    const defaultLabel = button.dataset.defaultLabel || 'Toevoegen';
    const defaultIcon = button.dataset.defaultIcon || '+';

    button.classList.remove('is-added', 'is-error');
    button.removeAttribute('aria-busy');

    if (state === 'loading') {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');

      if (label) label.textContent = 'Toevoegen…';
      if (icon) icon.textContent = '…';
      if (status) status.textContent = 'Product wordt toegevoegd.';
      return;
    }

    if (state === 'success') {
      button.disabled = false;
      button.classList.add('is-added');

      if (label) label.textContent = 'Toegevoegd';
      if (icon) icon.textContent = '✓';
      if (status) status.textContent = 'Product is toegevoegd aan je winkelmand.';
      return;
    }

    if (state === 'error') {
      button.disabled = false;
      button.classList.add('is-error');

      if (label) label.textContent = 'Probeer opnieuw';
      if (icon) icon.textContent = '!';
      if (status) status.textContent = 'Toevoegen is niet gelukt. Probeer het opnieuw.';
      return;
    }

    button.disabled = false;

    if (label) label.textContent = defaultLabel;
    if (icon) icon.textContent = defaultIcon;
    if (status) status.textContent = '';
  }

  function resetAddFormState(form, delay = 550) {
    window.setTimeout(() => {
      if (form?.isConnected) {
        setAddFormState(form, 'idle');
      }
    }, delay);
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

  function getCartLinesForKey(lineKey) {
    return document.querySelectorAll(
      '[data-cart-line][data-line-key="' +
        CSS.escape(lineKey) +
        '"]'
    );
  }

  function showPendingEmptyMessage(line) {
    const list = line.closest('ul');

    if (!list || list.querySelector('[data-cart-empty-pending]')) {
      return;
    }

    const hasRemainingLine = Array.from(
      list.querySelectorAll('[data-cart-line]')
    ).some((cartLine) => getLineQuantity(cartLine) > 0);

    if (hasRemainingLine) return;

    const message = document.createElement('li');

    message.setAttribute('data-cart-empty-pending', '');
    message.setAttribute('aria-live', 'polite');
    message.className = 'py-12 text-center';
    message.innerHTML =
      '<p class="font-display text-xl leading-tight text-ink">' +
      'Je winkelmand is nog leeg.</p>' +
      '<p class="mt-2 text-sm text-ink-soft">' +
      'De winkelmand wordt bijgewerkt.</p>';

    list.appendChild(message);
  }

  function animateLineRemoval(line) {
    if (line.getAttribute('data-cart-removing') === 'true') {
      return;
    }

    const storedOriginalQuantity = Number.parseInt(
      line.getAttribute('data-pre-remove-quantity'),
      10
    );
    const originalQuantity = storedOriginalQuantity ||
      Math.max(1, getLineQuantity(line));
    const height = line.getBoundingClientRect().height;

    line.setAttribute('data-cart-removing', 'true');

    if (!storedOriginalQuantity) {
      line.setAttribute(
        'data-pre-remove-quantity',
        String(originalQuantity)
      );
    }
    line.setAttribute('aria-hidden', 'true');

    line.style.height = height + 'px';
    line.style.overflow = 'hidden';
    line.style.pointerEvents = 'none';
    line.style.willChange = 'height, opacity, transform, padding';
    line.style.transition =
      'height ' + REMOVAL_ANIMATION_MS + 'ms ease, ' +
      'opacity 120ms ease, ' +
      'transform ' + REMOVAL_ANIMATION_MS + 'ms ease, ' +
      'padding ' + REMOVAL_ANIMATION_MS + 'ms ease, ' +
      'border-color ' + REMOVAL_ANIMATION_MS + 'ms ease';

    window.requestAnimationFrame(() => {
      line.style.height = '0px';
      line.style.opacity = '0';
      line.style.transform = 'translateX(8px)';
      line.style.paddingTop = '0';
      line.style.paddingBottom = '0';
      line.style.borderColor = 'transparent';
    });

    window.setTimeout(() => {
      line.hidden = true;
      showPendingEmptyMessage(line);
    }, REMOVAL_ANIMATION_MS);
  }

  function restoreOptimisticallyRemovedLine(lineKey) {
    getCartLinesForKey(lineKey).forEach((line) => {
      const previousQuantity = Number.parseInt(
        line.getAttribute('data-pre-remove-quantity'),
        10
      ) || 1;

      line.hidden = false;
      line.removeAttribute('aria-hidden');
      line.removeAttribute('data-cart-removing');
      line.removeAttribute('data-pre-remove-quantity');
      line.removeAttribute('data-optimistic-quantity');
      line.setAttribute(
        'data-current-quantity',
        String(previousQuantity)
      );

      line.removeAttribute('style');

      const quantityElement = line.querySelector('[data-line-qty]');

      if (quantityElement) {
        quantityElement.textContent = String(previousQuantity);
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
                ? previousQuantity + 1
                : Math.max(0, previousQuantity - 1)
            )
          );

          if (!isIncrease) {
            button.disabled = false;
            button.setAttribute(
              'aria-label',
              previousQuantity <= 1
                ? 'Product verwijderen'
                : 'Aantal verlagen'
            );
          }
        });

      line
        .closest('ul')
        ?.querySelector('[data-cart-empty-pending]')
        ?.remove();
    });

    syncCountFromVisibleQuantities();
    updateOptimisticMoney();
  }

  function optimisticChange(lineKey, quantity) {
    getCartLinesForKey(lineKey).forEach((line) => {
      const currentQuantity = Math.max(0, getLineQuantity(line));

      if (quantity <= 0) {
        line.setAttribute(
          'data-pre-remove-quantity',
          String(Math.max(1, currentQuantity))
        );
      }

      line.setAttribute(
        'data-optimistic-quantity',
        String(Math.max(0, quantity))
      );
      line.setAttribute(
        'data-current-quantity',
        String(Math.max(0, quantity))
      );

      if (quantity <= 0) {
        animateLineRemoval(line);
        return;
      }

      const quantityElement = line.querySelector('[data-line-qty]');

      if (quantityElement) {
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
            button.disabled = false;
            button.setAttribute(
              'aria-label',
              quantity <= 1
                ? 'Product verwijderen'
                : 'Aantal verlagen'
            );
          }
        });
    });

    syncCountFromVisibleQuantities();
    updateOptimisticMoney();
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

        Object.keys(updates).forEach((lineKey) => {
          if (updates[lineKey] === 0) {
            restoreOptimisticallyRemovedLine(lineKey);
          }
        });
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

  async function add(formData, options = {}) {
    const form = options.form || null;
    const behavior =
      options.behavior ||
      form?.getAttribute('data-cart-add-behavior') ||
      'drawer';

    if (actionBusy || form?.dataset.adding === 'true') return;

    actionBusy = true;

    if (form) {
      form.dataset.adding = 'true';
      setAddFormState(form, 'loading');
    }

    const quantity = Math.max(
      1,
      Number.parseInt(formData.get('quantity'), 10) || 1
    );
    const previousCount = getDisplayedCartCount();
    let countAdjusted = false;

    try {
      await settleQuantityUpdates();

      updateCount(previousCount + quantity);
      countAdjusted = true;

      formData.append(
        'sections',
        sectionsForPath()
      );
      formData.append(
        'sections_url',
        window.location.pathname
      );

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

      if (
        behavior === 'drawer' &&
        !document.querySelector('[data-cart-page]')
      ) {
        open();
      }

      if (form?.isConnected) {
        setAddFormState(form, 'success');
        resetAddFormState(form);
      }
    } catch (error) {
      console.error('Zayna cart add failed:', error);

      if (countAdjusted) {
        updateCount(previousCount);
      }

      if (form?.isConnected) {
        setAddFormState(form, 'error');
        resetAddFormState(form, 1800);
      }
    } finally {
      actionBusy = false;

      if (form?.isConnected) {
        delete form.dataset.adding;
      }
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
    const checkoutButton =
      event.submitter?.matches?.('[name="checkout"]')
        ? event.submitter
        : null;
    const checkoutForm = checkoutButton
      ? event.target.closest('form')
      : null;

    if (
      checkoutForm &&
      checkoutForm.dataset.cartCheckoutReady !== 'true'
    ) {
      event.preventDefault();

      checkoutForm.dataset.cartCheckoutReady = 'true';

      const originalLabel = checkoutButton.textContent;

      checkoutButton.disabled = true;
      checkoutButton.textContent = 'Afrekenen laden…';

      settleQuantityUpdates()
        .then(() => {
          checkoutButton.disabled = false;
          checkoutButton.textContent = originalLabel;
          checkoutForm.requestSubmit(checkoutButton);
        })
        .catch((error) => {
          console.error(
            'Zayna cart checkout preparation failed:',
            error
          );

          checkoutForm.dataset.cartCheckoutReady = 'false';
          checkoutButton.disabled = false;
          checkoutButton.textContent = originalLabel;
        });

      return;
    }

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

    const addForm = event.target.closest(
      '[data-cart-add-form]'
    );

    if (addForm) {
      event.preventDefault();

      add(new FormData(addForm), {
        form: addForm,
        behavior:
          addForm.getAttribute('data-cart-add-behavior') ||
          'drawer',
      });
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