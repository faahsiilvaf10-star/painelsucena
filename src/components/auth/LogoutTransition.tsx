import { useState, useEffect, useMemo } from "react";
import { User, LogOut } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";

interface LogoutTransitionProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string;
  reason?: "manual" | "timeout";
}

export function LogoutTransition({ onComplete, userName, userAvatar, reason = "manual" }: LogoutTransitionProps) {
  const [phase, setPhase] = useState<"enter" | "display" | "fade">("enter");
  const { settings } = useSiteSettings();
  const logoUrl = settings.logo_url || logoPrincipal;
  
  const isTimeout = reason === "timeout";

  // Background floating particles
  const bgParticles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.1 + Math.random() * 0.3,
    }));
  }, []);

  useEffect(() => {
    // Total 5 seconds:
    // - enter: 0-0.5s (fade in)
    // - display: 0.5s-4.5s (show message)
    // - fade: 4.5s-5s (fade out)
    
    const displayTimer = setTimeout(() => setPhase("display"), 500);
    const fadeTimer = setTimeout(() => setPhase("fade"), 4500);
    const completeTimer = setTimeout(() => onComplete(), 5000);

    return () => {
      clearTimeout(displayTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Background gradient - same as login screen */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 80% 60% at 50% 50%,
            hsl(220, 10%, 25%) 0%,
            hsl(220, 12%, 18%) 25%,
            hsl(220, 15%, 12%) 50%,
            hsl(220, 18%, 6%) 75%,
            hsl(0, 0%, 0%) 100%
          )`
        }}
      />

      {/* Subtle inner glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            circle at 50% 45%,
            rgba(100, 110, 130, 0.15) 0%,
            transparent 45%
          )`
        }}
      />

      {/* Floating background particles */}
      {bgParticles.map((p) => (
        <div
          key={`bg-${p.id}`}
          className="absolute rounded-full bg-white/20 animate-float-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(0, 0, 0, 0.5) 100%
          )`
        }}
      />

      {/* Logo at top */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <img
          src={logoUrl}
          alt="Logo"
          className={`h-12 object-contain transition-all duration-700 ease-out ${
            phase === "enter" ? "opacity-0 scale-90" : phase === "fade" ? "opacity-0" : "opacity-100 scale-100"
          }`}
        />
      </div>

      {/* Main content */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
          phase === "enter" ? "opacity-0 scale-95" : phase === "fade" ? "opacity-0 scale-105" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex flex-col items-center gap-6">
          {/* User avatar with wave animation */}
          <div className="relative">
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-4 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.4)] flex items-center justify-center">
                <User className="w-12 h-12 text-cyan-300" strokeWidth={1.5} />
              </div>
            )}
            
            {/* Waving hand emoji with glow */}
            <div className="absolute -right-2 -bottom-2 text-4xl animate-wave drop-shadow-[0_0_10px_rgba(255,200,100,0.6)]">
              👋
            </div>
          </div>

          {/* Goodbye message with modern gaming style */}
          <div className="flex items-center gap-5">
            <span className="text-5xl animate-bounce-slow drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]">💫</span>
            <div className="flex flex-col items-center gap-1">
              <span 
                className="text-xl font-bold tracking-widest uppercase"
                style={{
                  background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 2px 10px rgba(255,255,255,0.2)",
                }}
              >
                {isTimeout ? "Sessão expirada," : "Até logo,"}
              </span>
              <span 
                className="text-5xl font-black tracking-wide uppercase"
                style={{
                  background: "linear-gradient(180deg, #22d3ee 0%, #0ea5e9 50%, #0369a1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 4px 20px rgba(34,211,238,0.5)",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              >
                {userName || "Usuário"}!
              </span>
            </div>
            <span className="text-5xl animate-bounce-slow drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" style={{ animationDelay: "0.3s" }}>💫</span>
          </div>

          {/* Subtitle */}
          <p 
            className="text-base mt-2 flex items-center gap-2 text-center max-w-xs font-medium tracking-wider"
            style={{
              background: "linear-gradient(90deg, #94a3b8 0%, #cbd5e1 50%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            <LogOut className="w-4 h-4 shrink-0 text-cyan-400" />
            {isTimeout 
              ? "Por segurança, você foi desconectado após 5 horas de sessão." 
              : "Saindo do sistema..."}
          </p>

          {/* Progress bar with gradient glow */}
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mt-4 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-logout-progress shadow-[0_0_10px_rgba(34,211,238,0.6)]"
              style={{ animationDuration: "4.5s" }}
            />
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-5px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
        
        .animate-float-particle {
          animation: float-particle ease-in-out infinite;
        }
        
        @keyframes wave {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(20deg);
          }
          75% {
            transform: rotate(-10deg);
          }
        }
        
        .animate-wave {
          animation: wave 0.8s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
        
        @keyframes logout-progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        
        .animate-logout-progress {
          animation: logout-progress linear forwards;
        }
      `}</style>
    </div>
  );
}
