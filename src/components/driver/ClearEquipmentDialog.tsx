import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const ClearEquipmentDialog = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  const handleClearEquipment = async () => {
    setIsClearing(true);
    try {
      // Clear equipment drivers for current environment
      const { error } = await supabase
        .from("equipment")
        .update({ driver: "", stop_reason: "none", stop_start_time: null })
        .eq("environment", currentEnv);

      if (error) throw error;

      // Clear local storage for this device
      localStorage.removeItem("selectedVehicleId");

      toast.success("Todos os equipamentos foram liberados!");
      
      // Sign out the current user
      await supabase.auth.signOut();
      
      // Navigate to auth page
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("Erro ao limpar equipamentos:", error);
      toast.error("Erro ao limpar equipamentos");
    } finally {
      setIsClearing(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Limpar Equipamentos
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            Limpar Todos os Equipamentos?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Esta ação irá:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Liberar todos os veículos para nova seleção</li>
              <li>Resetar o status de todos os equipamentos</li>
              <li>Desconectar sua conta atual</li>
            </ul>
            <p className="mt-3 font-medium text-destructive">
              Todos os motoristas precisarão selecionar seus veículos novamente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="touch-manipulation">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearEquipment}
            disabled={isClearing}
            className="bg-orange-500 hover:bg-orange-600 touch-manipulation"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Limpando...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpar Tudo
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
