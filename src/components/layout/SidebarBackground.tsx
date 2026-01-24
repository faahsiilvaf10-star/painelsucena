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

export function SidebarBackground() {
  // Generate random particles (fewer for sidebar)
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      duration: 6 + Math.random() * 10,
      delay: Math.random() * 5,
      opacity: 0.1 + Math.random() * 0.25,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Main gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 120% 80% at 50% 30%,
            hsl(220, 10%, 22%) 0%,
            hsl(220, 12%, 16%) 30%,
            hsl(220, 15%, 10%) 60%,
            hsl(0, 0%, 0%) 100%
          )`
        }}
      />

      {/* Subtle inner glow for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            circle at 50% 20%,
            rgba(100, 110, 130, 0.12) 0%,
            transparent 50%
          )`
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/20 animate-sidebar-particle"
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

      {/* Animation styles */}
      <style>{`
        @keyframes sidebar-particle {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-15px) translateX(5px);
          }
          50% {
            transform: translateY(-8px) translateX(-3px);
          }
          75% {
            transform: translateY(-20px) translateX(3px);
          }
        }
        
        .animate-sidebar-particle {
          animation: sidebar-particle ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
