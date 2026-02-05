import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, FileText, Trash2, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { toast } from "sonner";

interface OvertimeRecordData {
  id: string;
  user_id: string;
  user_name: string;
  cargo: string;
  record_date: string;
  entry_time: string;
  exit_time: string;
  is_overtime: boolean;
}

interface SavedRecordsCardProps {
  savedRecords: OvertimeRecordData[] | undefined;
  isLoadingRecords: boolean;
  canDeleteRecord: (recordUserId: string) => boolean;
  deleteRecord: {
    mutate: (id: string) => void;
    isPending: boolean;
  };
  periodStart?: string;
  periodEnd?: string;
}

const SavedRecordsCard = ({
  savedRecords,
  isLoadingRecords,
  canDeleteRecord,
  deleteRecord,
  periodStart,
  periodEnd,
}: SavedRecordsCardProps) => {
  // Calculate period info
  const periodInfo = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let startDate: Date;
    let endDate = now;

    // If we're before day 20, period starts from day 20 of previous month
    if (currentDay < 20) {
      if (currentMonth === 0) {
        startDate = new Date(currentYear - 1, 11, 20); // December 20 of previous year
      } else {
        startDate = new Date(currentYear, currentMonth - 1, 20);
      }
    } else {
      // We're on or after day 20, period starts from day 20 of current month
      startDate = new Date(currentYear, currentMonth, 20);
    }

    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
      startFormatted: format(startDate, "dd/MM/yyyy"),
      endFormatted: format(endDate, "dd/MM/yyyy"),
    };
  }, []);

  // Filter records for current period
  const periodRecords = useMemo(() => {
    if (!savedRecords) return [];
    
    return savedRecords.filter((record) => {
      return record.record_date >= periodInfo.start && record.record_date <= periodInfo.end;
    });
  }, [savedRecords, periodInfo]);

  // Calculate totals
  const totals = useMemo(() => {
    const overtimeRecords = periodRecords.filter((r) => r.is_overtime);
    return {
      total: periodRecords.length,
      overtime: overtimeRecords.length,
      normal: periodRecords.length - overtimeRecords.length,
    };
  }, [periodRecords]);

  const handleExportPdf = () => {
    if (periodRecords.length === 0) {
      toast.error("Nenhum registro no período para exportar");
      return;
    }

    const logoBase64 = getLogoBase64();
    const now = new Date();
    const reportDate = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    // Separate records into normal hours and overtime based on schedule rules
    const normalRecords: typeof periodRecords = [];
    const overtimeRecords: typeof periodRecords = [];

    periodRecords.forEach((record) => {
      const recordDate = new Date(record.record_date + "T00:00:00");
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

    const totalNormal = normalRecords.length;
    const totalOvertime = overtimeRecords.length;

    const renderTableRows = (recordList: typeof periodRecords, isOvertime: boolean) => {
      return recordList
        .map(
          (record) => `
            <tr class="${isOvertime ? "overtime-row" : ""}">
              <td>${format(new Date(record.record_date + "T00:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}</td>
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
        <title>Resumo de Hora Extra - Período Atual</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f59e0b; }
          .header img { height: 50px; }
          .header-text { text-align: right; }
          .header-text h1 { font-size: 20px; color: #333; }
          .header-text p { font-size: 12px; color: #666; }
          .period-info { background: #fef3c7; padding: 12px 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; font-weight: bold; text-align: center; }
          .summary-grid { display: flex; gap: 15px; margin-bottom: 25px; }
          .summary-item { flex: 1; background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
          .summary-item.overtime { background: #fef3c7; border: 2px solid #f59e0b; }
          .summary-item strong { font-size: 32px; display: block; margin-bottom: 5px; }
          .summary-item.overtime strong { color: #d97706; }
          .summary-item span { font-size: 12px; color: #666; }
          .section-title { margin-top: 25px; margin-bottom: 10px; padding: 10px 15px; border-radius: 6px; font-size: 14px; font-weight: bold; }
          .section-normal { background: #e0f2fe; color: #0369a1; }
          .section-overtime { background: #fef3c7; color: #92400e; }
          .schedule-info { font-size: 11px; font-weight: normal; margin-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
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
            <h1>Resumo de Hora Extra</h1>
            <p>Gerado em: ${reportDate}</p>
          </div>
        </div>

        <div class="period-info">
          📅 Período: ${periodInfo.startFormatted} até ${periodInfo.endFormatted}
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <strong>${totals.total}</strong>
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
          <h3>📊 Resumo Total do Período</h3>
          <div class="totals-grid">
            <div class="total-item">
              <div class="number">${totals.total}</div>
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

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Registros Salvos
            </CardTitle>
            <CardDescription>
              Histórico de registros de hora extra por data
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (periodRecords.length === 0) {
                  toast.error("Nenhum registro no per\u00edodo para compartilhar");
                  return;
                }
                let msg = "\u{1F4CB} *Registros - Per\u00EDodo Atual*\n";
                msg += "\u{1F4C5} " + periodInfo.startFormatted + " a " + periodInfo.endFormatted + "\n";
                msg += "\u{1F4CA} Total: " + totals.total + " | \u{23F1}\u{FE0F} HE: " + totals.overtime + "\n\n";
                periodRecords.forEach((r) => {
                  const dateStr = format(new Date(r.record_date + "T00:00:00"), "dd/MM (EEE)", { locale: ptBR });
                  const he = r.is_overtime ? " \u{23F1}\u{FE0F}" : "";
                  msg += "\u{1F468}\u{200D}\u{1F4BC} " + r.user_name + " - " + dateStr + "\n   " + r.entry_time.slice(0, 5) + " \u{27A1}\u{FE0F} " + r.exit_time.slice(0, 5) + he + "\n";
                });
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
              }}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF Per\u00edodo Atual
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingRecords ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : savedRecords && savedRecords.length > 0 ? (
          <>
            {/* Period Summary Banner */}
            <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Período atual: </span>
                  <span className="font-medium">
                    {periodInfo.startFormatted} - {periodInfo.endFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Total: <span className="font-bold text-foreground">{totals.total}</span>
                  </span>
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    ⏰ {totals.overtime} hora(s) extra(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.record_date + "T00:00:00"), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{record.user_name}</TableCell>
                      <TableCell className="capitalize">
                        {formatCargoLabel(record.cargo)}
                      </TableCell>
                      <TableCell>{record.entry_time.slice(0, 5)}</TableCell>
                      <TableCell>{record.exit_time.slice(0, 5)}</TableCell>
                      <TableCell>
                        {record.is_overtime ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600">
                            ⏰ Hora Extra
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canDeleteRecord(record.user_id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRecord.mutate(record.id)}
                            disabled={deleteRecord.isPending}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum registro encontrado. Adicione seus registros acima.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SavedRecordsCard;
