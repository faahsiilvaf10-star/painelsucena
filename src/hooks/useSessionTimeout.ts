import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const DEFAULT_SESSION_HOURS = 5;
const WARNING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes before expiry
const SESSION_START_KEY = "session_start_time_persistent";
const SESSION_DURATION_KEY = "session_duration_hours";

const getSessionTimeoutMs = (): number => {
  const storedHours = localStorage.getItem(SESSION_DURATION_KEY);
  const hours = storedHours ? parseInt(storedHours, 10) : DEFAULT_SESSION_HOURS;
  return hours * 60 * 60 * 1000;
};

export const useSessionTimeout = () => {
  const { user, session, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionDurationHours, setSessionDurationHours] = useState<number>(DEFAULT_SESSION_HOURS);

  // Fetch user's session duration preference
  useEffect(() => {
    const fetchSessionDuration = async () => {
      if (!user) return;

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
  }, [user]);

  // Listen for session duration changes
  useEffect(() => {
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
  }, [session]);

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

  useEffect(() => {
    if (!session) {
      // Clear session start time when logged out
      localStorage.removeItem(SESSION_START_KEY);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Get or set session start time (persists across browser closes)
    let sessionStartTime = localStorage.getItem(SESSION_START_KEY);
    
    if (!sessionStartTime) {
      sessionStartTime = Date.now().toString();
      localStorage.setItem(SESSION_START_KEY, sessionStartTime);
    }

    const startTime = parseInt(sessionStartTime, 10);
    const elapsed = Date.now() - startTime;
    const timeoutMs = getSessionTimeoutMs();
    const remaining = timeoutMs - elapsed;

    // If already exceeded, logout immediately
    if (remaining <= 0) {
      handleAutoLogout();
      return;
    }

    // Set timeout for remaining time
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [session]);

  // Get remaining session time in minutes
  const getRemainingTime = useCallback((): number | null => {
    if (!session) return null;
    
    const sessionStartTime = localStorage.getItem(SESSION_START_KEY);
    if (!sessionStartTime) return null;

    const startTime = parseInt(sessionStartTime, 10);
    const elapsed = Date.now() - startTime;
    const timeoutMs = getSessionTimeoutMs();
    const remaining = timeoutMs - elapsed;

    return Math.max(0, Math.floor(remaining / 60000)); // Convert to minutes
  }, [session]);

  return { getRemainingTime, renewSession, isInWarningPeriod, sessionDurationHours };
};
