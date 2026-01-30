import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getBrazilNorthDate } from "@/lib/timezone";

/**
 * Hook that detects when midnight occurs in Brazil North timezone (Pará - UTC-4)
 * and invalidates specified query keys to refresh the data
 */
export const useMidnightRefresh = (queryKeys: string[][]) => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDateRef = useRef<string>("");

  useEffect(() => {
    const getMillisecondsUntilMidnight = (): number => {
      const now = getBrazilNorthDate();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      
      return midnight.getTime() - now.getTime();
    };

    const getCurrentDateString = (): string => {
      const now = getBrazilNorthDate();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    };

    const invalidateQueries = () => {
      console.log("[MidnightRefresh] Meia-noite detectada - atualizando dados...");
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    };

    const scheduleNextRefresh = () => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const msUntilMidnight = getMillisecondsUntilMidnight();
      console.log(`[MidnightRefresh] Próxima atualização em ${Math.round(msUntilMidnight / 1000 / 60)} minutos`);

      // Schedule the refresh at midnight
      timeoutRef.current = setTimeout(() => {
        invalidateQueries();
        // Update the last date reference
        lastDateRef.current = getCurrentDateString();
        // Schedule the next midnight refresh
        scheduleNextRefresh();
      }, msUntilMidnight);
    };

    // Check if the date changed (e.g., when returning from sleep/inactive tab)
    const checkDateChange = () => {
      const currentDate = getCurrentDateString();
      if (lastDateRef.current && lastDateRef.current !== currentDate) {
        console.log("[MidnightRefresh] Mudança de data detectada - atualizando dados...");
        invalidateQueries();
        lastDateRef.current = currentDate;
        // Reschedule for the next midnight
        scheduleNextRefresh();
      }
    };

    // Initialize
    lastDateRef.current = getCurrentDateString();
    scheduleNextRefresh();

    // Also check when the tab becomes visible (handles sleep/inactive scenarios)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkDateChange();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic check every minute to handle edge cases
    const intervalId = setInterval(checkDateChange, 60000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [queryClient, queryKeys]);
};

/**
 * Hook specifically for DDS schedule that refreshes at midnight
 */
export const useDDSMidnightRefresh = () => {
  useMidnightRefresh([
    ["dds-today"],
    ["dds-tomorrow"],
    ["dds-schedule"],
  ]);
};
