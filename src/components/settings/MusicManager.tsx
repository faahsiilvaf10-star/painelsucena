import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Music, Upload, Trash2, Loader2, Clock, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { useMusicTracks, useUploadMusicTrack, useDeleteMusicTrack, useDeleteAllTracksBySlot, TIME_SLOT_LABELS } from "@/hooks/useMusicTracks";
import { useRadio } from "@/contexts/RadioContext";
import { cn } from "@/lib/utils";

export const MusicManager = () => {
  const { data: tracks = [], isLoading } = useMusicTracks();
  const uploadMutation = useUploadMusicTrack();
  const deleteMutation = useDeleteMusicTrack();
  const deleteAllMutation = useDeleteAllTracksBySlot();
  const { shuffleAll, setShuffleAll } = useRadio();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number>(8);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const audioFiles = files.filter(f => f.type.startsWith("audio/"));
    if (audioFiles.length !== files.length) {
      toast.warning("Alguns arquivos não são de áudio e foram ignorados");
    }
    setSelectedFiles(audioFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos um arquivo de áudio");
      return;
    }

    setUploading(true);
    let success = 0;
    let failed = 0;

    for (const file of selectedFiles) {
      try {
        await uploadMutation.mutateAsync({ file, timeSlot: selectedTimeSlot });
        success++;
      } catch (err) {
        console.error("Upload failed:", err);
        failed++;
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (success > 0) toast.success(`${success} música(s) adicionada(s) ao horário ${TIME_SLOT_LABELS[selectedTimeSlot].label}!`);
    if (failed > 0) toast.error(`${failed} arquivo(s) falharam no upload`);
  };

  const handleDelete = async (track: any) => {
    try {
      await deleteMutation.mutateAsync(track);
      toast.success("Música removida");
    } catch {
      toast.error("Erro ao remover música");
    }
  };

  const handleDeleteAllSlot = async (slot: number) => {
    const slotTracks = tracksBySlot[slot];
    if (!slotTracks || slotTracks.length === 0) return;
    if (!confirm(`Apagar todas as ${slotTracks.length} músicas do horário ${TIME_SLOT_LABELS[slot].label}?`)) return;
    try {
      await deleteAllMutation.mutateAsync(slotTracks);
      toast.success(`${slotTracks.length} música(s) removida(s) do horário ${TIME_SLOT_LABELS[slot].label}`);
    } catch {
      toast.error("Erro ao remover músicas");
    }
  };

  // Group tracks by time slot
  const tracksBySlot = tracks.reduce<Record<number, typeof tracks>>((acc, track) => {
    if (!acc[track.time_slot]) acc[track.time_slot] = [];
    acc[track.time_slot].push(track);
    return acc;
  }, {});

  const slotsWithTracks = Object.keys(tracksBySlot)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Gerenciar Músicas da Rádio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shuffle Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Shuffle className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Modo Aleatório</p>
              <p className="text-xs text-muted-foreground">
                Toca todas as músicas em ordem aleatória, ignorando os horários
              </p>
            </div>
          </div>
          <Switch checked={shuffleAll} onCheckedChange={setShuffleAll} />
        </div>

        {/* Upload Section */}
        <div className="space-y-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5" />
              Horário de Reprodução
            </Label>
            <Select
              value={String(selectedTimeSlot)}
              onValueChange={(v) => setSelectedTimeSlot(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_SLOT_LABELS.map(slot => (
                  <SelectItem key={slot.value} value={String(slot.value)}>
                    {slot.label}
                    {tracksBySlot[slot.value] && (
                      <span className="ml-2 text-muted-foreground">
                        ({tracksBySlot[slot.value].length} música{tracksBySlot[slot.value].length !== 1 ? "s" : ""})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Arquivos de Áudio (MP3, WAV, etc.)</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFilesSelected}
              disabled={uploading}
              className="mt-1"
            />
            {selectedFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFiles.length} arquivo(s) — {(selectedFiles.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(1)}MB
              </p>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Enviar para {TIME_SLOT_LABELS[selectedTimeSlot].label}
              </>
            )}
          </Button>
        </div>

        {/* Track List grouped by time slot */}
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">
            Programação ({tracks.length} música{tracks.length !== 1 ? "s" : ""})
          </Label>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : slotsWithTracks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma música adicionada ainda
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-3">
              {slotsWithTracks.map(slot => (
                <div key={slot} className="space-y-1">
                  <div className="flex items-center gap-2 px-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {TIME_SLOT_LABELS[slot].label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({tracksBySlot[slot].length})
                    </span>
                  </div>
                  {tracksBySlot[slot].map((track, i) => (
                    <div
                      key={track.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-md text-sm",
                        "bg-secondary/30 hover:bg-secondary/50 transition-colors ml-4"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground text-xs w-4 text-right shrink-0">
                          {i + 1}
                        </span>
                        <Music className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="text-sm truncate">{track.file_name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(track)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
