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
