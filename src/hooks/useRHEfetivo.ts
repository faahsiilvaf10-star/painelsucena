import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { colaboradoresAtivos as initialColaboradores, type Colaborador } from "@/data/efetivoData";

interface RHEfetivoRow {
  id: string;
  colaboradores: Colaborador[];
  deleted_ids: number[];
  imported_at: string;
  imported_by: string;
}

export const useRHEfetivo = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rh-efetivo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_efetivo")
        .select("*")
        .order("imported_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const row = data[0] as unknown as RHEfetivoRow;
        return {
          colaboradores: row.colaboradores as Colaborador[],
          deletedIds: (row.deleted_ids || []) as number[],
          hasImported: true,
          rowId: row.id,
        };
      }

      // No DB data — use hardcoded initial data
      return {
        colaboradores: initialColaboradores,
        deletedIds: [] as number[],
        hasImported: false,
        rowId: null as string | null,
      };
    },
  });

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
        const { error } = await supabase.from("rh_efetivo").insert({
          colaboradores: colaboradores as any,
          deleted_ids: deletedIds as any,
          imported_by: "system",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rh-efetivo"] });
    },
  });

  return { ...query, saveMutation };
};
