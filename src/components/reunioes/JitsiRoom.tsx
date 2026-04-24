import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { useTrackMeetingPresence } from "@/hooks/useActiveMeetingPresence";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

// Servidor Jitsi público que NÃO exige autenticação de moderador.
// meet.jit.si passou a exigir login para criar salas; meet.ffmuc.net é open/free.
const JITSI_DOMAIN = "meet.ffmuc.net";
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
  useTrackMeetingPresence(roomName);

  useEffect(() => {
    retriedVisitorFallbackRef.current = false;
    setRoomVariant("primary");
  }, [roomName]);

  useEffect(() => {
    let disposed = false;
    const embeddedRoomName = buildEmbeddedRoomName(roomName, roomVariant);

    const init = async () => {
      console.log("[JitsiRoom] init started", { roomName, embeddedRoomName, roomVariant });
      try {
        await loadJitsiScript();
        console.log("[JitsiRoom] script loaded");
      } catch (e) {
        console.error("[JitsiRoom] script load failed", e);
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

        api.addListener("videoConferenceJoined", () => {
          console.log("[JitsiRoom] joined");

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
              api.executeCommand("avatarUrl", avatarUrl);
            }
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
      }
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

  return <div ref={containerRef} className="h-full w-full" style={{ minHeight: 400 }} />;
});
