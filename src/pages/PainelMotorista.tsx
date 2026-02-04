import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Truck, 
  MapPin,
  LogOut,
  User,
  Droplets
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DriverStatusButtons } from "@/components/driver/DriverStatusButtons";
import { SyncIndicator } from "@/components/driver/SyncIndicator";
import { useEquipment } from "@/hooks/useEquipment";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface QuickAccessItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  iconColor: string;
  hideForMunk?: boolean;
}

const PainelMotorista = () => {
  const { setTheme, theme } = useTheme();
  
  // Force light theme on this page
  useEffect(() => {
    const previousTheme = theme;
    setTheme("light");
    
    return () => {
      // Restore previous theme when leaving the page
      if (previousTheme) {
        setTheme(previousTheme);
      }
    };
  }, []);
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: equipment = [] } = useEquipment();
  const { isOnline, isSyncing, pendingCount, lastSyncTime, triggerSync } = useOfflineSync();
  
  // Get selected vehicle type
  const selectedVehicleId = localStorage.getItem("selectedVehicleId");
  const selectedVehicle = equipment.find(eq => eq.id === selectedVehicleId);
  const isMunk = selectedVehicle?.equipment_type === "munk";

  const handleLogout = async () => {
    try {
      // Get the selected vehicle ID before clearing
      const selectedVehicleId = localStorage.getItem("selectedVehicleId");
      
      // If there was a selected vehicle, clear the driver and helper fields
      if (selectedVehicleId) {
        await supabase
          .from("equipment")
          .update({ driver: "", helper: "" })
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
      title: "Relatórios",
      icon: <FileText className="w-8 h-8" />,
      href: "/relatorios-motorista",
      color: "bg-amber-400 hover:bg-amber-500 active:bg-amber-600",
      iconColor: "text-amber-900",
    },
    {
      title: "Equipamentos",
      icon: <Truck className="w-8 h-8" />,
      href: "/equipamentos-motorista",
      color: "bg-amber-400 hover:bg-amber-500 active:bg-amber-600",
      iconColor: "text-amber-900",
    },
    {
      title: "Pontos de Água",
      icon: <Droplets className="w-8 h-8" />,
      href: "/pontos-abastecimento",
      color: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
      iconColor: "text-white",
      hideForMunk: true,
    },
    {
      title: "Entrada/Saída",
      icon: <MapPin className="w-8 h-8" />,
      href: "/registro-movimento-motorista",
      color: "bg-zinc-600 hover:bg-zinc-700 active:bg-zinc-800",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Compact Header for Mobile */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm safe-area-inset-top">
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Logo */}
          <img 
            src="/logo-sucena-pdf.png" 
            alt="Sucena" 
            className="h-6 w-auto"
          />
          
          {/* User Info - Center */}
          <div className="flex items-center gap-2 flex-1 justify-center min-w-0 px-1">
            <Avatar className="w-8 h-8 border-2 border-primary/20 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Motorista"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[90px]">
                {profile?.full_name?.split(' ')[0] || "Motorista"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">
                {formatCargoLabel(profile?.cargo)}
              </p>
            </div>
          </div>
          
          {/* Sync Indicator */}
          <SyncIndicator
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            lastSyncTime={lastSyncTime}
            onSync={triggerSync}
          />
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full shrink-0 touch-manipulation ml-1"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content - Optimized for mobile */}
      <main className="p-4 max-w-lg mx-auto space-y-4 pb-8 safe-area-inset-bottom">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-full">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">
                  Olá, {profile?.full_name?.split(' ')[0] || "Motorista"}!
                </h2>
                <p className="text-xs opacity-90">
                  Acesse as funções do seu dia a dia
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Status Buttons - Controle de Turno */}
        <DriverStatusButtons />

        {/* Quick Access Grid - 2 columns, touch-friendly with larger targets */}
        <div className="grid grid-cols-2 gap-3">
          {quickAccessItems
            .filter((item) => !(item.hideForMunk && isMunk))
            .map((item) => (
            <button
              key={item.title}
              type="button"
              className={`${item.color} cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.97] border-none shadow-md touch-manipulation rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
              onClick={() => navigate(item.href)}
            >
              <div className="p-4 flex flex-col items-center justify-center text-center min-h-[110px] pointer-events-none">
                <div className={`${item.iconColor} mb-2 pointer-events-none`}>
                  {item.icon}
                </div>
                <h3 className={`font-bold ${item.iconColor} text-xs uppercase tracking-wide pointer-events-none`}>
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
