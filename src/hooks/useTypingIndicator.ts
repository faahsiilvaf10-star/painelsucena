import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useTypingIndicator = (otherUserId: string | null) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Subscribe to typing events from the other user
  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const channelName = `typing-${[user.id, otherUserId].sort().join("-")}`;
    
    const channel = supabase.channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === otherUserId) {
          setIsOtherTyping(true);
          
          // Clear existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Set timeout to hide typing indicator after 3 seconds
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        if (payload.payload.userId === otherUserId) {
          setIsOtherTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id, otherUserId]);

  // Broadcast typing event (debounced)
  const sendTypingEvent = useCallback(() => {
    if (!user?.id || !otherUserId) return;

    const now = Date.now();
    // Only send typing event every 2 seconds
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;

    const channelName = `typing-${[user.id, otherUserId].sort().join("-")}`;
    
    supabase.channel(channelName).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
  }, [user?.id, otherUserId]);

  // Broadcast stop typing event
  const sendStopTypingEvent = useCallback(() => {
    if (!user?.id || !otherUserId) return;

    const channelName = `typing-${[user.id, otherUserId].sort().join("-")}`;
    
    supabase.channel(channelName).send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId: user.id },
    });
  }, [user?.id, otherUserId]);

  return {
    isOtherTyping,
    sendTypingEvent,
    sendStopTypingEvent,
  };
};
