import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Colaborador } from "@/data/efetivoData";

interface ExportEfetivoExcelButtonProps {
  colaboradores: Colaborador[];
  filterFuncao?: string;
}

export function ExportEfetivoExcelButton({ colaboradores, filterFuncao }: ExportEfetivoExcelButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = () => {
    if (colaboradores.length === 0) {
      toast.error("Nenhum colaborador para exportar");
      return;
    }

    setIsGenerating(true);

    try {
      // Build CSV content
      const headers = [
        "Nome",
        "Função",
        "Matrícula",
        "CPF",
        "Admissão",
        "Nascimento",
        "Contato",
        "Localidade",
      ];

      const rows = colaboradores.map((c) => [
        c.nome,
        c.funcao,
        c.matricula,
        c.cpf,
        c.admissao,
        c.dataNascimento,
        c.contato || "",
        c.localidade,
      ]);

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");

      // Add BOM for Excel to recognize UTF-8
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const filterLabel = filterFuncao && filterFuncao !== "all" ? `-${filterFuncao}` : "";
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `efetivo${filterLabel}-${dateStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Erro ao gerar Excel");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      variant="outline"
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      Exportar Excel
    </Button>
  );
}
