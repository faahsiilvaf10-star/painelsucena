import { useState } from "react";
import { OnlineUsersFooter } from "@/components/chat/OnlineUsersFooter";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { OnlineUser } from "@/hooks/useOnlineUsers";
import { useAuth } from "@/hooks/useAuth";

export const PersistentFooter = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Read synchronously to avoid a 1-frame flash.
  const isTransitioning = sessionStorage.getItem("loginTransitionInProgress") === "true";

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
