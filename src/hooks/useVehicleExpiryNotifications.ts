import { useEffect, useRef } from "react";
import { useVehicleInspections, DATE_FIELDS } from "./useVehicleInspections";
import { useBrowserNotifications } from "./useBrowserNotifications";
import { useAuth } from "./useAuth";
import { parseISO, isValid, isBefore, addDays, differenceInDays } from "date-fns";

const NOTIFICATION_KEY = "vehicle_expiry_notifications_shown";

interface ExpiryInfo {
  placa: string;
  fieldLabel: string;
  date: Date;
  daysUntilExpiry: number;
}

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

    // Collect all expiring/expired items
    const expiredItems: ExpiryInfo[] = [];
    const expiringItems: ExpiryInfo[] = [];

    vehicles.forEach((vehicle) => {
      DATE_FIELDS.forEach((field) => {
        const dateStr = vehicle[field.key];
        if (!dateStr) return;

        try {
          const date = parseISO(dateStr);
          if (!isValid(date)) return;

          const daysUntilExpiry = differenceInDays(date, now);
          const info: ExpiryInfo = {
            placa: vehicle.placa,
            fieldLabel: field.label,
            date,
            daysUntilExpiry,
          };

          if (isBefore(date, now)) {
            expiredItems.push(info);
          } else if (isBefore(date, warningDate)) {
            expiringItems.push(info);
          }
        } catch {
          // Skip invalid dates
        }
      });
    });

    const totalAlerts = expiredItems.length + expiringItems.length;

    if (totalAlerts === 0) return;

    let message = "";
    
    if (expiredItems.length > 0 && expiringItems.length > 0) {
      message = `${expiredItems.length} documento(s) vencido(s) e ${expiringItems.length} vencendo em até 15 dias.`;
    } else if (expiredItems.length > 0) {
      if (expiredItems.length === 1) {
        message = `${expiredItems[0].fieldLabel} do veículo ${expiredItems[0].placa} está vencido!`;
      } else {
        message = `${expiredItems.length} documentos vencidos!`;
      }
    } else if (expiringItems.length > 0) {
      // Sort by closest expiry
      const sorted = [...expiringItems].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
      const mostUrgent = sorted[0];
      
      if (expiringItems.length === 1) {
        if (mostUrgent.daysUntilExpiry === 0) {
          message = `${mostUrgent.fieldLabel} do veículo ${mostUrgent.placa} vence hoje!`;
        } else if (mostUrgent.daysUntilExpiry === 1) {
          message = `${mostUrgent.fieldLabel} do veículo ${mostUrgent.placa} vence amanhã!`;
        } else {
          message = `${mostUrgent.fieldLabel} do veículo ${mostUrgent.placa} vence em ${mostUrgent.daysUntilExpiry} dias.`;
        }
      } else {
        message = `${expiringItems.length} documentos vencendo. O mais urgente: ${mostUrgent.fieldLabel} - ${mostUrgent.placa}.`;
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
