import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getBrazilNorthDate } from "@/lib/timezone";

/**
 * Hook that detects when midnight occurs in Pará timezone (UTC-3)
 * and invalidates specified query keys to refresh the data.
 * Also returns the current date to force component re-renders.
 */
export const useMidnightRefresh = (queryKeys: string[][]) => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDateRef = useRef<string>("");
  const [dateKey, setDateKey] = useState(0); // Force re-render trigger

  const getCurrentDateString = useCallback((): string => {
    const now = getBrazilNorthDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const getMillisecondsUntilMidnight = useCallback((): number => {
    const brazilNorthNow = getBrazilNorthDate();
    
    // Calculate time remaining until midnight (00:00:00.000)
    const hoursLeft = 23 - brazilNorthNow.getHours();
    const minutesLeft = 59 - brazilNorthNow.getMinutes();
    const secondsLeft = 59 - brazilNorthNow.getSeconds();
    const msLeft = 1000 - brazilNorthNow.getMilliseconds();
    
    return (hoursLeft * 3600 + minutesLeft * 60 + secondsLeft) * 1000 + msLeft;
  }, []);

  const invalidateQueries = useCallback(() => {
    console.log("[MidnightRefresh] Meia-noite detectada - atualizando dados...");
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
    // Trigger re-render to update date-dependent components
    setDateKey((prev) => prev + 1);
  }, [queryClient, queryKeys]);

  const scheduleNextRefresh = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const msUntilMidnight = getMillisecondsUntilMidnight();
    const minutesUntilMidnight = Math.round(msUntilMidnight / 1000 / 60);
    console.log(`[MidnightRefresh] Próxima atualização em ${minutesUntilMidnight} minutos`);

    // Schedule the refresh at midnight
    timeoutRef.current = setTimeout(() => {
      invalidateQueries();
      // Update the last date reference
      lastDateRef.current = getCurrentDateString();
      // Schedule the next midnight refresh
      scheduleNextRefresh();
    }, msUntilMidnight + 1000); // Add 1 second buffer to ensure we're past midnight
  }, [getMillisecondsUntilMidnight, invalidateQueries, getCurrentDateString]);

  const checkDateChange = useCallback(() => {
    const currentDate = getCurrentDateString();
    if (lastDateRef.current && lastDateRef.current !== currentDate) {
      console.log("[MidnightRefresh] Mudança de data detectada - atualizando dados...");
      invalidateQueries();
      lastDateRef.current = currentDate;
      // Reschedule for the next midnight
      scheduleNextRefresh();
    }
  }, [getCurrentDateString, invalidateQueries, scheduleNextRefresh]);

  useEffect(() => {
    // Initialize
    lastDateRef.current = getCurrentDateString();
    scheduleNextRefresh();

    // Check when the tab becomes visible (handles sleep/inactive scenarios)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkDateChange();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic check every 30 seconds to handle edge cases
    intervalRef.current = setInterval(checkDateChange, 30000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [getCurrentDateString, scheduleNextRefresh, checkDateChange]);

  return dateKey;
};

/**
 * Hook specifically for DDS schedule that refreshes at midnight
 */
export const useDDSMidnightRefresh = () => {
  return useMidnightRefresh([
    ["dds-today"],
    ["dds-tomorrow"],
    ["dds-schedule"],
  ]);
};
