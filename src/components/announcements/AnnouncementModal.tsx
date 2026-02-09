import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUnreadAnnouncements } from "@/hooks/useAnnouncements";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundFile } from "@/lib/sounds";
import logoFallback from "@/assets/logo-sucena.png";

// Particle component matching sidebar style
function SidebarStyleParticle({ x, y, size, duration, delay, opacity }: {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}) {
  return (
    <div
      className="absolute rounded-full bg-white/20 animate-sidebar-particle"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

// Particle field matching sidebar aesthetic
function ParticleField() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 5,
    opacity: 0.1 + Math.random() * 0.25,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <SidebarStyleParticle key={p.id} {...p} />
      ))}
    </div>
  );
}

export function AnnouncementModal() {
  const { unreadAnnouncements, markAsRead } = useUnreadAnnouncements();
  const { settings } = useSiteSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasPlayedSound = useRef(false);

  const companyLogo = settings.logo_url || logoFallback;

  const currentAnnouncement = unreadAnnouncements[currentIndex];

  // Play sound when announcement modal appears
  useEffect(() => {
    if (currentAnnouncement && !hasPlayedSound.current) {
      playSoundFile("/sounds/chime.mp3");
      hasPlayedSound.current = true;
    }
    
    // Reset when all announcements are read
    if (!currentAnnouncement) {
      hasPlayedSound.current = false;
    }
  }, [currentAnnouncement]);

  if (!currentAnnouncement) return null;

  const handleConfirm = async () => {
    await markAsRead.mutateAsync(currentAnnouncement.id);
    if (currentIndex >= unreadAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(unreadAnnouncements.length - 1, prev + 1));
  };

  return (
    <Dialog open={!!currentAnnouncement} onOpenChange={() => {}}>
      <DialogContent 
        className={cn(
          "sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0",
          "border-0 bg-transparent shadow-none"
        )}
        hideCloseButton
      >
        {/* Custom styled container - Windows 11 style with neon glow */}
        <div className="relative rounded-xl overflow-hidden announcement-modal-container">
          {/* White neon glow behind black border */}
          <div 
            className="absolute -inset-1 rounded-xl"
            style={{
              background: 'transparent',
              boxShadow: '0 0 15px 3px rgba(255, 255, 255, 0.3), 0 0 30px 6px rgba(255, 255, 255, 0.15), 0 0 60px 12px rgba(255, 255, 255, 0.05)',
            }}
          />
          
          {/* Black border - Windows 11 style */}
          <div 
            className="absolute inset-0 rounded-xl"
            style={{
              border: '2px solid hsl(0, 0%, 10%)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
            }}
          />
          
          {/* Inner content with dark background */}
          <div className="relative m-[2px] rounded-lg overflow-hidden">
            {/* Main dark background */}
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(
                  180deg,
                  hsl(220, 15%, 10%) 0%,
                  hsl(220, 18%, 6%) 100%
                )`
              }}
            />
            
            {/* Particle effects */}
            <ParticleField />
            
            {/* Close button */}
            <button 
              className="absolute top-3 right-3 z-20 text-white/60 hover:text-white transition-colors"
              onClick={handleConfirm}
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Content */}
            <div className="relative z-10 p-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-white announcement-title">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  {currentAnnouncement.title}
                </DialogTitle>
                <p className="text-sm text-white/70 announcement-text">
                  {format(new Date(currentAnnouncement.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                {currentAnnouncement.image_url && (
                  <div className="w-full rounded-lg overflow-hidden border border-white/10 relative">
                    <img
                      src={currentAnnouncement.image_url}
                      alt="Banner do comunicado"
                      className="w-full h-auto object-cover max-h-64"
                    />
                    {/* Campaign title overlay on banner */}
                    {currentAnnouncement.title.includes("Campanhas") && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8">
                        <h3 className="text-white font-bold text-lg drop-shadow-lg">
                          {currentAnnouncement.title.replace("🎗️ ", "")}
                        </h3>
                      </div>
                    )}
                  </div>
                )}

                <div className="announcement-content">
                  <p className="whitespace-pre-wrap text-white announcement-text text-lg">
                    {currentAnnouncement.content}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                {unreadAnnouncements.length > 1 && (
                  <div className="flex items-center gap-2 mr-auto">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="border-amber-500/50 text-white hover:bg-amber-500/20 hover:border-amber-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-white/70 announcement-text">
                      {currentIndex + 1} de {unreadAnnouncements.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNext}
                      disabled={currentIndex === unreadAnnouncements.length - 1}
                      className="border-amber-500/50 text-white hover:bg-amber-500/20 hover:border-amber-400"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <Button 
                  onClick={handleConfirm} 
                  disabled={markAsRead.isPending}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold shadow-lg shadow-amber-500/30 border-0 announcement-button"
                >
                  {markAsRead.isPending ? "Confirmando..." : "Li e Entendi"}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
