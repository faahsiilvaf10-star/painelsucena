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
  createdByAvatar,
  createdByName,
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
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const tracks: MediaStreamTrack[] = [];
    let videoFailed = false;
    let audioFailed = false;

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: false,
      });
      tracks.push(...videoStream.getVideoTracks());
    } catch {
      videoFailed = true;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: micId ? { deviceId: { exact: micId } } : true,
      });
      tracks.push(...audioStream.getAudioTracks());
    } catch {
      audioFailed = true;
    }

    const stream = new MediaStream(tracks);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const validCameras = devices.filter((d) => d.kind === "videoinput" && d.deviceId);
      const validMics = devices.filter((d) => d.kind === "audioinput" && d.deviceId);
      const validSpeakers = devices.filter((d) => d.kind === "audiooutput" && d.deviceId);
      setCameras(validCameras);
      setMics(validMics);
      setSpeakers(validSpeakers);
      if (!selectedCam) {
        const firstCam = validCameras[0];
        if (firstCam) setSelectedCam(firstCam.deviceId);
      }
      if (!selectedMic) {
        const firstMic = validMics[0];
        if (firstMic) setSelectedMic(firstMic.deviceId);
      }
    } catch {
      /* ignore */
    }

    if (videoFailed && audioFailed) {
      setError("Câmera e microfone indisponíveis no navegador. Você ainda pode entrar e ativar dentro da reunião.");
    } else if (videoFailed) {
      setError("Câmera indisponível. Você ainda pode entrar com áudio e ativar a câmera dentro da reunião.");
    } else if (audioFailed) {
      setError("Microfone indisponível. Você ainda pode entrar com câmera e ativar o áudio dentro da reunião.");
    } else {
      setError(null);
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
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold leading-tight">{meetingTitle}</h2>
            {createdByName && (
              <div className="mt-2 flex items-center gap-2">
                {createdByAvatar ? (
                  <img src={createdByAvatar} alt={createdByName} className="h-5 w-5 rounded-full object-cover border border-primary/20" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-[10px] font-bold text-primary">
                    {createdByName.charAt(0)}
                  </div>
                )}
                <span className="text-sm text-muted-foreground italic">Conduzida por {createdByName}</span>
              </div>
            )}
            <p className="mt-2 text-sm text-muted-foreground">Pronto para entrar?</p>
          </div>
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
          <Button className="flex-1" onClick={handleJoin}>
            Entrar agora
          </Button>
        </div>
      </div>
    </div>
  );
}
