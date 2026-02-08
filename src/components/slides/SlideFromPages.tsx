import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, LayoutGrid, Target, FileText, ClipboardList, Leaf, Hammer, Truck, Droplets, Package, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SlideData } from "@/hooks/usePresentations";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SlideFromPagesProps {
  onGenerated: (slides: SlideData[], title: string) => void;
}

interface PageOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  fetchData: () => Promise<any>;
}

const todayStr = () => format(new Date(), "yyyy-MM-dd");
const last30 = () => format(subDays(new Date(), 30), "yyyy-MM-dd");
const currentMonthYear = () => format(new Date(), "yyyy-MM");

const pageOptions: PageOption[] = [
  {
    id: "metas",
    label: "Metas",
    icon: <Target className="w-4 h-4" />,
    description: "Metas mensais e progresso de atividades",
    fetchData: async () => {
      const { data } = await supabase.from("goals").select("*").order("month_year", { ascending: false }).limit(3);
      return { tipo: "Metas", dados: data || [] };
    },
  },
  {
    id: "rdo",
    label: "RDO",
    icon: <FileText className="w-4 h-4" />,
    description: "Relatórios diários de obra recentes",
    fetchData: async () => {
      const { data } = await supabase.from("rdo_reports").select("report_date, report_text, weather_morning, weather_afternoon, gabiao_activities, jardinagem_activities, difficulties, photo_urls").order("report_date", { ascending: false }).limit(7);
      return {
        tipo: "RDO - Relatórios Diários",
        dados: (data || []).map((r: any) => ({
          data: r.report_date,
          resumo: r.report_text?.substring(0, 300),
          clima_manha: r.weather_morning,
          clima_tarde: r.weather_afternoon,
          atividades_gabiao: r.gabiao_activities?.substring(0, 200),
          atividades_jardinagem: r.jardinagem_activities?.substring(0, 200),
          dificuldades: r.difficulties?.substring(0, 150),
          tem_fotos: (r.photo_urls?.length || 0) > 0,
        })),
      };
    },
  },
  {
    id: "atividades",
    label: "Atividades I (Jardinagem)",
    icon: <Leaf className="w-4 h-4" />,
    description: "Relatórios de atividades de jardinagem",
    fetchData: async () => {
      const { data } = await supabase.from("daily_jardinagem_reports").select("*").order("report_date", { ascending: false }).limit(7);
      return {
        tipo: "Atividades de Jardinagem",
        dados: (data || []).map((r: any) => ({
          data: r.report_date,
          local: r.local_faixa,
          rocagem_m2: r.rocagem_m2,
          plantio_unidade: r.plantio_unidade,
          podagem_unidade: r.podagem_unidade,
          limpeza_manual_m2: r.limpeza_manual_m2,
          limpeza_assoprador_m2: r.limpeza_assoprador_m2,
          coroamento_unidade: r.coroamento_unidade,
          adubagem_unidade: r.adubagem_unidade,
          tem_fotos: (r.photo_urls?.length || 0) > 0,
        })),
      };
    },
  },
  {
    id: "atividades-ii",
    label: "Atividades II (Gabião)",
    icon: <Hammer className="w-4 h-4" />,
    description: "Relatórios de atividades de gabião",
    fetchData: async () => {
      const { data } = await supabase.from("daily_gabiao_reports").select("*").order("report_date", { ascending: false }).limit(7);
      return {
        tipo: "Atividades de Gabião",
        dados: (data || []).map((r: any) => ({
          data: r.report_date,
          local: r.local_servico,
          recomposicao_gabiao_m: r.recomposicao_gabiao_m,
          reparo_cerca_m: r.reparo_cerca_m,
          limpeza_canaleta_m: r.limpeza_canaleta_m,
          limpeza_bueiro_unidade: r.limpeza_bueiro_unidade,
          manutencao_drenagem_m: r.manutencao_drenagem_m,
          tem_fotos: (r.photo_urls?.length || 0) > 0,
        })),
      };
    },
  },
  {
    id: "presenca",
    label: "Presença",
    icon: <ClipboardList className="w-4 h-4" />,
    description: "Dados de presença e frequência de funcionários",
    fetchData: async () => {
      const { data } = await supabase.from("attendance_records").select("date, status").gte("date", last30()).order("date", { ascending: false });
      const records = data || [];
      const total = records.length;
      const presentes = records.filter((r: any) => r.status === "present").length;
      const ausentes = records.filter((r: any) => r.status === "absent").length;
      const atestados = records.filter((r: any) => r.status === "medical_leave").length;
      return {
        tipo: "Presença (últimos 30 dias)",
        resumo: { total_registros: total, presentes, ausentes, atestados, taxa_presenca: total > 0 ? `${((presentes / total) * 100).toFixed(1)}%` : "N/A" },
      };
    },
  },
  {
    id: "parte-diaria",
    label: "Parte Diária",
    icon: <Truck className="w-4 h-4" />,
    description: "Registros de equipamentos e turnos",
    fetchData: async () => {
      const { data } = await supabase.from("daily_shift_records").select("shift_date, equipment_name, driver_name, plate, initial_horimeter, final_horimeter, initial_km, final_km").order("shift_date", { ascending: false }).limit(10);
      return {
        tipo: "Parte Diária - Equipamentos",
        dados: (data || []).map((r: any) => ({
          data: r.shift_date,
          equipamento: r.equipment_name,
          motorista: r.driver_name,
          placa: r.plate,
          horimetro_inicial: r.initial_horimeter,
          horimetro_final: r.final_horimeter,
          km_inicial: r.initial_km,
          km_final: r.final_km,
        })),
      };
    },
  },
  {
    id: "consumo",
    label: "Consumo Abastecimento",
    icon: <Droplets className="w-4 h-4" />,
    description: "Dados de consumo de combustível",
    fetchData: async () => {
      const { data } = await supabase.from("equipment").select("name, plate, start_hour, end_hour, equipment_type").order("name");
      return {
        tipo: "Equipamentos e Horímetros",
        dados: (data || []).map((e: any) => ({
          equipamento: e.name,
          placa: e.plate,
          tipo: e.equipment_type,
          horimetro_inicio: e.start_hour,
          horimetro_fim: e.end_hour,
          horas_trabalhadas: e.end_hour - e.start_hour,
        })),
      };
    },
  },
  {
    id: "estoque",
    label: "Estoque",
    icon: <Package className="w-4 h-4" />,
    description: "Itens em estoque e movimentações",
    fetchData: async () => {
      const { data } = await supabase.from("inventory_items").select("name, category, quantity, min_quantity, unit").order("name");
      const items = data || [];
      const baixoEstoque = items.filter((i: any) => i.quantity <= i.min_quantity);
      return {
        tipo: "Estoque",
        total_itens: items.length,
        itens_baixo_estoque: baixoEstoque.length,
        categorias: [...new Set(items.map((i: any) => i.category))],
        itens_criticos: baixoEstoque.slice(0, 10).map((i: any) => ({ nome: i.name, quantidade: i.quantity, minimo: i.min_quantity, unidade: i.unit })),
      };
    },
  },
];

