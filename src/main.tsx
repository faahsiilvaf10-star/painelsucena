import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceMonitoring } from "@/lib/performanceMonitor";
import {
  MAX_PREVIEW_CACHE_RESET_ATTEMPTS,
  checkVersionAndReset,
  clearClientCaches,
  clearPreviewCacheResetAttempts,
  getCacheBustedUrl,
  getPreviewCacheResetAttempts,
  markPreviewDocumentFresh,
  setPreviewCacheResetAttempts,
  shouldDisableServiceWorker,
  shouldForcePreviewDocumentReload,
} from "@/lib/appRefresh";

// Flag to suppress controllerchange reload right after we register
let justRegisteredSW = false;

function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  justRegisteredSW = true;
  setTimeout(() => { justRegisteredSW = false; }, 5000);

  navigator.serviceWorker.register("/app-runtime-sw.js").then((registration) => {
    console.log("Service Worker registrado:", registration);
    if (!registration) return;

    const checkForUpdates = () => {
      if (navigator.onLine) {
        registration.update().catch((e) => console.error("Erro ao buscar atualização:", e));
      }
    };

    // Check for updates periodically
    setInterval(checkForUpdates, 2 * 60 * 1000);
    window.addEventListener("focus", checkForUpdates);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdates();
    });

    // Listen for waiting SW
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New SW waiting — show update banner
          showUpdateBanner();
        }
      });
    });
  }).catch((error) => {
    console.error("Erro ao registrar Service Worker:", error);
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
      window.location.reload();
    }
  }, 1000);
}

function listenForControllerChange() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Suppress reload if we just registered the SW ourselves
    if (justRegisteredSW) {
      console.log("SW controller changed (initial registration) — não recarregando.");
      return;
    }
    console.log("Novo Service Worker ativado — recarregando...");
    window.location.reload();
  });
}

async function bootstrap() {
  const versionChanged = checkVersionAndReset();

  if (shouldDisableServiceWorker()) {
    const resetResult = await clearClientCaches();
    const hasPreviewArtifacts = resetResult.hadController || resetResult.hadRegistrations || resetResult.hadCaches;
    const resetAttempts = getPreviewCacheResetAttempts();
    const shouldReloadDocument = shouldForcePreviewDocumentReload();

    if ((hasPreviewArtifacts || shouldReloadDocument) && resetAttempts < MAX_PREVIEW_CACHE_RESET_ATTEMPTS) {
      const nextAttempt = resetAttempts + 1;
      setPreviewCacheResetAttempts(nextAttempt);
      markPreviewDocumentFresh();
      console.log(
        `Preview detectado: forçando atualização limpa (tentativa ${nextAttempt}/${MAX_PREVIEW_CACHE_RESET_ATTEMPTS}).`,
        { ...resetResult, shouldReloadDocument },
      );
      window.location.replace(getCacheBustedUrl({ "preview-reset-attempt": nextAttempt }));
      return;
    }

    clearPreviewCacheResetAttempts();
    markPreviewDocumentFresh();
  } else {
    clearPreviewCacheResetAttempts();
    listenForControllerChange();
    registerAppServiceWorker();

    if (versionChanged) {
      // Clear old caches on version change but don't re-register
      await clearClientCaches();
    }
  }

  // Initialize performance monitoring
  initPerformanceMonitoring();

  // Render the app
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
