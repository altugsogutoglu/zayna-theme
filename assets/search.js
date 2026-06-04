// Zayna Home — search controllers (predictive dropdown + full-page infinite scroll).
(() => {
  'use strict';
  if (window.__zhSearchInit) return;
  window.__zhSearchInit = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* A. Predictive dropdown                                           */
  /* ---------------------------------------------------------------- */
  const SECTION = 'predictive-search';
  const SUGGEST = '/search/suggest';
  const LIMIT = 5;

  const input = document.querySelector('[data-predictive-input]');
  const region = document.querySelector('[data-predictive-results]');

  const skeleton = () => {
    let rows = '';
    for (let i = 0; i < 4; i++) {
      rows +=
        '<li class="flex items-center gap-4 px-2 py-2.5">' +
        '<div class="h-14 w-14 shrink-0 bg-border-soft/50"></div>' +
        '<div class="min-w-0 flex-1 space-y-2">' +
        '<div class="h-3 w-3/5 rounded bg-border-soft/60"></div>' +
        '<div class="h-2.5 w-16 rounded bg-border-soft/40"></div>' +
        '</div></li>';
    }
    return (
      '<div aria-hidden="true" class="animate-pulse">' +
      '<div class="mb-3 h-2 w-20 rounded bg-border-soft/70"></div>' +
      '<ul class="-mx-2 space-y-1">' + rows + '</ul></div>'
    );
  };

  if (input && region) {
    const startHint = region.innerHTML;
    let timer = null;
    let lastTerm = '';
    let controller = null;

    const render = (html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('[data-predictive-results-list]');
      region.innerHTML = fresh ? fresh.outerHTML : startHint;
    };

    const run = async (term) => {
      if (controller) controller.abort();
      controller = new AbortController();
      const params = new URLSearchParams();
      params.set('q', term);
      params.set('section_id', SECTION);
      params.set('resources[type]', 'product,collection,page,article');
      params.set('resources[limit]', String(LIMIT));
      params.set('resources[limit_scope]', 'each');
      try {
        const res = await fetch(SUGGEST + '?' + params.toString(), {
          headers: { 'X-Requested-With': 'fetch' },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('suggest failed: ' + res.status);
        render(await res.text());
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    };

    input.addEventListener('input', () => {
      const term = input.value.trim();
      if (timer) clearTimeout(timer);
      if (term === '') {
        lastTerm = '';
        region.innerHTML = startHint;
        return;
      }
      if (term === lastTerm) return;
      lastTerm = term;
      region.innerHTML = skeleton();
      timer = setTimeout(() => run(term), 200);
    });
  }

  // Close the aside when a predictive result is chosen.
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-predictive-link]')) {
      const overlay = document.querySelector('.overlay[data-aside="search"].expanded');
      const close = overlay && overlay.querySelector('[data-aside-close]');
      if (close) close.click();
    }
  });

  // cmd+k / ctrl+k opens the search aside and focuses the input.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const trigger = document.querySelector('[data-aside-open="search"]');
      if (trigger) trigger.click();
      const field = document.querySelector('[data-predictive-input]');
      if (field) setTimeout(() => field.focus(), 50);
    }
  });

  /* ---------------------------------------------------------------- */
  /* B. Full-page infinite scroll (mirror of collection.js)          */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-search]').forEach((root) => {
    const sectionId = root.getAttribute('data-section-id');
    const baseUrl = root.getAttribute('data-search-url');
    if (!sectionId || !baseUrl) return;
    let busy = false;
    let observer = null;

    const bindInfinite = () => {
      if (observer) { observer.disconnect(); observer = null; }
      const sentinel = root.querySelector('[data-load-more]');
      if (!sentinel) return;
      const link = sentinel.querySelector('[data-load-more-link]');
      if (!link) return;

      const loadNext = async () => {
        if (busy) return;
        busy = true;
        sentinel.setAttribute('aria-busy', 'true');
        const textEl = link.querySelector('[data-load-more-text]');
        const loadingLabel = link.getAttribute('data-loading-label');
        if (textEl && loadingLabel) textEl.textContent = loadingLabel;
        try {
          const href = link.getAttribute('href') || '';
          const qs = (href.split('?')[1] || '') + '&section_id=' + encodeURIComponent(sectionId);
          const res = await fetch(baseUrl + '?' + qs, { headers: { 'X-Requested-With': 'fetch' } });
          if (!res.ok) throw new Error('load more failed: ' + res.status);
          const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
          const freshGrid = doc.querySelector('[data-product-grid]');
          const grid = root.querySelector('[data-product-grid]');
          if (freshGrid && grid) {
            while (freshGrid.firstElementChild) grid.appendChild(freshGrid.firstElementChild);
          }
          const freshSentinel = doc.querySelector('[data-load-more]');
          if (freshSentinel) {
            sentinel.replaceWith(freshSentinel);
          } else {
            sentinel.remove();
          }
          window.history.replaceState({}, '', href);
        } catch (e) {
          console.error(e);
          if (textEl) textEl.textContent = link.getAttribute('data-retry-label') || 'Opnieuw proberen';
        } finally {
          busy = false;
          bindInfinite();
        }
      };

      link.addEventListener('click', (e) => { e.preventDefault(); loadNext(); });
      if ('IntersectionObserver' in window && !reduce) {
        observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) loadNext();
        }, { rootMargin: '600px 0px 600px 0px' });
        observer.observe(sentinel);
      }
    };

    bindInfinite();
  });
})();
