// Zayna Home — product page controllers. Loaded once per product page from main-product.
(() => {
  'use strict';
  if (window.__zhProductInit) return;
  window.__zhProductInit = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* 1. Gallery: mobile carousel + desktop main/thumbs + lightbox     */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-gallery]').forEach((root) => {
    const slideUrls = JSON.parse(root.getAttribute('data-images') || '[]'); // [{src, srcset, alt, w, h}]
    if (!slideUrls.length) return;

    // --- mobile swipe carousel ---
    const track = root.querySelector('[data-gallery-track]');
    const counter = root.querySelector('[data-gallery-counter]');
    const dotsWrap = root.querySelectorAll('[data-gallery-dots]'); // mobile dots
    const setCounter = (i) => { if (counter) counter.textContent = (i + 1) + ' / ' + slideUrls.length; };
    const setDots = (i) => dotsWrap.forEach((dw) => dw.querySelectorAll('[data-gallery-dot]').forEach((d, di) => {
      const on = di === i;
      d.setAttribute('aria-current', on ? 'true' : 'false');
      d.className = 'h-1.5 transition-all duration-300 ' + (on ? 'w-7 bg-ink' : 'w-1.5 bg-stone-soft hover:bg-stone');
    }));
    let mobileIndex = 0;
    if (track) {
      const slides = Array.from(track.children);
      let raf = 0;
      track.addEventListener('scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const mid = track.scrollLeft + track.clientWidth / 2;
          let best = 0, bestD = Infinity;
          slides.forEach((s, i) => {
            const c = s.offsetLeft + s.clientWidth / 2;
            const d = Math.abs(c - mid);
            if (d < bestD) { bestD = d; best = i; }
          });
          if (best !== mobileIndex) { mobileIndex = best; setCounter(best); setDots(best); }
        });
      }, { passive: true });
      root.querySelectorAll('[data-gallery-dot]').forEach((d) => {
        d.addEventListener('click', () => {
          const i = Number(d.getAttribute('data-gallery-dot'));
          if (track && slides[i]) track.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' });
        });
      });
      track.querySelectorAll('[data-gallery-open]').forEach((btn) => {
        btn.addEventListener('click', () => openLightbox(Number(btn.getAttribute('data-gallery-open'))));
      });
    }

    // --- desktop main + thumbnails ---
    const main = root.querySelector('[data-gallery-main-btn] img');
    const mainBtn = root.querySelector('[data-gallery-main-btn]');
    let desktopIndex = 0;
    const setMain = (i) => {
      desktopIndex = i;
      if (main) {
        main.src = slideUrls[i].src;
        main.removeAttribute('srcset'); // swap to full-res src; initial render keeps its responsive srcset
        main.alt = slideUrls[i].alt || '';
      }
      root.querySelectorAll('[data-gallery-thumb]').forEach((t, ti) => {
        const on = ti === i;
        t.className = 'relative aspect-square overflow-hidden bg-cream transition-all duration-300 focus-visible:outline-none ' +
          (on ? 'ring-2 ring-stone' : 'opacity-80 hover:opacity-100');
      });
    };
    const syncGalleryTo = (i) => {
      setMain(i); // updates desktopIndex + main img + thumb rings
      if (track && track.children[i]) {
        track.scrollTo({ left: track.children[i].offsetLeft, behavior: 'auto' });
      }
    };
    root.querySelectorAll('[data-gallery-thumb]').forEach((t) => {
      t.addEventListener('click', () => setMain(Number(t.getAttribute('data-gallery-thumb'))));
    });
    if (mainBtn) mainBtn.addEventListener('click', () => openLightbox(desktopIndex));

    /* ---- lightbox ---- */
    const box = root.querySelector('[data-gallery-lightbox]');
    if (!box) return;
    const boxTrack = box.querySelector('[data-lightbox-track]');
    const boxSlides = Array.from(boxTrack ? boxTrack.children : []);
    const boxCounter = box.querySelector('[data-lightbox-counter]');
    const boxDotsWrap = box.querySelector('[data-lightbox-dots]');
    let lbIndex = 0;
    let prevOverflow = '';

    const setLb = (i, instant) => {
      lbIndex = Math.max(0, Math.min(slideUrls.length - 1, i));
      syncGalleryTo(lbIndex);
      if (boxTrack && boxSlides[lbIndex]) {
        boxTrack.scrollTo({ left: boxSlides[lbIndex].offsetLeft, behavior: instant ? 'auto' : 'smooth' });
      }
      if (boxCounter) boxCounter.textContent = (lbIndex + 1) + ' / ' + slideUrls.length;
      if (boxDotsWrap) boxDotsWrap.querySelectorAll('[data-lightbox-dot]').forEach((d, di) => {
        const on = di === lbIndex;
        d.setAttribute('aria-current', on ? 'true' : 'false');
        d.className = 'h-1.5 transition-all duration-300 ' + (on ? 'w-7 bg-surface' : 'w-1.5 bg-surface/30 hover:bg-surface/60');
      });
      resetAllZoom();
    };

    function openLightbox(i) {
      if (!box) return;
      box.classList.remove('hidden');
      box.classList.add('flex');
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setLb(i, true);
      const closeBtn = box.querySelector('[data-lightbox-close]');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }
    function closeLightbox() {
      if (!box) return;
      box.classList.add('hidden');
      box.classList.remove('flex');
      document.body.style.overflow = prevOverflow;
      resetAllZoom();
      if (mainBtn) mainBtn.focus({ preventScroll: true });
    }

    box.querySelectorAll('[data-lightbox-close]').forEach((b) => b.addEventListener('click', closeLightbox));
    const prevBtn = box.querySelector('[data-lightbox-prev]');
    const nextBtn = box.querySelector('[data-lightbox-next]');
    if (prevBtn) prevBtn.addEventListener('click', () => setLb(lbIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setLb(lbIndex + 1));
    if (boxDotsWrap) boxDotsWrap.querySelectorAll('[data-lightbox-dot]').forEach((d) => {
      d.addEventListener('click', () => setLb(Number(d.getAttribute('data-lightbox-dot'))));
    });
    // Track scroll → sync index (when dragging on touch)
    if (boxTrack) {
      let lraf = 0;
      boxTrack.addEventListener('scroll', () => {
        if (lraf) return;
        lraf = requestAnimationFrame(() => {
          lraf = 0;
          const mid = boxTrack.scrollLeft + boxTrack.clientWidth / 2;
          let best = 0, bestD = Infinity;
          boxSlides.forEach((s, i) => {
            const c = s.offsetLeft + s.clientWidth / 2;
            const d = Math.abs(c - mid);
            if (d < bestD) { bestD = d; best = i; }
          });
          if (best !== lbIndex) {
            lbIndex = best;
            syncGalleryTo(best);
            if (boxCounter) boxCounter.textContent = (best + 1) + ' / ' + slideUrls.length;
            if (boxDotsWrap) boxDotsWrap.querySelectorAll('[data-lightbox-dot]').forEach((d, di) => {
              const on = di === best;
              d.setAttribute('aria-current', on ? 'true' : 'false');
              d.className = 'h-1.5 transition-all duration-300 ' + (on ? 'w-7 bg-surface' : 'w-1.5 bg-surface/30 hover:bg-surface/60');
            });
            resetAllZoom();
          }
        });
      }, { passive: true });
    }
    document.addEventListener('keydown', (e) => {
      if (box.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') setLb(lbIndex + 1);
      else if (e.key === 'ArrowLeft') setLb(lbIndex - 1);
    });

    /* ---- per-slide pinch / pan / double-tap zoom (port of ZoomableImage) ---- */
    const MIN = 1, MAX = 4, DT_MS = 280, DT_SCALE = 2.5;
    const zoomers = boxSlides.map((slide) => setupZoom(slide));
    function resetAllZoom() {
      zoomers.forEach((z, i) => z.reset(i !== lbIndex));
      // re-enable horizontal drag when no slide is zoomed
      if (boxTrack) boxTrack.style.overflowX = 'auto';
    }
    function setupZoom(slide) {
      const wrapper = slide.querySelector('[data-zoom-wrapper]');
      const target = slide.querySelector('[data-zoom-target]');
      if (!wrapper || !target) return { reset() {} };
      let meta = {};
      try { meta = JSON.parse(slide.getAttribute('data-zoom-meta') || '{}'); } catch (e) { meta = {}; }
      const pointers = new Map();
      let gs = { distance: 0, scale: 1, panX: 0, panY: 0, px: 0, py: 0 };
      let tf = { scale: 1, x: 0, y: 0 };
      let zoomed = false, lastTap = 0, moved = false;

      const write = (animate) => {
        target.style.transitionDuration = animate ? '240ms' : '0ms';
        target.style.transform = 'translate3d(' + tf.x + 'px,' + tf.y + 'px,0) scale(' + tf.scale + ')';
        wrapper.style.cursor = tf.scale > 1.01 ? 'grab' : 'zoom-in';
      };
      const setTf = (scale, x, y, animate) => {
        const cs = Math.max(MIN, Math.min(MAX, scale));
        const r = wrapper.getBoundingClientRect();
        const W = r.width, H = r.height;
        const img = target.querySelector('img');
        const iw = meta.w || (img && img.naturalWidth) || 0;
        const ih = meta.h || (img && img.naturalHeight) || 0;
        let dW = W, dH = H;
        if (iw && ih) {
          const ratio = iw / ih;
          if (ratio > W / H) { dW = W; dH = W / ratio; } else { dH = H; dW = H * ratio; }
        }
        const maxX = Math.max(0, (dW * cs - W) / 2);
        const maxY = Math.max(0, (dH * cs - H) / 2);
        tf = { scale: cs, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
        write(animate);
        const isZ = cs > 1.01;
        if (isZ !== zoomed) { zoomed = isZ; if (boxTrack) boxTrack.style.overflowX = isZ ? 'hidden' : 'auto'; }
      };
      const reset = () => { tf = { scale: 1, x: 0, y: 0 }; write(false); if (zoomed) { zoomed = false; if (boxTrack) boxTrack.style.overflowX = 'auto'; } };

      wrapper.addEventListener('pointerdown', (e) => {
        wrapper.setPointerCapture && wrapper.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        moved = false;
        if (pointers.size === 2) {
          const [a, b] = Array.from(pointers.values());
          gs = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: tf.scale, panX: tf.x, panY: tf.y, px: (a.x + b.x) / 2, py: (a.y + b.y) / 2 };
        } else if (pointers.size === 1) {
          gs.panX = tf.x; gs.panY = tf.y; gs.px = e.clientX; gs.py = e.clientY;
        }
      });
      wrapper.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [a, b] = Array.from(pointers.values());
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (!gs.distance) return;
          const ns = gs.scale * (dist / gs.distance);
          const r = wrapper.getBoundingClientRect();
          const fx = gs.px - (r.x + r.width / 2);
          const fy = gs.py - (r.y + r.height / 2);
          const k = Math.max(MIN, Math.min(MAX, ns)) / gs.scale;
          setTf(ns, fx - (fx - gs.panX) * k, fy - (fy - gs.panY) * k);
          moved = true;
        } else if (pointers.size === 1 && tf.scale > 1.01) {
          const dx = e.clientX - gs.px, dy = e.clientY - gs.py;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
          setTf(tf.scale, gs.panX + dx, gs.panY + dy);
        }
      });
      const up = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size === 1) {
          const [rem] = Array.from(pointers.values());
          gs.panX = tf.x; gs.panY = tf.y; gs.px = rem.x; gs.py = rem.y;
        }
        if (pointers.size === 0 && !moved) {
          const now = performance.now();
          if (now - lastTap < DT_MS) {
            if (tf.scale > 1.01) setTf(1, 0, 0, true);
            else {
              const r = wrapper.getBoundingClientRect();
              const fx = e.clientX - (r.x + r.width / 2), fy = e.clientY - (r.y + r.height / 2);
              setTf(DT_SCALE, fx * (1 - DT_SCALE), fy * (1 - DT_SCALE), true);
            }
            lastTap = 0;
          } else lastTap = now;
        }
      };
      wrapper.addEventListener('pointerup', up);
      wrapper.addEventListener('pointercancel', up);
      return { reset };
    }
  });

  /* ---------------------------------------------------------------- */
  /* 2. Variant selection                                             */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-product-root]').forEach((root) => {
    const dataEl = root.querySelector('[data-product-json]');
    if (!dataEl) return;
    let pdata;
    try { pdata = JSON.parse(dataEl.textContent); } catch { return; }
    const variants = pdata.variants || [];
    const form = root.querySelector('[data-product-form] form');
    const idInput = root.querySelector('[data-variant-id]');
    const addBtn = root.querySelector('[data-add-button]');
    const priceEl = root.querySelector('[data-price]');
    const compareEl = root.querySelector('[data-compare-price]');
    const availEl = root.querySelector('[data-availability]');
    const availDot = root.querySelector('[data-availability-dot]');
    const availText = root.querySelector('[data-availability-text]');
    const stickyPrice = root.querySelector('[data-sticky-price]');
    const labels = pdata.labels || {};

    const selected = {}; // position(1-based) -> value
    root.querySelectorAll('[data-option-button][data-selected="true"]').forEach((b) => {
      selected[b.getAttribute('data-option-position')] = b.getAttribute('data-value');
    });

    const findVariant = () => variants.find((v) =>
      (v.options || []).every((val, i) => selected[String(i + 1)] === undefined || selected[String(i + 1)] === val)
    );

    const apply = (v) => {
      if (!v) return;
      if (idInput) idInput.value = v.id;
      if (priceEl) priceEl.innerHTML = (v.price === 0)
        ? '<span class="font-display italic text-xl text-stone">' + (labels.price_on_request || 'Prijs op aanvraag') + '</span>'
        : '<span class="font-display text-2xl tabular-nums text-ink">' + v.price_formatted + '</span>';
      if (compareEl) {
        if (v.compare_at_price && v.compare_at_price > v.price) {
          compareEl.innerHTML = v.compare_at_formatted;
          compareEl.classList.remove('hidden');
        } else { compareEl.innerHTML = ''; compareEl.classList.add('hidden'); }
      }
      if (stickyPrice) stickyPrice.textContent = v.price === 0 ? (labels.price_on_request || 'Prijs op aanvraag') : v.price_formatted;
      const avail = !!v.available;
      if (availText) availText.textContent = avail ? (labels.in_stock || '') : (labels.sold_status || labels.sold || 'Uitverkocht');
      if (availEl) availEl.className = 'inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] ' + (avail ? 'text-stone' : 'text-sold');
      if (availDot) availDot.className = 'block h-1.5 w-1.5 rounded-full ' + (avail ? 'bg-sage' : 'bg-sold');
      root.querySelectorAll('[data-add-button]').forEach((b) => {
        b.disabled = !avail;
        b.textContent = avail ? (labels.add || 'In winkelmand') : (labels.sold || 'Uitverkocht');
      });
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', u);
      } catch {}
    };

    root.querySelectorAll('[data-option-button]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pos = btn.getAttribute('data-option-position');
        selected[pos] = btn.getAttribute('data-value');
        root.querySelectorAll('[data-option-position="' + pos + '"]').forEach((b) => {
          const on = b === btn;
          b.setAttribute('data-selected', on ? 'true' : 'false');
          b.className = optionClass(on, b.getAttribute('data-available') === 'true');
        });
        apply(findVariant());
      });
    });
    function optionClass(selectedState, available) {
      return 'inline-flex items-center gap-2 px-4 h-10 text-sm transition-colors border ' +
        (selectedState ? 'border-ink text-ink bg-cream' : 'border-border-soft text-ink-soft hover:border-stone hover:text-ink') +
        (available ? '' : ' opacity-40 line-through');
    }

    // quantity stepper
    const qtyInput = root.querySelector('[data-qty-input]');
    root.querySelectorAll('[data-qty-dec]').forEach((b) => b.addEventListener('click', () => {
      if (!qtyInput) return; qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1); syncQty();
    }));
    root.querySelectorAll('[data-qty-inc]').forEach((b) => b.addEventListener('click', () => {
      if (!qtyInput) return; qtyInput.value = Math.min(99, (parseInt(qtyInput.value, 10) || 1) + 1); syncQty();
    }));
    function syncQty() {
      const v = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
      const out = root.querySelector('[data-qty-value]');
      if (out) out.textContent = v;
    }

    // wishlist toggle (visual only, matches Hydrogen local state)
    root.querySelectorAll('[data-wishlist]').forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      b.setAttribute('aria-label', on ? 'Bewaar voor later' : 'Verwijder uit favorieten');
      b.className = wishClass(!on);
      const heart = b.querySelector('svg');
      if (heart) heart.classList.toggle('fill-clay', !on);
    }));
    function wishClass(on) {
      return 'h-14 w-14 shrink-0 grid place-items-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 ' +
        (on ? 'border-clay/50 text-clay bg-clay/5' : 'border-border-soft text-ink-soft hover:text-clay hover:border-clay/40');
    }

    /* -------------------------------------------------------------- */
    /* 3. AJAX add-to-cart (delegates to window.ZaynaCart from cart.js) */
    /* -------------------------------------------------------------- */
    const addViaCart = async (sourceForm, btns) => {
      const originals = btns.map((b) => b.textContent);
      btns.forEach((b) => { b.disabled = true; b.textContent = labels.adding || 'Toevoegen…'; });
      try {
        if (window.ZaynaCart && typeof window.ZaynaCart.add === 'function') {
          await window.ZaynaCart.add(new FormData(sourceForm));
        } else {
          await fetch('/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(sourceForm) });
          window.location.href = '/cart';
        }
      } catch (err) {
        console.error(err);
      } finally {
        btns.forEach((b, i) => { b.disabled = false; b.textContent = originals[i]; });
      }
    };

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (addBtn && addBtn.disabled) return;
        addViaCart(form, Array.from(root.querySelectorAll('[data-add-button]')));
      });
    }

    const stickyForm = root.querySelector('[data-sticky-form]');
    const stickyId = root.querySelector('[data-sticky-form] [data-variant-id]');
    if (stickyForm) {
      stickyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (stickyId && idInput) stickyId.value = idInput.value;
        addViaCart(stickyForm, Array.from(stickyForm.querySelectorAll('[data-add-button]')));
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /* 4. Sticky add-to-cart bar (mobile)                               */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-sticky-atc]').forEach((bar) => {
    const targetId = bar.getAttribute('data-observe');
    const target = targetId ? document.getElementById(targetId) : null;
    let visible = false, drawerOpen = false;
    const render = () => {
      const show = visible && !drawerOpen;
      bar.classList.toggle('translate-y-full', !show);
      bar.classList.toggle('translate-y-0', show);
      if (show) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    };
    if (target) {
      new IntersectionObserver(([entry]) => { visible = !entry.isIntersecting; render(); }, { rootMargin: '0px 0px -40% 0px' })
        .observe(target);
    }
    document.addEventListener('aside:open', () => { drawerOpen = true; render(); });
    document.addEventListener('aside:close', () => { drawerOpen = false; render(); });
    render();
  });

  /* ---------------------------------------------------------------- */
  /* 5. Related products fetch (Product Recommendations API)          */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-related-products][data-url]').forEach(async (el) => {
    try {
      const res = await fetch(el.getAttribute('data-url'));
      if (!res.ok) return;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const fresh = doc.querySelector('[data-related-products]');
      if (fresh) el.innerHTML = fresh.innerHTML;
    } catch (err) { console.error(err); }
  });
})();
