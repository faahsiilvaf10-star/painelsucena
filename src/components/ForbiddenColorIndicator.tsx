import { useState, useEffect, useRef } from "react";
import { Pin, PinOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Cor proibida por mês (0 = Janeiro, 11 = Dezembro)
const getMonthColor = (month: number): { color: string; name: string; bgClass: string; textClass: string } => {
  // Vermelho: Janeiro (0), Maio (4), Setembro (8)
  // Azul: Fevereiro (1), Junho (5), Outubro (9)
  // Amarelo: Março (2), Julho (6), Novembro (10)
  // Verde: Abril (3), Agosto (7), Dezembro (11)
  
  const colorMap: Record<number, { color: string; name: string; bgClass: string; textClass: string }> = {
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
    11: { color: "green", name: "Verde", bgClass: "bg-green-500", textClass: "text-green-500" },
  };
  
  return colorMap[month];
};

const getMonthName = (month: number): string => {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return months[month];
};

const ForbiddenColorIndicator = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const colorInfo = getMonthColor(currentMonth);
  
  // Inicializar posição no canto inferior direito
  useEffect(() => {
    const savedPosition = localStorage.getItem("forbiddenColorPosition");
    const savedPinned = localStorage.getItem("forbiddenColorPinned");
    const alertDismissed = localStorage.getItem(`forbiddenColorAlert-${currentMonth}-${today.getFullYear()}`);
    
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      setPosition({ x: window.innerWidth - 100, y: window.innerHeight - 150 });
    }
    
    if (savedPinned) {
      setIsPinned(JSON.parse(savedPinned));
    }
    
    // Mostrar alerta no primeiro dia do mês
    if (currentDay === 1 && !alertDismissed) {
      setShowAlert(true);
    }
  }, [currentMonth, currentDay, today]);
  
  // Salvar posição quando mudar
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem("forbiddenColorPosition", JSON.stringify(position));
    }
  }, [position]);
  
  // Salvar estado de fixado
  useEffect(() => {
    localStorage.setItem("forbiddenColorPinned", JSON.stringify(isPinned));
  }, [isPinned]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPinned) return;
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.initialX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.initialY + deltaY));
    
    setPosition({ x: newX, y: newY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);
  
  const handleAlertDismiss = () => {
    setShowAlert(false);
    localStorage.setItem(`forbiddenColorAlert-${currentMonth}-${today.getFullYear()}`, "true");
  };
  
  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setIsVisible(true)}
      >
        Mostrar Cor Proibida
      </Button>
    );
  }
  
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
      
      {/* Indicador flutuante */}
      <div
        className={`fixed z-50 flex flex-col items-center gap-1 ${isDragging ? "cursor-grabbing" : isPinned ? "cursor-default" : "cursor-grab"}`}
        style={{ left: position.x, top: position.y }}
      >
        {/* Controles */}
        <div className="flex gap-1 mb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Desafixar" : "Fixar posição"}
          >
            {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => setIsVisible(false)}
            title="Esconder"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Label */}
        <span className="text-[10px] font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap">
          Cor proibida
        </span>
        
        {/* Bolinha colorida */}
        <div
          className={`w-14 h-14 rounded-full ${colorInfo.bgClass} shadow-lg flex items-center justify-center transition-transform hover:scale-110 ${isDragging ? "scale-110" : ""}`}
          onMouseDown={handleMouseDown}
          title={`Cor proibida: ${colorInfo.name}`}
        >
          <span className="text-white text-xs font-bold drop-shadow-md">
            {colorInfo.name.substring(0, 3)}
          </span>
        </div>
        
        {/* Nome do mês */}
        <span className="text-[9px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
          {getMonthName(currentMonth)}
        </span>
      </div>
    </>
  );
};

export default ForbiddenColorIndicator;
