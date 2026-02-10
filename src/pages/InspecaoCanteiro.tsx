import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Lock, Unlock, Trash2, CheckCircle2, Circle, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  useSiteInspections,
  useSiteInspectionTasks,
  useCreateSiteInspection,
  useToggleLockInspection,
  useToggleTaskCompletion,
  useDeleteSiteInspection,
} from "@/hooks/useSiteInspections";
import { CalendarIcon } from "lucide-react";
import Layout from "@/components/layout/Layout";

function InspectionDetail({ inspection }: { inspection: { id: string; inspection_date: string; is_locked: boolean } }) {
  const { data: tasks = [] } = useSiteInspectionTasks(inspection.id);
  const toggleLock = useToggleLockInspection();
  const toggleTask = useToggleTaskCompletion();
  const deleteInspection = useDeleteSiteInspection();
  const { isAdmin } = useIsAdmin();

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggleTask = (taskId: string, currentState: boolean) => {
    if (!inspection.is_locked) {
      toast.error("Bloqueie a inspeção antes de marcar os itens concluídos.");
      return;
    }
    toggleTask.mutate({ id: taskId, is_completed: !currentState });
  };

  return (
    <Card className="border border-border/40 backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              {format(new Date(inspection.inspection_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <Badge variant={inspection.is_locked ? "default" : "secondary"}>
              {inspection.is_locked ? "Bloqueado" : "Aberto"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleLock.mutate({ id: inspection.id, is_locked: !inspection.is_locked })}
              className="h-8 px-2"
            >
              {inspection.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="ml-1 text-xs">{inspection.is_locked ? "Desbloquear" : "Bloquear"}</span>
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("Deseja excluir esta inspeção?")) {
                    deleteInspection.mutate(inspection.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress value={percentage} className="h-3" />
          </div>
          <span className="text-sm font-bold text-primary whitespace-nowrap">{percentage}%</span>
        </div>

        {totalCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum ponto registrado.</p>
        )}

        <div className="space-y-1.5">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleToggleTask(task.id, task.is_completed)}
              disabled={!inspection.is_locked}
              className={cn(
                "flex items-center gap-2 w-full text-left p-2 rounded-lg transition-colors text-sm",
                inspection.is_locked
                  ? "hover:bg-muted/50 cursor-pointer"
                  : "opacity-60 cursor-not-allowed",
                task.is_completed && "bg-primary/5"
              )}
            >
              {task.is_completed ? (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={cn(task.is_completed && "line-through text-muted-foreground")}>
                {task.description}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InspecaoCanteiro() {
  const { user } = useAuth();
  const { data: inspections = [], isLoading } = useSiteInspections();
  const createInspection = useCreateSiteInspection();

  const [date, setDate] = useState<Date>(new Date());
  const [taskInputs, setTaskInputs] = useState<string[]>([""]);

  const addTaskInput = () => setTaskInputs((prev) => [...prev, ""]);

  const updateTaskInput = (index: number, value: string) => {
    setTaskInputs((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const removeTaskInput = (index: number) => {
    if (taskInputs.length <= 1) return;
    setTaskInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!user) return;
    const validTasks = taskInputs.map((t) => t.trim()).filter(Boolean);
    if (validTasks.length === 0) {
      toast.error("Adicione pelo menos um ponto de melhoria.");
      return;
    }

    createInspection.mutate(
      {
        inspection_date: format(date, "yyyy-MM-dd"),
        created_by: user.id,
        tasks: validTasks,
      },
      {
        onSuccess: () => {
          toast.success("Inspeção criada com sucesso!");
          setTaskInputs([""]);
          setDate(new Date());
        },
        onError: () => toast.error("Erro ao criar inspeção."),
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Inspeção de Canteiro</h1>
            <p className="text-sm text-muted-foreground">Registre e acompanhe os pontos de melhoria</p>
          </div>
        </div>

        {/* Create new inspection */}
        <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nova Inspeção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Data:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Pontos de Melhoria:</span>
              {taskInputs.map((value, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Ponto ${idx + 1}...`}
                    value={value}
                    onChange={(e) => updateTaskInput(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTaskInput();
                      }
                    }}
                  />
                  {taskInputs.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeTaskInput(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addTaskInput} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar Ponto
              </Button>
            </div>

            <Button onClick={handleCreate} disabled={createInspection.isPending} className="w-full">
              Salvar Inspeção
            </Button>
          </CardContent>
        </Card>

        {/* List of inspections */}
        {isLoading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : inspections.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma inspeção registrada.</p>
        ) : (
          <div className="space-y-4">
            {inspections.map((insp) => (
              <InspectionDetail key={insp.id} inspection={insp} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
