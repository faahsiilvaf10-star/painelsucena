import { useState, useMemo } from "react";
import { FileText, Copy, Send, Loader2, Check, UserPlus, Pencil } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useUpsertAttendance } from "@/hooks/useAttendance";

type AttendanceWithEmployee = Tables<"attendance_records"> & {
  employees: Tables<"employees"> | null;
};

type SupportMember = {
  role: string;
  name: string;
};

type SupportTeam = {
  tst: string;
  encGeral: string;
  enc: string;
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

// All available roles
const allRoles = [
  "Polivalente",
  "Meia Oficial",
  "Ajudante",
  "Jardineiro",
  "Motorista do Pipa",
  "Motorista do Munck",
  "Sinaleiro",
  "Mecânico Montador",
  "Auxiliar de Elétrica",
];

// Role labels for display
const roleLabels: Record<string, Record<string, string>> = {
  "ÁREA GABIÃO": {
    Polivalente: "👷🏼‍♂ Polivalentes:",
    "Meia Oficial": "👷🏼‍♂ Meia oficial:",
    Ajudante: "👷🏼‍♂ Ajudante:",
  },
  "ROÇAGEM E PODAGEM": {
    Jardineiro: "👷🏼‍♂Jardineiro:",
    Ajudante: "👷🏼‍♂ Ajudante:",
    "Motorista do Pipa": "👷🏼 Motorista do Pipa",
    "Motorista do Munck": "👷🏼 Motorista do Munck",
    Sinaleiro: "👷🏼 Sinaleiro",
    "Mecânico Montador": "👷🏼 Mecânico montador",
    "Auxiliar de Elétrica": "👷🏼 Auxiliar de elétrica",
  },
};

const executionRoles: Record<string, string[]> = {
  "ÁREA GABIÃO": ["Polivalente", "Meia Oficial", "Ajudante"],
  "ROÇAGEM E PODAGEM": [
    "Jardineiro",
    "Ajudante",
    "Motorista do Pipa",
    "Motorista do Munck",
    "Sinaleiro",
    "Mecânico Montador",
    "Auxiliar de Elétrica",
  ],
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
  const [selectedArea, setSelectedArea] = useState<"all" | "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    role: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editable support teams
  const [supportGabiao, setSupportGabiao] = useState<SupportTeam>({
    tst: "ITAMAR DE SOUZA",
    encGeral: "DOMINGUES FABRICIO",
    enc: "JOSÉ MARIA CORREA",
  });

  const [supportRocagem, setSupportRocagem] = useState<SupportTeam>({
    tst: "ITAMAR DE SOUZA",
    encGeral: "DOMINGUES FABRICIO",
    enc: "RUDNEY SILVA",
  });

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
    if (!attendance) return "✅";
    if (attendance.status === "present" || attendance.status === "late") return "✅";
    return "❌";
  };

  const isPresent = (employeeId: string) => {
    const attendance = attendanceMap.get(employeeId);
    if (!attendance) return true;
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

  const handleAddEmployee = async () => {
    if (!newEmployee.name.trim() || !newEmployee.role) {
      toast.error("Preencha nome e função");
      return;
    }

    setIsSubmitting(true);
    try {
      const initials = newEmployee.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const { error } = await supabase.from("employees").insert({
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        department: "Operações",
        avatar: initials,
      });

      if (error) throw error;

      toast.success("Funcionário adicionado!");
      setNewEmployee({ name: "", role: "" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["employees_all"] });
    } catch {
      toast.error("Erro ao adicionar funcionário");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate report for a specific area
  const generateAreaReport = (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM") => {
    if (!allEmployees) return "";

    const support = area === "ÁREA GABIÃO" ? supportGabiao : supportRocagem;
    const header = area === "ÁREA GABIÃO" 
      ? "✳  ÁREA GABIÃO  ✳" 
      : "-----------------------------------\n\n 🌿 ROÇAGEM E PODAGEM 🌿";

    let report = "";

    report += `${header}\n\n`;
    report += `✴EQUIPE DE SUPORTE✴\n\n`;
    report += `🙋‍♀ TST : ${support.tst}\n\n`;
    report += `🙋‍♂ ENC GERAL: ${support.encGeral}\n\n`;
    report += `🙋‍♂ ENC: ${support.enc}\n\n`;
    report += `✴EQUIPE DE EXECUÇÃO✴\n\n`;

    const roles = executionRoles[area];
    roles.forEach((role) => {
      const label = roleLabels[area][role];
      const employees = groupedEmployees[area][role] || [];
      if (employees.length > 0) {
        report += `${label}\n\n`;
        employees.forEach((emp) => {
          report += `${emp.name.toUpperCase()} ${getStatusEmoji(emp.id)}\n\n`;
        });
      }
    });

    return report.trim();
  };

  // Generate full report or selected area
  const generateReport = useMemo(() => {
    if (!allEmployees) return "";

    if (selectedArea === "ÁREA GABIÃO") {
      return generateAreaReport("ÁREA GABIÃO");
    }
    if (selectedArea === "ROÇAGEM E PODAGEM") {
      return generateAreaReport("ROÇAGEM E PODAGEM");
    }

    // All areas
    return generateAreaReport("ÁREA GABIÃO") + "\n\n" + generateAreaReport("ROÇAGEM E PODAGEM");
  }, [allEmployees, groupedEmployees, attendanceMap, selectedArea, supportGabiao, supportRocagem]);

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

  const SupportTeamEditor = ({
    support,
    setSupport,
  }: {
    support: SupportTeam;
    setSupport: React.Dispatch<React.SetStateAction<SupportTeam>>;
  }) => {
    return (
      <div className="bg-muted/30 rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold text-center mb-3 flex items-center justify-center gap-2">
          ✴ EQUIPE DE SUPORTE ✴
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0">🙋‍♀ TST:</span>
            <Input
              value={support.tst}
              onChange={(e) => setSupport({ ...support, tst: e.target.value })}
              className="h-8 text-sm bg-background"
              placeholder="Nome do TST"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0">🙋‍♂ ENC GERAL:</span>
            <Input
              value={support.encGeral}
              onChange={(e) => setSupport({ ...support, encGeral: e.target.value })}
              className="h-8 text-sm bg-background"
              placeholder="Nome do ENC Geral"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0">🙋‍♂ ENC:</span>
            <Input
              value={support.enc}
              onChange={(e) => setSupport({ ...support, enc: e.target.value })}
              className="h-8 text-sm bg-background"
              placeholder="Nome do ENC"
            />
          </div>
        </div>
      </div>
    );
  };

  const AreaCard = ({ area }: { area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" }) => {
    const emoji = area === "ÁREA GABIÃO" ? "✳" : "🌿";
    const support = area === "ÁREA GABIÃO" ? supportGabiao : supportRocagem;
    const setSupport = area === "ÁREA GABIÃO" ? setSupportGabiao : setSupportRocagem;

    return (
      <div className="bg-card rounded-xl border border-border/50 p-6">
        <h2 className="text-xl font-bold mb-2 text-center">
          {emoji} {area} {emoji}
        </h2>
        <SupportTeamEditor support={support} setSupport={setSupport} />
        <p className="text-sm font-semibold text-center mb-4">
          ✴ EQUIPE DE EXECUÇÃO ✴
        </p>
        {executionRoles[area].map((role) => (
          <RoleSection
            key={role}
            label={roleLabels[area][role]}
            employees={groupedEmployees[area][role] || []}
          />
        ))}
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
              Clique para alternar ✅ / ❌ e edite a equipe de suporte
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Adicionar Funcionário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo"
                    value={newEmployee.name}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={(value) =>
                      setNewEmployee({ ...newEmployee, role: value })
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {allRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddEmployee}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
            <div className="flex-1 max-w-xs">
              <label className="text-sm text-muted-foreground mb-2 block">
                Área do Relatório
              </label>
              <Select
                value={selectedArea}
                onValueChange={(value) => setSelectedArea(value as typeof selectedArea)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  <SelectItem value="ÁREA GABIÃO">✳ Área Gabião</SelectItem>
                  <SelectItem value="ROÇAGEM E PODAGEM">🌿 Roçagem e Podagem</SelectItem>
                </SelectContent>
              </Select>
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
                WhatsApp
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
            {/* Editable Attendance by Area */}
            <div className="space-y-6">
              <Tabs defaultValue="gabiao" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="gabiao">✳ Área Gabião</TabsTrigger>
                  <TabsTrigger value="rocagem">🌿 Roçagem e Podagem</TabsTrigger>
                </TabsList>
                <TabsContent value="gabiao" className="mt-4">
                  <AreaCard area="ÁREA GABIÃO" />
                </TabsContent>
                <TabsContent value="rocagem" className="mt-4">
                  <AreaCard area="ROÇAGEM E PODAGEM" />
                </TabsContent>
              </Tabs>
            </div>

            {/* Report Preview */}
            <div className="bg-card rounded-xl border border-border/50 p-6 h-fit sticky top-6">
              <h2 className="font-semibold mb-4 text-lg">
                📋 Pré-visualização do Relatório
                {selectedArea !== "all" && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedArea === "ÁREA GABIÃO" ? "Área Gabião" : "Roçagem e Podagem"})
                  </span>
                )}
              </h2>
              <Textarea
                value={generateReport}
                readOnly
                className="min-h-[500px] font-mono text-sm whitespace-pre-wrap bg-muted/30"
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
