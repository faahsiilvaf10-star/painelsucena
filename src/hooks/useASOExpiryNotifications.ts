import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRHEfetivo } from "./useRHEfetivo";
import { useBrowserNotifications } from "./useBrowserNotifications";
import { useAuth } from "./useAuth";
import { getEffectiveAsoExpiry } from "@/lib/asoValidity";

const NOTIFICATION_KEY = "aso_expiry_notifications_shown";
const WINDOW_DAYS = 30;

interface ExpiringASO {
  nome: string;
  diasRestantes: number;
}

export const useASOExpiryNotifications = () => {
  const { user } = useAuth();
  const { data: rhData } = useRHEfetivo();
  const { isGranted, showNotification, requestPermission } = useBrowserNotifications();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !rhData?.colaboradores || rhData.colaboradores.length === 0) return;
    if (hasShownRef.current) return;

    // Mostrar uma vez por dia por usuário
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(`${NOTIFICATION_KEY}_${user.id}`);
    if (lastShown === today) {
      hasShownRef.current = true;
      return;
    }

    // Pede permissão na primeira vez
    if (!isGranted) {
      requestPermission();
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiring: ExpiringASO[] = [];
    const expired: ExpiringASO[] = [];

    for (const colab of rhData.colaboradores) {
      const venc = getEffectiveAsoExpiry(colab.aso, colab.admissao);
      if (!venc) continue;
      const diffDays = Math.ceil((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        expired.push({ nome: colab.nome, diasRestantes: diffDays });
      } else if (diffDays <= WINDOW_DAYS) {
        expiring.push({ nome: colab.nome, diasRestantes: diffDays });
      }
    }

    if (expired.length === 0 && expiring.length === 0) return;

    expiring.sort((a, b) => a.diasRestantes - b.diasRestantes);
    expired.sort((a, b) => a.diasRestantes - b.diasRestantes);

    let message = "";
    if (expired.length > 0 && expiring.length > 0) {
      message = `${expired.length} ASO(s) vencido(s) e ${expiring.length} a vencer em até ${WINDOW_DAYS} dias.`;
    } else if (expired.length > 0) {
      const m = expired[0];
      message =
        expired.length === 1
          ? `ASO de ${m.nome} está vencido há ${Math.abs(m.diasRestantes)} dia(s)!`
          : `${expired.length} ASOs vencidos. O mais antigo: ${m.nome}.`;
    } else {
      const m = expiring[0];
      if (expiring.length === 1) {
        if (m.diasRestantes === 0) message = `ASO de ${m.nome} vence hoje!`;
        else if (m.diasRestantes === 1) message = `ASO de ${m.nome} vence amanhã!`;
        else message = `ASO de ${m.nome} vence em ${m.diasRestantes} dias.`;
      } else {
        message = `${expiring.length} ASOs a vencer. O mais urgente: ${m.nome} (${m.diasRestantes} dias).`;
      }
    }

    // Notificação do navegador
    showNotification("🩺 Alerta de ASO", {
      body: message,
      tag: "aso-expiry",
      requireInteraction: true,
    });

    // Toast in-app (clique vai para o RH)
    toast.warning("ASOs a vencer", {
      description: message,
      duration: 8000,
      action: {
        label: "Ver RH",
        onClick: () => {
          window.location.href = "/rh";
        },
      },
    });

    localStorage.setItem(`${NOTIFICATION_KEY}_${user.id}`, today);
    hasShownRef.current = true;
  }, [user?.id, rhData, isGranted, showNotification, requestPermission]);
};
