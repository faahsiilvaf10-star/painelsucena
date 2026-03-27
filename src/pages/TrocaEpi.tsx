import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEpiExchanges, EpiExchange } from "@/hooks/useEpiExchanges";
import { useInventoryItems } from "@/hooks/useInventory";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { SignatureDialog } from "@/components/epi/SignatureDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Plus, FileText, Trash2, Eye, Pencil, Image, MessageCircle, Search, ChevronLeft, ChevronRight, X, Camera, Upload } from "lucide-react";
import { PhotoViewer } from "@/components/orders/PhotoViewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

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

// EPIs that should show an inventory dropdown instead of free-text input
const INVENTORY_DROPDOWN_EPIS: Record<string, { keyword: string; placeholder: string }> = {
  luva: { keyword: "luva", placeholder: "Selecione o tipo de luva..." },
  bota_7leguas: { keyword: "7 legua", placeholder: "Selecione a bota 7 léguas..." },
  bota_couro: { keyword: "bota de segur", placeholder: "Selecione a bota..." },
  lente_protetor_facial: { keyword: "lente", placeholder: "Selecione a lente..." },
  lente_escura: { keyword: "lente escura", placeholder: "Selecione a lente escura..." },
};

const TAMANHOS = ["P", "M", "G", "GG", "XG"];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findInventoryMatch(inventoryItems: any[], searchLabel: string): any | null {
  const normalized = normalizeText(searchLabel);
  // Try exact normalized match first
  let match = inventoryItems.find(inv => normalizeText(inv.name) === normalized);
  if (match) return match;
  // Try includes in both directions
  match = inventoryItems.find(inv => {
    const invNorm = normalizeText(inv.name);
    return invNorm.includes(normalized) || normalized.includes(invNorm);
  });
  if (match) return match;
  // Try matching significant words (3+ chars)
  const words = normalized.split(" ").filter(w => w.length >= 3);
  if (words.length > 0) {
    match = inventoryItems.find(inv => {
      const invNorm = normalizeText(inv.name);
      return words.every(w => invNorm.includes(w));
    });
  }
  return match || null;
}

