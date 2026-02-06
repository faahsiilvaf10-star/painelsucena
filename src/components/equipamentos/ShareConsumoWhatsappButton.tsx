import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DailyRecord {
  formattedDate: string;
  vehicleName: string;
  plate: string;
  point: string;
  liters: number;
}

interface RefuelingByPoint {
  point: string;
  count: number;
  liters: number;
}

interface RefuelingByVehicle {
  vehicleName: string;
  count: number;
  liters: number;
}

interface ShareConsumoWhatsappButtonProps {
  selectedMonth: number;
  selectedYear: number;
  selectedDay: number | null;
  selectedVehicleName: string;
  dailyRecords: DailyRecord[];
  refuelingByPoint: RefuelingByPoint[];
  refuelingByVehicle: RefuelingByVehicle[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ShareConsumoWhatsappButton({
  selectedMonth,
  selectedYear,
  selectedDay,
  selectedVehicleName,
  dailyRecords,
  refuelingByPoint,
  refuelingByVehicle,
}: ShareConsumoWhatsappButtonProps) {
  const handleShare = () => {
    if (dailyRecords.length === 0) {
      toast.error("Nenhum dado para compartilhar");
      return;
    }

    // Build filter description
    let filterDescription = `${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;
    if (selectedDay) {
      filterDescription = `${selectedDay} de ${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;
    }
    if (selectedVehicleName !== "Todos os Veículos") {
      filterDescription += ` - ${selectedVehicleName}`;
    }

    // Calculate totals
    const totalAbastecimentos = dailyRecords.length;
    const totalLitros = dailyRecords.reduce((acc, r) => acc + r.liters, 0);
    const mediaLitros = totalAbastecimentos > 0 ? Math.round(totalLitros / totalAbastecimentos) : 0;

    // Build message with WhatsApp compatible UTF-16 surrogate pairs
    let message = `\uD83D\uDCCA *RELAT\u00D3RIO DE ABASTECIMENTOS DE \u00C1GUA*\n`;
    message += `\uD83D\uDCC5 Per\u00EDodo: ${filterDescription}\n\n`;
    
    message += `\uD83D\uDCC8 *RESUMO GERAL*\n`;
    message += `\u2022 Total de Abastecimentos: ${totalAbastecimentos}\n`;
    message += `\u2022 Volume Total: ${totalLitros.toLocaleString("pt-BR")} L\n`;
    message += `\u2022 M\u00E9dia por Abastecimento: ${mediaLitros.toLocaleString("pt-BR")} L\n\n`;

    // Points summary
    if (refuelingByPoint.length > 0) {
      message += `\uD83D\uDEB0 *ABASTECIMENTOS POR PONTO*\n`;
      refuelingByPoint.forEach(p => {
        message += `\u2022 ${p.point}: ${p.count} abast. (${p.liters.toLocaleString("pt-BR")} L)\n`;
      });
      message += `\n`;
    }

    // Vehicle summary
    if (refuelingByVehicle.length > 0) {
      message += `\uD83D\uDE9B *CONSUMO POR VE\u00CDCULO*\n`;
      refuelingByVehicle.forEach(v => {
        message += `\u2022 ${v.vehicleName}: ${v.count} abast. (${v.liters.toLocaleString("pt-BR")} L)\n`;
      });
      message += `\n`;
    }

    // Daily details (limit to last 10 records to avoid too long message)
    const recentRecords = dailyRecords.slice(-10);
    if (recentRecords.length > 0) {
      message += `\uD83D\uDCCB *\u00DALTIMOS REGISTROS*\n`;
      recentRecords.forEach(r => {
        message += `\u2022 ${r.formattedDate} - ${r.vehicleName} @ ${r.point}: ${r.liters.toLocaleString("pt-BR")} L\n`;
      });
      if (dailyRecords.length > 10) {
        message += `... e mais ${dailyRecords.length - 10} registros\n`;
      }
    }

    message += `\n_Sucena Empreendimentos_`;

    // Encode and open WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Abrindo WhatsApp...");
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="icon"
      className="bg-[#25D366] border-[#25D366] text-white hover:bg-[#128C7E] hover:border-[#128C7E]"
      title="Compartilhar via WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  );
}
