
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Copy, Loader2, CheckCircle2, Leaf, Hammer } from "lucide-react";
import { toast } from "sonner";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlannedActivitiesTabProps {
  selectedDate: Date;
  gabiaoActivities: string[];
  jardinagemActivities: string[];
  initialPlanned?: { gabiao: string[]; jardinagem: string[] } | null;
  onSave: (planned: { gabiao: string[]; jardinagem: string[] }) => Promise<void>;
  isSaving?: boolean;
  canEdit?: boolean;
}

export function PlannedActivitiesTab({
  selectedDate,
  gabiaoActivities,
  jardinagemActivities,
  initialPlanned,
  onSave,
  isSaving = false,
  canEdit = true,
}: PlannedActivitiesTabProps) {
  const [plannedGabiao, setPlannedGabiao] = useState<string[]>(initialPlanned?.gabiao || []);
  const [plannedJardinagem, setPlannedJardinagem] = useState<string[]>(initialPlanned?.jardinagem || []);

  const toggleGabiao = (activity: string) => {
    if (!canEdit) return;
    setPlannedGabiao(prev => 
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  };

  const toggleJardinagem = (activity: string) => {
    if (!canEdit) return;
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

  const handleSaveInternal = async () => {
    await onSave({ gabiao: plannedGabiao, jardinagem: plannedJardinagem });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Jardinagem Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-500" />
              Jardinagem
            </CardTitle>
            <CardDescription>Selecione as atividades previstas para jardinagem</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {jardinagemActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma atividade base encontrada.</p>
                ) : (
                  jardinagemActivities.map((activity, i) => (
                    <div 
                      key={i} 
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleJardinagem(activity)}
                    >
                      <Checkbox 
                        id={`jard-${i}`} 
                        checked={plannedJardinagem.includes(activity)}
                        onCheckedChange={() => toggleJardinagem(activity)}
                        disabled={!canEdit}
                      />
                      <Label htmlFor={`jard-${i}`} className="text-sm cursor-pointer flex-1 leading-tight">
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Hammer className="h-5 w-5 text-orange-500" />
              Gabião
            </CardTitle>
            <CardDescription>Selecione as atividades previstas para gabião</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {gabiaoActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma atividade base encontrada.</p>
                ) : (
                  gabiaoActivities.map((activity, i) => (
                    <div 
                      key={i} 
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleGabiao(activity)}
                    >
                      <Checkbox 
                        id={`gab-${i}`} 
                        checked={plannedGabiao.includes(activity)}
                        onCheckedChange={() => toggleGabiao(activity)}
                        disabled={!canEdit}
                      />
                      <Label htmlFor={`gab-${i}`} className="text-sm cursor-pointer flex-1 leading-tight">
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
          <Button onClick={handleSaveInternal} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Salvar Planejamento
          </Button>
        )}
      </div>

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
