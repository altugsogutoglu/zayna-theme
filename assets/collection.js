// Zayna Home — collection page controllers.
(() => {
  'use strict';

  if (window.__zhCollectionInit) return;
  window.__zhCollectionInit = true;

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
      `${offset}px`
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

  document.querySelectorAll('[data-collection]').forEach((root) => {
    const sectionId = root.dataset.sectionId;
    const baseUrl = root.dataset.collectionUrl;

    if (!sectionId || !baseUrl) return;

    let busy = false;
    let infiniteObserver = null;

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

    const closeFilters = () => {
      const overlay = document.querySelector(
        '.overlay[data-aside="filters"].expanded'
      );

      const closeButton = overlay?.querySelector(
        '[data-aside-close]'
      );

      closeButton?.click();
    };

    const restoreScroll = (scrollY) => {
      const restore = () => {
        window.scrollTo({
          top: scrollY,
          left: 0,
          behavior: 'auto'
        });
      };

      restore();
      window.requestAnimationFrame(restore);
      window.setTimeout(restore, 70);
    };

    const restoreFocus = (selector) => {
      if (!selector) return;

      window.requestAnimationFrame(() => {
        root.querySelector(selector)?.focus({
          preventScroll: true
        });
      });
    };

    const replaceSection = async (
      params,
      {
        preserveScroll = true,
        closeDrawer = false,
        focusAfter = null
      } = {}
    ) => {
      if (busy) return;

      busy = true;
      params.delete('page');

      const search = params.toString();
      const previousScrollY = window.scrollY;
      const previousHeight = root.offsetHeight;

      root.style.minHeight = `${previousHeight}px`;
      root.setAttribute('aria-busy', 'true');
      root.classList.add('is-loading');

      if (closeDrawer) {
        closeFilters();
      }

      try {
        const html = await fetchSection(search);

        const documentFragment = new DOMParser()
          .parseFromString(html, 'text/html');

        const fresh = documentFragment.querySelector(
          '[data-collection]'
        );

        if (!fresh) {
          throw new Error(
            'Updated collection markup was not found.'
          );
        }

        root.innerHTML = fresh.innerHTML;

        window.history.pushState(
          {},
          '',
          baseUrl + (search ? `?${search}` : '')
        );

        bind();

        if (preserveScroll) {
          restoreScroll(previousScrollY);
        }

        restoreFocus(focusAfter);
      } catch (error) {
        console.error(error);
        window.location.search = search;
      } finally {
        busy = false;

        window.requestAnimationFrame(() => {
          root.removeAttribute('aria-busy');
          root.classList.remove('is-loading');

          window.setTimeout(() => {
            root.style.minHeight = '';
          }, 190);
        });
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
            formData.set(
              input.name,
              value.toFixed(2)
            );
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

    const bindPriceFields = () => {
      root
        .querySelectorAll('[data-price-input]')
        .forEach((input) => {
          if (input.value) {
            formatVisibleMoney(input);
          }

          let preserveSelection = false;

          input.addEventListener('focus', () => {
            if (input.value) {
              formatVisibleMoney(input);
            }

            preserveSelection = true;

            window.requestAnimationFrame(() => {
              input.select();
              updateKeyboardOffset();
            });

            window.setTimeout(() => {
              input.scrollIntoView({
                block: 'center',
                behavior: reduceMotion
                  ? 'auto'
                  : 'smooth'
              });
            }, 220);
          });

          input.addEventListener('pointerup', (event) => {
            if (!preserveSelection) return;

            event.preventDefault();
            preserveSelection = false;
            input.select();
          });

          input.addEventListener('blur', () => {
            preserveSelection = false;
            formatVisibleMoney(input);
            updateKeyboardOffset();
          });
        });
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

        const text = link.querySelector(
          '[data-load-more-text]'
        );

        const loadingLabel = link.dataset.loadingLabel;

        if (text && loadingLabel) {
          text.textContent = loadingLabel;
        }

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

          if (text) {
            text.textContent =
              link.dataset.retryLabel ||
              'Opnieuw proberen';
          }
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

    const bind = () => {
      const sort = root.querySelector(
        '[data-sort-select]'
      );

      sort?.addEventListener('change', () => {
        const params = currentParams();
        params.set('sort_by', sort.value);

        replaceSection(params, {
          preserveScroll: true,
          closeDrawer: false,
          focusAfter: '[data-sort-select]'
        });
      });

      const form = root.querySelector(
        '[data-filter-form]'
      );

      form?.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!validatePriceRange(form)) return;

        const params = buildFilterParams(form);

        replaceSection(params, {
          preserveScroll: true,
          closeDrawer: true,
          focusAfter: '[data-aside-open="filters"]'
        });
      });

      root
        .querySelectorAll('[data-filter-clear]')
        .forEach((link) => {
          link.addEventListener('click', (event) => {
            event.preventDefault();

            const params = new URLSearchParams();
            const current = currentParams();
            const sortBy = current.get('sort_by');

            if (sortBy) {
              params.set('sort_by', sortBy);
            }

            replaceSection(params, {
              preserveScroll: true,
              closeDrawer: true,
              focusAfter: '[data-aside-open="filters"]'
            });
          });
        });

      root
        .querySelectorAll('[data-filter-remove]')
        .forEach((link) => {
          link.addEventListener('click', (event) => {
            event.preventDefault();

            const href =
              link.getAttribute('href') || '';

            const query =
              href.split('?')[1] || '';

            replaceSection(
              new URLSearchParams(query),
              {
                preserveScroll: true,
                closeDrawer: false,
                focusAfter: '[data-aside-open="filters"]'
              }
            );
          });
        });

      bindPriceFields();
      bindInfinite();
    };

    bind();
  });
})();