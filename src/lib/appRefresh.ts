export const PREVIEW_CACHE_RESET_KEY = "preview-sw-reset-attempts";
export const MAX_PREVIEW_CACHE_RESET_ATTEMPTS = 3;

const PREVIEW_DOCUMENT_VERSION_KEY = "preview-document-version";
const VERSION_STORAGE_KEY = "app-build-version";
const ELECTRON_REFRESH_GUARD_KEY = "electron-version-refresh-guard";
const ELECTRON_REFRESH_GUARD_TTL_MS = 15_000;
const BUILD_VERSION = __APP_BUILD_VERSION__;
const PREVIEW_HOST_FRAGMENTS = ["id-preview--", "lovableproject.com"];
export const ELECTRON_VERSION_POLL_INTERVAL_MS = 5_000;

export type CacheResetResult = {
  hadCaches: boolean;
  hadController: boolean;
  hadRegistrations: boolean;
  remainingCaches: number;
  remainingRegistrations: number;
};

export function isPreviewHost() {
  const hostname = window.location.hostname.toLowerCase();

  return PREVIEW_HOST_FRAGMENTS.some((fragment) => hostname.includes(fragment));
}

export function isEmbeddedPreview() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isElectronRuntime() {
  const searchParams = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent.toLowerCase();
  const navigatorWithBrands = navigator as Navigator & {
    userAgentData?: {
      brands?: Array<{ brand: string; version: string }>;
    };
  };
  const runtimeProcess = (globalThis as typeof globalThis & {
    process?: {
      versions?: Record<string, string | undefined>;
    };
  }).process;

  return Boolean(
    searchParams.get("desktop-shell") === "electron" ||
    runtimeProcess?.versions?.electron ||
      userAgent.includes(" electron/") ||
      navigatorWithBrands.userAgentData?.brands?.some((brand) => brand.brand.toLowerCase().includes("electron")),
  );
}

export function shouldDisableServiceWorker() {
  return import.meta.env.DEV || isPreviewHost() || isEmbeddedPreview() || isElectronRuntime();
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

function getElectronRefreshGuard() {
  const rawValue = sessionStorage.getItem(ELECTRON_REFRESH_GUARD_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      expiresAt?: number;
      target?: string;
    };

    if (!parsed.target || typeof parsed.expiresAt !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearElectronRefreshGuard() {
  sessionStorage.removeItem(ELECTRON_REFRESH_GUARD_KEY);
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

/**
 * Fetches the live index.html from the server (bypassing SW/browser cache)
 * and extracts the embedded build version to compare against the running one.
 * Returns the server version string if different, or null if up-to-date.
 */
export async function checkServerVersion(): Promise<string | null> {
  try {
    const url = new URL("/index.html", window.location.origin);
    url.searchParams.set("preview-version-probe", `${Date.now()}`);

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" },
    });
    if (!res.ok) return null;

    const html = await res.text();

    const serverScriptMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
    const currentScript = Array.from(document.querySelectorAll("script[src]"))
      .map((script) => script.getAttribute("src") || "")
      .map((src) => {
        try {
          return new URL(src, window.location.origin).pathname;
        } catch {
          return src;
        }
      })
      .find((src) => src.startsWith("/assets/") && src.endsWith(".js"));

    if (serverScriptMatch?.[1] && currentScript && serverScriptMatch[1] !== currentScript) {
      return serverScriptMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

export async function refreshIfDocumentStale(trigger = "runtime-check"): Promise<boolean> {
  const serverVersionMismatch = await checkServerVersion();

  if (!serverVersionMismatch) {
    clearElectronRefreshGuard();
    return false;
  }

  if (isElectronRuntime()) {
    const refreshGuard = getElectronRefreshGuard();

    if (refreshGuard && refreshGuard.target === serverVersionMismatch && refreshGuard.expiresAt > Date.now()) {
      return false;
    }

    sessionStorage.setItem(
      ELECTRON_REFRESH_GUARD_KEY,
      JSON.stringify({
        target: serverVersionMismatch,
        expiresAt: Date.now() + ELECTRON_REFRESH_GUARD_TTL_MS,
      }),
    );
  }

  console.log(`Nova build detectada (${trigger}) — recarregando aplicação...`, { serverVersionMismatch });
  await clearClientCaches();
  clearPreviewCacheResetAttempts();
  markPreviewDocumentFresh();
  window.location.replace(
    getCacheBustedUrl({
      "server-build": serverVersionMismatch,
      "update-trigger": trigger,
    }),
  );

  return true;
}

/**
 * Listens for SW controller changes (new SW activated) and forces a clean reload.
 */
export function listenForControllerChange() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // A new SW took control — reload to get fresh assets
    console.log("Novo Service Worker ativado — recarregando...");
    window.location.replace(getCacheBustedUrl());
  });
}