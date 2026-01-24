import { useState, useEffect } from "react";
import { User } from "lucide-react";

interface LoginTransitionProps {
  onComplete: () => void;
}

export function LoginTransition({ onComplete }: LoginTransitionProps) {
  const [phase, setPhase] = useState<"cursor-move" | "click" | "zoom" | "fade">("cursor-move");

  useEffect(() => {
    // Phase 1: Cursor moves to avatar (0 - 600ms)
    const clickTimer = setTimeout(() => {
      setPhase("click");
    }, 600);

    // Phase 2: Click effect (600 - 900ms)
    const zoomTimer = setTimeout(() => {
      setPhase("zoom");
    }, 900);

    // Phase 3: Avatar zooms in (900 - 2000ms)
    const fadeTimer = setTimeout(() => {
      setPhase("fade");
    }, 2000);

    // Phase 4: Complete transition (2300ms)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2300);

    return () => {
      clearTimeout(clickTimer);
      clearTimeout(zoomTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Animated cursor */}
      <div
        className={`absolute transition-all duration-500 ease-out ${
          phase === "cursor-move" 
            ? "top-[60%] left-[60%] opacity-100" 
            : phase === "click"
            ? "top-1/2 left-1/2 -translate-x-8 -translate-y-8 opacity-100 scale-90"
            : "top-1/2 left-1/2 -translate-x-8 -translate-y-8 opacity-0"
        }`}
      >
        {/* Custom cursor SVG */}
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
        
        {/* Click ripple effect */}
        {phase === "click" && (
          <div className="absolute top-4 left-4 w-4 h-4">
            <div className="absolute inset-0 rounded-full bg-white/50 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse" />
          </div>
        )}
      </div>

      {/* Avatar that zooms in */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400/90 flex items-center justify-center shadow-2xl transition-all ease-out ${
          phase === "cursor-move" || phase === "click"
            ? "w-16 h-16 duration-300"
            : phase === "zoom"
            ? "w-[200vmax] h-[200vmax] duration-1000"
            : "w-[200vmax] h-[200vmax] duration-300 bg-gray-500"
        }`}
        style={{
          transitionTimingFunction: phase === "zoom" ? "cubic-bezier(0.4, 0, 0.2, 1)" : undefined
        }}
      >
        <User 
          className={`text-white/90 transition-all duration-500 ${
            phase === "zoom" || phase === "fade" ? "opacity-0 scale-0" : "w-9 h-9"
          }`} 
          strokeWidth={1.5} 
        />
      </div>

      {/* Welcome text that appears during zoom */}
      {(phase === "zoom" || phase === "fade") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`text-white text-2xl font-medium tracking-wide transition-all duration-500 ${
              phase === "zoom" ? "opacity-100 scale-100" : "opacity-0 scale-110"
            }`}
          >
            Bem-vindo!
          </div>
        </div>
      )}

      {/* Final fade overlay */}
      <div 
        className={`absolute inset-0 bg-background transition-opacity duration-300 ${
          phase === "fade" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
