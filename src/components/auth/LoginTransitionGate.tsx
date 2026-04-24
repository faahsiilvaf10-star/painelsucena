import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { LoginTransition } from "@/components/auth/LoginTransition";

type TransitionStage = "pending" | "play";

type TransitionPayload = {
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
  destination?: string;
};

const EVENT_NAME = "login-transition";

function readFlag(key: string) {
  return sessionStorage.getItem(key);
}

function readPayload(): TransitionPayload {
  const raw = readFlag("loginTransitionPayload");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as TransitionPayload;
  } catch {
    return {};
  }
}

function readSnapshot() {
  const active = readFlag("loginTransitionInProgress") === "true";
  const stage = (readFlag("loginTransitionStage") as TransitionStage | null) ?? "pending";
  const payload = readPayload();
  return { active, stage, payload };
}

function clearTransitionStorage() {
  sessionStorage.removeItem("loginTransitionInProgress");
  sessionStorage.removeItem("loginTransitionStage");
  sessionStorage.removeItem("loginTransitionPayload");
}

export function LoginTransitionGate() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => readSnapshot());

  useEffect(() => {
    const handler = () => setSnapshot(readSnapshot());
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  // Safety: if something goes wrong and we get stuck in pending for too long, unlock.
  useEffect(() => {
    if (!snapshot.active) return;
    const timeout = window.setTimeout(() => {
      const stillActive = sessionStorage.getItem("loginTransitionInProgress") === "true";
      const stage = sessionStorage.getItem("loginTransitionStage");
      if (stillActive && stage === "pending") {
        clearTransitionStorage();
        window.dispatchEvent(new Event(EVENT_NAME));
      }
    }, 10000);
    return () => window.clearTimeout(timeout);
  }, [snapshot.active]);

  const destination = useMemo(() => {
    return snapshot.payload.destination || "/";
  }, [snapshot.payload.destination]);

  if (!snapshot.active) return null;

  if (snapshot.stage !== "play") {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center space-y-1">
            <span className="text-sm font-medium">Entrando no sistema…</span>
            <p className="text-[10px] opacity-60">Sincronizando dados de segurança</p>
          </div>
          <button 
            onClick={() => {
              clearTransitionStorage();
              window.dispatchEvent(new Event(EVENT_NAME));
            }}
            className="mt-8 text-[10px] underline hover:text-primary transition-colors"
          >
            Se estiver travado, clique aqui para forçar o acesso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <LoginTransition
        userName={snapshot.payload.userName}
        userAvatar={snapshot.payload.userAvatar}
        userCargo={snapshot.payload.userCargo}
        onComplete={() => {
          clearTransitionStorage();
          window.dispatchEvent(new Event(EVENT_NAME));
          navigate(destination, { replace: true });
        }}
      />
    </div>
  );
}
