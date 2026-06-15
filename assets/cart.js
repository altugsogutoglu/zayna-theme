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
  let pendingQuantityViewState = null;

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

        const isRemoving =
          line.getAttribute('data-cart-removing') === 'true';

        if (linePrice && !isRemoving) {
          linePrice.setAttribute(
            'data-line-price-cents',
            String(linePriceCents)
          );
          linePrice.textContent = formatMoney(linePriceCents, root);
        }

        subtotalCents += linePriceCents;
      });

      /*
       * When the final line is being removed, keep the existing
       * subtotal and shipping message visible but dimmed. Showing
       * €0,00 while the product row still exists looks broken.
       */
      if (root.getAttribute('data-cart-emptying') === 'true') {
        return;
      }

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

  function getCartScrollRegion(root) {
    if (!root) return null;

    return (
      root.querySelector('[data-cart-scroll-region]') ||
      root.querySelector('.overflow-y-auto')
    );
  }

  function findAddFormByVariant(root, variantId) {
    if (!root || !variantId) return null;

    return Array.from(
      root.querySelectorAll('[data-cart-add-form]')
    ).find((form) => {
      const input = form.querySelector('input[name="id"]');

      return input?.value === String(variantId);
    }) || null;
  }

  function getStableAnchor(element, root) {
    if (!element || !root || !root.contains(element)) return null;

    const line = element.closest('[data-cart-line]');

    if (line) {
      return {
        type: 'line',
        key: line.getAttribute('data-line-key') || '',
      };
    }

    const form = element.closest('[data-cart-add-form]');

    if (form) {
      const variantInput = form.querySelector(
        'input[name="id"]'
      );
      const variantId = variantInput?.value || '';

      if (variantId) {
        return {
          type: 'variant',
          key: variantId,
        };
      }
    }

    const suggestions = element.closest(
      '[data-cart-persistent-suggestions]'
    );

    if (suggestions) {
      return {
        type: 'suggestions',
      };
    }

    const emptyState = element.closest('[data-cart-empty-state]');

    if (emptyState) {
      return {
        type: 'empty',
      };
    }

    return null;
  }

  function resolveStableAnchor(root, descriptor) {
    if (!root || !descriptor) return null;

    if (descriptor.type === 'line' && descriptor.key) {
      return root.querySelector(
        '[data-cart-line][data-line-key="' +
          CSS.escape(descriptor.key) +
          '"]'
      );
    }

    if (descriptor.type === 'variant' && descriptor.key) {
      const form = findAddFormByVariant(
        root,
        descriptor.key
      );

      return form?.closest(
        '.zh-product-card, li, [data-cart-add-form]'
      ) || null;
    }

    if (descriptor.type === 'suggestions') {
      return root.querySelector(
        '[data-cart-persistent-suggestions]'
      );
    }

    if (descriptor.type === 'empty') {
      return root.querySelector('[data-cart-empty-state]');
    }

    return null;
  }

  function captureRootViewState(rootSelector, anchorElement) {
    const root = document.querySelector(rootSelector);
    const scroller = getCartScrollRegion(root);

    if (!root || !scroller) return null;

    const anchor = getStableAnchor(anchorElement, root);
    const resolvedAnchor = anchor
      ? resolveStableAnchor(root, anchor)
      : null;

    const lines = root.querySelector('[data-cart-lines]');
    const preserveBelowLines = Boolean(
      anchorElement?.closest?.(
        '[data-cart-persistent-suggestions]'
      )
    );

    return {
      scrollTop: scroller.scrollTop,
      anchor,
      anchorOffset: resolvedAnchor
        ? resolvedAnchor.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top
        : null,
      preserveBelowLines,
      linesHeight: lines
        ? lines.getBoundingClientRect().height
        : 0,
    };
  }

  function captureCartViewState(options = {}) {
    const activeElement = document.activeElement;
    const activeButton = activeElement?.closest?.(
      '[data-cart-change]'
    );
    const activeLine = activeButton?.closest?.(
      '[data-cart-line]'
    );
    const activeAddForm = activeElement?.closest?.(
      '[data-cart-add-form]'
    );
    const activeVariant = activeAddForm
      ?.querySelector('input[name="id"]')
      ?.value || '';

    const anchorElement =
      options.anchorElement ||
      activeLine ||
      activeAddForm ||
      null;

    return {
      drawer: captureRootViewState(
        '[data-cart-drawer]',
        anchorElement
      ),
      page: captureRootViewState(
        '[data-cart-page]',
        anchorElement
      ),
      focusLineKey: options.suppressFocus
        ? ''
        : activeLine?.getAttribute('data-line-key') || '',
      focusStep: options.suppressFocus
        ? ''
        : activeButton?.getAttribute('data-step') || '',
      focusVariant: options.suppressFocus
        ? ''
        : activeVariant,
    };
  }

  function restoreRootViewState(rootSelector, state) {
    if (!state) return;

    const root = document.querySelector(rootSelector);
    const scroller = getCartScrollRegion(root);

    if (!root || !scroller) return;

    const anchor = resolveStableAnchor(root, state.anchor);

    if (
      anchor &&
      Number.isFinite(state.anchorOffset)
    ) {
      const newOffset =
        anchor.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top;

      scroller.scrollTop += newOffset - state.anchorOffset;
      return;
    }

    scroller.scrollTop = state.scrollTop;
  }

  function restoreCartFocus(state) {
    if (!state) return;

    if (state.focusLineKey && state.focusStep) {
      const selector =
        '[data-cart-line][data-line-key="' +
        CSS.escape(state.focusLineKey) +
        '"] [data-cart-change][data-step="' +
        CSS.escape(state.focusStep) +
        '"]';

      document
        .querySelector(selector)
        ?.focus({ preventScroll: true });

      return;
    }

    if (state.focusVariant) {
      const preferredRoot =
        document.querySelector('[data-cart-drawer]') ||
        document.querySelector('[data-cart-page]') ||
        document;
      const focusForm = findAddFormByVariant(
        preferredRoot,
        state.focusVariant
      );

      focusForm
        ?.querySelector('[data-cart-add-button]')
        ?.focus({ preventScroll: true });
    }
  }

  function copyCartRootData(current, fresh) {
    const currentMoneyRoot = current.querySelector(
      '[data-cart-money-root]'
    );
    const freshMoneyRoot = fresh.querySelector(
      '[data-cart-money-root]'
    );

    if (currentMoneyRoot && freshMoneyRoot) {
      [
        'data-cart-subtotal-cents',
        'data-free-shipping-threshold-cents',
        'data-money-locale',
        'data-money-currency',
      ].forEach((attribute) => {
        const value = freshMoneyRoot.getAttribute(attribute);

        if (value === null) {
          currentMoneyRoot.removeAttribute(attribute);
        } else {
          currentMoneyRoot.setAttribute(attribute, value);
        }
      });
    }

    const currentCount = current.querySelector(
      '[data-cart-total-count]'
    );
    const freshCount = fresh.querySelector(
      '[data-cart-total-count]'
    );

    if (currentCount && freshCount) {
      currentCount.setAttribute(
        'data-count',
        freshCount.getAttribute('data-count') || '0'
      );
    }
  }

  function replaceElementFromFresh(
    currentRoot,
    freshRoot,
    selector
  ) {
    const currentElement = currentRoot.querySelector(selector);
    const freshElement = freshRoot.querySelector(selector);

    if (currentElement && freshElement) {
      currentElement.replaceWith(
        freshElement.cloneNode(true)
      );
      return;
    }

    if (currentElement && !freshElement) {
      currentElement.remove();
    }
  }

  function patchFilledCart(
    current,
    fresh,
    wrapperSelector,
    rootState
  ) {
    const currentScroller = getCartScrollRegion(current);

    if (currentScroller) {
      currentScroller.style.overflowAnchor = 'none';
      currentScroller.style.scrollBehavior = 'auto';
    }

    const currentLines = current.querySelector(
      '[data-cart-lines]'
    );
    const freshLines = fresh.querySelector(
      '[data-cart-lines]'
    );
    const previousScrollTop =
      currentScroller?.scrollTop || 0;
    const previousLinesHeight =
      currentLines?.getBoundingClientRect().height ||
      rootState?.linesHeight ||
      0;

    if (currentLines && freshLines) {
      currentLines.innerHTML = freshLines.innerHTML;
    }

    const nextLinesHeight =
      currentLines?.getBoundingClientRect().height || 0;

    /*
     * The fixed footer can be replaced independently without
     * rebuilding the scroll container or recommendation cards.
     */
    replaceElementFromFresh(
      current,
      fresh,
      '[data-cart-footer]'
    );

    /*
     * Complementary recommendations depend on the current cart
     * product. Persistent "Populaire keuzes" cards stay mounted.
     */
    replaceElementFromFresh(
      current,
      fresh,
      '[data-cart-upsell]'
    );

    copyCartRootData(current, fresh);

    if (
      currentScroller &&
      rootState?.preserveBelowLines
    ) {
      /*
       * Recommendations sit below the cart lines. When a new line
       * is inserted above them, increase scrollTop by exactly the
       * same height difference so the visible recommendation card
       * stays at the same screen position.
       */
      const heightDifference =
        nextLinesHeight - previousLinesHeight;

      currentScroller.scrollTop =
        previousScrollTop + heightDifference;
    } else {
      restoreRootViewState(wrapperSelector, rootState);
    }
  }

  function replaceWholeCart(
    current,
    fresh,
    wrapperSelector,
    rootState
  ) {
    const previousVisibility = current.style.visibility;

    /*
     * The empty/filled layout change is completed while hidden
     * within the same JavaScript task, so no intermediate frame
     * with the wrong scroll position is painted.
     */
    current.style.visibility = 'hidden';
    current.innerHTML = fresh.innerHTML;

    const scroller = getCartScrollRegion(current);

    if (scroller) {
      scroller.style.overflowAnchor = 'none';
      scroller.style.scrollBehavior = 'auto';
    }

    restoreRootViewState(wrapperSelector, rootState);
    current.style.visibility = previousVisibility;
  }

  function patchCartSection(
    html,
    wrapperSelector,
    rootState
  ) {
    if (!html) return;

    const parsed = new DOMParser().parseFromString(
      html,
      'text/html'
    );
    const fresh = parsed.querySelector(wrapperSelector);
    const current = document.querySelector(wrapperSelector);

    if (!fresh || !current) return;

    const currentIsFilled = Boolean(
      current.querySelector('[data-cart-lines]')
    );
    const freshIsFilled = Boolean(
      fresh.querySelector('[data-cart-lines]')
    );

    if (currentIsFilled && freshIsFilled) {
      patchFilledCart(
        current,
        fresh,
        wrapperSelector,
        rootState
      );
      return;
    }

    if (!currentIsFilled && !freshIsFilled) {
      /*
       * Nothing structural changed in an empty cart. Keep the
       * current recommendation cards and scroll position intact.
       */
      copyCartRootData(current, fresh);
      restoreRootViewState(wrapperSelector, rootState);
      return;
    }

    if (currentIsFilled && !freshIsFilled) {
      /*
       * A newly empty cart should always start at its heading.
       * Reusing the previous filled-cart scroll position caused
       * the empty state to open halfway down the recommendations.
       */
      replaceWholeCart(
        current,
        fresh,
        wrapperSelector,
        {
          scrollTop: 0,
          anchor: null,
          anchorOffset: null,
        }
      );
      return;
    }

    replaceWholeCart(
      current,
      fresh,
      wrapperSelector,
      rootState
    );
  }

  function applySections(
    sections,
    viewState = captureCartViewState()
  ) {
    if (sections?.['cart-drawer']) {
      patchCartSection(
        sections['cart-drawer'],
        '[data-cart-drawer]',
        viewState?.drawer || null
      );
    }

    if (sections?.['main-cart']) {
      patchCartSection(
        sections['main-cart'],
        '[data-cart-page]',
        viewState?.page || null
      );
    }

    syncCountFromDom();
    bindUpsell();
    restoreCartFocus(viewState);
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

  function setLastLineEmptyingState(line, state) {
    const root = line.closest('[data-cart-money-root]');

    if (!root) return;

    const footer = root.querySelector('[data-cart-footer]');
    const checkoutButton = root.querySelector(
      '[data-cart-checkout-button], button[name="checkout"]'
    );

    if (state) {
      const hasRemainingLine = Array.from(
        root.querySelectorAll('[data-cart-line]')
      ).some(
        (cartLine) =>
          cartLine !== line &&
          getLineQuantity(cartLine) > 0
      );

      if (hasRemainingLine) return;

      root.setAttribute('data-cart-emptying', 'true');

      if (footer) {
        footer.style.pointerEvents = 'none';
        footer.style.opacity = '0.62';
        footer.style.transition = 'opacity 140ms ease';
      }

      if (checkoutButton) {
        checkoutButton.disabled = true;
        checkoutButton.setAttribute('aria-disabled', 'true');
      }

      return;
    }

    root.removeAttribute('data-cart-emptying');

    if (footer) {
      footer.style.pointerEvents = '';
      footer.style.opacity = '';
      footer.style.transition = '';
    }

    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.removeAttribute('aria-disabled');
    }
  }

  function elementIsVisibleInScroller(element, scroller) {
    if (!element || !scroller) return false;

    const elementRect = element.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();

    return (
      elementRect.bottom > scrollerRect.top &&
      elementRect.top < scrollerRect.bottom
    );
  }

  function getRemovalAnchor(line) {
    if (!line) return null;

    const root = line.closest('[data-cart-money-root]');
    const scroller = getCartScrollRegion(root);

    if (!root || !scroller) return null;

    const lines = Array.from(
      root.querySelectorAll('[data-cart-line]')
    ).filter(
      (cartLine) =>
        cartLine !== line &&
        getLineQuantity(cartLine) > 0
    );

    const lineIndex = Array.from(
      root.querySelectorAll('[data-cart-line]')
    ).indexOf(line);

    const nextLine = lines.find((cartLine) => {
      const currentIndex = Array.from(
        root.querySelectorAll('[data-cart-line]')
      ).indexOf(cartLine);

      return currentIndex > lineIndex;
    });

    if (nextLine) return nextLine;

    const previousLine = [...lines].reverse().find((cartLine) => {
      const currentIndex = Array.from(
        root.querySelectorAll('[data-cart-line]')
      ).indexOf(cartLine);

      return currentIndex < lineIndex;
    });

    if (previousLine) return previousLine;

    const suggestions = root.querySelector(
      '[data-cart-persistent-suggestions]'
    );

    if (
      suggestions &&
      elementIsVisibleInScroller(suggestions, scroller)
    ) {
      return suggestions;
    }

    return null;
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

    /*
     * Keep the occupied height until Shopify confirms the removal.
     * This prevents the content below from moving once locally and
     * then moving a second time when the refreshed section arrives.
     */
    line.style.height = height + 'px';
    line.style.minHeight = height + 'px';
    line.style.overflow = 'hidden';
    line.style.pointerEvents = 'none';
    line.style.willChange = 'opacity, transform';
    line.style.transition =
      'opacity 140ms ease, transform ' +
      REMOVAL_ANIMATION_MS +
      'ms ease, filter 140ms ease';

    const linePrice = line.querySelector('[data-line-price]');

    if (linePrice) {
      linePrice.setAttribute(
        'data-removal-original-text',
        linePrice.textContent.trim()
      );
      linePrice.textContent = 'Verwijderen…';
      linePrice.style.fontSize = '11px';
      linePrice.style.fontFamily = 'var(--font-sans, sans-serif)';
      linePrice.style.letterSpacing = '0.08em';
      linePrice.style.textTransform = 'uppercase';
      linePrice.style.color = '#766e67';
      linePrice.style.whiteSpace = 'nowrap';
    }

    setLastLineEmptyingState(line, true);

    window.requestAnimationFrame(() => {
      line.style.opacity = '0.38';
      line.style.transform = 'translateX(6px)';
      line.style.filter = 'grayscale(0.18)';
    });
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

      const linePrice = line.querySelector('[data-line-price]');

      if (linePrice) {
        const originalText = linePrice.getAttribute(
          'data-removal-original-text'
        );

        if (originalText) {
          linePrice.textContent = originalText;
        }

        linePrice.removeAttribute('data-removal-original-text');
        linePrice.removeAttribute('style');
      }

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

      setLastLineEmptyingState(line, false);
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
    const line = getCartLinesForKey(lineKey)[0] || null;
    const anchorElement =
      safeQuantity === 0
        ? getRemovalAnchor(line)
        : line;

    pendingQuantityViewState = captureCartViewState({
      anchorElement,
      suppressFocus: safeQuantity === 0,
    });

    optimisticChange(lineKey, safeQuantity);
    pendingUpdates.set(lineKey, safeQuantity);
    quantityVersion += 1;

    scheduleQuantityFlush(
      safeQuantity === 0 ? 0 : QUANTITY_DEBOUNCE
    );
  }

  async function refreshCartFromServer(viewState = null) {
    const data = await postJSON('/cart/update.js', {});
    applySections(
      data.sections,
      viewState || captureCartViewState()
    );
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
    const requestViewState = pendingQuantityViewState;

    pendingUpdates.clear();
    pendingQuantityViewState = null;

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
        applySections(
          data.sections,
          requestViewState || captureCartViewState()
        );

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
        await refreshCartFromServer(requestViewState);
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
    const variantId = String(formData.get('id') || '');
    const addAnchor =
      form?.closest('.zh-product-card, li, [data-cart-add-form]') ||
      null;
    const isPersistentSuggestion = Boolean(
      form?.closest(
        '[data-cart-persistent-suggestions]'
      )
    );
    const addViewState = captureCartViewState({
      anchorElement: addAnchor,
      suppressFocus: isPersistentSuggestion,
    });
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

      applySections(data.sections, addViewState);

      if (
        behavior === 'drawer' &&
        !document.querySelector('[data-cart-page]')
      ) {
        open();
      }

      const refreshedForm = variantId
        ? findAddFormByVariant(
            document.querySelector('[data-cart-drawer]') ||
              document.querySelector('[data-cart-page]') ||
              document,
            variantId
          )
        : null;
      const feedbackForm = form?.isConnected
        ? form
        : refreshedForm;

      if (feedbackForm) {
        setAddFormState(feedbackForm, 'success');
        resetAddFormState(feedbackForm);
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