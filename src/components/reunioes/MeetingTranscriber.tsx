import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Sparkles, FileText, Save, Download } from "lucide-react";
import { exportMeetingPdf } from "@/lib/meetingPdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useEnvironment } from "@/hooks/useEnvironment";

// Tipagem mínima da Web Speech API
type SpeechRecognitionAlt = any;

interface MeetingTranscriberProps {
  roomName: string;
  meetingId?: string | null;
  meetingTitle?: string;
  participants?: string[];
  snapshots?: string[];
  onSummaryReady?: (
    summary: { summary: string; key_points: string[]; action_items: Array<{ task: string; owner?: string }> },
    transcriptId: string,
    transcript: string,
  ) => void;
}

export function MeetingTranscriber({
  roomName,
  meetingId,
  meetingTitle,
  participants = [],
  snapshots = [],
  onSummaryReady,
}: MeetingTranscriberProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { environment } = useEnvironment();

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionAlt | null>(null);
  const restartRef = useRef(false);
  const finalRef = useRef("");

  useEffect(() => {
    finalRef.current = finalText;
  }, [finalText]);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec: SpeechRecognitionAlt = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "pt-BR";

    rec.onresult = (event: any) => {
      let interimChunk = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i];
        const text = res[0]?.transcript || "";
        if (res.isFinal) finalChunk += text + " ";
        else interimChunk += text;
      }
      if (finalChunk) {
        const stamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const speaker = profile?.full_name || "Você";
        const line = `[${stamp}] ${speaker}: ${finalChunk.trim()}\n`;
        setFinalText((prev) => prev + line);
      }
      setInterim(interimChunk);
    };

    rec.onerror = (e: any) => {
      console.warn("[Transcriber] error", e?.error);
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast.error("Permissão de microfone negada para transcrição.");
        setListening(false);
        restartRef.current = false;
      }
    };

    rec.onend = () => {
      // Reinicia automaticamente se ainda estiver "ligado"
      if (restartRef.current) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = rec;
    return () => {
      restartRef.current = false;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.full_name]);

  const start = () => {
    if (!recognitionRef.current) return;
    restartRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
      toast.success("Transcrição iniciada", { duration: 2000 });
    } catch (e) {
      console.warn("start error", e);
    }
  };

  const stop = () => {
    restartRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  const generateSummary = async () => {
    const transcript = (finalRef.current || finalText).trim();
    if (!transcript || transcript.length < 20) {
      toast.error("Transcrição muito curta para resumir.");
      return;
    }
    if (!user?.id) {
      toast.error("Usuário não autenticado.");
      return;
    }

    setSummarizing(true);
    try {
      // 1) Chama IA para gerar resumo PRIMEIRO (não depende do banco)
      console.log("[summarize] invocando edge function", { length: transcript.length });
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        "summarize-meeting",
        {
          body: { transcript, meetingTitle, participants },
        },
      );

      console.log("[summarize] resposta", { aiError, aiData });

      if (aiError) {
        console.error("[summarize] erro invoke:", aiError);
        toast.error(`Falha ao chamar IA: ${aiError.message || aiError}`);
        return;
      }
      if (!aiData || aiData.error) {
        console.error("[summarize] erro IA:", aiData?.error);
        toast.error(aiData?.error || "Falha ao gerar resumo da IA.");
        return;
      }
      if (!aiData.summary && (!aiData.key_points || aiData.key_points.length === 0)) {
        toast.error("IA retornou resposta vazia.");
        return;
      }

      const summaryPayload = {
        summary: aiData.summary || "",
        key_points: aiData.key_points || [],
        action_items: aiData.action_items || [],
      };

      // 2) Tenta salvar no banco (não bloqueia o resumo se falhar)
      let savedId: string | null = null;
      try {
        setSaving(true);
        const { data: inserted, error: insertErr } = await supabase
          .from("meeting_transcripts")
          .insert({
            room_name: roomName,
            meeting_id: meetingId || null,
            meeting_title: meetingTitle || null,
            environment: environment || "barcarena",
            transcript,
            participants,
            snapshots,
            created_by: user.id,
            created_by_name: profile?.full_name || user.email || "Anônimo",
            ended_at: new Date().toISOString(),
            summary: summaryPayload.summary || null,
            key_points: summaryPayload.key_points,
            action_items: summaryPayload.action_items,
          })
          .select("id")
          .single();
        setSaving(false);

        if (insertErr) {
          console.warn("[summarize] não conseguiu salvar transcrição:", insertErr);
          toast.warning("Resumo gerado, mas não foi salvo no banco.");
        } else {
          savedId = inserted?.id || null;
        }
      } catch (e) {
        console.warn("[summarize] exceção ao salvar:", e);
      }

      toast.success("Resumo gerado!");
      onSummaryReady?.(summaryPayload, savedId || "", transcript);
    } catch (e) {
      console.error("[summarize] erro inesperado:", e);
      toast.error(`Erro: ${e instanceof Error ? e.message : "desconhecido"}`);
    } finally {
      setSummarizing(false);
      setSaving(false);
    }
  };

  if (!supported) {
    return (
      <Card className="p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MicOff className="h-4 w-4" />
          Seu navegador não suporta transcrição automática. Use Chrome/Edge no desktop.
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Transcrição & Resumo IA</h3>
          {listening && (
            <Badge variant="default" className="gap-1 bg-red-600 hover:bg-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Gravando
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!listening ? (
            <Button size="sm" variant="default" onClick={start}>
              <Mic className="mr-1.5 h-3.5 w-3.5" /> Iniciar
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stop}>
              <MicOff className="mr-1.5 h-3.5 w-3.5" /> Parar
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={generateSummary}
            disabled={summarizing || saving || !finalText.trim()}
          >
            {summarizing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Resumir
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void exportMeetingPdf(
                {
                  meetingTitle,
                  roomName,
                  participants,
                  transcript: finalText,
                  snapshots,
                },
                `transcricao-${(meetingTitle || roomName || "reuniao").replace(/[^a-z0-9]+/gi, "_")}.pdf`,
              );
            }}
            disabled={!finalText.trim()}
            title="Exportar transcrição em PDF"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {finalText.trim() === "" && !interim ? (
          <p className="text-xs text-muted-foreground italic">
            Clique em <strong>Iniciar</strong> para começar a capturar e transcrever a fala.
            A IA salvará e resumirá tudo ao final.
          </p>
        ) : (
          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed font-sans">
            {finalText}
            {interim && (
              <span className="text-muted-foreground italic">{interim}</span>
            )}
          </pre>
        )}
      </ScrollArea>

      {(saving || summarizing) && (
        <div className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {saving ? "Salvando transcrição..." : "Gerando resumo com IA..."}
        </div>
      )}
    </Card>
  );
}
