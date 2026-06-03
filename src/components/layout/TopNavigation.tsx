import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useUserNavOrder } from "@/hooks/useUserNavOrder";
import { useNavVisibilityRules } from "@/hooks/useNavVisibilityRules";
import {
  Users, LayoutDashboard, FileText, Presentation, Warehouse, 
  Settings, ShieldCheck, Bell, Newspaper, Leaf, Shield, Target, AlertTriangle, FolderLock, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  isEmergency?: boolean;
  restrictedTo?: string[];
  hiddenFrom?: string[];
}

const allNavItems: NavItem[] = [
  { id: "destaques", icon: LayoutDashboard, label: "DESTAQUES", path: "/" },
  { id: "equipamentos", icon: Settings, label: "EQUIPAMENTOS", path: "/equipamentos" },
  { id: "lembretes", icon: Bell, label: "LEMBRETES", path: "/lembretes" },
  { id: "rh-hub", icon: Users, label: "RH", path: "/recursos-humanos" },
  { id: "rdo-hub", icon: FileText, label: "RDO", path: "/relatorio-diario-obra" },
  { id: "arquivos-seguranca", icon: FolderLock, label: "DOCUMENTOS", path: "/arquivos-seguranca" },
  { id: "instacena", icon: Newspaper, label: "INSTACENA", path: "/instacena" },
  { id: "meio-ambiente", icon: Leaf, label: "MEIO AMBIENTE", path: "/meio-ambiente" },
  { id: "seguranca", icon: Shield, label: "SEGURANÇA", path: "/seguranca" },
  { id: "almoxarifado", icon: Warehouse, label: "ALMOXARIFADO", path: "/almoxarifado" },
  { id: "planejamento", icon: Target, label: "PLANEJAMENTO", path: "/planejamento" },
  { id: "emergencia", icon: AlertTriangle, label: "EMERGÊNCIA", path: "/emergencia", isEmergency: true },
];

export const TopNavigation = () => {
  const location = useLocation();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { navOrder } = useUserNavOrder();
  const { settings } = useSiteSettings();
  const { getHiddenItemsForCargo } = useNavVisibilityRules();
  const [isLoginTransitioning, setIsLoginTransitioning] = React.useState(
    () => sessionStorage.getItem("loginTransitionInProgress") === "true"
  );

  React.useEffect(() => {
    const handler = () => {
      setIsLoginTransitioning(sessionStorage.getItem("loginTransitionInProgress") === "true");
    };
    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, []);


  const effectiveNavOrder = useMemo(() => {
    if (isAdmin) {
      return Array.isArray(settings?.nav_order) && settings.nav_order.length > 0
        ? settings.nav_order : navOrder;
    }
    return navOrder;
  }, [isAdmin, navOrder, settings?.nav_order]);

  const visibleNavItems = useMemo(() => {
    const dynamicHiddenItems = profile?.cargo ? getHiddenItemsForCargo(profile.cargo) : [];
    return allNavItems.filter(item => {
      if (isAdmin) return true;
      if (dynamicHiddenItems.includes(item.id)) return false;
      if (item.hiddenFrom && profile?.cargo && item.hiddenFrom.includes(profile.cargo)) return false;
      if (!item.restrictedTo) return true;
      return profile?.cargo ? item.restrictedTo.includes(profile.cargo) : false;
    });
  }, [isAdmin, profile?.cargo, getHiddenItemsForCargo]);

  const orderedNavItems = useMemo(() => {
    if (!effectiveNavOrder || effectiveNavOrder.length === 0) return visibleNavItems;
    const ordered: NavItem[] = [];
    effectiveNavOrder.forEach((id: string) => {
      const item = visibleNavItems.find(nav => nav.id === id);
      if (item) ordered.push(item);
    });
    visibleNavItems.forEach(item => {
      if (!ordered.find(o => o.id === item.id)) ordered.push(item);
    });
    return ordered;
  }, [effectiveNavOrder, visibleNavItems]);

  if (isLoginTransitioning) return null;

  return (

    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl max-w-[95vw] overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 px-1">
        {orderedNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "px-4 py-2 rounded-full text-[10px] font-bold tracking-[0.1em] transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
                isActive 
                  ? "bg-white/15 text-white shadow-inner" 
                  : item.isEmergency 
                    ? "text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                    : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {item.label}
              {isActive && <item.icon className={cn("w-3 h-3", item.isEmergency ? "text-red-500 animate-pulse" : "text-white/70")} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
