import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import type { Colaborador } from "@/data/efetivoData";

interface ImportEfetivoExcelButtonProps {
  colaboradores: Colaborador[];
  onImport: (updated: Colaborador[]) => void;
}

const normalizeText = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");

export function ImportEfetivoExcelButton({ colaboradores, onImport }: ImportEfetivoExcelButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    setIsImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast.error("Planilha vazia ou inválida");
        setIsImporting(false);
        return;
      }

      // Try to detect header row by looking for common column names
      let headerRowIndex = 1;
      const headerKeywords = ["nome", "funcao", "função", "cpf", "matricula", "matrícula"];

      for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
        const row = worksheet.getRow(i);
        const rowValues = row.values as (string | undefined)[];
        const rowText = rowValues
          .filter(Boolean)
          .map((v) => normalizeText(String(v)))
          .join(" ");
        if (headerKeywords.some((kw) => rowText.includes(normalizeText(kw)))) {
          headerRowIndex = i;
          break;
        }
      }

      // Map header columns
      const headerRow = worksheet.getRow(headerRowIndex);
      const colMap: Record<string, number> = {};
      headerRow.eachCell((cell, colNumber) => {
        const val = normalizeText(String(cell.value || ""));
        if (val.includes("NOME")) colMap.nome = colNumber;
        else if (val.includes("FUNCAO") || val.includes("FUNÇÃO") || val.includes("CARGO")) colMap.funcao = colNumber;
        else if (val.includes("CPF")) colMap.cpf = colNumber;
        else if (val.includes("NASCIMENTO")) colMap.dataNascimento = colNumber;
        else if (val.includes("ADMISSAO") || val.includes("ADMISSÃO")) colMap.admissao = colNumber;
        else if (val.includes("MATRICULA") || val.includes("MATRÍCULA")) colMap.matricula = colNumber;
        else if (val.includes("CONTATO") || val.includes("TELEFONE") || val.includes("CELULAR")) colMap.contato = colNumber;
        else if (val.includes("LOCALIDADE") || val.includes("CIDADE") || val.includes("LOCAL")) colMap.localidade = colNumber;
      });

      if (!colMap.nome) {
        toast.error("Coluna 'Nome' não encontrada na planilha. Verifique o cabeçalho.");
        setIsImporting(false);
        return;
      }

      const getCellString = (row: ExcelJS.Row, col: number | undefined): string => {
        if (!col) return "";
        const cell = row.getCell(col);
        if (!cell.value) return "";
        
        // Handle date values
        if (cell.value instanceof Date) {
          const d = cell.value;
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        }
        return String(cell.value).trim();
      };

      // Parse rows
      const importedEmployees: Omit<Colaborador, "id">[] = [];

      for (let i = headerRowIndex + 1; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const nome = getCellString(row, colMap.nome);
        if (!nome) continue; // Skip empty rows

        importedEmployees.push({
          nome,
          funcao: getCellString(row, colMap.funcao) || "AJUDANTE",
          cpf: getCellString(row, colMap.cpf),
          dataNascimento: getCellString(row, colMap.dataNascimento),
          admissao: getCellString(row, colMap.admissao),
          matricula: getCellString(row, colMap.matricula),
          contato: getCellString(row, colMap.contato),
          localidade: getCellString(row, colMap.localidade) || "BARCARENA - PA",
        });
      }

      if (importedEmployees.length === 0) {
        toast.error("Nenhum colaborador encontrado na planilha");
        setIsImporting(false);
        return;
      }

      // Build a map of existing employees by CPF and matricula for dedup
      const existingByCpf = new Map<string, number>();
      const existingByMatricula = new Map<string, number>();
      const existingByName = new Map<string, number>();

      colaboradores.forEach((c) => {
        if (c.cpf) existingByCpf.set(normalizeCpf(c.cpf), c.id);
        if (c.matricula) existingByMatricula.set(c.matricula.trim(), c.id);
        existingByName.set(normalizeText(c.nome), c.id);
      });

      let maxId = Math.max(...colaboradores.map((c) => c.id), 0);
      const updatedMap = new Map(colaboradores.map((c) => [c.id, { ...c }]));
      let addedCount = 0;
      let updatedCount = 0;

      for (const emp of importedEmployees) {
        // Check for existing by CPF, then matricula, then name
        let existingId: number | undefined;

        if (emp.cpf) {
          existingId = existingByCpf.get(normalizeCpf(emp.cpf));
        }
        if (existingId === undefined && emp.matricula) {
          existingId = existingByMatricula.get(emp.matricula.trim());
        }
        if (existingId === undefined) {
          existingId = existingByName.get(normalizeText(emp.nome));
        }

        if (existingId !== undefined) {
          // Update existing employee with new data (only non-empty fields)
          const existing = updatedMap.get(existingId)!;
          if (emp.funcao) existing.funcao = emp.funcao;
          if (emp.cpf) existing.cpf = emp.cpf;
          if (emp.dataNascimento) existing.dataNascimento = emp.dataNascimento;
          if (emp.admissao) existing.admissao = emp.admissao;
          if (emp.matricula) existing.matricula = emp.matricula;
          if (emp.contato) existing.contato = emp.contato;
          if (emp.localidade) existing.localidade = emp.localidade;
          updatedMap.set(existingId, existing);
          updatedCount++;
        } else {
          // Add new employee
          maxId++;
          const newEmp: Colaborador = { ...emp, id: maxId };
          updatedMap.set(maxId, newEmp);

          // Register for dedup in case of duplicates within the file
          if (emp.cpf) existingByCpf.set(normalizeCpf(emp.cpf), maxId);
          if (emp.matricula) existingByMatricula.set(emp.matricula.trim(), maxId);
          existingByName.set(normalizeText(emp.nome), maxId);
          addedCount++;
        }
      }

      const finalList = Array.from(updatedMap.values()).sort((a, b) => a.id - b.id);
      onImport(finalList);

      const parts = [];
      if (addedCount > 0) parts.push(`${addedCount} adicionado${addedCount > 1 ? "s" : ""}`);
      if (updatedCount > 0) parts.push(`${updatedCount} atualizado${updatedCount > 1 ? "s" : ""}`);
      toast.success(`Importação concluída: ${parts.join(", ")}`);
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error("Erro ao importar planilha. Verifique o formato do arquivo.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isImporting}
        className="gap-2"
        title="Importar planilha Excel"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Importar Excel</span>
      </Button>
    </>
  );
}
