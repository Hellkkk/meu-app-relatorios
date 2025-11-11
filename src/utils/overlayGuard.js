/**
 * Overlay Guard Utility
 * 
 * This utility detects and neutralizes large transparent elements that might
 * intercept pointer events, causing click issues in the UI.
 * 
 * It adds a data-auto-overlay-clean attribute to large, transparent, static
 * elements (>70% of viewport) to disable their pointer events.
 */

export function applyOverlayGuard() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewportArea = vw * vh;
  const threshold = 0.7; // 70% of viewport

  // Query all div elements
  document.querySelectorAll('div').forEach(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const elementArea = rect.width * rect.height;

    // Check if element meets criteria for neutralization:
    // 1. Static positioning (not fixed/absolute/relative with content)
    // 2. Fully transparent background
    // 3. Large area (>70% of viewport)
    // 4. Positioned in visible viewport area
    // 5. NOT a modal-overlay (which needs pointer events)
    const isStatic = style.position === 'static';
    const isTransparent = style.backgroundColor === 'rgba(0, 0, 0, 0)';
    const isLarge = elementArea > viewportArea * threshold;
    const isInViewport = rect.top < vh * 0.8;
    const isNotModalOverlay = !el.classList.contains('modal-overlay');

    if (isStatic && isTransparent && isLarge && isInViewport && isNotModalOverlay) {
      // Mark element for pointer-events: none
      el.setAttribute('data-auto-overlay-clean', '');
    } else {
      // Remove attribute if element no longer meets criteria
      el.removeAttribute('data-auto-overlay-clean');
    }
  });
}

/**
 * Setup automatic overlay guard on DOM changes
 * Call this once during app initialization
 */
export function setupOverlayGuard() {
  // Run immediately
  applyOverlayGuard();

  // Run after DOM changes (with debouncing)
  let timeoutId;
  const observer = new MutationObserver(() => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(applyOverlayGuard, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });

  // Run on window resize
  window.addEventListener('resize', () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(applyOverlayGuard, 100);
  });

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', applyOverlayGuard);
  };
}
