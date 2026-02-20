import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA/offline support
const updateSW = registerSW({
  onNeedRefresh() {
    // New version available — show brief toast then auto-reload clearing cache
    showUpdateBanner();
  },
  onOfflineReady() {
    console.log("App pronto para uso offline");
  },
  onRegistered(registration) {
    console.log("Service Worker registrado:", registration);

    // Check for updates every 2 minutes when online
    if (registration) {
      setInterval(() => {
        if (navigator.onLine) {
          registration.update();
        }
      }, 2 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error("Erro ao registrar Service Worker:", error);
  },
});

/**
 * Shows an update banner, clears all caches, and auto-reloads after 3 seconds.
 */
function showUpdateBanner() {
  // Create the banner element
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

  // Countdown and auto-reload
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

/**
 * Clears all browser caches (Cache API + SW) then hard reloads.
 */
async function clearCachesAndReload() {
  try {
    // Clear all Cache Storage entries
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // Tell the SW to activate the new version
    await updateSW(true);
  } catch (e) {
    console.error("Erro ao limpar cache:", e);
  }

  // Force hard reload (bypass cache)
  window.location.reload();
}

createRoot(document.getElementById("root")!).render(<App />);
