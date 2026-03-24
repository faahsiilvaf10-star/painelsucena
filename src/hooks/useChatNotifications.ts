import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useBrowserNotifications } from "./useBrowserNotifications";
import { playSoundFile } from "@/lib/sounds";
import { toast } from "sonner";
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

          // Always show in-app toast notification
          toast(`💬 ${senderName}`, {
            description: messagePreview,
            duration: 5000,
            position: "top-right",
          });

          // Also show OS/Windows push notification (works in background AND foreground)
          showNotification(`💬 ${senderName}`, {
            body: messagePreview,
            tag: `chat-${newMessage.sender_id}-${Date.now()}`,
            icon: senderProfile?.avatar_url || "/pwa-192x192.png",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification]);
};
