import { useState } from "react";
import { Copy, Check, Plus, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { useMeetings, type Meeting } from "@/hooks/useMeetings";
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
  const today = getBrazilNorthTodayString();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [participantsText, setParticipantsText] = useState("");
  const [created, setCreated] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDate(today);
    setStart("09:00");
    setEnd("10:00");
    setParticipantsText("");
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Informe o nome da reunião");
      return;
    }
    try {
      const participants = participantsText
        .split(/[,;\n]/)
        .map((p) => p.trim())
        .filter(Boolean);
      const meeting = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: date,
        start_time: start,
        end_time: end || undefined,
        participants,
      });
      setCreated(meeting);
      onCreated?.(meeting);
      toast.success("Reunião criada!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar reunião");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
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
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-part">Participantes / convidados</Label>
              <Textarea
                id="m-part"
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
                placeholder="Separe por vírgula ou linha"
                rows={2}
              />
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
