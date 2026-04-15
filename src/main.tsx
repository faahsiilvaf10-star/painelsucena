import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const PREVIEW_CACHE_RESET_KEY = "preview-sw-reset-attempts";
const MAX_PREVIEW_CACHE_RESET_ATTEMPTS = 3;

type PreviewResetResult = {
  hadCaches: boolean;
  hadController: boolean;
  hadRegistrations: boolean;
  remainingCaches: number;
  remainingRegistrations: number;
};

function isPreviewHost() {
  return window.location.hostname.includes("id-preview--");
}

function isEmbeddedPreview() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function shouldDisableServiceWorker() {
  return import.meta.env.DEV || isPreviewHost() || isEmbeddedPreview();
}

function getPreviewCacheResetAttempts() {
  const rawValue = sessionStorage.getItem(PREVIEW_CACHE_RESET_KEY);
  const attempts = Number.parseInt(rawValue ?? "0", 10);

  return Number.isFinite(attempts) ? attempts : 0;
}

function setPreviewCacheResetAttempts(attempts: number) {
  sessionStorage.setItem(PREVIEW_CACHE_RESET_KEY, String(attempts));
}

function clearPreviewCacheResetAttempts() {
  sessionStorage.removeItem(PREVIEW_CACHE_RESET_KEY);
}

function getPreviewReloadUrl(attempt: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("preview-bust", `${Date.now()}`);
  url.searchParams.set("preview-reset-attempt", String(attempt));
  return url.toString();
}

async function resetPreviewCaches(): Promise<PreviewResetResult> {
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

const APP_BUILD_VERSION = __APP_BUILD_VERSION__;
const VERSION_STORAGE_KEY = "app-build-version";

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

function isDesktopPWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as any).standalone === true
  );
}

async function forceFullCacheReset(): Promise<boolean> {
  let cleared = false;
  if ("caches" in window) {
    const keys = await caches.keys();
    if (keys.length > 0) {
      await Promise.all(keys.map((k) => caches.delete(k)));
      cleared = true;
    }
  }
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs.length > 0) {
      await Promise.all(regs.map((r) => r.unregister()));
      cleared = true;
    }
  }
  return cleared;
}

function checkVersionAndReset(): boolean {
  const stored = localStorage.getItem(VERSION_STORAGE_KEY);
  if (stored !== APP_BUILD_VERSION) {
    console.log(`Nova versão detectada: ${stored} → ${APP_BUILD_VERSION}. Limpando cache...`);
    localStorage.setItem(VERSION_STORAGE_KEY, APP_BUILD_VERSION);
    return true; // version changed
  }
  return false;
}

function registerAppServiceWorker() {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateBanner();
    },
    onOfflineReady() {
      console.log("App pronto para uso offline");
    },
    onRegistered(registration) {
      console.log("Service Worker registrado:", registration);
      if (!registration) return;

      const checkForUpdates = () => {
        if (navigator.onLine) {
          registration.update().catch((e) => console.error("Erro ao buscar atualização:", e));
        }
      };

      checkForUpdates();
      setInterval(checkForUpdates, 2 * 60 * 1000);

      window.addEventListener("focus", checkForUpdates);
      window.addEventListener("online", checkForUpdates);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdates();
      });

      if ("periodicSync" in registration) {
        (registration as any).periodicSync
          .register("content-sync", { minInterval: 12 * 60 * 60 * 1000 })
          .catch((err: Error) => console.log("Periodic sync não suportado:", err));
      }

      if ("sync" in registration) {
        (registration as any).sync
          .register("pending-sync")
          .catch((err: Error) => console.log("Background sync não suportado:", err));
      }
    },
    onRegisterError(error) {
      console.error("Erro ao registrar Service Worker:", error);
    },
  });
}

function showUpdateBanner() {
  if (document.getElementById("update-banner")) return;

  const banner = document.createElement("div");
  banner.id = "update-banner";
  banner.innerHTML = `
    <div style="
      position:fixed;top:0;left:0;right:0;z-index:99999;
      background:linear-gradient(135deg,#16a34a,#059669);
      color:#fff;padding:14px 20px;
      display:flex;align-items:center;justify-content:center;gap:10px;
      font-family:system-ui,sans-serif;font-size:14px;font-weight:600;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
      animation:slideDown .4s ease-out;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M16 21h5v-5"/>
      </svg>
      <span>Nova versão disponível! Atualizando em <span id="update-countdown">3</span>s...</span>
    </div>
    <style>
      @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    </style>
  `;
  document.body.appendChild(banner);

  let seconds = 3;
  const countdownEl = document.getElementById("update-countdown");
  const timer = setInterval(() => {
    seconds -= 1;
    if (countdownEl) countdownEl.textContent = String(seconds);
    if (seconds <= 0) {
      clearInterval(timer);
      clearCachesAndReload();
    }
  }, 1000);
}

async function clearCachesAndReload() {
  try {
    // Clear all Cache Storage
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    // Activate new SW
    if (updateSW) {
      await updateSW(true);
    }
  } catch (e) {
    console.error("Erro ao limpar cache:", e);
  }
  window.location.reload();
}

async function bootstrap() {
  // Desktop PWA / .exe: force full cache reset on new version
  const versionChanged = checkVersionAndReset();

  if (versionChanged && (isDesktopPWA() || !shouldDisableServiceWorker())) {
    showUpdateBanner();
    await forceFullCacheReset();
    // Re-register SW after clearing
    registerAppServiceWorker();
    return; // clearCachesAndReload will handle the reload via banner countdown
  }

  if (shouldDisableServiceWorker()) {
    const resetResult = await resetPreviewCaches();
    const hasPreviewArtifacts = resetResult.hadController || resetResult.hadRegistrations || resetResult.hadCaches;
    const resetAttempts = getPreviewCacheResetAttempts();

    if (hasPreviewArtifacts && resetAttempts < MAX_PREVIEW_CACHE_RESET_ATTEMPTS) {
      const nextAttempt = resetAttempts + 1;
      setPreviewCacheResetAttempts(nextAttempt);
      console.log(
        `Preview detectado: removendo cache e Service Worker antigos (tentativa ${nextAttempt}/${MAX_PREVIEW_CACHE_RESET_ATTEMPTS}).`,
        resetResult,
      );
      window.location.replace(getPreviewReloadUrl(nextAttempt));
      return;
    }

    clearPreviewCacheResetAttempts();

    if (hasPreviewArtifacts) {
      console.warn("Preview detectado: resquícios de cache antigo persistiram após as tentativas de limpeza.", resetResult);
    } else {
      console.log("Preview detectado: Service Worker desativado e cache limpo para evitar versão antiga.", resetResult);
    }
  } else {
    clearPreviewCacheResetAttempts();
    registerAppServiceWorker();
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
