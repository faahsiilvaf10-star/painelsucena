import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  Folder,
  Landmark,
  Network,
  HardHat,
  Shield,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Loader2,
  ClipboardList,
  ExternalLink,
  Lock,
  Save,
  Sparkles
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatrixProgress } from "@/hooks/useMatrixProgress";
import { CelebrationModal } from "@/components/matriz/CelebrationModal";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface CargoTarefa {
  id: string;
  nome: string;
}

interface CargoFolder {
  id: string;
  cargo: string;
  cargoType: string; // Maps to cargo_type enum
  tarefas: CargoTarefa[];
  borderColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
}

const cargoFolders: CargoFolder[] = [
  {
    id: "preposto",
    cargo: "Preposto",
    cargoType: "preposto",
    borderColor: "border-t-blue-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-500",
    icon: <Landmark className="w-6 h-6" />,
    tarefas: [
      { id: "p1", nome: "DDS de Liderança" },
      { id: "p2", nome: "WOC - Caminhar, Observar e Conversar" },
      { id: "p3", nome: "Observação de Tarefas" },
      { id: "p4", nome: "Inspeção em HSE" },
      { id: "p5", nome: "Roda de Conversa" },
    ],
  },
  {
    id: "encarregado-geral",
    cargo: "Encarregado Geral",
    cargoType: "encarregado_geral",
    borderColor: "border-t-purple-500",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-500",
    icon: <Network className="w-6 h-6" />,
    tarefas: [
      { id: "eg1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "eg2", nome: "Observação de Tarefa" },
      { id: "eg3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-i",
    cargo: "Encarregado I",
    cargoType: "encarregado_i",
    borderColor: "border-t-orange-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
    icon: <HardHat className="w-6 h-6" />,
    tarefas: [
      { id: "e1-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e1-2", nome: "Observação de Tarefa" },
      { id: "e1-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-ii",
    cargo: "Encarregado II",
    cargoType: "encarregado_ii",
    borderColor: "border-t-green-500",
    iconBg: "bg-green-100",
    iconColor: "text-green-500",
    icon: <HardHat className="w-6 h-6" />,
    tarefas: [
      { id: "e2-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e2-2", nome: "Observação de Tarefa" },
      { id: "e2-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "tecnico-seguranca-i",
    cargo: "Téc. Segurança I",
    cargoType: "tecnico_seguranca_i",
    borderColor: "border-t-red-500",
    iconBg: "bg-red-100",
    iconColor: "text-red-500",
    icon: <Shield className="w-6 h-6" />,
    tarefas: [
      { id: "ts1-1", nome: "DDS da Liderança" },
      { id: "ts1-2", nome: "WOC - Caminhar, Observar e Conversar" },
      { id: "ts1-3", nome: "Inspeção de HSE" },
      { id: "ts1-4", nome: "Evento sem Lesão / Condição de Risco (ALTO RISCO)" },
      { id: "ts1-5", nome: "Coach em HSE" },
      { id: "ts1-6", nome: "Observação de Tarefa" },
    ],
  },
  {
    id: "tecnico-seguranca-ii",
    cargo: "Téc. Segurança II",
    cargoType: "tecnico_seguranca_ii",
    borderColor: "border-t-rose-500",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-500",
    icon: <Shield className="w-6 h-6" />,
    tarefas: [
      { id: "ts2-1", nome: "DDS da Liderança" },
      { id: "ts2-2", nome: "WOC - Caminhar, Observar e Conversar" },
      { id: "ts2-3", nome: "Inspeção de HSE" },
      { id: "ts2-4", nome: "Evento sem Lesão / Condição de Risco (ALTO RISCO)" },
      { id: "ts2-5", nome: "Coach em HSE" },
      { id: "ts2-6", nome: "Observação de Tarefa" },
    ],
  },
];

const Matriz = () => {
  const [selectedFolder, setSelectedFolder] = useState<CargoFolder | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completedTasks, isLoading, toggleTask, isCompleted } = useMatrixProgress();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin } = useIsAdmin();

  // Check if user can edit a specific folder
  const canEditFolder = (folder: CargoFolder) => {
    if (isAdmin) return true;
    return profile?.cargo === folder.cargoType;
  };

  // Handle task toggle with permission check
  const handleToggleTask = (taskId: string, folder: CargoFolder) => {
    if (!canEditFolder(folder)) {
      toast.error("Você só pode concluir tarefas do seu cargo.");
      return;
    }
    toggleTask(taskId);
  };

  const getProgress = (folder: CargoFolder) => {
    if (folder.tarefas.length === 0) return 0;
    const completed = folder.tarefas.filter((t) => completedTasks.includes(t.id)).length;
    return Math.round((completed / folder.tarefas.length) * 100);
  };

  const getCompletedCount = (folder: CargoFolder) => {
    return folder.tarefas.filter((t) => completedTasks.includes(t.id)).length;
  };

  // Show celebration when entering a folder that is 100% complete or when completing it
  useEffect(() => {
    if (selectedFolder && !isLoading) {
      const currentProgress = getProgress(selectedFolder);
      if (currentProgress === 100) {
        setShowCelebration(true);
      }
    }
  }, [selectedFolder, completedTasks, isLoading]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Detail View
  if (selectedFolder) {
    const progress = getProgress(selectedFolder);
    const completedCount = getCompletedCount(selectedFolder);

    return (
      <Layout>
        <CelebrationModal 
          isOpen={showCelebration} 
          onClose={() => setShowCelebration(false)}
          cargoName={selectedFolder.cargo}
        />
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-4 sm:mb-6 gap-2"
            onClick={() => setSelectedFolder(null)}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${selectedFolder.iconBg} flex items-center justify-center shrink-0`}>
              <div className={selectedFolder.iconColor}>{selectedFolder.icon}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-3xl font-bold">{selectedFolder.cargo}</h1>
                {!canEditFolder(selectedFolder) && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-1 text-xs">
                    <Lock className="w-3 h-3" />
                    Somente leitura
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{selectedFolder.tarefas.length} atividades
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Forms Link Button */}
              {canEditFolder(selectedFolder) && (
                <a
                  href="https://forms.office.com/Pages/ResponsePage.aspx?id=kYkdvChKUkWrwaznrhCCdO-80STG5SxAvb9Y_fx1cCNUQjVWRVRNSlE0Q08xNFhVNlFDSEFVTUJFNy4u"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Clica aqui para preencher no Forms"
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl group"
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="font-medium hidden sm:inline">Preencher Forms</span>
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              <Badge 
                variant={progress === 100 ? "default" : "secondary"} 
                className={`text-lg px-4 py-2 ${progress === 100 ? "bg-green-500" : ""}`}
              >
                {progress}%
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="h-3" />
          </div>

          {/* Tasks */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-semibold">Atividades</h2>
              {canEditFolder(selectedFolder) && completedCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <Save className="w-4 h-4" />
                  <span>Progresso salvo automaticamente</span>
                </div>
              )}
            </div>
            <ul className="divide-y divide-border/50">
              {selectedFolder.tarefas.map((tarefa, index) => {
                const completed = isCompleted(tarefa.id);
                const canEdit = canEditFolder(selectedFolder);
                return (
                  <li
                    key={tarefa.id}
                    onClick={() => canEdit ? handleToggleTask(tarefa.id, selectedFolder) : toast.error("Você só pode concluir tarefas do seu cargo.")}
                    className={`flex items-center gap-4 p-5 transition-all duration-300 animate-fade-in ${
                      canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                    } ${
                      completed 
                        ? "bg-green-500/10 hover:bg-green-500/20" 
                        : canEdit ? "hover:bg-secondary/30" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`transition-all duration-300 ${completed ? "scale-110" : "scale-100"}`}>
                      {completed ? (
                        <CheckCircle2 className={`w-6 h-6 ${selectedFolder.iconColor}`} />
                      ) : canEdit ? (
                        <Circle className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className={`font-medium flex-1 transition-all duration-300 ${
                      completed ? "line-through text-muted-foreground" : ""
                    }`}>
                      {tarefa.nome}
                    </span>
                    {completed && (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/50 gap-1">
                        <Sparkles className="w-3 h-3" />
                        Salvo
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Save Confirmation Message */}
          {canEditFolder(selectedFolder) && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
              <Save className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-600 dark:text-green-400">
                Suas marcações são salvas automaticamente. O progresso fica registrado até o fim do mês.
              </p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Grid View
  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Matriz de Responsabilidades</h1>
              <p className="text-sm text-muted-foreground">
                Selecione uma função para visualizar o progresso.
              </p>
              <p className="text-orange-500 text-xs sm:text-sm mt-2">
                * Progresso zerado no dia 01 de cada mês.
              </p>
            </div>
            
            {/* Forms Link Button */}
            <a
              href="https://forms.office.com/Pages/ResponsePage.aspx?id=kYkdvChKUkWrwaznrhCCdO-80STG5SxAvb9Y_fx1cCNUQjVWRVRNSlE0Q08xNFhVNlFDSEFVTUJFNy4u"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 sm:py-3 rounded-xl shadow-lg transition-all w-full sm:w-auto"
            >
              <ClipboardList className="w-5 h-5" />
              <span className="font-medium">Preencher Forms</span>
              <ExternalLink className="w-4 h-4 opacity-70" />
            </a>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cargoFolders.map((folder, index) => {
            const progress = getProgress(folder);
            const completedCount = getCompletedCount(folder);
            const canEdit = canEditFolder(folder);
            const hasProgress = progress > 0;
            const isComplete = progress === 100;
            
            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolder(folder)}
                className={`bg-card rounded-2xl border-2 border-t-4 ${folder.borderColor} p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in group relative ${
                  canEdit ? "ring-2 ring-primary/50" : ""
                } ${
                  isComplete 
                    ? "border-green-500/50 bg-gradient-to-br from-green-500/5 to-green-500/10 shadow-lg shadow-green-500/10" 
                    : hasProgress 
                      ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent" 
                      : "border-border/50"
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Status Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                  {isComplete && (
                    <Badge className="bg-green-500 text-white text-[10px] px-2 py-0.5 gap-1">
                      <Sparkles className="w-3 h-3" />
                      Concluído
                    </Badge>
                  )}
                  {hasProgress && !isComplete && (
                    <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 gap-1">
                      <Save className="w-3 h-3" />
                      Em progresso
                    </Badge>
                  )}
                  {canEdit && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                      Seu cargo
                    </Badge>
                  )}
                  {!canEdit && !isAdmin && !hasProgress && (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Top Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${folder.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                    isComplete ? "ring-2 ring-green-500/50" : ""
                  }`}>
                    <div className={folder.iconColor}>{folder.icon}</div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2">{folder.cargo}</h3>

                {/* Activities Count with Progress */}
                <div className="flex items-center gap-2 text-muted-foreground mb-6">
                  {hasProgress ? (
                    <>
                      <CheckCircle2 className={`w-4 h-4 ${isComplete ? "text-green-500" : "text-amber-500"}`} />
                      <span className={`text-sm font-medium ${isComplete ? "text-green-500" : "text-amber-500"}`}>
                        {completedCount}/{folder.tarefas.length} salvos
                      </span>
                    </>
                  ) : (
                    <>
                      <Folder className="w-4 h-4" />
                      <span className="text-sm">{folder.tarefas.length} atividades</span>
                    </>
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Progresso
                    </span>
                    <span className={`text-sm font-bold ${
                      isComplete ? "text-green-500" : hasProgress ? "text-amber-500" : ""
                    }`}>
                      {progress}%
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={`h-2 ${isComplete ? "[&>div]:bg-green-500" : hasProgress ? "[&>div]:bg-amber-500" : ""}`} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Matriz;
