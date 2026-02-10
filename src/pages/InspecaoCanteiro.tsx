import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Lock, Unlock, Trash2, CheckCircle2, Circle, ClipboardCheck, Camera, ImageIcon, X, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  useUpdateTaskPhoto,
  uploadInspectionPhoto,
  type SiteInspectionTask,
} from "@/hooks/useSiteInspections";
import Layout from "@/components/layout/Layout";

function PhotoThumbnail({
  url,
  type,
  onUpload,
  disabled,
}: {
  url: string | null;
  type: "before" | "after";
  onUpload: (file: File) => void;
  disabled?: boolean;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emoji = type === "before" ? "❌" : "✅";
  const label = type === "before" ? "Antes" : "Depois";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx. 10MB)");
        return;
      }
      onUpload(file);
    }
    e.target.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {url ? (
        <button
          onClick={() => setViewOpen(true)}
          className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 group flex-shrink-0"
        >
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <span className="absolute top-0.5 right-0.5 text-base leading-none drop-shadow-md">{emoji}</span>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </button>
      ) : (
        <button
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-colors",
            disabled
              ? "border-muted opacity-40 cursor-not-allowed"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          )}
        >
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="text-xs leading-none">{emoji}</span>
        </button>
      )}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <div className="relative flex items-center justify-center">
            {url && (
              <img src={url} alt={label} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            )}
            <span className="absolute top-2 left-2 text-3xl drop-shadow-lg">{emoji}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskRow({
  task,
  isLocked,
  onToggle,
}: {
  task: SiteInspectionTask;
  isLocked: boolean;
  onToggle: () => void;
}) {
  const updatePhoto = useUpdateTaskPhoto();
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);

  const handleUpload = async (file: File, type: "before" | "after") => {
    setUploading(type);
    try {
      const url = await uploadInspectionPhoto(file, task.id, type);
      const field = type === "before" ? "before_photo_url" : "after_photo_url";
      await updatePhoto.mutateAsync({ id: task.id, field, url });
      toast.success(`Foto "${type === "before" ? "Antes" : "Depois"}" enviada!`);
    } catch {
      toast.error("Erro ao enviar foto.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl transition-colors border border-transparent",
        task.is_completed ? "bg-primary/5 border-primary/10" : "hover:bg-muted/30"
      )}
    >
      {/* Checkbox area */}
      <button
        onClick={onToggle}
        disabled={!isLocked}
        className={cn(
          "mt-0.5 flex-shrink-0",
          !isLocked && "opacity-40 cursor-not-allowed"
        )}
      >
        {task.is_completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Description + photos */}
      <div className="flex-1 min-w-0 space-y-2">
        <span className={cn("text-sm block", task.is_completed && "line-through text-muted-foreground")}>
          {task.description}
        </span>

        {/* Photo row */}
        <div className="flex items-center gap-2">
          <PhotoThumbnail
            url={task.before_photo_url}
            type="before"
            onUpload={(f) => handleUpload(f, "before")}
            disabled={!!uploading}
          />
          <PhotoThumbnail
            url={task.after_photo_url}
            type="after"
            onUpload={(f) => handleUpload(f, "after")}
            disabled={!!uploading}
          />
          {uploading && (
            <span className="text-xs text-muted-foreground animate-pulse">Enviando...</span>
          )}
        </div>
      </div>
    </div>
  );
}

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
        {/* Progress bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress value={percentage} className="h-3" />
          </div>
          <span className="text-sm font-bold text-primary whitespace-nowrap">{percentage}%</span>
        </div>

        {totalCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum ponto registrado.</p>
        )}

        <div className="space-y-1">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isLocked={inspection.is_locked}
              onToggle={() => handleToggleTask(task.id, task.is_completed)}
            />
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
