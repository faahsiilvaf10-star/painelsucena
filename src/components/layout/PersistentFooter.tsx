import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { OnlineUsersFooter } from "@/components/chat/OnlineUsersFooter";
import { ChatPopupManager, ChatPopupManagerHandle } from "@/components/chat/ChatPopupManager";
import { UserWithStatus } from "@/hooks/useAllUsers";
import { useAuth } from "@/hooks/useAuth";
import { RightUsersSidebar } from "./RightUsersSidebar";

export const PersistentFooter = () => {
  const { user } = useAuth();
  const location = useLocation();
  const popupManagerRef = useRef<ChatPopupManagerHandle>(null);
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);

  const isDriverPage = ["/painel-motorista", "/registro-movimento-motorista", "/selecao-veiculo", "/equipamentos-motorista", "/relatorios-motorista", "/pontos-abastecimento"].includes(location.pathname);

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
    popupManagerRef.current?.openPopup(userClicked);
  };

  if (!user || isDriverPage) return null;

  return (
    <div className={justCompletedTransition ? "animate-fade-in" : ""}>
      <OnlineUsersFooter onUserClick={handleUserClick} />
      <ChatPopupManager ref={popupManagerRef} />
      <RightUsersSidebar onUserClick={handleUserClick} />
    </div>
  );
};
