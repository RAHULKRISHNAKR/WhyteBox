/**
 * Accessibility Utilities
 * 
 * Helper functions for WCAG 2.1 AA compliance
 */

/**
 * Calculate color contrast ratio between two colors
 * WCAG 2.1 Success Criterion 1.4.3 (Contrast Minimum)
 * 
 * @param color1 - First color in hex format (#RRGGBB)
 * @param color2 - Second color in hex format (#RRGGBB)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Calculate relative luminance
    const [rs, gs, bs] = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 * 
 * @param foreground - Foreground color in hex format
 * @param background - Background color in hex format
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether contrast meets WCAG AA standards
 */
export function meetsContrastAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Check if color contrast meets WCAG AAA standards
 * 
 * @param foreground - Foreground color in hex format
 * @param background - Background color in hex format
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether contrast meets WCAG AAA standards
 */
export function meetsContrastAAA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 4.5 : 7;
  return ratio >= requiredRatio;
}

/**
 * Generate unique ID for ARIA attributes
 * 
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all focusable elements within a container
 * 
 * @param container - Container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  
  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  ).filter((el) => {
    // Filter out hidden elements
    return el.offsetParent !== null;
  });
}

/**
 * Trap focus within a container
 * 
 * @param container - Container element
 * @param event - Keyboard event
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Announce message to screen readers
 * 
 * @param message - Message to announce
 * @param priority - Priority level ('polite' or 'assertive')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is visible to screen readers
 * 
 * @param element - Element to check
 * @returns Whether element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  // Check aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  
  // Check display and visibility
  const styles = window.getComputedStyle(element);
  if (styles.display === 'none' || styles.visibility === 'hidden') {
    return false;
  }
  
  // Check if element is off-screen (but still accessible)
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    // Could be visually hidden but accessible
    return true;
  }
  
  return true;
}

/**
 * Get accessible name for an element
 * 
 * @param element - Element to get name for
 * @returns Accessible name
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent || '';
  }
  
  // Check associated label
  if (element instanceof HTMLInputElement) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent || '';
  }
  
  // Check title
  const title = element.getAttribute('title');
  if (title) return title;
  
  // Check alt text for images
  if (element instanceof HTMLImageElement) {
    return element.alt;
  }
  
  // Fallback to text content
  return element.textContent || '';
}

/**
 * Validate ARIA attributes
 * 
 * @param element - Element to validate
 * @returns Array of validation errors
 */
export function validateAriaAttributes(element: HTMLElement): string[] {
  const errors: string[] = [];
  
  // Check for required ARIA attributes based on role
  const role = element.getAttribute('role');
  if (role) {
    const requiredAttrs: Record<string, string[]> = {
      checkbox: ['aria-checked'],
      radio: ['aria-checked'],
      slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      spinbutton: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      progressbar: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      tab: ['aria-selected'],
      tabpanel: ['aria-labelledby'],
      combobox: ['aria-expanded'],
      listbox: ['aria-labelledby'],
    };
    
    const required = requiredAttrs[role];
    if (required) {
      required.forEach((attr) => {
        if (!element.hasAttribute(attr)) {
          errors.push(`Missing required attribute ${attr} for role ${role}`);
        }
      });
    }
  }
  
  // Check for invalid ARIA attribute values
  const ariaChecked = element.getAttribute('aria-checked');
  if (ariaChecked && !['true', 'false', 'mixed'].includes(ariaChecked)) {
    errors.push(`Invalid aria-checked value: ${ariaChecked}`);
  }
  
  const ariaExpanded = element.getAttribute('aria-expanded');
  if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
    errors.push(`Invalid aria-expanded value: ${ariaExpanded}`);
  }
  
  return errors;
}

/**
 * Check if keyboard navigation is properly implemented
 * 
 * @param container - Container to check
 * @returns Array of keyboard navigation issues
 */
export function checkKeyboardNavigation(container: HTMLElement): string[] {
  const issues: string[] = [];
  
  // Check for positive tabindex values
  const positiveTabindex = container.querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])');
  if (positiveTabindex.length > 0) {
    issues.push(`Found ${positiveTabindex.length} elements with positive tabindex values`);
  }
  
  // Check for interactive elements without keyboard support
  const interactiveElements = container.querySelectorAll('[onclick], [onmousedown], [onmouseup]');
  interactiveElements.forEach((el) => {
    if (!el.hasAttribute('onkeydown') && !el.hasAttribute('onkeyup') && !el.hasAttribute('onkeypress')) {
      issues.push(`Interactive element without keyboard support: ${el.tagName}`);
    }
  });
  
  return issues;
}

// Made with Bob
