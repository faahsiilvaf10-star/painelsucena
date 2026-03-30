import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUnreadAnnouncements } from "@/hooks/useAnnouncements";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSoundFile } from "@/lib/sounds";

export function AnnouncementModal() {
  const { unreadAnnouncements, markAsRead } = useUnreadAnnouncements();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasPlayedSound = useRef(false);

  const currentAnnouncement = unreadAnnouncements[currentIndex];

  useEffect(() => {
    if (currentAnnouncement && !hasPlayedSound.current) {
      playSoundFile("/sounds/announcement.mp3");
      hasPlayedSound.current = true;
    }
    if (!currentAnnouncement) {
      hasPlayedSound.current = false;
    }
  }, [currentAnnouncement]);

  if (!currentAnnouncement) return null;

  const desvioIdMatch = currentAnnouncement?.content?.match(/<!--desvio:([a-f0-9-]+)-->/);
  const linkedDesvioId = desvioIdMatch ? desvioIdMatch[1] : null;
  const displayContent = currentAnnouncement?.content?.replace(/\n?<!--desvio:[a-f0-9-]+-->/, "") || "";

  const handleConfirm = async () => {
    await markAsRead.mutateAsync(currentAnnouncement.id);
    if (currentIndex >= unreadAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleGoToDesvio = async () => {
    await markAsRead.mutateAsync(currentAnnouncement.id);
    if (currentIndex >= unreadAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
    navigate(`/desvios?highlight=${linkedDesvioId}`);
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
          "sm:max-w-lg max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0",
          "border-0 bg-transparent shadow-none"
        )}
        hideCloseButton
      >
        {/* Light card container */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "hsl(0, 0%, 95%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
          }}
        >
          {/* Close button */}
          <button
            className="absolute top-3 right-3 z-20 transition-colors p-1"
            style={{ color: "hsl(30, 10%, 40%)" }}
            onClick={handleConfirm}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative z-10 p-5 sm:p-7 max-h-[80vh] overflow-y-auto">
            <DialogHeader className="space-y-1">
              <DialogTitle
                className="flex items-center gap-2 pr-6"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  color: "hsl(30, 15%, 20%)",
                }}
              >
                <span className="text-xl">📢</span>
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ background: "hsl(160, 55%, 40%)" }}
                />
                {currentAnnouncement.title}
              </DialogTitle>
              <p
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: "0.82rem",
                  color: "hsl(0, 0%, 50%)",
                }}
              >
                {format(new Date(currentAnnouncement.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </DialogHeader>

            <div className="flex-1 space-y-3 py-4">
              {currentAnnouncement.image_url && (
                <div className="w-full rounded-lg overflow-hidden relative">
                  <img
                    src={currentAnnouncement.image_url}
                    alt="Banner do comunicado"
                    className="w-full h-auto object-contain"
                  />
                  {currentAnnouncement.title.includes("Campanhas") && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4 pt-6 sm:pt-8">
                      <h3 className="text-white font-bold text-sm sm:text-lg drop-shadow-lg">
                        {currentAnnouncement.title.replace("🎗️ ", "")}
                      </h3>
                    </div>
                  )}
                </div>
              )}

              {/* Separator */}
              <div style={{ borderTop: "1px solid hsl(0, 0%, 82%)" }} />

              <div>
                <p
                  className="whitespace-pre-wrap"
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: "1.05rem",
                    color: "hsl(0, 0%, 15%)",
                    lineHeight: 1.6,
                  }}
                >
                  {displayContent}
                </p>
              </div>

              {linkedDesvioId && (
                <Button
                  variant="outline"
                  onClick={handleGoToDesvio}
                  className="gap-2 w-full mt-2"
                  style={{
                    borderColor: "hsl(160, 55%, 40%)",
                    color: "hsl(160, 55%, 30%)",
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver Desvio Corrigido
                </Button>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
              {unreadAnnouncements.length > 1 && (
                <div className="flex items-center gap-2 mr-auto">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    style={{
                      borderColor: "hsl(0, 0%, 75%)",
                      color: "hsl(0, 0%, 30%)",
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span
                    style={{
                      fontFamily: "'Georgia', 'Times New Roman', serif",
                      fontSize: "0.85rem",
                      color: "hsl(0, 0%, 50%)",
                    }}
                  >
                    {currentIndex + 1} de {unreadAnnouncements.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    disabled={currentIndex === unreadAnnouncements.length - 1}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    style={{
                      borderColor: "hsl(0, 0%, 75%)",
                      color: "hsl(0, 0%, 30%)",
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <button
                onClick={handleConfirm}
                disabled={markAsRead.isPending}
                className="uppercase tracking-wider font-bold px-8 py-3 rounded-lg transition-all sm:ml-auto"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: "0.95rem",
                  background: "linear-gradient(180deg, hsl(5, 60%, 58%) 0%, hsl(5, 55%, 50%) 100%)",
                  color: "hsl(0, 0%, 100%)",
                  boxShadow: "0 4px 12px rgba(180, 70, 60, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                  letterSpacing: "0.12em",
                }}
              >
                {markAsRead.isPending ? "CONFIRMANDO..." : "LI E ENTENDI"}
              </button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
