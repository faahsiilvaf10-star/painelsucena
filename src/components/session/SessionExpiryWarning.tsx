import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export const SessionExpiryWarning = () => {
  const { getRemainingTime, renewSession, isInWarningPeriod } = useSessionTimeout();
  const [isOpen, setIsOpen] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  useEffect(() => {
    // Check every 30 seconds for warning period
    const checkWarning = () => {
      const remaining = getRemainingTime();
      setRemainingMinutes(remaining);
      
      if (isInWarningPeriod() && !isOpen) {
        setIsOpen(true);
      }
    };

    checkWarning();
    const interval = setInterval(checkWarning, 30000);

    return () => clearInterval(interval);
  }, [getRemainingTime, isInWarningPeriod, isOpen]);

  const handleRenew = () => {
    renewSession();
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    // Let the session timeout naturally or trigger manual logout
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Sessão Expirando
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            <p>
              Sua sessão expirará em aproximadamente{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {remainingMinutes} minutos
              </span>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              Por segurança, sessões são limitadas a 5 horas. Deseja renovar sua sessão?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair Agora
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleRenew}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Renovar Sessão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
