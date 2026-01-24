import { useState } from "react";
import { OnlineUsersFooter } from "@/components/chat/OnlineUsersFooter";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { OnlineUser } from "@/hooks/useOnlineUsers";
import { useAuth } from "@/hooks/useAuth";

export const PersistentFooter = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleUserClick = (onlineUser: OnlineUser) => {
    setSelectedUser(onlineUser);
    setChatOpen(true);
  };

  if (!user) return null;

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
