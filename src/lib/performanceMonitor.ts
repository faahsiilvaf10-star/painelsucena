/**
 * Performance monitoring utility
 * Tracks Web Vitals, long tasks, and resource loading
 */

const PERF_LOG_PREFIX = "[Perf]";

// Track long tasks (>50ms) that block the main thread
export function observeLongTasks() {
  if (!("PerformanceObserver" in window)) return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
          console.warn(`${PERF_LOG_PREFIX} Long task: ${Math.round(entry.duration)}ms`, entry);
        }
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    // longtask not supported
  }
}

// Track Largest Contentful Paint
export function observeLCP() {
  if (!("PerformanceObserver" in window)) return;
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        console.log(`${PERF_LOG_PREFIX} LCP: ${Math.round(last.startTime)}ms`);
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
}

// Track First Input Delay
export function observeFID() {
  if (!("PerformanceObserver" in window)) return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = (entry as any).processingStart - entry.startTime;
        if (fid > 100) {
          console.warn(`${PERF_LOG_PREFIX} High FID: ${Math.round(fid)}ms`);
        }
      }
    });
    observer.observe({ type: "first-input", buffered: true });
  } catch {}
}

// Track Cumulative Layout Shift
export function observeCLS() {
  if (!("PerformanceObserver" in window)) return;
  let clsValue = 0;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });

    // Report CLS after page is likely stable
    setTimeout(() => {
      if (clsValue > 0.1) {
        console.warn(`${PERF_LOG_PREFIX} High CLS: ${clsValue.toFixed(3)}`);
      }
    }, 10000);
  } catch {}
}

// Track failed resource loads
export function observeResourceErrors() {
  window.addEventListener("error", (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === "IMG" || target.tagName === "SCRIPT" || target.tagName === "LINK")) {
      console.error(`${PERF_LOG_PREFIX} Resource failed:`, (target as any).src || (target as any).href);
    }
  }, true);
}

// Log navigation timing
export function logNavigationTiming() {
  if (!("performance" in window) || !performance.getEntriesByType) return;

  window.addEventListener("load", () => {
    requestIdleCallback?.(() => {
      const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (!nav) return;

      console.log(`${PERF_LOG_PREFIX} Timing:`, {
        dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: Math.round(nav.connectEnd - nav.connectStart),
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
      });
    }) ?? setTimeout(() => {
      const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (!nav) return;
      console.log(`${PERF_LOG_PREFIX} Timing:`, {
        dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: Math.round(nav.connectEnd - nav.connectStart),
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
      });
    }, 2000);
  });
}

// Initialize all performance monitoring
export function initPerformanceMonitoring() {
  if (import.meta.env.DEV) return; // Only in production

  observeLongTasks();
  observeLCP();
  observeFID();
  observeCLS();
  observeResourceErrors();
  logNavigationTiming();

  console.log(`${PERF_LOG_PREFIX} Monitoring initialized`);
}
