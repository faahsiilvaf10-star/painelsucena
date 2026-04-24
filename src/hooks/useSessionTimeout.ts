import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const DEFAULT_SESSION_HOURS = 5;
const WARNING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes before expiry
const SESSION_START_KEY = "session_start_time_persistent";
const SESSION_DURATION_KEY = "session_duration_hours";

// Driver roles that should have persistent sessions (no timeout)
const DRIVER_ROLES = ['motorista_pipa', 'motorista_munk'];

const getSessionTimeoutMs = (): number => {
  const storedHours = localStorage.getItem(SESSION_DURATION_KEY);
  const hours = storedHours ? parseInt(storedHours, 10) : DEFAULT_SESSION_HOURS;
  return hours * 60 * 60 * 1000;
};

export const useSessionTimeout = () => {
  const { user, session, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionDurationHours, setSessionDurationHours] = useState<number>(DEFAULT_SESSION_HOURS);
  const [isDriverUser, setIsDriverUser] = useState<boolean>(false);

  // Check if user is a driver (should have persistent session)
  useEffect(() => {
    const checkIfDriver = async () => {
      if (!user) {
        setIsDriverUser(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("cargo")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.cargo && DRIVER_ROLES.includes(data.cargo)) {
          setIsDriverUser(true);
          // Clear any existing timeout for drivers
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          console.log("[SessionTimeout] Driver detected - persistent session enabled");
        } else {
          setIsDriverUser(false);
        }
      } catch (error) {
        console.error("Error checking driver status:", error);
        setIsDriverUser(false);
      }
    };

    checkIfDriver();
  }, [user]);

  // Fetch user's session duration preference (only for non-drivers)
  useEffect(() => {
    const fetchSessionDuration = async () => {
      if (!user || isDriverUser) return;

      try {
        const { data } = await supabase
          .from("user_preferences")
          .select("session_duration_hours")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.session_duration_hours) {
          setSessionDurationHours(data.session_duration_hours);
          localStorage.setItem(SESSION_DURATION_KEY, data.session_duration_hours.toString());
        }
      } catch (error) {
        console.error("Error fetching session duration:", error);
      }
    };

    fetchSessionDuration();
  }, [user, isDriverUser]);

  // Listen for session duration changes (only for non-drivers)
  useEffect(() => {
    if (isDriverUser) return; // Skip for drivers
    
    const handleDurationChange = () => {
      const newHours = parseInt(localStorage.getItem(SESSION_DURATION_KEY) || DEFAULT_SESSION_HOURS.toString(), 10);
      setSessionDurationHours(newHours);
      
      // Recalculate timeout with new duration
      if (session) {
        const sessionStartTime = localStorage.getItem(SESSION_START_KEY);
        if (sessionStartTime) {
          const startTime = parseInt(sessionStartTime, 10);
          const elapsed = Date.now() - startTime;
          const newTimeoutMs = newHours * 60 * 60 * 1000;
          const remaining = newTimeoutMs - elapsed;

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          if (remaining <= 0) {
            handleAutoLogout();
          } else {
            timeoutRef.current = setTimeout(() => {
              handleAutoLogout();
            }, remaining);
          }
        }
      }
    };

    window.addEventListener("session-duration-changed", handleDurationChange);
    return () => window.removeEventListener("session-duration-changed", handleDurationChange);
  }, [session, isDriverUser]);

  const renewSession = useCallback(() => {
    // Reset the session start time to now
    localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    
    // Clear existing timeout and set a new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const timeoutMs = getSessionTimeoutMs();
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, timeoutMs);
  }, []);

  const isInWarningPeriod = useCallback((): boolean => {
    if (!session) return false;
    
    const sessionStartTime = localStorage.getItem(SESSION_START_KEY);
    if (!sessionStartTime) return false;

    const startTime = parseInt(sessionStartTime, 10);
    const elapsed = Date.now() - startTime;
    const timeoutMs = getSessionTimeoutMs();
    const remaining = timeoutMs - elapsed;

    return remaining > 0 && remaining <= WARNING_THRESHOLD_MS;
  }, [session]);

  const handleAutoLogout = async () => {
    // Store logout reason for the transition
    sessionStorage.setItem("logoutReason", "session_timeout");
    
    // Get user info for transition
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", session?.user?.id || "")
      .single();

    const userName = profile?.full_name || "Usuário";
    const userAvatar = profile?.avatar_url || "";

    // Trigger logout transition
    sessionStorage.setItem("logoutTransitionInProgress", "true");
    sessionStorage.setItem(
      "logoutTransitionPayload",
      JSON.stringify({ 
        userName, 
        userAvatar,
        reason: "timeout"
      })
    );
    window.dispatchEvent(new Event("logout-transition"));

    // Clear session start time
    localStorage.removeItem(SESSION_START_KEY);

    // Sign out
    await signOut();
  };

  // Driver 22:00 nightly auto-logout
  useEffect(() => {
    if (!isDriverUser || !session) return;

    const scheduleNightlyLogout = () => {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(22, 0, 0, 0);
      // If already past 22:00 today, schedule for now (immediate logout)
      if (now >= cutoff) {
        console.log("[SessionTimeout] Past 22:00 — logging out driver now");
        handleAutoLogout();
        return null;
      }
      const ms = cutoff.getTime() - now.getTime();
      console.log(`[SessionTimeout] Driver logout scheduled in ${Math.round(ms / 60000)} min (22:00)`);
      return setTimeout(() => handleAutoLogout(), ms);
    };

    const tid = scheduleNightlyLogout();

    return () => { if (tid) clearTimeout(tid); };
  }, [isDriverUser, session]);

  useEffect(() => {
    // Skip timeout logic for drivers - they use the nightly 22:00 logout above
    if (isDriverUser) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (!session) {
      localStorage.removeItem(SESSION_START_KEY);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    let sessionStartTime = localStorage.getItem(SESSION_START_KEY);
    
    if (!sessionStartTime) {
      sessionStartTime = Date.now().toString();
      localStorage.setItem(SESSION_START_KEY, sessionStartTime);
    }

    const startTime = parseInt(sessionStartTime, 10);
    const elapsed = Date.now() - startTime;
    const timeoutMs = getSessionTimeoutMs();
    const remaining = timeoutMs - elapsed;

    if (remaining <= 0) {
      handleAutoLogout();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [session, isDriverUser]);

  // Get remaining session time in minutes (null for drivers = infinite)
  const getRemainingTime = useCallback((): number | null => {
    // Drivers have infinite session
    if (isDriverUser) return null;
    
    if (!session) return null;
    
    const sessionStartTime = localStorage.getItem(SESSION_START_KEY);
    if (!sessionStartTime) return null;

    const startTime = parseInt(sessionStartTime, 10);
    const elapsed = Date.now() - startTime;
    const timeoutMs = getSessionTimeoutMs();
    const remaining = timeoutMs - elapsed;

    return Math.max(0, Math.floor(remaining / 60000)); // Convert to minutes
  }, [session, isDriverUser]);

  return { getRemainingTime, renewSession, isInWarningPeriod, sessionDurationHours, isDriverUser };
};
