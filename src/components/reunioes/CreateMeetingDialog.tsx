import { useMemo, useState } from "react";
import { Copy, Check, Plus, Loader2, Search, X, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useMeetings, type Meeting } from "@/hooks/useMeetings";
import { useAllUsers } from "@/hooks/useAllUsers";
import { useAuth } from "@/hooks/useAuth";
import { useCreateNotification } from "@/hooks/useNotifications";
import { getBrazilNorthTodayString } from "@/lib/timezone";

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (meeting: Meeting) => void;
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMeetingDialogProps) {
  const { create } = useMeetings();
  const { allUsers } = useAllUsers();
  const { user } = useAuth();
  const createNotification = useCreateNotification();
  const today = getBrazilNorthTodayString();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [created, setCreated] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDate(today);
    setStart("09:00");
    setEnd("10:00");
    setSelectedIds([]);
    setSearch("");
    setCreated(null);
    setCopied(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const buildShareUrl = (m: Meeting) =>
    `${window.location.origin}/reunioes?room=${encodeURIComponent(m.room_name)}`;

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(created));
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const selectableUsers = useMemo(
    () => allUsers.filter((u) => u.user_id !== user?.id),
    [allUsers, user?.id]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return selectableUsers;
    return selectableUsers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        (u.cargo || "").toLowerCase().includes(q)
    );
  }, [selectableUsers, search]);

  const selectedUsers = useMemo(
    () => selectableUsers.filter((u) => selectedIds.includes(u.user_id)),
    [selectableUsers, selectedIds]
  );

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Informe o nome da reunião");
      return;
    }
    try {
      const meeting = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: date,
        start_time: start,
        end_time: end || undefined,
        participants: selectedIds,
      });
      setCreated(meeting);
      onCreated?.(meeting);
      toast.success("Reunião criada!");

      // Notificar usuários mencionados
      if (selectedIds.length > 0) {
        const link = `/reunioes?room=${encodeURIComponent(meeting.room_name)}`;
        const message = `${meeting.created_by_name} convidou você para "${meeting.title}" em ${meeting.scheduled_date} às ${meeting.start_time}.`;
        await Promise.allSettled(
          selectedIds.map((uid) =>
            createNotification.mutateAsync({
              user_id: uid,
              type: "meeting_invite",
              title: "Você foi convidado para uma reunião",
              message,
              reference_id: meeting.id,
              reference_type: link,
            })
          )
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar reunião");
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{created ? "Reunião criada" : "Nova reunião"}</DialogTitle>
          <DialogDescription>
            {created
              ? "Compartilhe o link abaixo com os participantes."
              : "Defina os detalhes para gerar o link da reunião."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="font-semibold">{created.title}</div>
              <div className="text-muted-foreground">
                {created.scheduled_date} • {created.start_time}
                {created.end_time ? ` – ${created.end_time}` : ""}
              </div>
              {selectedUsers.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {selectedUsers.length} participante(s) notificado(s)
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={buildShareUrl(created)} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  handleClose(false);
                  window.location.href = `/reunioes?room=${encodeURIComponent(created.room_name)}`;
                }}
              >
                Entrar agora
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-title">Nome da reunião</Label>
              <Input
                id="m-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Alinhamento semanal"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="m-date">Data</Label>
                <Input
                  id="m-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-start">Início</Label>
                <Input
                  id="m-start"
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-end">Fim</Label>
                <Input
                  id="m-end"
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-desc">Descrição</Label>
              <Textarea
                id="m-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pauta, contexto..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participantes
                {selectedIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedIds.length}
                  </Badge>
                )}
              </Label>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/30 p-2">
                  {selectedUsers.map((u) => (
                    <Badge
                      key={u.user_id}
                      variant="secondary"
                      className="flex items-center gap-1 pl-1 pr-1.5"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px]">
                          {initials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{u.full_name}</span>
                      <button
                        type="button"
                        onClick={() => toggleUser(u.user_id)}
                        className="ml-0.5 rounded hover:bg-background/50"
                        aria-label="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar usuário pelo nome ou cargo..."
                  className="pl-8"
                />
              </div>

              <ScrollArea className="h-48 rounded-md border">
                <div className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Nenhum usuário encontrado
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const checked = selectedIds.includes(u.user_id);
                      return (
                        <button
                          key={u.user_id}
                          type="button"
                          onClick={() => toggleUser(u.user_id)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                            checked ? "bg-muted/40" : ""
                          }`}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {initials(u.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium">
                              {u.full_name}
                            </span>
                            {u.cargo && (
                              <span className="truncate text-[11px] text-muted-foreground">
                                {u.cargo}
                              </span>
                            )}
                          </div>
                          {u.isOnline && (
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          )}
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <p className="text-[11px] text-muted-foreground">
                Os selecionados serão notificados ao criar a reunião.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Criar reunião
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
