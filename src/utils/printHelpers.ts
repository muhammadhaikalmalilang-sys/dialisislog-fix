/**
 * Print & PDF Export Utility Helpers for DialisisLog
 * Standardized for KARS & PERNEFRI accreditation documentation.
 * Supports dynamic page orientation (Portrait / Landscape), custom PDF suggested filenames,
 * and backdrop isolation for modal printing.
 */

export interface PrintOptions {
  isLandscape?: boolean;
  documentTitle?: string;
  isModal?: boolean;
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function printDocumentWithOrientation(
  isLandscape: boolean = false,
  documentTitle?: string,
  isModal: boolean = false
): void {
  if (typeof window === 'undefined') return;

  const styleId = 'dialysis-print-orientation-style';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Dynamic @page size and margins
  styleEl.innerHTML = `
    @page {
      size: A4 ${isLandscape ? 'landscape' : 'portrait'} !important;
      margin: ${isLandscape ? '5mm 4mm' : '7mm 6mm'} !important;
    }
  `;

  // Apply printing helper classes to body
  const bodyClasses = document.body.classList;
  bodyClasses.add('dialysis-printing');
  if (isLandscape) {
    bodyClasses.add('dialysis-landscape');
    bodyClasses.remove('dialysis-portrait');
  } else {
    bodyClasses.add('dialysis-portrait');
    bodyClasses.remove('dialysis-landscape');
  }

  if (isModal) {
    bodyClasses.add('dialysis-modal-printing');
  }

  // Save current title and temporarily set custom title for suggested PDF file name in browser
  const originalTitle = document.title;
  if (documentTitle) {
    const sanitizedTitle = documentTitle
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .trim();
    document.title = sanitizedTitle;
  }

  const cleanup = () => {
    bodyClasses.remove('dialysis-printing', 'dialysis-landscape', 'dialysis-portrait', 'dialysis-modal-printing');
    if (documentTitle) {
      document.title = originalTitle;
    }
    const el = document.getElementById(styleId);
    if (el) el.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  // Use requestAnimationFrame to ensure all DOM updates and layout reflows complete before print dialog
  requestAnimationFrame(() => {
    setTimeout(() => {
      let isBlocked = false;
      try {
        window.focus();
        window.print();
        // If in iframe, broadcast trigger event so UI can provide helpful guidance if dialog doesn't appear
        if (isRunningInIframe()) {
          window.dispatchEvent(
            new CustomEvent('dialysis_print_in_iframe_attempted', {
              detail: { documentTitle }
            })
          );
        }
      } catch (err) {
        isBlocked = true;
        console.warn('Print trigger blocked or failed:', err);
        cleanup();
        window.dispatchEvent(
          new CustomEvent('dialysis_print_blocked', {
            detail: {
              error: err instanceof Error ? err.message : String(err),
              documentTitle
            }
          })
        );
      }
      // Fallback cleanup in case afterprint does not fire
      if (!isBlocked) {
        setTimeout(cleanup, 4000);
      }
    }, 80);
  });
}
