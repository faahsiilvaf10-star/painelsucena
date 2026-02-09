import { createContext, useContext, ReactNode, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";

interface VisualizadorContextType {
  isVisualizador: boolean;
  isLoading: boolean;
}

const VisualizadorContext = createContext<VisualizadorContextType>({
  isVisualizador: false,
  isLoading: true,
});

export const useVisualizadorContext = () => useContext(VisualizadorContext);

export const VisualizadorProvider = ({ children }: { children: ReactNode }) => {
  const { data: profile, isLoading } = useProfile();

  const value = useMemo(() => ({
    isVisualizador: profile?.cargo === "visualizador",
    isLoading,
  }), [profile?.cargo, isLoading]);

  return (
    <VisualizadorContext.Provider value={value}>
      {children}
    </VisualizadorContext.Provider>
  );
};
