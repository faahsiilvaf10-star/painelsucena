import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";

interface LoginTransitionProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
}

export function LoginTransition({ onComplete, userName, userAvatar, userCargo }: LoginTransitionProps) {
  const [phase, setPhase] = useState<"blank" | "logo" | "welcome" | "fade" | "done">("blank");
  const { settings } = useSiteSettings();
  const logoUrl = settings.logo_url || logoPrincipal;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEndedRef = useRef(false);
  const visualDoneRef = useRef(false);
  const displayName = userName || "Usuário";

  const tryFinish = () => {
    if (audioEndedRef.current && visualDoneRef.current) {
      onComplete();
    }
  };

  // Play audio — never cut it
  useEffect(() => {
    const audio = new Audio("/sounds/login-welcome.wav");
    audio.volume = 0.5;
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      audioEndedRef.current = true;
      tryFinish();
    });

    // Fallback in case audio fails to load/play
    audio.addEventListener("error", () => {
      audioEndedRef.current = true;
      tryFinish();
    });

    audio.play().catch(() => {
      audioEndedRef.current = true;
      tryFinish();
    });

    return () => {
      // Don't pause on unmount — let audio finish naturally
    };
  }, []);

  useEffect(() => {
    // Timeline visual phases
    const t1 = setTimeout(() => setPhase("logo"), 300);
    const t2 = setTimeout(() => setPhase("welcome"), 2000);
    const t3 = setTimeout(() => setPhase("fade"), 6000);
    const t4 = setTimeout(() => {
      setPhase("done");
      visualDoneRef.current = true;
      tryFinish();
    }, 6800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Solid dark background - Windows style */}
      <div
        className="absolute inset-0 transition-colors duration-1000"
        style={{
          backgroundColor: phase === "logo" ? "hsl(220, 15%, 8%)" : "hsl(220, 15%, 6%)",
        }}
      />

      {/* Subtle gradient accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] transition-opacity duration-1000"
        style={{
          background: "linear-gradient(90deg, transparent 10%, hsl(210, 40%, 50%) 50%, transparent 90%)",
          opacity: phase === "welcome" || phase === "logo" ? 0.5 : 0,
        }}
      />

      {/* Logo phase - centered, minimal */}
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
          className="h-16 max-w-[280px] object-contain"
          style={{
            filter: "brightness(1.1)",
          }}
        />
      </div>

      {/* Welcome phase - Windows 11 style */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out"
        style={{
          opacity: phase === "welcome" ? 1 : phase === "fade" ? 0 : 0,
          transform: phase === "welcome" ? "translateY(0)" : phase === "fade" ? "translateY(-8px)" : "translateY(12px)",
        }}
      >
        {/* Avatar */}
        <div
          className="mb-8 transition-all duration-500 ease-out"
          style={{
            opacity: phase === "welcome" ? 1 : 0,
            transform: phase === "welcome" ? "scale(1)" : "scale(0.9)",
            transitionDelay: "0.1s",
          }}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Avatar"
              className="w-28 h-28 rounded-full object-cover"
              style={{
                border: "3px solid hsla(210, 20%, 40%, 0.4)",
              }}
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

        {/* Welcome text */}
        <div
          className="text-center transition-all duration-500 ease-out"
          style={{
            opacity: phase === "welcome" ? 1 : 0,
            transform: phase === "welcome" ? "translateY(0)" : "translateY(8px)",
            transitionDelay: "0.25s",
          }}
        >
          <p
            className="text-sm font-light tracking-[0.3em] uppercase mb-3"
            style={{ color: "hsl(210, 15%, 55%)" }}
          >
            Bem-vindo
          </p>
          <h1
            className="text-4xl md:text-5xl font-light tracking-wide"
            style={{ color: "hsl(0, 0%, 92%)" }}
          >
            {displayName}
          </h1>
          {userCargo && (
            <p
              className="text-xs font-medium tracking-[0.25em] uppercase mt-4 transition-all duration-500 ease-out"
              style={{
                color: "hsl(210, 30%, 55%)",
                opacity: phase === "welcome" ? 1 : 0,
                transitionDelay: "0.5s",
              }}
            >
              {userCargo}
            </p>
          )}
        </div>

        {/* Loading indicator - minimal dots */}
        <div
          className="flex flex-col items-center gap-4 mt-10 transition-all duration-500 ease-out"
          style={{
            opacity: phase === "welcome" ? 1 : 0,
            transitionDelay: "0.6s",
          }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full win-dot-pulse"
                style={{
                  backgroundColor: "hsl(210, 30%, 50%)",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
          <p
            className="text-xs font-light tracking-wider"
            style={{ color: "hsl(210, 15%, 50%)" }}
          >
            Nova atualização encontrada — atualizando sistema...
          </p>
        </div>
      </div>

      {/* Final fade overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-600 ease-out"
        style={{
          backgroundColor: "hsl(220, 15%, 6%)",
          opacity: phase === "fade" ? 1 : 0,
        }}
      />

      <style>{`
        @keyframes win-dot-pulse {
          0%, 80%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          40% {
            opacity: 1;
            transform: scale(1.8);
          }
        }
        .win-dot-pulse {
          animation: win-dot-pulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
