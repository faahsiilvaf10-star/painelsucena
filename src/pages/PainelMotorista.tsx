import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  FileText, 
  Truck, 
  Calendar,
  MapPin,
  Clock,
  LogOut
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickAccessItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  description: string;
}

const PainelMotorista = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso");
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  const quickAccessItems: QuickAccessItem[] = [
    {
      title: "Tarefas",
      icon: <ClipboardList className="w-10 h-10" />,
      href: "/lembretes",
      description: "Visualizar tarefas pendentes",
    },
    {
      title: "Relatórios",
      icon: <FileText className="w-10 h-10" />,
      href: "/rdo",
      description: "Acessar relatórios diários",
    },
    {
      title: "Status dos Equipamentos",
      icon: <Truck className="w-10 h-10" />,
      href: "/equipamentos",
      description: "Ver status das máquinas",
    },
    {
      title: "Programações de Atividades",
      icon: <Calendar className="w-10 h-10" />,
      href: "/dds",
      description: "Calendário de atividades",
    },
  ];

  const bottomItems: QuickAccessItem[] = [
    {
      title: "Entrada/Saída",
      icon: <MapPin className="w-10 h-10" />,
      href: "/entrada-saida-equipamentos",
      description: "Registrar movimentação",
    },
    {
      title: "Hora Extra",
      icon: <Clock className="w-10 h-10" />,
      href: "/hora-extra",
      description: "Registrar horas extras",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b px-4 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <img 
              src="/logo-sucena-pdf.png" 
              alt="Sucena" 
              className="h-8 w-auto"
            />
          </div>
          <div className="text-center flex-1">
            <h1 className="text-lg font-semibold text-foreground">
              Painel do Motorista
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile?.full_name || "Carregando..."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {formatCargoLabel(profile?.cargo)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Welcome Message */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">
              Bem-vindo, {profile?.full_name?.split(' ')[0] || "Motorista"}!
            </h2>
            <p className="text-sm opacity-90">
              Acesse rapidamente as funções do seu dia a dia
            </p>
          </CardContent>
        </Card>

        {/* Main Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-4">
          {quickAccessItems.map((item) => (
            <Card
              key={item.title}
              className="bg-amber-400 hover:bg-amber-500 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-none shadow-md"
              onClick={() => navigate(item.href)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
                <div className="text-amber-900 mb-3">
                  {item.icon}
                </div>
                <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wide">
                  {item.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-4">
          {bottomItems.map((item) => (
            <Card
              key={item.title}
              className="bg-zinc-500 hover:bg-zinc-600 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-none shadow-md"
              onClick={() => navigate(item.href)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[120px]">
                <div className="text-white mb-3">
                  {item.icon}
                </div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                  {item.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Data: {new Date().toLocaleDateString('pt-BR')}
              </span>
              <span className="text-muted-foreground">
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PainelMotorista;
