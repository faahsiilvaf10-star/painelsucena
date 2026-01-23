import { useState } from "react";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, FileText } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { attendanceRecords, employees } from "@/data/mockData";
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

const statusConfig = {
  present: {
    label: "Presente",
    icon: CheckCircle2,
    class: "bg-success/20 text-success",
    iconClass: "text-success",
  },
  late: {
    label: "Atrasado",
    icon: AlertCircle,
    class: "bg-warning/20 text-warning",
    iconClass: "text-warning",
  },
  absent: {
    label: "Ausente",
    icon: XCircle,
    class: "bg-destructive/20 text-destructive",
    iconClass: "text-destructive",
  },
  justified: {
    label: "Justificado",
    icon: FileText,
    class: "bg-info/20 text-info",
    iconClass: "text-info",
  },
};

const Presenca = () => {
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredRecords = attendanceRecords.filter(
    (record) => filterStatus === "all" || record.status === filterStatus
  );

  const stats = {
    present: attendanceRecords.filter((r) => r.status === "present").length,
    late: attendanceRecords.filter((r) => r.status === "late").length,
    absent: attendanceRecords.filter((r) => r.status === "absent").length,
    justified: attendanceRecords.filter((r) => r.status === "justified").length,
  };

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
              <SelectItem value="late">Atrasados</SelectItem>
              <SelectItem value="absent">Ausentes</SelectItem>
              <SelectItem value="justified">Justificados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Funcionário</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Entrada</TableHead>
                <TableHead className="text-muted-foreground">Saída</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record, index) => {
                const config = statusConfig[record.status];
                const Icon = config.icon;
                const employee = employees.find((e) => e.id === record.employeeId);

                // Calculate hours worked
                let hoursWorked = "-";
                if (record.checkIn !== "-" && record.checkOut !== "-") {
                  const [inH, inM] = record.checkIn.split(":").map(Number);
                  const [outH, outM] = record.checkOut.split(":").map(Number);
                  const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  hoursWorked = `${hours}h ${minutes}m`;
                }

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
                          <p className="font-medium">{record.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee?.role}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(record.date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <span className={record.checkIn !== "-" ? "" : "text-muted-foreground"}>
                        {record.checkIn}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={record.checkOut !== "-" ? "" : "text-muted-foreground"}>
                        {record.checkOut}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.class}`}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {hoursWorked}
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
