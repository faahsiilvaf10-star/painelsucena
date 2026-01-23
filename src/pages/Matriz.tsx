import { useState } from "react";
import { Plus, HelpCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { raciMatrix, employees } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const raciLabels = {
  R: { label: "Responsible", description: "Responsável pela execução", class: "bg-primary text-primary-foreground" },
  A: { label: "Accountable", description: "Autoridade final / Prestador de contas", class: "bg-warning text-background" },
  C: { label: "Consulted", description: "Deve ser consultado", class: "bg-info text-background" },
  I: { label: "Informed", description: "Deve ser informado", class: "bg-success text-background" },
};

const Matriz = () => {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Matriz de Responsabilidade</h1>
            <p className="text-muted-foreground">
              Defina responsabilidades claras para cada tarefa
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
                <p className="font-bold mb-2">O que é RACI?</p>
                <ul className="space-y-1 text-sm">
                  <li><span className="font-semibold text-primary">R</span> - Responsible: Quem executa</li>
                  <li><span className="font-semibold text-warning">A</span> - Accountable: Quem aprova</li>
                  <li><span className="font-semibold text-info">C</span> - Consulted: Quem é consultado</li>
                  <li><span className="font-semibold text-success">I</span> - Informed: Quem é informado</li>
                </ul>
              </TooltipContent>
            </Tooltip>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Adicionar Tarefa</DialogTitle>
                  <DialogDescription>
                    Defina uma nova tarefa e suas responsabilidades
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task">Nome da Tarefa</Label>
                    <Input id="task" placeholder="Ex: Revisão de Código" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Responsável (R)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Aprovador (A)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="mt-4">Adicionar Tarefa</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-card rounded-xl border border-border/50">
          {Object.entries(raciLabels).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${value.class}`}>
                {key}
              </span>
              <span className="text-sm text-muted-foreground">{value.description}</span>
            </div>
          ))}
        </div>

        {/* Matrix Table */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 font-semibold text-muted-foreground min-w-[250px]">
                    Tarefa / Atividade
                  </th>
                  {employees.map((emp) => (
                    <th key={emp.id} className="p-4 text-center min-w-[100px]">
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                              {emp.avatar}
                            </div>
                            <span className="text-xs text-muted-foreground font-normal">
                              {emp.name.split(" ")[0]}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.role}</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raciMatrix.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in ${
                      selectedTask === item.id ? "bg-secondary/50" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => setSelectedTask(selectedTask === item.id ? null : item.id)}
                  >
                    <td className="p-4">
                      <p className="font-medium">{item.task}</p>
                    </td>
                    {employees.map((emp) => {
                      let role = null;
                      if (item.responsible.includes(emp.name)) role = "R";
                      else if (item.accountable === emp.name) role = "A";
                      else if (item.consulted.includes(emp.name)) role = "C";
                      else if (item.informed.includes(emp.name)) role = "I";

                      return (
                        <td key={emp.id} className="p-4 text-center">
                          {role && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span
                                  className={`inline-flex w-8 h-8 rounded-lg items-center justify-center font-bold text-sm ${
                                    raciLabels[role as keyof typeof raciLabels].class
                                  }`}
                                >
                                  {role}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {raciLabels[role as keyof typeof raciLabels].description}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Task Details */}
        {selectedTask && (
          <div className="mt-6 p-6 bg-card rounded-xl border border-border/50 animate-slide-up">
            {(() => {
              const task = raciMatrix.find((t) => t.id === selectedTask);
              if (!task) return null;
              return (
                <>
                  <h3 className="text-xl font-bold mb-4">{task.task}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-semibold text-primary mb-2">Responsável (R)</p>
                      <p className="text-sm">{task.responsible.join(", ")}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-sm font-semibold text-warning mb-2">Aprovador (A)</p>
                      <p className="text-sm">{task.accountable}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-info/10 border border-info/20">
                      <p className="text-sm font-semibold text-info mb-2">Consultados (C)</p>
                      <p className="text-sm">{task.consulted.join(", ") || "Nenhum"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm font-semibold text-success mb-2">Informados (I)</p>
                      <p className="text-sm">{task.informed.join(", ") || "Nenhum"}</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Matriz;
