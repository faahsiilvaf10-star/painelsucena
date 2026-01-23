import { useState } from "react";
import { HelpCircle, FolderOpen, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
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

interface CargoTarefa {
  id: string;
  nome: string;
}

interface CargoFolder {
  id: string;
  cargo: string;
  tarefas: CargoTarefa[];
  color: string;
}

const cargoFolders: CargoFolder[] = [
  {
    id: "preposto",
    cargo: "Preposto",
    color: "bg-primary",
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
    color: "bg-warning",
    tarefas: [
      { id: "eg1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "eg2", nome: "Observação de Tarefa" },
      { id: "eg3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-i",
    cargo: "Encarregado I",
    color: "bg-info",
    tarefas: [
      { id: "e1-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e1-2", nome: "Observação de Tarefa" },
      { id: "e1-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "encarregado-ii",
    cargo: "Encarregado II",
    color: "bg-success",
    tarefas: [
      { id: "e2-1", nome: "Evento sem Lesão / Condição de Risco" },
      { id: "e2-2", nome: "Observação de Tarefa" },
      { id: "e2-3", nome: "Inspeção de HSE" },
    ],
  },
  {
    id: "tecnico-seguranca-i",
    cargo: "Técnico de Segurança I",
    color: "bg-destructive",
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
    color: "bg-orange-500",
    tarefas: [
      { id: "ts2-1", nome: "DDS da Liderança" },
      { id: "ts2-2", nome: "WOC - Caminhar, Observar e Conversar" },
      { id: "ts2-3", nome: "Inspeção de HSE" },
      { id: "ts2-4", nome: "Evento sem Lesão / Condição de Risco (ALTO RISCO)" },
      { id: "ts2-5", nome: "Coach em HSE" },
      { id: "ts2-6", nome: "Observação de Tarefa" },
    ],
  },
  {
    id: "tecnico-meio-ambiente",
    cargo: "Técnico Meio Ambiente",
    color: "bg-emerald-600",
    tarefas: [],
  },
];

const Matriz = () => {
  const [openFolders, setOpenFolders] = useState<string[]>([]);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const isOpen = (folderId: string) => openFolders.includes(folderId);

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
                  Clique em uma pasta para expandir e ver todas as tarefas atribuídas a cada cargo.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {cargoFolders.map((folder) => (
            <div
              key={folder.id}
              className="bg-card rounded-xl border border-border/50 p-4 text-center"
            >
              <div className={`w-10 h-10 rounded-lg ${folder.color} mx-auto mb-2 flex items-center justify-center`}>
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">{folder.cargo}</p>
              <p className="text-lg font-bold">{folder.tarefas.length}</p>
              <p className="text-xs text-muted-foreground">tarefas</p>
            </div>
          ))}
        </div>

        {/* Folders */}
        <div className="space-y-4">
          {cargoFolders.map((folder, index) => (
            <Collapsible
              key={folder.id}
              open={isOpen(folder.id)}
              onOpenChange={() => toggleFolder(folder.id)}
            >
              <div
                className="bg-card rounded-xl border border-border/50 overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg ${folder.color} flex items-center justify-center shadow-lg`}>
                        <FolderOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold">{folder.cargo}</h3>
                        <p className="text-sm text-muted-foreground">
                          {folder.tarefas.length} {folder.tarefas.length === 1 ? "tarefa" : "tarefas"} atribuídas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {folder.tarefas.length}
                      </Badge>
                      {isOpen(folder.id) ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border/50">
                    {folder.tarefas.length > 0 ? (
                      <ul className="divide-y divide-border/50">
                        {folder.tarefas.map((tarefa, tarefaIndex) => (
                          <li
                            key={tarefa.id}
                            className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors animate-fade-in"
                            style={{ animationDelay: `${tarefaIndex * 0.03}s` }}
                          >
                            <CheckCircle2 className={`w-5 h-5 ${folder.color.replace('bg-', 'text-')}`} />
                            <span className="font-medium">{tarefa.nome}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <p>Nenhuma tarefa atribuída a este cargo.</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Matriz;
