import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTrackMeetingPresence } from "@/hooks/useActiveMeetingPresence";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: JitsiEmbedOptions) => JitsiApi;
  }
}

type JitsiParticipant = {
  id?: string;
  participantId?: string;
  displayName?: string;
  formattedDisplayName?: string;
  avatarURL?: string;
};

type JitsiApi = {
  dispose?: () => void;
  addListener: (event: string, handler: (payload: JitsiParticipant) => void) => void;
  executeCommand?: (command: string, ...args: unknown[]) => void;
  getIFrame?: () => HTMLIFrameElement | null;
  getParticipantsInfo?: () => JitsiParticipant[];
  isVisitor?: () => boolean;
  myUserId?: () => string | undefined;
};

type JitsiEmbedOptions = {
  roomName: string;
  parentNode: HTMLElement;
  width: string;
  height: string;
  userInfo: { displayName: string; email: string; avatarURL: string };
  iframeAttributes: { allow: string };
  configOverwrite: Record<string, unknown>;
  interfaceConfigOverwrite: Record<string, unknown>;
};

// Servidor Jitsi alternativo estável
const JITSI_DOMAIN = "meet.jit.si";
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;
const IFRAME_ALLOW = "camera *; microphone *; fullscreen *; display-capture *; autoplay *; clipboard-read *; clipboard-write *";

type RoomStatus = "loading" | "ready" | "fallback";

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

