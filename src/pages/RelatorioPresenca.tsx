import { useState, useMemo } from "react";
import { FileText, Copy, Send, Loader2, Check } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useUpsertAttendance } from "@/hooks/useAttendance";

type AttendanceWithEmployee = Tables<"attendance_records"> & {
  employees: Tables<"employees"> | null;
};

// Define the role groupings for the report
const roleGroups = {
  "ÁREA GABIÃO": {
    header: "✳  ÁREA GABIÃO  ✳",
    support: {
      header: "✴EQUIPE DE SUPORTE✴",
      members: [
        { role: "🙋‍♀ TST", name: "ITAMAR DE SOUZA" },
        { role: "🙋‍♂ ENC GERAL", name: "DOMINGUES FABRICIO" },
        { role: "🙋‍♂ ENC", name: "JOSÉ MARIA CORREA" },
      ],
    },
    execution: {
      header: "✴EQUIPE DE EXECUÇÃO✴",
      roles: ["Polivalente", "Meia Oficial", "Ajudante"],
    },
    roleLabels: {
      Polivalente: "👷🏼‍♂ Polivalentes:",
      "Meia Oficial": "👷🏼‍♂ Meia oficial:",
      Ajudante: "👷🏼‍♂ Ajudante:",
    },
  },
  "ROÇAGEM E PODAGEM": {
    header: "-----------------------------------\n\n ROÇAGEM E PODAGEM",
    support: {
      header: "✴EQUIPE DE SUPORTE✴",
      members: [
        { role: "🙋‍♀ TST", name: "ITAMAR DE SOUZA" },
        { role: "🙋‍♂ ENC GERAL", name: "DOMINGUES FABRICIO" },
        { role: "🙋‍♂ ENC", name: "RUDNEY SILVA" },
      ],
    },
    execution: {
      header: "✴EQUIPE DE EXECUÇÃO✴",
      roles: [
        "Jardineiro",
        "Ajudante",
        "Motorista do Pipa",
        "Motorista do Munck",
        "Sinaleiro",
        "Mecânico Montador",
        "Auxiliar de Elétrica",
      ],
    },
    roleLabels: {
      Jardineiro: "👷🏼‍♂Jardineiro:",
      Ajudante: "👷🏼‍♂ Ajudante:",
      "Motorista do Pipa": "👷🏼 Motorista do Pipa",
      "Motorista do Munck": "👷🏼 Motorista do Munck",
      Sinaleiro: "👷🏼 Sinaleiro",
      "Mecânico Montador": "👷🏼 Mecânico montador",
      "Auxiliar de Elétrica": "👷🏼 Auxiliar de elétrica",
    },
  },
};

// Map roles to areas
const roleToArea: Record<string, string> = {
  Polivalente: "ÁREA GABIÃO",
  "Meia Oficial": "ÁREA GABIÃO",
  Jardineiro: "ROÇAGEM E PODAGEM",
  "Motorista do Pipa": "ROÇAGEM E PODAGEM",
  "Motorista do Munck": "ROÇAGEM E PODAGEM",
  Sinaleiro: "ROÇAGEM E PODAGEM",
  "Mecânico Montador": "ROÇAGEM E PODAGEM",
  "Auxiliar de Elétrica": "ROÇAGEM E PODAGEM",
};

// Ajudante belongs to their specific area based on employee
const gabiaAjudantes = [
  "Flávio Henrique",
  "Vinícius Junior",
  "Welber Santo",
  "Filipe dos Santos",
  "Ezedequias Silva",
];