function buildPdfHtml(exchange: EpiExchange, logoBase64: string): string {
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

  return `
    <div style="font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;border:2px solid #333;padding:15px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:2px solid #333;padding-bottom:10px;">
        ${logoBase64 ? `<img src="${logoBase64}" style="max-height:55px;" />` : '<div></div>'}
        <div style="text-align:right;font-size:10px;color:#666;">
          <div>CONTRATO: 4600012690</div>
          <div>Rev: 00 | Data: 05/05/2024</div>
        </div>
      </div>
      <div style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:12px;text-transform:uppercase;">Autorização de Troca de EPI's</div>

      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <div style="flex:1;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">DATA:</span> ${format(new Date(exchange.data + 'T12:00:00'), "dd/MM/yyyy")}</div>
        <div style="flex:1;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">CONTRATO:</span> 4600012690</div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <div style="flex:1;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">AUTORIZADO POR:</span> ${exchange.autorizado_por}</div>
        <div style="flex:1;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">MATRÍCULA:</span> ${exchange.matricula_autorizador || ''}</div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <div style="flex:2;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">MOTIVO DA TROCA:</span> ${exchange.motivo_troca}</div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <div style="flex:1;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">AUTORIZO O FUNCIONÁRIO(A):</span> ${exchange.funcionario_nome}</div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <div style="flex:1;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">FUNÇÃO:</span> ${exchange.funcionario_funcao || ''}</div>
        <div style="flex:1;border-bottom:1px solid #999;padding:4px 2px;"><span style="font-weight:bold;">MATRÍCULA:</span> ${exchange.funcionario_matricula || ''}</div>
      </div>

      <div style="font-weight:bold;font-size:13px;background:#e5e7eb;padding:4px 8px;margin:12px 0 8px;">EPI</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px 15px;">
        <div>${renderEpiColumn(episCol1)}</div>
        <div>${renderEpiColumn(episCol2)}</div>
        <div>${renderEpiColumn(episCol3)}</div>
      </div>

      <div style="font-weight:bold;font-size:13px;background:#e5e7eb;padding:4px 8px;margin:12px 0 8px;">UNIFORME</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px;">
        <span>(${exchange.uniforme_blusa_tamanho ? 'X' : '&nbsp;&nbsp;'}) BLUSA OPERACIONAL</span>
        ${TAMANHOS.map(t => `<span>(${exchange.uniforme_blusa_tamanho === t ? 'X' : '&nbsp;&nbsp;'}) ${t}</span>`).join(' ')}
        <span>QTD: ${exchange.uniforme_blusa_quantidade || 0}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px;">
        <span>(${exchange.uniforme_calca_tamanho ? 'X' : '&nbsp;&nbsp;'}) CALÇA OPERACIONAL</span>
        ${TAMANHOS.map(t => `<span>(${exchange.uniforme_calca_tamanho === t ? 'X' : '&nbsp;&nbsp;'}) ${t}</span>`).join(' ')}
        <span>QTD: ${exchange.uniforme_calca_quantidade || 0}</span>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:30px;">
        <div style="text-align:center;width:45%;">
          ${sigAuth ? `<img src="${sigAuth}" style="display:block;margin:0 auto;max-height:60px;" />` : '<div style="min-height:55px;"></div>'}
          <div style="border-top:1px solid #333;margin-top:0;padding-top:4px;font-size:11px;">ASSINATURA DO AUTORIZADOR</div>
        </div>
        <div style="text-align:center;width:45%;">
          ${sigFunc ? `<img src="${sigFunc}" style="display:block;margin:0 auto;max-height:60px;" />` : '<div style="min-height:55px;"></div>'}
          <div style="border-top:1px solid #333;margin-top:0;padding-top:4px;font-size:11px;">ASSINATURA DO FUNCIONÁRIO</div>
        </div>
      </div>

      <div style="margin-top:15px;font-size:10px;color:#555;border-top:1px solid #ccc;padding-top:8px;">
        <p>• SESMT REALIZAR A TROCA DO EPI APÓS AVALIAÇÃO TÉCNICA DO MESMO.</p>
        <p>• ALMOXARIFADO SOMENTE TROCAR COM A DEVOLUÇÃO DO EPI DANIFICADO.</p>
        <p>• EM CASO DE PERDA DO EPI, SOMENTE REALIZAR A SUBSTITUIÇÃO COM O AVAL DA LIDERANÇA IMEDIATA.</p>
      </div>
    </div>
  `;
}

async function generatePdf(exchange: EpiExchange, logoBase64: string) {
  const content = buildPdfHtml(exchange, logoBase64);
  const html = `<html><head><style>@page{size:A4;margin:15mm;}body{font-family:Arial,sans-serif;}</style></head><body>${content}</body></html>`;
  await downloadPdfFromHtml(html, `troca-epi-${exchange.id}.pdf`);
}

