import { useState, useMemo } from "react";
import { Calendar, CheckCircle2, XCircle, Loader2, Lock, Trash2, FileText, Pencil } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAttendanceRecords, useUpdateAttendance, useDeleteAttendance, type AttendanceStatus } from "@/hooks/useAttendance";
import { useReportLock } from "@/hooks/useReportLock";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useAbsenceReasons } from "@/hooks/useAbsenceReasons";
import { AbsenceReasonDialog } from "@/components/presenca/AbsenceReasonDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { ExportAttendancePdfButton } from "@/components/presenca/ExportAttendancePdfButton";
import type { Colaborador } from "@/data/efetivoData";

const statusConfig = {
  present: {
    label: "Presente",
    icon: CheckCircle2,
    class: "bg-success/20 text-success",
    iconClass: "text-success"
  },
  absent: {
    label: "Ausente",
    icon: XCircle,
    class: "bg-destructive/20 text-destructive",
    iconClass: "text-destructive"
  }
};

const Presenca = () => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const today = getBrazilNorthTodayString();
  const {
    data: attendanceRecords,
    isLoading: attendanceLoading,
    error,
    refetch
  } = useAttendanceRecords(today);
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { data: rhData, isLoading: rhLoading } = useRHEfetivo();
  const { data: absenceReasons } = useAbsenceReasons(today);
  const {
    isLocked,
    isLoading: lockLoading
  } = useReportLock(today);

  const [absenceDialog, setAbsenceDialog] = useState<{
    employeeId: string;
    employeeName: string;
    initial?: { reason: string; days: number; cid: string; notes: string };
  } | null>(null);

  const allowedCargos = ["encarregado_geral", "encarregado_i", "encarregado_ii", "aux_administrativo"];
  const canEdit = isAdmin || allowedCargos.includes(profile?.cargo || "");
  const canDelete = canEdit;

  const isLoading = attendanceLoading || rhLoading;

  // Build attendance map: employee_id -> status
  const attendanceMap = useMemo(() => {
    const map = new Map<string, { status: "present" | "absent"; recordId: string }>();
    attendanceRecords?.forEach((r) => {
      if (r.employees) {
        const normalizedStatus = r.status === "present" || r.status === "late" ? "present" : "absent";
        map.set(r.employee_id, { status: normalizedStatus, recordId: r.id });
      }
    });
    return map;
  }, [attendanceRecords]);

  // Names of employees that belong to ÁREA GABIÃO (partial match)
  const gabiaoEmployeeNames = [
    "FLÁVIO HENRIQUE",
    "FLAVIO HENRIQUE",
    "VINÍCIUS JUNIOR",
    "VINICIUS JUNIOR",
    "VINICIUS MALCHER",
    "WELBER SANTO",
    "FILIPE DOS SANTOS",
    "EZEDEQUIAS SILVA",
    "JAILSON CARDOSO",
    "JOSE ROBERTO",
    "JOSÉ ROBERTO",
    "MAURICIO NASCIMENTO",
    "MAURÍCIO NASCIMENTO",
    "REGINALDO DOS SANTOS",
    "RAIMUNDO PEREIRA",
  ];

  const isGabiaoEmployee = (nome: string) => {
    const upperName = nome.toUpperCase().trim();
    return gabiaoEmployeeNames.some(n => upperName.includes(n));
  };

  // Get all RH employees (excluding deleted and gabião area)
  const rhColaboradores = useMemo(() => {
    if (!rhData?.colaboradores?.length) return [];
    const deletedIds = rhData.deletedIds || [];
    return rhData.colaboradores
      .filter(c => !deletedIds.includes(c.id))
      .filter(c => !isGabiaoEmployee(c.nome))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);

  // Cross-reference: for each RH employee, find matching attendance record by name
  // The employees table links attendance_records. We match RH name to employees table name.
  const employeesList = useMemo(() => {
    if (!rhColaboradores.length) return [];

    const nameToAttendance = new Map<string, { status: "present" | "absent"; recordId: string; employeeId: string }>();
    attendanceRecords?.forEach((r) => {
      if (r.employees) {
        const normalizedStatus = r.status === "present" || r.status === "late" ? "present" : "absent";
        nameToAttendance.set(r.employees.name.toUpperCase().trim(), { status: normalizedStatus, recordId: r.id, employeeId: r.employee_id });
      }
    });

    const reasonByEmpId = new Map<string, { reason: string; days: number; cid: string | null; notes: string | null; date: string }>();
    absenceReasons?.forEach((a) => {
      reasonByEmpId.set(a.employee_id, { reason: a.reason, days: a.days_count, cid: a.cid, notes: a.notes, date: a.date });
    });

    return rhColaboradores.map(colab => {
      const attendance = nameToAttendance.get(colab.nome.toUpperCase().trim());
      const reason = attendance ? reasonByEmpId.get(attendance.employeeId) : undefined;
      return {
        ...colab,
        attendanceStatus: attendance?.status || "present" as "present" | "absent",
        recordId: attendance?.recordId || null,
        employeeId: attendance?.employeeId || null,
        hasAttendanceRecord: !!attendance,
        absenceReason: reason,
      };
    });
  }, [rhColaboradores, attendanceRecords, absenceReasons]);

  // Filter
  const filteredEmployees = useMemo(() => {
    if (filterStatus === "all") return employeesList;
    return employeesList.filter(e => e.attendanceStatus === filterStatus);
  }, [employeesList, filterStatus]);

  // Stats
  const stats = {
    present: employeesList.filter(e => e.attendanceStatus === "present").length,
    absent: employeesList.filter(e => e.attendanceStatus === "absent").length,
  };

  const toTitleCase = (name: string) =>
    name.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handleStatusChange = async (recordId: string, employeeId: string, employeeName: string, newStatus: AttendanceStatus) => {
    if (isLocked) {
      toast.error("Relatório salvo! Status não pode ser alterado.");
      return;
    }
    try {
      await updateAttendance.mutateAsync({
        id: recordId,
        status: newStatus,
        check_in: newStatus === "absent" || newStatus === "justified" ? null : undefined,
        check_out: newStatus === "absent" || newStatus === "justified" ? null : undefined
      });
      if (newStatus === "absent") {
        setAbsenceDialog({ employeeId, employeeName });
      } else {
        // remove any absence reason for today
        await supabase.from("attendance_absence_reasons").delete().eq("employee_id", employeeId).eq("date", today);
      }
      toast.success("Status atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteRecord = async (recordId: string, employeeName: string) => {
    if (isLocked) {
      toast.error("Relatório salvo! Não é possível remover.");
      return;
    }
    if (!confirm(`Remover ${employeeName} da lista de presença de hoje?`)) return;
    try {
      await deleteAttendance.mutateAsync(recordId);
      await refetch();
      toast.success(`${employeeName} removido da lista`);
    } catch {
      toast.error("Erro ao remover registro");
    }
  };

  if (isLoading) {
    return <Layout>
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>;
  }
  if (error) {
    return <Layout>
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="text-center py-12">
            <p className="text-destructive text-lg">Erro ao carregar dados</p>
          </div>
        </div>
      </Layout>;
  }
  return <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <EditablePageTitle pageKey="presenca" defaultValue="Funcionários Trabalhando hoje!" className="text-2xl sm:text-4xl font-bold mb-2" />
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isLocked && <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/30">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Relatório Salvo</span>
              </div>}
            <ExportAttendancePdfButton />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return <div key={key} className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-4">
                <div className={`p-3 rounded-lg ${config.class}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats[key as keyof typeof stats]}</p>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                </div>
              </div>;
        })}
        </div>

        {/* Filter */}
        <div className="flex justify-end mb-6">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="present">Presentes</SelectItem>
              <SelectItem value="absent">Ausentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground min-w-[150px]">Funcionário</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">Função</TableHead>
                <TableHead className="text-muted-foreground min-w-[120px]">Status</TableHead>
                {canDelete && !isLocked && <TableHead className="text-muted-foreground w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp, index) => {
              const config = statusConfig[emp.attendanceStatus];
              return <TableRow key={emp.id} className="border-border/50 animate-fade-in" style={{
                animationDelay: `${index * 0.03}s`
              }}>
                    <TableCell>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-xs sm:text-sm shrink-0">
                          {getInitials(emp.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{emp.nome}</p>
                          <p className="text-xs text-muted-foreground truncate sm:hidden">
                            {toTitleCase(emp.funcao || "-")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {toTitleCase(emp.funcao || "-")}
                    </TableCell>
                    <TableCell>
                      {isLocked || !emp.hasAttendanceRecord ? (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${config.class}`}>
                          {isLocked && <Lock className="w-3 h-3" />}
                          {config.label}
                        </div>
                      ) : (
                        <Select value={emp.attendanceStatus} onValueChange={(value: AttendanceStatus) => handleStatusChange(emp.recordId!, emp.id, emp.nome, value)}>
                          <SelectTrigger className={`w-[140px] h-8 ${config.class} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-success" />
                                Presente
                              </span>
                            </SelectItem>
                            <SelectItem value="absent">
                              <span className="flex items-center gap-2">
                                <XCircle className="w-3 h-3 text-destructive" />
                                Ausente
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    {canDelete && !isLocked && (
                      <TableCell className="w-[50px] text-center">
                        {emp.hasAttendanceRecord && emp.recordId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRecord(emp.recordId!, emp.nome)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>;
            })}
            </TableBody>
          </Table>
        </div>

        {filteredEmployees.length === 0 && <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum registro encontrado
            </p>
          </div>}
      </div>
    </Layout>;
};
export default Presenca;
