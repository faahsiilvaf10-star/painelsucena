import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useBrowserNotifications } from "./useBrowserNotifications";
import { playSoundFile } from "@/lib/sounds";
import type { Tables } from "@/integrations/supabase/types";

type ChatMessage = Tables<"chat_messages">;

export const useChatNotifications = () => {
  const { user } = useAuth();
  const { showNotification, requestPermission, isGranted } = useBrowserNotifications();
  const lastNotifiedIdRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (!isGranted) {
      requestPermission();
    }
  }, [isGranted, requestPermission]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to all messages for the current user
    const channel = supabase
      .channel(`global-chat-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Skip if we already notified about this message
          if (newMessage.id === lastNotifiedIdRef.current) return;
          lastNotifiedIdRef.current = newMessage.id;

          // Get sender profile
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", newMessage.sender_id)
            .single();

          const senderName = senderProfile?.full_name || "Alguém";
          const messagePreview = newMessage.content 
            ? newMessage.content.substring(0, 100) + (newMessage.content.length > 100 ? "..." : "")
            : "📷 Enviou uma imagem";

          // Play sound
          playSoundFile("/sounds/msn-chat.mp3");

          // Show push notification if page is in background
          showNotification(`💬 ${senderName}`, {
            body: messagePreview,
            tag: `chat-${newMessage.sender_id}`,
            icon: senderProfile?.avatar_url || "/favicon.ico",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification]);
};