export default function TrocaEpi() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { exchanges, isLoading, createExchange, updateExchange, deleteExchange } = useEpiExchanges();
  const { data: inventoryItems = [] } = useInventoryItems();
  const queryClient = useQueryClient();
  const { data: rhData } = useRHEfetivo();
  const efetivo = useMemo(() => {
    if (!rhData) return [];
    const deletedIds = new Set(rhData.deletedIds || []);
    return rhData.colaboradores
      .filter(c => !deletedIds.has(c.id))
      .map(c => ({
        id: String(c.id),
        nome: c.nome,
        funcao: c.funcao || "",
        matricula: c.matricula || "",
        matriculaHydro: c.matriculaHydro || "",
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);
  const [showForm, setShowForm] = useState(false);
  const [editingExchange, setEditingExchange] = useState<EpiExchange | null>(null);
  const [viewExchange, setViewExchange] = useState<EpiExchange | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [funcPopoverOpen, setFuncPopoverOpen] = useState(false);
  const [authPopoverOpen, setAuthPopoverOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  // Form state
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [matriculaAutorizador, setMatriculaAutorizador] = useState("");
  const [motivoTroca, setMotivoTroca] = useState("");
  const [funcionarioNome, setFuncionarioNome] = useState("");
  const [funcionarioFuncao, setFuncionarioFuncao] = useState("");
  const [funcionarioMatricula, setFuncionarioMatricula] = useState("");
  const [selectedEpis, setSelectedEpis] = useState<Array<{ id: string; value?: string; qty?: number; extraInput?: string }>>([]);
  const [blusaTamanho, setBlusaTamanho] = useState("");
  const [blusaQtd, setBlusaQtd] = useState(0);
  const [calcaTamanho, setCalcaTamanho] = useState("");
  const [calcaQtd, setCalcaQtd] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [historyPhotoViewerOpen, setHistoryPhotoViewerOpen] = useState(false);
  const [historyPhotoViewerPhotos, setHistoryPhotoViewerPhotos] = useState<string[]>([]);
  const [historyPhotoViewerIndex, setHistoryPhotoViewerIndex] = useState(0);
  const [calcaQtd, setCalcaQtd] = useState(0);

  // Map EPI id -> last date the selected employee picked it up
  const lastPickupMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!funcionarioNome) return map;
    const employeeExchanges = exchanges
      .filter(ex => ex.funcionario_nome === funcionarioNome && ex.id !== editingExchange?.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    for (const ex of employeeExchanges) {
      for (const epi of (ex.epis || [])) {
        const epiId = typeof epi === "string" ? epi : (epi as any).id;
        if (!map[epiId]) {
          map[epiId] = ex.data;
        }
      }
    }
    return map;
  }, [funcionarioNome, exchanges, editingExchange]);

  const toggleEpi = (epiId: string) => {
    setSelectedEpis(prev => {
      const exists = prev.find(e => e.id === epiId);
      if (exists) return prev.filter(e => e.id !== epiId);
      return [...prev, { id: epiId, qty: 1 }];
    });
  };

  const setEpiValue = (epiId: string, value: string) => {
    setSelectedEpis(prev => prev.map(e => e.id === epiId ? { ...e, value } : e));
  };

  const setEpiQty = (epiId: string, rawValue: string) => {
    const parsed = rawValue === "" ? undefined : Number(rawValue);
    setSelectedEpis(prev => prev.map(e => e.id === epiId ? { ...e, qty: parsed } : e));
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
    setEditingExchange(null);
  };

  // Restore inventory for an exchange's EPIs (used on delete or before edit)
  const restoreInventoryForExchange = async (exchange: EpiExchange) => {
    const { data: freshInventory, error: fetchErr } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name");
    if (fetchErr) {
      console.error("Erro ao buscar estoque para estorno:", fetchErr);
      return [];
    }
    const currentInventory = freshInventory || [];
    const restoredItems: string[] = [];

    for (const epi of (exchange.epis || [])) {
      const epiId = typeof epi === "string" ? epi : (epi as any).id;
      const epiQty = typeof epi === "object" && (epi as any).qty ? Number((epi as any).qty) || 1 : 1;
      const epiValue = typeof epi === "object" ? (epi as any).value : undefined;
      const epiItem = EPI_ITEMS.find(e => e.id === epiId);
      if (!epiItem) continue;
      // For "Outros" and dropdown EPIs, use the stored value (actual item name) instead of the label
      const hasDropdown = epiId === "outros" || !!INVENTORY_DROPDOWN_EPIS[epiId];
      const searchLabel = hasDropdown && epiValue ? epiValue : epiItem.label;
      const match = findInventoryMatch(currentInventory, searchLabel);
      if (match) {
        const newQty = match.quantity + epiQty;
        const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", match.id);
        if (updateErr) {
          console.error("Erro ao estornar estoque para", searchLabel, updateErr);
          continue;
        }
        await supabase.from("inventory_movements").insert({
          item_id: match.id,
          movement_type: "entrada",
          quantity: epiQty,
          previous_quantity: match.quantity,
          new_quantity: newQty,
          reason: `Estorno Troca de EPI - ${exchange.funcionario_nome}`,
          moved_by: user!.id,
          moved_by_name: profile?.full_name || "Usuário",
          destination_type: "funcionario",
          destination_name: exchange.funcionario_nome,
        });
        match.quantity = newQty;
        restoredItems.push(`${searchLabel} (${epiQty})`);
      }
    }

    if (exchange.uniforme_blusa_quantidade > 0) {
      const blusaMatch = findInventoryMatch(currentInventory, "Blusa Operacional") || findInventoryMatch(currentInventory, "Blusa");
      if (blusaMatch) {
        const qty = exchange.uniforme_blusa_quantidade;
        const newQty = blusaMatch.quantity + qty;
        const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", blusaMatch.id);
        if (!updateErr) {
          await supabase.from("inventory_movements").insert({
            item_id: blusaMatch.id,
            movement_type: "entrada",
            quantity: qty,
            previous_quantity: blusaMatch.quantity,
            new_quantity: newQty,
            reason: `Estorno Troca de EPI - ${exchange.funcionario_nome}`,
            moved_by: user!.id,
            moved_by_name: profile?.full_name || "Usuário",
            destination_type: "funcionario",
            destination_name: exchange.funcionario_nome,
          });
          blusaMatch.quantity = newQty;
          restoredItems.push(`Blusa (${qty})`);
        }
      }
    }
    if (exchange.uniforme_calca_quantidade > 0) {
      const calcaMatch = findInventoryMatch(currentInventory, "Calça Operacional") || findInventoryMatch(currentInventory, "Calça");
      if (calcaMatch) {
        const qty = exchange.uniforme_calca_quantidade;
        const newQty = calcaMatch.quantity + qty;
        const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", calcaMatch.id);
        if (!updateErr) {
          await supabase.from("inventory_movements").insert({
            item_id: calcaMatch.id,
            movement_type: "entrada",
            quantity: qty,
            previous_quantity: calcaMatch.quantity,
            new_quantity: newQty,
            reason: `Estorno Troca de EPI - ${exchange.funcionario_nome}`,
            moved_by: user!.id,
            moved_by_name: profile?.full_name || "Usuário",
            destination_type: "funcionario",
            destination_name: exchange.funcionario_nome,
          });
          calcaMatch.quantity = newQty;
          restoredItems.push(`Calça (${qty})`);
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    return restoredItems;
  };

  const handleDeleteWithRestore = async (exchange: EpiExchange) => {
    if (exchange.created_by !== user?.id) {
      toast.error("Apenas o criador pode excluir este registro.");
      return;
    }
    const restoredItems = await restoreInventoryForExchange(exchange);
    await deleteExchange.mutateAsync(exchange.id);
    if (restoredItems.length > 0) {
      toast.info(`Estoque restaurado: ${restoredItems.join(", ")}`);
    }
  };

  const handleEditExchange = (exchange: EpiExchange) => {
    if (exchange.created_by !== user?.id) {
      toast.error("Apenas o criador pode editar este registro.");
      return;
    }
    setEditingExchange(exchange);
    setData(exchange.data);
    setAutorizadoPor(exchange.autorizado_por);
    setMatriculaAutorizador(exchange.matricula_autorizador || "");
    setMotivoTroca(exchange.motivo_troca);
    setFuncionarioNome(exchange.funcionario_nome);
    setFuncionarioFuncao(exchange.funcionario_funcao || "");
    setFuncionarioMatricula(exchange.funcionario_matricula || "");
    setSelectedEpis(
      (exchange.epis || []).map((e: any) =>
        typeof e === "string" ? { id: e, qty: 1 } : { id: e.id, value: e.value, qty: e.qty ?? 1 }
      )
    );
    setBlusaTamanho(exchange.uniforme_blusa_tamanho || "");
    setBlusaQtd(exchange.uniforme_blusa_quantidade || 0);
    setCalcaTamanho(exchange.uniforme_calca_tamanho || "");
    setCalcaQtd(exchange.uniforme_calca_quantidade || 0);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!autorizadoPor || !motivoTroca || !funcionarioNome) return;
    setShowSignature(true);
  };

  const handleSignatureConfirm = async (sigFuncionario: string, sigAutorizador: string) => {
    // Capture current state values before any async operations
    const currentSelectedEpis = [...selectedEpis];
    const currentFuncionarioNome = funcionarioNome;
    const currentBlusaQtd = blusaQtd;
    const currentCalcaQtd = calcaQtd;
    const currentBlusaTamanho = blusaTamanho;
    const currentCalcaTamanho = calcaTamanho;
    const currentEditingExchange = editingExchange;

    const exchangeData = {
      data,
      autorizado_por: autorizadoPor,
      matricula_autorizador: matriculaAutorizador || null,
      motivo_troca: motivoTroca,
      funcionario_nome: currentFuncionarioNome,
      funcionario_funcao: funcionarioFuncao || null,
      funcionario_matricula: funcionarioMatricula || null,
      epis: currentSelectedEpis as any,
      uniforme_blusa_tamanho: currentBlusaTamanho || null,
      uniforme_blusa_quantidade: currentBlusaQtd,
      uniforme_calca_tamanho: currentCalcaTamanho || null,
      uniforme_calca_quantidade: currentCalcaQtd,
      assinatura_funcionario: sigFuncionario || null,
      assinatura_autorizador: sigAutorizador || null,
    };

    try {
      // If editing, restore old inventory first, then update exchange
      if (currentEditingExchange) {
        await restoreInventoryForExchange(currentEditingExchange);
        await updateExchange.mutateAsync({ id: currentEditingExchange.id, ...exchangeData });
      } else {
        await createExchange.mutateAsync(exchangeData);
      }
    } catch (err) {
      console.error("Erro ao salvar troca de EPI:", err);
      setShowSignature(false);
      return;
    }

    // Deduct inventory for each selected EPI
    try {
      const { data: freshInventory, error: fetchError } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");
      
      if (fetchError) {
        console.error("Erro ao buscar estoque:", fetchError);
      }
      
      const currentInventory = freshInventory || [];
      const deductedItems: string[] = [];
      const notFoundItems: string[] = [];

      for (const epi of currentSelectedEpis) {
        const epiItem = EPI_ITEMS.find(e => e.id === epi.id);
        if (!epiItem) continue;
        const epiQty = Number(epi.qty) || 1;
        // For items with inventory dropdown (luva, boots, outros), use the selected value for matching
        const hasDropdown = epi.id === "outros" || !!INVENTORY_DROPDOWN_EPIS[epi.id];
        const searchLabel = hasDropdown && epi.value ? epi.value : epiItem.label;
        const match = findInventoryMatch(currentInventory, searchLabel);
        if (match && match.quantity >= epiQty) {
          const newQty = match.quantity - epiQty;
          const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", match.id);
          if (updateErr) {
            console.error("Erro ao atualizar estoque para", searchLabel, updateErr);
            continue;
          }
          const { error: movErr } = await supabase.from("inventory_movements").insert({
            item_id: match.id,
            movement_type: "saida",
            quantity: epiQty,
            previous_quantity: match.quantity,
            new_quantity: newQty,
            reason: `Troca de EPI - ${currentFuncionarioNome}`,
            moved_by: user!.id,
            moved_by_name: profile?.full_name || "Usuário",
            destination_type: "funcionario",
            destination_name: currentFuncionarioNome,
          });
          if (movErr) {
            console.error("Erro ao registrar movimento para", searchLabel, movErr);
          }
          match.quantity = newQty;
          deductedItems.push(`${searchLabel} (${epiQty})`);
        } else if (!match) {
          notFoundItems.push(searchLabel);
        }
      }

      if (currentBlusaQtd > 0) {
        const blusaMatch = findInventoryMatch(currentInventory, "Blusa Operacional") || findInventoryMatch(currentInventory, "Blusa");
        if (blusaMatch && blusaMatch.quantity >= currentBlusaQtd) {
          const newQty = blusaMatch.quantity - currentBlusaQtd;
          const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", blusaMatch.id);
          if (!updateErr) {
            await supabase.from("inventory_movements").insert({
              item_id: blusaMatch.id,
              movement_type: "saida",
              quantity: currentBlusaQtd,
              previous_quantity: blusaMatch.quantity,
              new_quantity: newQty,
              reason: `Troca de EPI - ${currentFuncionarioNome}`,
              moved_by: user!.id,
              moved_by_name: profile?.full_name || "Usuário",
              destination_type: "funcionario",
              destination_name: currentFuncionarioNome,
            });
            blusaMatch.quantity = newQty;
            deductedItems.push(`Blusa Operacional (${currentBlusaQtd})`);
          }
        }
      }
      if (currentCalcaQtd > 0) {
        const calcaMatch = findInventoryMatch(currentInventory, "Calça Operacional") || findInventoryMatch(currentInventory, "Calça");
        if (calcaMatch && calcaMatch.quantity >= currentCalcaQtd) {
          const newQty = calcaMatch.quantity - currentCalcaQtd;
          const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", calcaMatch.id);
          if (!updateErr) {
            await supabase.from("inventory_movements").insert({
              item_id: calcaMatch.id,
              movement_type: "saida",
              quantity: currentCalcaQtd,
              previous_quantity: calcaMatch.quantity,
              new_quantity: newQty,
              reason: `Troca de EPI - ${currentFuncionarioNome}`,
              moved_by: user!.id,
              moved_by_name: profile?.full_name || "Usuário",
              destination_type: "funcionario",
              destination_name: currentFuncionarioNome,
            });
            calcaMatch.quantity = newQty;
            deductedItems.push(`Calça Operacional (${currentCalcaQtd})`);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });

      if (deductedItems.length > 0) {
        toast.success(`Estoque atualizado: ${deductedItems.join(", ")}`);
      }
      if (notFoundItems.length > 0) {
        toast.warning(`Itens não encontrados no estoque: ${notFoundItems.join(", ")}`);
      }
    } catch (err) {
      console.error("Erro ao processar baixa no estoque:", err);
      toast.error("Erro ao atualizar estoque. Verifique manualmente.");
    }

    setShowSignature(false);
    resetForm();
    setShowForm(false);
  };

  const handlePrint = async (exchange: EpiExchange) => {
    const logoBase64 = await getLogoBase64();
    await generatePdf(exchange, logoBase64);
  };

  const handlePngWhatsApp = async (exchange: EpiExchange) => {
    try {
      toast.info("Gerando imagem...");
      const logoBase64 = await getLogoBase64();
      const html = buildPdfHtml(exchange, logoBase64);

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      container.style.background = "#fff";
      container.innerHTML = html;
      document.body.appendChild(container);

      // Wait for images to load
      const images = container.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );

      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      document.body.removeChild(container);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Erro ao gerar imagem");
          return;
        }
        const fileName = `troca-epi-${exchange.funcionario_nome}-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        const phone = "559193645741";
        
        // Build description with employee name + items
        const episList = (exchange.epis || []).map((e: any) => {
          const epiId = typeof e === "string" ? e : e.id;
          const epiQty = typeof e === "object" && e.qty ? Number(e.qty) : 1;
          const epiValue = typeof e === "object" ? e.value : undefined;
          const epiItem = EPI_ITEMS.find(i => i.id === epiId);
          const name = epiId === "outros" && epiValue ? epiValue : (epiItem?.label || epiId);
          return `${name} (${epiQty})`;
        }).join(", ");
        const description = `Troca de EPI - ${exchange.funcionario_nome}\nItens: ${episList}`;

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobile) {
          // Mobile: try native share with image + text first
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `Troca de EPI - ${exchange.funcionario_nome}`,
                text: description,
              });
              toast.success("Imagem enviada!");
            } catch (e: any) {
              if (e?.name !== "AbortError") {
                // Fallback: open conversation directly
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(description)}`, "_blank");
                toast.info("Conversa aberta no WhatsApp.");
              }
            }
          } else {
            // Fallback: download PNG + open conversation
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(blobUrl);
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(description)}`, "_blank");
            toast.success("PNG salvo! Conversa aberta no WhatsApp.");
          }
        } else {
          // Desktop: open WhatsApp Web directly in the conversation with the contact
          window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(description)}`, "_blank");
          toast.success("WhatsApp Web aberto na conversa.");
        }
      }, "image/png");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PNG");
    }
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
        <DialogContent className="max-w-3xl w-[95vw] max-h-[95vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingExchange ? "Editar Troca de EPI" : "Nova Autorização de Troca de EPI"}</DialogTitle>
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
                            value={`${col.nome} ${col.matricula} ${col.funcao}`}
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
                            value={`${col.nome} ${col.funcao} ${col.matricula}`}
                            onSelect={() => {
                              setFuncionarioNome(col.nome);
                              setFuncionarioFuncao(col.funcao || "");
                              setFuncionarioMatricula(col.matriculaHydro || col.matricula || "");
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
                <Label>Matrícula Hydro</Label>
                <Input value={funcionarioMatricula} onChange={e => setFuncionarioMatricula(e.target.value)} placeholder="Matrícula Hydro" />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-3">EPI</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {EPI_ITEMS.map(item => {
                  const selected = selectedEpis.find(e => e.id === item.id);
                  const lastDate = lastPickupMap[item.id];
                  const hasDropdown = item.id === "outros" || !!INVENTORY_DROPDOWN_EPIS[item.id];
                  const searchLabel = hasDropdown && selected?.value ? selected.value : item.label;
                  const invMatch = selected ? findInventoryMatch(inventoryItems, searchLabel) : null;
                  return (
                    <div key={item.id} className="flex flex-col gap-0.5 p-1.5 rounded-md hover:bg-accent/50">
                      <div className="flex items-center gap-2 min-h-[36px] flex-wrap">
                        <Checkbox
                          checked={!!selected}
                          onCheckedChange={() => toggleEpi(item.id)}
                          className="h-5 w-5"
                        />
                        <span className="text-sm flex-1">{item.label}</span>
                        {selected && (
                          <div className="flex items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Qtd:</Label>
                            <Input
                              type="number"
                              min={1}
                              className="h-7 w-14 text-xs text-center"
                              value={selected.qty ?? ""}
                              onChange={e => setEpiQty(item.id, e.target.value)}
                            />
                          </div>
                        )}
                        {item.hasInput && selected && item.id !== "outros" && !INVENTORY_DROPDOWN_EPIS[item.id] && (
                          <Input
                            className="h-8 w-24 text-xs"
                            placeholder={item.inputLabel}
                            value={selected.value || ""}
                            onChange={e => setEpiValue(item.id, e.target.value)}
                          />
                        )}
                        {item.hasInput && selected && INVENTORY_DROPDOWN_EPIS[item.id] && (
                          <Input
                            className="h-8 w-20 text-xs"
                            placeholder="Nº"
                            value={selected.extraInput || ""}
                            onChange={e => {
                              const updated = selectedEpis.map(ep =>
                                ep.id === item.id ? { ...ep, extraInput: e.target.value } : ep
                              );
                              setSelectedEpis(updated);
                            }}
                          />
                        )}
                      </div>
                      {selected && INVENTORY_DROPDOWN_EPIS[item.id] && (() => {
                        const cfg = INVENTORY_DROPDOWN_EPIS[item.id];
                        const matches = inventoryItems.filter(inv => inv.quantity > 0 && normalizeText(inv.name).includes(cfg.keyword));
                        return (
                          <div className="ml-6 mt-1">
                            <Select value={selected.value || ""} onValueChange={v => setEpiValue(item.id, v)}>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder={cfg.placeholder} />
                              </SelectTrigger>
                              <SelectContent>
                                {matches.map(inv => (
                                  <SelectItem key={inv.id} value={inv.name}>
                                    {inv.name} ({inv.quantity} {inv.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })()}
                      {item.id === "outros" && selected && (
                        <div className="ml-6 mt-1">
                          <Select value={selected.value || ""} onValueChange={v => setEpiValue(item.id, v)}>
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Selecione do estoque..." />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems
                                .filter(inv => inv.quantity > 0)
                                .map(inv => (
                                  <SelectItem key={inv.id} value={inv.name}>
                                    {inv.name} ({inv.quantity} {inv.unit})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {selected && invMatch && (
                        <span className={`text-[10px] ml-6 ${invMatch.quantity <= invMatch.min_quantity ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          Estoque: {invMatch.quantity} {invMatch.unit}
                        </span>
                      )}
                      {selected && lastDate && (
                        <span className="text-[10px] text-warning ml-6">
                          Última retirada: {format(new Date(lastDate + "T12:00:00"), "dd/MM/yyyy")}
                        </span>
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
              <Button onClick={handleSubmit} disabled={(createExchange.isPending || updateExchange.isPending) || !autorizadoPor || !motivoTroca || !funcionarioNome}>
                {editingExchange ? "Atualizar e Reassinar" : "Salvar e Registrar"}
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
        <DialogContent className="max-w-2xl w-[95vw] p-3 sm:p-6">
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handlePngWhatsApp(viewExchange)}>
                  <MessageCircle className="h-4 w-4 mr-2 text-[#25D366]" /> PNG WhatsApp
                </Button>
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
      ) : (
      <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou autorizador..."
            value={filterText}
            onChange={e => { setFilterText(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filterMonth} onValueChange={v => { setFilterMonth(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Todos os meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, "0");
              const label = new Date(2026, i).toLocaleString("pt-BR", { month: "long" });
              return <SelectItem key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDay}
          onChange={e => { setFilterDay(e.target.value); setCurrentPage(1); }}
          className="w-full sm:w-44"
          placeholder="Filtrar por dia"
        />
        {filterDay && (
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setFilterDay(""); setCurrentPage(1); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(() => {
        const filtered = exchanges
          .filter(ex => {
            const text = filterText.toLowerCase();
            const matchesText = !text || ex.funcionario_nome.toLowerCase().includes(text) || ex.autorizado_por.toLowerCase().includes(text);
            const matchesMonth = !filterMonth || filterMonth === "all" || ex.data.substring(5, 7) === filterMonth;
            const matchesDay = !filterDay || ex.data === filterDay;
            return matchesText && matchesMonth && matchesDay;
          })
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        const page = Math.min(currentPage, totalPages);
        const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

        if (filtered.length === 0) {
          return (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{exchanges.length === 0 ? "Nenhuma troca de EPI registrada." : "Nenhum resultado encontrado."}</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <>
            <p className="text-xs text-muted-foreground mb-2">{filtered.length} registro(s) encontrado(s)</p>
            <div className="grid gap-3 max-h-[65vh] overflow-y-auto pr-1">
              {paged.map(ex => (
                <Card key={ex.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm sm:text-base">{ex.funcionario_nome}</span>
                        <Badge variant="outline" className="text-xs">{format(new Date(ex.data + 'T12:00:00'), "dd/MM/yyyy")}</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        Autorizado por: {ex.autorizado_por} | {ex.motivo_troca.substring(0, 40)}{ex.motivo_troca.length > 40 ? '...' : ''}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {(ex.epis || []).slice(0, 3).map((e: any) => {
                          const item = EPI_ITEMS.find(i => i.id === (typeof e === 'string' ? e : e.id));
                          return <Badge key={typeof e === 'string' ? e : e.id} variant="secondary" className="text-[10px]">{item?.label || 'EPI'}</Badge>;
                        })}
                        {(ex.epis || []).length > 3 && <Badge variant="secondary" className="text-[10px]">+{(ex.epis || []).length - 3}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewExchange(ex)}><Eye className="h-4 w-4" /></Button>
                      {ex.created_by === user?.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditExchange(ex)}><Pencil className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(ex)} title="Gerar PDF"><FileText className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePngWhatsApp(ex)} title="PNG WhatsApp"><MessageCircle className="h-4 w-4 text-[#25D366]" /></Button>
                      {ex.created_by === user?.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteWithRestore(ex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        );
      })()}
      </>
      )}
    </div>
  );
}
