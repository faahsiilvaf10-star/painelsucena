import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAnnouncements, Announcement } from "@/hooks/useAnnouncements";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, Upload, Trash2, Users, User, Clock, Eye, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  full_name: string;
}

export function AnnouncementManager() {
  const { announcements, allReads, isLoading, createAnnouncement, deleteAnnouncement } = useAnnouncements();
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Fetch all profiles for user selection
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageUrl(null);
    setTargetType("all");
    setSelectedUsers([]);
    setIsScheduled(false);
    setScheduledDate("");
    setScheduledTime("");
    setIsCreating(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("site-assets").getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Preencha o título e o conteúdo.");
      return;
    }

    if (targetType === "specific" && selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuário.");
      return;
    }

    let scheduledAt: string | null = null;
    if (isScheduled && scheduledDate && scheduledTime) {
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    await createAnnouncement.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl,
      target_type: targetType,
      target_users: targetType === "specific" ? selectedUsers : [],
      scheduled_at: scheduledAt,
    });

    resetForm();
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const getReadCount = (announcementId: string) => {
    return allReads.filter((r) => r.announcement_id === announcementId).length;
  };

  const getTargetCount = (announcement: Announcement) => {
    if (announcement.target_type === "all") {
      return profiles.length;
    }
    return announcement.target_users?.length || 0;
  };

  const isPublished = (announcement: Announcement) => {
    return new Date(announcement.published_at) <= new Date();
  };

  return (
    <div className="space-y-6">
      {/* Create Announcement Section */}
      {!isCreating ? (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => setIsCreating(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Comunicado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Novo Comunicado
            </CardTitle>
            <CardDescription>
              Crie um comunicado para os usuários do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do comunicado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva o conteúdo do comunicado..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Banner (opcional)</Label>
              <div className="flex items-center gap-4">
                {imageUrl ? (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden">
                    <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 w-6 h-6"
                      onClick={() => setImageUrl(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Enviar Imagem
                      </>
                    )}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destinatários</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as "all" | "specific")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Todos os usuários
                    </div>
                  </SelectItem>
                  <SelectItem value="specific">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Usuários específicos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "specific" && (
              <div className="space-y-2">
                <Label>Selecione os usuários</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.user_id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedUsers.includes(profile.user_id)
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleUserSelection(profile.user_id)}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedUsers.includes(profile.user_id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedUsers.includes(profile.user_id) && "✓"}
                      </div>
                      <span className="text-sm">{profile.full_name}</span>
                    </div>
                  ))}
                </div>
                {selectedUsers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedUsers.length} usuário(s) selecionado(s)
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="scheduled"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                />
                <Label htmlFor="scheduled" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Agendar
                </Label>
              </div>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled-date">Data</Label>
                  <Input
                    id="scheduled-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Hora</Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createAnnouncement.isPending}
                className="flex-1"
              >
                {createAnnouncement.isPending ? "Criando..." : "Criar Comunicado"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>Comunicados</CardTitle>
          <CardDescription>
            Lista de todos os comunicados enviados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum comunicado criado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Publicação</TableHead>
                  <TableHead>Visualizações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {announcement.image_url && (
                          <img
                            src={announcement.image_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <span className="truncate max-w-[200px]">{announcement.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={announcement.target_type === "all" ? "default" : "secondary"}>
                        {announcement.target_type === "all" ? (
                          <><Users className="w-3 h-3 mr-1" /> Todos</>
                        ) : (
                          <><User className="w-3 h-3 mr-1" /> {announcement.target_users?.length || 0}</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!isPublished(announcement) && (
                          <Clock className="w-3 h-3 text-yellow-500" />
                        )}
                        <span className="text-sm">
                          {format(new Date(announcement.published_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {!isPublished(announcement) && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Agendado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {getReadCount(announcement.id)} / {getTargetCount(announcement)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteAnnouncement.mutate(announcement.id)}
                        disabled={deleteAnnouncement.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
