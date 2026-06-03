import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";

interface LogoutTransitionProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string;
  reason?: "manual" | "timeout";
}

export function LogoutTransition({ onComplete, userName, userAvatar, reason = "manual" }: LogoutTransitionProps) {
  const [phase, setPhase] = useState<"blank" | "logo" | "goodbye" | "fade" | "done">("blank");
  const { settings, isLoading: isSettingsLoading } = useSiteSettings();
  const logoUrl = settings.transition_logo_url || settings.logo_url || logoPrincipal;
  const isLogoReady = !isSettingsLoading && !!logoUrl;
  const isTimeout = reason === "timeout";
  const displayName = userName || "Usuário";
  const audioEndedRef = useRef(false);
  const visualDoneRef = useRef(false);

  const tryFinish = () => {
    if (audioEndedRef.current && visualDoneRef.current) {
      onComplete();
    }
  };

  // Play logout audio — let it finish completely
  useEffect(() => {
    const audio = new Audio("/sounds/logout-farewell.wav");
    audio.volume = 0.5;

    audio.addEventListener("ended", () => {
      audioEndedRef.current = true;
      tryFinish();
    });
    audio.addEventListener("error", () => {
      audioEndedRef.current = true;
      tryFinish();
    });
    audio.play().catch(() => {
      audioEndedRef.current = true;
      tryFinish();
    });
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (isLogoReady) setPhase("logo");
    }, 300);
    const t2 = setTimeout(() => setPhase("goodbye"), 1500);
    const t3 = setTimeout(() => setPhase("fade"), 4500);
    const t4 = setTimeout(() => {
      setPhase("done");
      visualDoneRef.current = true;
      tryFinish();
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Solid dark background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "hsl(220, 15%, 6%)" }}
      />

      {/* Subtle gradient accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] transition-opacity duration-1000"
        style={{
          background: "linear-gradient(90deg, transparent 10%, hsl(210, 40%, 50%) 50%, transparent 90%)",
          opacity: phase === "goodbye" || phase === "logo" ? 0.5 : 0,
        }}
      />

      {/* Logo phase */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out"
        style={{
          opacity: phase === "logo" ? 1 : 0,
          transform: phase === "logo" ? "scale(1)" : phase === "blank" ? "scale(0.95)" : "scale(1.02)",
        }}
      >
        <img
          src={logoUrl}
          alt="Logo"
          className="h-28 md:h-32 max-w-[320px] object-contain"
          style={{ filter: "brightness(1.1)" }}
        />
      </div>

      {/* Goodbye phase - Windows 11 style */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out"
        style={{
          opacity: phase === "goodbye" ? 1 : phase === "fade" ? 0 : 0,
          transform: phase === "goodbye" ? "translateY(0)" : phase === "fade" ? "translateY(-8px)" : "translateY(12px)",
        }}
      >
        {/* Avatar */}
        <div
          className="mb-8 transition-all duration-500 ease-out"
          style={{
            opacity: phase === "goodbye" ? 1 : 0,
            transform: phase === "goodbye" ? "scale(1)" : "scale(0.9)",
            transitionDelay: "0.1s",
          }}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Avatar"
              className="w-28 h-28 rounded-full object-cover"
              style={{ border: "3px solid hsla(210, 20%, 40%, 0.4)" }}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "hsl(210, 20%, 18%)",
                border: "3px solid hsla(210, 20%, 40%, 0.4)",
              }}
            >
              <User className="w-14 h-14" style={{ color: "hsl(210, 15%, 55%)" }} strokeWidth={1.2} />
            </div>
          )}
        </div>

        {/* Goodbye text */}
        <div
          className="text-center transition-all duration-500 ease-out"
          style={{
            opacity: phase === "goodbye" ? 1 : 0,
            transform: phase === "goodbye" ? "translateY(0)" : "translateY(8px)",
            transitionDelay: "0.25s",
          }}
        >
          <p
            className="text-sm font-light tracking-[0.3em] uppercase mb-3"
            style={{ color: "hsl(210, 15%, 55%)" }}
          >
            {isTimeout ? "Sessão expirada" : "Até logo"}
          </p>
          <h1
            className="text-4xl md:text-5xl font-light tracking-wide"
            style={{ color: "hsl(0, 0%, 92%)" }}
          >
            {displayName}
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="text-xs tracking-[0.15em] mt-6 transition-all duration-500 ease-out"
          style={{
            color: "hsl(210, 15%, 45%)",
            opacity: phase === "goodbye" ? 1 : 0,
            transitionDelay: "0.5s",
          }}
        >
          {isTimeout
            ? "Desconectado por segurança"
            : "Saindo do sistema"}
        </p>

        {/* Loading dots */}
        <div
          className="flex gap-1.5 mt-8 transition-all duration-500 ease-out"
          style={{
            opacity: phase === "goodbye" ? 1 : 0,
            transitionDelay: "0.6s",
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full win-dot-pulse-logout"
              style={{
                backgroundColor: "hsl(210, 30%, 50%)",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Final fade overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          backgroundColor: "hsl(220, 15%, 6%)",
          opacity: phase === "fade" ? 1 : 0,
        }}
      />

      <style>{`
        @keyframes win-dot-pulse-logout {
          0%, 80%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          40% {
            opacity: 1;
            transform: scale(1.8);
          }
        }
        .win-dot-pulse-logout {
          animation: win-dot-pulse-logout 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
