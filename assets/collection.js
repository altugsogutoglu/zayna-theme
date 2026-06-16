// Zayna Home — stable collection page controllers.
(() => {
  'use strict';

  if (window.__zhCollectionStableInit) return;
  window.__zhCollectionStableInit = true;

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const dutchMoney = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const parseMoney = (rawValue) => {
    let value = String(rawValue || '')
      .trim()
      .replace(/\s/g, '')
      .replace(/[€]/g, '');

    if (!value) return null;

    if (value.includes(',')) {
      value = value
        .replace(/\./g, '')
        .replace(',', '.');
    } else {
      const parts = value.split('.');

      if (parts.length > 2) {
        const decimal = parts.pop();
        value = `${parts.join('')}.${decimal}`;
      }
    }

    value = value.replace(/[^\d.-]/g, '');

    const number = Number.parseFloat(value);

    return Number.isFinite(number) ? number : null;
  };

  const formatVisibleMoney = (input) => {
    const number = parseMoney(input.value);

    if (number === null) {
      input.value = '';
      return;
    }

    input.value = dutchMoney.format(number);
  };

  const updateKeyboardOffset = () => {
    const active = document.activeElement;
    const priceFocused = active?.matches?.(
      '[data-price-input]'
    );

    if (!priceFocused || !window.visualViewport) {
      document.documentElement.style.setProperty(
        '--zh-keyboard-offset',
        '0px'
      );
      return;
    }

    const viewport = window.visualViewport;

    const offset = Math.max(
      0,
      window.innerHeight -
        viewport.height -
        viewport.offsetTop
    );

    document.documentElement.style.setProperty(
      '--zh-keyboard-offset',
      `${offset + 7}px`
    );
  };

  if (!window.__zhKeyboardOffsetReady) {
    window.__zhKeyboardOffsetReady = true;

    window.visualViewport?.addEventListener(
      'resize',
      updateKeyboardOffset
    );

    window.visualViewport?.addEventListener(
      'scroll',
      updateKeyboardOffset
    );

    document.addEventListener(
      'focusin',
      updateKeyboardOffset
    );

    document.addEventListener('focusout', () => {
      window.setTimeout(updateKeyboardOffset, 80);
    });
  }

  const initialiseRoot = (root) => {
    if (!root || root.dataset.collectionStableReady === 'true') {
      return;
    }

    root.dataset.collectionStableReady = 'true';

    const sectionId = root.dataset.sectionId;
    const baseUrl = root.dataset.collectionUrl;

    if (!sectionId || !baseUrl) return;

    let busy = false;
    let infiniteObserver = null;
    let loadingTimer = null;

    const currentParams = () => {
      return new URLSearchParams(window.location.search);
    };

    const fetchSection = async (search) => {
      const separator = search ? '&' : '';

      const url =
        `${baseUrl}?${search}${separator}` +
        `section_id=${encodeURIComponent(sectionId)}`;

      const response = await fetch(url, {
        headers: {
          'X-Requested-With': 'fetch'
        }
      });

      if (!response.ok) {
        throw new Error(
          `Collection section fetch failed: ${response.status}`
        );
      }

      return response.text();
    };

    const startLoading = () => {
      window.clearTimeout(loadingTimer);

      loadingTimer = window.setTimeout(() => {
        root.classList.add('is-loading');
      }, 120);
    };

    const stopLoading = () => {
      window.clearTimeout(loadingTimer);
      root.classList.remove('is-loading');
    };

    const closeFilters = () => {
      document
        .querySelector(
          '.overlay[data-aside="filters"].expanded [data-aside-close]'
        )
        ?.click();
    };

    const replaceInner = (selector, freshRoot) => {
      const current = root.querySelector(selector);
      const fresh = freshRoot.querySelector(selector);

      if (current && fresh) {
        current.innerHTML = fresh.innerHTML;
      }
    };

    const patchCollection = (freshRoot) => {
      const freshCount = freshRoot.querySelector(
        '[data-result-count]'
      );

      const currentCount = root.querySelector(
        '[data-result-count]'
      );

      if (freshCount && currentCount) {
        currentCount.innerHTML = freshCount.innerHTML;
      }

      replaceInner('[data-filter-count-slot]', freshRoot);
      replaceInner('[data-active-filters-region]', freshRoot);
      replaceInner('[data-results-region]', freshRoot);
      replaceInner('[data-filter-container]', freshRoot);

      const total = freshRoot.dataset.currentCount || '0';

      root.dataset.currentCount = total;

      const results = root.querySelector(
        '[data-results-region]'
      );

      if (results) {
        results.dataset.resultTotal = total;
      }
    };

    const replaceCollection = async (
      params,
      { closeDrawer = false } = {}
    ) => {
      if (busy) return;

      busy = true;
      params.delete('page');

      const search = params.toString();
      const previousScrollY = window.scrollY;

      root.setAttribute('aria-busy', 'true');
      startLoading();

      try {
        const html = await fetchSection(search);

        const freshRoot = new DOMParser()
          .parseFromString(html, 'text/html')
          .querySelector('[data-collection]');

        if (!freshRoot) {
          throw new Error(
            'Updated collection markup was not found.'
          );
        }

        patchCollection(freshRoot);

        /*
         * The toolbar is not replaced. Restoring the exact window
         * position therefore cannot trigger a focus-induced jump.
         */
        window.scrollTo({
          top: previousScrollY,
          left: 0,
          behavior: 'auto'
        });

        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: previousScrollY,
            left: 0,
            behavior: 'auto'
          });
        });

        window.history.pushState(
          {},
          '',
          baseUrl + (search ? `?${search}` : '')
        );

        bindDynamicControls();

        if (closeDrawer) {
          closeFilters();
        }
      } catch (error) {
        console.error(error);
        window.location.search = search;
      } finally {
        busy = false;
        root.removeAttribute('aria-busy');
        stopLoading();
      }
    };

    const buildFilterParams = (form) => {
      const formData = new FormData(form);

      form.querySelectorAll('[data-price-input]').forEach(
        (input) => {
          const value = parseMoney(input.value);

          if (value === null) {
            formData.delete(input.name);
          } else {
            formData.set(input.name, value.toFixed(2));
          }
        }
      );

      const params = new URLSearchParams(formData);

      for (const [key, value] of Array.from(
        params.entries()
      )) {
        if (value === '') {
          params.delete(key);
        }
      }

      return params;
    };

    const validatePriceRange = (form) => {
      const minInput = form.querySelector(
        '[data-price-input="min"]'
      );

      const maxInput = form.querySelector(
        '[data-price-input="max"]'
      );

      const error = form.querySelector(
        '[data-price-error]'
      );

      const min = minInput
        ? parseMoney(minInput.value)
        : null;

      const max = maxInput
        ? parseMoney(maxInput.value)
        : null;

      const invalid =
        min !== null &&
        max !== null &&
        min > max;

      if (error) {
        error.hidden = !invalid;
      }

      if (invalid) {
        minInput?.focus();
        return false;
      }

      return true;
    };

    const bindPriceFields = (scope) => {
      scope
        .querySelectorAll('[data-price-input]')
        .forEach((input) => {
          if (input.dataset.priceReady === 'true') return;

          input.dataset.priceReady = 'true';

          if (input.value) {
            formatVisibleMoney(input);
          }

          input.addEventListener('focus', () => {
            if (input.value) {
              formatVisibleMoney(input);
            }

            window.requestAnimationFrame(() => {
              input.select();
              updateKeyboardOffset();
            });
          });

          input.addEventListener('pointerup', (event) => {
            event.preventDefault();
            input.select();
          });

          input.addEventListener('blur', () => {
            formatVisibleMoney(input);
            updateKeyboardOffset();
          });
        });
    };

    const bindFilterDirtyState = (form) => {
      if (!form || form.dataset.dirtyReady === 'true') return;

      form.dataset.dirtyReady = 'true';

      const clearButton = form.querySelector(
        '[data-filter-clear-button]'
      );

      const update = () => {
        const params = buildFilterParams(form);

        const hasSelection = Array.from(
          params.entries()
        ).some(([key, value]) => {
          return key !== 'sort_by' && value !== '';
        });

        clearButton?.classList.toggle(
          'is-hidden',
          !hasSelection
        );
      };

      form.addEventListener('input', update);
      form.addEventListener('change', update);
      update();
    };

    const bindInfinite = () => {
      if (infiniteObserver) {
        infiniteObserver.disconnect();
        infiniteObserver = null;
      }

      const sentinel = root.querySelector(
        '[data-load-more]'
      );

      const link = sentinel?.querySelector(
        '[data-load-more-link]'
      );

      if (!sentinel || !link) return;

      const loadNext = async () => {
        if (busy) return;

        busy = true;
        sentinel.setAttribute('aria-busy', 'true');

        try {
          const href = link.getAttribute('href') || '';
          const query =
            `${href.split('?')[1] || ''}` +
            `&section_id=${encodeURIComponent(sectionId)}`;

          const response = await fetch(
            `${baseUrl}?${query}`,
            {
              headers: {
                'X-Requested-With': 'fetch'
              }
            }
          );

          if (!response.ok) {
            throw new Error(
              `Load more failed: ${response.status}`
            );
          }

          const documentFragment = new DOMParser()
            .parseFromString(
              await response.text(),
              'text/html'
            );

          const freshGrid =
            documentFragment.querySelector(
              '[data-product-grid]'
            );

          const grid = root.querySelector(
            '[data-product-grid]'
          );

          if (freshGrid && grid) {
            while (freshGrid.firstElementChild) {
              grid.appendChild(
                freshGrid.firstElementChild
              );
            }
          }

          const freshSentinel =
            documentFragment.querySelector(
              '[data-load-more]'
            );

          if (freshSentinel) {
            sentinel.replaceWith(freshSentinel);
          } else {
            sentinel.remove();
          }

          window.history.replaceState({}, '', href);
        } catch (error) {
          console.error(error);
        } finally {
          busy = false;
          bindInfinite();
        }
      };

      link.addEventListener('click', (event) => {
        event.preventDefault();
        loadNext();
      });

      if (
        'IntersectionObserver' in window &&
        !reduceMotion
      ) {
        infiniteObserver = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              loadNext();
            }
          },
          {
            rootMargin: '600px 0px 600px 0px'
          }
        );

        infiniteObserver.observe(sentinel);
      }
    };

    const bindDynamicControls = () => {
      const form = root.querySelector(
        '[data-filter-form]'
      );

      if (
        form &&
        form.dataset.filterSubmitReady !== 'true'
      ) {
        form.dataset.filterSubmitReady = 'true';

        form.addEventListener('submit', (event) => {
          event.preventDefault();

          if (!validatePriceRange(form)) return;

          replaceCollection(
            buildFilterParams(form),
            { closeDrawer: true }
          );
        });
      }

      root
        .querySelectorAll('[data-filter-clear]')
        .forEach((link) => {
          if (link.dataset.clearReady === 'true') return;

          link.dataset.clearReady = 'true';

          link.addEventListener('click', (event) => {
            event.preventDefault();

            const params = new URLSearchParams();
            const sortBy =
              currentParams().get('sort_by');

            if (sortBy) {
              params.set('sort_by', sortBy);
            }

            replaceCollection(params, {
              closeDrawer: true
            });
          });
        });

      root
        .querySelectorAll('[data-filter-remove]')
        .forEach((link) => {
          if (link.dataset.removeReady === 'true') return;

          link.dataset.removeReady = 'true';

          link.addEventListener('click', (event) => {
            event.preventDefault();

            const href =
              link.getAttribute('href') || '';

            replaceCollection(
              new URLSearchParams(
                href.split('?')[1] || ''
              )
            );
          });
        });

      bindPriceFields(root);
      bindFilterDirtyState(form);
      bindInfinite();
    };

    /*
     * The toolbar and select remain in the DOM.
     * Therefore sorting no longer recreates focus or scroll position.
     */
    const sort = root.querySelector(
      '[data-sort-select]'
    );

    sort?.addEventListener('change', () => {
      const params = currentParams();
      params.set('sort_by', sort.value);
      replaceCollection(params);
    });

    bindDynamicControls();
  };

  document
    .querySelectorAll('[data-collection]')
    .forEach(initialiseRoot);

  document.addEventListener(
    'shopify:section:load',
    (event) => {
      const root =
        event.target?.matches?.('[data-collection]')
          ? event.target
          : event.target?.querySelector?.(
              '[data-collection]'
            );

      initialiseRoot(root);
    }
  );
})();