import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";

interface ProfilePhotoViewerProps {
  src?: string | null;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePhotoViewer({ src, name, open, onOpenChange }: ProfilePhotoViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (open) {
      resetZoom();
    }
  }, [open, resetZoom]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  if (!src) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 bg-black/95 border-none overflow-hidden sm:rounded-2xl">
        <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/60 to-transparent flex-row items-center justify-between space-y-0 border-none">
          <DialogTitle className="text-white font-medium text-lg drop-shadow-md">
            {name}
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 rounded-full" onClick={zoomOut} disabled={scale <= 1}>
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 rounded-full" onClick={zoomIn} disabled={scale >= 5}>
              <ZoomIn className="w-5 h-5" />
            </Button>
            {scale > 1 && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 rounded-full" onClick={resetZoom}>
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/20 rounded-full ml-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex items-center justify-center min-h-[50vh] max-h-[85vh] overflow-hidden select-none bg-[#111]">
          <img
            src={src}
            alt={name}
            className="max-w-full max-h-[85vh] object-contain transition-transform duration-200"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            }}
            onDoubleClick={handleDoubleClick}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
