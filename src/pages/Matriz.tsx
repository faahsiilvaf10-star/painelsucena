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
  ExternalLink
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatrixProgress } from "@/hooks/useMatrixProgress";
import { CelebrationModal } from "@/components/matriz/CelebrationModal";
interface CargoTarefa {
  id: string;
  nome: string;
}

interface CargoFolder {
  id: string;
  cargo: string;
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
        <div className="container mx-auto px-6 py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6 gap-2"
            onClick={() => setSelectedFolder(null)}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-16 h-16 rounded-2xl ${selectedFolder.iconBg} flex items-center justify-center`}>
              <div className={selectedFolder.iconColor}>{selectedFolder.icon}</div>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{selectedFolder.cargo}</h1>
              <p className="text-muted-foreground">
                {completedCount}/{selectedFolder.tarefas.length} atividades concluídas
              </p>
            </div>
            <Badge 
              variant={progress === 100 ? "default" : "secondary"} 
              className={`ml-auto text-lg px-4 py-2 ${progress === 100 ? "bg-green-500" : ""}`}
            >
              {progress}%
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="h-3" />
          </div>

          {/* Tasks */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h2 className="font-semibold">Atividades</h2>
            </div>
            <ul className="divide-y divide-border/50">
              {selectedFolder.tarefas.map((tarefa, index) => {
                const completed = isCompleted(tarefa.id);
                return (
                  <li
                    key={tarefa.id}
                    onClick={() => toggleTask(tarefa.id)}
                    className={`flex items-center gap-4 p-5 cursor-pointer transition-all duration-300 animate-fade-in ${
                      completed 
                        ? "bg-green-500/10 hover:bg-green-500/20" 
                        : "hover:bg-secondary/30"
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`transition-all duration-300 ${completed ? "scale-110" : "scale-100"}`}>
                      {completed ? (
                        <CheckCircle2 className={`w-6 h-6 ${selectedFolder.iconColor}`} />
                      ) : (
                        <Circle className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className={`font-medium flex-1 transition-all duration-300 ${
                      completed ? "line-through text-muted-foreground" : ""
                    }`}>
                      {tarefa.nome}
                    </span>
                    {completed && (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/50">
                        Concluído
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Layout>
    );
  }

  // Grid View
  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Matriz de Responsabilidades</h1>
              <p className="text-muted-foreground">
                Selecione uma função para visualizar e atualizar o progresso das atividades.
              </p>
              <p className="text-orange-500 text-sm mt-2">
                * O progresso é zerado automaticamente no dia 01 de cada mês.
              </p>
            </div>
            
            {/* Forms Link Button */}
            <a
              href="https://forms.office.com/Pages/ResponsePage.aspx?id=kYkdvChKUkWrwaznrhCCdO-80STG5SxAvb9Y_fx1cCNUQjVWRVRNSlE0Q08xNFhVNlFDSEFVTUJFNy4u"
              target="_blank"
              rel="noopener noreferrer"
              title="Clica aqui para preencher no Forms"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl group"
            >
              <ClipboardList className="w-5 h-5" />
              <span className="font-medium">Preencher Forms</span>
              <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cargoFolders.map((folder, index) => {
            const progress = getProgress(folder);
            
            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolder(folder)}
                className={`bg-card rounded-2xl border border-border/50 border-t-4 ${folder.borderColor} p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in group`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${folder.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <div className={folder.iconColor}>{folder.icon}</div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2">{folder.cargo}</h3>

                {/* Activities Count */}
                <div className="flex items-center gap-2 text-muted-foreground mb-6">
                  <Folder className="w-4 h-4" />
                  <span className="text-sm">{folder.tarefas.length} atividades cadastradas</span>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Progresso
                    </span>
                    <span className={`text-sm font-bold ${progress === 100 ? "text-green-500" : ""}`}>
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
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
