/**
 * Overlay Fix Utility
 * 
 * This utility detects and fixes pointer-event blocking issues caused by
 * transparent overlays or elements that cover the viewport but shouldn't
 * intercept user interactions.
 * 
 * Problem: Large transparent elements with fixed/absolute positioning can
 * block clicks on interactive elements beneath them.
 * 
 * Solution: Automatically detect such elements and apply pointer-events: none
 * to allow clicks to pass through, while preserving pointer-events for
 * legitimate modals and overlays.
 */

class OverlayFix {
  constructor() {
    this.processedElements = new WeakMap();
    this.observer = null;
    
    // Bind methods
    this.processElement = this.processElement.bind(this);
    this.checkAndFixOverlays = this.checkAndFixOverlays.bind(this);
    this.handleMutations = this.handleMutations.bind(this);
  }

  /**
   * Initialize the overlay fix utility
   */
  init() {
    // Run initial check after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.checkAndFixOverlays());
    } else {
      this.checkAndFixOverlays();
    }

    // Set up MutationObserver to watch for DOM changes
    this.observer = new MutationObserver(this.handleMutations);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Re-check on window resize
    window.addEventListener('resize', () => {
      this.checkAndFixOverlays();
    });

    console.log('[OverlayFix] Initialized successfully');
  }

  /**
   * Handle DOM mutations
   */
  handleMutations(mutations) {
    let shouldRecheck = false;

    for (const mutation of mutations) {
      // Check if nodes were added
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            shouldRecheck = true;
          }
        });
      }

      // Check if style/class attributes changed
      if (mutation.type === 'attributes') {
        shouldRecheck = true;
      }
    }

    if (shouldRecheck) {
      // Debounce the recheck to avoid excessive processing
      clearTimeout(this.recheckTimeout);
      this.recheckTimeout = setTimeout(() => {
        this.checkAndFixOverlays();
      }, 100);
    }
  }

  /**
   * Check if element should be excluded from fixing
   */
  shouldExcludeElement(element) {
    // Exclude elements with specific classes that indicate legitimate overlays
    if (element.classList.contains('modal-overlay')) {
      return true;
    }

    // Exclude elements with data-keep-pointer attribute
    if (element.hasAttribute('data-keep-pointer')) {
      return true;
    }

    // Exclude the navbar
    if (element.classList.contains('navbar')) {
      return true;
    }

    // Exclude if parent has modal-overlay class
    if (element.closest('.modal-overlay')) {
      return true;
    }

    return false;
  }

  /**
   * Check if element is transparent/invisible
   */
  isTransparent(element, computedStyle) {
    // Check opacity
    const opacity = parseFloat(computedStyle.opacity);
    if (opacity <= 0.05) {
      return true;
    }

    // Check background color transparency
    const bgColor = computedStyle.backgroundColor;
    if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
      return true;
    }

    // Check if background color has very low alpha
    const rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const alpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
      if (alpha <= 0.05) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if element is large enough to be problematic
   */
  isLargeOverlay(element, computedStyle) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = element.getBoundingClientRect();

    // Get dimensions from computed style or bounding rect
    const width = rect.width || parseFloat(computedStyle.width);
    const height = rect.height || parseFloat(computedStyle.height);

    // Check if element covers significant portion of viewport
    const widthThreshold = viewportWidth * 0.6;  // 60% of viewport width
    const heightThreshold = viewportHeight * 0.3; // 30% of viewport height

    return width >= widthThreshold && height >= heightThreshold;
  }

  /**
   * Process a single element
   */
  processElement(element) {
    // Skip if already processed and hasn't changed
    if (this.processedElements.has(element)) {
      return;
    }

    // Skip text nodes and non-element nodes
    if (element.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    // Get computed style
    const computedStyle = window.getComputedStyle(element);
    const position = computedStyle.position;

    // Only process fixed or absolute positioned elements
    if (position !== 'fixed' && position !== 'absolute') {
      return;
    }

    // Check if element should be excluded
    if (this.shouldExcludeElement(element)) {
      return;
    }

    // Check if element is large enough to be problematic
    if (!this.isLargeOverlay(element, computedStyle)) {
      return;
    }

    // Check if element is transparent
    if (!this.isTransparent(element, computedStyle)) {
      return;
    }

    // Check if element already has pointer-events: none
    const currentPointerEvents = computedStyle.pointerEvents;
    if (currentPointerEvents === 'none') {
      this.processedElements.set(element, { originalValue: 'none' });
      return;
    }

    // Store original pointer-events value
    const originalValue = element.style.pointerEvents || computedStyle.pointerEvents;
    this.processedElements.set(element, { originalValue });

    // Apply pointer-events: none
    element.style.pointerEvents = 'none';
    
    console.log('[OverlayFix] Disabled pointer-events for element:', {
      tag: element.tagName,
      classes: element.className,
      position,
      dimensions: {
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height
      },
      originalPointerEvents: originalValue
    });
  }

  /**
   * Restore pointer-events if element becomes visible
   */
  restoreIfVisible(element) {
    const processed = this.processedElements.get(element);
    if (!processed) return;

    const computedStyle = window.getComputedStyle(element);
    
    // If element is no longer transparent, restore pointer-events
    if (!this.isTransparent(element, computedStyle)) {
      const originalValue = processed.originalValue;
      if (originalValue !== 'none') {
        element.style.pointerEvents = originalValue === 'auto' ? '' : originalValue;
        console.log('[OverlayFix] Restored pointer-events for element (now visible):', element.tagName);
      }
      this.processedElements.delete(element);
    }
  }

  /**
   * Check and fix all overlays in the document
   */
  checkAndFixOverlays() {
    // Get all fixed and absolute positioned elements
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      this.processElement(element);
      this.restoreIfVisible(element);
    });
  }

  /**
   * Cleanup and remove observer
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Restore all modified elements
    this.processedElements = new WeakMap();
    
    console.log('[OverlayFix] Destroyed');
  }
}

// Create and initialize the overlay fix utility
const overlayFix = new OverlayFix();
overlayFix.init();

// Export for potential manual control
export default overlayFix;
