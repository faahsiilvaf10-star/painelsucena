// @ts-nocheck
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
import { downloadPdfFromHtml } from "@/lib/pdfDownload";

type FilterType = "all" | "month" | "week" | "folha";

const OvertimeHistoryDialog = () => {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedCargo, setSelectedCargo] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = current week, 1 = last week, etc.
  const [selectedFolha, setSelectedFolha] = useState<number>(0); // 0 = current folha period

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

  // Calculate folha period dates (day 20 to day 20)
  const folhaDates = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate how many periods back we need to go
    let targetMonth = currentMonth;
    let targetYear = currentYear;
    
    // If we're before day 20, the current period started last month
    if (currentDay < 20) {
      targetMonth -= 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
    }

    // Apply the selectedFolha offset (going back in periods)
    for (let i = 0; i < selectedFolha; i++) {
      targetMonth -= 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
    }

    const startDate = new Date(targetYear, targetMonth, 20);
    const endMonth = targetMonth + 1;
    const endYear = endMonth > 11 ? targetYear + 1 : targetYear;
    const endDate = new Date(endYear, endMonth > 11 ? 0 : endMonth, 20);

    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
      label: `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`,
      startFormatted: format(startDate, "dd/MM/yyyy"),
      endFormatted: format(endDate, "dd/MM/yyyy"),
    };
  }, [selectedFolha]);

  // Generate folha options (last 12 periods)
  const folhaOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentDay = now.getDate();
    
    for (let i = 0; i < 12; i++) {
      let targetMonth = now.getMonth();
      let targetYear = now.getFullYear();
      
      if (currentDay < 20) {
        targetMonth -= 1;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear -= 1;
        }
      }
      
      for (let j = 0; j < i; j++) {
        targetMonth -= 1;
        if (targetMonth < 0) {
          targetMonth = 11;
          targetYear -= 1;
        }
      }

      const startDate = new Date(targetYear, targetMonth, 20);
      const endMonth = targetMonth + 1;
      const endYear = endMonth > 11 ? targetYear + 1 : targetYear;
      const endDate = new Date(endYear, endMonth > 11 ? 0 : endMonth, 20);

      options.push({
        value: i,
        label: i === 0 
          ? `Folha atual (${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM/yyyy")})`
          : `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`,
      });
    }
    return options;
  }, []);

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
    } else if (filterType === "folha") {
      f.weekStart = folhaDates.start;
      f.weekEnd = folhaDates.end;
    }

    return f;
  }, [selectedCargo, filterType, selectedMonth, weekDates, folhaDates]);

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
                  <SelectItem value="folha">Por Folha (dia 20)</SelectItem>
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

            {filterType === "folha" && (
              <div className="space-y-2">
                <Label>Período da Folha</Label>
                <Select
                  value={selectedFolha.toString()}
                  onValueChange={(v) => setSelectedFolha(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {folhaOptions.map((option) => (
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

  async function handleExportPdf() {
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
    } else if (filterType === "folha") {
      filterDescription = `Folha: ${folhaDates.label}`;
    }
    if (selectedCargo !== "all") {
      filterDescription += ` | Cargo: ${formatCargoLabel(selectedCargo)}`;
    }

    // Separate records into normal hours and overtime based on schedule rules
    const normalRecords: typeof records = [];
    const overtimeRecords: typeof records = [];

    records.forEach((record) => {
      const recordDate = parseISO(record.record_date);
      const dayOfWeek = recordDate.getDay(); // 0 = Sunday, 6 = Saturday
      const exitTime = record.exit_time.slice(0, 5);

      // Saturday (6) and Sunday (0) = all overtime
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        overtimeRecords.push(record);
      } else if (dayOfWeek === 5) {
        // Friday: normal until 16:00, overtime after
        if (exitTime > "16:00") {
          overtimeRecords.push(record);
        } else {
          normalRecords.push(record);
        }
      } else {
        // Monday to Thursday: normal until 17:00, overtime after
        if (exitTime > "17:00") {
          overtimeRecords.push(record);
        } else {
          normalRecords.push(record);
        }
      }
    });

    const totalRecords = records.length;
    const totalOvertime = overtimeRecords.length;
    const totalNormal = normalRecords.length;

    const renderTableRows = (recordList: typeof records, isOvertime: boolean) => {
      return recordList
        .map(
          (record) => `
            <tr class="${isOvertime ? "overtime-row" : ""}">
              <td>${format(parseISO(record.record_date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}</td>
              <td>${record.user_name}</td>
              <td>${formatCargoLabel(record.cargo)}</td>
              <td>${record.entry_time.slice(0, 5)}</td>
              <td>${record.exit_time.slice(0, 5)}</td>
            </tr>
          `
        )
        .join("");
    };

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
          .summary-item.overtime { background: #fef3c7; border: 2px solid #f59e0b; }
          .summary-item strong { font-size: 24px; display: block; }
          .summary-item span { font-size: 12px; color: #666; }
          .section-title { margin-top: 25px; margin-bottom: 10px; padding: 10px 15px; border-radius: 6px; font-size: 14px; font-weight: bold; }
          .section-normal { background: #e0f2fe; color: #0369a1; }
          .section-overtime { background: #fef3c7; color: #92400e; }
          .schedule-info { font-size: 11px; font-weight: normal; margin-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th.normal { background-color: #0369a1; color: white; font-weight: bold; }
          th.overtime { background-color: #f59e0b; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .overtime-row { background-color: #fef3c7 !important; }
          .empty-section { text-align: center; padding: 20px; color: #666; font-style: italic; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #666; }
          .totals-section { margin-top: 25px; padding: 15px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border: 2px solid #f59e0b; }
          .totals-section h3 { font-size: 16px; margin-bottom: 10px; color: #92400e; text-align: center; }
          .totals-grid { display: flex; gap: 20px; justify-content: center; }
          .total-item { text-align: center; }
          .total-item .number { font-size: 28px; font-weight: bold; color: #92400e; }
          .total-item .label { font-size: 11px; color: #78350f; }
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
          <div class="summary-item">
            <strong>${totalNormal}</strong>
            <span>Horário Normal</span>
          </div>
          <div class="summary-item overtime">
            <strong>${totalOvertime}</strong>
            <span>⏰ Horas Extras</span>
          </div>
        </div>

        <!-- Normal Hours Section -->
        <div class="section-title section-normal">
          📋 Horário Normal
          <span class="schedule-info">(Seg-Qui: 07:00-17:00 | Sex: 07:00-16:00)</span>
        </div>
        ${normalRecords.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th class="normal">Data</th>
                <th class="normal">Funcionário</th>
                <th class="normal">Cargo</th>
                <th class="normal">Entrada</th>
                <th class="normal">Saída</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(normalRecords, false)}
            </tbody>
          </table>
        ` : `<div class="empty-section">Nenhum registro de horário normal no período</div>`}

        <!-- Overtime Section -->
        <div class="section-title section-overtime">
          ⏰ Hora Extra
          <span class="schedule-info">(Seg-Qui: após 17:00 | Sex: após 16:00 | Sáb/Dom: integral)</span>
        </div>
        ${overtimeRecords.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th class="overtime">Data</th>
                <th class="overtime">Funcionário</th>
                <th class="overtime">Cargo</th>
                <th class="overtime">Entrada</th>
                <th class="overtime">Saída</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(overtimeRecords, true)}
            </tbody>
          </table>
        ` : `<div class="empty-section">Nenhum registro de hora extra no período</div>`}

        <!-- Totals -->
        <div class="totals-section">
          <h3>📊 Resumo Total</h3>
          <div class="totals-grid">
            <div class="total-item">
              <div class="number">${totalRecords}</div>
              <div class="label">Registros</div>
            </div>
            <div class="total-item">
              <div class="number">${totalNormal}</div>
              <div class="label">Normal</div>
            </div>
            <div class="total-item">
              <div class="number">${totalOvertime}</div>
              <div class="label">Horas Extras</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Sistema de Gestão - Relatório gerado automaticamente</p>
        </div>
      </body>
      </html>
    `;

    await downloadPdfFromHtml(printContent, `historico-horas-extras-${new Date().toISOString().slice(0,10)}.pdf`);
  }
};

export default OvertimeHistoryDialog;
