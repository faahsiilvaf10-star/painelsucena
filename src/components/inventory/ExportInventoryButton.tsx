import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem } from "@/hooks/useInventory";

interface ExportInventoryButtonProps {
  items: InventoryItem[];
}

const getCategoryLabel = (category: string) => {
  const categories: Record<string, string> = {
    epi: "EPI",
    ferramentas: "Ferramentas",
    materiais: "Materiais",
    escritorio: "Escritório",
    limpeza: "Limpeza",
    geral: "Geral",
  };
  return categories[category] || category;
};

export function ExportInventoryButton({ items }: ExportInventoryButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Nome",
        "Categoria",
        "Quantidade",
        "Unidade",
        "Quantidade Mínima",
        "Local",
        "CA",
        "Validade CA",
        "Status Estoque",
        "Observações",
      ];

      const rows = items.map((item) => {
        const isLowStock = item.quantity <= item.min_quantity;
        const stockStatus = isLowStock ? "Baixo" : "Normal";

        return [
          item.name,
          getCategoryLabel(item.category),
          item.quantity.toString(),
          item.unit,
          item.min_quantity.toString(),
          item.storage_locations?.name || "-",
          item.ca_number || "-",
          item.ca_expiry ? format(new Date(item.ca_expiry), "dd/MM/yyyy") : "-",
          stockStatus,
          item.notes || "-",
        ];
      });

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `estoque_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: "O arquivo CSV foi gerado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToHTML = () => {
    setIsExporting(true);
    try {
      const lowStockItems = items.filter((item) => item.quantity <= item.min_quantity);
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Estoque - ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .summary-card { background: #f8f9fa; padding: 15px 20px; border-radius: 8px; }
    .summary-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
    .summary-card p { margin: 0; font-size: 24px; font-weight: bold; }
    .low-stock { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f59e0b; color: white; }
    tr:nth-child(even) { background: #f8f9fa; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .badge-low { background: #fef2f2; color: #dc2626; }
    .badge-ok { background: #f0fdf4; color: #16a34a; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>📦 Relatório de Estoque</h1>
  <p>Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
  
  <div class="summary">
    <div class="summary-card">
      <h3>Total de Itens</h3>
      <p>${items.length}</p>
    </div>
    <div class="summary-card">
      <h3>Quantidade Total</h3>
      <p>${totalItems}</p>
    </div>
    <div class="summary-card">
      <h3>Itens com Estoque Baixo</h3>
      <p class="${lowStockItems.length > 0 ? 'low-stock' : ''}">${lowStockItems.length}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Nome</th>
        <th>Categoria</th>
        <th>Quantidade</th>
        <th>Mínimo</th>
        <th>Local</th>
        <th>CA</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map((item) => {
          const isLowStock = item.quantity <= item.min_quantity;
          return `
          <tr>
            <td>${item.name}</td>
            <td>${getCategoryLabel(item.category)}</td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${item.min_quantity}</td>
            <td>${item.storage_locations?.name || "-"}</td>
            <td>${item.ca_number || "-"}</td>
            <td><span class="badge ${isLowStock ? 'badge-low' : 'badge-ok'}">${isLowStock ? "Baixo" : "OK"}</span></td>
          </tr>
        `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <p>Relatório gerado automaticamente pelo Sistema de Gestão</p>
  </div>
</body>
</html>
      `.trim();

      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_estoque_${format(new Date(), "yyyy-MM-dd_HH-mm")}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: "O relatório HTML foi gerado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || items.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToHTML}>
          <Download className="h-4 w-4 mr-2" />
          Relatório HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
