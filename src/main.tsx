import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { installEnvironmentHeader } from "@/lib/environmentHeader";

// Injeta o header x-environment em toda chamada ao Supabase
installEnvironmentHeader();

// Register SW for PWA support (only in production-like environments)
if (typeof window !== "undefined" && !window.location.hostname.includes("lovableproject.com")) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.log("App pronto para uso offline");
    },
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Elemento root não encontrado");
}
