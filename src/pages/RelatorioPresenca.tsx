import { useState, useMemo } from "react";
import { FileText, Copy, Send, Loader2, Check } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

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

  // Fetch attendance records for the selected date with employees
  const { data: records, isLoading } = useQuery({
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
  const { data: allEmployees } = useQuery({
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

  // Create a map of employee attendance status
  const attendanceMap = useMemo(() => {
    const map = new Map<string, "present" | "late" | "absent" | "justified">();
    records?.forEach((r) => {
      if (r.employees) {
        map.set(r.employees.name.toUpperCase(), r.status);
      }
    });
    return map;
  }, [records]);

  // Generate the WhatsApp report text
  const generateReport = useMemo(() => {
    if (!allEmployees) return "";

    const getStatusEmoji = (name: string) => {
      const status = attendanceMap.get(name.toUpperCase());
      if (status === "present" || status === "late") return "✅";
      if (status === "absent" || status === "justified") return "❌";
      return "✅"; // Default to present
    };

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
      const employees = grouped["ÁREA GABIÃO"][role] || [];
      if (employees.length > 0) {
        report += `${label}\n\n`;
        employees.forEach((emp) => {
          report += `${emp.name.toUpperCase()} ${getStatusEmoji(emp.name)}\n\n`;
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
      const employees = grouped["ROÇAGEM E PODAGEM"][role] || [];
      if (employees.length > 0) {
        report += `${label}\n\n`;
        employees.forEach((emp) => {
          report += `${emp.name.toUpperCase()} ${getStatusEmoji(emp.name)}\n\n`;
        });
      }
    });

    return report.trim();
  }, [allEmployees, attendanceMap]);

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

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Relatório de Presença</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Relatório formatado para WhatsApp
            </p>
          </div>
        </div>

        {/* Date Filter */}
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

        {/* Report Preview */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <h2 className="font-semibold mb-4 text-lg">
              Pré-visualização do Relatório
            </h2>
            <Textarea
              value={generateReport}
              readOnly
              className="min-h-[600px] font-mono text-sm whitespace-pre-wrap bg-muted/30"
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RelatorioPresenca;
