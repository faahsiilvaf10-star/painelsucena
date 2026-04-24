import { useState, useMemo } from "react";
import { Search, UserPlus, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAllUsers } from "@/hooks/useAllUsers";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingTitle: string;
  meetingId: string;
  roomName: string;
  meetingCreatedBy: string;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  meetingTitle,
  meetingId,
  roomName,
  meetingCreatedBy,
}: InviteUserDialogProps) {
  const { user } = useAuth();
  const { allUsers } = useAllUsers();
  const createNotification = useCreateNotification();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const isHost = Boolean(user?.id && meetingCreatedBy && user.id === meetingCreatedBy);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers
      .filter((u) => !u.isCurrentUser)
      .filter((u) =>
        q ? u.full_name.toLowerCase().includes(q) || u.cargo?.toLowerCase().includes(q) : true
      );
  }, [allUsers, search]);

  const handleInvite = async (target: { user_id: string; full_name: string }) => {
    if (!user) return;
    if (!isHost) {
      toast.error("Apenas o anfitrião pode convidar usuários");
      return;
    }
    setSending(target.user_id);
    try {
      // 1) Adiciona o convidado à lista de participantes da reunião
      //    para liberar o acesso (RLS / verificação isAuthorizedFor).
      const { data: current } = await supabase
        .from("meetings")
        .select("participants")
        .eq("id", meetingId)
        .maybeSingle();
      const currentList: string[] = Array.isArray(current?.participants)
        ? (current!.participants as string[])
        : [];
      if (!currentList.includes(target.user_id)) {
        const updated = [...currentList, target.user_id];
        const { error: updateError } = await supabase
          .from("meetings")
          .update({ participants: updated })
          .eq("id", meetingId);
        if (updateError) throw updateError;
      }

      // 2) Envia notificação com link direto para a sala
      const link = `${window.location.origin}/reunioes?room=${encodeURIComponent(roomName)}`;
      await createNotification.mutateAsync({
        user_id: target.user_id,
        type: "meeting_invite",
        title: "📞 Você foi chamado para uma reunião",
        message: `${meetingTitle} — entre agora: ${link}`,
        reference_id: meetingId,
        reference_type: "meeting",
      });
      toast.success(`${target.full_name} foi convidado(a)`);
    } catch (err: any) {
      toast.error("Erro ao convidar", { description: err.message });
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Chamar usuário para a reunião
          </DialogTitle>
          <DialogDescription>
            Os usuários selecionados receberão uma notificação com o link de entrada.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado
              </p>
            ) : (
              filtered.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/50"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback>
                        {u.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{u.full_name}</p>
                      {u.isOnline && (
                        <Badge variant="outline" className="h-5 border-green-500/40 px-1.5 text-[10px] text-green-600">
                          online
                        </Badge>
                      )}
                    </div>
                    {u.cargo && (
                      <p className="truncate text-xs text-muted-foreground">{u.cargo}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleInvite(u)}
                    disabled={sending === u.user_id}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Chamar
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
