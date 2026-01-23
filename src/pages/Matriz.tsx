import { useState } from "react";
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  Crown,
  Users,
  UserCheck,
  UserCog,
  Shield,
  ShieldCheck,
  Leaf
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CargoTarefa {
  id: string;
  nome: string;
}

interface CargoFolder {
  id: string;
  cargo: string;
  tarefas: CargoTarefa[];
  color: string;
  bgGradient: string;
  icon: React.ReactNode;
}

const cargoFolders: CargoFolder[] = [
  {
    id: "preposto",
    cargo: "Preposto",
    color: "text-amber-500",
    bgGradient: "from-amber-500 to-amber-600",
    icon: <Crown className="w-6 h-6 text-white" />,
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
    color: "text-purple-500",
    bgGradient: "from-purple-500 to-purple-600",
    icon: <Users className="w-6 h-6 text-white" />,
    tarefas: [
      { id: "eg1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "eg2", nome: "Observação de Tarefa" },
      { id: "eg3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-i",
    cargo: "Encarregado I",
    color: "text-blue-500",
    bgGradient: "from-blue-500 to-blue-600",
    icon: <UserCheck className="w-6 h-6 text-white" />,
    tarefas: [
      { id: "e1-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e1-2", nome: "Observação de Tarefa" },
      { id: "e1-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-ii",
    cargo: "Encarregado II",
    color: "text-cyan-500",
    bgGradient: "from-cyan-500 to-cyan-600",
    icon: <UserCog className="w-6 h-6 text-white" />,
    tarefas: [
      { id: "e2-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e2-2", nome: "Observação de Tarefa" },
      { id: "e2-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "tecnico-seguranca-i",
    cargo: "Técnico de Segurança I",
    color: "text-red-500",
    bgGradient: "from-red-500 to-red-600",
    icon: <Shield className="w-6 h-6 text-white" />,
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
    cargo: "Técnico de Segurança II",
    color: "text-orange-500",
    bgGradient: "from-orange-500 to-orange-600",
    icon: <ShieldCheck className="w-6 h-6 text-white" />,
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
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const isOpen = (folderId: string) => openFolders.includes(folderId);
  const isCompleted = (taskId: string) => completedTasks.includes(taskId);

  const getProgress = (folder: CargoFolder) => {
    if (folder.tarefas.length === 0) return 0;
    const completed = folder.tarefas.filter((t) => completedTasks.includes(t.id)).length;
    return Math.round((completed / folder.tarefas.length) * 100);
  };

  const getCompletedCount = (folder: CargoFolder) => {
    return folder.tarefas.filter((t) => completedTasks.includes(t.id)).length;
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Matriz de Responsabilidade</h1>
            <p className="text-muted-foreground">
              Tarefas organizadas por cargo
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs p-4">
                <p className="font-bold mb-2">Como funciona?</p>
                <p className="text-sm text-muted-foreground">
                  Clique em uma pasta para expandir. Marque as tarefas concluídas para acompanhar o progresso.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {cargoFolders.map((folder) => {
            const progress = getProgress(folder);
            return (
              <div
                key={folder.id}
                className="bg-card rounded-xl border border-border/50 p-4 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${folder.bgGradient} mx-auto mb-3 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110`}>
                  {folder.icon}
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{folder.cargo}</p>
                <p className="text-2xl font-bold">{progress}%</p>
                <Progress value={progress} className="h-1.5 mt-2" />
              </div>
            );
          })}
        </div>

        {/* Folders */}
        <div className="space-y-4">
          {cargoFolders.map((folder, index) => {
            const progress = getProgress(folder);
            const completedCount = getCompletedCount(folder);
            
            return (
              <Collapsible
                key={folder.id}
                open={isOpen(folder.id)}
                onOpenChange={() => toggleFolder(folder.id)}
              >
                <div
                  className="bg-card rounded-xl border border-border/50 overflow-hidden animate-fade-in transition-all duration-300 hover:shadow-xl"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-all duration-300 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${folder.bgGradient} flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                          {folder.icon}
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold">{folder.cargo}</h3>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-muted-foreground">
                              {completedCount}/{folder.tarefas.length} tarefas concluídas
                            </p>
                            <Badge 
                              variant={progress === 100 ? "default" : "secondary"} 
                              className={`text-xs transition-all duration-300 ${progress === 100 ? "bg-green-500 text-white" : ""}`}
                            >
                              {progress}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 hidden sm:block">
                          <Progress value={progress} className="h-2" />
                        </div>
                        <div className={`transition-transform duration-300 ${isOpen(folder.id) ? "rotate-180" : ""}`}>
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="animate-accordion-down">
                    <div className="border-t border-border/50">
                      {folder.tarefas.length > 0 ? (
                        <ul className="divide-y divide-border/50">
                          {folder.tarefas.map((tarefa, tarefaIndex) => {
                            const completed = isCompleted(tarefa.id);
                            return (
                              <li
                                key={tarefa.id}
                                onClick={() => toggleTask(tarefa.id)}
                                className={`flex items-center gap-4 p-4 cursor-pointer transition-all duration-300 animate-fade-in ${
                                  completed 
                                    ? "bg-green-500/10 hover:bg-green-500/20" 
                                    : "hover:bg-secondary/20"
                                }`}
                                style={{ animationDelay: `${tarefaIndex * 0.05}s` }}
                              >
                                <div className={`transition-all duration-300 ${completed ? "scale-110" : "scale-100"}`}>
                                  {completed ? (
                                    <CheckCircle2 className={`w-6 h-6 ${folder.color} transition-all duration-300`} />
                                  ) : (
                                    <Circle className="w-6 h-6 text-muted-foreground transition-all duration-300 hover:text-foreground" />
                                  )}
                                </div>
                                <span className={`font-medium transition-all duration-300 ${
                                  completed 
                                    ? "line-through text-muted-foreground" 
                                    : ""
                                }`}>
                                  {tarefa.nome}
                                </span>
                                {completed && (
                                  <Badge variant="outline" className="ml-auto text-xs text-green-500 border-green-500/50 animate-scale-in">
                                    Concluído
                                  </Badge>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          <Leaf className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p>Nenhuma tarefa atribuída a este cargo.</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Matriz;
