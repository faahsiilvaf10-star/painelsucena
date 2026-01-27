import { useState, useEffect, useMemo, useRef } from "react";
import { User } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoPrincipal from "@/assets/logo-principal.png";

interface LoginTransitionProps {
  onComplete: () => void;
  userName?: string;
  userAvatar?: string;
  userCargo?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  duration: number;
  type: "confetti" | "circle" | "star";
}

export function LoginTransition({ onComplete, userName, userAvatar, userCargo }: LoginTransitionProps) {
  const [phase, setPhase] = useState<"logo-center" | "logo-move" | "cursor-move" | "click" | "zoom" | "fade">("logo-center");
  const [displayedName, setDisplayedName] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const { settings } = useSiteSettings();
  const logoUrl = settings.logo_url || logoPrincipal;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fullName = (userName || "Usuário") + "!";

  // Play success sound on mount
  useEffect(() => {
    audioRef.current = new Audio("/sounds/chime.mp3");
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(() => {
      // Ignore autoplay errors
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Generate random particles
  const particles = useMemo<Particle[]>(() => {
    const colors = [
      "hsl(45, 90%, 55%)", // Gold
      "hsl(200, 80%, 60%)", // Blue
      "hsl(280, 70%, 60%)", // Purple
      "hsl(340, 80%, 60%)", // Pink
      "hsl(160, 70%, 50%)", // Teal
      "hsl(25, 90%, 55%)", // Orange
      "hsl(0, 0%, 100%)", // White
    ];
    
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 6 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      type: ["confetti", "circle", "star"][Math.floor(Math.random() * 3)] as Particle["type"],
    }));
  }, []);

  // Typewriter effect for the name
  useEffect(() => {
    if (phase !== "zoom" && phase !== "fade") {
      setDisplayedName("");
      return;
    }

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < fullName.length) {
        setDisplayedName(fullName.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 80);

    // Cursor blinking
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, [phase, fullName]);

  useEffect(() => {
    // Smoother login animation with better pacing
    // Total ~10 seconds with more fluid transitions:
    // - logo-center: 0-2s (logo appears large centered with breathing effect)
    // - logo-move: 2s-4s (logo moves smoothly to sidebar position)
    // - cursor-move: 4s-5.5s (cursor glides to avatar)
    // - click: 5.5s-6s (gentle click effect)
    // - zoom: 6s-9s (welcome screen with confetti)
    // - fade: 9s-10s (smooth fade out)
    
    const logoMoveTimer = setTimeout(() => setPhase("logo-move"), 2000);
    const cursorMoveTimer = setTimeout(() => setPhase("cursor-move"), 4000);
    const clickTimer = setTimeout(() => setPhase("click"), 5500);
    const zoomTimer = setTimeout(() => setPhase("zoom"), 6000);
    const fadeTimer = setTimeout(() => setPhase("fade"), 9000);
    const completeTimer = setTimeout(() => onComplete(), 10000);

    return () => {
      clearTimeout(logoMoveTimer);
      clearTimeout(cursorMoveTimer);
      clearTimeout(clickTimer);
      clearTimeout(zoomTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const renderParticleShape = (particle: Particle) => {
    switch (particle.type) {
      case "star":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full" fill={particle.color}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      case "circle":
        return (
          <div 
            className="w-full h-full rounded-full" 
            style={{ backgroundColor: particle.color }}
          />
        );
      default: // confetti
        return (
          <div 
            className="w-full h-full rounded-sm" 
            style={{ 
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)` 
            }}
          />
        );
    }
  };

  // Background floating particles (same as login)
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

      {/* Animated Logo - starts centered and large, moves to sidebar position with smooth easing */}
      <div
        className={`absolute ${
          phase === "logo-center"
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 opacity-100"
            : phase === "logo-move"
            ? "top-4 left-4 translate-x-0 translate-y-0 scale-100 opacity-100"
            : "top-4 left-4 translate-x-0 translate-y-0 scale-100 opacity-100"
        }`}
        style={{
          transition: phase === "logo-center" 
            ? "all 1s cubic-bezier(0.22, 1, 0.36, 1)" 
            : phase === "logo-move"
            ? "all 2s cubic-bezier(0.16, 1, 0.3, 1)"
            : "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 60,
        }}
      >
        {/* Pulsing glow ring behind logo */}
        {phase === "logo-center" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-48 h-48 rounded-full animate-logo-pulse-glow" 
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
              }}
            />
            <div className="absolute w-64 h-64 rounded-full animate-logo-pulse-glow-delayed" 
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
              }}
            />
          </div>
        )}
        <img
          src={logoUrl}
          alt="Logo"
          className={`object-contain relative z-10 ${
            phase === "logo-center"
              ? "h-32 max-w-[400px] animate-logo-breathe"
              : "h-10 max-w-[140px]"
          }`}
          style={{
            transition: phase === "logo-center"
              ? "all 1s cubic-bezier(0.22, 1, 0.36, 1)"
              : "all 2s cubic-bezier(0.16, 1, 0.3, 1)",
            filter: phase === "logo-center" 
              ? "drop-shadow(0 0 30px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 60px rgba(255, 255, 255, 0.3))"
              : "none",
          }}
        />
      </div>

      {/* Confetti particles */}
      {(phase === "zoom" || phase === "fade") && (
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-confetti-fall"
              style={{
                left: `${particle.x}%`,
                top: `-${particle.size}px`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                opacity: phase === "fade" ? 0 : 1,
                transition: "opacity 0.3s ease-out",
              }}
            >
              {renderParticleShape(particle)}
            </div>
          ))}
        </div>
      )}

      {/* Burst particles from center */}
      {phase === "click" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-burst"
              style={{
                backgroundColor: ["hsl(45, 90%, 55%)", "hsl(200, 80%, 60%)", "hsl(280, 70%, 60%)"][i % 3],
                transform: `rotate(${i * 30}deg) translateY(-20px)`,
                animationDelay: `${i * 0.02}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Animated cursor - smooth gliding movement */}
      {(phase === "cursor-move" || phase === "click") && (
        <div
          className={`absolute ${
            phase === "cursor-move" 
              ? "top-[65%] left-[65%] opacity-100" 
              : phase === "click"
              ? "top-1/2 left-1/2 -translate-x-8 -translate-y-8 opacity-100 scale-90"
              : "top-1/2 left-1/2 -translate-x-8 -translate-y-8 opacity-0"
          }`}
          style={{
            transition: phase === "cursor-move" 
              ? "all 1.5s cubic-bezier(0.16, 1, 0.3, 1)" 
              : phase === "click"
              ? "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`drop-shadow-lg ${phase === "click" ? "animate-pulse" : ""}`}
            style={{
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
            }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
              fill="white"
              stroke="black"
              strokeWidth="1.5"
            />
          </svg>
          
          {phase === "click" && (
            <div className="absolute top-4 left-4 w-4 h-4">
              <div className="absolute inset-0 rounded-full bg-white/50 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Avatar that zooms in - with smooth transitions and glow */}
      {(phase === "cursor-move" || phase === "click") && (
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center ${
            phase === "cursor-move"
              ? "w-16 h-16 bg-gray-400/90 shadow-2xl"
              : phase === "click"
              ? "w-20 h-20 bg-gray-400/90 shadow-[0_0_40px_10px_rgba(255,255,255,0.5),0_0_80px_20px_rgba(255,255,255,0.3)]"
              : "opacity-0 scale-0"
          }`}
          style={{
            transition: phase === "cursor-move"
              ? "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
              : phase === "click"
              ? "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          {/* Glow ring effect on click */}
          {phase === "click" && (
            <div className="absolute inset-0 rounded-full animate-glow-ring" />
          )}
          
          {userAvatar ? (
            <img 
              src={userAvatar} 
              alt="Avatar"
              className={`rounded-full object-cover ${
                phase === "cursor-move" 
                  ? "w-9 h-9" 
                  : phase === "click"
                  ? "w-12 h-12 brightness-110"
                  : "opacity-0 scale-0"
              }`}
              style={{
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            />
          ) : (
            <User 
              className={`text-white/90 ${
                phase === "cursor-move" 
                  ? "w-9 h-9" 
                  : phase === "click"
                  ? "w-12 h-12"
                  : "opacity-0 scale-0"
              }`}
              style={{
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              strokeWidth={1.5} 
            />
          )}
        </div>
      )}

      {/* Welcome text with smooth entrance */}
      {(phase === "zoom" || phase === "fade") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`flex flex-col items-center ${
              phase === "zoom" ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            style={{
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {/* User avatar in welcome section with animation */}
            {userAvatar && (
              <div className="mb-6 animate-avatar-entrance">
                <img 
                  src={userAvatar} 
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-avatar-pulse"
                />
              </div>
            )}
            {!userAvatar && (
              <div className="mb-6 animate-avatar-entrance">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-4 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.4)] flex items-center justify-center animate-avatar-pulse">
                  <User className="w-12 h-12 text-cyan-300" strokeWidth={1.5} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-5">
              <span className="text-5xl animate-bounce-slow drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]">🌟</span>
              <div className="flex flex-col items-center">
                <span 
                  className="text-xl font-bold tracking-widest uppercase animate-fade-in"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 2px 10px rgba(255,255,255,0.2)",
                  }}
                >
                  Bom trabalho,
                </span>
                <span 
                  className="text-7xl md:text-8xl mt-2 pb-4 inline-flex items-baseline"
                  style={{
                    fontFamily: "'Pinyon Script', cursive",
                    background: "linear-gradient(180deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    textShadow: "0 4px 20px rgba(255,255,255,0.3)",
                    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
                    lineHeight: "1.3",
                  }}
                >
                  {displayedName}
                  <span 
                    className="inline-block w-1 h-[0.8em] ml-1 bg-white/80 rounded-sm"
                    style={{
                      opacity: showCursor && displayedName.length < fullName.length ? 1 : 0,
                      transition: "opacity 0.1s",
                    }}
                  />
                </span>
                {userCargo && (
                  <span 
                    className="text-sm font-semibold tracking-[0.2em] uppercase mt-2 animate-fade-in"
                    style={{ 
                      animationDelay: "0.3s",
                      background: "linear-gradient(90deg, #67e8f9 0%, #a5f3fc 50%, #67e8f9 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {userCargo}
                  </span>
                )}
              </div>
              <span className="text-5xl animate-bounce-slow drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" style={{ animationDelay: "0.3s" }}>🌟</span>
            </div>
            <p 
              className="text-base mt-6 font-medium tracking-wider animate-fade-in"
              style={{ 
                animationDelay: "0.6s",
                background: "linear-gradient(90deg, #94a3b8 0%, #cbd5e1 50%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Carregando seu painel...
            </p>
            {/* Loading dots with glow */}
            <div className="flex gap-3 mt-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                  style={{ animationDelay: `${i * 0.25}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final fade overlay - smoother transition */}
      <div 
        className={`absolute inset-0 ${
          phase === "fade" ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transition: "opacity 1s cubic-bezier(0.4, 0, 0.2, 1)",
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
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
            transform: translateY(5vh) rotate(20deg) scale(1);
          }
          100% {
            transform: translateY(100vh) rotate(540deg) scale(0.3);
            opacity: 0;
          }
        }
        
        @keyframes burst {
          0% {
            transform: rotate(var(--rotation)) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation)) translateY(-80px) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes avatar-entrance {
          0% {
            transform: scale(0) rotate(-90deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.05) rotate(5deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes avatar-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(255, 255, 255, 0), 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
        }
        
        @keyframes glow-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.8);
          }
          100% {
            box-shadow: 0 0 0 20px rgba(255, 255, 255, 0);
          }
        }
        
        @keyframes logo-pulse-glow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
        
        @keyframes logo-breathe {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 60px rgba(255, 255, 255, 0.3));
          }
          50% {
            transform: scale(1.03);
            filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.7)) drop-shadow(0 0 80px rgba(255, 255, 255, 0.4));
          }
        }
        
        .animate-confetti-fall {
          animation: confetti-fall ease-out forwards;
        }
        
        .animate-burst {
          animation: burst 0.6s ease-out forwards;
        }
        
        .animate-avatar-entrance {
          animation: avatar-entrance 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .animate-avatar-pulse {
          animation: avatar-pulse 2s ease-in-out infinite;
        }
        
        .animate-glow-ring {
          animation: glow-ring 0.6s ease-out forwards;
        }
        
        .animate-logo-pulse-glow {
          animation: logo-pulse-glow 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        
        .animate-logo-pulse-glow-delayed {
          animation: logo-pulse-glow 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: 0.4s;
        }
        
        .animate-logo-breathe {
          animation: logo-breathe 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
