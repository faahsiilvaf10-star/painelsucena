import { useState } from "react";
import { Calendar, FileText, Download, Filter, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AttendanceWithEmployee = Tables<"attendance_records"> & {
  employees: Tables<"employees"> | null;
};

const statusConfig = {
  present: {
    label: "Presente",
    icon: CheckCircle2,
    class: "bg-success/20 text-success",
  },
  late: {
    label: "Atrasado",
    icon: AlertCircle,
    class: "bg-warning/20 text-warning",
  },
  absent: {
    label: "Ausente",
    icon: XCircle,
    class: "bg-destructive/20 text-destructive",
  },
  justified: {
    label: "Justificado",
    icon: FileText,
    class: "bg-info/20 text-info",
  },
};

const RelatorioPresenca = () => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch all attendance records
  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance_report", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`*, employees (*)`)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as AttendanceWithEmployee[];
    },
  });

  // Get unique employees for filter
  const employeesMap = new Map<string, Tables<"employees">>();
  records?.forEach((r) => {
    if (r.employees && r.employees.id) {
      employeesMap.set(r.employees.id, r.employees);
    }
  });
  const employees = Array.from(employeesMap.values());

  // Filter records
  const filteredRecords = records?.filter((record) => {
    const matchesEmployee = filterEmployee === "all" || record.employee_id === filterEmployee;
    const matchesStatus = filterStatus === "all" || record.status === filterStatus;
    return matchesEmployee && matchesStatus;
  }) || [];

  // Calculate summary
  const summary = {
    total: filteredRecords.length,
    present: filteredRecords.filter((r) => r.status === "present").length,
    late: filteredRecords.filter((r) => r.status === "late").length,
    absent: filteredRecords.filter((r) => r.status === "absent").length,
    justified: filteredRecords.filter((r) => r.status === "justified").length,
  };

  const attendanceRate = summary.total > 0 
    ? (((summary.present + summary.late) / summary.total) * 100).toFixed(1) 
    : "0";

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Relatório de Presença</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Análise detalhada de frequência
            </p>
          </div>

          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border/50 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Funcionário</label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp?.id} value={emp?.id || ""}>
                      {emp?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="present">Presente</SelectItem>
                  <SelectItem value="late">Atrasado</SelectItem>
                  <SelectItem value="absent">Ausente</SelectItem>
                  <SelectItem value="justified">Justificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Total de Registros</p>
            <p className="text-3xl font-bold mt-1">{summary.total}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Presentes</p>
            <p className="text-3xl font-bold mt-1 text-success">{summary.present}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Atrasados</p>
            <p className="text-3xl font-bold mt-1 text-warning">{summary.late}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Ausentes</p>
            <p className="text-3xl font-bold mt-1 text-destructive">{summary.absent}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Taxa de Presença</p>
            <p className="text-3xl font-bold mt-1 text-primary">{attendanceRate}%</p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Funcionário</TableHead>
                  <TableHead className="text-muted-foreground">Função</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, index) => {
                  const config = statusConfig[record.status];
                  const Icon = config.icon;
                  const employee = record.employees;

                  return (
                    <TableRow
                      key={record.id}
                      className="border-border/50 animate-fade-in"
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(record.date).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-semibold text-xs">
                            {employee?.avatar || "??"}
                          </div>
                          <span>{employee?.name || "Desconhecido"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee?.role || "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.class}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RelatorioPresenca;
