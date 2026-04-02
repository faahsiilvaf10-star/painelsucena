import { createContext, useContext, useState, ReactNode } from "react";
import { useIsAdmin } from "@/hooks/useUserRole";

interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  canEdit: boolean; // true if user is admin or moderator
}

const EditModeContext = createContext<EditModeContextType>({
  isEditMode: false,
  toggleEditMode: () => {},
  canEdit: false,
});

export const useEditMode = () => useContext(EditModeContext);

export const EditModeProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useIsAdmin();
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = () => {
    if (isAdmin) setIsEditMode((prev) => !prev);
  };

  return (
    <EditModeContext.Provider value={{ isEditMode: isAdmin && isEditMode, toggleEditMode, canEdit: isAdmin }}>
      {children}
    </EditModeContext.Provider>
  );
};
