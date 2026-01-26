import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const SESSION_TIMEOUT_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
const WARNING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes before expiry
const SESSION_START_KEY = "session_start_time_persistent"; // Using localStorage for persistence

export const useSessionTimeout = () => {
  const { session, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const renewSession = useCallback(() => {
    // Reset the session start time to now
    localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    
    // Clear existing timeout and set a new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, SESSION_TIMEOUT_MS);
  }, []);

  const isInWarningPeriod = useCallback((): boolean => {
    if (!session) return false;
    
    const sessionStartTime = localStorage.getItem(SESSION_START_KEY);
    if (!sessionStartTime) return false;

    const startTime = parseInt(sessionStartTime, 10);
    const elapsed = Date.now() - startTime;
    const remaining = SESSION_TIMEOUT_MS - elapsed;

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
    const remaining = SESSION_TIMEOUT_MS - elapsed;

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
    const remaining = SESSION_TIMEOUT_MS - elapsed;

    return Math.max(0, Math.floor(remaining / 60000)); // Convert to minutes
  }, [session]);

  return { getRemainingTime, renewSession, isInWarningPeriod };
};
