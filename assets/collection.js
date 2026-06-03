// Zayna Home — collection page controllers. Loaded once per collection page from main-collection.
(() => {
  'use strict';
  if (window.__zhCollectionInit) return;
  window.__zhCollectionInit = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* 1. Category pills: mobile scroller edge-fades + active into view */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-pills-scroller]').forEach((scroller) => {
    const track = scroller.querySelector('[data-pills-track]');
    const fadeL = scroller.querySelector('[data-pills-fade="left"]');
    const fadeR = scroller.querySelector('[data-pills-fade="right"]');
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const x = track.scrollLeft;
      if (fadeL) fadeL.style.opacity = x > 4 ? '1' : '0';
      if (fadeR) fadeR.style.opacity = x < max - 4 ? '1' : '0';
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    const active = track.querySelector('[aria-current="true"]');
    if (active) {
      const offset = active.offsetLeft - (track.clientWidth - active.clientWidth) / 2;
      track.scrollLeft = Math.max(0, offset);
    }
  });

  /* ---------------------------------------------------------------- */
  /* 2-4. Faceted grid controllers                                    */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-collection]').forEach((root) => {
    const sectionId = root.getAttribute('data-section-id');
    const baseUrl = root.getAttribute('data-collection-url');
    if (!sectionId || !baseUrl) return;
    let busy = false;
    let infiniteObserver = null;

    const fetchSection = async (search) => {
      const url = baseUrl + '?' + search + (search ? '&' : '') + 'section_id=' + encodeURIComponent(sectionId);
      const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error('section fetch failed: ' + res.status);
      return res.text();
    };

    // Whole-section replace (sort / filter apply / clear / remove a pill)
    const replaceSection = async (params) => {
      if (busy) return;
      busy = true;
      params.delete('page');
      const search = params.toString();
      root.setAttribute('aria-busy', 'true');
      try {
        const html = await fetchSection(search);
        const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-collection]');
        if (fresh) root.innerHTML = fresh.innerHTML;
        window.history.pushState({}, '', baseUrl + (search ? '?' + search : ''));
        bind();
        if (!reduce) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        console.error(e);
        window.location.search = search; // hard fallback
      } finally {
        busy = false;
        root.removeAttribute('aria-busy');
      }
    };

    const currentParams = () => new URLSearchParams(window.location.search);

    const closeFilters = () => {
      // The drawer controller in theme.js toggles the `expanded` class on the overlay.
      const open = document.querySelector('.overlay[data-aside="filters"].expanded');
      const close = open && open.querySelector('[data-aside-close]');
      if (close) close.click();
    };

    // Infinite scroll: append next page, swap sentinel
    const bindInfinite = () => {
      if (infiniteObserver) { infiniteObserver.disconnect(); infiniteObserver = null; }
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
          bindInfinite(); // (re)observe the swapped-in sentinel
        }
      };

      link.addEventListener('click', (e) => { e.preventDefault(); loadNext(); });
      if ('IntersectionObserver' in window && !reduce) {
        infiniteObserver = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) loadNext();
        }, { rootMargin: '600px 0px 600px 0px' });
        infiniteObserver.observe(sentinel);
      }
    };

    // (Re)attach listeners to controls inside the (possibly replaced) section
    function bind() {
      const sort = root.querySelector('[data-sort-select]');
      if (sort) sort.addEventListener('change', () => {
        const p = currentParams();
        p.set('sort_by', sort.value);
        replaceSection(p);
      });

      const form = root.querySelector('[data-filter-form]');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = new URLSearchParams(new FormData(form));
        const cur = currentParams();
        if (!p.has('sort_by') && cur.get('sort_by')) p.set('sort_by', cur.get('sort_by'));
        for (const [k, v] of Array.from(p.entries())) if (v === '') p.delete(k);
        replaceSection(p);
        closeFilters();
      });

      root.querySelectorAll('[data-filter-clear]').forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        const cur = currentParams();
        if (cur.get('sort_by')) p.set('sort_by', cur.get('sort_by'));
        replaceSection(p);
        closeFilters();
      }));

      root.querySelectorAll('[data-filter-remove]').forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        const qs = (a.getAttribute('href') || '').split('?')[1] || '';
        replaceSection(new URLSearchParams(qs));
      }));

      bindInfinite();
    }

    bind();
  });
})();
