import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ListChecks, Sparkles, Download } from "lucide-react";
import { exportMeetingPdf } from "@/lib/meetingPdf";

export interface MeetingSummary {
  summary: string;
  key_points: string[];
  action_items: Array<{ task: string; owner?: string }>;
}

interface MeetingSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: MeetingSummary | null;
  meetingTitle?: string;
  transcript?: string;
  roomName?: string;
  participants?: string[];
  snapshots?: string[];
}

export function MeetingSummaryDialog({
  open,
  onOpenChange,
  summary,
  meetingTitle,
  transcript,
  roomName,
  participants,
  snapshots = [],
}: MeetingSummaryDialogProps) {
  const handleExport = () => {
    if (!summary) return;
    const safeName = (meetingTitle || roomName || "reuniao").replace(/[^a-z0-9]+/gi, "_");
    void exportMeetingPdf(
      {
        meetingTitle,
        roomName,
        participants,
        transcript,
        summary: summary.summary,
        keyPoints: summary.key_points,
        actionItems: summary.action_items,
        snapshots,
      },
      `ata-${safeName}.pdf`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Resumo IA da reunião
          </DialogTitle>
          <DialogDescription>
            {meetingTitle ? `Reunião: ${meetingTitle}` : "Gerado automaticamente pela IA"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          {!summary ? (
            <p className="text-sm text-muted-foreground">Nenhum resumo disponível.</p>
          ) : (
            <div className="space-y-5">
              <section>
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <FileText className="h-4 w-4" /> Resumo executivo
                </h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {summary.summary || "—"}
                </p>
              </section>

              {summary.key_points?.length > 0 && (
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <ListChecks className="h-4 w-4" /> Pontos-chave
                  </h4>
                  <ul className="space-y-1.5 text-sm list-disc pl-5">
                    {summary.key_points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </section>
              )}

              {summary.action_items?.length > 0 && (
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Badge variant="default" className="px-1.5">Ações</Badge>
                    Itens de ação
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {summary.action_items.map((item, i) => (
                      <li key={i} className="rounded-md border bg-muted/30 p-2">
                        <p className="font-medium">{item.task}</p>
                        {item.owner && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Responsável: <span className="font-medium">{item.owner}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {snapshots.length > 0 && (
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Badge variant="secondary" className="px-1.5">{snapshots.length}</Badge>
                    Capturas da reunião
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {snapshots.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-video overflow-hidden rounded border block"
                      >
                        <img src={url} alt={`Captura ${i + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleExport} disabled={!summary}>
            <Download className="mr-1.5 h-4 w-4" />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
