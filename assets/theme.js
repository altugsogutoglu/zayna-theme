// Zayna Home theme entry point.
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  // ---- Drawer / aside controller -------------------------------------------
  // Triggers:  [data-aside-open="mobile|search|cart"]
  // Asides:    .overlay[data-aside="mobile|search|cart"]
  // Close:     [data-aside-close], backdrop .close-outside, Escape
  function getOverlay(type) {
    return document.querySelector('.overlay[data-aside="' + type + '"]');
  }
  function openAside(type) {
    const overlay = getOverlay(type);
    if (!overlay) return;
    overlay.classList.add('expanded');
    const focusable = overlay.querySelector('input, button, a, [tabindex]');
    if (focusable) focusable.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('aside:open', { detail: { type } }));
  }
  function closeAside(overlay) {
    if (!overlay) return;
    overlay.classList.remove('expanded');
  }
  function closeAll() {
    document.querySelectorAll('.overlay.expanded').forEach(closeAside);
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-aside-open]');
    if (opener) {
      e.preventDefault();
      openAside(opener.getAttribute('data-aside-open'));
      return;
    }
    if (e.target.closest('[data-aside-close]') || e.target.classList.contains('close-outside')) {
      e.preventDefault();
      closeAll();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
})();
