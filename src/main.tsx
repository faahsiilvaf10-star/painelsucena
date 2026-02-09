// App entry point
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA/offline support on mobile
const updateSW = registerSW({
  onNeedRefresh() {
    // New content available, prompt user to refresh
    if (confirm("Nova versão disponível! Deseja atualizar?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App pronto para uso offline");
  },
  onRegistered(registration) {
    console.log("Service Worker registrado:", registration);
    
    // Check for updates every 5 minutes when online
    if (registration) {
      setInterval(() => {
        if (navigator.onLine) {
          registration.update();
        }
      }, 5 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error("Erro ao registrar Service Worker:", error);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
