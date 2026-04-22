import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { colaboradoresAtivos as initialColaboradores, type Colaborador } from "@/data/efetivoData";
import { useEnvironment } from "@/hooks/useEnvironment";

interface RHEfetivoRow {
  id: string;
  colaboradores: Colaborador[];
  deleted_ids: number[];
  imported_at: string;
  imported_by: string;
  environment: string;
}

export const useRHEfetivo = () => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  // Default fallback (Barcarena) when no env selected yet
  const env = environment ?? "barcarena";

  const query = useQuery({
    queryKey: ["rh-efetivo", env],
    queryFn: async () => {
      // RLS already filters by current_environment() via x-environment header,
      // but we also filter explicitly to be safe.
      const { data, error } = await supabase
        .from("rh_efetivo")
        .select("*")
        .eq("environment", env)
        .order("imported_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0] as unknown as RHEfetivoRow;
        const importedColabs = (row.colaboradores || []) as Colaborador[];
        // Fallback only for Barcarena (legado). Paragominas começa vazio.
        const fallback = env === "barcarena" ? initialColaboradores : [];
        const colaboradores = importedColabs.length > 0 ? importedColabs : fallback;
        return {
          colaboradores,
          deletedIds: (row.deleted_ids || []) as number[],
          hasImported: importedColabs.length > 0,
          rowId: row.id,
        };
      }

      // No row at all for this environment
      return {
        colaboradores: env === "barcarena" ? initialColaboradores : [],
        deletedIds: [] as number[],
        hasImported: false,
        rowId: null as string | null,
      };
    },
  });

  // Realtime subscription — auto-refresh for all users when data changes
  useEffect(() => {
    const channel = supabase
      .channel(`rh-efetivo-changes-${env}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rh_efetivo" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["rh-efetivo", env] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, env]);

  const saveMutation = useMutation({
    mutationFn: async ({
      colaboradores,
      deletedIds,
      existingRowId,
    }: {
      colaboradores: Colaborador[];
      deletedIds: number[];
      existingRowId: string | null;
    }) => {
      if (existingRowId) {
        const { error } = await supabase
          .from("rh_efetivo")
          .update({
            colaboradores: colaboradores as any,
            deleted_ids: deletedIds as any,
            imported_at: new Date().toISOString(),
          })
          .eq("id", existingRowId);
        if (error) throw error;
      } else {
        // environment column is set automatically by trigger from x-environment header
        const { error } = await supabase.from("rh_efetivo").insert({
          colaboradores: colaboradores as any,
          deleted_ids: deletedIds as any,
          imported_by: "system",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rh-efetivo", env] });
    },
  });

  return { ...query, saveMutation };
};
