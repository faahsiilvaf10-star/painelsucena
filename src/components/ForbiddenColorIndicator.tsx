import { useState, useEffect, useRef, useCallback } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBrazilNorthMonth, getBrazilNorthDayOfMonth, getBrazilNorthYear } from "@/lib/timezone";

// Cor proibida por mês (0 = Janeiro, 11 = Dezembro)
const getMonthColor = (month: number): {
  color: string;
  name: string;
  bgClass: string;
  textClass: string;
} => {
  const colorMap: Record<number, {
    color: string;
    name: string;
    bgClass: string;
    textClass: string;
  }> = {
    0: { color: "red", name: "Vermelha", bgClass: "bg-red-500", textClass: "text-red-500" },
    1: { color: "blue", name: "Azul", bgClass: "bg-blue-500", textClass: "text-blue-500" },
    2: { color: "yellow", name: "Amarela", bgClass: "bg-yellow-400", textClass: "text-yellow-500" },
    3: { color: "green", name: "Verde", bgClass: "bg-green-500", textClass: "text-green-500" },
    4: { color: "red", name: "Vermelha", bgClass: "bg-red-500", textClass: "text-red-500" },
    5: { color: "blue", name: "Azul", bgClass: "bg-blue-500", textClass: "text-blue-500" },
    6: { color: "yellow", name: "Amarela", bgClass: "bg-yellow-400", textClass: "text-yellow-500" },
    7: { color: "green", name: "Verde", bgClass: "bg-green-500", textClass: "text-green-500" },
    8: { color: "red", name: "Vermelha", bgClass: "bg-red-500", textClass: "text-red-500" },
    9: { color: "blue", name: "Azul", bgClass: "bg-blue-500", textClass: "text-blue-500" },
    10: { color: "yellow", name: "Amarela", bgClass: "bg-yellow-400", textClass: "text-yellow-500" },
    11: { color: "green", name: "Verde", bgClass: "bg-green-500", textClass: "text-green-500" }
  };
  return colorMap[month];
};

const getMonthName = (month: number): string => {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[month];
};

const STORAGE_KEY = "forbiddenColorPosition";

const ForbiddenColorIndicator = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 }); // bottom-right offset
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasDraggedRef = useRef(false);
  
  const currentMonth = getBrazilNorthMonth();
  const currentDay = getBrazilNorthDayOfMonth();
  const currentYear = getBrazilNorthYear();
  const colorInfo = getMonthColor(currentMonth);

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch {}
    }
  }, []);

  // Save position when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  useEffect(() => {
    const alertDismissed = localStorage.getItem(`forbiddenColorAlert-${currentMonth}-${currentYear}`);
    if (currentDay === 1 && !alertDismissed) {
      setShowAlert(true);
    }
  }, [currentMonth, currentDay, currentYear]);

  const handleAlertDismiss = () => {
    setShowAlert(false);
    localStorage.setItem(`forbiddenColorAlert-${currentMonth}-${currentYear}`, "true");
  };

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y
    };
  }, [position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;
    
    // Threshold to distinguish click from drag
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true;
    }
    
    const newX = Math.max(10, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX, e.clientY);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  const handleClick = () => {
    // Only open dialog if we didn't drag
    if (!hasDraggedRef.current) {
      setShowAllColors(true);
    }
  };

  return (
    <>
      {/* Alerta de mudança de cor */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              🎨 Mudança de Cor Proibida!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                A cor proibida deste mês de <strong>{getMonthName(currentMonth)}</strong> é:
              </p>
              <div className="flex items-center justify-center gap-3 py-4">
                <div className={`w-12 h-12 rounded-full ${colorInfo.bgClass} shadow-lg animate-pulse`} />
                <span className={`text-2xl font-bold ${colorInfo.textClass}`}>
                  {colorInfo.name}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Lembre-se de seguir as orientações sobre o uso desta cor durante todo o mês.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAlertDismiss}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal com todas as cores */}
      <Dialog open={showAllColors} onOpenChange={setShowAllColors}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cores Proibidas por Mês</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {Array.from({ length: 12 }, (_, i) => {
              const monthColor = getMonthColor(i);
              const isCurrentMonth = i === currentMonth;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                    isCurrentMonth ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${monthColor.bgClass} shadow-md`} />
                  <span className="text-xs font-medium text-center">{getMonthName(i)}</span>
                  <span className={`text-[10px] ${monthColor.textClass}`}>{monthColor.name}</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Indicador flutuante arrastável */}
      <div
        ref={dragRef}
        className="fixed z-50 flex flex-col items-center gap-1 select-none"
        style={{
          right: position.x,
          bottom: position.y,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Label */}
        <span className="text-[10px] font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
          Cor proibida
        </span>
        
        {/* Bolinha colorida */}
        <button
          onClick={handleClick}
          className={`w-8 h-8 rounded-full ${colorInfo.bgClass} shadow-md flex items-center justify-center transition-transform hover:scale-110`}
          title={`Cor proibida: ${colorInfo.name} - Arraste para mover, clique para ver todas`}
        />
        
        {/* Nome do mês */}
        <span className="text-[9px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full pointer-events-none">
          {getMonthName(currentMonth)}
        </span>
      </div>
    </>
  );
};

export default ForbiddenColorIndicator;