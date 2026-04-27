import { useState, useEffect, useMemo } from "react";
import { useMatrixProgress } from "./useMatrixProgress";
import { useProfile } from "./useProfile";
import { useIsAdmin } from "./useUserRole";
import { getBrazilNorthTodayString } from "@/lib/timezone";

interface CargoTarefaSimple {
  id: string;
}

const cargoTaskMap: Record<string, { cargo: string; tarefas: CargoTarefaSimple[] }> = {
  preposto: { cargo: "Preposto", tarefas: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" }] },
  encarregado_geral: { cargo: "Encarregado Geral", tarefas: [{ id: "eg1" }, { id: "eg2" }, { id: "eg3" }] },
  encarregado_i: { cargo: "Encarregado I", tarefas: [{ id: "e1-1" }, { id: "e1-2" }, { id: "e1-3" }] },
  encarregado_ii: { cargo: "Encarregado II", tarefas: [{ id: "e2-1" }, { id: "e2-2" }, { id: "e2-3" }] },
  tecnico_seguranca_i: { cargo: "Téc. Segurança I", tarefas: [{ id: "ts1-1" }, { id: "ts1-2" }, { id: "ts1-3" }, { id: "ts1-4" }, { id: "ts1-5" }, { id: "ts1-6" }] },
  tecnico_seguranca_ii: { cargo: "Téc. Segurança II", tarefas: [{ id: "ts2-1" }, { id: "ts2-2" }, { id: "ts2-3" }, { id: "ts2-4" }, { id: "ts2-5" }, { id: "ts2-6" }] },
};

const LAST_DAY_MATRIX_KEY = "matrix_lastday_shown";

export const useLastDayMatrixCheck = () => {
  const { completedTasks, isLoading: matrixLoading } = useMatrixProgress();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin } = useIsAdmin();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const isLastDayOfMonth = useMemo(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() === lastDay;
  }, []);

  const userCargo = profile?.cargo as string | undefined;
  const cargoInfo = userCargo ? cargoTaskMap[userCargo] : null;

  const progress = useMemo(() => {
    if (!cargoInfo) return 0;
    const completed = cargoInfo.tarefas.filter(t => completedTasks.includes(t.id)).length;
    return Math.round((completed / cargoInfo.tarefas.length) * 100);
  }, [cargoInfo, completedTasks]);

  // Dias restantes até o fim do mês (inclusive o último dia)
  const daysUntilMonthEnd = useMemo(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Math.max(0, lastDay - today.getDate());
  }, []);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleString("pt-BR", { month: "long" });
  }, []);

  // Lista de cargos com matriz pendente (qualquer cargo cujas tarefas não estão 100% completas)
  const pendingCargos = useMemo(() => {
    const shortLabels: Record<string, string> = {
      preposto: "Preposto",
      encarregado_geral: "Enc. Geral",
      encarregado_i: "Enc. I",
      encarregado_ii: "Enc. II",
      tecnico_seguranca_i: "Téc. Seg. I",
      tecnico_seguranca_ii: "Téc. Seg. II",
    };
    return Object.entries(cargoTaskMap).map(([key, info]) => {
      const done = info.tarefas.filter(t => completedTasks.includes(t.id)).length;
      return {
        key,
        label: shortLabels[key] ?? info.cargo,
        cargo: info.cargo,
        done,
        total: info.tarefas.length,
      };
    }).filter(c => c.done < c.total);
  }, [completedTasks]);

  useEffect(() => {
    if (matrixLoading || profileLoading || !isLastDayOfMonth || !cargoInfo) return;
    if (isAdmin) return;

    const today = getBrazilNorthTodayString();
    const shownKey = localStorage.getItem(LAST_DAY_MATRIX_KEY);

    if (progress === 100) {
      // Show celebration only once per day
      if (shownKey !== `${today}_celebration`) {
        localStorage.setItem(LAST_DAY_MATRIX_KEY, `${today}_celebration`);
        setShowCelebration(true);
      }
    } else if (progress >= 0) {
      // Show reminder only once per day, and only if not already celebrated
      if (shownKey !== today && shownKey !== `${today}_celebration`) {
        localStorage.setItem(LAST_DAY_MATRIX_KEY, today);
        setShowReminder(true);
      }
    }
  }, [matrixLoading, profileLoading, isLastDayOfMonth, cargoInfo, progress, isAdmin]);

  return {
    showCelebration,
    showReminder,
    setShowCelebration,
    setShowReminder,
    cargoName: cargoInfo?.cargo || "",
    progress,
    userName: profile?.full_name,
    userAvatarUrl: profile?.avatar_url,
  };
};
