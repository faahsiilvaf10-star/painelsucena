import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem, StorageLocation } from "@/hooks/useInventory";

interface ExportInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  locations: StorageLocation[];
}

const CATEGORY_LABELS: Record<string, string> = {
  epi: "EPI",
  ferramentas: "Ferramentas",
  materiais: "Materiais",
  escritorio: "Escritório",
  limpeza: "Limpeza",
  geral: "Geral",
};

export function ExportInventoryDialog({ 
  open, 
  onOpenChange, 
  items, 
  locations 
}: ExportInventoryDialogProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "txt">("csv");
  const { toast } = useToast();

  const generateCSV = () => {
    const headers = [
      "Nome",
      "Categoria",
      "Quantidade",
      "Qtd Mínima",
      "Unidade",
      "Local",
      "Número CA",
      "Validade CA",
      "Observações",
    ];

    const rows = items.map((item) => [
      item.name,
      CATEGORY_LABELS[item.category] || item.category,
      item.quantity.toString(),
      item.min_quantity.toString(),
      item.unit,
      item.storage_locations?.name || "-",
      item.ca_number || "-",
      item.ca_expiry ? format(new Date(item.ca_expiry), "dd/MM/yyyy") : "-",
      item.notes || "-",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    return csvContent;
  };

  const generateTXT = () => {
    const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    let content = `RELATÓRIO DE ESTOQUE DE MATERIAIS\n`;
    content += `Gerado em: ${now}\n`;
    content += `${"=".repeat(60)}\n\n`;

    // Summary
    const lowStock = items.filter((i) => i.quantity <= i.min_quantity).length;
    content += `RESUMO:\n`;
    content += `- Total de itens: ${items.length}\n`;
    content += `- Itens com estoque baixo: ${lowStock}\n`;
    content += `- Categorias: ${new Set(items.map((i) => i.category)).size}\n\n`;

    // Group by location
    const byLocation: Record<string, InventoryItem[]> = {};
    locations.forEach((loc) => {
      byLocation[loc.name] = items.filter((i) => i.location_id === loc.id);
    });
    byLocation["Sem Local Definido"] = items.filter((i) => !i.location_id);

    Object.entries(byLocation).forEach(([locName, locItems]) => {
      if (locItems.length === 0) return;

      content += `${"─".repeat(60)}\n`;
      content += `📍 ${locName.toUpperCase()} (${locItems.length} itens)\n`;
      content += `${"─".repeat(60)}\n\n`;

      locItems.forEach((item) => {
        const status = item.quantity <= item.min_quantity ? "⚠️ BAIXO" : "✓";
        content += `• ${item.name}\n`;
        content += `  Categoria: ${CATEGORY_LABELS[item.category] || item.category}\n`;
        content += `  Quantidade: ${item.quantity} ${item.unit} (mín: ${item.min_quantity}) ${status}\n`;
        if (item.ca_number) {
          content += `  CA: ${item.ca_number}`;
          if (item.ca_expiry) {
            content += ` (val: ${format(new Date(item.ca_expiry), "dd/MM/yyyy")})`;
          }
          content += `\n`;
        }
        if (item.notes) {
          content += `  Obs: ${item.notes}\n`;
        }
        content += `\n`;
      });
    });

    content += `${"=".repeat(60)}\n`;
    content += `Fim do relatório\n`;

    return content;
  };

  const handleExport = () => {
    try {
      const content = exportFormat === "csv" ? generateCSV() : generateTXT();
      const fileName = `estoque_${format(new Date(), "yyyy-MM-dd_HHmm")}.${exportFormat}`;
      const mimeType = exportFormat === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8";

      const blob = new Blob(["\ufeff" + content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Relatório exportado",
        description: `Arquivo ${fileName} baixado com sucesso.`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Relatório de Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione o formato do relatório:
            </p>

            <RadioGroup
              value={exportFormat}
              onValueChange={(v) => setExportFormat(v as "csv" | "txt")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileSpreadsheet className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">CSV (Excel)</p>
                    <p className="text-xs text-muted-foreground">
                      Formato de planilha, ideal para análises
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">TXT (Texto)</p>
                    <p className="text-xs text-muted-foreground">
                      Relatório formatado, ideal para impressão
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">O relatório incluirá:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• {items.length} itens no estoque</li>
              <li>• {locations.length} locais de armazenamento</li>
              <li>• Informações de CA e validade</li>
              <li>• Alertas de estoque baixo</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
