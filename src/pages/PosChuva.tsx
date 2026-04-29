import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Save, History, Plus, Trash2, CloudRain, Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  CHECKLIST_PERGUNTAS,
  usePosChuvaInspections,
  useCreatePosChuva,
  type ChecklistItem,
  type PlanoAcaoItem,
  type PosChuvaInspection,
} from "@/hooks/usePosChuva";
import { SignatureDialog as EpiSignatureDialog } from "@/components/epi/SignatureDialog";
import { triggerBlobDownload } from "@/lib/pdfDownload";
import { supabase } from "@/integrations/supabase/client";

// Signature dialog for pos-chuva (encarregado + tecnico)
function PosChuvaSignatureDialog({
  open,
  onClose,
  onConfirm,
  avaliacaoNum,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (sigEncarregado: string, sigTecnico: string) => void;
  avaliacaoNum: number;
}) {
  return (
    <EpiSignatureDialog
      open={open}
      onClose={onClose}
      onConfirm={(sig1, sig2) => onConfirm(sig2, sig1)}
      label1="Assinatura do Encarregado Responsável pela Liberação"
      label2="Assinatura do Técnico de Segurança da Contratada"
      title1={`Encarregado Responsável (${avaliacaoNum}ª Avaliação - 1/2)`}
      title2={`Técnico de Segurança (${avaliacaoNum}ª Avaliação - 2/2)`}
    />
  );
}

const initialChecklist = (): ChecklistItem[] =>
  CHECKLIST_PERGUNTAS.map((p, i) => ({ numero: i + 1, pergunta: p, resposta: "" }));

const emptyPlanoAcao = (): PlanoAcaoItem => ({ item_nc: "", acao: "", responsavel: "", prazo: "" });

