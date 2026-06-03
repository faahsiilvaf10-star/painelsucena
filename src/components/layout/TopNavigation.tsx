import React, { useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useUserNavOrder } from "@/hooks/useUserNavOrder";
import { useNavVisibilityRules } from "@/hooks/useNavVisibilityRules";
import {
  Users, ClipboardList, Grid3X3, LayoutDashboard, FileBarChart,
  Sun, Truck, Bell, FileText, Heart, ShoppingCart,
  Package, FolderOpen, ShieldCheck, Leaf, Hammer, ClipboardCheck,
  BadgeCheck, Link2, ArrowLeftRight, Clock, FolderLock, Droplets,
  Wrench, Presentation, Newspaper, HardHat, CalendarDays, Gamepad2,
  TriangleAlert, Target, Receipt, FlameKindling, AlertTriangle, Shield, Warehouse, Settings, type LucideIcon
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
  { id: "destaques", icon: LayoutDashboard, label: "INTRO", path: "/" },
  { id: "rdo-hub", icon: FileText, label: "MUSIC", path: "/relatorio-diario-obra" },
  { id: "reunioes", icon: Presentation, label: "TOURS", path: "/reunioes" },
  { id: "almoxarifado", icon: Warehouse, label: "MERCH", path: "/almoxarifado" },
  { id: "rh-hub", icon: Users, label: "INFO", path: "/recursos-humanos" },
];

export const TopNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { navOrder } = useUserNavOrder();
  const { settings } = useSiteSettings();
  const { getHiddenItemsForCargo } = useNavVisibilityRules();

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

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
      {visibleNavItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.id}
            to={item.path}
            className={cn(
              "px-6 py-2 rounded-full text-[11px] font-bold tracking-[0.15em] transition-all duration-300 flex items-center gap-2",
              isActive 
                ? "bg-white/15 text-white shadow-inner" 
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            {item.label}
            {item.id === "destaques" && <span className="opacity-50 font-normal">♫</span>}
            {item.id === "rdo-hub" && <span className="opacity-50 font-normal">▷</span>}
            {item.id === "reunioes" && <span className="opacity-50 font-normal">◎</span>}
            {item.id === "almoxarifado" && <span className="opacity-50 font-normal">👜</span>}
            {item.id === "rh-hub" && <span className="opacity-50 font-normal">ⓘ</span>}
          </Link>
        );
      })}
    </nav>
  );
};
