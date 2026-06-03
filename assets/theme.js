// Zayna Home theme entry point.
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  // ---- Drawer / aside controller -------------------------------------------
  // Triggers:  [data-aside-open="mobile|search|cart"]
  // Asides:    .overlay[data-aside="mobile|search|cart"]
  // Close:     [data-aside-close], backdrop .close-outside, Escape
  let lastTrigger = null;

  function getOverlay(type) {
    return document.querySelector('.overlay[data-aside="' + type + '"]');
  }
  function focusables(container) {
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }
  function openAside(type, trigger) {
    const overlay = getOverlay(type);
    if (!overlay) return;
    lastTrigger = trigger || document.activeElement;
    overlay.classList.add('expanded');
    const f = focusables(overlay);
    if (f.length) f[0].focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('aside:open', { detail: { type } }));
  }
  function closeAside(overlay) {
    if (!overlay) return;
    overlay.classList.remove('expanded');
    document.dispatchEvent(
      new CustomEvent('aside:close', { detail: { type: overlay.getAttribute('data-aside') } })
    );
  }
  function closeAll() {
    let closed = false;
    document.querySelectorAll('.overlay.expanded').forEach((o) => {
      closeAside(o);
      closed = true;
    });
    if (closed && lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus({ preventScroll: true });
      lastTrigger = null;
    }
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-aside-open]');
    if (opener) {
      e.preventDefault();
      openAside(opener.getAttribute('data-aside-open'), opener);
      return;
    }
    if (e.target.closest('[data-aside-close]') || e.target.classList.contains('close-outside')) {
      e.preventDefault();
      closeAll();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAll();
      return;
    }
    if (e.key !== 'Tab') return;
    const overlay = document.querySelector('.overlay.expanded');
    if (!overlay) return;
    const f = focusables(overlay);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
})();

// ---- Curated carousel: prev/next + continuous drift -----------------------
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('[data-carousel-track]');
    if (!track) return;
    const step = () => Math.min(track.clientWidth * 0.8, 380);
    const prev = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

    if (reduce || track.dataset.autoscroll !== 'true') return;
    let paused = false;
    root.addEventListener('pointerenter', () => { paused = true; });
    root.addEventListener('pointerleave', () => { paused = false; resync(); });
    root.addEventListener('focusin', () => { paused = true; });
    root.addEventListener('focusout', () => { paused = false; resync(); });
    // Resync the float accumulator to the real scroll position after manual
    // interaction so we don't snap back.
    let pos = 0;
    const resync = () => { pos = track.scrollLeft; };
    // Loop distance = offset between pass-1 item 0 and pass-2 item 0 (the
    // duplicated set), so the wrap is seamless regardless of padding/gap.
    const loopDistance = () => {
      const items = track.children;
      const n = items.length / 2;
      if (n < 1 || !items[n]) return track.scrollWidth / 2;
      return items[n].offsetLeft - items[0].offsetLeft;
    };
    const SPEED = 0.5; // px per frame (~30px/s)
    const tick = () => {
      if (!paused) {
        // Accumulate in a float: assigning scrollLeft += 0.5 directly never
        // advances because the browser rounds scrollLeft back to an integer.
        const loop = loopDistance();
        pos += SPEED;
        if (loop > 0 && pos >= loop) pos -= loop;
        track.scrollLeft = pos;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
})();
