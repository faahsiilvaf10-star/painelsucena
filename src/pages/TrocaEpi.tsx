import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEpiExchanges, EpiExchange } from "@/hooks/useEpiExchanges";
import { SignatureDialog } from "@/components/epi/SignatureDialog";
import { colaboradoresAtivos } from "@/data/efetivoData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Plus, FileText, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { getLogoBase64 } from "@/lib/pdfLogo";

const EPI_ITEMS = [
  { id: "abafador_completo", label: "Abafador Completo", hasInput: false },
  { id: "armacao_oculos", label: "Armação do Óculos Ampla Visão", hasInput: false },
  { id: "bota_couro", label: "Bota de Couro", hasInput: true, inputLabel: "Nº" },
  { id: "bota_7leguas", label: "Bota 7 Léguas", hasInput: true, inputLabel: "Nº" },
  { id: "luva", label: "Luva", hasInput: true, inputLabel: "Tipo" },
  { id: "capacete", label: "Capacete", hasInput: false },
  { id: "carneira", label: "Carneira", hasInput: false },
  { id: "colete", label: "Colete", hasInput: false },
  { id: "lente_protetor_facial", label: "Lente do Protetor Facial", hasInput: false },
  { id: "lente_escura", label: "Lente Escura", hasInput: false },
  { id: "tyveck", label: "Tyveck", hasInput: false },
  { id: "liga_oculos", label: "Liga do Óculos Ampla Visão", hasInput: false },
  { id: "mascara_pff2", label: "Máscara PFF 2", hasInput: false },
  { id: "oculos_ampla_visao", label: "Óculos Ampla Visão Completo", hasInput: false },
  { id: "suporte_abafador", label: "Suporte do Abafador", hasInput: false },
  { id: "suporte_protetor_facial", label: "Suporte do Protetor Facial", hasInput: false },
  { id: "perneira", label: "Perneira", hasInput: false },
  { id: "outros", label: "Outros", hasInput: true, inputLabel: "Especifique" },
];

const TAMANHOS = ["P", "M", "G", "GG", "XG"];