function stableHash(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function buildEmbeddedRoomName(roomName: string, variant: "primary" | "fallback") {
  const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const appScopedSeed = `${window.location.host}:${sanitizedRoomName}:${variant}`;
  const hash = stableHash(appScopedSeed);
  return `OpsHubRoom${hash}`;
}

function buildDirectRoomUrl(
  embeddedRoomName: string,
  opts: { subject?: string; displayName: string; startWithAudioMuted: boolean; startWithVideoMuted: boolean },
) {
  const params = new URLSearchParams();
  params.set("config.prejoinPageEnabled", "false");
  params.set("config.prejoinConfig.enabled", "false");
  params.set("config.disableDeepLinking", "true");
  params.set("config.enableWelcomePage", "false");
  params.set("config.startWithAudioMuted", String(opts.startWithAudioMuted));
  params.set("config.startWithVideoMuted", String(opts.startWithVideoMuted));
  params.set("config.subject", opts.subject || embeddedRoomName);
  params.set("userInfo.displayName", opts.displayName);
  params.set("interfaceConfig.MOBILE_APP_PROMO", "false");
  return `https://${JITSI_DOMAIN}/${embeddedRoomName}#${params.toString()}`;
}

export interface JitsiRoomProps {
  roomName: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  subject?: string;
  startWithAudioMuted?: boolean;
  startWithVideoMuted?: boolean;
  isModerator?: boolean;
  onReady?: () => void;
  onLeave?: () => void;
  onParticipantJoined?: (p: { displayName?: string; id?: string }) => void;
  onParticipantLeft?: (p: { displayName?: string; id?: string }) => void;
}

export interface JitsiRoomHandle {
  getParticipants: () => Array<{ participantId: string; displayName?: string; avatarURL?: string }>;
  kickParticipant: (participantId: string) => void;
  getMyId: () => string | undefined;
}

export const JitsiRoom = forwardRef<JitsiRoomHandle, JitsiRoomProps>(function JitsiRoom(
  {
    roomName,
    displayName,
    email,
    avatarUrl,
    subject,
    startWithAudioMuted = false,
    startWithVideoMuted = false,
    isModerator = false,
    onReady,
    onLeave,
    onParticipantJoined,
    onParticipantLeft,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const retriedVisitorFallbackRef = useRef(false);
  const [roomVariant, setRoomVariant] = useState<"primary" | "fallback">("primary");
  const [status, setStatus] = useState<RoomStatus>("loading");
  const [directRoomUrl, setDirectRoomUrl] = useState("");
  useTrackMeetingPresence(roomName);

  useEffect(() => {
    retriedVisitorFallbackRef.current = false;
    setRoomVariant("primary");
    setStatus("loading");
  }, [roomName]);

  useEffect(() => {
    let disposed = false;
    let fallbackTimer: number | undefined;
    const embeddedRoomName = buildEmbeddedRoomName(roomName, roomVariant);
    setStatus("loading");
    setDirectRoomUrl(
      buildDirectRoomUrl(embeddedRoomName, {
        subject,
        displayName,
        startWithAudioMuted,
        startWithVideoMuted,
      }),
    );

    const init = async () => {
      console.log("[JitsiRoom] init started", { roomName, embeddedRoomName, roomVariant });
      try {
        await loadJitsiScript();
        console.log("[JitsiRoom] script loaded");
      } catch (e) {
        console.error("[JitsiRoom] script load failed", e);
        if (!disposed) setStatus("fallback");
        return;
      }
      if (disposed) {
        console.log("[JitsiRoom] disposed before mount");
        return;
      }
      if (!containerRef.current) {
        console.error("[JitsiRoom] containerRef is null");
        return;
      }
      if (!window.JitsiMeetExternalAPI) {
        console.error("[JitsiRoom] JitsiMeetExternalAPI not available");
        if (!disposed) setStatus("fallback");
        return;
      }

      const moderatorButtons = ["mute-everyone", "mute-video-everyone", "security"];
      const baseButtons = [
        "microphone",
        "camera",
        "desktop",
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

      try {
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: embeddedRoomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName, email: email || "", avatarURL: avatarUrl || "" },
          // Permissões necessárias para o iframe interno do Jitsi acessar
          // câmera, microfone e compartilhamento de tela (display-capture).
          // Sem isto, o seletor de tela do navegador trava em "carregando".
          ...({
            iframeAttributes: {
              allow: IFRAME_ALLOW,
            },
          } as any),
          configOverwrite: {
            subject: subject || roomName,
            startWithAudioMuted,
            startWithVideoMuted,
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            disableProfile: true,
            requireDisplayName: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            enableClosePage: false,
            enableLobbyChat: false,
            lobby: { enableChat: false, autoKnock: false },
            visitors: {
              showJoinMeetingDialog: false,
              hideVisitorCountForVisitors: true,
              enableMediaOnPromote: { audio: true, video: true },
            },
            enableInsecureRoomNameWarning: false,
            startTileView: true,
            tileView: { numberOfVisibleTiles: 25 },
            desktopSharingFrameRate: { min: 5, max: 30 },
            desktopSharingSources: ["screen", "window", "tab"],
            hideDisplayName: false,
            hideDominantSpeakerBadge: false,
            // Garante que ninguém precise se autenticar para entrar/criar sala
            disableModeratorIndicator: false,
            enableUserRolesBasedOnToken: false,
            enableAutomaticUrlCopy: false,
            tokenAuthUrl: undefined,
            authenticationRequired: false,
            // Não espelhar o vídeo local
            disableLocalVideoFlip: true,
            localFlipX: false,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: "#0f172a",
            VIDEO_LAYOUT_FIT: "both",
            FILM_STRIP_MAX_HEIGHT: 120,
            VERTICAL_FILMSTRIP: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
            DISABLE_TRANSCRIPTION_SUBTITLES: true,
            TILE_ASPECT_RATIO: 16 / 9,
            TOOLBAR_BUTTONS: isModerator
              ? [...baseButtons, ...moderatorButtons]
              : baseButtons,
          },
        });

        apiRef.current = api;
        console.log("[JitsiRoom] API created");
        fallbackTimer = window.setTimeout(() => {
          if (!disposed) {
            console.warn("[JitsiRoom] join timeout, showing direct iframe fallback");
            try {
              apiRef.current?.dispose?.();
            } catch {
              /* ignore */
            }
            apiRef.current = null;
            setStatus("fallback");
          }
        }, 12000);

        // Garante permissões no iframe (compartilhamento de tela, câmera, mic)
        try {
          const iframe: HTMLIFrameElement | null = api.getIFrame?.() ?? containerRef.current?.querySelector("iframe");
          if (iframe) {
            iframe.setAttribute("allow", IFRAME_ALLOW);
            iframe.setAttribute("allowfullscreen", "true");
          }
        } catch (e) {
          console.warn("[JitsiRoom] could not set iframe permissions", e);
        }
        api.addListener("videoConferenceJoined", () => {
          console.log("[JitsiRoom] joined");
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
          if (!disposed) setStatus("ready");

          const joinedAsVisitor = typeof api.isVisitor === "function" ? Boolean(api.isVisitor()) : false;
          if (joinedAsVisitor && !retriedVisitorFallbackRef.current) {
            retriedVisitorFallbackRef.current = true;
            toast.info("Ajustando entrada da sala automaticamente...");
            try {
              api.dispose?.();
            } catch {
              /* ignore */
            }
            apiRef.current = null;
            if (!disposed) {
              setRoomVariant("fallback");
            }
            return;
          }

          onReady?.();
          try {
            api.executeCommand("setTileView", true);
            if (avatarUrl) {
              // Aplica o avatar várias vezes para garantir que o Jitsi
              // não sobrescreva com as iniciais geradas automaticamente.
              const applyAvatar = () => {
                try {
                  api.executeCommand("avatarUrl", avatarUrl);
                  api.executeCommand("displayName", displayName);
                } catch {
                  /* ignore */
                }
              };
              applyAvatar();
              setTimeout(applyAvatar, 500);
              setTimeout(applyAvatar, 2000);
              setTimeout(applyAvatar, 5000);
            }
            // Não aplica fundo virtual automaticamente. Os usuários iniciam sem fundo
            // e podem escolher manualmente em "Selecionar fundo" no menu do Jitsi.
            // A imagem /meeting-background.png fica disponível como uma das opções
            // através do upload manual feito pelo próprio usuário, se desejar.
          } catch {
            /* ignore */
          }
        });
        api.addListener("readyToClose", () => onLeave?.());
        api.addListener("videoConferenceLeft", () => onLeave?.());
        api.addListener("participantJoined", (p: any) => onParticipantJoined?.(p));
        api.addListener("participantLeft", (p: any) => onParticipantLeft?.(p));
      } catch (e) {
        console.error("[JitsiRoom] failed to create API", e);
        if (!disposed) setStatus("fallback");
      }
    };

    init();

    return () => {
      disposed = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      try {
        apiRef.current?.dispose?.();
      } catch {
        /* ignore */
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, roomVariant, isModerator]);

  useImperativeHandle(
    ref,
    () => ({
      getParticipants: () => {
        const api = apiRef.current;
        if (!api?.getParticipantsInfo) return [];
        try {
          const list = api.getParticipantsInfo() || [];
          return list.map((p: any) => ({
            participantId: p.participantId || p.id,
            displayName: p.displayName || p.formattedDisplayName,
            avatarURL: p.avatarURL,
          }));
        } catch {
          return [];
        }
      },
      kickParticipant: (participantId: string) => {
        try {
          apiRef.current?.executeCommand?.("kickParticipant", participantId);
        } catch (e) {
          console.error("[JitsiRoom] kickParticipant failed", e);
        }
      },
      getMyId: () => {
        try {
          return apiRef.current?.myUserId?.();
        } catch {
          return undefined;
        }
      },
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className="jitsi-room-container absolute inset-0 h-full w-full bg-background"
    >
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background text-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando câmera da reunião...</p>
        </div>
      )}
      {status === "fallback" && directRoomUrl && (
        <iframe
          title="Sala de reunião"
          src={directRoomUrl}
          allow={IFRAME_ALLOW}
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      )}
    </div>
  );
});
