import { useState, useMemo, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Plus,
  CalendarIcon,
  CheckCircle2,
  Clock,
  Search,
  Tag,
  User,
  Image as ImageIcon,
  FileText,
  Video,
  X,
  Save,
  Send,
  Check,
  Ban,
  Archive,
  Printer,
  Mail,
  Share2,
  Download,
  History,
  AlertCircle,
  FileIcon,
  Trash2,
} from "lucide-react";
import {
  useDesvios,
  useCreateDesvio,
  useUpdateDesvio,
  useUploadDesvioPhoto,
  useDeleteDesvio,
  type Desvio,
  type DesvioAttachment,
} from "@/hooks/useDesvios";
import { useProfiles } from "@/hooks/useProfiles";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const STATUS_OPTIONS = [
  { id: "Aberto", label: "Aberto", color: "bg-blue-500" },
  { id: "Em Tratamento", label: "Em Tratamento", color: "bg-amber-500" },
  { id: "Aguardando Validação", label: "Aguardando Validação", color: "bg-purple-500" },
  { id: "Concluído", label: "Concluído", color: "bg-green-500" },
  { id: "Cancelado", label: "Cancelado", color: "bg-gray-500" },
];

const PRIORITY_OPTIONS = [
  { id: "Baixo", label: "Baixo", color: "bg-green-500" },
  { id: "Médio", label: "Médio", color: "bg-amber-500" },
  { id: "Alto", label: "Alto", color: "bg-orange-500" },
  { id: "Crítico", label: "Crítico", color: "bg-red-500" },
];

const TAG_OPTIONS = ["Engenharia", "Segurança", "Meio Ambiente", "Qualidade", "Operação", "RH"];

