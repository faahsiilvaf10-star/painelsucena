import { useEffect, useState, useRef } from "react";
import plantingBg from "@/assets/auth-bg-planting.png";
import gabionBg from "@/assets/auth-bg-gabion.png";
import constructionVideo from "@/assets/construction-timelapse.mp4";

const backgrounds = [plantingBg, gabionBg];

export function AuthBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // After video ends, show image slideshow
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleEnded = () => {
        setShowImages(true);
      };
      video.addEventListener('ended', handleEnded);
      return () => video.removeEventListener('ended', handleEnded);
    }
  }, []);

  // Image slideshow effect (starts after video ends)
  useEffect(() => {
    if (!showImages) return;
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
        setIsTransitioning(false);
      }, 1000);
    }, 8000);

    return () => clearInterval(interval);
  }, [showImages]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Video timelapse background */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          showImages ? "opacity-0" : "opacity-100"
        }`}
        autoPlay
        muted
        playsInline
        poster={plantingBg}
      >
        <source src={constructionVideo} type="video/mp4" />
      </video>

      {/* Image slideshow (shown after video ends) */}
      <div
        className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${
          showImages 
            ? isTransitioning ? "opacity-0 scale-110" : "opacity-100 scale-100"
            : "opacity-0"
        }`}
        style={{
          backgroundImage: `url(${backgrounds[currentIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: showImages ? "slowZoom 20s ease-in-out infinite alternate" : "none",
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

      {/* Progress indicator during video */}
      {!showImages && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          <div className="text-white/70 text-sm font-medium tracking-wider uppercase">
            Evolução da Obra
          </div>
          <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full animate-pulse"
              style={{
                animation: "progress 10s linear forwards"
              }}
            />
          </div>
        </div>
      )}

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

        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