export default function PosChuva() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: inspections = [], isLoading } = usePosChuvaInspections();
  const createMutation = useCreatePosChuva();

  // Form state
  const [empresa, setEmpresa] = useState("Sucena Empreendimentos");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [projeto, setProjeto] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [localInspecao, setLocalInspecao] = useState("");
  const [atividade, setAtividade] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist());
  const [planoAcao, setPlanoAcao] = useState<PlanoAcaoItem[]>([emptyPlanoAcao()]);
  const [observacoes, setObservacoes] = useState("");

  // Signatures state
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [currentAval, setCurrentAval] = useState<1 | 2 | 3>(1);
  const [aval1, setAval1] = useState({ data: "", horario: "", sigEnc: "", sigTec: "" });
  const [aval2, setAval2] = useState({ data: "", horario: "", sigEnc: "", sigTec: "" });
  const [aval3, setAval3] = useState({ data: "", horario: "", sigEnc: "", sigTec: "" });

  // History detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<PosChuvaInspection | null>(null);

  const handleChecklistChange = (index: number, value: "C" | "NC" | "NA") => {
    setChecklist((prev) => prev.map((item, i) => (i === index ? { ...item, resposta: value } : item)));
  };

  const handlePlanoAcaoChange = (index: number, field: keyof PlanoAcaoItem, value: string) => {
    setPlanoAcao((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addPlanoAcaoRow = () => setPlanoAcao((prev) => [...prev, emptyPlanoAcao()]);
  const removePlanoAcaoRow = (index: number) => setPlanoAcao((prev) => prev.filter((_, i) => i !== index));

  const openSignatureDialog = (aval: 1 | 2 | 3) => {
    setCurrentAval(aval);
    setSigDialogOpen(true);
  };

  const handleSignatureConfirm = (sigEnc: string, sigTec: string) => {
    const now = new Date();
    const avalData = { data: format(now, "dd/MM/yyyy"), horario: format(now, "HH:mm"), sigEnc, sigTec };
    if (currentAval === 1) setAval1(avalData);
    else if (currentAval === 2) setAval2(avalData);
    else setAval3(avalData);
    setSigDialogOpen(false);
    toast.success(`Assinaturas da ${currentAval}ª avaliação coletadas!`);
  };

  const handleSave = async () => {
    if (!checklist.some((c) => c.resposta)) {
      toast.error("Preencha pelo menos um item da checklist.");
      return;
    }
    if (!aval1.sigEnc) {
      toast.error("É necessário assinar pelo menos a 1ª avaliação.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        empresa,
        data,
        projeto,
        responsavel,
        local_inspecao: localInspecao,
        atividade,
        checklist,
        plano_acao: planoAcao.filter((p) => p.acao),
        avaliacao_1_data: aval1.data,
        avaliacao_1_horario: aval1.horario,
        avaliacao_1_sig_encarregado: aval1.sigEnc,
        avaliacao_1_sig_tecnico: aval1.sigTec,
        avaliacao_2_data: aval2.data || null,
        avaliacao_2_horario: aval2.horario || null,
        avaliacao_2_sig_encarregado: aval2.sigEnc || null,
        avaliacao_2_sig_tecnico: aval2.sigTec || null,
        avaliacao_3_data: aval3.data || null,
        avaliacao_3_horario: aval3.horario || null,
        avaliacao_3_sig_encarregado: aval3.sigEnc || null,
        avaliacao_3_sig_tecnico: aval3.sigTec || null,
        observacoes: observacoes || null,
      });
      toast.success("Inspeção Pós Chuva salva com sucesso!");
      resetForm();
    } catch {
      toast.error("Erro ao salvar inspeção.");
    }
  };

  const resetForm = () => {
    setEmpresa("");
    setData(format(new Date(), "yyyy-MM-dd"));
    setProjeto("");
    setResponsavel("");
    setLocalInspecao("");
    setAtividade("");
    setChecklist(initialChecklist());
    setPlanoAcao([emptyPlanoAcao()]);
    setObservacoes("");
    setAval1({ data: "", horario: "", sigEnc: "", sigTec: "" });
    setAval2({ data: "", horario: "", sigEnc: "", sigTec: "" });
    setAval3({ data: "", horario: "", sigEnc: "", sigTec: "" });
  };

  const generatePdf = async (inspection: PosChuvaInspection) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210;
    const margin = 10;
    let y = 10;

    // Load logos
    const loadImg = async (url: string): Promise<string> => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { return ""; }
    };

    const [logoSucena, logoHydro] = await Promise.all([
      loadImg("/logo-sucena-pdf.png"),
      loadImg("/logo-hydro.png"),
    ]);

    // Header with logos
    if (logoSucena) {
      try { pdf.addImage(logoSucena, "PNG", margin, y, 35, 12); } catch {}
    }
    if (logoHydro) {
      // Hydro logo is roughly square-ish with text below - use proportional sizing
      try { pdf.addImage(logoHydro, "PNG", w - margin - 25, y, 25, 14); } catch {}
    }
    y += 16;

    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("Lista de Verificação - Pós Chuva / Ventos Fortes", w / 2, y, { align: "center" });
    y += 8;

    // Info table
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 1.5, font: "helvetica" },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 25 }, 1: { cellWidth: 65 }, 2: { fontStyle: "bold", cellWidth: 25 }, 3: { cellWidth: 65 } },
      body: [
        ["Empresa:", inspection.empresa || "", "Data:", inspection.data || ""],
        ["Projeto:", inspection.projeto || "", "Nº Contrato:", "4600012690"],
        ["Responsável:", inspection.responsavel || "", "Local:", inspection.local_inspecao || ""],
        ["Atividade:", inspection.atividade || "", "", ""],
      ],
    });
    y = (pdf as any).lastAutoTable.finalY + 5;

    // Checklist table
    const cl = inspection.checklist as ChecklistItem[];
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 7, halign: "center" },
      styles: { fontSize: 7.5, cellPadding: 2, font: "helvetica", lineColor: [200, 200, 200], lineWidth: 0.3 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 130 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
      },
      head: [["Nº", "Guia - Lista de Verificação", "C", "NC", "NA"]],
      body: cl.map((item) => [
        String(item.numero),
        item.pergunta,
        item.resposta === "C" ? "X" : "",
        item.resposta === "NC" ? "X" : "",
        item.resposta === "NA" ? "X" : "",
      ]),
    });
    y = (pdf as any).lastAutoTable.finalY + 6;

    // Plano de ação
    const pa = inspection.plano_acao as PlanoAcaoItem[];
    if (pa.length > 0) {
      if (y > 250) { pdf.addPage(); y = 15; }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("PLANO DE AÇÃO", w / 2, y, { align: "center" });
      y += 5;

      autoTable(pdf, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: "grid",
        headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 7, halign: "center" },
        styles: { fontSize: 7.5, cellPadding: 2, font: "helvetica", lineColor: [200, 200, 200], lineWidth: 0.3 },
        head: [["Item NC", "Ação", "Responsável", "Prazo"]],
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 80 }, 2: { cellWidth: 45 }, 3: { cellWidth: 35 } },
        body: pa.map((item) => [item.item_nc, item.acao, item.responsavel, item.prazo]),
      });
      y = (pdf as any).lastAutoTable.finalY + 6;
    }

    // Assinaturas
    const renderAval = (num: number, avalData: string | null, avalHorario: string | null, sigEnc: string | null, sigTec: string | null) => {
      if (!sigEnc) return;
      if (y > 235) { pdf.addPage(); y = 15; }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(`Assinaturas - ${num}ª Avaliação`, margin, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Data: ${avalData || ""}   Horário: ${avalHorario || ""}`, margin, y);
      y += 8;
      const sigW = 60;
      const sigH = 20;
      const lineY = y + sigH + 2;
      if (sigEnc) {
        try { pdf.addImage(sigEnc, "PNG", margin, y, sigW, sigH); } catch {}
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.4);
        pdf.line(margin, lineY, margin + sigW, lineY);
        pdf.setFontSize(7);
        pdf.text("Encarregado Resp. pela Liberação", margin + sigW / 2, lineY + 4, { align: "center" });
      }
      if (sigTec) {
        try { pdf.addImage(sigTec, "PNG", 110, y, sigW, sigH); } catch {}
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.4);
        pdf.line(110, lineY, 110 + sigW, lineY);
        pdf.setFontSize(7);
        pdf.text("Téc. Segurança da Contratada", 110 + sigW / 2, lineY + 4, { align: "center" });
      }
      y = lineY + 10;
    };

    renderAval(1, inspection.avaliacao_1_data, inspection.avaliacao_1_horario, inspection.avaliacao_1_sig_encarregado, inspection.avaliacao_1_sig_tecnico);
    renderAval(2, inspection.avaliacao_2_data, inspection.avaliacao_2_horario, inspection.avaliacao_2_sig_encarregado, inspection.avaliacao_2_sig_tecnico);
    renderAval(3, inspection.avaliacao_3_data, inspection.avaliacao_3_horario, inspection.avaliacao_3_sig_encarregado, inspection.avaliacao_3_sig_tecnico);

    // Observações
    if (inspection.observacoes) {
      if (y > 260) { pdf.addPage(); y = 15; }
      pdf.setFont("helvetica", "bold");
      pdf.text("Observações:", margin, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      const obsLines = pdf.splitTextToSize(inspection.observacoes, 180);
      pdf.text(obsLines, margin, y);
    }

    const blob = pdf.output("blob");
    triggerBlobDownload(blob, `pos-chuva-${inspection.data}.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-2">
          <CloudRain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Lista de Verificação - Pós Chuva</h1>
        </div>

        <Tabs defaultValue="formulario" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="formulario" className="gap-1"><FileText className="h-4 w-4" /> Formulário</TabsTrigger>
            <TabsTrigger value="historico" className="gap-1"><History className="h-4 w-4" /> Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="formulario">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados da Inspeção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Empresa</Label><Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></div>
                  <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
                  <div><Label>Projeto</Label><Input value={projeto} onChange={(e) => setProjeto(e.target.value)} /></div>
                  <div><Label>Nº Contrato</Label><Input value="4600012690" disabled /></div>
                  <div><Label>Responsável</Label><Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} /></div>
                  <div><Label>Local</Label><Input value={localInspecao} onChange={(e) => setLocalInspecao(e.target.value)} /></div>
                  <div className="sm:col-span-2"><Label>Atividade</Label><Input value={atividade} onChange={(e) => setAtividade(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lista de Verificação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 rounded-md border bg-card">
                      <span className="text-xs font-bold text-muted-foreground mt-1 w-6 shrink-0">{item.numero}</span>
                      <p className="text-sm flex-1 leading-snug">{item.pergunta}</p>
                      <RadioGroup
                        value={item.resposta}
                        onValueChange={(v) => handleChecklistChange(index, v as "C" | "NC" | "NA")}
                        className="flex gap-2 shrink-0"
                      >
                        {(["C", "NC", "NA"] as const).map((opt) => (
                          <div key={opt} className="flex items-center gap-1">
                            <RadioGroupItem value={opt} id={`q${index}-${opt}`} className="h-4 w-4" />
                            <Label htmlFor={`q${index}-${opt}`} className={`text-xs cursor-pointer ${opt === "NC" ? "text-destructive" : ""}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Plano de Ação */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Plano de Ação</CardTitle>
                  <Button size="sm" variant="outline" onClick={addPlanoAcaoRow} className="gap-1"><Plus className="h-3 w-3" /> Adicionar</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {planoAcao.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end border p-2 rounded-md">
                    <div><Label className="text-xs">Item NC</Label><Input value={item.item_nc} onChange={(e) => handlePlanoAcaoChange(index, "item_nc", e.target.value)} className="h-8 text-sm" /></div>
                    <div className="col-span-2"><Label className="text-xs">Ação</Label><Input value={item.acao} onChange={(e) => handlePlanoAcaoChange(index, "acao", e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Responsável</Label><Input value={item.responsavel} onChange={(e) => handlePlanoAcaoChange(index, "responsavel", e.target.value)} className="h-8 text-sm" /></div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1"><Label className="text-xs">Prazo</Label><Input type="date" value={item.prazo} onChange={(e) => handlePlanoAcaoChange(index, "prazo", e.target.value)} className="h-8 text-sm" /></div>
                      {planoAcao.length > 1 && <Button size="icon" variant="ghost" onClick={() => removePlanoAcaoRow(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-3 w-3" /></Button>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Assinaturas */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Assinaturas para Liberação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { num: 1 as const, label: "1ª Avaliação", aval: aval1 },
                  { num: 2 as const, label: "2ª Avaliação", aval: aval2 },
                  { num: 3 as const, label: "3ª Avaliação", aval: aval3 },
                ]).map(({ num, label, aval }) => (
                  <div key={num} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{label}</span>
                      {aval.sigEnc ? (
                        <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Assinado</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openSignatureDialog(num)}>Assinar</Button>
                      )}
                    </div>
                    {aval.sigEnc && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="text-center">
                          <img src={aval.sigEnc} alt="Encarregado" className="h-16 mx-auto border rounded" />
                          <p className="text-xs text-muted-foreground mt-1">Encarregado Resp. Liberação</p>
                        </div>
                        <div className="text-center">
                          <img src={aval.sigTec} alt="Técnico" className="h-16 mx-auto border rounded" />
                          <p className="text-xs text-muted-foreground mt-1">Téc. Segurança Contratada</p>
                        </div>
                        <p className="text-xs text-muted-foreground col-span-2">Data: {aval.data} - Horário: {aval.horario}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card className="mt-4">
              <CardHeader className="pb-3"><CardTitle className="text-base">Observações</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações adicionais..." rows={3} />
                <p className="text-xs text-muted-foreground mt-2">Este formulário será utilizado apenas uma vez por dia. No dia seguinte, um novo formulário deverá ser emitido.</p>
              </CardContent>
            </Card>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={createMutation.isPending} className="gap-1 flex-1">
                <Save className="h-4 w-4" /> {createMutation.isPending ? "Salvando..." : "Salvar Inspeção"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <div className="space-y-3">
              {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!isLoading && inspections.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma inspeção registrada.</p>}
              {inspections.map((ins) => (
                <Card key={ins.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedInspection(ins); setDetailOpen(true); }}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{format(new Date(ins.data), "dd/MM/yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{ins.responsavel || "Sem responsável"} - {ins.local_inspecao || "Sem local"}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={(e) => { e.stopPropagation(); generatePdf(ins); }}>
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Signature Dialog */}
        <PosChuvaSignatureDialog
          open={sigDialogOpen}
          onClose={() => setSigDialogOpen(false)}
          onConfirm={handleSignatureConfirm}
          avaliacaoNum={currentAval}
        />

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Inspeção</DialogTitle>
            </DialogHeader>
            {selectedInspection && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Data:</span> {selectedInspection.data}</div>
                  <div><span className="text-muted-foreground">Empresa:</span> {selectedInspection.empresa}</div>
                  <div><span className="text-muted-foreground">Responsável:</span> {selectedInspection.responsavel}</div>
                  <div><span className="text-muted-foreground">Local:</span> {selectedInspection.local_inspecao}</div>
                </div>
                <Separator />
                <div className="space-y-1">
                  {(selectedInspection.checklist as ChecklistItem[]).map((item) => (
                    <div key={item.numero} className="flex justify-between text-xs">
                      <span className="flex-1">{item.numero}. {item.pergunta}</span>
                      <Badge variant={item.resposta === "NC" ? "destructive" : "secondary"} className="text-xs ml-2">{item.resposta || "-"}</Badge>
                    </div>
                  ))}
                </div>
                <Button className="w-full gap-1 mt-2" onClick={() => generatePdf(selectedInspection)}>
                  <Download className="h-4 w-4" /> Baixar PDF
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
