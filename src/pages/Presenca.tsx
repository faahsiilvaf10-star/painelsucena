import { useState } from "react";
import { Calendar, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
import { useAttendanceRecords, useUpdateAttendance, type AttendanceStatus } from "@/hooks/useAttendance";
import { toast } from "sonner";

const statusConfig = {
  present: {
    label: "Presente",
    icon: CheckCircle2,
    class: "bg-success/20 text-success",
    iconClass: "text-success",
  },
  absent: {
    label: "Ausente",
    icon: XCircle,
    class: "bg-destructive/20 text-destructive",
    iconClass: "text-destructive",
  },
};

const Presenca = () => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const today = new Date().toISOString().split("T")[0];
  
  const { data: attendanceRecords, isLoading, error } = useAttendanceRecords(today);
  const updateAttendance = useUpdateAttendance();

  const filteredRecords = attendanceRecords?.filter(
    (record) => filterStatus === "all" || record.status === filterStatus
  ) || [];

  const stats = {
    present: attendanceRecords?.filter((r) => r.status === "present").length || 0,
    absent: attendanceRecords?.filter((r) => r.status === "absent").length || 0,
  };

  const handleStatusChange = async (recordId: string, newStatus: AttendanceStatus) => {
    try {
      await updateAttendance.mutateAsync({
        id: recordId,
        status: newStatus,
        check_in: newStatus === "absent" || newStatus === "justified" ? null : undefined,
        check_out: newStatus === "absent" || newStatus === "justified" ? null : undefined,
      });
      toast.success("Status atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <p className="text-destructive text-lg">Erro ao carregar dados</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Lista de Presença</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <Button className="gap-2">
            <Clock className="w-4 h-4" />
            Registrar Ponto
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-4"
              >
                <div className={`p-3 rounded-lg ${config.class}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats[key as keyof typeof stats]}</p>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                </div>
              </div>
            );
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
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Funcionário</TableHead>
                <TableHead className="text-muted-foreground">Função</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record, index) => {
                const config = statusConfig[record.status];
                const employee = record.employees;

                return (
                  <TableRow
                    key={record.id}
                    className="border-border/50 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                          {employee?.avatar || "??"}
                        </div>
                        <div>
                          <p className="font-medium">{employee?.name || "Desconhecido"}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee?.department}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee?.role || "-"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={record.status}
                        onValueChange={(value: AttendanceStatus) => handleStatusChange(record.id, value)}
                      >
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum registro encontrado
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Presenca;
