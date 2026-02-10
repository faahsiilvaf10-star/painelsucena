import { useEffect } from "react";
import { getTomorrowHoliday } from "@/data/hydroCalendar2026";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STORAGE_KEY = "holiday-notification-shown";

export function useHolidayNotification() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const tomorrowHoliday = getTomorrowHoliday();
    if (!tomorrowHoliday) return;

    // Only show once per holiday
    const shown = localStorage.getItem(STORAGE_KEY);
    if (shown === tomorrowHoliday.date) return;

    // Show notification after a short delay so UI is ready
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, tomorrowHoliday.date);

      toast.info(
        `🎉 Amanhã é ${tomorrowHoliday.label}! Aproveite o feriado e descanse bem! 🥳`,
        {
          duration: 15000,
          id: "holiday-notification",
          description: "Curta o feriado com quem você ama! ❤️",
          style: {
            background: "hsl(var(--primary) / 0.1)",
            border: "1px solid hsl(var(--primary) / 0.3)",
          },
        }
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);
}
