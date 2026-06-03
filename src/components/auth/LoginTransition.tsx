import { useState, useEffect, useRef } from "react";
import { User, Home, Hammer, Construction, Shield } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";

interface LoginTransitionProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
}

export function LoginTransition({ onComplete, userName, userAvatar, userCargo }: LoginTransitionProps) {
  const [phase, setPhase] = useState<"blank" | "logo" | "building" | "welcome" | "fade" | "done">("blank");
  const { settings, isLoading: isSettingsLoading } = useSiteSettings();
  const logoUrl = settings.transition_logo_url || settings.logo_url || logoPrincipal;
  const isLogoReady = !isSettingsLoading && !!logoUrl;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEndedRef = useRef(false);
  const visualDoneRef = useRef(false);
  const displayName = userName || "Usuário";

  const tryFinish = () => {
    if (audioEndedRef.current && visualDoneRef.current) {
      onComplete();
    }
  };

  useEffect(() => {
    const now = new Date();
    const audioDay = new Date(now);
    if (now.getHours() < 7) {
      audioDay.setDate(audioDay.getDate() - 1);
    }
    const dayKey = `${audioDay.getFullYear()}-${audioDay.getMonth() + 1}-${audioDay.getDate()}`;
    const storageKey = "login-welcome-audio-last-day";
    const lastPlayedDay = localStorage.getItem(storageKey);

    if (lastPlayedDay === dayKey) {
      audioEndedRef.current = true;
      tryFinish();
      return;
    }

    localStorage.setItem(storageKey, dayKey);

    const audio = new Audio("/sounds/login-welcome.wav");
    audio.volume = 0.5;
    audioRef.current = audio;

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
    const t2 = setTimeout(() => setPhase("building"), 3500); // Logo fica por 3.2 segundos (antes era 1.2s)
    const t3 = setTimeout(() => setPhase("welcome"), 6500);
    const t4 = setTimeout(() => setPhase("fade"), 9500);
    const t5 = setTimeout(() => {
      setPhase("done");
      visualDoneRef.current = true;
      tryFinish();
    }, 10300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden bg-slate-950 flex items-center justify-center perspective-1000">
      {/* 3D Grid Background */}
      <div className="absolute inset-0 opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             transform: 'rotateX(60deg) translateY(-100px)',
             transformOrigin: 'top'
           }} 
      />

      {/* Phase: Logo Initial */}
      {phase === "logo" && (
        <div className="animate-out fade-out zoom-out duration-1000 flex flex-col items-center">
          <img src={logoUrl} alt="Logo" className="h-32 md:h-40 object-contain brightness-125 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-in fade-in zoom-in duration-700" />
        </div>
      )}

      {/* Phase: Matrix / Security Animation */}
      {phase === "building" && (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Matrix Rain Effect */}
          <div className="absolute inset-0 grid grid-cols-12 md:grid-cols-24 gap-2 opacity-40 pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 animate-matrix-fall" style={{ animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 4}s` }}>
                {Array.from({ length: 20 }).map((_, j) => (
                  <span key={j} className="text-[10px] font-mono text-blue-500/60 leading-none">
                    {Math.random() > 0.5 ? "1" : "0"}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Security Shield Hexagon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative p-6 border-2 border-blue-500/40 rounded-xl bg-slate-900/80 backdrop-blur-sm shadow-[0_0_30px_rgba(59,130,246,0.2)] animate-float">
                <Shield className="w-16 h-16 text-blue-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
              </div>
            </div>
            
            {/* Scanning Line */}
            <div className="w-48 h-1 bg-blue-500/20 relative overflow-hidden rounded-full mb-4">
              <div className="absolute inset-0 bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-scan" />
            </div>

            {/* Auth Text */}
            <div className="text-center space-y-1">
              <p className="text-blue-400 text-[10px] font-mono tracking-[0.3em] uppercase animate-pulse">
                Iniciando Protocolo de Matriz
              </p>
              <div className="flex gap-1 justify-center">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Welcome (Final Result) */}
      {(phase === "welcome" || phase === "fade") && (
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="relative mb-8">
             {userAvatar ? (
               <img src={userAvatar} className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
             ) : (
               <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center border-4 border-blue-500/30">
                 <User className="w-16 h-16 text-slate-400" />
               </div>
             )}
             {/* 3D Success Ring */}
             <div className="absolute -inset-2 border-2 border-blue-400/20 rounded-full animate-ping" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-blue-400 text-sm font-light tracking-[0.4em] uppercase opacity-70">
              Acesso Autorizado
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {displayName}
            </h1>
            {userCargo && (
              <p className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase pt-2">
                {userCargo}
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .translate-z-10 { transform: translateZ(20px); }
        .-translate-z-10 { transform: translateZ(-20px); }
        
        @keyframes matrix-fall {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .animate-matrix-fall {
          animation: matrix-fall linear infinite;
        }

        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        @keyframes hammer-swing {
      `}</style>
    </div>
  );
}
