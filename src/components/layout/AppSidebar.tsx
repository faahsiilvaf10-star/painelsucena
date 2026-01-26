import { Users, ClipboardList, Grid3X3, LayoutDashboard, FileBarChart, LogOut, LogIn, AlertTriangle, PanelLeftClose, PanelLeft, Settings, Sun, Truck, Bell, FileText, LucideIcon, Heart, ShoppingCart, Package, GripVertical, User, FolderOpen, ShieldCheck, Leaf, Hammer, Target } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProfile } from "@/hooks/useProfile";
import logoPrincipal from "@/assets/logo-principal.png";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { SidebarBackground } from "./SidebarBackground";

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  isEmergency?: boolean;
  restrictedTo?: string[]; // cargo types that can see this item (admin always sees all)
}

const allNavItems: NavItem[] = [
  { id: "atividades", icon: Leaf, label: "Atividades I", path: "/atividades" },
  { id: "atividades-ii", icon: Hammer, label: "Atividades II", path: "/atividades-ii" },
  { id: "metas", icon: Target, label: "Metas", path: "/metas", restrictedTo: ["planejador"] },
  { id: "destaques", icon: LayoutDashboard, label: "Destaques", path: "/" },
  { id: "campanhas", icon: Heart, label: "Campanhas", path: "/campanhas" },
  { id: "dds", icon: Sun, label: "DDS", path: "/dds" },
  { id: "documentos", icon: FolderOpen, label: "Documentos", path: "/documentos" },
  { id: "equipamentos", icon: Truck, label: "Equipamentos", path: "/equipamentos" },
  { id: "estoque", icon: Package, label: "Estoque", path: "/estoque" },
  { id: "lembretes", icon: Bell, label: "Lembretes", path: "/lembretes" },
  { id: "presenca", icon: ClipboardList, label: "Lista de Presença", path: "/presenca" },
  { id: "matriz", icon: Grid3X3, label: "Matriz Responsabilidade", path: "/matriz" },
  { id: "pedidos", icon: ShoppingCart, label: "Pedidos", path: "/pedidos" },
  { id: "rdo", icon: FileText, label: "RDO", path: "/rdo" },
  { id: "relatorio", icon: FileBarChart, label: "Relatório de Presença", path: "/relatorio-presenca" },
  { id: "rh", icon: Users, label: "RH", path: "/rh" },
  { id: "emergencia", icon: AlertTriangle, label: "Emergência", path: "/emergencia", isEmergency: true },
];

// Sortable nav item component
function SortableNavItem({
  item,
  isActive,
  isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className="group"
      >
        <Link to={item.path} className="flex items-center gap-2">
          {!isCollapsed && (
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="h-4 w-4 text-sidebar-foreground/50" />
            </span>
          )}
          <item.icon
            className={`h-5 w-5 ${
              item.isEmergency ? "text-red-500 animate-pulse" : ""
            }`}
          />
          <span
            className={`font-medium ${item.isEmergency ? "text-red-500" : ""}`}
          >
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { state, toggleSidebar } = useSidebar();
  const { settings, updateSettings } = useSiteSettings();
  const { data: profile } = useProfile();
  const isCollapsed = state === "collapsed";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter nav items based on permissions
  const visibleNavItems = useMemo(() => {
    return allNavItems.filter(item => {
      // If no restrictions, show to everyone
      if (!item.restrictedTo) return true;
      
      // If admin, show everything
      if (isAdmin) return true;
      
      // Check if user's cargo is in the allowed list
      if (profile?.cargo && item.restrictedTo.includes(profile.cargo)) {
        return true;
      }
      
      return false;
    });
  }, [isAdmin, profile?.cargo]);

  // Order nav items based on settings
  const orderedNavItems = useMemo(() => {
    if (!settings.nav_order || settings.nav_order.length === 0) {
      return visibleNavItems;
    }
    
    const ordered: NavItem[] = [];
    settings.nav_order.forEach((id: string) => {
      const item = visibleNavItems.find(nav => nav.id === id);
      if (item) ordered.push(item);
    });
    
    // Add any items not in the order (shouldn't happen but safety)
    visibleNavItems.forEach(item => {
      if (!ordered.find(o => o.id === item.id)) {
        ordered.push(item);
      }
    });
    
    return ordered;
  }, [settings.nav_order, visibleNavItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedNavItems.findIndex((item) => item.id === active.id);
      const newIndex = orderedNavItems.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(orderedNavItems, oldIndex, newIndex);
      const newNavOrder = newOrder.map((item) => item.id);

      updateSettings.mutate(
        { nav_order: newNavOrder },
        {
          onSuccess: () => {
            toast.success("Ordem do menu salva!");
          },
          onError: () => {
            toast.error("Erro ao salvar ordem do menu");
          },
        }
      );
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      const names = profile.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    return "US";
  };

  const handleSignOut = async () => {
    // Get user info before signing out for the transition
    const userName = profile?.full_name || "Usuário";
    const userAvatar = profile?.avatar_url || undefined;

    // Start logout transition
    sessionStorage.setItem("logoutTransitionInProgress", "true");
    sessionStorage.setItem("logoutTransitionPayload", JSON.stringify({
      userName,
      userAvatar,
    }));
    window.dispatchEvent(new Event("logout-transition"));

    // Sign out in background - the transition will handle the redirect
    try {
      await signOut();
    } catch {
      // Ignore errors, transition will redirect anyway
    }
  };

  // Dynamic sidebar color style from site settings
  const sidebarStyle = {
    backgroundColor: settings.sidebar_color || undefined,
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 relative shrink-0 h-screen sticky top-0 rounded-r-2xl overflow-hidden" style={sidebarStyle}>
      {/* Background with particles */}
      <div className="absolute inset-0 overflow-hidden">
        <SidebarBackground />
      </div>
      
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border/50 p-4 relative z-10">
        <div className="flex items-center justify-between gap-3">
          {!isCollapsed ? (
            <img 
              src={settings.logo_url || logoPrincipal} 
              alt="Logo" 
              className="h-10 max-w-[140px] object-contain" 
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">S</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/50 shrink-0"
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="relative z-10">
        <ScrollArea className="flex-1">
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedNavItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <SidebarMenu>
                    {orderedNavItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <SortableNavItem
                          key={item.id}
                          item={item}
                          isActive={isActive}
                          isCollapsed={isCollapsed}
                        />
                      );
                    })}
                  </SidebarMenu>
                </SortableContext>
              </DndContext>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-2 relative z-10">
        {user ? (
          <>
            {/* User Info */}
            <div className="flex items-center gap-3 p-2">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Usuário"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-sidebar-foreground">{profile?.full_name || "Usuário"}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.cargo || "Membro"}</p>
                </div>
              )}
            </div>
            
              {/* Icon Buttons for Admin, Config and Logout */}
              <div className={`flex items-center justify-center gap-2 mt-2 ${isCollapsed ? "flex-col" : ""}`}>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/admin")}
                    className="h-9 w-9 text-amber-500 hover:text-amber-400 hover:bg-amber-500/20"
                    title="Administração"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/configuracoes")}
                  className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  title="Configurações"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="h-9 w-9 text-sidebar-foreground/70 hover:text-red-500 hover:bg-red-500/20"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
          </>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Entrar">
                <Link to="/auth">
                  <LogIn className="h-5 w-5" />
                  <span className="font-medium">Entrar</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

      </SidebarFooter>
    </Sidebar>
  );
}
