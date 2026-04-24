import { useEffect, useRef } from "react";
import { useTrackMeetingPresence } from "@/hooks/useActiveMeetingPresence";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

const JITSI_DOMAIN = "meet.jit.si";
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

let scriptPromise: Promise<void> | null = null;
function loadJitsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Jitsi")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Falha ao carregar Jitsi"));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

interface JitsiRoomProps {
  roomName: string;
  displayName: string;
  email?: string;
  subject?: string;
  startWithAudioMuted?: boolean;
  startWithVideoMuted?: boolean;
  isModerator?: boolean;
  onReady?: () => void;
  onLeave?: () => void;
  onParticipantJoined?: (p: { displayName?: string; id?: string }) => void;
  onParticipantLeft?: (p: { displayName?: string; id?: string }) => void;
}

export function JitsiRoom({
  roomName,
  displayName,
  email,
  subject,
  startWithAudioMuted = false,
  startWithVideoMuted = false,
  isModerator = false,
  onReady,
  onLeave,
  onParticipantJoined,
  onParticipantLeft,
}: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  useTrackMeetingPresence(roomName);

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      try {
        await loadJitsiScript();
      } catch (e) {
        console.error("Jitsi script load failed", e);
        return;
      }
      if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;

      // Toolbar — moderador tem controles de "mute everyone" e gerenciar
      const moderatorButtons = [
        "mute-everyone",
        "mute-video-everyone",
        "security",
      ];
      const baseButtons = [
        "microphone",
        "camera",
        "desktop", // compartilhar tela (abre seletor nativo: tela, janela ou aba)
        "fullscreen",
        "fodeviceselection",
        "hangup",
        "chat",
        "raisehand",
        "videoquality",
        "filmstrip",
        "tileview",
        "settings",
        "participants-pane",
        "select-background",
        "invite",
      ];

      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName, email: email || "" },
        configOverwrite: {
          subject: subject || roomName,
          startWithAudioMuted,
          startWithVideoMuted,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          // Layout estilo Teams: grade automática sem cortes
          startWithVideoFilterEnabled: false,
          disableTileEnlargement: false,
          tileView: { numberOfVisibleTiles: 25 },
          startTileView: true, // abrir já em modo grade
          // Compartilhamento de tela: permite escolher tela inteira, janela ou aba
          desktopSharingFrameRate: { min: 5, max: 30 },
          desktopSharingSources: ["screen", "window", "tab"],
          // Mostra o nome embaixo de cada vídeo
          hideDisplayName: false,
          hideDominantSpeakerBadge: false,
          // Preencher tile sem cortar (object-fit: contain)
          disableLocalVideoFlip: false,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: "#0f172a",
          DISABLE_VIDEO_BACKGROUND: false,
          DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
          // CRÍTICO: vídeo "contain" para não cortar o rosto/janela
          VIDEO_LAYOUT_FIT: "both",
          FILM_STRIP_MAX_HEIGHT: 120,
          VERTICAL_FILMSTRIP: true,
          // Sempre exibir o nome do participante
          SHOW_CHROME_EXTENSION_BANNER: false,
          DISABLE_TRANSCRIPTION_SUBTITLES: true,
          TILE_ASPECT_RATIO: 16 / 9,
          TOOLBAR_BUTTONS: isModerator
            ? [...baseButtons, ...moderatorButtons]
            : baseButtons,
        },
      });

      apiRef.current = api;
      api.addListener("videoConferenceJoined", () => {
        onReady?.();
        // Forçar tile view (grade) ao entrar para layout estilo Teams
        try {
          api.executeCommand("setTileView", true);
        } catch {
          /* ignore */
        }
      });
      api.addListener("readyToClose", () => onLeave?.());
      api.addListener("videoConferenceLeft", () => onLeave?.());
      api.addListener("participantJoined", (p: any) => onParticipantJoined?.(p));
      api.addListener("participantLeft", (p: any) => onParticipantLeft?.(p));
    };

    init();

    return () => {
      disposed = true;
      try {
        apiRef.current?.dispose?.();
      } catch {
        /* ignore */
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, isModerator]);

  return <div ref={containerRef} className="h-full w-full" />;
}
