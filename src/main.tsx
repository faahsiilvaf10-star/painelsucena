import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// ===== FORCE CACHE BUST (v2026-04-14-b) =====
const APP_VERSION = "2026-04-14-b";
const LAST_VERSION_KEY = "app_last_version";

(async () => {
  try {
    const lastVersion = localStorage.getItem(LAST_VERSION_KEY);
    const needsFullClear = lastVersion !== APP_VERSION;

    // Clear all Cache Storage
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // Unregister all existing service workers to force fresh install
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // If version changed, do a hard reload once
    if (needsFullClear) {
      localStorage.setItem(LAST_VERSION_KEY, APP_VERSION);
      // Clear sessionStorage too
      sessionStorage.clear();
      console.log(`[UPDATE] Versão atualizada para ${APP_VERSION}, recarregando...`);
      window.location.reload();
      return;
    }
  } catch (e) {
    console.warn("Cache cleanup on boot:", e);
  }
})();

// Register Service Worker for PWA/offline support
const updateSW = registerSW({
  onNeedRefresh() {
    showUpdateBanner();
  },
  onOfflineReady() {
    console.log("App pronto para uso offline");
  },
  onRegistered(registration) {
    console.log("Service Worker registrado:", registration);

    if (registration) {
      // Check for updates every 2 minutes when online
      setInterval(() => {
        if (navigator.onLine) {
          registration.update();
        }
      }, 2 * 60 * 1000);

      // Register Periodic Background Sync
      if ('periodicSync' in registration) {
        (registration as any).periodicSync.register('content-sync', {
          minInterval: 12 * 60 * 60 * 1000,
        }).catch((err: Error) => console.log('Periodic sync não suportado:', err));
      }

      // Register Background Sync
      if ('sync' in registration) {
        (registration as any).sync.register('pending-sync')
          .catch((err: Error) => console.log('Background sync não suportado:', err));
      }
    }
  },
  onRegisterError(error) {
    console.error("Erro ao registrar Service Worker:", error);
  },
});

function showUpdateBanner() {
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
    seconds--;
    if (countdownEl) countdownEl.textContent = String(seconds);
    if (seconds <= 0) {
      clearInterval(timer);
      clearCachesAndReload();
    }
  }, 1000);
}

async function clearCachesAndReload() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await updateSW(true);
  } catch (e) {
    console.error("Erro ao limpar cache:", e);
  }
  window.location.reload();
}

createRoot(document.getElementById("root")!).render(<App />);
