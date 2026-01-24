import { useState, useEffect, useMemo, useRef } from "react";
import { User } from "lucide-react";

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
  const [phase, setPhase] = useState<"cursor-move" | "click" | "zoom" | "fade">("cursor-move");
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    // Slower, smoother timings - total 6.5 seconds
    const clickTimer = setTimeout(() => setPhase("click"), 1500);      // Cursor moves for 1.5s
    const zoomTimer = setTimeout(() => setPhase("zoom"), 2200);        // Click effect for 0.7s
    const fadeTimer = setTimeout(() => setPhase("fade"), 6000);        // Zoom + welcome for 3.8s
    const completeTimer = setTimeout(() => onComplete(), 6500);        // Fade for 0.5s

    return () => {
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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
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

      {/* Animated cursor - realistic movement */}
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
            ? "all 1.5s cubic-bezier(0.34, 0.02, 0.21, 1)" 
            : phase === "click"
            ? "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "all 0.5s ease-out"
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`drop-shadow-lg ${phase === "click" ? "animate-pulse" : ""}`}
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

      {/* Avatar that zooms in - with click enlargement */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-2xl transition-all ${
          phase === "cursor-move"
            ? "w-16 h-16 duration-700 ease-out bg-gray-400/90"
            : phase === "click"
            ? "w-20 h-20 duration-200 ease-out bg-gray-400/90"
            : phase === "zoom"
            ? "w-[200vmax] h-[200vmax] duration-[2500ms] ease-in-out bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800"
            : "w-[200vmax] h-[200vmax] duration-700 ease-out bg-background"
        }`}
        style={{
          transitionTimingFunction: phase === "zoom" ? "cubic-bezier(0.25, 0.1, 0.25, 1)" : undefined
        }}
      >
        {userAvatar ? (
          <img 
            src={userAvatar} 
            alt="Avatar"
            className={`rounded-full object-cover transition-all ease-out ${
              phase === "cursor-move" 
                ? "w-9 h-9 duration-300" 
                : phase === "click"
                ? "w-12 h-12 duration-200"
                : "opacity-0 scale-0 duration-700"
            }`}
          />
        ) : (
          <User 
            className={`text-white/90 transition-all ease-out ${
              phase === "cursor-move" 
                ? "w-9 h-9 duration-300" 
                : phase === "click"
                ? "w-12 h-12 duration-200"
                : "opacity-0 scale-0 duration-700"
            }`} 
            strokeWidth={1.5} 
          />
        )}
      </div>

      {/* Welcome text with sparkle effect */}
      {(phase === "zoom" || phase === "fade") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`flex flex-col items-center transition-all duration-700 ease-out ${
              phase === "zoom" ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          >
            {/* User avatar in welcome section with animation */}
            {userAvatar && (
              <div className="mb-6 animate-avatar-entrance">
                <img 
                  src={userAvatar} 
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/40 shadow-2xl animate-avatar-pulse"
                />
              </div>
            )}
            {!userAvatar && (
              <div className="mb-6 animate-avatar-entrance">
                <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/40 shadow-2xl flex items-center justify-center animate-avatar-pulse">
                  <User className="w-12 h-12 text-white/80" strokeWidth={1.5} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="text-4xl animate-bounce-slow">✨</span>
              <div className="flex flex-col items-center">
                <span className="text-white/60 text-lg font-light tracking-wide">
                  Bom trabalho,
                </span>
                <span className="text-white text-4xl font-semibold tracking-wide drop-shadow-lg">
                  {userName || "Usuário"}!
                </span>
                {userCargo && (
                  <span className="text-white/50 text-sm font-light tracking-wider mt-1 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                    {userCargo}
                  </span>
                )}
              </div>
              <span className="text-4xl animate-bounce-slow" style={{ animationDelay: "0.3s" }}>✨</span>
            </div>
            <p className="text-white/60 text-base mt-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              Carregando seu painel...
            </p>
            {/* Loading dots */}
            <div className="flex gap-2 mt-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-white/40 animate-pulse"
                  style={{ animationDelay: `${i * 0.25}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final fade overlay - slower */}
      <div 
        className={`absolute inset-0 bg-background transition-opacity duration-500 ease-out ${
          phase === "fade" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Animation styles */}
      <style>{`
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
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(10deg);
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
        
        .animate-confetti-fall {
          animation: confetti-fall ease-out forwards;
        }
        
        .animate-burst {
          animation: burst 0.6s ease-out forwards;
        }
        
        .animate-avatar-entrance {
          animation: avatar-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        .animate-avatar-pulse {
          animation: avatar-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
