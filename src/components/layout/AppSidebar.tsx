import { Users, ClipboardList, Grid3X3, LayoutDashboard, FileBarChart, LogOut, LogIn, ShieldCheck, Phone, PanelLeftClose, PanelLeft, Settings, LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import logoPrincipal from "@/assets/logo-principal.png";
import { ThemeToggle } from "@/components/ThemeToggle";
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

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
}

const allNavItems: NavItem[] = [
  { id: "destaques", icon: LayoutDashboard, label: "Destaques", path: "/" },
  { id: "rh", icon: Users, label: "RH", path: "/rh" },
  { id: "presenca", icon: ClipboardList, label: "Lista de Presença", path: "/presenca" },
  { id: "relatorio", icon: FileBarChart, label: "Relatório", path: "/relatorio-presenca" },
  { id: "matriz", icon: Grid3X3, label: "Matriz Responsabilidade", path: "/matriz" },
  { id: "emergencia", icon: Phone, label: "Emergência", path: "/emergencia" },
];

interface Profile {
  full_name: string;
  cargo: string;
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { state, toggleSidebar } = useSidebar();
  const { settings } = useSiteSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const isCollapsed = state === "collapsed";

  // Order nav items based on settings
  const orderedNavItems = useMemo(() => {
    if (!settings.nav_order || settings.nav_order.length === 0) {
      return allNavItems;
    }
    
    const ordered: NavItem[] = [];
    settings.nav_order.forEach((id: string) => {
      const item = allNavItems.find(nav => nav.id === id);
      if (item) ordered.push(item);
    });
    
    // Add any items not in the order (shouldn't happen but safety)
    allNavItems.forEach(item => {
      if (!ordered.find(o => o.id === item.id)) {
        ordered.push(item);
      }
    });
    
    return ordered;
  }, [settings.nav_order]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, cargo")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
        }
      } else {
        setProfile(null);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
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

  // Dynamic sidebar color style
  const sidebarStyle = settings.sidebar_color ? {
    backgroundColor: settings.sidebar_color,
  } : undefined;

  return (
    <Sidebar collapsible="icon" className="border-r-0" style={sidebarStyle}>
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          {!isCollapsed ? (
            <img 
              src={settings.logo_url || logoPrincipal} 
              alt="Logo" 
              className="h-10 max-w-[180px] object-contain" 
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">S</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <ScrollArea className="flex-1">
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <SidebarMenu>
                {orderedNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}
                      >
                        <Link to={item.path}>
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/admin"}
                      tooltip="Administração"
                      className={location.pathname === "/admin" ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}
                    >
                      <Link to="/admin">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="font-medium">Administração</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {user ? (
          <>
            {/* User Info */}
            <div className="flex items-center gap-3 p-2 mb-2">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary-foreground">{getInitials()}</span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-sidebar-foreground">{profile?.full_name || "Usuário"}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.cargo || "Membro"}</p>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className={`flex gap-2 ${isCollapsed ? "flex-col" : ""}`}>
              <Button
                variant="secondary"
                size="sm"
                className={`flex-1 bg-sidebar-border/50 hover:bg-sidebar-border text-sidebar-foreground ${isCollapsed ? "px-2" : ""}`}
              >
                <Settings className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">Config.</span>}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSignOut}
                className={`flex-1 bg-sidebar-border/50 hover:bg-sidebar-border text-sidebar-foreground ${isCollapsed ? "px-2" : ""}`}
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">Sair</span>}
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

        {/* Collapse Toggle */}
        <Separator className="my-3 bg-sidebar-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/50"
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 mr-2" />
              <span>Minimizar</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
