import { useState } from "react";
import { Search, Plus, Calendar, Clock, Stethoscope, Shield, Pencil, Trash2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/hooks/useEmployees";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, differenceInMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusLabels = {
  active: { label: "Ativo", class: "bg-success/20 text-success" },
  vacation: { label: "Férias", class: "bg-info/20 text-info" },
  leave: { label: "Licença", class: "bg-warning/20 text-warning" },
};

const departments = ["Operações", "Transporte", "Manutenção"];

const nrOptions = [
  "NR-05", "NR-06", "NR-10", "NR-11", "NR-12", "NR-18", 
  "NR-33", "NR-35", "NR-36"
];

const RH = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [vacationDueDate, setVacationDueDate] = useState<Date>();
  const [examScheduled, setExamScheduled] = useState<Date>();
  const [selectedNrs, setSelectedNrs] = useState<string[]>([]);

  const { data: employees = [], isLoading } = useEmployees();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  // Check if user has access (preposto or aux_administrativo)
  const hasAccess = profile?.cargo === "preposto" || profile?.cargo === "aux_administrativo";

  // If still loading, show loading state
  if (authLoading || profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If user doesn't have access, show access denied
  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Shield className="w-16 h-16 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Acesso Restrito</h1>
            <p className="text-muted-foreground text-center">
              Esta página é restrita para usuários com cargo de Preposto ou Auxiliar Administrativo.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || employee.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const calculateVacationStatus = (startDate: string, vacationDueDate?: string | null) => {
    const start = new Date(startDate);
    const now = new Date();
    const monthsWorked = differenceInMonths(now, start);
    
    if (vacationDueDate) {
      const dueDate = new Date(vacationDueDate);
      const monthsUntilVacation = differenceInMonths(dueDate, now);
      if (monthsUntilVacation <= 0) return "Férias vencidas!";
      return `${monthsUntilVacation} meses para férias`;
    }
    
    // Default: 12 months from start date
    const defaultDue = addMonths(start, 12);
    const monthsUntil = differenceInMonths(defaultDue, now);
    if (monthsUntil <= 0) return "Férias vencidas!";
    return `${monthsUntil} meses para férias`;
  };

  const resetForm = () => {
    setName("");
    setRole("");
    setDepartment("");
    setStartDate(undefined);
    setVacationDueDate(undefined);
    setExamScheduled(undefined);
    setSelectedNrs([]);
  };

  const handleAddEmployee = async () => {
    if (!name || !role || !department) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await createEmployee.mutateAsync({
        name,
        role,
        department,
        avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        vacation_due_date: vacationDueDate ? format(vacationDueDate, "yyyy-MM-dd") : undefined,
        exam_scheduled: examScheduled ? format(examScheduled, "yyyy-MM-dd") : undefined,
        nrs: selectedNrs.length > 0 ? selectedNrs : undefined,
      });
      toast.success("Funcionário adicionado com sucesso!");
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erro ao adicionar funcionário");
    }
  };

  const handleEditEmployee = async () => {
    if (!editingEmployee || !name || !role || !department) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await updateEmployee.mutateAsync({
        id: editingEmployee.id,
        name,
        role,
        department,
        avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
        vacation_due_date: vacationDueDate ? format(vacationDueDate, "yyyy-MM-dd") : null,
        exam_scheduled: examScheduled ? format(examScheduled, "yyyy-MM-dd") : null,
        nrs: selectedNrs.length > 0 ? selectedNrs : null,
      });
      toast.success("Funcionário atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
    } catch (error) {
      toast.error("Erro ao atualizar funcionário");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;
    
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success("Funcionário excluído com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir funcionário");
    }
  };

  const openEditDialog = (employee: any) => {
    setEditingEmployee(employee);
    setName(employee.name);
    setRole(employee.role);
    setDepartment(employee.department);
    setStartDate(employee.start_date ? new Date(employee.start_date) : undefined);
    setVacationDueDate(employee.vacation_due_date ? new Date(employee.vacation_due_date) : undefined);
    setExamScheduled(employee.exam_scheduled ? new Date(employee.exam_scheduled) : undefined);
    setSelectedNrs(employee.nrs || []);
    setIsEditDialogOpen(true);
  };

  const toggleNr = (nr: string) => {
    setSelectedNrs(prev => 
      prev.includes(nr) 
        ? prev.filter(n => n !== nr)
        : [...prev, nr]
    );
  };

  const EmployeeForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome completo *</Label>
        <Input 
          id="name" 
          placeholder="Nome do funcionário" 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Cargo *</Label>
        <Input 
          id="role" 
          placeholder="Ex: Polivalente" 
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="department">Departamento *</Label>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o departamento" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-2">
        <Label>Data de Admissão</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label>Data Limite para Férias</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !vacationDueDate && "text-muted-foreground"
              )}
            >
              <Clock className="mr-2 h-4 w-4" />
              {vacationDueDate ? format(vacationDueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={vacationDueDate}
              onSelect={setVacationDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label>Exame Marcado</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !examScheduled && "text-muted-foreground"
              )}
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              {examScheduled ? format(examScheduled, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={examScheduled}
              onSelect={setExamScheduled}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label>NRs</Label>
        <div className="flex flex-wrap gap-2">
          {nrOptions.map((nr) => (
            <Badge
              key={nr}
              variant={selectedNrs.includes(nr) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleNr(nr)}
            >
              {nr}
            </Badge>
          ))}
        </div>
      </div>

      <Button 
        className="mt-4" 
        onClick={isEdit ? handleEditEmployee : handleAddEmployee}
        disabled={createEmployee.isPending || updateEmployee.isPending}
      >
        {isEdit ? "Salvar Alterações" : "Adicionar"}
      </Button>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Recursos Humanos</h1>
            <p className="text-muted-foreground">
              Gerencie sua equipe de {employees.length} funcionários
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Funcionário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo funcionário
                </DialogDescription>
              </DialogHeader>
              <EmployeeForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cargo..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando funcionários...</p>
          </div>
        )}

        {/* Employee Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee, index) => (
              <div
                key={employee.id}
                className="group bg-card rounded-xl p-6 border border-border/50 hover-lift animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {employee.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                        {employee.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">{employee.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEditDialog(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Admissão: {format(new Date(employee.start_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{calculateVacationStatus(employee.start_date, employee.vacation_due_date)}</span>
                  </div>
                  {employee.exam_scheduled && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Stethoscope className="w-4 h-4" />
                      <span>Exame: {format(new Date(employee.exam_scheduled), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>

                {employee.nrs && employee.nrs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {employee.nrs.map((nr: string) => (
                      <Badge key={nr} variant="secondary" className="text-xs">
                        {nr}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="inline-block px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                    {employee.department}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusLabels[employee.status as keyof typeof statusLabels]?.class || ""
                    }`}
                  >
                    {statusLabels[employee.status as keyof typeof statusLabels]?.label || employee.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum funcionário encontrado
            </p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingEmployee(null);
            resetForm();
          }
        }}>
          <DialogContent className="bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Funcionário</DialogTitle>
              <DialogDescription>
                Atualize os dados do funcionário
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm isEdit />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RH;
