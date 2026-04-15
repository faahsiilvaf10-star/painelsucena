import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
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

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

function isDesktopPWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as any).standalone === true
  );
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
    await clearClientCaches();

    if (updateSW) {
      await updateSW(true);
    }
  } catch (e) {
    console.error("Erro ao limpar cache:", e);
  }

  window.location.replace(getCacheBustedUrl());
}

async function bootstrap() {
  const versionChanged = checkVersionAndReset();

  if (versionChanged && (isDesktopPWA() || !shouldDisableServiceWorker())) {
    showUpdateBanner();
    await clearClientCaches();
    registerAppServiceWorker();
    return;
  }

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

    if (hasPreviewArtifacts) {
      console.warn("Preview detectado: resquícios de cache antigo persistiram após as tentativas de limpeza.", resetResult);
    } else if (shouldReloadDocument) {
      console.log("Preview detectado: documento recarregado com cache-busting para evitar versão antiga.", resetResult);
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
