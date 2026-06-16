// Zayna Home — collection page controllers.
(() => {
  'use strict';

  if (window.__zhCollectionInit) return;
  window.__zhCollectionInit = true;

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const normaliseDecimal = (value) => {
    return String(value || '')
      .trim()
      .replace(',', '.')
      .replace(/[^\d.]/g, '');
  };

  document.querySelectorAll('[data-collection]').forEach((root) => {
    const sectionId = root.dataset.sectionId;
    const baseUrl = root.dataset.collectionUrl;

    if (!sectionId || !baseUrl) return;

    let busy = false;
    let infiniteObserver = null;

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

    const currentParams = () => {
      return new URLSearchParams(window.location.search);
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

    const announceResults = () => {
      const count = root.querySelector('[data-result-count]');
      if (!count) return;

      count.setAttribute('aria-live', 'polite');
    };

    const scrollToToolbar = () => {
      if (reduceMotion) return;

      const toolbar = root.querySelector(
        '[data-collection-toolbar]'
      );

      toolbar?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    };

    const replaceSection = async (
      params,
      { scroll = true } = {}
    ) => {
      if (busy) return;

      busy = true;
      params.delete('page');

      const search = params.toString();

      root.setAttribute('aria-busy', 'true');

      try {
        const html = await fetchSection(search);
        const documentFragment = new DOMParser()
          .parseFromString(html, 'text/html');

        const fresh = documentFragment.querySelector(
          '[data-collection]'
        );

        if (!fresh) {
          throw new Error('Updated collection markup was not found.');
        }

        root.innerHTML = fresh.innerHTML;

        window.history.pushState(
          {},
          '',
          baseUrl + (search ? `?${search}` : '')
        );

        bind();
        announceResults();

        if (scroll) {
          scrollToToolbar();
        }
      } catch (error) {
        console.error(error);
        window.location.search = search;
      } finally {
        busy = false;
        root.removeAttribute('aria-busy');
      }
    };

    const validatePriceRange = (form) => {
      const minInput = form.querySelector(
        '[data-price-input="min"]'
      );
      const maxInput = form.querySelector(
        '[data-price-input="max"]'
      );
      const error = form.querySelector('[data-price-error]');

      if (!minInput && !maxInput) return true;

      if (minInput) {
        minInput.value = normaliseDecimal(minInput.value);
      }

      if (maxInput) {
        maxInput.value = normaliseDecimal(maxInput.value);
      }

      const min =
        minInput?.value !== ''
          ? Number.parseFloat(minInput.value)
          : null;

      const max =
        maxInput?.value !== ''
          ? Number.parseFloat(maxInput.value)
          : null;

      const invalid =
        min !== null &&
        max !== null &&
        Number.isFinite(min) &&
        Number.isFinite(max) &&
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

    const bindInfinite = () => {
      if (infiniteObserver) {
        infiniteObserver.disconnect();
        infiniteObserver = null;
      }

      const sentinel = root.querySelector('[data-load-more]');
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

          const freshGrid = documentFragment.querySelector(
            '[data-product-grid]'
          );

          const grid = root.querySelector(
            '[data-product-grid]'
          );

          if (freshGrid && grid) {
            while (freshGrid.firstElementChild) {
              grid.appendChild(freshGrid.firstElementChild);
            }
          }

          const freshSentinel = documentFragment.querySelector(
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

        replaceSection(params);
      });

      const form = root.querySelector(
        '[data-filter-form]'
      );

      form?.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!validatePriceRange(form)) return;

        const params = new URLSearchParams(
          new FormData(form)
        );

        for (const [key, value] of Array.from(
          params.entries()
        )) {
          if (value === '') {
            params.delete(key);
          }
        }

        replaceSection(params);
        closeFilters();
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

            replaceSection(params);
            closeFilters();
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
              new URLSearchParams(query)
            );
          });
        });

      bindInfinite();
    };

    bind();
  });
})();