import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  FileText, 
  Truck, 
  MapPin,
  Clock,
  LogOut,
  User
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuickAccessItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  iconColor: string;
}

const PainelMotorista = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const handleLogout = async () => {
    try {
      // Get the selected vehicle ID before clearing
      const selectedVehicleId = localStorage.getItem("selectedVehicleId");
      
      // If there was a selected vehicle, clear the driver field
      if (selectedVehicleId) {
        await supabase
          .from("equipment")
          .update({ driver: "" })
          .eq("id", selectedVehicleId);
      }
      
      // Clear selected vehicle on logout
      localStorage.removeItem("selectedVehicleId");
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso");
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error("Erro ao fazer logout");
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
    return "MT";
  };

  const quickAccessItems: QuickAccessItem[] = [
    {
      title: "Tarefas",
      icon: <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10" />,
      href: "/lembretes",
      color: "bg-amber-400 hover:bg-amber-500 active:bg-amber-600",
      iconColor: "text-amber-900",
    },
    {
      title: "Relatórios",
      icon: <FileText className="w-8 h-8 sm:w-10 sm:h-10" />,
      href: "/rdo",
      color: "bg-amber-400 hover:bg-amber-500 active:bg-amber-600",
      iconColor: "text-amber-900",
    },
    {
      title: "Equipamentos",
      icon: <Truck className="w-8 h-8 sm:w-10 sm:h-10" />,
      href: "/equipamentos-motorista",
      color: "bg-amber-400 hover:bg-amber-500 active:bg-amber-600",
      iconColor: "text-amber-900",
    },
    {
      title: "Entrada/Saída",
      icon: <MapPin className="w-8 h-8 sm:w-10 sm:h-10" />,
      href: "/registro-movimento-motorista",
      color: "bg-zinc-600 hover:bg-zinc-700 active:bg-zinc-800",
      iconColor: "text-white",
    },
    {
      title: "Hora Extra",
      icon: <Clock className="w-8 h-8 sm:w-10 sm:h-10" />,
      href: "/hora-extra",
      color: "bg-zinc-600 hover:bg-zinc-700 active:bg-zinc-800",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Compact Header for Mobile */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          {/* Logo */}
          <img 
            src="/logo-sucena-pdf.png" 
            alt="Sucena" 
            className="h-7 sm:h-8 w-auto"
          />
          
          {/* User Info - Center */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Motorista"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xs:block">
              <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[120px] sm:max-w-[180px]">
                {profile?.full_name?.split(' ')[0] || "Motorista"}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {formatCargoLabel(profile?.cargo)}
              </p>
            </div>
          </div>
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-3 sm:p-4 max-w-lg mx-auto space-y-4">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-none shadow-lg">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold">
                  Olá, {profile?.full_name?.split(' ')[0] || "Motorista"}!
                </h2>
                <p className="text-xs sm:text-sm opacity-90">
                  Acesse as funções do seu dia a dia
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Grid - 2 columns, touch-friendly */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {quickAccessItems.map((item) => (
            <button
              key={item.title}
              type="button"
              className={`${item.color} cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.97] border-none shadow-md touch-manipulation rounded-lg w-full`}
              onClick={() => navigate(item.href)}
            >
              <div className="p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[100px] sm:min-h-[120px] pointer-events-none">
                <div className={`${item.iconColor} mb-2 sm:mb-3 pointer-events-none`}>
                  {item.icon}
                </div>
                <h3 className={`font-bold ${item.iconColor} text-xs sm:text-sm uppercase tracking-wide pointer-events-none`}>
                  {item.title}
                </h3>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PainelMotorista;
