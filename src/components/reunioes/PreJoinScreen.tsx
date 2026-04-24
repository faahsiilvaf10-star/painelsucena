import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PreJoinProps {
  defaultName: string;
  meetingTitle: string;
  createdByAvatar?: string | null;
  createdByName?: string;
  onCancel: () => void;
  onJoin: (opts: {
    displayName: string;
    audioMuted: boolean;
    videoMuted: boolean;
  }) => void;
}

export function PreJoinScreen({
  defaultName,
  meetingTitle,
  onCancel,
  onJoin,
}: PreJoinProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [name, setName] = useState(defaultName);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const startStream = async (camId?: string, micId?: string) => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
      setMics(devices.filter((d) => d.kind === "audioinput"));
      setSpeakers(devices.filter((d) => d.kind === "audiooutput"));
      if (!selectedCam) {
        const firstCam = devices.find((d) => d.kind === "videoinput");
        if (firstCam) setSelectedCam(firstCam.deviceId);
      }
      if (!selectedMic) {
        const firstMic = devices.find((d) => d.kind === "audioinput");
        if (firstMic) setSelectedMic(firstMic.deviceId);
      }
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError"
          ? "Permissão de câmera/microfone negada. Habilite nas configurações do navegador."
          : "Não foi possível acessar câmera ou microfone."
      );
    }
  };

  useEffect(() => {
    startStream();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCam || selectedMic) {
      startStream(selectedCam || undefined, selectedMic || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCam, selectedMic]);

  const handleJoin = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onJoin({ displayName: name.trim() || defaultName, audioMuted, videoMuted });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted shadow-lg">
          {videoMuted ? (
            <div className="flex h-full w-full items-center justify-center text-white/70">
              <CameraOff className="h-12 w-12" />
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Button
            type="button"
            variant={audioMuted ? "destructive" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setAudioMuted((v) => !v)}
            aria-label="Alternar microfone"
          >
            {audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            type="button"
            variant={videoMuted ? "destructive" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setVideoMuted((v) => !v)}
            aria-label="Alternar câmera"
          >
            {videoMuted ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{meetingTitle}</h2>
          <p className="text-sm text-muted-foreground">Pronto para entrar?</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Seu nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Câmera</Label>
          <Select value={selectedCam} onValueChange={setSelectedCam}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Câmera ${d.deviceId.slice(0, 4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Microfone</Label>
          <Select value={selectedMic} onValueChange={setSelectedMic}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {mics.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microfone ${d.deviceId.slice(0, 4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {speakers.length > 0 && (
          <div className="space-y-2">
            <Label>Saída de áudio</Label>
            <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
              <SelectTrigger>
                <SelectValue placeholder="Padrão do sistema" />
              </SelectTrigger>
              <SelectContent>
                {speakers.map((d) => (
                  <SelectItem key={d.deviceId} value={d.deviceId}>
                    {d.label || `Saída ${d.deviceId.slice(0, 4)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleJoin} disabled={!!error}>
            Entrar agora
          </Button>
        </div>
      </div>
    </div>
  );
}
