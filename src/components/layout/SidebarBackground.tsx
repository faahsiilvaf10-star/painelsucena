import { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 5,
    opacity: 0.1 + Math.random() * 0.25,
  }));
}

interface SidebarBackgroundProps {
  animation?: string;
  bgColor?: string;
}

function isLightColor(color?: string): boolean {
  if (!color) return false;
  const match = color.match(/hsl\(\s*[\d.]+\s*,\s*[\d.]+%?\s*,\s*([\d.]+)%?\s*\)/);
  if (match) return parseFloat(match[1]) > 50;
  return false;
}

export function SidebarBackground({ animation = "particles", bgColor }: SidebarBackgroundProps) {
  const particles = useMemo(() => generateParticles(40), []);
  const light = isLightColor(bgColor);

  if (animation === "none") {
    return null;
  }

  const animationClass = `animate-sidebar-${animation}`;
  const particleColorClass = light
    ? {
        particles: "bg-black/15",
        stars: "bg-amber-600/30",
        rain: "bg-blue-600/25",
        fireflies: "bg-orange-500/40",
        snow: "bg-gray-500/25",
        matrix: "bg-green-700/35",
      }[animation] || "bg-black/15"
    : {
        particles: "bg-white/20",
        stars: "bg-yellow-200/40",
        rain: "bg-blue-300/30",
        fireflies: "bg-amber-300/50",
        snow: "bg-white/40",
        matrix: "bg-green-400/40",
      }[animation] || "bg-white/20";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Animated particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full ${particleColorClass} ${animationClass}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Animation keyframes */}
      <style>{`
        @keyframes sidebar-particles {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(5px); }
          50% { transform: translateY(-8px) translateX(-3px); }
          75% { transform: translateY(-20px) translateX(3px); }
        }
        .animate-sidebar-particles { animation: sidebar-particles ease-in-out infinite; }

        @keyframes sidebar-stars {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.8); opacity: 0.6; }
        }
        .animate-sidebar-stars { animation: sidebar-stars ease-in-out infinite; }

        @keyframes sidebar-rain {
          0% { transform: translateY(-10px); opacity: 0; }
          20% { opacity: 0.5; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-sidebar-rain { animation: sidebar-rain linear infinite; }

        @keyframes sidebar-fireflies {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          25% { transform: translate(10px, -15px) scale(1.5); opacity: 0.7; }
          50% { transform: translate(-5px, -25px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(8px, -10px) scale(1.3); opacity: 0.8; }
        }
        .animate-sidebar-fireflies { animation: sidebar-fireflies ease-in-out infinite; }

        @keyframes sidebar-snow {
          0% { transform: translateY(-5px) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(100vh) translateX(20px); opacity: 0; }
        }
        .animate-sidebar-snow { animation: sidebar-snow linear infinite; }

        @keyframes sidebar-matrix {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.3; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-sidebar-matrix { animation: sidebar-matrix linear infinite; }
      `}</style>
    </div>
  );
}
