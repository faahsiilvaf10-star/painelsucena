import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SlideData } from "@/hooks/usePresentations";

interface SlideGeneratorProps {
  onGenerated: (slides: SlideData[], title: string) => void;
}

export function SlideGenerator({ onGenerated }: SlideGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState("6");
  const [includeSystemData, setIncludeSystemData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Digite um tema ou descrição para a apresentação.");
      return;
    }

    setIsGenerating(true);
    try {
      // Optionally fetch system data
      let dataContext: any = null;
      if (includeSystemData) {
        const [goalsRes, reportsRes] = await Promise.all([
          supabase.from("goals").select("*").order("month_year", { ascending: false }).limit(3),
          supabase.from("rdo_reports").select("report_date, report_text, weather_morning, weather_afternoon, gabiao_activities, jardinagem_activities").order("report_date", { ascending: false }).limit(5),
        ]);
        dataContext = {
          metas_recentes: goalsRes.data || [],
          relatorios_recentes: (reportsRes.data || []).map((r: any) => ({
            data: r.report_date,
            texto: r.report_text?.substring(0, 200),
            atividades_gabiao: r.gabiao_activities?.substring(0, 100),
            atividades_jardinagem: r.jardinagem_activities?.substring(0, 100),
          })),
        };
      }

      const { data, error } = await supabase.functions.invoke("generate-slides", {
        body: {
          prompt: prompt.trim(),
          slideCount: parseInt(slideCount),
          includeSystemData,
          dataContext,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.slides?.length) throw new Error("Nenhum slide gerado");

      const title = data.slides[0]?.title || prompt.substring(0, 50);
      onGenerated(data.slides, title);
      toast.success(`${data.slides.length} slides gerados com sucesso!`);
    } catch (err: any) {
      console.error("Slide generation error:", err);
      toast.error(err.message || "Erro ao gerar slides");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Gerar Apresentação com IA
        </CardTitle>
        <CardDescription>
          Descreva o tema da apresentação e a IA criará os slides automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tema / Descrição</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Relatório mensal de progresso da obra com dados de metas e atividades realizadas..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantidade de slides</Label>
            <Select value={slideCount} onValueChange={setSlideCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 slides</SelectItem>
                <SelectItem value="6">6 slides</SelectItem>
                <SelectItem value="8">8 slides</SelectItem>
                <SelectItem value="10">10 slides</SelectItem>
                <SelectItem value="12">12 slides</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Incluir dados do sistema</Label>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={includeSystemData} onCheckedChange={setIncludeSystemData} />
              <span className="text-sm text-muted-foreground">
                {includeSystemData ? "Sim" : "Não"}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando slides...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Apresentação
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
