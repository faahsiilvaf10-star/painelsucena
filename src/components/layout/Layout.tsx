import { ReactNode, useMemo } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ForbiddenColorIndicator from "@/components/ForbiddenColorIndicator";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CampaignRibbon } from "@/components/campaigns/CampaignRibbon";
import { PageTransition } from "./PageTransition";
import { AnnouncementModal } from "@/components/announcements/AnnouncementModal";
import { SessionExpiryWarning } from "@/components/session/SessionExpiryWarning";
import { SessionTimeIndicator } from "@/components/session/SessionTimeIndicator";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useInstaCenaNotifications } from "@/hooks/useInstaCenaNotifications";
import { useInstaCenaBellNotifications } from "@/hooks/useInstaCenaBellNotifications";

import { useVisualizadorContext } from "@/contexts/VisualizadorContext";
import { useProfile } from "@/hooks/useProfile";
import { Eye } from "lucide-react";

const motivationalPhrases = [
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Acredite em você mesmo e tudo será possível.",
  "Cada dia é uma nova oportunidade de ser melhor.",
  "A persistência é o caminho do êxito.",
  "Trabalho em equipe divide a tarefa e multiplica o sucesso.",
  "Sua atitude determina sua direção.",
  "Grandes conquistas começam com pequenos passos.",
  "O único lugar onde o sucesso vem antes do trabalho é no dicionário.",
  "Faça hoje o que outros não querem, faça amanhã o que outros não podem.",
  "A segurança não é um acidente, é uma escolha.",
  "Juntos somos mais fortes.",
  "Excelência não é um ato, mas um hábito.",
  "O comprometimento transforma promessas em realidade.",
  "Quem planta segurança, colhe resultados.",
  "A qualidade nunca é um acidente, é sempre resultado do esforço inteligente.",
  "O impossível é apenas o que ainda não foi tentado.",
  "Disciplina é a ponte entre metas e realizações.",
  "Cada obstáculo é uma oportunidade disfarçada.",
  "O trabalho bem feito é a melhor recompensa.",
  "Segurança em primeiro lugar, sempre.",
  "A união faz a força.",
  "Pequenas ações criam grandes mudanças.",
  "O melhor momento para agir é agora.",
  "Construímos o futuro com as ações de hoje.",
  "Sua dedicação faz a diferença.",
  "Respeito e colaboração são a base do sucesso.",
  "Cada dia é uma chance de superar seus limites.",
  "O esforço de hoje é o resultado de amanhã.",
  "Trabalhe com propósito, viva com paixão.",
  "A excelência está nos detalhes.",
];

const getDailyPhrase = (): string => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return motivationalPhrases[dayOfYear % motivationalPhrases.length];
};

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const dailyPhrase = useMemo(() => getDailyPhrase(), []);
  const { isVisualizador } = useVisualizadorContext();
  const { data: profile } = useProfile();
  
  const isAvatarBlocked = profile && (!profile.avatar_url || profile.avatar_url.trim().length === 0);
  
  // Enable global chat push notifications
  useChatNotifications();
  useInstaCenaNotifications();
  useInstaCenaBellNotifications();

  return (
    <SidebarInset className="flex flex-col h-full overflow-hidden">
      {/* Header with notification bell and theme toggle */}
      <header className="flex h-9 md:h-10 shrink-0 items-center justify-between gap-2 md:gap-4 border-b bg-background px-3 md:px-4">
        <div className="flex items-center gap-2 md:gap-4 md:hidden">
          <span className="font-semibold text-sm">Painel Sucena</span>
        </div>
        <div className="hidden md:block w-24" />
        
        {/* Motivational phrase - centered */}
        <p className="hidden lg:block flex-1 text-center text-sm text-muted-foreground italic truncate px-4">
          "{dailyPhrase}"
        </p>
        
        <div className="flex items-center gap-0.5 md:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                  const keysToRemove: string[] = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('theme') || key.startsWith('sidebar') || key.startsWith('vite-'))) {
                      keysToRemove.push(key);
                    }
                  }
                  keysToRemove.forEach(k => localStorage.removeItem(k));
                  window.location.reload();
                }}
                className="flex items-center gap-1 px-1.5 py-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Recarregar e limpar cache visual"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium hidden sm:inline">Recarregar</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-card border">
              <p className="text-xs">Recarregar e limpar cache visual</p>
            </TooltipContent>
          </Tooltip>
          <SessionTimeIndicator />
          <CampaignRibbon />
          <ThemeToggle />
          <NotificationBell />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-16 md:pb-14">
        {isVisualizador && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
            <Eye className="h-4 w-4 shrink-0" />
            <span>Modo Visualização — Você tem acesso somente leitura. Edições e downloads estão desabilitados.</span>
          </div>
        )}
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <ForbiddenColorIndicator />
      <AnnouncementModal />
      <SessionExpiryWarning />
      
    </SidebarInset>
  );
};

export default Layout;
