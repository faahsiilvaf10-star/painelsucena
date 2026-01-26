import { ReactNode, useMemo } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ForbiddenColorIndicator from "@/components/ForbiddenColorIndicator";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CampaignRibbon } from "@/components/campaigns/CampaignRibbon";
import { PageTransition } from "./PageTransition";
import { AnnouncementModal } from "@/components/announcements/AnnouncementModal";
import { SessionExpiryWarning } from "@/components/session/SessionExpiryWarning";
import { SessionTimeIndicator } from "@/components/session/SessionTimeIndicator";

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

  return (
    <SidebarInset className="flex flex-col h-full overflow-hidden">
      {/* Header with notification bell and theme toggle */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
        <div className="flex items-center gap-4 md:hidden">
          <SidebarTrigger />
          <span className="font-semibold">Painel Sucena</span>
        </div>
        <div className="hidden md:block w-24" />
        
        {/* Motivational phrase - centered */}
        <p className="hidden md:block flex-1 text-center text-sm text-muted-foreground italic truncate px-4">
          "{dailyPhrase}"
        </p>
        
        <div className="flex items-center gap-1">
          <SessionTimeIndicator />
          <CampaignRibbon />
          <ThemeToggle />
          <NotificationBell />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-14">
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
