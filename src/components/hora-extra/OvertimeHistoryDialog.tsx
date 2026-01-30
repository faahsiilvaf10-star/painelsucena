import { useState, useMemo, useRef } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Filter, Trash2, Calendar, Clock, User, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOvertimeRecords,
  useDeleteOvertimeRecord,
  useDistinctCargos,
} from "@/hooks/useOvertimeRecords";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";

type FilterType = "all" | "month" | "week";

const OvertimeHistoryDialog = () => {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedCargo, setSelectedCargo] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = current week, 1 = last week, etc.

  const { data: distinctCargos, isLoading: cargosLoading } = useDistinctCargos();
  const deleteRecord = useDeleteOvertimeRecord();

  // Calculate week dates
  const weekDates = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(subWeeks(now, selectedWeek), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, selectedWeek), { weekStartsOn: 1 });
    return {
      start: format(weekStart, "yyyy-MM-dd"),
      end: format(weekEnd, "yyyy-MM-dd"),
      label: `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM/yyyy")}`,
    };
  }, [selectedWeek]);

  // Build filters
  const filters = useMemo(() => {
    const f: {
      cargo?: string;
      month?: string;
      weekStart?: string;
      weekEnd?: string;
    } = {};

    if (selectedCargo !== "all") {
      f.cargo = selectedCargo;
    }

    if (filterType === "month") {
      f.month = selectedMonth;
    } else if (filterType === "week") {
      f.weekStart = weekDates.start;
      f.weekEnd = weekDates.end;
    }

    return f;
  }, [selectedCargo, filterType, selectedMonth, weekDates]);

  const { data: records, isLoading } = useOvertimeRecords(filters);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Generate week options (last 8 weeks)
  const weekOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      options.push({
        value: i,
        label:
          i === 0
            ? `Semana atual (${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")})`
            : `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM/yyyy")}`,
      });
    }
    return options;
  }, []);

  // Group records by date
  const groupedRecords = useMemo(() => {
    if (!records) return {};
    return records.reduce(
      (acc, record) => {
        const date = record.record_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(record);
        return acc;
      },
      {} as Record<string, typeof records>
    );
  }, [records]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History className="h-4 w-4 mr-2" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Hora Extra
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-4 border-b pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtros
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cargo Filter */}
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  {!cargosLoading &&
                    distinctCargos?.map((cargo) => (
                      <SelectItem key={cargo} value={cargo}>
                        {formatCargoLabel(cargo)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Type Filter */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as FilterType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="month">Por Mês</SelectItem>
                  <SelectItem value="week">Por Semana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month or Week Selector */}
            {filterType === "month" && (
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === "week" && (
              <div className="space-y-2">
                <Label>Semana</Label>
                <Select
                  value={selectedWeek.toString()}
                  onValueChange={(v) => setSelectedWeek(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Records List */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !records || records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRecords).map(([date, dateRecords]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </div>

                  {dateRecords.map((record) => (
                    <div
                      key={record.id}
                      className={cn(
                        "p-4 rounded-lg border flex items-center justify-between gap-4",
                        record.is_overtime
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-border"
                      )}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{record.user_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {formatCargoLabel(record.cargo)}
                          </Badge>
                          {record.is_overtime && (
                            <Badge className="bg-amber-500 text-white">
                              Hora Extra
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Entrada: {record.entry_time.slice(0, 5)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Saída: {record.exit_time.slice(0, 5)}
                          </span>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O registro será
                              permanentemente excluído.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRecord.mutate(record.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Summary */}
        {records && records.length > 0 && (
          <div className="border-t pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Total: {records.length} registro(s)
              </span>
              <span className="text-amber-500 font-medium">
                {records.filter((r) => r.is_overtime).length} hora(s) extra(s)
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportPdf()}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function handleExportPdf() {
    if (!records || records.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }

    const logoBase64 = getLogoBase64();
    const now = new Date();
    const reportDate = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    let filterDescription = "Todos os registros";
    if (filterType === "month") {
      filterDescription = `Mês: ${format(parseISO(`${selectedMonth}-01`), "MMMM yyyy", { locale: ptBR })}`;
    } else if (filterType === "week") {
      filterDescription = `Semana: ${weekDates.label}`;
    }
    if (selectedCargo !== "all") {
      filterDescription += ` | Cargo: ${formatCargoLabel(selectedCargo)}`;
    }

    const totalRecords = records.length;
    const overtimeRecords = records.filter((r) => r.is_overtime).length;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Hora Extra</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f59e0b; }
          .header img { height: 50px; }
          .header-text { text-align: right; }
          .header-text h1 { font-size: 20px; color: #333; }
          .header-text p { font-size: 12px; color: #666; }
          .filter-info { background: #fef3c7; padding: 10px 15px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-item { background: #f3f4f6; padding: 10px 15px; border-radius: 6px; flex: 1; text-align: center; }
          .summary-item.overtime { background: #fef3c7; }
          .summary-item strong { font-size: 24px; display: block; }
          .summary-item span { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f59e0b; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .overtime-row { background-color: #fef3c7 !important; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
          .badge-overtime { background: #f59e0b; color: white; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #666; }
          @media print {
            body { padding: 10px; }
            .header { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoBase64}" alt="Logo" />
          <div class="header-text">
            <h1>Relatório de Hora Extra</h1>
            <p>Gerado em: ${reportDate}</p>
          </div>
        </div>

        <div class="filter-info">
          <strong>Filtros aplicados:</strong> ${filterDescription}
        </div>

        <div class="summary">
          <div class="summary-item">
            <strong>${totalRecords}</strong>
            <span>Total de Registros</span>
          </div>
          <div class="summary-item overtime">
            <strong>${overtimeRecords}</strong>
            <span>Horas Extras</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Funcionário</th>
              <th>Cargo</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${records
              .map(
                (record) => `
              <tr class="${record.is_overtime ? "overtime-row" : ""}">
                <td>${format(parseISO(record.record_date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}</td>
                <td>${record.user_name}</td>
                <td>${formatCargoLabel(record.cargo)}</td>
                <td>${record.entry_time.slice(0, 5)}</td>
                <td>${record.exit_time.slice(0, 5)}</td>
                <td>${record.is_overtime ? '<span class="badge badge-overtime">Hora Extra</span>' : "Regular"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>Sistema de Gestão - Relatório gerado automaticamente</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
};

export default OvertimeHistoryDialog;