function generatePdf(exchange: EpiExchange, logoBase64: string) {
  const sigFunc = exchange.assinatura_funcionario || '';
  const sigAuth = exchange.assinatura_autorizador || '';
  const selectedEpis = exchange.epis || [];
  
  const episCol1 = EPI_ITEMS.slice(0, 6);
  const episCol2 = EPI_ITEMS.slice(6, 12);
  const episCol3 = EPI_ITEMS.slice(12);

  const renderEpiColumn = (items: typeof EPI_ITEMS) =>
    items.map(item => {
      const found = selectedEpis.find((e: any) => typeof e === 'string' ? e === item.id : (e as any).id === item.id);
      const checked = !!found;
      const extra = typeof found === 'object' && found !== null ? (found as any).value || '' : '';
      return `<div style="margin-bottom:3px;font-size:11px;">
        <span style="font-weight:${checked ? 'bold' : 'normal'};">(${checked ? 'X' : '&nbsp;&nbsp;'}) ${item.label}${extra ? ': ' + extra : ''}</span>
      </div>`;
    }).join('');

  const html = `
    <html><head><style>
      @page { size: A4; margin: 15mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; }
      .container { border: 2px solid #333; padding: 15px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 10px; }
      .header img { max-height: 55px; }
      .title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; }
      .field-row { display: flex; gap: 10px; margin-bottom: 8px; }
      .field { flex: 1; border-bottom: 1px solid #999; padding: 4px 2px; min-height: 22px; }
      .field-label { font-weight: bold; white-space: nowrap; }
      .section-title { font-weight: bold; font-size: 13px; background: #e5e7eb; padding: 4px 8px; margin: 12px 0 8px; }
      .epi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px 15px; }
      .uniforme-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
      .signature-row { display: flex; justify-content: space-between; margin-top: 30px; }
      .signature-box { text-align: center; width: 45%; }
      .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; font-size: 11px; }
      .footer-notes { margin-top: 15px; font-size: 10px; color: #555; border-top: 1px solid #ccc; padding-top: 8px; }
      .rev { text-align: right; font-size: 9px; color: #888; }
    </style></head><body>
    <div class="container">
      <div class="header">
        ${logoBase64 ? `<img src="${logoBase64}" />` : '<div></div>'}
        <div style="text-align:right;font-size:10px;color:#666;">
          <div>CONTRATO: 4600012690</div>
          <div>Rev: 00 | Data: 05/05/2024</div>
        </div>
      </div>
      <div class="title">Autorização de Troca de EPI's</div>

      <div class="field-row">
        <div class="field"><span class="field-label">DATA:</span> ${format(new Date(exchange.data + 'T12:00:00'), "dd/MM/yyyy")}</div>
        <div class="field"><span class="field-label">CONTRATO:</span> 4600012690</div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">AUTORIZADO POR:</span> ${exchange.autorizado_por}</div>
        <div class="field"><span class="field-label">MATRÍCULA:</span> ${exchange.matricula_autorizador || ''}</div>
      </div>
      <div class="field-row">
        <div class="field" style="flex:2;"><span class="field-label">MOTIVO DA TROCA:</span> ${exchange.motivo_troca}</div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">AUTORIZO O FUNCIONÁRIO(A):</span> ${exchange.funcionario_nome}</div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">FUNÇÃO:</span> ${exchange.funcionario_funcao || ''}</div>
        <div class="field"><span class="field-label">MATRÍCULA:</span> ${exchange.funcionario_matricula || ''}</div>
      </div>

      <div class="section-title">EPI</div>
      <div class="epi-grid">
        <div>${renderEpiColumn(episCol1)}</div>
        <div>${renderEpiColumn(episCol2)}</div>
        <div>${renderEpiColumn(episCol3)}</div>
      </div>

      <div class="section-title">UNIFORME</div>
      <div class="uniforme-row">
        <span>(${exchange.uniforme_blusa_tamanho ? 'X' : '&nbsp;&nbsp;'}) BLUSA OPERACIONAL</span>
        ${TAMANHOS.map(t => `<span>(${exchange.uniforme_blusa_tamanho === t ? 'X' : '&nbsp;&nbsp;'}) ${t}</span>`).join(' ')}
        <span>QTD: ${exchange.uniforme_blusa_quantidade || 0}</span>
      </div>
      <div class="uniforme-row">
        <span>(${exchange.uniforme_calca_tamanho ? 'X' : '&nbsp;&nbsp;'}) CALÇA OPERACIONAL</span>
        ${TAMANHOS.map(t => `<span>(${exchange.uniforme_calca_tamanho === t ? 'X' : '&nbsp;&nbsp;'}) ${t}</span>`).join(' ')}
        <span>QTD: ${exchange.uniforme_calca_quantidade || 0}</span>
      </div>

      <div class="signature-row">
        <div class="signature-box">
          ${sigAuth ? `<img src="${sigAuth}" style="max-height:50px;margin:0 auto;" />` : ''}
          <div class="signature-line">ASSINATURA DO AUTORIZADOR</div>
        </div>
        <div class="signature-box">
          ${sigFunc ? `<img src="${sigFunc}" style="max-height:50px;margin:0 auto;" />` : ''}
          <div class="signature-line">ASSINATURA DO FUNCIONÁRIO</div>
        </div>
      </div>

      <div class="footer-notes">
        <p>• SESMT REALIZAR A TROCA DO EPI APÓS AVALIAÇÃO TÉCNICA DO MESMO.</p>
        <p>• ALMOXARIFADO SOMENTE TROCAR COM A DEVOLUÇÃO DO EPI DANIFICADO.</p>
        <p>• EM CASO DE PERDA DO EPI, SOMENTE REALIZAR A SUBSTITUIÇÃO COM O AVAL DA LIDERANÇA IMEDIATA.</p>
      </div>
    </div>
    </body></html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

export default function TrocaEpi() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { exchanges, isLoading, createExchange, deleteExchange } = useEpiExchanges();
  const efetivo = colaboradoresAtivos;
  const [showForm, setShowForm] = useState(false);
  const [viewExchange, setViewExchange] = useState<EpiExchange | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [funcPopoverOpen, setFuncPopoverOpen] = useState(false);
  const [authPopoverOpen, setAuthPopoverOpen] = useState(false);
  // Form state
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [matriculaAutorizador, setMatriculaAutorizador] = useState("");
  const [motivoTroca, setMotivoTroca] = useState("");
  const [funcionarioNome, setFuncionarioNome] = useState("");
  const [funcionarioFuncao, setFuncionarioFuncao] = useState("");
  const [funcionarioMatricula, setFuncionarioMatricula] = useState("");
  const [selectedEpis, setSelectedEpis] = useState<Array<{ id: string; value?: string }>>([]);
  const [blusaTamanho, setBlusaTamanho] = useState("");
  const [blusaQtd, setBlusaQtd] = useState(0);
  const [calcaTamanho, setCalcaTamanho] = useState("");
  const [calcaQtd, setCalcaQtd] = useState(0);

  const toggleEpi = (epiId: string) => {
    setSelectedEpis(prev => {
      const exists = prev.find(e => e.id === epiId);
      if (exists) return prev.filter(e => e.id !== epiId);
      return [...prev, { id: epiId }];
    });
  };

  const setEpiValue = (epiId: string, value: string) => {
    setSelectedEpis(prev => prev.map(e => e.id === epiId ? { ...e, value } : e));
  };

  const resetForm = () => {
    setData(format(new Date(), "yyyy-MM-dd"));
    setAutorizadoPor("");
    setMatriculaAutorizador("");
    setMotivoTroca("");
    setFuncionarioNome("");
    setFuncionarioFuncao("");
    setFuncionarioMatricula("");
    setSelectedEpis([]);
    setBlusaTamanho("");
    setBlusaQtd(0);
    setCalcaTamanho("");
    setCalcaQtd(0);
  };

  const handleSubmit = () => {
    if (!autorizadoPor || !motivoTroca || !funcionarioNome) return;
    setShowSignature(true);
  };

  const handleSignatureConfirm = async (sigFuncionario: string, sigAutorizador: string) => {
    await createExchange.mutateAsync({
      data,
      autorizado_por: autorizadoPor,
      matricula_autorizador: matriculaAutorizador || null,
      motivo_troca: motivoTroca,
      funcionario_nome: funcionarioNome,
      funcionario_funcao: funcionarioFuncao || null,
      funcionario_matricula: funcionarioMatricula || null,
      epis: selectedEpis as any,
      uniforme_blusa_tamanho: blusaTamanho || null,
      uniforme_blusa_quantidade: blusaQtd,
      uniforme_calca_tamanho: calcaTamanho || null,
      uniforme_calca_quantidade: calcaQtd,
      assinatura_funcionario: sigFuncionario || null,
      assinatura_autorizador: sigAutorizador || null,
    });
    setShowSignature(false);
    resetForm();
    setShowForm(false);
  };

  const handlePrint = async (exchange: EpiExchange) => {
    const logoBase64 = await getLogoBase64();
    generatePdf(exchange, logoBase64);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Troca de EPI</h1>
            <p className="text-sm text-muted-foreground">Autorização de troca de equipamentos de proteção individual</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Troca
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Autorização de Troca de EPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div>
                <Label>Contrato</Label>
                <Input value="4600012690" disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Autorizado por *</Label>
                <Popover open={authPopoverOpen} onOpenChange={setAuthPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal h-10">
                      {autorizadoPor || <span className="text-muted-foreground">Selecione o autorizador</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar funcionário..." />
                      <CommandList>
                        <CommandEmpty>Nenhum encontrado</CommandEmpty>
                        {efetivo.map(col => (
                          <CommandItem
                            key={col.id}
                            onSelect={() => {
                              setAutorizadoPor(col.nome);
                              setMatriculaAutorizador(col.matricula || "");
                              setAuthPopoverOpen(false);
                            }}
                          >
                            <span>{col.nome}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{col.matricula}</span>
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Matrícula (Autorizador)</Label>
                <Input value={matriculaAutorizador} onChange={e => setMatriculaAutorizador(e.target.value)} placeholder="Matrícula" />
              </div>
            </div>

            <div>
              <Label>Motivo da Troca *</Label>
              <Textarea value={motivoTroca} onChange={e => setMotivoTroca(e.target.value)} placeholder="Descreva o motivo da troca" />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Funcionário(a) *</Label>
                <Popover open={funcPopoverOpen} onOpenChange={setFuncPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal h-10">
                      {funcionarioNome || <span className="text-muted-foreground">Selecione o funcionário</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar funcionário..." />
                      <CommandList>
                        <CommandEmpty>Nenhum encontrado</CommandEmpty>
                        {efetivo.map(col => (
                          <CommandItem
                            key={col.id}
                            onSelect={() => {
                              setFuncionarioNome(col.nome);
                              setFuncionarioFuncao(col.funcao || "");
                              setFuncionarioMatricula(col.matricula || "");
                              setFuncPopoverOpen(false);
                            }}
                          >
                            <span>{col.nome}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{col.funcao} - {col.matricula}</span>
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Função</Label>
                <Input value={funcionarioFuncao} onChange={e => setFuncionarioFuncao(e.target.value)} placeholder="Função" />
              </div>
              <div>
                <Label>Matrícula</Label>
                <Input value={funcionarioMatricula} onChange={e => setFuncionarioMatricula(e.target.value)} placeholder="Matrícula" />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-3">EPI</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {EPI_ITEMS.map(item => {
                  const selected = selectedEpis.find(e => e.id === item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={!!selected}
                        onCheckedChange={() => toggleEpi(item.id)}
                      />
                      <span className="text-sm">{item.label}</span>
                      {item.hasInput && selected && (
                        <Input
                          className="h-7 w-20 text-xs"
                          placeholder={item.inputLabel}
                          value={selected.value || ""}
                          onChange={e => setEpiValue(item.id, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-3">Uniforme</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">Blusa Operacional:</span>
                  <Select value={blusaTamanho} onValueChange={setBlusaTamanho}>
                    <SelectTrigger className="w-24 h-8"><SelectValue placeholder="Tam." /></SelectTrigger>
                    <SelectContent>
                      {TAMANHOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Qtd:</Label>
                    <Input type="number" min={0} className="h-8 w-16" value={blusaQtd} onChange={e => setBlusaQtd(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">Calça Operacional:</span>
                  <Select value={calcaTamanho} onValueChange={setCalcaTamanho}>
                    <SelectTrigger className="w-24 h-8"><SelectValue placeholder="Tam." /></SelectTrigger>
                    <SelectContent>
                      {TAMANHOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Qtd:</Label>
                    <Input type="number" min={0} className="h-8 w-16" value={calcaQtd} onChange={e => setCalcaQtd(Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createExchange.isPending || !autorizadoPor || !motivoTroca || !funcionarioNome}>
                Salvar e Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <SignatureDialog
        open={showSignature}
        onClose={() => setShowSignature(false)}
        onConfirm={handleSignatureConfirm}
      />

      {/* View Dialog */}
      <Dialog open={!!viewExchange} onOpenChange={() => setViewExchange(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Troca de EPI</DialogTitle>
          </DialogHeader>
          {viewExchange && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Data:</strong> {format(new Date(viewExchange.data + 'T12:00:00'), "dd/MM/yyyy")}</p>
                <p><strong>Autorizado por:</strong> {viewExchange.autorizado_por}</p>
                <p><strong>Funcionário:</strong> {viewExchange.funcionario_nome}</p>
                <p><strong>Função:</strong> {viewExchange.funcionario_funcao || '-'}</p>
              </div>
              <p><strong>Motivo:</strong> {viewExchange.motivo_troca}</p>
              <div>
                <strong>EPIs selecionados:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewExchange.epis || []).map((e: any) => {
                    const item = EPI_ITEMS.find(i => i.id === (typeof e === 'string' ? e : e.id));
                    const val = typeof e === 'object' && e.value ? `: ${e.value}` : '';
                    return <Badge key={typeof e === 'string' ? e : e.id} variant="secondary">{item?.label || e}{val}</Badge>;
                  })}
                </div>
              </div>
              {(viewExchange.uniforme_blusa_tamanho || viewExchange.uniforme_calca_tamanho) && (
                <div>
                  <strong>Uniforme:</strong>
                  {viewExchange.uniforme_blusa_tamanho && <p>Blusa: {viewExchange.uniforme_blusa_tamanho} (x{viewExchange.uniforme_blusa_quantidade})</p>}
                  {viewExchange.uniforme_calca_tamanho && <p>Calça: {viewExchange.uniforme_calca_tamanho} (x{viewExchange.uniforme_calca_quantidade})</p>}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => handlePrint(viewExchange)}>
                  <FileText className="h-4 w-4 mr-2" /> Gerar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : exchanges.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma troca de EPI registrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {exchanges.map(ex => (
            <Card key={ex.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{ex.funcionario_nome}</span>
                    <Badge variant="outline">{format(new Date(ex.data + 'T12:00:00'), "dd/MM/yyyy")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Autorizado por: {ex.autorizado_por} | Motivo: {ex.motivo_troca.substring(0, 60)}{ex.motivo_troca.length > 60 ? '...' : ''}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {(ex.epis || []).slice(0, 5).map((e: any) => {
                      const item = EPI_ITEMS.find(i => i.id === (typeof e === 'string' ? e : e.id));
                      return <Badge key={typeof e === 'string' ? e : e.id} variant="secondary" className="text-xs">{item?.label || 'EPI'}</Badge>;
                    })}
                    {(ex.epis || []).length > 5 && <Badge variant="secondary" className="text-xs">+{(ex.epis || []).length - 5}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewExchange(ex)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handlePrint(ex)}><FileText className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteExchange.mutate(ex.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
