import { useState, useMemo, useEffect } from "react";
import { FileText, Copy, Loader2, Check, UserPlus, Pencil, Save, Lock, Unlock, Trash2, MessageCircle } from "lucide-react";
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
import { colaboradoresAtivos } from "@/data/efetivoData";
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
  Eletricista: "ROÇAGEM E PODAGEM",
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
  "Eletricista",
];

// Role labels for display
import { EMOJI_WORKER, EMOJI_CALENDAR, EMOJI_ASTERISK_8, EMOJI_HERB, EMOJI_STAR_8, EMOJI_PERSON_RAISING_HAND, EMOJI_CHECK, EMOJI_CROSS } from "@/lib/whatsappEmojis";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";

const roleLabels: Record<string, Record<string, string>> = {
  "ÁREA GABIÃO": {
    Polivalente: `${EMOJI_WORKER} Polivalentes:`,
    "Meia Oficial": `${EMOJI_WORKER} Meia oficial:`,
    Ajudante: `${EMOJI_WORKER} Ajudante:`,
  },
  "ROÇAGEM E PODAGEM": {
    Polivalente: `${EMOJI_WORKER} Polivalentes:`,
    Jardineiro: `${EMOJI_WORKER} Jardineiro:`,
    Ajudante: `${EMOJI_WORKER} Ajudante:`,
    "Motorista do Pipa": `${EMOJI_WORKER} Motorista do Pipa`,
    "Motorista do Munck": `${EMOJI_WORKER} Motorista do Munck`,
    Sinaleiro: `${EMOJI_WORKER} Sinaleiro`,
    "Mecânico Montador": `${EMOJI_WORKER} Mecânico montador`,
    "Auxiliar de Elétrica": `${EMOJI_WORKER} Auxiliar de elétrica`,
    Eletricista: `${EMOJI_WORKER} Eletricista`,
  },
};

