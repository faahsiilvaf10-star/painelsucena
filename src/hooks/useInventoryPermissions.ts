import { useProfile } from "./useProfile";
import { useIsAdmin } from "./useUserRole";

export const useInventoryPermissions = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  const isLoading = profileLoading || adminLoading;

  // Aux administrativo and Admin can edit Estoque
  const canEditInventory = isAdmin || profile?.cargo === "aux_administrativo";

  return {
    canEditInventory,
    isLoading,
  };
};
