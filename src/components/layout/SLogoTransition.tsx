import { useEffect, useState, useRef } from "react";
import logoS from "@/assets/logo-s.png";

interface SLogoTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

export function SLogoTransition({ isActive, onComplete }: SLogoTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "enter" | "cut" | "exit">("idle");
  const sparksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    setPhase("enter");

    const cutTimer = setTimeout(() => setPhase("cut"), 300);
    const exitTimer = setTimeout(() => setPhase("exit"), 900);
    const doneTimer = setTimeout(() => {
      setPhase("idle");
      onComplete();
    }, 1300);

    return () => {
      clearTimeout(cutTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [isActive, onComplete]);

  if (phase === "idle") return null;

  return (
    <div className="fixed inset-0 z-[99998] pointer-events-none flex items-center justify-center">
      {/* Dark overlay */}
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          phase === "exit" ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* S Logo */}
      <div
        className={`relative z-10 transition-all ${
          phase === "enter"
            ? "animate-[logoEnter_0.3s_ease-out_forwards]"
            : phase === "cut"
            ? "animate-[logoCut_0.6s_ease-in-out_forwards]"
            : "animate-[logoExit_0.4s_ease-in_forwards]"
        }`}
      >
        <img
          src={logoS}
          alt="S"
          className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(234,179,8,0.6)]"
        />

        {/* Chainsaw blade cutting diagonal */}
        {phase === "cut" && (
          <>
            <div className="absolute top-1/2 left-[-60px] w-[calc(100%+120px)] h-[3px] -translate-y-1/2 rotate-[-25deg] origin-left animate-[sawSlash_0.5s_ease-in-out_forwards]">
              <div className="h-full bg-gradient-to-r from-transparent via-orange-400 to-yellow-200 shadow-[0_0_15px_rgba(251,146,60,0.9)]" />
              {/* Saw teeth */}
              <div className="absolute top-[-3px] left-0 right-0 h-[9px] bg-repeat-x animate-[sawTeeth_0.1s_linear_infinite]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='9'%3E%3Cpath d='M0 9L4 0L8 9' fill='%23f97316'/%3E%3C/svg%3E")`,
                  backgroundSize: '8px 9px'
                }}
              />
            </div>

            {/* Second cut - roçadeira style (horizontal arc) */}
            <div className="absolute top-[60%] left-[-80px] w-[calc(100%+160px)] h-[2px] -translate-y-1/2 rotate-[15deg] origin-right animate-[brushSlash_0.4s_0.15s_ease-in-out_forwards] opacity-0">
              <div className="h-full bg-gradient-to-l from-transparent via-green-400 to-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </div>

            {/* Sparks */}
            <div ref={sparksRef} className="absolute inset-0">
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i / 16) * 360;
                const delay = Math.random() * 0.3;
                const dist = 40 + Math.random() * 80;
                return (
                  <div
                    key={i}
                    className="absolute w-1 h-1 rounded-full top-1/2 left-1/2"
                    style={{
                      background: i % 3 === 0 ? '#fb923c' : i % 3 === 1 ? '#fbbf24' : '#f9fafb',
                      animation: `sparkFly 0.5s ${delay}s ease-out forwards`,
                      ['--spark-x' as string]: `${Math.cos(angle * Math.PI / 180) * dist}px`,
                      ['--spark-y' as string]: `${Math.sin(angle * Math.PI / 180) * dist}px`,
                      opacity: 0,
                      boxShadow: '0 0 6px rgba(251,146,60,0.8)',
                    }}
                  />
                );
              })}
            </div>

            {/* Smoke/dust puff */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 animate-[smokePuff_0.6s_0.2s_ease-out_forwards] opacity-0">
              <div className="w-full h-full rounded-full bg-gradient-radial from-yellow-500/30 via-orange-500/10 to-transparent blur-xl" />
            </div>
          </>
        )}

        {/* Split effect during cut */}
        {(phase === "cut" || phase === "exit") && (
          <>
            <div className="absolute inset-0 overflow-hidden animate-[splitTop_0.4s_0.35s_ease-in_forwards]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 60% 50%, 0% 60%)' }}
            >
              <img src={logoS} alt="" className="w-28 h-28 object-contain opacity-60" />
            </div>
            <div className="absolute inset-0 overflow-hidden animate-[splitBottom_0.4s_0.35s_ease-in_forwards]"
              style={{ clipPath: 'polygon(60% 50%, 100% 0, 100% 100%, 0 100%, 0% 60%)' }}
            >
              <img src={logoS} alt="" className="w-28 h-28 object-contain opacity-60" />
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes logoEnter {
          0% { transform: scale(0.3) rotate(-30deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes logoCut {
          0% { transform: scale(1); filter: brightness(1); }
          30% { transform: scale(1.05); filter: brightness(1.5); }
          70% { transform: scale(1.02); filter: brightness(1.2); }
          100% { transform: scale(1); filter: brightness(0.8); opacity: 0.3; }
        }
        @keyframes logoExit {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(2) rotate(15deg); opacity: 0; }
        }
        @keyframes sawSlash {
          0% { clip-path: inset(0 100% 0 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
        @keyframes brushSlash {
          0% { clip-path: inset(0 0 0 100%); opacity: 1; }
          100% { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes sawTeeth {
          0% { background-position-x: 0; }
          100% { background-position-x: 8px; }
        }
        @keyframes sparkFly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--spark-x), var(--spark-y)) scale(0); opacity: 0; }
        }
        @keyframes smokePuff {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes splitTop {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(-20px, -30px) rotate(-8deg); opacity: 0; }
        }
        @keyframes splitBottom {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(15px, 25px) rotate(6deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
