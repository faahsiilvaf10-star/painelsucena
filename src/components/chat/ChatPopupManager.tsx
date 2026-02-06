import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAllUsers, UserWithStatus } from "@/hooks/useAllUsers";
import { ChatPopup } from "./ChatPopup";
import type { Tables } from "@/integrations/supabase/types";

type ChatMessage = Tables<"chat_messages">;

interface PopupChat {
  user: UserWithStatus;
  minimized: boolean;
}

interface ChatPopupManagerProps {
  onExpandChat: (user: UserWithStatus) => void;
}

export const ChatPopupManager = ({ onExpandChat }: ChatPopupManagerProps) => {
  const { user } = useAuth();
  const { allUsers } = useAllUsers();
  const [openPopups, setOpenPopups] = useState<PopupChat[]>([]);

  // Close a popup
  const closePopup = useCallback((userId: string) => {
    setOpenPopups(prev => prev.filter(p => p.user.user_id !== userId));
  }, []);

  // Expand popup to full dialog
  const handleExpand = useCallback((popupUser: UserWithStatus) => {
    closePopup(popupUser.user_id);
    onExpandChat(popupUser);
  }, [closePopup, onExpandChat]);

  // Open popup for a user (can be called externally too)
  const openPopup = useCallback((senderUser: UserWithStatus) => {
    setOpenPopups(prev => {
      // Check if already open
      if (prev.find(p => p.user.user_id === senderUser.user_id)) {
        // Just un-minimize if already open
        return prev.map(p => 
          p.user.user_id === senderUser.user_id 
            ? { ...p, minimized: false } 
            : p
        );
      }
      // Add new popup (max 3)
      const newPopups = [...prev, { user: senderUser, minimized: false }];
      if (newPopups.length > 3) {
        return newPopups.slice(-3);
      }
      return newPopups;
    });
  }, []);

  // Listen for new messages and open popup
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`chat-popup-notifications-${user.id}`)
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
          
          // Find sender in allUsers
          const senderUser = allUsers.find(u => u.user_id === newMessage.sender_id);
          
          if (senderUser) {
            openPopup(senderUser);
          } else {
            // If user not in list yet, fetch their profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", newMessage.sender_id)
              .single();
            
            if (profile) {
              const newUser: UserWithStatus = {
                id: profile.id,
                user_id: profile.user_id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                cargo: profile.cargo,
                frame_color: profile.frame_color,
                neon_color: profile.neon_color,
                frame_animation: profile.frame_animation,
                isOnline: false,
                isCurrentUser: false,
                isAdmin: false,
              };
              openPopup(newUser);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, allUsers, openPopup]);

  if (!user || openPopups.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-4 z-50 flex items-end gap-2">
      {openPopups.map((popup) => (
        <ChatPopup
          key={popup.user.user_id}
          user={popup.user}
          onClose={() => closePopup(popup.user.user_id)}
          onExpand={() => handleExpand(popup.user)}
        />
      ))}
    </div>
  );
};
