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


  const CATEGORY_DESKTOP_QUERY = '(min-width: 1024px)';

  const setElementInert = (element, inert) => {
    if (!element) return;

    element.inert = inert;

    if (inert) {
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('aria-hidden');
    }
  };

  const initialiseCategoryNavigation = (navigation) => {
    if (
      !navigation ||
      navigation.dataset.categoryControllerReady === 'true'
    ) {
      return;
    }

    navigation.dataset.categoryControllerReady = 'true';

    const mediaQuery = window.matchMedia(
      CATEGORY_DESKTOP_QUERY
    );

    const mobileDetails = navigation.querySelector(
      '[data-category-mobile]'
    );

    const mobileSummary = navigation.querySelector(
      '[data-category-summary]'
    );

    const mobileMenu = navigation.querySelector(
      '[data-category-menu]'
    );

    const mobileOptions = navigation.querySelector(
      '[data-category-mobile-options]'
    );

    const mobileLinks = Array.from(
      navigation.querySelectorAll(
        '[data-category-mobile-link]'
      )
    );

    const mobileClose = navigation.querySelector(
      '[data-category-close]'
    );

    const mobileBackdrop = navigation.querySelector(
      '[data-category-backdrop]'
    );

    const rail = navigation.querySelector(
      '[data-category-rail]'
    );

    const viewport = navigation.querySelector(
      '[data-category-viewport]'
    );

    const desktopLinks = Array.from(
      navigation.querySelectorAll(
        '[data-category-desktop-link]'
      )
    );

    const previousButton = navigation.querySelector(
      '[data-category-prev]'
    );

    const nextButton = navigation.querySelector(
      '[data-category-next]'
    );

    let desktopIndex = Math.max(
      0,
      desktopLinks.findIndex((link) => {
        return link.getAttribute('aria-current') === 'page';
      })
    );

    let desktopHoverIndex = null;
    let desktopPointerInside = false;
    let desktopKeyboardMode = false;

    let mobileIndex = Math.max(
      0,
      mobileLinks.findIndex((link) => {
        return link.getAttribute('aria-current') === 'page';
      })
    );

    let mobileHoverIndex = null;
    let mobilePointerEligible = false;
    let mobileKeyboardMode = false;
    let mobileOpenedWithKeyboard = false;

    const clamp = (value, minimum, maximum) => {
      return Math.min(
        Math.max(value, minimum),
        maximum
      );
    };

    const isTypingTarget = (target) => {
      return Boolean(
        target?.closest?.(
          'input, textarea, select, [contenteditable="true"]'
        )
      );
    };

    const activeDesktopIndex = () => {
      return Math.max(
        0,
        desktopLinks.findIndex((link) => {
          return link.getAttribute('aria-current') === 'page';
        })
      );
    };

    const activeMobileIndex = () => {
      return Math.max(
        0,
        mobileLinks.findIndex((link) => {
          return link.getAttribute('aria-current') === 'page';
        })
      );
    };

    const horizontalPositionFor = (link) => {
      if (!viewport || !link) return 0;

      const rawPosition =
        link.offsetLeft -
        (viewport.clientWidth - link.offsetWidth) / 2;

      const maximum =
        viewport.scrollWidth - viewport.clientWidth;

      return clamp(
        rawPosition,
        0,
        Math.max(0, maximum)
      );
    };

    const revealDesktopLink = (
      link,
      behavior = 'smooth'
    ) => {
      if (!viewport || !link) return;

      viewport.scrollTo({
        left: horizontalPositionFor(link),
        top: 0,
        behavior
      });
    };

    const clearDesktopKeyboardTarget = () => {
      desktopKeyboardMode = false;
      rail?.classList.remove('is-keyboard-mode');

      desktopLinks.forEach((link) => {
        link.classList.remove('is-keyboard-target');
      });
    };

    const setDesktopTarget = (
      index,
      {
        focus = true,
        behavior = 'smooth'
      } = {}
    ) => {
      desktopIndex = clamp(
        index,
        0,
        Math.max(0, desktopLinks.length - 1)
      );

      desktopKeyboardMode = true;
      rail?.classList.add('is-keyboard-mode');

      desktopLinks.forEach((link, linkIndex) => {
        const isTarget = linkIndex === desktopIndex;

        link.tabIndex = isTarget ? 0 : -1;
        link.classList.toggle(
          'is-keyboard-target',
          isTarget
        );
      });

      const target = desktopLinks[desktopIndex];

      revealDesktopLink(target, behavior);

      if (focus) {
        target?.focus({
          preventScroll: true
        });
      }
    };

    const resetDesktopTabStop = () => {
      desktopIndex = activeDesktopIndex();

      desktopLinks.forEach((link, linkIndex) => {
        link.tabIndex =
          linkIndex === desktopIndex ? 0 : -1;

        link.classList.remove('is-keyboard-target');
      });

      rail?.classList.remove('is-keyboard-mode');
      desktopKeyboardMode = false;
    };

    const nativeRailState = () => {
      if (!viewport) {
        return {
          canScrollPrevious: false,
          canScrollNext: false
        };
      }

      const tolerance = 2;

      return {
        canScrollPrevious:
          viewport.scrollLeft > tolerance,

        canScrollNext:
          viewport.scrollLeft +
            viewport.clientWidth <
          viewport.scrollWidth - tolerance
      };
    };

    const updateRailState = () => {
      if (!rail || !viewport) return;

      const state = nativeRailState();

      const hasOverflow =
        state.canScrollPrevious ||
        state.canScrollNext;

      rail.classList.toggle(
        'has-overflow',
        hasOverflow
      );

      rail.classList.toggle(
        'can-scroll-prev',
        state.canScrollPrevious
      );

      rail.classList.toggle(
        'can-scroll-next',
        state.canScrollNext
      );

      if (previousButton) {
        previousButton.disabled =
          !state.canScrollPrevious;
      }

      if (nextButton) {
        nextButton.disabled =
          !state.canScrollNext;
      }
    };

    const clearMobileKeyboardTarget = () => {
      mobileKeyboardMode = false;
      mobileMenu?.classList.remove('is-keyboard-mode');

      mobileLinks.forEach((link) => {
        link.classList.remove('is-keyboard-target');
      });
    };

    const revealMobileLink = (link) => {
      if (!mobileOptions || !link) return;

      const targetTop = link.offsetTop;
      const targetBottom =
        targetTop + link.offsetHeight;

      const visibleTop = mobileOptions.scrollTop;
      const visibleBottom =
        visibleTop + mobileOptions.clientHeight;

      if (targetTop < visibleTop) {
        mobileOptions.scrollTo({
          top: targetTop - 7,
          behavior: 'smooth'
        });
      } else if (targetBottom > visibleBottom) {
        mobileOptions.scrollTo({
          top:
            targetBottom -
            mobileOptions.clientHeight +
            7,
          behavior: 'smooth'
        });
      }
    };

    const setMobileTarget = (
      index,
      { focus = true } = {}
    ) => {
      mobileIndex = clamp(
        index,
        0,
        Math.max(0, mobileLinks.length - 1)
      );

      mobileKeyboardMode = true;
      mobilePointerEligible = false;
      mobileMenu?.classList.add('is-keyboard-mode');

      mobileLinks.forEach((link, linkIndex) => {
        const isTarget = linkIndex === mobileIndex;

        link.tabIndex = isTarget ? 0 : -1;
        link.classList.toggle(
          'is-keyboard-target',
          isTarget
        );
      });

      const target = mobileLinks[mobileIndex];

      revealMobileLink(target);

      if (focus) {
        target?.focus({
          preventScroll: true
        });
      }
    };

    const closeMobileMenu = ({
      restoreFocus = true
    } = {}) => {
      if (!mobileDetails?.open) return;

      mobileDetails.removeAttribute('open');

      document.documentElement.classList.remove(
        'zh-category-menu-open'
      );

      clearMobileKeyboardTarget();

      mobileLinks.forEach((link) => {
        link.tabIndex = -1;
      });

      if (restoreFocus) {
        mobileSummary?.focus({
          preventScroll: true
        });
      }
    };

    const openMobileMenu = () => {
      if (
        !mobileDetails?.open ||
        mediaQuery.matches
      ) {
        return;
      }

      document.documentElement.classList.add(
        'zh-category-menu-open'
      );

      mobileIndex = activeMobileIndex();

      mobileLinks.forEach((link) => {
        link.tabIndex = -1;
      });

      if (mobileOpenedWithKeyboard) {
        window.requestAnimationFrame(() => {
          setMobileTarget(mobileIndex, {
            focus: true
          });
        });
      } else {
        clearMobileKeyboardTarget();
      }

      mobileOpenedWithKeyboard = false;
    };

    const syncMode = () => {
      if (mediaQuery.matches) {
        closeMobileMenu({
          restoreFocus: false
        });

        setElementInert(mobileDetails, true);
        setElementInert(rail, false);

        resetDesktopTabStop();

        revealDesktopLink(
          desktopLinks[desktopIndex],
          'auto'
        );

        window.requestAnimationFrame(() => {
          updateRailState();
        });
      } else {
        setElementInert(rail, true);
        setElementInert(mobileDetails, false);

        clearDesktopKeyboardTarget();

        desktopLinks.forEach((link) => {
          link.tabIndex = -1;
        });

        mobileLinks.forEach((link) => {
          link.tabIndex = -1;
        });
      }
    };

    /*
     * Desktop pointer state.
     */
    rail?.addEventListener('pointerenter', () => {
      desktopPointerInside = true;
    });

    rail?.addEventListener('pointerleave', () => {
      desktopPointerInside = false;
      desktopHoverIndex = null;

      if (
        desktopKeyboardMode &&
        !rail.contains(document.activeElement)
      ) {
        clearDesktopKeyboardTarget();
        resetDesktopTabStop();
      }
    });

    desktopLinks.forEach((link, index) => {
      link.addEventListener('pointerenter', () => {
        desktopHoverIndex = index;
      });

      link.addEventListener('focus', () => {
        if (!mediaQuery.matches) return;

        desktopIndex = index;
      });
    });

    rail?.addEventListener('pointermove', () => {
      if (!desktopKeyboardMode) return;

      clearDesktopKeyboardTarget();
    });

    /*
     * Desktop keyboard controller works from either:
     * - the focused pill; or
     * - the pill currently under the mouse.
     */
    document.addEventListener('keydown', (event) => {
      if (
        !mediaQuery.matches ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      const focusedIndex =
        desktopLinks.indexOf(document.activeElement);

      const railIsActive =
        focusedIndex >= 0 ||
        desktopPointerInside;

      if (!railIsActive) return;

      if (
        event.key === 'Enter' &&
        desktopKeyboardMode
      ) {
        const target = desktopLinks[desktopIndex];

        if (!target) return;

        event.preventDefault();
        window.location.assign(target.href);
        return;
      }

      let baseIndex =
        focusedIndex >= 0
          ? focusedIndex
          : (
              desktopHoverIndex !== null
                ? desktopHoverIndex
                : desktopIndex
            );

      let destination = null;

      switch (event.key) {
        case 'ArrowRight':
        case 'Right':
          destination = Math.min(
            baseIndex + 1,
            desktopLinks.length - 1
          );
          break;

        case 'ArrowLeft':
        case 'Left':
          destination = Math.max(
            baseIndex - 1,
            0
          );
          break;

        case 'Home':
          destination = 0;
          break;

        case 'End':
          destination = desktopLinks.length - 1;
          break;

        default:
          return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDesktopTarget(destination, {
        focus: true
      });
    });

    previousButton?.addEventListener('click', () => {
      if (!viewport) return;

      viewport.scrollBy({
        left: -viewport.clientWidth * 0.72,
        top: 0,
        behavior: 'smooth'
      });
    });

    nextButton?.addEventListener('click', () => {
      if (!viewport) return;

      viewport.scrollBy({
        left: viewport.clientWidth * 0.72,
        top: 0,
        behavior: 'smooth'
      });
    });

    viewport?.addEventListener(
      'scroll',
      updateRailState,
      { passive: true }
    );

    /*
     * Split-screen/mobile pointer state.
     */
    mobileLinks.forEach((link, index) => {
      link.addEventListener('pointerenter', () => {
        mobileHoverIndex = index;
        mobilePointerEligible = true;
      });
    });

    mobileMenu?.addEventListener('pointermove', () => {
      if (!mobileKeyboardMode) return;

      clearMobileKeyboardTarget();
      mobilePointerEligible = true;
    });

    mobileSummary?.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          mobileOpenedWithKeyboard = true;
        }
      }
    );

    mobileSummary?.addEventListener(
      'pointerdown',
      () => {
        mobileOpenedWithKeyboard = false;
      }
    );

    mobileDetails?.addEventListener('toggle', () => {
      if (mobileDetails.open) {
        openMobileMenu();
      } else {
        document.documentElement.classList.remove(
          'zh-category-menu-open'
        );

        clearMobileKeyboardTarget();
      }
    });

    mobileBackdrop?.addEventListener('click', () => {
      closeMobileMenu();
    });

    mobileClose?.addEventListener('click', () => {
      closeMobileMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (
        mediaQuery.matches ||
        !mobileDetails?.open ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileMenu();
        return;
      }

      if (event.key === 'Tab') {
        const currentTarget =
          mobileLinks[mobileIndex];

        if (
          !event.shiftKey &&
          document.activeElement === currentTarget
        ) {
          event.preventDefault();
          mobileClose?.focus({
            preventScroll: true
          });
        } else if (
          event.shiftKey &&
          document.activeElement === mobileClose
        ) {
          event.preventDefault();

          if (mobileKeyboardMode) {
            currentTarget?.focus({
              preventScroll: true
            });
          } else {
            mobileSummary?.focus({
              preventScroll: true
            });
          }
        }

        return;
      }

      if (
        event.key === 'Enter' &&
        mobileKeyboardMode
      ) {
        const target = mobileLinks[mobileIndex];

        if (!target) return;

        event.preventDefault();
        window.location.assign(target.href);
        return;
      }

      const focusedIndex =
        mobileLinks.indexOf(document.activeElement);

      const baseIndex =
        mobilePointerEligible &&
        mobileHoverIndex !== null
          ? mobileHoverIndex
          : (
              focusedIndex >= 0
                ? focusedIndex
                : mobileIndex
            );

      let destination = null;

      switch (event.key) {
        case 'ArrowDown':
        case 'Down':
          destination = Math.min(
            baseIndex + 1,
            mobileLinks.length - 1
          );
          break;

        case 'ArrowUp':
        case 'Up':
          destination = Math.max(
            baseIndex - 1,
            0
          );
          break;

        case 'Home':
          destination = 0;
          break;

        case 'End':
          destination = mobileLinks.length - 1;
          break;

        default:
          return;
      }

      event.preventDefault();
      event.stopPropagation();

      setMobileTarget(destination, {
        focus: true
      });
    });

    syncMode();

    const handleModeChange = () => {
      syncMode();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener(
        'change',
        handleModeChange
      );
    } else {
      mediaQuery.addListener(handleModeChange);
    }

    if ('ResizeObserver' in window && viewport) {
      const observer = new ResizeObserver(() => {
        updateRailState();
      });

      observer.observe(viewport);
    }

    window.addEventListener(
      'resize',
      updateRailState,
      { passive: true }
    );
  };

  const initialiseAllCategoryNavigations = () => {
    document
      .querySelectorAll('[data-category-navigation]')
      .forEach(initialiseCategoryNavigation);
  };

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

  const initialisePageControllers = () => {
    initialiseAllCategoryNavigations();

    document
      .querySelectorAll('[data-collection]')
      .forEach(initialiseRoot);
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialisePageControllers,
      { once: true }
    );
  } else {
    initialisePageControllers();
  }

  document.addEventListener(
    'shopify:section:load',
    (event) => {
      const categoryNavigation =
        event.target?.matches?.(
          '[data-category-navigation]'
        )
          ? event.target
          : event.target?.querySelector?.(
              '[data-category-navigation]'
            );

      initialiseCategoryNavigation(
        categoryNavigation
      );

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