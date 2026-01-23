import { Users, ClipboardList, Grid3X3, LayoutDashboard, Menu, FileBarChart, LogOut, LogIn, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import logoPrincipal from "@/assets/logo-principal.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const baseNavItems = [
  { icon: LayoutDashboard, label: "Destaques", path: "/" },
  { icon: Users, label: "RH", path: "/rh" },
  { icon: ClipboardList, label: "Presença", path: "/presenca" },
  { icon: FileBarChart, label: "Relatório de Presença", path: "/relatorio-presenca" },
  { icon: Grid3X3, label: "Matriz de Responsabilidade", path: "/matriz" },
];

const adminNavItem = { icon: ShieldCheck, label: "Administração", path: "/admin" };

interface Profile {
  full_name: string;
  cargo: string;
}

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Build nav items based on admin status
  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/95 to-transparent">
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background border-r border-border">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-3">
                  <img src={logoPrincipal} alt="Logo Sucena" className="h-10" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium text-base">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <Separator className="my-4" />
              <div className="px-4 space-y-2">
                <ThemeToggle showLabel className="w-full justify-start" />
                {user ? (
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sair
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                    >
                      <LogIn className="w-5 h-5 mr-3" />
                      Entrar
                    </Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo - only visible on mobile */}
          <Link to="/" className="flex items-center gap-3 md:hidden">
            <img src={logoPrincipal} alt="Logo Sucena" className="h-10 transition-all duration-300 hover:scale-105" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle & User Avatar */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden md:flex" />
            {isAdmin && (
              <Badge variant="secondary" className="hidden sm:flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="w-3 h-3" />
                Admin
              </Badge>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors cursor-pointer">
                    <span className="text-sm font-semibold text-primary-foreground">{getInitials()}</span>
                    {isAdmin && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                        <ShieldCheck className="w-2.5 h-2.5 text-primary-foreground" />
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{profile?.full_name || "Usuário"}</p>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link to="/admin">
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Administração
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
