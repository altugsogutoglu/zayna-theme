// Zayna Home — predictive search + full-page search pagination.
(() => {
  'use strict';

  if (window.__zhSearchInit) return;
  window.__zhSearchInit = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initializedForms = new WeakSet();
  const initializedPages = new WeakSet();

  function loadingMarkup() {
    let rows = '';

    for (let index = 0; index < 4; index += 1) {
      rows += `
        <li class="zh-search-skeleton__row">
          <span class="zh-search-skeleton__image"></span>
          <span class="zh-search-skeleton__copy">
            <span class="zh-search-skeleton__line zh-search-skeleton__line--wide"></span>
            <span class="zh-search-skeleton__line zh-search-skeleton__line--short"></span>
          </span>
        </li>
      `;
    }

    return `
      <div class="zh-search-skeleton${reduceMotion ? '' : ' is-animated'}" aria-hidden="true">
        <span class="zh-search-skeleton__label"></span>
        <ul>${rows}</ul>
      </div>
      <p class="sr-only">Zoekresultaten worden geladen.</p>
    `;
  }

  function errorMarkup() {
    return `
      <div class="zh-search-message" role="status">
        <p class="zh-search-message__title">Zoeken lukt op dit moment niet.</p>
        <p class="zh-search-message__text">Controleer je verbinding en probeer het opnieuw.</p>
      </div>
    `;
  }

  function minimumMarkup(minimum) {
    return `
      <p class="zh-search-status">
        Typ minimaal ${minimum} tekens om te zoeken.
      </p>
    `;
  }

  function initPredictiveForm(form) {
    if (!(form instanceof HTMLFormElement) || initializedForms.has(form)) return;

    const input = form.querySelector('[data-predictive-input]');
    const searchAside = form.closest('[data-aside="search"]');
    const region = searchAside?.querySelector('[data-predictive-results]') ||
      document.querySelector('[data-predictive-results]');

    if (!(input instanceof HTMLInputElement) || !(region instanceof HTMLElement)) return;

    initializedForms.add(form);

    const startMarkup = region.innerHTML;
    const suggestUrl = form.dataset.predictiveUrl || '/search/suggest';
    const minimum = Math.max(1, Number.parseInt(form.dataset.minChars || '2', 10) || 2);
    const sectionId = 'predictive-search';
    const limit = 5;

    let timer = null;
    let lastTerm = '';
    let controller = null;

    const resultLinks = () => Array.from(
      region.querySelectorAll('[data-predictive-link], a[href]')
    ).filter((link) => link instanceof HTMLAnchorElement && !link.closest('[hidden]'));

    function setExpanded(expanded) {
      input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function reset() {
      if (timer) window.clearTimeout(timer);
      timer = null;

      if (controller) controller.abort();
      controller = null;
      lastTerm = '';
      region.innerHTML = startMarkup;
      setExpanded(false);
    }

    function renderResponse(html) {
      const documentFragment = new DOMParser().parseFromString(html, 'text/html');
      const fresh = documentFragment.querySelector('[data-predictive-results-list]');

      if (!fresh) {
        region.innerHTML = errorMarkup();
        setExpanded(true);
        return;
      }

      region.innerHTML = fresh.outerHTML;
      setExpanded(true);
    }

    async function run(term) {
      if (controller) controller.abort();
      controller = new AbortController();

      const params = new URLSearchParams();
      params.set('q', term);
      params.set('section_id', sectionId);
      params.set('resources[type]', 'product,collection,page,article');
      params.set('resources[limit]', String(limit));
      params.set('resources[limit_scope]', 'each');

      try {
        const response = await fetch(`${suggestUrl}?${params.toString()}`, {
          headers: { 'X-Requested-With': 'fetch' },
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Predictive search failed: ${response.status}`);
        renderResponse(await response.text());
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error(error);
        region.innerHTML = errorMarkup();
        setExpanded(true);
      } finally {
        controller = null;
      }
    }

    input.addEventListener('input', () => {
      const term = input.value.trim();

      if (timer) window.clearTimeout(timer);
      if (controller) controller.abort();

      if (!term) {
        reset();
        return;
      }

      if (term.length < minimum) {
        lastTerm = '';
        region.innerHTML = minimumMarkup(minimum);
        setExpanded(false);
        return;
      }

      if (term === lastTerm) return;

      lastTerm = term;
      region.innerHTML = loadingMarkup();
      setExpanded(true);
      timer = window.setTimeout(() => run(term), 220);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && input.value) {
        event.stopPropagation();
        input.value = '';
        reset();
        return;
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const links = resultLinks();
      if (!links.length) return;

      event.preventDefault();
      const target = event.key === 'ArrowDown' ? links[0] : links[links.length - 1];
      target.focus({ preventScroll: true });
    });

    region.addEventListener('click', (event) => {
      const link = event.target.closest('[data-predictive-link], a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;

      /* Preserve native new-tab and modified-click behaviour. */
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      /*
       * Navigate explicitly. This remains reliable even when another global
       * controller changes drawer state during the same click event.
       */
      event.preventDefault();
      window.location.assign(link.href);
    });

    region.addEventListener('keydown', (event) => {
      const current = event.target.closest('[data-predictive-link], a[href]');
      if (!(current instanceof HTMLAnchorElement)) return;

      const links = resultLinks();
      const currentIndex = links.indexOf(current);
      if (currentIndex < 0) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        input.focus({ preventScroll: true });
        return;
      }

      let nextIndex = null;

      if (event.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, links.length - 1);
      else if (event.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = links.length - 1;

      if (nextIndex === null) return;

      event.preventDefault();
      links[nextIndex].focus({ preventScroll: true });
    });

    form.addEventListener('submit', (event) => {
      if (!input.value.trim()) {
        event.preventDefault();
        input.focus();
      }
    });

    document.addEventListener('aside:close', (event) => {
      if (event.detail?.type === 'search') reset();
    });
  }

  function initPredictiveSearch(scope = document) {
    scope.querySelectorAll('[data-predictive-form]').forEach(initPredictiveForm);
  }

  // Predictive result links remain native links. The previous implementation
  // closed and inerted the search drawer before the browser completed the
  // navigation, which made product results appear unclickable.

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) return;

    event.preventDefault();
    const trigger = document.querySelector('[data-aside-open="search"]');
    if (trigger instanceof HTMLElement) trigger.click();
  });

  function initSearchPage(root) {
    if (!(root instanceof HTMLElement) || initializedPages.has(root)) return;

    const sectionId = root.getAttribute('data-section-id');
    const baseUrl = root.getAttribute('data-search-url');
    if (!sectionId || !baseUrl) return;

    initializedPages.add(root);

    let busy = false;
    let observer = null;

    function bindInfinite() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      const sentinel = root.querySelector('[data-load-more]');
      if (!(sentinel instanceof HTMLElement)) return;

      const link = sentinel.querySelector('[data-load-more-link]');
      if (!(link instanceof HTMLAnchorElement)) return;

      async function loadNext() {
        if (busy) return;

        busy = true;
        sentinel.setAttribute('aria-busy', 'true');

        const textElement = link.querySelector('[data-load-more-text]');
        const loadingLabel = link.getAttribute('data-loading-label');
        const originalLabel = textElement?.textContent || '';

        if (textElement && loadingLabel) textElement.textContent = loadingLabel;

        try {
          const href = link.getAttribute('href') || '';
          const query = href.split('?')[1] || '';
          const params = new URLSearchParams(query);
          params.set('section_id', sectionId);

          const response = await fetch(`${baseUrl}?${params.toString()}`, {
            headers: { 'X-Requested-With': 'fetch' },
          });

          if (!response.ok) throw new Error(`Load more failed: ${response.status}`);

          const freshDocument = new DOMParser().parseFromString(
            await response.text(),
            'text/html'
          );
          const freshGrid = freshDocument.querySelector('[data-product-grid]');
          const currentGrid = root.querySelector('[data-product-grid]');

          if (freshGrid && currentGrid) {
            while (freshGrid.firstElementChild) {
              currentGrid.appendChild(freshGrid.firstElementChild);
            }
          }

          const freshSentinel = freshDocument.querySelector('[data-load-more]');
          if (freshSentinel) sentinel.replaceWith(freshSentinel);
          else sentinel.remove();

          window.history.replaceState(window.history.state, '', href);
        } catch (error) {
          console.error(error);
          if (textElement) {
            textElement.textContent = link.getAttribute('data-retry-label') || 'Opnieuw proberen';
          }
          sentinel.removeAttribute('aria-busy');
          busy = false;
          return;
        }

        busy = false;
        if (textElement && originalLabel) textElement.textContent = originalLabel;
        bindInfinite();
      }

      link.addEventListener('click', (event) => {
        event.preventDefault();
        loadNext();
      });

      if ('IntersectionObserver' in window && !reduceMotion) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) loadNext();
          },
          { rootMargin: '600px 0px' }
        );
        observer.observe(sentinel);
      }
    }

    bindInfinite();
  }

  function initSearchPages(scope = document) {
    scope.querySelectorAll('[data-search]').forEach(initSearchPage);
  }

  initPredictiveSearch();
  initSearchPages();

  document.addEventListener('shopify:section:load', (event) => {
    initPredictiveSearch(event.target);
    initSearchPages(event.target);
  });
})();
