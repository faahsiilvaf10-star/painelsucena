import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MeetingSnapshot {
  url: string;
  path: string;
  capturedAt: string;
}

interface MeetingSnapshotCaptureProps {
  roomName: string;
  snapshots: MeetingSnapshot[];
  onChange: (snaps: MeetingSnapshot[]) => void;
}

export function MeetingSnapshotCapture({ roomName, snapshots, onChange }: MeetingSnapshotCaptureProps) {
  const { user } = useAuth();
  const streamRef = useRef<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const ensureStream = async (): Promise<MediaStream | null> => {
    if (streamRef.current && streamRef.current.getVideoTracks().some((t) => t.readyState === "live")) {
      return streamRef.current;
    }
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      });
      streamRef.current = stream;
      // Se o usuário parar pelo botão nativo do navegador
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        streamRef.current = null;
      });
      return stream;
    } catch (e) {
      console.warn("getDisplayMedia error", e);
      toast.error("Não foi possível acessar a tela compartilhada.");
      return null;
    }
  };

  const captureFrame = async () => {
    if (!user?.id) {
      toast.error("Faça login para capturar.");
      return;
    }
    setCapturing(true);
    try {
      const stream = await ensureStream();
      if (!stream) return;

      const track = stream.getVideoTracks()[0];
      if (!track) {
        toast.error("Nenhuma fonte de vídeo selecionada.");
        return;
      }

      // Usa ImageCapture quando disponível, senão fallback via <video>
      let blob: Blob | null = null;
      const ImageCaptureCtor = (window as any).ImageCapture;
      if (ImageCaptureCtor) {
        try {
          const imgCap = new ImageCaptureCtor(track);
          const bitmap = await imgCap.grabFrame();
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(bitmap, 0, 0);
          blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
          );
        } catch (e) {
          console.warn("ImageCapture failed, fallback", e);
        }
      }

      if (!blob) {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        await new Promise((r) => setTimeout(r, 200));
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0);
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
        );
        video.pause();
        video.srcObject = null;
      }

      if (!blob) {
        toast.error("Falha ao gerar imagem.");
        return;
      }

      const safeRoom = roomName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const path = `${user.id}/${safeRoom}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("meeting-snapshots")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) {
        console.error(upErr);
        toast.error("Erro ao salvar imagem.");
        return;
      }
      const { data: pub } = supabase.storage.from("meeting-snapshots").getPublicUrl(path);
      const snap: MeetingSnapshot = {
        url: pub.publicUrl,
        path,
        capturedAt: new Date().toISOString(),
      };
      onChange([...snapshots, snap]);
      toast.success("Captura adicionada");
    } finally {
      setCapturing(false);
    }
  };

  const removeSnapshot = async (snap: MeetingSnapshot) => {
    try {
      await supabase.storage.from("meeting-snapshots").remove([snap.path]);
    } catch (e) {
      console.warn("remove storage err", e);
    }
    onChange(snapshots.filter((s) => s.path !== snap.path));
  };

  const stopShare = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    toast.info("Compartilhamento de tela encerrado");
  };

  return (
    <>
      <Card className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Capturas da reunião</h3>
            {snapshots.length > 0 && (
              <Badge variant="secondary" className="px-1.5">
                {snapshots.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="default" onClick={captureFrame} disabled={capturing}>
              {capturing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="mr-1.5 h-3.5 w-3.5" />
              )}
              Capturar
            </Button>
            {streamRef.current && (
              <Button size="sm" variant="outline" onClick={stopShare}>
                Encerrar
              </Button>
            )}
          </div>
        </div>

        {snapshots.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground italic">
            Clique em <strong>Capturar</strong> para selecionar a janela/aba/tela e tirar uma foto do
            conteúdo apresentado. As imagens ficam vinculadas à transcrição.
          </p>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="grid grid-cols-3 gap-2 p-3">
              {snapshots.map((s) => (
                <div key={s.path} className="group relative aspect-video overflow-hidden rounded border">
                  <img
                    src={s.url}
                    alt="Captura"
                    className="h-full w-full object-cover cursor-zoom-in"
                    onClick={() => setPreviewing(s.url)}
                  />
                  <button
                    type="button"
                    onClick={() => removeSnapshot(s)}
                    className="absolute top-1 right-1 rounded bg-destructive/90 text-destructive-foreground p-1 opacity-0 group-hover:opacity-100 transition"
                    title="Remover"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {previewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewing(null)}
        >
          <img src={previewing} alt="Preview" className="max-h-full max-w-full rounded" />
        </div>
      )}
    </>
  );
}
