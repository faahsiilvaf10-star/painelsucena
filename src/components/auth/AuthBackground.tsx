import { useEffect, useState } from "react";
import plantingBg from "@/assets/auth-bg-planting.png";
import gabionBg from "@/assets/auth-bg-gabion.png";

const backgrounds = [plantingBg, gabionBg];

export function AuthBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
        setIsTransitioning(false);
      }, 1000);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Main background image with zoom animation */}
      <div
        className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${
          isTransitioning ? "opacity-0 scale-110" : "opacity-100 scale-100"
        }`}
        style={{
          backgroundImage: `url(${backgrounds[currentIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: "slowZoom 20s ease-in-out infinite alternate",
        }}
      />

      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />

      {/* Animated grid overlay (CAD style) */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(245, 165, 36, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(245, 165, 36, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "gridMove 20s linear infinite",
        }}
      />

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Corner accent lines (engineering style) */}
      <div className="absolute top-4 left-4 w-20 h-20 border-l-2 border-t-2 border-primary/40" />
      <div className="absolute top-4 right-4 w-20 h-20 border-r-2 border-t-2 border-primary/40" />
      <div className="absolute bottom-4 left-4 w-20 h-20 border-l-2 border-b-2 border-primary/40" />
      <div className="absolute bottom-4 right-4 w-20 h-20 border-r-2 border-b-2 border-primary/40" />

      <style>{`
        @keyframes slowZoom {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.1);
          }
        }

        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(40px, 40px);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-30px) translateX(10px);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}