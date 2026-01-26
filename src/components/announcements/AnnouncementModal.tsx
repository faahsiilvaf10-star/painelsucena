import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUnreadAnnouncements, Announcement } from "@/hooks/useAnnouncements";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, ChevronLeft, ChevronRight } from "lucide-react";

export function AnnouncementModal() {
  const { unreadAnnouncements, markAsRead } = useUnreadAnnouncements();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentAnnouncement = unreadAnnouncements[currentIndex];

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Megaphone className="w-5 h-5" />
            {currentAnnouncement.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {format(new Date(currentAnnouncement.published_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {currentAnnouncement.image_url && (
            <div className="w-full rounded-lg overflow-hidden">
              <img
                src={currentAnnouncement.image_url}
                alt="Banner do comunicado"
                className="w-full h-auto object-cover max-h-64"
              />
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{currentAnnouncement.content}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {unreadAnnouncements.length > 1 && (
            <div className="flex items-center gap-2 mr-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} de {unreadAnnouncements.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex === unreadAnnouncements.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          <Button onClick={handleConfirm} disabled={markAsRead.isPending}>
            {markAsRead.isPending ? "Confirmando..." : "Li e Entendi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
