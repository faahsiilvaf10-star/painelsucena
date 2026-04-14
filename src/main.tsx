import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

const PUBLISHED_APP_URL = "https://painelsucena.lovable.app";
const DESKTOP_BOOT_REFRESH_KEY = "__desktop_boot_refresh__";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

function getClientPlatform() {
  const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;
  return navigatorWithUserAgentData.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
}

function getShellInfo() {
  const isFileProtocol = window.location.protocol === "file:";
  const isElectronShell = /electron/i.test(navigator.userAgent);
  const isStandaloneDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const isDesktopPlatform = /win|mac|linux/i.test(getClientPlatform());

  return {
    isFileProtocol,
    isDesktopInstalledApp:
      isFileProtocol || isElectronShell || (isStandaloneDisplayMode && isDesktopPlatform),
  };
}

async function clearRuntimeCaches() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

function buildFreshCurrentUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("__desktop_refresh", Date.now().toString());
  return url.toString();
}

function buildPublishedDesktopUrl() {
  const url = new URL("/", PUBLISHED_APP_URL);
  url.searchParams.set("__desktop_refresh", Date.now().toString());
  return url.toString();
}

async function forceDesktopFreshLaunch() {
  const { isDesktopInstalledApp, isFileProtocol } = getShellInfo();

  if (!isDesktopInstalledApp) {
    return false;
  }

  const alreadyRefreshedThisLaunch = sessionStorage.getItem(DESKTOP_BOOT_REFRESH_KEY) === "1";
  if (alreadyRefreshedThisLaunch) {
    return false;
  }

  sessionStorage.setItem(DESKTOP_BOOT_REFRESH_KEY, "1");
  await clearRuntimeCaches();

  window.location.replace(isFileProtocol ? buildPublishedDesktopUrl() : buildFreshCurrentUrl());
  return true;
}

const { isDesktopInstalledApp } = getShellInfo();
const noopUpdateSW = async (_reloadPage?: boolean) => {};

const updateSW = isDesktopInstalledApp
  ? noopUpdateSW
  : registerSW({
      immediate: true,
      onNeedRefresh() {
        showUpdateBanner();
      },
      onOfflineReady() {
        console.log("App pronto para uso offline");
      },
      onRegistered(registration) {
        console.log("Service Worker registrado:", registration);

        if (!registration) {
          return;
        }

        const checkForUpdates = () => {
          if (navigator.onLine) {
            registration.update().catch((error) => {
              console.error("Erro ao buscar atualização do app:", error);
            });
          }
        };

        checkForUpdates();
        setInterval(checkForUpdates, 2 * 60 * 1000);

        window.addEventListener("focus", checkForUpdates);
        window.addEventListener("online", checkForUpdates);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            checkForUpdates();
          }
        });

        if ("periodicSync" in registration) {
          (registration as ServiceWorkerRegistration & {
            periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
          }).periodicSync
            .register("content-sync", {
              minInterval: 12 * 60 * 60 * 1000,
            })
            .catch((err: Error) => console.log("Periodic sync não suportado:", err));
        }

        if ("sync" in registration) {
          (registration as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> };
          }).sync
            .register("pending-sync")
            .catch((err: Error) => console.log("Background sync não suportado:", err));
        }
      },
      onRegisterError(error) {
        console.error("Erro ao registrar Service Worker:", error);
      },
    });

function showUpdateBanner() {
  if (document.getElementById("update-banner")) {
    return;
  }

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
    if (countdownEl) {
      countdownEl.textContent = String(seconds);
    }

    if (seconds <= 0) {
      clearInterval(timer);
      clearCachesAndReload();
    }
  }, 1000);
}

async function clearCachesAndReload() {
  try {
    await clearRuntimeCaches();
    await updateSW(true);
  } catch (error) {
    console.error("Erro ao limpar cache:", error);
  }

  window.location.replace(buildFreshCurrentUrl());
}

async function bootstrap() {
  try {
    const redirected = await forceDesktopFreshLaunch();
    if (redirected) {
      return;
    }
  } catch (error) {
    console.error("Erro ao preparar atualização do app desktop:", error);
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
