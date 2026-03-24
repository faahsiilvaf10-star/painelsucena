import { useState, useMemo, useEffect } from "react";
import { FileText, Copy, Loader2, Check, UserPlus, Pencil, Save, Lock, Unlock, Trash2, MessageCircle, Search } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
// Employee data fetched from DB employees table
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
  "Aux Administrativo": "ADMINISTRATIVO",
  "Auxiliar Administrativo": "ADMINISTRATIVO",
  "Encarregado Geral": "ADMINISTRATIVO",
  "Encarregado": "ADMINISTRATIVO",
  "TST": "ADMINISTRATIVO",
  "Técnico de Segurança": "ADMINISTRATIVO",
  "Almoxarife": "ADMINISTRATIVO",
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
  "ADMINISTRATIVO": {
    "Aux Administrativo": `${EMOJI_WORKER} Aux Administrativo:`,
    "Auxiliar Administrativo": `${EMOJI_WORKER} Auxiliar Administrativo:`,
    "Encarregado Geral": `${EMOJI_WORKER} Encarregado Geral:`,
    "Encarregado": `${EMOJI_WORKER} Encarregado:`,
    "TST": `${EMOJI_WORKER} TST:`,
    "Técnico de Segurança": `${EMOJI_WORKER} Técnico de Segurança:`,
    "Almoxarife": `${EMOJI_WORKER} Almoxarife:`,
    _other: `${EMOJI_WORKER}`,
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
  "ADMINISTRATIVO": [
    "Aux Administrativo",
    "Auxiliar Administrativo",
    "Encarregado Geral",
    "Encarregado",
    "TST",
    "Técnico de Segurança",
    "Almoxarife",
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
  "ADMINISTRATIVO": "administrativo",
};

const RelatorioPresenca = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return getBrazilNorthTodayString();
  });
  const [copied, setCopied] = useState(false);
  const [selectedArea, setSelectedArea] = useState<"all" | "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" | "ADMINISTRATIVO">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    role: "",
    area: "jardinagem" as "gabiao" | "jardinagem" | "administrativo",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rhSearch, setRhSearch] = useState("");
  const [showRhList, setShowRhList] = useState(false);

  // rhColaboradores is computed after allEmployees query below

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();

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
    const mapped = mapping[normalizeText(funcao)];
    if (mapped) return mapped;
    return funcao
      .toLowerCase()
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const mapRoleToArea = (role: string): "gabiao" | "jardinagem" =>
    roleToArea[role] === "ÁREA GABIÃO" ? "gabiao" : "jardinagem";

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
  const showAdminTab = true; // Always show Administrativo tab
  
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

  // Load RH employees from DB employees table
  const rhColaboradores = useMemo(() => {
    if (!allEmployees?.length) return [];
    return allEmployees
      .filter(e => e.status === "active")
      .map(e => ({ id: e.id as unknown as number, nome: e.name, funcao: e.role }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allEmployees]);

  // Filter RH employees for search
  const filteredRhEmployees = useMemo(() => {
    if (!rhSearch.trim()) return [];
    
    // Search active DB employees
    const dbEmployees = rhColaboradores
      .filter(c => c.nome.toUpperCase().includes(rhSearch.toUpperCase()))
      .map(c => ({ ...c, fromDb: true }));
    
    return dbEmployees.slice(0, 15);
  }, [rhSearch, rhColaboradores, allEmployees]);

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
    if (employeeArea === "administrativo") return "ADMINISTRATIVO";
    
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
    if (!allEmployees) return { "ÁREA GABIÃO": {}, "ROÇAGEM E PODAGEM": {}, "ADMINISTRATIVO": {} };

    const grouped: Record<string, Record<string, Tables<"employees">[]>> = {
      "ÁREA GABIÃO": {},
      "ROÇAGEM E PODAGEM": {},
      "ADMINISTRATIVO": {},
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

  const handleSaveAreaReport = async (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" | "ADMINISTRATIVO") => {
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
      } else if (area === "ROÇAGEM E PODAGEM") {
        const efetivoJardinagemText = generateAreaReportForRDO("ROÇAGEM E PODAGEM");
        await saveEfetivoToRDO.mutateAsync({
          report_date: selectedDate,
          efetivo_gabiao_text: "",
          efetivo_jardinagem_text: efetivoJardinagemText,
        });
      }
      // ADMINISTRATIVO doesn't save to RDO

      // Lock the specific area
      await lockArea.mutateAsync(lockType);
      toast.success(`Relatório ${area === "ÁREA GABIÃO" ? "Gabião" : "Jardinagem"} salvo!`);
    } catch {
      toast.error("Erro ao salvar relatório");
    }
  };

  const handleUnlockAreaReport = async (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" | "ADMINISTRATIVO") => {
    const lockType = areaToLockType[area];
    const areaNames: Record<string, string> = { "ÁREA GABIÃO": "Gabião", "ROÇAGEM E PODAGEM": "Jardinagem", "ADMINISTRATIVO": "Administrativo" };
    try {
      await unlockArea.mutateAsync(lockType);
      toast.success(`Área ${areaNames[area]} desbloqueada.`);
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
  const generateAreaReport = (area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" | "ADMINISTRATIVO", includeDate: boolean = true) => {
    if (!allEmployees) return "";

    const areaHeaders: Record<string, string> = {
      "ÁREA GABIÃO": `${EMOJI_ASTERISK_8}  ÁREA GABIÃO  ${EMOJI_ASTERISK_8}`,
      "ROÇAGEM E PODAGEM": `${EMOJI_HERB} ROÇAGEM E PODAGEM ${EMOJI_HERB}`,
      "ADMINISTRATIVO": `📋 ADMINISTRATIVO 📋`,
    };
    const header = areaHeaders[area];

    let report = "";

    if (includeDate) {
      report += `${EMOJI_CALENDAR} Data: ${formatDateForReport(selectedDate)}\n\n`;
    }

    report += `${header}\n\n`;

    // Only show support team for non-administrative areas
    if (area !== "ADMINISTRATIVO") {
      const support = area === "ÁREA GABIÃO" ? supportGabiao : supportRocagem;
      report += `${EMOJI_STAR_8}EQUIPE DE SUPORTE${EMOJI_STAR_8}\n\n`;
      report += `${EMOJI_PERSON_RAISING_HAND} TST : ${support.tst}\n\n`;
      report += `${EMOJI_PERSON_RAISING_HAND} ENC GERAL: ${support.encGeral}\n\n`;
      report += `${EMOJI_PERSON_RAISING_HAND} ENC: ${support.enc}\n\n`;
    }

    report += `${EMOJI_STAR_8}EQUIPE${area === "ADMINISTRATIVO" ? "" : " DE EXECUÇÃO"}${EMOJI_STAR_8}\n\n`;

    // For ADMINISTRATIVO, use dynamic roles from grouped employees
    const roles = area === "ADMINISTRATIVO" 
      ? Object.keys(groupedEmployees[area] || {})
      : executionRoles[area];
    roles.forEach((role) => {
      const label = roleLabels[area]?.[role] || `${EMOJI_WORKER} ${role}:`;
      const employees = groupedEmployees[area]?.[role] || [];
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

  const EmployeeRow = ({ employee, area }: { employee: Tables<"employees">; area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" | "ADMINISTRATIVO" }) => {
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
    area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" | "ADMINISTRATIVO";
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

  const AreaCard = ({ area }: { area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM" | "ADMINISTRATIVO" }) => {
    const areaEmojis: Record<string, string> = { "ÁREA GABIÃO": EMOJI_ASTERISK_8, "ROÇAGEM E PODAGEM": EMOJI_HERB, "ADMINISTRATIVO": "📋" };
    const areaNames: Record<string, string> = { "ÁREA GABIÃO": "Gabião", "ROÇAGEM E PODAGEM": "Jardinagem", "ADMINISTRATIVO": "Administrativo" };
    const emoji = areaEmojis[area];
    const lockType = areaToLockType[area];
    const locked = isAreaLocked(lockType);
    const canUnlock = canUnlockArea(lockType);
    const isAdminArea = area === "ADMINISTRATIVO";

    // For ADMINISTRATIVO, dynamically get all roles present in grouped employees
    const areaRoles = isAdminArea
      ? Object.keys(groupedEmployees[area] || {})
      : executionRoles[area];

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
        {!isAdminArea && (
          <>
            <SupportTeamEditor 
              support={area === "ÁREA GABIÃO" ? supportGabiao : supportRocagem} 
              setSupport={area === "ÁREA GABIÃO" ? setSupportGabiao : setSupportRocagem} 
            />
            <p className="text-sm font-semibold text-center mb-4">
              {EMOJI_STAR_8} EQUIPE DE EXECUÇÃO {EMOJI_STAR_8}
            </p>
          </>
        )}
        {isAdminArea && (
          <p className="text-sm font-semibold text-center mb-4">
            {EMOJI_STAR_8} EQUIPE {EMOJI_STAR_8}
          </p>
        )}
        {areaRoles.map((role) => (
          <RoleSection
            key={role}
            label={roleLabels[area]?.[role] || `${EMOJI_WORKER} ${role}:`}
            employees={groupedEmployees[area]?.[role] || []}
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
              Salvar {areaNames[area]}
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
                  Desbloquear {areaNames[area]}
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
                <DialogDescription>Busque na lista do RH ou digite manualmente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* RH Search */}
                <div className="relative">
                  <Label htmlFor="rh-search">Buscar no RH</Label>
                  <Input
                    id="rh-search"
                    placeholder="Digite o nome para buscar no RH..."
                    value={rhSearch}
                    onChange={(e) => {
                      setRhSearch(e.target.value);
                      setShowRhList(true);
                    }}
                    onFocus={() => setShowRhList(true)}
                  />
                  {showRhList && filteredRhEmployees.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredRhEmployees.map((emp, idx) => (
                        <button
                          key={`${emp.id}-${idx}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                          onClick={() => {
                            const role = (emp as any).fromDb ? emp.funcao : mapFuncaoToRole(emp.funcao);
                            setNewEmployee((prev) => ({
                              ...prev,
                              name: emp.nome,
                              role: role,
                              area: mapRoleToArea(role),
                            }));
                            setRhSearch("");
                            setShowRhList(false);
                          }}
                        >
                          <span className="font-medium">{emp.nome}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({emp.funcao})</span>
                          {(emp as any).fromDb && <span className="ml-1 text-xs text-primary">[RH]</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {showRhList && rhSearch.trim() && filteredRhEmployees.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="text-sm text-muted-foreground">Nenhum funcionário encontrado no RH</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo"
                    value={newEmployee.name}
                    onChange={(e) => {
                      const typedName = e.target.value;
                      const match = rhColaboradores.find(
                        (c) => normalizeText(c.nome) === normalizeText(typedName)
                      );

                      if (match) {
                        const mappedRole = mapFuncaoToRole(match.funcao);
                        setNewEmployee((prev) => ({
                          ...prev,
                          name: typedName,
                          role: mappedRole,
                          area: mapRoleToArea(mappedRole),
                        }));
                        return;
                      }

                      setNewEmployee((prev) => ({ ...prev, name: typedName }));
                    }}
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
                      {[...new Set([...allRoles, ...(newEmployee.role && !allRoles.includes(newEmployee.role) ? [newEmployee.role] : [])])].map((role) => (
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
                      <SelectItem value="administrativo">Administrativo</SelectItem>
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
              {showAdminTab && (
                <>
                  <Button
                    onClick={async () => {
                      const ok = await copyAndShareWhatsApp(generateAreaReport("ADMINISTRATIVO"));
                      if (ok) toast.success("Administrativo enviado para WhatsApp!");
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    WhatsApp Admin
                  </Button>
                  <Button
                    onClick={async () => {
                      const ok = await copyToClipboard(generateAreaReport("ADMINISTRATIVO"));
                      if (ok) toast.success("Relatório Administrativo copiado!");
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Admin
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
                <TabsList className={`grid w-full ${[showGabiaoTab, showRocagemTab, showAdminTab].filter(Boolean).length === 3 ? 'grid-cols-3' : [showGabiaoTab, showRocagemTab, showAdminTab].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showGabiaoTab && (
                    <TabsTrigger value="gabiao">{EMOJI_ASTERISK_8} Área Gabião</TabsTrigger>
                  )}
                  {showRocagemTab && (
                    <TabsTrigger value="rocagem">{EMOJI_HERB} Roçagem e Podagem</TabsTrigger>
                  )}
                  {showAdminTab && (
                    <TabsTrigger value="administrativo">📋 Administrativo</TabsTrigger>
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
                {showAdminTab && (
                  <TabsContent value="administrativo" className="mt-4">
                    <AreaCard area="ADMINISTRATIVO" />
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Report Preview - Separated by Area */}
            <div className="space-y-6">
              {/* Área Gabião Report */}
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

              {/* Roçagem e Podagem Report */}
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

              {/* Administrativo Report */}
              {showAdminTab && (
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h2 className="font-semibold mb-4 text-lg">
                    📋 Relatório Administrativo
                  </h2>
                  <Textarea
                    value={generateAreaReport("ADMINISTRATIVO")}
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
