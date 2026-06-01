import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Copy, Loader2, CheckCircle2, Leaf, Hammer, Lock, Save, Unlock } from "lucide-react";
import { toast } from "sonner";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlannedActivitiesTabProps {
  selectedDate: Date;
  gabiaoActivities: string[];
  jardinagemActivities: string[];
  initialPlanned?: { gabiao: string[]; jardinagem: string[] } | null;
  onSave: (planned: { gabiao: string[]; jardinagem: string[] }) => Promise<void>;
  isSaving?: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export function PlannedActivitiesTab({
  selectedDate,
  gabiaoActivities,
  jardinagemActivities,
  initialPlanned,
  onSave,
  isSaving = false,
  canEdit = true,
  isAdmin = false,
}: PlannedActivitiesTabProps) {
  const [plannedGabiao, setPlannedGabiao] = useState<string[]>(initialPlanned?.gabiao || []);
  const [plannedJardinagem, setPlannedJardinagem] = useState<string[]>(initialPlanned?.jardinagem || []);
  const [isGabiaoLocked, setIsGabiaoLocked] = useState(false);
  const [isJardinagemLocked, setIsJardinagemLocked] = useState(false);
  const [showConfirmGabiao, setShowConfirmGabiao] = useState(false);
  const [showConfirmJardinagem, setShowConfirmJardinagem] = useState(false);

  useEffect(() => {
    setPlannedGabiao(initialPlanned?.gabiao || []);
    setPlannedJardinagem(initialPlanned?.jardinagem || []);
    // Simple logic: if there are saved activities, we could consider it locked or let user lock it
    // But the request says "when saving it will be blocked", so we'll handle it via state
  }, [initialPlanned]);

  const toggleGabiao = (activity: string) => {
    if (!canEdit || isGabiaoLocked) return;
    setPlannedGabiao(prev => 
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  };

  const toggleJardinagem = (activity: string) => {
    if (!canEdit || isJardinagemLocked) return;
    setPlannedJardinagem(prev => 
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  };

  const generatePreview = () => {
    const lines: string[] = ["📋 ATIVIDADES PREVISTAS", ""];
    
    if (plannedGabiao.length > 0) {
      lines.push("🏗️ GABIÃO");
      plannedGabiao.forEach(a => lines.push(`✅ ${a}`));
      lines.push("");
    }

    if (plannedJardinagem.length > 0) {
      lines.push("🌱 JARDINAGEM");
      plannedJardinagem.forEach(a => lines.push(`✅ ${a}`));
      lines.push("");
    }

    lines.push(`Data: ${format(selectedDate, "dd/MM/yyyy")}`);
    return lines.join("\n");
  };

  const handleWhatsApp = async () => {
    const text = generatePreview();
    const ok = await copyAndShareWhatsApp(text);
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopy = async () => {
    const text = generatePreview();
    const ok = await copyToClipboard(text);
    if (ok) toast.success("Mensagem copiada!");
    else toast.error("Erro ao copiar");
  };

  const handleConfirmSaveGabiao = async () => {
    await onSave({ gabiao: plannedGabiao, jardinagem: plannedJardinagem });
    setIsGabiaoLocked(true);
    setShowConfirmGabiao(false);
  };

  const handleConfirmSaveJardinagem = async () => {
    await onSave({ gabiao: plannedGabiao, jardinagem: plannedJardinagem });
    setIsJardinagemLocked(true);
    setShowConfirmJardinagem(false);
  };

  const handleSaveInternal = async () => {
    await onSave({ gabiao: plannedGabiao, jardinagem: plannedJardinagem });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Jardinagem Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-500" />
                Jardinagem
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {isAdmin && (isJardinagemLocked || isGabiaoLocked) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsJardinagemLocked(false);
                        setIsGabiaoLocked(false);
                        toast.info("Atividades desbloqueadas para edição");
                      }}
                      className="h-8 gap-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      Desbloquear
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant={isJardinagemLocked ? "secondary" : "default"}
                    disabled={isJardinagemLocked || isSaving}
                    onClick={() => setShowConfirmJardinagem(true)}
                    className="h-8 gap-1"
                  >
                    {isJardinagemLocked ? <Lock className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    {isJardinagemLocked ? "Bloqueado" : "Salvar"}
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>Selecione as atividades previstas para jardinagem</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className={cn("space-y-2", isJardinagemLocked && "opacity-60 pointer-events-none")}>
                {jardinagemActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma atividade base encontrada.</p>
                ) : (
                  jardinagemActivities.map((activity, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md transition-colors",
                        !isJardinagemLocked && "hover:bg-muted/50 cursor-pointer"
                      )}
                      onClick={() => !isJardinagemLocked && toggleJardinagem(activity)}
                    >
                      <Checkbox 
                        id={`jard-${i}`} 
                        checked={plannedJardinagem.includes(activity)}
                        onCheckedChange={() => !isJardinagemLocked && toggleJardinagem(activity)}
                        disabled={!canEdit || isJardinagemLocked}
                      />
                      <Label htmlFor={`jard-${i}`} className={cn("text-sm flex-1 leading-tight", !isJardinagemLocked && "cursor-pointer")}>
                        {activity}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Gabião Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hammer className="h-5 w-5 text-orange-500" />
                Gabião
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {isAdmin && (isGabiaoLocked || isJardinagemLocked) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsGabiaoLocked(false);
                        setIsJardinagemLocked(false);
                        toast.info("Atividades desbloqueadas para edição");
                      }}
                      className="h-8 gap-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      Desbloquear
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant={isGabiaoLocked ? "secondary" : "default"}
                    disabled={isGabiaoLocked || isSaving}
                    onClick={() => setShowConfirmGabiao(true)}
                    className="h-8 gap-1"
                  >
                    {isGabiaoLocked ? <Lock className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    {isGabiaoLocked ? "Bloqueado" : "Salvar"}
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>Selecione as atividades previstas para gabião</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className={cn("space-y-2", isGabiaoLocked && "opacity-60 pointer-events-none")}>
                {gabiaoActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma atividade base encontrada.</p>
                ) : (
                  gabiaoActivities.map((activity, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md transition-colors",
                        !isGabiaoLocked && "hover:bg-muted/50 cursor-pointer"
                      )}
                      onClick={() => !isGabiaoLocked && toggleGabiao(activity)}
                    >
                      <Checkbox 
                        id={`gab-${i}`} 
                        checked={plannedGabiao.includes(activity)}
                        onCheckedChange={() => !isGabiaoLocked && toggleGabiao(activity)}
                        disabled={!canEdit || isGabiaoLocked}
                      />
                      <Label htmlFor={`gab-${i}`} className={cn("text-sm flex-1 leading-tight", !isGabiaoLocked && "cursor-pointer")}>
                        {activity}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {canEdit && (
          <Button 
            onClick={handleSaveInternal} 
            disabled={isSaving || (isGabiaoLocked && isJardinagemLocked)} 
            className="w-full"
            variant="outline"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Salvar Tudo
          </Button>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showConfirmGabiao} onOpenChange={setShowConfirmGabiao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar bloqueio de Gabião?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao salvar e bloquear, as atividades de Gabião não poderão mais ser alteradas.
              <div className="mt-4 p-3 bg-muted rounded-md border text-foreground text-sm">
                <p className="font-semibold mb-2">Atividades selecionadas:</p>
                {plannedGabiao.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {plannedGabiao.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                ) : (
                  <p className="italic text-muted-foreground">Nenhuma atividade selecionada.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSaveGabiao}>Sim, Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmJardinagem} onOpenChange={setShowConfirmJardinagem}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar bloqueio de Jardinagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao salvar e bloquear, as atividades de Jardinagem não poderão mais ser alteradas.
              <div className="mt-4 p-3 bg-muted rounded-md border text-foreground text-sm">
                <p className="font-semibold mb-2">Atividades selecionadas:</p>
                {plannedJardinagem.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {plannedJardinagem.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                ) : (
                  <p className="italic text-muted-foreground">Nenhuma atividade selecionada.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSaveJardinagem}>Sim, Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Column */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Preview da Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm min-h-[400px] whitespace-pre-wrap">
              {generatePreview()}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleWhatsApp} className="gap-2">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                WhatsApp
              </Button>
              <Button variant="outline" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copiar Mensagem
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