export default function Desvios() {
  const { data: desvios, isLoading: loadingDesvios } = useDesvios();
  const { data: profiles } = useProfiles();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const createDesvio = useCreateDesvio();
  const updateDesvio = useUpdateDesvio();
  const deleteDesvio = useDeleteDesvio();
  const uploadFile = useUploadDesvioPhoto();

  const [selectedDesvio, setSelectedDesvio] = useState<Desvio | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Form State
  const [formState, setFormState] = useState<Partial<Desvio>>({
    description: "",
    instruction: "",
    correction: "",
    tags: [],
    priority: "Baixo",
    responsible_name: "",
    responsible_company: "",
    responsible_sector: "",
    mentioned_user_id: null,
    due_date: null,
    comments: "",
    status: "Aberto",
    attachments: [],
  });

  const isCreator = useMemo(() => {
    if (!selectedDesvio || !user) return true; // Se for novo desvio, o usuário atual é o criador
    return selectedDesvio.created_by === user.id;
  }, [selectedDesvio, user]);

  const isResponsible = useMemo(() => {
    if (!selectedDesvio || !user) return false;
    return selectedDesvio.mentioned_user_id === user.id;
  }, [selectedDesvio, user]);

  const isAdmin = useMemo(() => {
    return profile?.role === "admin" || profile?.role === "master";
  }, [profile]);

  const canEditCorrection = useMemo(() => {
    return isResponsible || isAdmin;
  }, [isResponsible, isAdmin]);

  const availableStatuses = useMemo(() => {
    if (isCreator || isAdmin) return STATUS_OPTIONS;
    if (isResponsible) {
      return STATUS_OPTIONS.filter(opt => ["Em Tratamento", "Aguardando Validação"].includes(opt.id));
    }
    return [];
  }, [isCreator, isResponsible]);

  const dashboardStats = useMemo(() => {
    if (!desvios) return { total: 0, open: 0, inTreatment: 0, done: 0, delayed: 0 };
    return {
      total: desvios.length,
      open: desvios.filter((d) => d.status === "Aberto").length,
      inTreatment: desvios.filter((d) => d.status === "Em Tratamento").length,
      done: desvios.filter((d) => d.status === "Concluído").length,
      delayed: desvios.filter((d) => 
        !["Concluído", "Cancelado"].includes(d.status) && 
        d.due_date && isPast(parseISO(d.due_date)) && !isToday(parseISO(d.due_date))
      ).length,
    };
  }, [desvios]);

  const filteredDesvios = useMemo(() => {
    if (!desvios) return [];
    return desvios.filter((d) => {
      const matchesSearch = 
        d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.responsible_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (!activeFilter) return true;
      if (activeFilter === "total") return true;
      if (activeFilter === "open") return d.status === "Aberto";
      if (activeFilter === "inTreatment") return d.status === "Em Tratamento";
      if (activeFilter === "done") return d.status === "Concluído";
      if (activeFilter === "delayed") {
        return !["Concluído", "Cancelado"].includes(d.status) && 
               d.due_date && isPast(parseISO(d.due_date)) && !isToday(parseISO(d.due_date));
      }
      return true;
    });
  }, [desvios, searchQuery, activeFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const url = await uploadFile.mutateAsync(file);
        const attachment: DesvioAttachment = {
          name: file.name,
          url,
          type: file.type,
        };
        setFormState((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), attachment],
        }));
      } catch (error) {
        toast.error(`Erro ao fazer upload de ${file.name}`);
      }
    }
  };

  const resetForm = () => {
    setFormState({
      description: "",
      instruction: "",
      correction: "",
      tags: [],
      priority: "Baixo",
      responsible_name: "",
      responsible_company: "",
      responsible_sector: "",
      mentioned_user_id: null,
      due_date: null,
      comments: "",
      status: "Aberto",
      attachments: [],
    });
    setSelectedDesvio(null);
    setIsEditing(false);
    setShowForm(false);
  };

  const handleSave = async (send = false) => {
    if (!formState.description) {
      toast.error("A descrição do desvio é obrigatória.");
      return;
    }

    try {
      const isNewCorrection = 
        selectedDesvio && 
        canEditCorrection && 
        formState.correction && 
        formState.correction !== selectedDesvio.correction;

      const finalUpdates = {
        ...formState,
        status: isNewCorrection ? "Concluído" : formState.status
      };

      if (selectedDesvio) {
        await updateDesvio.mutateAsync({
          id: selectedDesvio.id,
          updates: finalUpdates,
          action: isNewCorrection ? "Correção" : "Edição",
          comment: isNewCorrection ? "Correção realizada pelo responsável" : (send ? "Desvio salvo e enviado" : "Desvio atualizado"),
        });
      } else {
        await createDesvio.mutateAsync(finalUpdates);
      }
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedDesvio) return;
    try {
      await updateDesvio.mutateAsync({
        id: selectedDesvio.id,
        updates: { status },
        action: "Mudança de Status",
        comment: `Status alterado para ${status}`,
      });
      setFormState(prev => ({ ...prev, status }));
    } catch (error) {
      console.error(error);
    }
  };

  const generatePDF = () => {
    window.print();
  };

  const sendWhatsApp = () => {
    if (!selectedDesvio) return;
    const text = `*Desvio de Segurança*\n\n*Descrição:* ${selectedDesvio.description}\n*Prioridade:* ${selectedDesvio.priority}\n*Responsável:* ${selectedDesvio.responsible_name}\n*Prazo:* ${selectedDesvio.due_date ? format(parseISO(selectedDesvio.due_date), "dd/MM/yyyy") : "Não definido"}\n*Status:* ${selectedDesvio.status}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const sendEmail = () => {
    if (!selectedDesvio) return;
    const subject = `Desvio de Segurança - ${selectedDesvio.id.slice(0, 8)}`;
    const body = `Descrição: ${selectedDesvio.description}\nPrioridade: ${selectedDesvio.priority}\nResponsável: ${selectedDesvio.responsible_name}\nPrazo: ${selectedDesvio.due_date ? format(parseISO(selectedDesvio.due_date), "dd/MM/yyyy") : "Não definido"}\nStatus: ${selectedDesvio.status}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (showForm || isEditing) {
    return (
      <Layout>
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto print:p-0">
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">{isEditing ? "Editar Desvio" : "Novo Desvio"}</h1>
            </div>
            <div className="flex items-center gap-2">
              {availableStatuses.map((opt) => (
                <Badge
                  key={opt.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer hover:opacity-80 transition-opacity",
                    formState.status === opt.id ? `${opt.color} text-white border-transparent` : "text-muted-foreground"
                  )}
                  onClick={() => handleStatusChange(opt.id)}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Coluna 1: Problema / Assunto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Problema / Assunto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição do Desvio</label>
                  <Textarea
                    placeholder="Descreva o desvio detalhadamente..."
                    className="min-h-[200px]"
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    disabled={!isCreator && isResponsible}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anexos</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {formState.attachments?.map((att, i) => (
                      <div key={i} className="relative group border rounded-lg p-2 flex items-center gap-2 bg-muted/30">
                        {att.type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                        ) : att.type.includes("pdf") ? (
                          <FileText className="w-4 h-4 text-red-500" />
                        ) : (
                          <Video className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="text-xs truncate max-w-[80px]">{att.name}</span>
                        <button
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFormState({ ...formState, attachments: formState.attachments?.filter((_, idx) => idx !== i) })}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4" /> Adicionar Anexo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Coluna 2: Tratativa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Tratativa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instrução</label>
                  <Textarea
                    placeholder="Instruções para correção..."
                    className="min-h-[200px]"
                    value={formState.instruction || ""}
                    onChange={(e) => setFormState({ ...formState, instruction: e.target.value })}
                    disabled={!isCreator && !isResponsible}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Etiquetas de Ação</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {formState.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => setFormState({ ...formState, tags: formState.tags?.filter((t) => t !== tag) })}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Select
                    disabled={!isCreator && isResponsible}
                    onValueChange={(val) => {
                      if (!formState.tags?.includes(val)) {
                        setFormState({ ...formState, tags: [...(formState.tags || []), val] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar etiquetas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TAG_OPTIONS.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Coluna 3: Correção */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-blue-600" />
                  Correção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Correção Realizada</label>
                  <Textarea
                    placeholder="Descreva a correção efetuada..."
                    className="min-h-[200px]"
                    value={formState.correction || ""}
                    onChange={(e) => setFormState({ ...formState, correction: e.target.value })}
                    disabled={!canEditCorrection}
                  />
                  {!canEditCorrection && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Somente o usuário responsável ou administradores podem preencher este campo.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Coluna 4: Responsável / Prazo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Responsável / Prazo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pessoa Responsável</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal" disabled={!isCreator && isResponsible}>
                        {formState.responsible_name || "Selecionar usuário..."}
                        <Search className="w-4 h-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar usuário..." />
                        <CommandList>
                          <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                          <CommandGroup>
                            {profiles?.map((p) => (
                              <CommandItem
                                key={p.user_id}
                                value={p.full_name || ""}
                                onSelect={() => {
                                  setFormState({
                                    ...formState,
                                    responsible_name: p.full_name || "Usuário",
                                    responsible_company: "N/A",
                                    responsible_sector: p.cargo || "N/A",
                                    mentioned_user_id: p.user_id,
                                  });
                                }}
                              >
                                <div className="flex flex-col">
                                  <span>{p.full_name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {p.cargo || "N/A"}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formState.responsible_name && (
                    <div className="p-2 border rounded bg-muted/20 text-[10px] space-y-0.5">
                      <div><strong>Empresa:</strong> {formState.responsible_company}</div>
                      <div><strong>Setor:</strong> {formState.responsible_sector}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={formState.priority === opt.id ? "default" : "outline"}
                        disabled={!isCreator && isResponsible}
                        className={cn(
                          "w-full text-xs h-8",
                          formState.priority === opt.id && opt.color
                        )}
                        onClick={() => setFormState({ ...formState, priority: opt.id })}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Limite</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!isCreator && isResponsible}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formState.due_date ? format(new Date(formState.due_date), "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formState.due_date ? new Date(formState.due_date) : undefined}
                        onSelect={(date) => setFormState({ ...formState, due_date: date ? format(date, "yyyy-MM-dd") : null })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Comentários</label>
                  <Textarea
                    placeholder="Observações adicionais..."
                    value={formState.comments || ""}
                    onChange={(e) => setFormState({ ...formState, comments: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação realizada</TableHead>
                    <TableHead>Comentário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formState.history?.length ? (
                    formState.history.slice().reverse().map((ev, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{format(new Date(ev.date), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="text-xs font-medium">{ev.user}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline">{ev.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ev.comment}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum registro encontrado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Rodapé: Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t print:hidden">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={generatePDF}>
                <Printer className="w-4 h-4" /> Impressão
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={sendWhatsApp}>
                <Share2 className="w-4 h-4" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={sendEmail}>
                <Mail className="w-4 h-4" /> E-mail
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => handleSave(false)}>
                <Save className="w-4 h-4" /> Salvar
              </Button>
              <Button size="sm" className="gap-2" onClick={() => handleSave(true)}>
                <Send className="w-4 h-4" /> Salvar e Enviar
              </Button>
              
              {(isCreator || isAdmin) && selectedDesvio && (
                <>
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange("Concluído")}>
                    <Check className="w-4 h-4" /> Aprovar
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleStatusChange("Em Tratamento")}>
                    <Ban className="w-4 h-4" /> Reprovar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => handleStatusChange("Concluído")}>
                    <Archive className="w-4 h-4" /> Encerrar Desvio
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <EditablePageTitle pageKey="desvios" defaultValue="Desvios" className="text-xl md:text-2xl font-bold text-foreground" />
              <p className="text-sm text-muted-foreground">Gestão de desvios e ocorrências</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Desvio
          </Button>
        </div>

        {/* Dashboard Resumido */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "total" ? "bg-primary/10 border-primary" : "bg-primary/5 border-primary/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "total" ? null : "total")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{dashboardStats.total}</div>
              <div className="text-xs text-muted-foreground">Total de Desvios</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "open" ? "bg-blue-500/10 border-blue-500" : "bg-blue-500/5 border-blue-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "open" ? null : "open")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.open}</div>
              <div className="text-xs text-muted-foreground">Abertos</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "inTreatment" ? "bg-amber-500/10 border-amber-500" : "bg-amber-500/5 border-amber-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "inTreatment" ? null : "inTreatment")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{dashboardStats.inTreatment}</div>
              <div className="text-xs text-muted-foreground">Em Tratamento</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "done" ? "bg-green-500/10 border-green-500" : "bg-green-500/5 border-green-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "done" ? null : "done")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{dashboardStats.done}</div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </CardContent>
          </Card>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              activeFilter === "delayed" ? "bg-red-500/10 border-red-500" : "bg-red-500/5 border-red-500/20"
            )}
            onClick={() => setActiveFilter(activeFilter === "delayed" ? null : "delayed")}
          >
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{dashboardStats.delayed}</div>
              <div className="text-xs text-muted-foreground">Atrasados</div>
            </CardContent>
          </Card>
        </div>

        {/* Busca e Lista */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar desvios..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesvios.map((desvio) => (
            <Card
              key={desvio.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setSelectedDesvio(desvio);
                setFormState(desvio);
                setIsEditing(true);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-1">
                    <Badge className={cn("text-[10px]", STATUS_OPTIONS.find(s => s.id === desvio.status)?.color)}>
                      {desvio.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", PRIORITY_OPTIONS.find(p => p.id === desvio.priority)?.color, "text-white border-transparent")}>
                      {desvio.priority}
                    </Badge>
                  </div>
                  
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Desvio</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este desvio? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await deleteDesvio.mutateAsync(desvio.id);
                              } catch (error) {
                                console.error(error);
                              }
                            }}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <CardTitle className="text-sm line-clamp-2 leading-relaxed">
                  {desvio.description}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span className="truncate">{desvio.responsible_name || "Sem responsável"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="w-3 h-3" />
                  <span>{desvio.due_date ? format(parseISO(desvio.due_date), "dd/MM/yyyy") : "Sem prazo"}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {desvio.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {!loadingDesvios && filteredDesvios.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Nenhum desvio encontrado.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
