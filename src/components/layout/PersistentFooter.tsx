import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { OnlineUsersFooter } from "@/components/chat/OnlineUsersFooter";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { ChatPopupManager } from "@/components/chat/ChatPopupManager";
import { UserWithStatus } from "@/hooks/useAllUsers";
import { useAuth } from "@/hooks/useAuth";

export const PersistentFooter = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);

  // Hide footer on driver pages
  const isDriverPage = ["/painel-motorista", "/registro-movimento-motorista"].includes(location.pathname);

  // Listen for transition completion to trigger fade-in
  useEffect(() => {
    const handler = () => {
      const isActive = sessionStorage.getItem("loginTransitionInProgress") === "true";
      if (!isActive && user) {
        setJustCompletedTransition(true);
        const timeout = setTimeout(() => setJustCompletedTransition(false), 600);
        return () => clearTimeout(timeout);
      }
    };

    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, [user]);

  const handleUserClick = (userClicked: UserWithStatus) => {
    setSelectedUser(userClicked);
    setChatOpen(true);
  };

  const handleExpandFromPopup = (popupUser: UserWithStatus) => {
    setSelectedUser(popupUser);
    setChatOpen(true);
  };

  // Hide footer if no user or on driver pages
  if (!user || isDriverPage) return null;

  return (
    <div className={justCompletedTransition ? "animate-fade-in" : ""}>
      <OnlineUsersFooter onUserClick={handleUserClick} />
      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        selectedUser={selectedUser}
      />
      <ChatPopupManager onExpandChat={handleExpandFromPopup} />
    </div>
  );
};
