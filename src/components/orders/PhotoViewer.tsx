import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";

interface PhotoViewerProps {
  photos: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiImageUrl?: string | null;
}

export function PhotoViewer({ photos, initialIndex = 0, open, onOpenChange, aiImageUrl }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Combine photos with AI image
  const allPhotos = [...photos, ...(aiImageUrl ? [aiImageUrl] : [])];
  
  if (allPhotos.length === 0) return null;

  const currentPhoto = allPhotos[currentIndex];
  const isAiImage = currentPhoto === aiImageUrl;

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
        <div className="relative flex items-center justify-center min-h-[60vh] max-h-[80vh]">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* AI Badge */}
          {isAiImage && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-primary/80 text-primary-foreground px-2 py-1 rounded-md text-sm">
              <Sparkles className="w-4 h-4" />
              Gerada por IA
            </div>
          )}

          {/* Navigation - Previous */}
          {allPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 z-10 text-white hover:bg-white/20"
              onClick={goPrev}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          {/* Image */}
          <img
            src={currentPhoto}
            alt={`Foto ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain"
          />

          {/* Navigation - Next */}
          {allPhotos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 z-10 text-white hover:bg-white/20"
              onClick={goNext}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {allPhotos.length}
          </div>

          {/* Thumbnails */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
              {allPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                    index === currentIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {photo === aiImageUrl && (
                    <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-center text-primary-foreground">
                      IA
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
