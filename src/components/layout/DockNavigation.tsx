import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MacOSDock from "@/components/ui/mac-os-dock";
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
  TriangleAlert, Target, Receipt, FlameKindling, AlertTriangle, type LucideIcon
} from "lucide-react";

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
  { id: "atividades", icon: Leaf, label: "Atividades I", path: "/atividades", hiddenFrom: ["encarregado_ii"] },
  { id: "atividades-ii", icon: Hammer, label: "Atividades II", path: "/atividades-ii", hiddenFrom: ["encarregado_i"] },
  { id: "destaques", icon: LayoutDashboard, label: "Destaques", path: "/" },
  { id: "campanhas", icon: Heart, label: "Campanhas", path: "/campanhas" },
  { id: "dds", icon: Sun, label: "DDS", path: "/dds" },
  { id: "documentos", icon: FolderOpen, label: "Permissão de Trabalho", path: "/documentos" },
  { id: "entrada-saida", icon: ArrowLeftRight, label: "Entrada e Saída", path: "/entrada-saida-equipamentos" },
  { id: "estoque", icon: Package, label: "Estoque", path: "/estoque" },
  { id: "lembretes", icon: Bell, label: "Lembretes", path: "/lembretes" },
  { id: "parte-diaria", icon: Truck, label: "Parte Diária", path: "/parte-diaria" },
  { id: "presenca", icon: ClipboardList, label: "Relatório de Presença", path: "/presenca" },
  { id: "matriz", icon: Grid3X3, label: "Matriz", path: "/matriz" },
  { id: "pedidos", icon: ShoppingCart, label: "Pedidos", path: "/pedidos" },
  { id: "rdo", icon: FileText, label: "RDO", path: "/rdo" },
  { id: "relatorio", icon: FileBarChart, label: "Lista de Presença", path: "/relatorio-presenca", restrictedTo: ["encarregado_geral", "encarregado_i", "encarregado_ii"] },
  { id: "rh", icon: Users, label: "RH", path: "/rh" },
  { id: "vistorias", icon: ClipboardCheck, label: "Vistorias", path: "/vistorias-equipamentos" },
  { id: "homologados", icon: BadgeCheck, label: "Homologados", path: "/homologados" },
  { id: "vistoria-cintas", icon: Link2, label: "Vistoria Cintas", path: "/vistoria-cintas" },
  { id: "hora-extra", icon: Clock, label: "Hora Extra", path: "/hora-extra" },
  { id: "arquivos-seguranca", icon: FolderLock, label: "Arq. Segurança", path: "/arquivos-seguranca" },
  { id: "consumo-abastecimento", icon: Droplets, label: "Consumo", path: "/consumo-abastecimento" },
  { id: "plano-manutencao", icon: Wrench, label: "Manutenção", path: "/plano-manutencao" },
  
  { id: "instacena", icon: Newspaper, label: "InstaCena", path: "/instacena" },
  { id: "inspecao-canteiro", icon: HardHat, label: "Inspeção Canteiro", path: "/inspecao-canteiro" },
  { id: "calendario-hydro", icon: CalendarDays, label: "Calendário Hydro", path: "/calendario-hydro" },
  { id: "games", icon: Gamepad2, label: "Games", path: "/games" },
  { id: "desvios", icon: TriangleAlert, label: "Desvios", path: "/desvios" },
  { id: "planejamento", icon: Target, label: "Planejamento", path: "/planejamento" },
  { id: "notas-fiscais", icon: Receipt, label: "Notas Fiscais", path: "/notas-fiscais" },
  { id: "troca-epi", icon: ShieldCheck, label: "Troca de EPI", path: "/troca-epi" },
  { id: "inspecao-extintores", icon: FlameKindling, label: "Inspeção Extintores", path: "/inspecao-extintores" },
  { id: "meio-ambiente", icon: Leaf, label: "Meio Ambiente", path: "/meio-ambiente" },
  { id: "emergencia", icon: AlertTriangle, label: "Emergência", path: "/emergencia", isEmergency: true },
];

export const DockNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { navOrder } = useUserNavOrder();
  const { settings } = useSiteSettings();
  const { getHiddenItemsForCargo } = useNavVisibilityRules();

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

  // Only navigation items in the dock (no settings/admin/logout)
  const dockApps = useMemo(() => {
    return orderedNavItems.map(item => ({
      id: item.id,
      name: item.label,
      icon: <item.icon className="h-4 w-4" />,
      isActive: location.pathname === item.path,
      isEmergency: item.isEmergency,
    }));
  }, [orderedNavItems, location.pathname]);

  const pathMap = useMemo(() => {
    const map: Record<string, string> = {};
    orderedNavItems.forEach(item => { map[item.id] = item.path; });
    return map;
  }, [orderedNavItems]);

  const handleAppClick = (appId: string) => {
    const path = pathMap[appId];
    if (path) navigate(path);
  };

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 max-w-[98vw]">
      <MacOSDock
        apps={dockApps}
        onAppClick={handleAppClick}
      />
    </div>
  );
};