export function SlideFromPages({ onGenerated }: SlideFromPagesProps) {
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState("8");
  const [isGenerating, setIsGenerating] = useState(false);

  const togglePage = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const handleGenerate = async () => {
    if (selectedPages.length === 0) {
      toast.error("Selecione pelo menos uma página para gerar os slides.");
      return;
    }

    setIsGenerating(true);
    try {
      // Fetch data from all selected pages in parallel
      const selectedOptions = pageOptions.filter((p) => selectedPages.includes(p.id));
      const dataResults = await Promise.all(selectedOptions.map((p) => p.fetchData()));

      const dataContext = dataResults.reduce((acc, result, index) => {
        acc[selectedOptions[index].id] = result;
        return acc;
      }, {} as Record<string, any>);

      const pagesDescription = selectedOptions.map((p) => p.label).join(", ");

      const fullPrompt = `Crie uma apresentação profissional com gráficos e dados visuais baseada nos dados das seguintes páginas do sistema: ${pagesDescription}.

INSTRUÇÕES IMPORTANTES:
- Use layout "stats" para dados numéricos com estatísticas claras (label + value)
- Use layout "two-column" para comparações e dados lado a lado  
- Use layout "content" com listas em markdown para resumos
- Inclua emojis relevantes nos títulos para tornar visual
- Para dados de produção, crie slides de gráfico descritivo (descreva o gráfico em texto, ex: "📊 Gráfico: Rocagem cresceu 15% no período")
- Inclua um slide de resumo executivo no início e conclusão/próximos passos no final
${prompt ? `\nINSTRUÇÕES ADICIONAIS DO USUÁRIO: ${prompt}` : ""}

DADOS DO SISTEMA:
${JSON.stringify(dataContext, null, 2)}`;

      const { data, error } = await supabase.functions.invoke("generate-slides", {
        body: {
          prompt: fullPrompt,
          slideCount: parseInt(slideCount),
          includeSystemData: false,
          dataContext: null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.slides?.length) throw new Error("Nenhum slide gerado");

      const title = data.slides[0]?.title || `Relatório - ${pagesDescription}`;
      onGenerated(data.slides, title);
      toast.success(`${data.slides.length} slides gerados com dados de ${selectedPages.length} página(s)!`);
    } catch (err: any) {
      console.error("Page slides generation error:", err);
      toast.error(err.message || "Erro ao gerar slides");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Gerar com Dados do Sistema
        </CardTitle>
        <CardDescription>
          Selecione as páginas e a IA criará slides com gráficos e dados reais extraídos do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Page selection grid */}
        <div className="space-y-2">
          <Label>Selecione as páginas</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pageOptions.map((page) => {
              const isSelected = selectedPages.includes(page.id);
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => togglePage(page.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <Checkbox checked={isSelected} className="mt-0.5 pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {page.icon}
                      <span className="text-sm font-medium truncate">{page.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{page.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedPages.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedPages.length} página(s) selecionada(s)
            </p>
          )}
        </div>

        {/* Slide count */}
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
              <SelectItem value="15">15 slides</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional instructions */}
        <div className="space-y-2">
          <Label>Instruções adicionais (opcional)</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Foque nos resultados do último mês, compare com as metas, destaque os itens críticos do estoque..."
            rows={2}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedPages.length === 0}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Buscando dados e gerando slides...
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4 mr-2" />
              Gerar Slides com Dados ({selectedPages.length} página{selectedPages.length !== 1 ? "s" : ""})
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
