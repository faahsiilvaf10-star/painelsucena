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

interface SidebarBackgroundProps {
  animation?: string;
}

function generateParticles(count: number, maxSize = 3, maxOpacity = 0.25): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * maxSize,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 5,
    opacity: 0.1 + Math.random() * maxOpacity,
  }));
}

export function SidebarBackground({ animation = "particles" }: SidebarBackgroundProps) {
  const particles = useMemo(() => generateParticles(40), []);

  if (animation === "none") {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, hsl(220, 10%, 25%) 0%, hsl(220, 12%, 18%) 25%, hsl(220, 15%, 12%) 50%, hsl(220, 18%, 6%) 75%, hsl(0, 0%, 0%) 100%)`
        }} />
      </div>
    );
  }

  const animationClass = `animate-sidebar-${animation}`;
  const particleColorClass = {
    particles: "bg-white/20",
    stars: "bg-yellow-200/40",
    rain: "bg-blue-300/30",
    fireflies: "bg-amber-300/50",
    snow: "bg-white/40",
    matrix: "bg-green-400/40",
  }[animation] || "bg-white/20";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Main background */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 80% 60% at 50% 50%, hsl(220, 10%, 25%) 0%, hsl(220, 12%, 18%) 25%, hsl(220, 15%, 12%) 50%, hsl(220, 18%, 6%) 75%, hsl(0, 0%, 0%) 100%)`
      }} />

      {/* Subtle inner glow */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(circle at 50% 45%, rgba(100, 110, 130, 0.15) 0%, transparent 45%)`
      }} />

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.5) 100%)`
      }} />

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
