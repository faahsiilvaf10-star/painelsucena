import { useEffect, useState } from "react";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { getBrazilNorthDate, getBrazilNorthMonthYear } from "@/lib/timezone";

// Cargo definitions with their tasks (same as Matriz page)
const cargoDefinitions: Record<string, { cargo: string; tarefas: string[] }> = {
  preposto: { cargo: "Preposto", tarefas: ["p1", "p2", "p3", "p4", "p5"] },
  encarregado_geral: { cargo: "Enc. Geral", tarefas: ["eg1", "eg2", "eg3"] },
  encarregado_i: { cargo: "Enc. I", tarefas: ["e1-1", "e1-2", "e1-3"] },
  encarregado_ii: { cargo: "Enc. II", tarefas: ["e2-1", "e2-2", "e2-3"] },
  tecnico_seguranca_i: { cargo: "Téc. Seg. I", tarefas: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
  tecnico_seguranca_ii: { cargo: "Téc. Seg. II", tarefas: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
};

interface IncompleteUser {
  name: string;
  cargo: string;
  completedCount: number;
  totalTasks: number;
}

export function MatrixAlertBanner() {
  const [incompleteUsers, setIncompleteUsers] = useState<IncompleteUser[]>([]);
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
        
        // Fetch all task completions for this month
        const { data: completions, error: completionsError } = await supabase
          .from("matrix_task_completions")
          .select("task_id, user_id")
          .eq("month_year", monthYear);

        if (completionsError) throw completionsError;

        // Fetch all profiles with relevant cargos
        const relevantCargos = Object.keys(cargoDefinitions) as Array<
          "preposto" | "encarregado_geral" | "encarregado_i" | "encarregado_ii" | "tecnico_seguranca_i" | "tecnico_seguranca_ii"
        >;
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo")
          .in("cargo", relevantCargos);

        if (profilesError) throw profilesError;

        // Build a map of user_id -> completed task_ids
        const userCompletions = new Map<string, Set<string>>();
        completions?.forEach((c) => {
          if (!userCompletions.has(c.user_id)) {
            userCompletions.set(c.user_id, new Set());
          }
          userCompletions.get(c.user_id)!.add(c.task_id);
        });

        // Find users who haven't completed their cargo's tasks
        const incomplete: IncompleteUser[] = [];
        
        profiles?.forEach((profile) => {
          const cargoConfig = cargoDefinitions[profile.cargo];
          if (!cargoConfig) return;

          const userTasks = userCompletions.get(profile.user_id) || new Set();
          const completedCount = cargoConfig.tarefas.filter((taskId) => 
            userTasks.has(taskId)
          ).length;

          if (completedCount < cargoConfig.tarefas.length) {
            incomplete.push({
              name: profile.full_name,
              cargo: cargoConfig.cargo,
              completedCount,
              totalTasks: cargoConfig.tarefas.length,
            });
          }
        });

        // Sort by completion percentage (lowest first)
        incomplete.sort((a, b) => 
          (a.completedCount / a.totalTasks) - (b.completedCount / b.totalTasks)
        );

        setIncompleteUsers(incomplete);
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
            <AlertDescription className="text-orange-400 mt-2">
              <p className="mb-2">Usuários que ainda não concluíram a matriz:</p>
              <div className="flex flex-wrap gap-2">
                {incompleteUsers.map((user, index) => (
                  <div 
                    key={index}
                    className="inline-flex items-center gap-1.5 bg-orange-500/20 px-2 py-1 rounded-lg text-sm"
                  >
                    <User className="w-3.5 h-3.5 text-orange-300" />
                    <span className="text-orange-200 font-medium">{user.name}</span>
                    <span className="text-orange-400 text-xs">
                      ({user.cargo}: {user.completedCount}/{user.totalTasks})
                    </span>
                  </div>
                ))}
              </div>
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
