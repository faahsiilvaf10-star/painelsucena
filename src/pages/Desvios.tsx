import { useState, useRef, useEffect } from "react";
import { DeleteConfirmation } from "@/components/ui/DeleteConfirmation";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Plus,
  Camera,
  CalendarIcon,
  CheckCircle2,
  Clock,
  Trash2,
  ImageIcon,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  useDesvios,
  useCreateDesvio,
  useUploadDesvioPhoto,
  useUpdateDesvioItems,
  useUpdateDesvioStatus,
  useDeleteDesvio,
  type DesvioItem,
} from "@/hooks/useDesvios";
import { useAuth } from "@/hooks/useAuth";
import { useAllUsers } from "@/hooks/useAllUsers";
import { DesvioCommentSection } from "@/components/desvios/DesvioCommentSection";
import { toast } from "sonner";

interface FormItem {
  id: string;
  description: string;
  photo_url: string | null;
}

interface CorrectionDialogState {
  desvioId: string;
  itemId: string;
  photoUrl: string | null;
  observation: string;
}

export default function Desvios() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { data: desvios, isLoading } = useDesvios();
  const { allUsers } = useAllUsers();
  const createDesvio = useCreateDesvio();
  const uploadPhoto = useUploadDesvioPhoto();
  const updateItems = useUpdateDesvioItems();
  const updateStatus = useUpdateDesvioStatus();
  const deleteDesvio = useDeleteDesvio();


  const [showForm, setShowForm] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [formItems, setFormItems] = useState<FormItem[]>([
    { id: crypto.randomUUID(), description: "", photo_url: null },
  ]);
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | "aberto" | "corrigido">("todos");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<{ desvioId: string; itemId: string } | null>(null);
  const correctionInputRef = useRef<HTMLInputElement>(null);
  const [correctionDialog, setCorrectionDialog] = useState<CorrectionDialogState | null>(null);
  const correctionDialogInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to highlighted desvio from announcement link
  useEffect(() => {
    if (highlightId && desvios && desvios.length > 0) {
      // Set filter to "todos" so the highlighted desvio is visible
      setFilter("todos");
      setTimeout(() => {
        const el = document.getElementById(`desvio-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-green-500", "ring-offset-2", "ring-offset-background");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-green-500", "ring-offset-2", "ring-offset-background");
            setSearchParams({}, { replace: true });
          }, 4000);
        }
      }, 300);
    }
  }, [highlightId, desvios]);

  const addFormItem = () => {
    setFormItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", photo_url: null }]);
  };

  const removeFormItem = (id: string) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateFormItem = (id: string, field: keyof FormItem, value: string | null) => {
    setFormItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItemId) return;
    setUploading(true);
    try {
      const url = await uploadPhoto.mutateAsync(file);
      updateFormItem(activeItemId, "photo_url", url);
    } catch {
      toast.error("Erro ao fazer upload da foto");
    }
    setUploading(false);
    setActiveItemId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCorrectionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !correctionTarget) return;
    setUploading(true);
    try {
      const url = await uploadPhoto.mutateAsync(file);
      const desvio = desvios?.find((d) => d.id === correctionTarget.desvioId);
      if (desvio) {
        const updatedItems = desvio.items.map((item) =>
          item.id === correctionTarget.itemId ? { ...item, correction_photo_url: url } : item
        );
        await updateItems.mutateAsync({ desvioId: correctionTarget.desvioId, items: updatedItems });
        toast.success("Foto de correção adicionada!");
      }
    } catch {
      toast.error("Erro ao adicionar foto de correção");
    }
    setUploading(false);
    setCorrectionTarget(null);
    if (correctionInputRef.current) correctionInputRef.current.value = "";
  };

  const handleCorrectionDialogPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !correctionDialog) return;
    setUploading(true);
    try {
      const url = await uploadPhoto.mutateAsync(file);
      setCorrectionDialog((prev) => prev ? { ...prev, photoUrl: url } : null);
    } catch {
      toast.error("Erro ao fazer upload da foto");
    }
    setUploading(false);
    if (correctionDialogInputRef.current) correctionDialogInputRef.current.value = "";
  };

  const handleSaveCorrection = async () => {
    if (!correctionDialog) return;
    if (!correctionDialog.photoUrl) {
      toast.error("Adicione uma foto de correção");
      return;
    }
    const desvio = desvios?.find((d) => d.id === correctionDialog.desvioId);
    if (!desvio) return;
    const updatedItems = desvio.items.map((item) =>
      item.id === correctionDialog.itemId
        ? { ...item, correction_photo_url: correctionDialog.photoUrl, correction_observation: correctionDialog.observation.trim() || null }
        : item
    );
    await updateItems.mutateAsync({ desvioId: correctionDialog.desvioId, items: updatedItems });
    toast.success("Correção registrada!");
    setCorrectionDialog(null);
  };

  const handleSubmit = async () => {
    const validItems = formItems.filter((item) => item.description.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item com descrição");
      return;
    }
    const selectedUsers = allUsers.filter((u) => selectedUserIds.includes(u.user_id));
    const items: DesvioItem[] = validItems.map((item) => ({
      id: item.id,
      description: item.description.trim(),
      photo_url: item.photo_url,
      correction_photo_url: null,
      correction_observation: null,
    }));
    await createDesvio.mutateAsync({
      description: items.map((i) => i.description).join(" | "),
      photo_urls: items.filter((i) => i.photo_url).map((i) => i.photo_url!),
      items,
      mentioned_user_ids: selectedUserIds,
      mentioned_user_names: selectedUsers.map((u) => u.full_name),
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
    });
    setFormItems([{ id: crypto.randomUUID(), description: "", photo_url: null }]);
    setSelectedUserIds([]);
    setDueDate(undefined);
    setShowForm(false);
  };

  const filtered = desvios?.filter((d) => {
    if (filter === "todos") return true;
    return d.status === filter;
  });

  const openCount = desvios?.filter((d) => d.status === "aberto").length || 0;
  const fixedCount = desvios?.filter((d) => d.status === "corrigido").length || 0;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <EditablePageTitle pageKey="desvios" defaultValue="Desvios" className="text-xl md:text-2xl font-bold text-foreground" />
              <p className="text-sm text-muted-foreground">Desvios de segurança</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> Novo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <div className="text-lg font-bold text-foreground">{openCount}</div>
                <div className="text-xs text-muted-foreground">Em aberto</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-lg font-bold text-foreground">{fixedCount}</div>
                <div className="text-xs text-muted-foreground">Corrigidos</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-2 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Registrar Desvio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mention users */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Mencionar Responsáveis
                </label>
                {/* Selected users chips */}
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedUserIds.map((uid) => {
                      const u = allUsers.find((x) => x.user_id === uid);
                      if (!u) return null;
                      return (
                        <Badge key={uid} variant="secondary" className="gap-1 pr-1">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px]">{u.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{u.full_name}</span>
                          <button onClick={() => setSelectedUserIds((prev) => prev.filter((id) => id !== uid))} className="ml-0.5 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (!selectedUserIds.includes(val)) {
                      setSelectedUserIds((prev) => [...prev, val]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar pessoa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers
                      .filter((u) => !selectedUserIds.includes(u.user_id))
                      .map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">{u.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {u.full_name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due date */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
                  Previsão de Entrega
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Items */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  Itens para Correção
                </label>
                <div className="space-y-3">
                  {formItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                        {formItems.length > 1 && (
                          <button onClick={() => removeFormItem(item.id)} className="text-destructive hover:text-destructive/80">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="Descreva o desvio..."
                        value={item.description}
                        onChange={(e) => updateFormItem(item.id, "description", e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        {item.photo_url ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden border cursor-pointer" onClick={() => setViewingImage(item.photo_url)}>
                            <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={(e) => { e.stopPropagation(); updateFormItem(item.id, "photo_url", null); }}
                              className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveItemId(item.id);
                              fileInputRef.current?.click();
                            }}
                            disabled={uploading}
                            className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                          >
                            {uploading && activeItemId === item.id ? (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <span className="text-xs text-muted-foreground">Foto do desvio</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2 gap-1 text-xs w-full" onClick={addFormItem}>
                  <Plus className="w-3 h-3" /> Adicionar Item
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSubmit} disabled={createDesvio.isPending} className="flex-1">
                  {createDesvio.isPending ? "Salvando..." : "Registrar Desvio"}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setFormItems([{ id: crypto.randomUUID(), description: "", photo_url: null }]); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          {(["todos", "aberto", "corrigido"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="text-xs capitalize">
              {f}
            </Button>
          ))}
        </div>

        {/* Desvios List */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Carregando...</div>
        ) : !filtered?.length ? (
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum desvio encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((desvio) => {
              const isOverdue = desvio.due_date && desvio.status === "aberto" && new Date(desvio.due_date) < new Date();
              const isMentioned = desvio.mentioned_user_id === user?.id || (desvio.mentioned_user_ids || []).includes(user?.id || "");
              const isCreator = desvio.created_by === user?.id;
              const hasItems = desvio.items && desvio.items.length > 0;

              return (
                <Card
                  key={desvio.id}
                  id={`desvio-${desvio.id}`}
                  className={cn(
                    "border transition-all duration-500",
                    desvio.status === "corrigido" && "border-green-500/30 bg-green-500/5",
                    isOverdue && "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Por {desvio.created_by_name} • {format(new Date(desvio.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <Badge
                        variant={desvio.status === "corrigido" ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          desvio.status === "corrigido" && "bg-green-500 hover:bg-green-600",
                          isOverdue && "bg-red-500 hover:bg-red-600"
                        )}
                      >
                        {desvio.status === "corrigido" ? "Corrigido" : isOverdue ? "Atrasado" : "Aberto"}
                      </Badge>
                    </div>

                    {/* Mentioned users */}
                    {(() => {
                      const names = (desvio.mentioned_user_names && desvio.mentioned_user_names.length > 0)
                        ? desvio.mentioned_user_names
                        : desvio.mentioned_user_name ? [desvio.mentioned_user_name] : [];
                      if (names.length === 0) return null;
                      return (
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Responsáveis:</span>
                          {names.map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Due date */}
                    {desvio.due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Previsão:</span>
                        <span className={cn("font-medium", isOverdue ? "text-red-500" : "text-foreground")}>
                          {format(new Date(desvio.due_date), "dd/MM/yyyy")}
                        </span>
                      </div>
                    )}

                    {/* Items list */}
                    {hasItems && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Itens ({desvio.items.length})</p>
                        {desvio.items.map((item, idx) => (
                          <div key={item.id} className="border rounded-lg p-3 bg-muted/20 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-muted-foreground mt-0.5">{idx + 1}.</span>
                              <p className="text-sm text-foreground flex-1">{item.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {/* Desvio photo */}
                              {item.photo_url && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1">
                                    <ImageIcon className="w-2.5 h-2.5 inline mr-0.5" />Desvio
                                  </p>
                                  <div
                                    className="w-14 h-14 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    onClick={() => setViewingImage(item.photo_url)}
                                  >
                                    <img src={item.photo_url!} alt="" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              )}
                              {/* Correction photo */}
                              {item.correction_photo_url ? (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-green-600 dark:text-green-400 mb-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />Correção
                                  </p>
                                  <div className="relative group">
                                    <div
                                      className="w-14 h-14 rounded-lg overflow-hidden border border-green-500/30 cursor-pointer hover:ring-2 hover:ring-green-500 transition-all"
                                      onClick={() => setViewingImage(item.correction_photo_url)}
                                    >
                                      <img src={item.correction_photo_url!} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    {isMentioned && desvio.status === "aberto" && (
                                      <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCorrectionDialog({
                                              desvioId: desvio.id,
                                              itemId: item.id,
                                              photoUrl: item.correction_photo_url,
                                              observation: item.correction_observation || "",
                                            });
                                          }}
                                          className="p-0.5 rounded-full bg-primary text-primary-foreground"
                                          title="Alterar correção"
                                        >
                                          <Camera className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const updatedItems = desvio.items.map((it) =>
                                              it.id === item.id ? { ...it, correction_photo_url: null, correction_observation: null } : it
                                            );
                                            await updateItems.mutateAsync({ desvioId: desvio.id, items: updatedItems });
                                            toast.success("Correção removida");
                                          }}
                                          className="p-0.5 rounded-full bg-destructive text-destructive-foreground"
                                          title="Remover correção"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {item.correction_observation && (
                                    <p className="text-xs text-muted-foreground italic max-w-[200px]">
                                      <span className="font-medium text-foreground">Obs:</span> {item.correction_observation}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                isMentioned && desvio.status === "aberto" && (
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-1">Correção</p>
                                    <button
                                      onClick={() => {
                                        setCorrectionDialog({ desvioId: desvio.id, itemId: item.id, photoUrl: null, observation: "" });
                                      }}
                                      disabled={uploading}
                                      className="w-14 h-14 rounded-lg border-2 border-dashed border-green-500/30 flex items-center justify-center hover:border-green-500/50 transition-colors"
                                    >
                                      <Upload className="w-4 h-4 text-green-500/60" />
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legacy: show old photo_urls if no items */}
                    {!hasItems && desvio.photo_urls && desvio.photo_urls.length > 0 && (
                      <div>
                        <p className="text-sm text-foreground mb-2">{desvio.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {desvio.photo_urls.map((url, i) => (
                            <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => setViewingImage(url)}>
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hasItems && (!desvio.photo_urls || desvio.photo_urls.length === 0) && (
                      <p className="text-sm text-foreground">{desvio.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(isMentioned || isCreator) && desvio.status === "aberto" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                          onClick={() => updateStatus.mutate({ desvioId: desvio.id, status: "corrigido" })}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Marcar Corrigido
                        </Button>
                      )}

                      {isCreator && desvio.status === "corrigido" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => updateStatus.mutate({ desvioId: desvio.id, status: "aberto" })}
                        >
                          <Clock className="w-3 h-3" /> Reabrir
                        </Button>
                      )}

                      {isCreator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs text-destructive hover:bg-destructive/10 ml-auto"
                          onClick={() => deleteDesvio.mutate(desvio.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {/* Comments */}
                    <DesvioCommentSection desvioId={desvio.id} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleItemPhotoUpload} />
        <input ref={correctionInputRef} type="file" accept="image/*" className="hidden" onChange={handleCorrectionUpload} />

        {/* Image viewer dialog */}
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-3xl p-2">
            {viewingImage && (
              <img src={viewingImage} alt="Foto" className="w-full h-auto rounded-lg max-h-[80vh] object-contain" />
            )}
          </DialogContent>
        </Dialog>

        {/* Correction dialog */}
        <Dialog open={!!correctionDialog} onOpenChange={() => setCorrectionDialog(null)}>
          <DialogContent className="max-w-sm">
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">Registrar Correção</h3>

              {/* Photo upload */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  <Camera className="w-3.5 h-3.5 inline mr-1" />
                  Foto da Correção *
                </label>
                <input ref={correctionDialogInputRef} type="file" accept="image/*" className="hidden" onChange={handleCorrectionDialogPhotoUpload} />
                {correctionDialog?.photoUrl ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-green-500/30">
                    <img src={correctionDialog.photoUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setCorrectionDialog((prev) => prev ? { ...prev, photoUrl: null } : null)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => correctionDialogInputRef.current?.click()}
                    disabled={uploading}
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-green-500/30 flex flex-col items-center justify-center gap-1 hover:border-green-500/50 transition-colors"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-green-500/60" />
                        <span className="text-[10px] text-muted-foreground">Adicionar</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Observation */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Observação da Correção
                </label>
                <Textarea
                  placeholder="Descreva como foi corrigido..."
                  value={correctionDialog?.observation || ""}
                  onChange={(e) => setCorrectionDialog((prev) => prev ? { ...prev, observation: e.target.value } : null)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveCorrection} disabled={!correctionDialog?.photoUrl || uploading} className="flex-1 gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Salvar Correção
                </Button>
                <Button variant="outline" onClick={() => setCorrectionDialog(null)}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
