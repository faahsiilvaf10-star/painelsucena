import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { installEnvironmentHeader } from "@/lib/environmentHeader";

// Injeta o header x-environment em toda chamada ao Supabase
installEnvironmentHeader();

// Limpeza de segurança para transições de login presas
if (typeof window !== "undefined") {
  try {
    const isTransitioning = sessionStorage.getItem("loginTransitionInProgress") === "true";
    const onAuthPage = window.location.pathname === "/auth";
    
    // Se estiver na página de auth, sempre limpamos a transição para evitar tela branca
    if (onAuthPage || isTransitioning) {
      const start = sessionStorage.getItem("loginTransitionStartTime");
      const now = Date.now();
      
      if (onAuthPage || !start || (now - Number(start) > 10000)) {
        console.warn("Limpando transição de login por segurança");
        sessionStorage.removeItem("loginTransitionInProgress");
        sessionStorage.removeItem("loginTransitionStage");
        sessionStorage.removeItem("loginTransitionPayload");
        sessionStorage.removeItem("loginTransitionStartTime");
      } else if (!start) {
        sessionStorage.setItem("loginTransitionStartTime", now.toString());
      }
    }
  } catch (e) {
    console.error("Erro na limpeza de segurança:", e);
  }
}

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
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erro crítico na renderização inicial:", error);
    rootElement.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #ef4444;">Ops! O sistema não pôde iniciar</h1>
          <p style="color: #666;">Houve um erro técnico que impediu o carregamento da página.</p>
          <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer;">
            Limpar tudo e tentar novamente
          </button>
        </div>
      </div>
    `;
  }
} else {
  console.error("Elemento root não encontrado");
}
