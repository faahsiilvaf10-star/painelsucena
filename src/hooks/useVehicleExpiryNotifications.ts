import { useEffect, useRef } from "react";
import { useVehicleInspections } from "./useVehicleInspections";
import { useBrowserNotifications } from "./useBrowserNotifications";
import { useAuth } from "./useAuth";
import { parseISO, isValid, isBefore, addDays, differenceInDays } from "date-fns";

const NOTIFICATION_KEY = "vehicle_expiry_notifications_shown";

export const useVehicleExpiryNotifications = () => {
  const { user } = useAuth();
  const { data: vehicles } = useVehicleInspections();
  const { isGranted, showNotification, requestPermission } = useBrowserNotifications();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !vehicles || vehicles.length === 0 || hasShownRef.current) {
      return;
    }

    // Check if we've already shown notifications today
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(`${NOTIFICATION_KEY}_${user.id}`);
    
    if (lastShown === today) {
      hasShownRef.current = true;
      return;
    }

    // Request permission if not granted
    if (!isGranted) {
      requestPermission();
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const warningDate = addDays(now, 15);

    // Find expired vehicles
    const expiredVehicles = vehicles.filter((v) => {
      if (!v.validade_cracha) return false;
      try {
        const date = parseISO(v.validade_cracha);
        if (!isValid(date)) return false;
        return isBefore(date, now);
      } catch {
        return false;
      }
    });

    // Find vehicles expiring within 15 days
    const expiringVehicles = vehicles.filter((v) => {
      if (!v.validade_cracha) return false;
      try {
        const date = parseISO(v.validade_cracha);
        if (!isValid(date)) return false;
        return !isBefore(date, now) && isBefore(date, warningDate);
      } catch {
        return false;
      }
    });

    const totalAlerts = expiredVehicles.length + expiringVehicles.length;

    if (totalAlerts === 0) return;

    let message = "";
    
    if (expiredVehicles.length > 0 && expiringVehicles.length > 0) {
      message = `${expiredVehicles.length} crachá(s) vencido(s) e ${expiringVehicles.length} vencendo em até 15 dias.`;
    } else if (expiredVehicles.length > 0) {
      if (expiredVehicles.length === 1) {
        message = `O crachá do veículo ${expiredVehicles[0].placa} está vencido!`;
      } else {
        message = `${expiredVehicles.length} veículos com crachá vencido!`;
      }
    } else if (expiringVehicles.length > 0) {
      // Sort by closest expiry
      const sorted = [...expiringVehicles].sort((a, b) => {
        const dateA = parseISO(a.validade_cracha);
        const dateB = parseISO(b.validade_cracha);
        return dateA.getTime() - dateB.getTime();
      });
      
      const mostUrgent = sorted[0];
      const days = differenceInDays(parseISO(mostUrgent.validade_cracha), now);
      
      if (expiringVehicles.length === 1) {
        if (days === 0) {
          message = `O crachá do veículo ${mostUrgent.placa} vence hoje!`;
        } else if (days === 1) {
          message = `O crachá do veículo ${mostUrgent.placa} vence amanhã!`;
        } else {
          message = `O crachá do veículo ${mostUrgent.placa} vence em ${days} dias.`;
        }
      } else {
        message = `${expiringVehicles.length} veículos com crachá vencendo. O mais urgente é ${mostUrgent.placa}.`;
      }
    }

    if (message) {
      showNotification("🚗 Alerta de Vistoria", {
        body: message,
        tag: "vehicle-expiry",
        requireInteraction: true,
      });

      // Mark as shown for today
      localStorage.setItem(`${NOTIFICATION_KEY}_${user.id}`, today);
      hasShownRef.current = true;
    }
  }, [user?.id, vehicles, isGranted, showNotification, requestPermission]);
};