const executionRoles: Record<string, string[]> = {
  "ÁREA GABIÃO": ["Polivalente", "Meia Oficial", "Ajudante"],
  "ROÇAGEM E PODAGEM": [
    "Polivalente",
    "Jardineiro",
    "Ajudante",
    "Motorista do Pipa",
    "Motorista do Munck",
    "Sinaleiro",
    "Mecânico Montador",
    "Auxiliar de Elétrica",
    "Eletricista",
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
    area: "jardinagem" as "gabiao" | "jardinagem",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rhSearch, setRhSearch] = useState("");
  const [showRhList, setShowRhList] = useState(false);

  // Load RH employees from efetivoData + localStorage
  const rhColaboradores = useMemo(() => {
    const stored = localStorage.getItem("rh_colaboradores");
    if (stored) {
      try {
        return JSON.parse(stored) as Array<{ id: number; nome: string; funcao: string }>;
      } catch {}
    }
    return colaboradoresAtivos;
  }, [dialogOpen]);

  // Map RH funcao to attendance role
  const mapFuncaoToRole = (funcao: string): string => {
    const mapping: Record<string, string> = {
      "OFICIAL POLIVALENTE": "Polivalente",
      "MEIO OFICIAL": "Meia Oficial",
      "AJUDANTE": "Ajudante",
      "JARDINEIRO": "Jardineiro",
      "MOTORISTA DE CAMINHÃO PIPA": "Motorista do Pipa",
      "MOTORISTA DE CAMINHÃO MUNCK": "Motorista do Munck",
      "SINALEIRO RIGGER": "Sinaleiro",
      "MECANICO": "Mecânico Montador",
      "AJUDANTE DE ELETRICISTA": "Auxiliar de Elétrica",
      "ELETRICISTA": "Eletricista",
    };
    return mapping[funcao.toUpperCase()] || "";
  };


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
    // First check if employee has area field set (new employees)
    const employeeArea = (employee as Tables<"employees"> & { area?: string }).area;
    if (employeeArea === "gabiao") return "ÁREA GABIÃO";
    if (employeeArea === "jardinagem") return "ROÇAGEM E PODAGEM";
    
    // Fallback to role-based logic for existing employees without area set
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
    if (!attendance) return EMOJI_CHECK;
    return attendance.status === "present" ? EMOJI_CHECK : EMOJI_CROSS;
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
        area: newEmployee.area,
      });

      if (error) throw error;

      toast.success("Funcionário adicionado!");
      setNewEmployee({ name: "", role: "", area: "jardinagem" });
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
      ? `${EMOJI_ASTERISK_8}  ÁREA GABIÃO  ${EMOJI_ASTERISK_8}` 
      : `${EMOJI_HERB} ROÇAGEM E PODAGEM ${EMOJI_HERB}`;

    let report = "";

    // Add date for both areas
    if (includeDate) {
      report += `${EMOJI_CALENDAR} Data: ${formatDateForReport(selectedDate)}\n\n`;
    }

    report += `${header}\n\n`;
    report += `${EMOJI_STAR_8}EQUIPE DE SUPORTE${EMOJI_STAR_8}\n\n`;
    report += `${EMOJI_PERSON_RAISING_HAND} TST : ${support.tst}\n\n`;
    report += `${EMOJI_PERSON_RAISING_HAND} ENC GERAL: ${support.encGeral}\n\n`;
    report += `${EMOJI_PERSON_RAISING_HAND} ENC: ${support.enc}\n\n`;
    report += `${EMOJI_STAR_8}EQUIPE DE EXECUÇÃO${EMOJI_STAR_8}\n\n`;

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

  // Convert name to Title Case (only first letter of each word capitalized)
  const toTitleCase = (name: string): string => {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Generate report for RDO (with employee names)
  const generateAreaReportForRDO = (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM") => {
    if (!allEmployees) return "";

    // Using Unicode escape sequences for WhatsApp compatibility
    const header = area === "ÁREA GABIÃO" 
      ? `${EMOJI_ASTERISK_8} ÁREA GABIÃO ${EMOJI_ASTERISK_8}` 
      : `${EMOJI_HERB} ROÇAGEM E PODAGEM ${EMOJI_HERB}`;

    let report = "";

    report += `${header}\n\n`;
    report += `${EMOJI_STAR_8} EQUIPE DE EXECUÇÃO ${EMOJI_STAR_8}\n\n`;

    const roles = executionRoles[area];
    roles.forEach((role) => {
      const label = roleLabels[area][role];
      const employees = groupedEmployees[area][role] || [];
      const presentEmployees = employees.filter((emp) => isPresent(emp.id));
      
      if (employees.length > 0 && presentEmployees.length > 0) {
        // Remove emoji and colon from label for cleaner display
        const cleanLabel = label.replace(/^.{1,2}\s*/g, '').replace(/:$/, '');
        report += `${EMOJI_WORKER} ${cleanLabel}: ${presentEmployees.length}\n`;
        // Add employee names with Title Case formatting
        presentEmployees.forEach((emp) => {
          report += `   • ${toTitleCase(emp.name)}\n`;
        });
        report += "\n";
      }
    });

    return report.trim();
  };

  // Generate full report or selected area
  const generateReport = useMemo(() => {
    if (!allEmployees) return "";

    const dateHeader = `${EMOJI_CALENDAR} Data: ${formatDateForReport(selectedDate)}\n\n`;

    if (selectedArea === "ÁREA GABIÃO") {
      return dateHeader + generateAreaReport("ÁREA GABIÃO", false);
    }
    if (selectedArea === "ROÇAGEM E PODAGEM") {
      return dateHeader + generateAreaReport("ROÇAGEM E PODAGEM", false);
    }

    // All areas - date is included in the first area
    return generateAreaReport("ÁREA GABIÃO", true) + "\n\n" + generateAreaReport("ROÇAGEM E PODAGEM", false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEmployees, groupedEmployees, attendanceMap, selectedArea, supportGabiao, supportRocagem, selectedDate]);

  const handleWhatsApp = async () => {
    const ok = await copyAndShareWhatsApp(generateReport);
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(generateReport);
    if (ok) {
      setCopied(true);
      toast.success("Relatório copiado!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Erro ao copiar");
    }
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
            <span className="text-xl">{present ? EMOJI_CHECK : EMOJI_CROSS}</span>
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
          {EMOJI_STAR_8} EQUIPE DE SUPORTE {EMOJI_STAR_8}
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0">{EMOJI_PERSON_RAISING_HAND} TST:</span>
            <Input
              value={support.tst}
              onChange={(e) => setSupport({ ...support, tst: e.target.value })}
              className="h-8 text-sm bg-background"
              placeholder="Nome do TST"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0">{EMOJI_PERSON_RAISING_HAND} ENC GERAL:</span>
            <Input
              value={support.encGeral}
              onChange={(e) => setSupport({ ...support, encGeral: e.target.value })}
              className="h-8 text-sm bg-background"
              placeholder="Nome do ENC Geral"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-24 shrink-0">{EMOJI_PERSON_RAISING_HAND} ENC:</span>
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
    const emoji = area === "ÁREA GABIÃO" ? EMOJI_ASTERISK_8 : EMOJI_HERB;
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
          {EMOJI_STAR_8} EQUIPE DE EXECUÇÃO {EMOJI_STAR_8}
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
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-4xl font-bold mb-2">Relatório de Presença</h1>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Clique para alternar {EMOJI_CHECK} / {EMOJI_CROSS} e edite a equipe de suporte
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
                <div>
                  <Label htmlFor="area">Área</Label>
                  <Select
                    value={newEmployee.area}
                    onValueChange={(value: "gabiao" | "jardinagem") =>
                      setNewEmployee({ ...newEmployee, area: value })
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione a área" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="gabiao">Área Gabião</SelectItem>
                      <SelectItem value="jardinagem">Roçagem e Podagem</SelectItem>
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
            
            {/* Area-specific copy buttons */}
            <div className="flex flex-wrap gap-2">
              {showGabiaoTab && (
                <>
                  <Button
                    onClick={async () => {
                      const ok = await copyAndShareWhatsApp(generateAreaReport("ÁREA GABIÃO"));
                      if (ok) toast.success("Gabião enviado para WhatsApp!");
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    WhatsApp Gabião
                  </Button>
                  <Button
                    onClick={async () => {
                      const ok = await copyToClipboard(generateAreaReport("ÁREA GABIÃO"));
                      if (ok) toast.success("Relatório Gabião copiado!");
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Gabião
                  </Button>


                </>
              )}
              {showRocagemTab && (
                <>
                  <Button
                    onClick={async () => {
                      const ok = await copyAndShareWhatsApp(generateAreaReport("ROÇAGEM E PODAGEM"));
                      if (ok) toast.success("Roçagem enviado para WhatsApp!");
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    WhatsApp Roçagem
                  </Button>
                  <Button
                    onClick={async () => {
                      const ok = await copyToClipboard(generateAreaReport("ROÇAGEM E PODAGEM"));
                      if (ok) toast.success("Relatório Roçagem copiado!");
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Roçagem
                  </Button>


                </>
              )}
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
                    <TabsTrigger value="gabiao">{EMOJI_ASTERISK_8} Área Gabião</TabsTrigger>
                  )}
                  {showRocagemTab && (
                    <TabsTrigger value="rocagem">{EMOJI_HERB} Roçagem e Podagem</TabsTrigger>
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
                  <h2 className="font-semibold mb-4 text-lg">
                    {EMOJI_ASTERISK_8} Relatório Área Gabião
                  </h2>
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
                  <h2 className="font-semibold mb-4 text-lg">
                    {EMOJI_HERB} Relatório Roçagem e Podagem
                  </h2>
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
