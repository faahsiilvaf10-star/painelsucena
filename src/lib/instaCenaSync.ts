// Helper para enviar mudanças do InstaCena ao projeto parceiro
import { supabase } from "@/integrations/supabase/client";

type SyncEntity = "post" | "comment" | "reaction";
type SyncAction = "upsert" | "delete";

interface SyncEvent {
  entity: SyncEntity;
  action: SyncAction;
  payload: Record<string, unknown>;
}

/**
 * Envia evento(s) de sincronização para o projeto parceiro via edge function.
 * Falhas são logadas mas não interrompem o fluxo do usuário (best-effort).
 */
export async function syncToPartner(events: SyncEvent | SyncEvent[]): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("instacena-sync-publisher", {
      body: events,
    });
    if (error) {
      console.warn("[InstaCenaSync] Falha ao sincronizar com parceiro:", error.message);
    }
  } catch (err) {
    console.warn("[InstaCenaSync] Erro inesperado:", err);
  }
}
