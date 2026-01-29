import { useProfile } from "./useProfile";
import { useIsAdmin } from "./useUserRole";

export const useRHPermissions = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = profileLoading || adminLoading;

  // Aux administrativo and Admin can edit RH page
  const canEditRH = isAdmin || profile?.cargo === "aux_administrativo";

  return {
    canEditRH,
    isLoading,
  };
};
