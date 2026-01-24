import { useState, useEffect } from "react";
import { OnlineUsersFooter } from "@/components/chat/OnlineUsersFooter";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { OnlineUser } from "@/hooks/useOnlineUsers";
import { useAuth } from "@/hooks/useAuth";

export const PersistentFooter = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check if login transition is in progress
  useEffect(() => {
    const checkTransition = () => {
      const transitioning = sessionStorage.getItem("loginTransitionInProgress") === "true";
      setIsTransitioning(transitioning);
    };

    checkTransition();

    // Poll for transition state changes
    const interval = setInterval(checkTransition, 50);
    return () => clearInterval(interval);
  }, []);

  const handleUserClick = (onlineUser: OnlineUser) => {
    setSelectedUser(onlineUser);
    setChatOpen(true);
  };

  // Hide during transition to prevent flash
  if (!user || isTransitioning) return null;

  return (
    <>
      <OnlineUsersFooter onUserClick={handleUserClick} />
      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        selectedUser={selectedUser}
      />
    </>
  );
};
