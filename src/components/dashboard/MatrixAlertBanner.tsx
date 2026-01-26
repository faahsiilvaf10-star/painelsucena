import { useEffect, useState } from "react";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { getBrazilNorthDate, getBrazilNorthMonthYear } from "@/lib/timezone";

// Cargo definitions with their tasks (same as Matriz page)
const cargoDefinitions = [
  { id: "preposto", cargo: "Preposto", tarefas: ["p1", "p2", "p3", "p4", "p5"] },
  { id: "encarregado-geral", cargo: "Enc. Geral", tarefas: ["eg1", "eg2", "eg3"] },
  { id: "encarregado-i", cargo: "Enc. I", tarefas: ["e1-1", "e1-2", "e1-3"] },
  { id: "encarregado-ii", cargo: "Enc. II", tarefas: ["e2-1", "e2-2", "e2-3"] },
  { id: "tecnico-seguranca-i", cargo: "Téc. Seg. I", tarefas: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
  { id: "tecnico-seguranca-ii", cargo: "Téc. Seg. II", tarefas: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
];

export function MatrixAlertBanner() {
  const [incompleteRoles, setIncompleteRoles] = useState<string[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const checkMatrixStatus = async () => {
      try {
        const today = getBrazilNorthDate();
        const endOfCurrentMonth = endOfMonth(today);
        const daysUntilEndOfMonth = differenceInDays(endOfCurrentMonth, today);
        
        setDaysRemaining(daysUntilEndOfMonth);

        // Only check if within 5 days of end of month
        if (daysUntilEndOfMonth > 5) {
          setShowAlert(false);
          return;
        }

        const monthYear = getBrazilNorthMonthYear();
        
        const { data, error } = await supabase
          .from("matrix_task_completions")
          .select("task_id")
          .eq("month_year", monthYear);

        if (error) throw error;

        const completedTaskIds = new Set(data?.map((item) => item.task_id) || []);

        // Find incomplete roles
        const incomplete = cargoDefinitions
          .filter((cargo) => {
            const completedCount = cargo.tarefas.filter((taskId) => 
              completedTaskIds.has(taskId)
            ).length;
            return completedCount < cargo.tarefas.length;
          })
          .map((cargo) => cargo.cargo);

        setIncompleteRoles(incomplete);
        setShowAlert(incomplete.length > 0);
      } catch (error) {
        console.error("Error checking matrix status:", error);
      }
    };

    checkMatrixStatus();
  }, []);

  if (!showAlert) {
    return null;
  }

  const currentMonth = format(getBrazilNorthDate(), "MMMM", { locale: ptBR });

  return (
    <div className="mb-6 animate-fade-in">
      <Alert className="border-orange-500 bg-orange-500/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-orange-500 font-bold text-lg flex items-center gap-2">
              🚨 Atenção! {daysRemaining === 0 ? "Último dia" : `Faltam ${daysRemaining} dias`} para fechar {currentMonth}
            </AlertTitle>
            <AlertDescription className="text-orange-400 mt-1">
              Os seguintes cargos ainda não concluíram a matriz:{" "}
              <strong className="text-orange-300">{incompleteRoles.join(", ")}</strong>. 
              Complete as tarefas pendentes antes do dia 01!
            </AlertDescription>
          </div>
          <Link
            to="/matriz"
            className="text-orange-400 hover:text-orange-300 transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </Alert>
    </div>
  );
}
