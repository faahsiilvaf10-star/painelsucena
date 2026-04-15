export const PREVIEW_CACHE_RESET_KEY = "preview-sw-reset-attempts";
export const MAX_PREVIEW_CACHE_RESET_ATTEMPTS = 3;

const PREVIEW_DOCUMENT_VERSION_KEY = "preview-document-version";
const VERSION_STORAGE_KEY = "app-build-version";
const BUILD_VERSION = __APP_BUILD_VERSION__;

export type CacheResetResult = {
  hadCaches: boolean;
  hadController: boolean;
  hadRegistrations: boolean;
  remainingCaches: number;
  remainingRegistrations: number;
};

export function isPreviewHost() {
  return window.location.hostname.includes("id-preview--");
}

export function isEmbeddedPreview() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function shouldDisableServiceWorker() {
  return import.meta.env.DEV || isPreviewHost() || isEmbeddedPreview();
}

export function getPreviewCacheResetAttempts() {
  const rawValue = sessionStorage.getItem(PREVIEW_CACHE_RESET_KEY);
  const attempts = Number.parseInt(rawValue ?? "0", 10);

  return Number.isFinite(attempts) ? attempts : 0;
}

export function setPreviewCacheResetAttempts(attempts: number) {
  sessionStorage.setItem(PREVIEW_CACHE_RESET_KEY, String(attempts));
}

export function clearPreviewCacheResetAttempts() {
  sessionStorage.removeItem(PREVIEW_CACHE_RESET_KEY);
}

export function shouldForcePreviewDocumentReload() {
  return sessionStorage.getItem(PREVIEW_DOCUMENT_VERSION_KEY) !== BUILD_VERSION;
}

export function markPreviewDocumentFresh() {
  sessionStorage.setItem(PREVIEW_DOCUMENT_VERSION_KEY, BUILD_VERSION);
}

export function getCacheBustedUrl(extraSearchParams: Record<string, string | number> = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("preview-bust", `${Date.now()}`);
  url.searchParams.set("app-build", BUILD_VERSION);

  Object.entries(extraSearchParams).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export function checkVersionAndReset(): boolean {
  const stored = localStorage.getItem(VERSION_STORAGE_KEY);

  if (stored !== BUILD_VERSION) {
    console.log(`Nova versão detectada: ${stored} → ${BUILD_VERSION}. Limpando cache...`);
    localStorage.setItem(VERSION_STORAGE_KEY, BUILD_VERSION);
    return true;
  }

  return false;
}

export async function clearClientCaches(): Promise<CacheResetResult> {
  const hadController = "serviceWorker" in navigator && Boolean(navigator.serviceWorker.controller);
  let hadRegistrations = false;
  let remainingRegistrations = 0;
  let hadCaches = false;
  let remainingCaches = 0;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    hadRegistrations = registrations.length > 0;

    if (hadRegistrations) {
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }

    remainingRegistrations = (await navigator.serviceWorker.getRegistrations()).length;
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    hadCaches = keys.length > 0;

    if (hadCaches) {
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    }

    remainingCaches = (await caches.keys()).length;
  }

  return {
    hadCaches,
    hadController,
    hadRegistrations,
    remainingCaches,
    remainingRegistrations,
  };
}

function clearVisualCacheKeys() {
  const keysToRemove: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && (key.startsWith("theme") || key.startsWith("sidebar") || key.startsWith("vite-"))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export async function hardRefreshToLatest(options: { clearVisualState?: boolean } = {}) {
  await clearClientCaches();

  if (options.clearVisualState) {
    clearVisualCacheKeys();
  }

  clearPreviewCacheResetAttempts();
  markPreviewDocumentFresh();
  window.location.replace(getCacheBustedUrl());
}