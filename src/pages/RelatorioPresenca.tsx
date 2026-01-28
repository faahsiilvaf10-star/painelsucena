import { useState, useMemo } from "react";
import { FileText, Copy, Send, Loader2, Check, UserPlus, Pencil, Save, Lock, Unlock, Trash2 } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
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
import { useReportLock, AreaType } from "@/hooks/useReportLock";
import { useSaveEfetivoToRDO } from "@/hooks/useRDOReports";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { useProfile } from "@/hooks/useProfile";

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

// Map display area names to AreaType
const areaToLockType: Record<string, AreaType> = {
  "ÁREA GABIÃO": "gabiao",
  "ROÇAGEM E PODAGEM": "jardinagem",
};

const RelatorioPresenca = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return getBrazilNorthTodayString();
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
  const saveEfetivoToRDO = useSaveEfetivoToRDO();
  const { isAreaLocked, canUnlockArea, lockArea, unlockArea, isLoading: lockLoading } = useReportLock(selectedDate);
  const { data: profile } = useProfile();

  // Determine which tabs to show based on user cargo
  const userCargo = profile?.cargo;
  const showGabiaoTab = userCargo !== "encarregado_i"; // Hide for Encarregado I
  const showRocagemTab = userCargo !== "encarregado_ii"; // Hide for Encarregado II
  
  // Determine default tab based on visibility
  const defaultTab = useMemo(() => {
    if (!showGabiaoTab && showRocagemTab) return "rocagem";
    return "gabiao";
  }, [showGabiaoTab, showRocagemTab]);

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
    const map = new Map<string, { status: "present" | "absent"; id?: string }>();
    records?.forEach((r) => {
      if (r.employees) {
        // Map all statuses to just present or absent
        const normalizedStatus = r.status === "present" ? "present" : "absent";
        map.set(r.employee_id, { status: normalizedStatus, id: r.id });
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
    // Se não tem registro, considera presente por padrão
    if (!attendance) return "✅";
    return attendance.status === "present" ? "✅" : "❌";
  };

  const isPresent = (employeeId: string) => {
    const attendance = attendanceMap.get(employeeId);
    if (!attendance) return true; // Presente por padrão
    return attendance.status === "present";
  };

  const toggleAttendance = async (employee: Tables<"employees">) => {
    const employeeArea = getArea(employee);
    const lockType = areaToLockType[employeeArea];
    
    if (isAreaLocked(lockType)) {
      toast.error(`Área ${employeeArea} está bloqueada! Não é possível alterar.`);
      return;
    }

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

  const handleSaveAreaReport = async (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM") => {
    const lockType = areaToLockType[area];
    
    try {
      // First, create attendance records for employees in this area who don't have one yet
      if (allEmployees) {
        const areaEmployees = allEmployees.filter(emp => getArea(emp) === area);
        const employeesWithoutRecords = areaEmployees.filter(
          (emp) => !attendanceMap.has(emp.id)
        );

        // Create records for employees without attendance (default to present)
        for (const emp of employeesWithoutRecords) {
          await upsertAttendance.mutateAsync({
            employee_id: emp.id,
            date: selectedDate,
            status: "present",
          });
        }
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["attendance_report", selectedDate] });
      await queryClient.invalidateQueries({ queryKey: ["attendance_records"] });

      // Generate efetivo text for this area and save to RDO
      if (area === "ÁREA GABIÃO") {
        const efetivoGabiaoText = generateAreaReportForRDO("ÁREA GABIÃO");
        await saveEfetivoToRDO.mutateAsync({
          report_date: selectedDate,
          efetivo_gabiao_text: efetivoGabiaoText,
          efetivo_jardinagem_text: "",
        });
      } else {
        const efetivoJardinagemText = generateAreaReportForRDO("ROÇAGEM E PODAGEM");
        await saveEfetivoToRDO.mutateAsync({
          report_date: selectedDate,
          efetivo_gabiao_text: "",
          efetivo_jardinagem_text: efetivoJardinagemText,
        });
      }

      // Lock the specific area
      await lockArea.mutateAsync(lockType);
      toast.success(`Relatório ${area === "ÁREA GABIÃO" ? "Gabião" : "Jardinagem"} salvo!`);
    } catch {
      toast.error("Erro ao salvar relatório");
    }
  };

  const handleUnlockAreaReport = async (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM") => {
    const lockType = areaToLockType[area];
    try {
      await unlockArea.mutateAsync(lockType);
      toast.success(`Área ${area === "ÁREA GABIÃO" ? "Gabião" : "Jardinagem"} desbloqueada.`);
    } catch {
      toast.error("Erro ao desbloquear relatório");
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

  // Format date for display (DD/MM/YYYY)
  const formatDateForReport = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // Generate report for a specific area
  const generateAreaReport = (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM", includeDate: boolean = true) => {
    if (!allEmployees) return "";

    const support = area === "ÁREA GABIÃO" ? supportGabiao : supportRocagem;
    const header = area === "ÁREA GABIÃO" 
      ? "✳  ÁREA GABIÃO  ✳" 
      : "-----------------------------------\n\n 🌿 ROÇAGEM E PODAGEM 🌿";

    let report = "";

    // Add date only for the first area (GABIÃO)
    if (includeDate && area === "ÁREA GABIÃO") {
      report += `📅 Data: ${formatDateForReport(selectedDate)}\n\n`;
    }

    report += `${header}\n\n`;
    report += `✴EQUIPE DE SUPORTE✴\n\n`;
    report += `🙋🏻‍♂️ TST : ${support.tst}\n\n`;
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

  // Generate report for RDO (quantity only, no names, no support team)
  const generateAreaReportForRDO = (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM") => {
    if (!allEmployees) return "";

    // Using simple, universally compatible emojis
    const header = area === "ÁREA GABIÃO" 
      ? "\u2733\uFE0F ÁREA GABIÃO \u2733\uFE0F" 
      : "\uD83C\uDF3F ROÇAGEM E PODAGEM \uD83C\uDF3F";

    let report = "";

    report += `${header}\n\n`;
    report += "\u2734\uFE0F EQUIPE DE EXECUÇÃO \u2734\uFE0F\n\n";

    const roles = executionRoles[area];
    roles.forEach((role) => {
      const label = roleLabels[area][role];
      const employees = groupedEmployees[area][role] || [];
      const presentCount = employees.filter((emp) => isPresent(emp.id)).length;
      
      if (employees.length > 0 && presentCount > 0) {
        // Remove emoji and colon from label for cleaner display
        const cleanLabel = label.replace(/^👷🏼‍♂\s*|👷🏼\s*/g, '').replace(/:$/, '');
        report += `\uD83D\uDC77 ${cleanLabel}: ${presentCount}\n\n`;
      }
    });

    return report.trim();
  };

  // Generate full report or selected area
  const generateReport = useMemo(() => {
    if (!allEmployees) return "";

    const dateHeader = `📅 Data: ${formatDateForReport(selectedDate)}\n\n`;

    if (selectedArea === "ÁREA GABIÃO") {
      return dateHeader + generateAreaReport("ÁREA GABIÃO", false);
    }
    if (selectedArea === "ROÇAGEM E PODAGEM") {
      return dateHeader + generateAreaReport("ROÇAGEM E PODAGEM", false);
    }

    // All areas - date is included in the first area
    return generateAreaReport("ÁREA GABIÃO", true) + "\n\n" + generateAreaReport("ROÇAGEM E PODAGEM", false);
  }, [allEmployees, groupedEmployees, attendanceMap, selectedArea, supportGabiao, supportRocagem, selectedDate]);

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Tables<"employees"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    
    setIsDeleting(true);
    try {
      // First delete attendance records for this employee
      await supabase
        .from("attendance_records")
        .delete()
        .eq("employee_id", employeeToDelete.id);
      
      // Then delete the employee
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeToDelete.id);
      
      if (error) throw error;
      
      toast.success(`${employeeToDelete.name} removido da lista!`);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["employees_all"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_report", selectedDate] });
    } catch {
      toast.error("Erro ao remover funcionário");
    } finally {
      setIsDeleting(false);
    }
  };

  const EmployeeRow = ({ employee, area }: { employee: Tables<"employees">; area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" }) => {
    const present = isPresent(employee.id);
    const lockType = areaToLockType[area];
    const locked = isAreaLocked(lockType);
    
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggleAttendance(employee)}
          className={`flex-1 flex items-center justify-between px-4 py-2 rounded-lg transition-all ${
            locked ? "cursor-not-allowed opacity-70" : "hover:opacity-80 cursor-pointer"
          } ${
            present
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
          disabled={upsertAttendance.isPending || locked}
        >
          <span className="font-medium">{employee.name.toUpperCase()}</span>
          <div className="flex items-center gap-2">
            {locked && <Lock className="w-3 h-3" />}
            <span className="text-xl">{present ? "✅" : "❌"}</span>
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            setEmployeeToDelete(employee);
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const RoleSection = ({
    label,
    employees,
    area,
  }: {
    label: string;
    employees: Tables<"employees">[];
    area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM";
  }) => {
    if (employees.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-muted-foreground mb-2">{label}</p>
        <div className="space-y-2">
          {employees.map((emp) => (
            <EmployeeRow key={emp.id} employee={emp} area={area} />
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
    const lockType = areaToLockType[area];
    const locked = isAreaLocked(lockType);
    const canUnlock = canUnlockArea(lockType);

    return (
      <div className="bg-card rounded-xl border border-border/50 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-center flex-1">
            {emoji} {area} {emoji}
          </h2>
          {locked && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-500 rounded-md text-xs">
              <Lock className="w-3 h-3" />
              Salvo
            </div>
          )}
        </div>
        <SupportTeamEditor support={support} setSupport={setSupport} />
        <p className="text-sm font-semibold text-center mb-4">
          ✴ EQUIPE DE EXECUÇÃO ✴
        </p>
        {executionRoles[area].map((role) => (
          <RoleSection
            key={role}
            label={roleLabels[area][role]}
            employees={groupedEmployees[area][role] || []}
            area={area}
          />
        ))}
        
        {/* Area-specific save/unlock buttons */}
        <div className="mt-6 pt-4 border-t border-border/50">
          {!locked ? (
            <Button
              onClick={() => handleSaveAreaReport(area)}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
              disabled={isLoading || lockArea.isPending}
            >
              {lockArea.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar {area === "ÁREA GABIÃO" ? "Gabião" : "Jardinagem"}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-500 rounded-lg border border-amber-500/30">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Área Salva e Bloqueada</span>
              </div>
              {canUnlock && (
                <Button
                  onClick={() => handleUnlockAreaReport(area)}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={unlockArea.isPending}
                >
                  {unlockArea.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                  Desbloquear {area === "ÁREA GABIÃO" ? "Gabião" : "Jardinagem"}
                </Button>
              )}
            </div>
          )}
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
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className={`grid w-full ${showGabiaoTab && showRocagemTab ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showGabiaoTab && (
                    <TabsTrigger value="gabiao">✳ Área Gabião</TabsTrigger>
                  )}
                  {showRocagemTab && (
                    <TabsTrigger value="rocagem">🌿 Roçagem e Podagem</TabsTrigger>
                  )}
                </TabsList>
                {showGabiaoTab && (
                  <TabsContent value="gabiao" className="mt-4">
                    <AreaCard area="ÁREA GABIÃO" />
                  </TabsContent>
                )}
                {showRocagemTab && (
                  <TabsContent value="rocagem" className="mt-4">
                    <AreaCard area="ROÇAGEM E PODAGEM" />
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Report Preview - Separated by Area */}
            <div className="space-y-6">
              {/* Área Gabião Report - Hidden for Encarregado I */}
              {showGabiaoTab && (
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg">
                      ✳ Relatório Área Gabião
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          await navigator.clipboard.writeText(generateAreaReport("ÁREA GABIÃO"));
                          toast.success("Relatório Gabião copiado!");
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copiar
                      </Button>
                      <Button
                        onClick={() => {
                          const encoded = encodeURIComponent(generateAreaReport("ÁREA GABIÃO"));
                          window.open(`https://wa.me/?text=${encoded}`, "_blank");
                        }}
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={generateAreaReport("ÁREA GABIÃO")}
                    readOnly
                    className="min-h-[300px] font-mono text-sm whitespace-pre-wrap bg-muted/30"
                  />
                </div>
              )}

              {/* Roçagem e Podagem Report - Hidden for Encarregado II */}
              {showRocagemTab && (
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg">
                      🌿 Relatório Roçagem e Podagem
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          await navigator.clipboard.writeText(generateAreaReport("ROÇAGEM E PODAGEM"));
                          toast.success("Relatório Roçagem copiado!");
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copiar
                      </Button>
                      <Button
                        onClick={() => {
                          const encoded = encodeURIComponent(generateAreaReport("ROÇAGEM E PODAGEM"));
                          window.open(`https://wa.me/?text=${encoded}`, "_blank");
                        }}
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={generateAreaReport("ROÇAGEM E PODAGEM")}
                    readOnly
                    className="min-h-[300px] font-mono text-sm whitespace-pre-wrap bg-muted/30"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Employee Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover Funcionário</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover <strong>{employeeToDelete?.name}</strong> da lista de presença?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEmployee}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RelatorioPresenca;
