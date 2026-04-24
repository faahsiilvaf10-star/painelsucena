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
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: "#0f172a",
          DISABLE_VIDEO_BACKGROUND: false,
          TOOLBAR_BUTTONS: [
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
            "mute-everyone",
          ],
        },
      });

      apiRef.current = api;
      api.addListener("videoConferenceJoined", () => onReady?.());
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
  }, [roomName]);

  return <div ref={containerRef} className="h-full w-full" />;
}