const RelatorioPresenca = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const upsertAttendance = useUpsertAttendance();

  // Fetch attendance records for the selected date with employees
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ["attendance_report", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`*, employees (*)`)
        .eq("date", selectedDate);

      if (error) throw error;
      return data as AttendanceWithEmployee[];
    },
  });

  // Fetch all employees
  const { data: allEmployees, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Tables<"employees">[];
    },
  });

  const isLoading = recordsLoading || employeesLoading;

  // Create a map of employee attendance status
  const attendanceMap = useMemo(() => {
    const map = new Map<string, { status: "present" | "late" | "absent" | "justified"; id?: string }>();
    records?.forEach((r) => {
      if (r.employees) {
        map.set(r.employee_id, { status: r.status, id: r.id });
      }
    });
    return map;
  }, [records]);

  const getArea = (employee: Tables<"employees">) => {
    if (employee.role === "Ajudante") {
      return gabiaAjudantes.some(
        (n) => n.toUpperCase() === employee.name.toUpperCase()
      )
        ? "ÁREA GABIÃO"
        : "ROÇAGEM E PODAGEM";
    }
    return roleToArea[employee.role] || "ROÇAGEM E PODAGEM";
  };

  // Group employees by area and role
  const groupedEmployees = useMemo(() => {
    if (!allEmployees) return { "ÁREA GABIÃO": {}, "ROÇAGEM E PODAGEM": {} };

    const grouped: Record<string, Record<string, Tables<"employees">[]>> = {
      "ÁREA GABIÃO": {},
      "ROÇAGEM E PODAGEM": {},
    };

    allEmployees.forEach((emp) => {
      const area = getArea(emp);
      if (!grouped[area][emp.role]) {
        grouped[area][emp.role] = [];
      }
      grouped[area][emp.role].push(emp);
    });

    return grouped;
  }, [allEmployees]);

  const getStatusEmoji = (employeeId: string) => {
    const attendance = attendanceMap.get(employeeId);
    if (!attendance) return "✅"; // Default to present
    if (attendance.status === "present" || attendance.status === "late") return "✅";
    return "❌";
  };

  const isPresent = (employeeId: string) => {
    const attendance = attendanceMap.get(employeeId);
    if (!attendance) return true; // Default to present
    return attendance.status === "present" || attendance.status === "late";
  };

  const toggleAttendance = async (employee: Tables<"employees">) => {
    const currentlyPresent = isPresent(employee.id);
    const newStatus = currentlyPresent ? "absent" : "present";

    try {
      await upsertAttendance.mutateAsync({
        employee_id: employee.id,
        date: selectedDate,
        status: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["attendance_report", selectedDate] });
    } catch {
      toast.error("Erro ao atualizar presença");
    }
  };

  // Generate the WhatsApp report text
  const generateReport = useMemo(() => {
    if (!allEmployees) return "";

    const getStatusEmojiByName = (employeeId: string) => {
      return getStatusEmoji(employeeId);
    };

    let report = "";

    // ÁREA GABIÃO
    const gabiao = roleGroups["ÁREA GABIÃO"];
    report += `${gabiao.header}\n\n`;
    report += `${gabiao.support.header}\n\n`;
    gabiao.support.members.forEach((m) => {
      report += `${m.role} : ${m.name}\n\n`;
    });
    report += `${gabiao.execution.header}\n\n`;

    gabiao.execution.roles.forEach((role) => {
      const label = gabiao.roleLabels[role as keyof typeof gabiao.roleLabels];
      const employees = groupedEmployees["ÁREA GABIÃO"][role] || [];
      if (employees.length > 0) {
        report += `${label}\n\n`;
        employees.forEach((emp) => {
          report += `${emp.name.toUpperCase()} ${getStatusEmojiByName(emp.id)}\n\n`;
        });
      }
    });

    // ROÇAGEM E PODAGEM
    const rocagem = roleGroups["ROÇAGEM E PODAGEM"];
    report += `${rocagem.header}\n\n`;
    report += `${rocagem.support.header} \n\n`;
    rocagem.support.members.forEach((m) => {
      report += `${m.role} : ${m.name}\n\n`;
    });
    report += `${rocagem.execution.header}\n\n`;

    rocagem.execution.roles.forEach((role) => {
      const label = rocagem.roleLabels[role as keyof typeof rocagem.roleLabels];
      const employees = groupedEmployees["ROÇAGEM E PODAGEM"][role] || [];
      if (employees.length > 0) {
        report += `${label}\n\n`;
        employees.forEach((emp) => {
          report += `${emp.name.toUpperCase()} ${getStatusEmojiByName(emp.id)}\n\n`;
        });
      }
    });

    return report.trim();
  }, [allEmployees, groupedEmployees, attendanceMap]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateReport);
      setCopied(true);
      toast.success("Relatório copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(generateReport);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const EmployeeRow = ({ employee }: { employee: Tables<"employees"> }) => {
    const present = isPresent(employee.id);
    return (
      <button
        onClick={() => toggleAttendance(employee)}
        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all hover:opacity-80 ${
          present
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : "bg-red-500/20 text-red-400 border border-red-500/30"
        }`}
        disabled={upsertAttendance.isPending}
      >
        <span className="font-medium">{employee.name.toUpperCase()}</span>
        <span className="text-xl">{present ? "✅" : "❌"}</span>
      </button>
    );
  };

  const RoleSection = ({
    label,
    employees,
  }: {
    label: string;
    employees: Tables<"employees">[];
  }) => {
    if (employees.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-muted-foreground mb-2">{label}</p>
        <div className="space-y-2">
          {employees.map((emp) => (
            <EmployeeRow key={emp.id} employee={emp} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Relatório de Presença</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Clique em cada funcionário para alternar ✅ / ❌
            </p>
          </div>
        </div>

        {/* Date Filter and Actions */}
        <div className="bg-card rounded-xl border border-border/50 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <div className="flex-1 max-w-xs">
              <label className="text-sm text-muted-foreground mb-2 block">
                Data do Relatório
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="gap-2"
                disabled={isLoading}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copiado!" : "Copiar"}
              </Button>
              <Button
                onClick={handleWhatsApp}
                className="gap-2 bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                <Send className="w-4 h-4" />
                Enviar WhatsApp
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editable Attendance */}
            <div className="space-y-6">
              {/* ÁREA GABIÃO */}
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-bold mb-2 text-center">
                  ✳ ÁREA GABIÃO ✳
                </h2>
                <div className="bg-muted/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-center mb-3">
                    ✴ EQUIPE DE SUPORTE ✴
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {roleGroups["ÁREA GABIÃO"].support.members.map((m, i) => (
                      <p key={i}>
                        {m.role}: {m.name}
                      </p>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-semibold text-center mb-4">
                  ✴ EQUIPE DE EXECUÇÃO ✴
                </p>
                {roleGroups["ÁREA GABIÃO"].execution.roles.map((role) => (
                  <RoleSection
                    key={role}
                    label={
                      roleGroups["ÁREA GABIÃO"].roleLabels[
                        role as keyof typeof roleGroups["ÁREA GABIÃO"]["roleLabels"]
                      ]
                    }
                    employees={groupedEmployees["ÁREA GABIÃO"][role] || []}
                  />
                ))}
              </div>

              {/* ROÇAGEM E PODAGEM */}
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-bold mb-2 text-center">
                  🌿 ROÇAGEM E PODAGEM 🌿
                </h2>
                <div className="bg-muted/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-center mb-3">
                    ✴ EQUIPE DE SUPORTE ✴
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {roleGroups["ROÇAGEM E PODAGEM"].support.members.map((m, i) => (
                      <p key={i}>
                        {m.role}: {m.name}
                      </p>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-semibold text-center mb-4">
                  ✴ EQUIPE DE EXECUÇÃO ✴
                </p>
                {roleGroups["ROÇAGEM E PODAGEM"].execution.roles.map((role) => (
                  <RoleSection
                    key={role}
                    label={
                      roleGroups["ROÇAGEM E PODAGEM"].roleLabels[
                        role as keyof typeof roleGroups["ROÇAGEM E PODAGEM"]["roleLabels"]
                      ]
                    }
                    employees={groupedEmployees["ROÇAGEM E PODAGEM"][role] || []}
                  />
                ))}
              </div>
            </div>

            {/* Report Preview */}
            <div className="bg-card rounded-xl border border-border/50 p-6 h-fit sticky top-6">
              <h2 className="font-semibold mb-4 text-lg">
                📋 Pré-visualização do Relatório
              </h2>
              <Textarea
                value={generateReport}
                readOnly
                className="min-h-[600px] font-mono text-sm whitespace-pre-wrap bg-muted/30"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button
                  onClick={handleWhatsApp}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RelatorioPresenca;
