import { useState, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
import { useDesvios, useCreateDesvio, useUploadDesvioPhoto, useAddCorrectionPhoto, useUpdateDesvioStatus, useDeleteDesvio } from "@/hooks/useDesvios";
import { useAuth } from "@/hooks/useAuth";
import { useAllUsers } from "@/hooks/useAllUsers";
import { toast } from "sonner";

export default function Desvios() {
  const { user } = useAuth();
  const { data: desvios, isLoading } = useDesvios();
  const { allUsers } = useAllUsers();
  const createDesvio = useCreateDesvio();
  const uploadPhoto = useUploadDesvioPhoto();
  const addCorrection = useAddCorrectionPhoto();
  const updateStatus = useUpdateDesvioStatus();
  const deleteDesvio = useDeleteDesvio();

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | "aberto" | "corrigido">("todos");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const correctionInputRef = useRef<HTMLInputElement>(null);
  const [correctionDesvioId, setCorrectionDesvioId] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadPhoto.mutateAsync(file);
        urls.push(url);
      }
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      toast.error("Erro ao fazer upload da foto");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCorrectionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !correctionDesvioId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadPhoto.mutateAsync(file);
        await addCorrection.mutateAsync({ desvioId: correctionDesvioId, photoUrl: url });
      }
    } catch {
      // Error handled by mutation
    }
    setUploading(false);
    setCorrectionDesvioId(null);
    if (correctionInputRef.current) correctionInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Descreva o desvio");
      return;
    }
    const selectedUser = allUsers.find((u) => u.user_id === selectedUserId);
    await createDesvio.mutateAsync({
      description: description.trim(),
      photo_urls: photos,
      mentioned_user_id: selectedUserId || null,
      mentioned_user_name: selectedUser?.full_name || null,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
    });
    setDescription("");
    setSelectedUserId("");
    setDueDate(undefined);
    setPhotos([]);
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
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Desvios</h1>
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
              <Textarea
                placeholder="Descreva o desvio de segurança..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />

              {/* Mention user */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Mencionar Responsável
                </label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar pessoa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u) => (
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

              {/* Photos */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  <Camera className="w-3.5 h-3.5 inline mr-1" />
                  Fotos do Desvio
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <div className="flex flex-wrap gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border cursor-pointer" onClick={() => setViewingImage(url)}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhotos((prev) => prev.filter((_, idx) => idx !== i)); }}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSubmit} disabled={createDesvio.isPending} className="flex-1">
                  {createDesvio.isPending ? "Salvando..." : "Registrar Desvio"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          {(["todos", "aberto", "corrigido"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
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
              const isMentioned = desvio.mentioned_user_id === user?.id;
              const isCreator = desvio.created_by === user?.id;

              return (
                <Card
                  key={desvio.id}
                  className={cn(
                    "border transition-colors",
                    desvio.status === "corrigido" && "border-green-500/30 bg-green-500/5",
                    isOverdue && "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{desvio.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Por {desvio.created_by_name} • {format(new Date(desvio.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
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
                    </div>

                    {/* Mentioned user */}
                    {desvio.mentioned_user_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Responsável:</span>
                        <span className="font-medium text-foreground">{desvio.mentioned_user_name}</span>
                      </div>
                    )}

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

                    {/* Desvio photos */}
                    {desvio.photo_urls && desvio.photo_urls.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          <ImageIcon className="w-3 h-3 inline mr-1" />
                          Fotos do Desvio
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {desvio.photo_urls.map((url, i) => (
                            <div
                              key={i}
                              className="w-16 h-16 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                              onClick={() => setViewingImage(url)}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Correction photos */}
                    {desvio.correction_photo_urls && desvio.correction_photo_urls.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          Fotos de Correção
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {desvio.correction_photo_urls.map((url, i) => (
                            <div
                              key={i}
                              className="w-16 h-16 rounded-lg overflow-hidden border border-green-500/30 cursor-pointer hover:ring-2 hover:ring-green-500 transition-all"
                              onClick={() => setViewingImage(url)}
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Mentioned user can upload correction photo */}
                      {isMentioned && desvio.status === "aberto" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                          onClick={() => {
                            setCorrectionDesvioId(desvio.id);
                            correctionInputRef.current?.click();
                          }}
                          disabled={uploading}
                        >
                          <Upload className="w-3 h-3" /> Foto Correção
                        </Button>
                      )}

                      {/* Mark as corrected */}
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

                      {/* Reopen */}
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

                      {/* Delete */}
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Hidden correction file input */}
        <input
          ref={correctionInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleCorrectionUpload}
        />

        {/* Image viewer dialog */}
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-3xl p-2">
            {viewingImage && (
              <img src={viewingImage} alt="Foto" className="w-full h-auto rounded-lg max-h-[80vh] object-contain" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
