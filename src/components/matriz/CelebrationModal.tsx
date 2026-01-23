import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy } from "lucide-react";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cargoName: string;
}

export function CelebrationModal({ isOpen, onClose, cargoName }: CelebrationModalProps) {
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate fireworks
      const colors = ["#FFD700", "#FFA500", "#FF6347", "#00FF00", "#00BFFF", "#FF1493", "#FFFF00"];
      const newFireworks = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 60 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
      }));
      setFireworks(newFireworks);

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-none bg-transparent shadow-none overflow-visible">
        <div className="relative w-full h-[400px] flex items-center justify-center">
          {/* Fireworks */}
          {fireworks.map((fw) => (
            <div
              key={fw.id}
              className="absolute"
              style={{
                left: `${fw.x}%`,
                top: `${fw.y}%`,
                animation: `firework-burst 1.5s ease-out ${fw.delay}s infinite`,
              }}
            >
              {/* Firework particles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: fw.color,
                    boxShadow: `0 0 6px 2px ${fw.color}`,
                    animation: `firework-particle 1.5s ease-out ${fw.delay}s infinite`,
                    transform: `rotate(${i * 45}deg) translateY(-20px)`,
                    transformOrigin: "center center",
                  }}
                />
              ))}
              {/* Center glow */}
              <div
                className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  backgroundColor: fw.color,
                  boxShadow: `0 0 20px 8px ${fw.color}`,
                  animation: `firework-glow 1.5s ease-out ${fw.delay}s infinite`,
                }}
              />
            </div>
          ))}

          {/* Celebration Message */}
          <div 
            className="relative z-10 bg-gradient-to-br from-amber-500/90 via-yellow-500/90 to-orange-500/90 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-sm border-2 border-yellow-300/50"
            style={{
              animation: "celebration-appear 0.8s ease-out forwards",
            }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            
            <Trophy 
              className="w-20 h-20 mx-auto mb-4 text-white drop-shadow-lg"
              style={{
                animation: "trophy-bounce 1s ease-in-out infinite",
              }}
            />
            
            <h2 
              className="text-3xl font-bold text-white mb-2 drop-shadow-lg"
              style={{
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              🎉 Parabéns! 🎉
            </h2>
            
            <p 
              className="text-xl text-white/95 font-medium"
              style={{
                textShadow: "0 1px 5px rgba(0,0,0,0.2)",
              }}
            >
              Você concluiu a Matriz desse mês!
            </p>
            
            <p className="text-white/80 mt-2 text-sm">
              {cargoName}
            </p>

            {/* Sparkles */}
            <div className="absolute -top-2 -left-2 text-2xl animate-pulse">✨</div>
            <div className="absolute -top-2 -right-2 text-2xl animate-pulse" style={{ animationDelay: "0.3s" }}>✨</div>
            <div className="absolute -bottom-2 -left-2 text-2xl animate-pulse" style={{ animationDelay: "0.6s" }}>✨</div>
            <div className="absolute -bottom-2 -right-2 text-2xl animate-pulse" style={{ animationDelay: "0.9s" }}>✨</div>
          </div>
        </div>

        <style>{`
          @keyframes firework-burst {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }

          @keyframes firework-particle {
            0% {
              transform: rotate(var(--rotation)) translateY(0);
              opacity: 1;
            }
            100% {
              transform: rotate(var(--rotation)) translateY(-40px);
              opacity: 0;
            }
          }

          @keyframes firework-glow {
            0% {
              transform: translate(-50%, -50%) scale(0);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0.8;
            }
            100% {
              transform: translate(-50%, -50%) scale(2);
              opacity: 0;
            }
          }

          @keyframes celebration-appear {
            0% {
              transform: scale(0.3) translateY(50px);
              opacity: 0;
            }
            60% {
              transform: scale(1.1) translateY(-10px);
              opacity: 1;
            }
            100% {
              transform: scale(1) translateY(0);
              opacity: 1;
            }
          }

          @keyframes trophy-bounce {
            0%, 100% {
              transform: translateY(0) rotate(-5deg);
            }
            50% {
              transform: translateY(-10px) rotate(5deg);
            }
          }

          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
