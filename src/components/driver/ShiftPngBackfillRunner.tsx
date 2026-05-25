import { useShiftPngBackfill } from "@/hooks/useShiftPngBackfill";

/**
 * Componente invisível: garante que toda Parte Diária finalizada hoje
 * seja enviada ao grupo de WhatsApp com o PNG padrão, mesmo se o motorista
 * não passou pelo fluxo completo (queda de rede, app fechado, mudança via admin).
 */
export function ShiftPngBackfillRunner() {
  useShiftPngBackfill(true);
  return null;
}
