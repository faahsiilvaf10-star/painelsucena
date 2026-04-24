import { useEffect, useState } from "react";
import { UserMinus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface ManageableParticipant {
  participantId: string;
  displayName?: string;
  avatarURL?: string;
}

interface ManageParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetchParticipants: () => ManageableParticipant[];
  myId?: string;
  onKick: (participantId: string) => void;
}

export function ManageParticipantsDialog({
  open,
  onOpenChange,
  fetchParticipants,
  myId,
  onKick,
}: ManageParticipantsDialogProps) {
  const [participants, setParticipants] = useState<ManageableParticipant[]>([]);
  const [confirmKick, setConfirmKick] = useState<ManageableParticipant | null>(null);

  useEffect(() => {
    if (!open) return;
    const refresh = () => setParticipants(fetchParticipants());
    refresh();
    const interval = window.setInterval(refresh, 2000);
    return () => window.clearInterval(interval);
  }, [open, fetchParticipants]);

  const handleConfirmKick = () => {
    if (!confirmKick) return;
    onKick(confirmKick.participantId);
    toast.success(`${confirmKick.displayName || "Participante"} foi removido`);
    setConfirmKick(null);
    setParticipants((prev) => prev.filter((p) => p.participantId !== confirmKick.participantId));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participantes da reunião
            </DialogTitle>
            <DialogDescription>
              Como anfitrião, você pode remover participantes da chamada.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-2">
            {participants.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum participante encontrado.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => {
                  const isMe = myId && p.participantId === myId;
                  const initial = (p.displayName || "?").charAt(0).toUpperCase();
                  return (
                    <div
                      key={p.participantId}
                      className="flex items-center gap-3 rounded-lg border bg-card p-2.5"
                    >
                      <Avatar className="h-9 w-9">
                        {p.avatarURL ? <AvatarImage src={p.avatarURL} /> : null}
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {p.displayName || "Participante"}
                        </p>
                        {isMe && (
                          <Badge variant="outline" className="mt-0.5 text-[10px]">
                            Você
                          </Badge>
                        )}
                      </div>
                      {!isMe && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmKick(p)}
                        >
                          <UserMinus className="mr-1.5 h-4 w-4" />
                          Remover
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmKick} onOpenChange={(o) => !o && setConfirmKick(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover participante?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmKick?.displayName || "Este participante"} será desconectado imediatamente da reunião.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmKick}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
