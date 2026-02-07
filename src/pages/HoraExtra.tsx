import { useState, useMemo } from "react";
import { format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Save, Send, Plus, Trash2, Calculator, RefreshCw, FileText, MessageCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useCreateOvertimeRecords, useOvertimeRecords, useDeleteOvertimeRecord } from "@/hooks/useOvertimeRecords";
import OvertimeHistoryDialog from "@/components/hora-extra/OvertimeHistoryDialog";
import SavedRecordsCard from "@/components/hora-extra/SavedRecordsCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useCurrentPeriodSummaries, useCalculateOvertimeSummary } from "@/hooks/useOvertimeSummaries";
import { useQueryClient } from "@tanstack/react-query";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { formatCargoLabel } from "@/lib/cargoUtils";

interface OvertimeRecord {
  id: string;
  date: Date | undefined;
  entryTime: string;
  exitTime: string;
}

const HoraExtra = () => {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const createRecords = useCreateOvertimeRecords();
  const deleteRecord = useDeleteOvertimeRecord();
  const { data: savedRecords, isLoading: isLoadingRecords } = useOvertimeRecords();
  const { data: summaryData, isLoading: isLoadingSummaries } = useCurrentPeriodSummaries();
  const { calculateSummary } = useCalculateOvertimeSummary();
  const [records, setRecords] = useState<OvertimeRecord[]>([
    { id: crypto.randomUUID(), date: undefined, entryTime: "", exitTime: "" }
  ]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Check if user can delete a specific record (only own records or admin)
  const canDeleteRecord = (recordUserId: string) => {
    return user?.id === recordUserId || isAdmin;
  };

  // Handle manual calculation of summaries
  const handleCalculateSummary = async () => {
    setIsCalculating(true);
    try {
      await calculateSummary();
      queryClient.invalidateQueries({ queryKey: ["overtime-summaries-current"] });
      toast.success("Resumo calculado com sucesso!");
    } catch (error) {
      console.error("Error calculating summary:", error);
      toast.error("Erro ao calcular resumo");
    } finally {
      setIsCalculating(false);
    }
  };

  const addRecord = () => {
    setRecords([
      ...records,
      { id: crypto.randomUUID(), date: undefined, entryTime: "", exitTime: "" }
    ]);
  };

  const removeRecord = (id: string) => {
    if (records.length > 1) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const updateRecord = (id: string, field: keyof OvertimeRecord, value: any) => {
    setRecords(records.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  // Check if time is overtime:
  // - Monday to Thursday: after 17:00
  // - Friday: after 16:00
  // - Saturday and Sunday: any time
  const isOvertimeTime = (date: Date | undefined, time: string): boolean => {
    if (!date || !time) return false;
    
    const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Saturday (6) or Sunday (0) - any time is overtime
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }
    
    const [hours] = time.split(":").map(Number);
    
    // Friday (5) - after 16:00
    if (dayOfWeek === 5) {
      return hours >= 16;
    }
    
    // Monday to Thursday (1-4) - after 17:00
    return hours >= 17;
  };

  const formatRecordsForMessage = () => {
    const validRecords = records.filter(r => r.date && r.entryTime && r.exitTime);
    
    if (validRecords.length === 0) {
      return null;
    }

    let message = `*Registro de Hora Extra*\n`;
    message += `*Funcionário:* ${profile?.full_name || "Não identificado"}\n\n`;
    
    validRecords.forEach((record, index) => {
      const formattedDate = record.date 
        ? format(record.date, "dd/MM/yyyy (EEEE)", { locale: ptBR })
        : "";
      const hasOvertime = isOvertimeTime(record.date, record.exitTime);
      
      message += `\uD83D\uDCC5 *Registro ${index + 1}*\n`;
      message += `Data: ${formattedDate}\n`;
      message += `Entrada: ${record.entryTime}\n`;
      message += `Saída: ${record.exitTime}${hasOvertime ? " \u23F0 (Hora Extra)" : ""}\n\n`;
    });

    return message;
  };

  const handleSave = async () => {
    const validRecords = records.filter(r => r.date && r.entryTime && r.exitTime);
    
    if (validRecords.length === 0) {
      toast.error("Preencha pelo menos um registro completo");
      return;
    }

    if (!user || !profile) {
      toast.error("Você precisa estar logado para salvar registros");
      return;
    }

    const recordsToSave = validRecords.map(record => ({
      user_id: user.id,
      user_name: profile.full_name,
      cargo: profile.cargo,
      record_date: format(record.date!, "yyyy-MM-dd"),
      entry_time: record.entryTime,
      exit_time: record.exitTime,
      is_overtime: isOvertimeTime(record.date, record.exitTime),
    }));

    createRecords.mutate(recordsToSave, {
      onSuccess: () => {
        // Reset form after save
        setRecords([{ id: crypto.randomUUID(), date: undefined, entryTime: "", exitTime: "" }]);
      },
    });
  };

  const handleSendWhatsApp = () => {
    const message = formatRecordsForMessage();
    
    if (!message) {
      toast.error("Preencha pelo menos um registro completo");
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hora Extra</h1>
            <p className="text-muted-foreground">
              Registre suas horas extras trabalhadas
            </p>
          </div>
          <OvertimeHistoryDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registros de Hora Extra
            </CardTitle>
            <CardDescription>
              Segunda a quinta após 17h, sexta após 16h, e finais de semana são destacados como hora extra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {records.map((record, index) => {
              const exitIsOvertime = isOvertimeTime(record.date, record.exitTime);
              
              return (
                <div 
                  key={record.id} 
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    exitIsOvertime 
                      ? "border-amber-500 bg-amber-500/10" 
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      Registro {index + 1}
                      {exitIsOvertime && (
                        <span className="ml-2 text-amber-500 font-semibold">
                          ⏰ Hora Extra
                        </span>
                      )}
                    </span>
                    {records.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRecord(record.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Date Picker */}
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !record.date && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {record.date ? (
                              format(record.date, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={record.date}
                            onSelect={(date) => updateRecord(record.id, "date", date)}
                            initialFocus
                            className="pointer-events-auto"
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Entry Time */}
                    <div className="space-y-2">
                      <Label>Hora de Entrada</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={record.entryTime}
                          onChange={(e) => updateRecord(record.id, "entryTime", e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Exit Time */}
                    <div className="space-y-2">
                      <Label>Hora de Saída</Label>
                      <div className="relative">
                        <Clock className={cn(
                          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                          exitIsOvertime ? "text-amber-500" : "text-muted-foreground"
                        )} />
                        <Input
                          type="time"
                          value={record.exitTime}
                          onChange={(e) => updateRecord(record.id, "exitTime", e.target.value)}
                          className={cn(
                            "pl-10",
                            exitIsOvertime && "border-amber-500 text-amber-500 font-semibold"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Record Button */}
            <Button
              variant="outline"
              onClick={addRecord}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Registro
            </Button>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button 
                onClick={handleSave} 
                className="flex-1"
                disabled={createRecords.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createRecords.isPending ? "Salvando..." : "Salvar Registros"}
              </Button>
              <Button 
                onClick={handleSendWhatsApp} 
                variant="secondary"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Saved Records Table */}
        <SavedRecordsCard
          savedRecords={savedRecords}
          isLoadingRecords={isLoadingRecords}
          canDeleteRecord={canDeleteRecord}
          deleteRecord={deleteRecord}
          periodStart={summaryData?.period?.start}
          periodEnd={summaryData?.period?.end}
        />

        {/* Monthly Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumo do Período (Folha)
                </CardTitle>
                <CardDescription>
                  {summaryData?.period ? (
                    <>
                      Período: {format(new Date(summaryData.period.start + 'T00:00:00'), "dd/MM/yyyy")} a{" "}
                      {format(new Date(summaryData.period.end + 'T00:00:00'), "dd/MM/yyyy")}
                    </>
                  ) : (
                    "Calculado automaticamente todo dia 20"
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {summaryData?.summaries && summaryData.summaries.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const period = summaryData.period;
                       let msg = `📊 *Resumo do Período (Folha)*\n`;
                      if (period) {
                        msg += `📅 ${format(new Date(period.start + 'T00:00:00'), "dd/MM/yyyy")} a ${format(new Date(period.end + 'T00:00:00'), "dd/MM/yyyy")}\n`;
                      }
                      msg += `\n`;
                      summaryData.summaries.forEach((s) => {
                        msg += `👤 *${s.user_name}* (${s.cargo.replace(/_/g, ' ')})\n`;
                        msg += `   📝 Registros: ${s.total_records} | HE: ${s.total_overtime_records}\n`;
                        msg += `   ⏰ Horas Trab.: ${s.total_hours_worked.toFixed(1)}h | HE: ${s.total_overtime_hours.toFixed(1)}h\n\n`;
                      });
                      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      window.open(url, "_blank");
                    }}
                    className="gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCalculateSummary}
                    disabled={isCalculating}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isCalculating && "animate-spin")} />
                    {isCalculating ? "Calculando..." : "Recalcular"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSummaries ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : summaryData?.summaries && summaryData.summaries.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-center">Total Registros</TableHead>
                      <TableHead className="text-center">Registros HE</TableHead>
                      <TableHead className="text-center">Horas Trabalhadas</TableHead>
                      <TableHead className="text-center">Horas Extras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.summaries.map((summary) => (
                      <TableRow key={summary.id}>
                        <TableCell className="font-medium">{summary.user_name}</TableCell>
                        <TableCell className="capitalize">
                          {summary.cargo.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-center">{summary.total_records}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={summary.total_overtime_records > 0 ? "default" : "secondary"}>
                            {summary.total_overtime_records}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {summary.total_hours_worked.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={summary.total_overtime_hours > 0 ? "bg-amber-500 hover:bg-amber-600" : ""}>
                            {summary.total_overtime_hours.toFixed(1)}h
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum resumo disponível para este período.
                {isAdmin && " Clique em 'Recalcular' para gerar o resumo."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default HoraExtra;
