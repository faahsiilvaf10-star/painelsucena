import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMusicTracks, useUploadMusicTrack, useDeleteMusicTrack } from "@/hooks/useMusicTracks";
import { cn } from "@/lib/utils";

export const MusicManager = () => {
  const { data: tracks = [], isLoading } = useMusicTracks();
  const uploadMutation = useUploadMusicTrack();
  const deleteMutation = useDeleteMusicTrack();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
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
      const trackTitle = selectedFiles.length === 1 && title
        ? title
        : file.name.replace(/\.[^/.]+$/, "");
      const trackArtist = selectedFiles.length === 1 ? artist : "";

      try {
        await uploadMutation.mutateAsync({ file, title: trackTitle, artist: trackArtist });
        success++;
      } catch (err) {
        console.error("Upload failed:", err);
        failed++;
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    setTitle("");
    setArtist("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (success > 0) toast.success(`${success} música(s) adicionada(s)!`);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Gerenciar Músicas da Rádio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="space-y-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Título (opcional para múltiplos)</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nome da música"
                disabled={uploading}
              />
            </div>
            <div>
              <Label>Artista (opcional)</Label>
              <Input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="Nome do artista"
                disabled={uploading}
              />
            </div>
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
                {selectedFiles.length} arquivo(s) selecionado(s) — {(selectedFiles.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(1)}MB total
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
                Enviar {selectedFiles.length > 0 ? `${selectedFiles.length} música(s)` : "Músicas"}
              </>
            )}
          </Button>
        </div>

        {/* Track List */}
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">
            Playlist ({tracks.length} música{tracks.length !== 1 ? "s" : ""})
          </Label>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tracks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma música adicionada ainda
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {tracks.map((track, i) => (
                <div
                  key={track.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-sm",
                    "bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground text-xs w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <Music className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      {track.artist && (
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(track)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
