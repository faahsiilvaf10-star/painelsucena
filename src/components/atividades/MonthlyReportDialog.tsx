import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Calendar, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MonthlyReportDialogProps {
  reports: any[];
  type: "jardinagem" | "gabiao";
  formatReportPreview: (report: any) => string;
  getLocationLabel: (report: any) => string;
}

export default function MonthlyReportDialog({ 
  reports, 
  type, 
  formatReportPreview,
  getLocationLabel 
}: MonthlyReportDialogProps) {
  const [filterMonth, setFilterMonth] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [filterType, setFilterType] = useState<"month" | "range">("month");

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return months;
  }, []);

  // Filter reports based on selected filter type
  const filteredReports = useMemo(() => {
    if (!reports) return [];

    if (filterType === "month") {
      const monthStart = startOfMonth(filterMonth);
      const monthEnd = endOfMonth(filterMonth);
      return reports.filter((report) => {
        const reportDate = parseISO(report.report_date);
        return isWithinInterval(reportDate, { start: monthStart, end: monthEnd });
      });
    } else if (filterType === "range" && dateRange.from && dateRange.to) {
      return reports.filter((report) => {
        const reportDate = parseISO(report.report_date);
        return isWithinInterval(reportDate, { start: dateRange.from!, end: dateRange.to! });
      });
    }

    return reports;
  }, [reports, filterType, filterMonth, dateRange]);

  // Sort by date descending
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) => 
      new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
    );
  }, [filteredReports]);

  const handleMonthChange = (value: string) => {
    const [year, month] = value.split("-");
    setFilterMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
  };

  const colorClass = type === "jardinagem" ? "text-green-500" : "text-orange-500";
  const bgClass = type === "jardinagem" ? "bg-green-600/20" : "bg-orange-600/20";
  const title = type === "jardinagem" ? "Relatório Mensal - Jardinagem" : "Relatório Mensal - Gabião";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Relatório Mensal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", bgClass)}>
              <FileText className={cn("h-4 w-4", colorClass)} />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end pb-4 border-b">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo de Filtro</Label>
            <Select value={filterType} onValueChange={(v: "month" | "range") => setFilterType(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Por Mês</SelectItem>
                <SelectItem value="range">Por Período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "month" ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select 
                value={format(filterMonth, "yyyy-MM")} 
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <Badge variant="secondary" className="h-9 px-3">
            {sortedReports.length} registro{sortedReports.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Report List */}
        <ScrollArea className="h-[400px] pr-4">
          {sortedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Nenhum registro encontrado para o período selecionado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold">
                        {format(parseISO(report.report_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getLocationLabel(report)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {format(parseISO(report.report_date), "dd/MM/yyyy")}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line border-t pt-2 mt-2">
                    {formatReportPreview(report)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}