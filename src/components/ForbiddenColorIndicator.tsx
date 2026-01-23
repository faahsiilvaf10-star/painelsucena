import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    0: {
      color: "red",
      name: "Vermelha",
      bgClass: "bg-red-500",
      textClass: "text-red-500"
    },
    1: {
      color: "blue",
      name: "Azul",
      bgClass: "bg-blue-500",
      textClass: "text-blue-500"
    },
    2: {
      color: "yellow",
      name: "Amarela",
      bgClass: "bg-yellow-400",
      textClass: "text-yellow-500"
    },
    3: {
      color: "green",
      name: "Verde",
      bgClass: "bg-green-500",
      textClass: "text-green-500"
    },
    4: {
      color: "red",
      name: "Vermelha",
      bgClass: "bg-red-500",
      textClass: "text-red-500"
    },
    5: {
      color: "blue",
      name: "Azul",
      bgClass: "bg-blue-500",
      textClass: "text-blue-500"
    },
    6: {
      color: "yellow",
      name: "Amarela",
      bgClass: "bg-yellow-400",
      textClass: "text-yellow-500"
    },
    7: {
      color: "green",
      name: "Verde",
      bgClass: "bg-green-500",
      textClass: "text-green-500"
    },
    8: {
      color: "red",
      name: "Vermelha",
      bgClass: "bg-red-500",
      textClass: "text-red-500"
    },
    9: {
      color: "blue",
      name: "Azul",
      bgClass: "bg-blue-500",
      textClass: "text-blue-500"
    },
    10: {
      color: "yellow",
      name: "Amarela",
      bgClass: "bg-yellow-400",
      textClass: "text-yellow-500"
    },
    11: {
      color: "green",
      name: "Verde",
      bgClass: "bg-green-500",
      textClass: "text-green-500"
    }
  };
  return colorMap[month];
};
const getMonthName = (month: number): string => {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[month];
};
const ForbiddenColorIndicator = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const colorInfo = getMonthColor(currentMonth);
  useEffect(() => {
    const alertDismissed = localStorage.getItem(`forbiddenColorAlert-${currentMonth}-${today.getFullYear()}`);

    // Mostrar alerta no primeiro dia do mês
    if (currentDay === 1 && !alertDismissed) {
      setShowAlert(true);
    }
  }, [currentMonth, currentDay, today]);
  const handleAlertDismiss = () => {
    setShowAlert(false);
    localStorage.setItem(`forbiddenColorAlert-${currentMonth}-${today.getFullYear()}`, "true");
  };
  return <>
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
            {Array.from({
            length: 12
          }, (_, i) => {
            const monthColor = getMonthColor(i);
            const isCurrentMonth = i === currentMonth;
            return <div key={i} className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${isCurrentMonth ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"}`}>
                  <div className={`w-10 h-10 rounded-full ${monthColor.bgClass} shadow-md`} />
                  <span className="text-xs font-medium text-center">{getMonthName(i)}</span>
                  <span className={`text-[10px] ${monthColor.textClass}`}>{monthColor.name}</span>
                </div>;
          })}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Indicador flutuante */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1">
        {/* Label */}
        <span className="text-[10px] font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full whitespace-nowrap">
          Cor proibida
        </span>
        
        {/* Bolinha colorida */}
        <button onClick={() => setShowAllColors(true)} className={`w-14 h-14 rounded-full ${colorInfo.bgClass} shadow-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer`} title={`Cor proibida: ${colorInfo.name} - Clique para ver todas`}>
          
        </button>
        
        {/* Nome do mês */}
        <span className="text-[9px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
          {getMonthName(currentMonth)}
        </span>
      </div>
    </>;
};
export default ForbiddenColorIndicator;