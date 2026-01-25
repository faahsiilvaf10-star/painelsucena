import { useState, useMemo, useCallback } from "react";
import { Search, Plus } from "lucide-react";
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
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format } from "date-fns";
import EmployeeCard from "@/components/rh/EmployeeCard";
import EmployeeForm from "@/components/rh/EmployeeForm";
import EmployeeCardSkeleton from "@/components/rh/EmployeeCardSkeleton";

const departments = ["Operações", "Transporte", "Manutenção"];

const RH = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [vacationDueDate, setVacationDueDate] = useState<Date>();
  const [examScheduled, setExamScheduled] = useState<Date>();
  const [selectedNrs, setSelectedNrs] = useState<string[]>([]);

  const { data: employees = [], isLoading } = useEmployees();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  // Check if user can edit (aux_administrativo, preposto, or admin)
  const canEdit = isAdmin || profile?.cargo === "preposto" || profile?.cargo === "aux_administrativo";

  // Memoize filtered employees to avoid recalculating on every render
  const filteredEmployees = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchLower) ||
        employee.role.toLowerCase().includes(searchLower);
      const matchesDepartment =
        filterDepartment === "all" || employee.department === filterDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, filterDepartment]);

  const resetForm = useCallback(() => {
    setName("");
    setRole("");
    setDepartment("");
    setStartDate(undefined);
    setVacationDueDate(undefined);
    setExamScheduled(undefined);
    setSelectedNrs([]);
  }, []);

  const handleAddEmployee = useCallback(async () => {
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
  }, [name, role, department, startDate, vacationDueDate, examScheduled, selectedNrs, createEmployee, resetForm]);

  const handleEditEmployee = useCallback(async () => {
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
  }, [editingEmployee, name, role, department, startDate, vacationDueDate, examScheduled, selectedNrs, updateEmployee, resetForm]);

  const handleDeleteEmployee = useCallback(async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;
    
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success("Funcionário excluído com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir funcionário");
    }
  }, [deleteEmployee]);

  const openEditDialog = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setName(employee.name);
    setRole(employee.role);
    setDepartment(employee.department);
    setStartDate(employee.start_date ? new Date(employee.start_date) : undefined);
    setVacationDueDate(employee.vacation_due_date ? new Date(employee.vacation_due_date) : undefined);
    setExamScheduled(employee.exam_scheduled ? new Date(employee.exam_scheduled) : undefined);
    setSelectedNrs(employee.nrs || []);
    setIsEditDialogOpen(true);
  }, []);

  const toggleNr = useCallback((nr: string) => {
    setSelectedNrs(prev => 
      prev.includes(nr) 
        ? prev.filter(n => n !== nr)
        : [...prev, nr]
    );
  }, []);

  const handleEditDialogChange = useCallback((open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingEmployee(null);
      resetForm();
    }
  }, [resetForm]);

  // Memoize skeleton array to avoid recreating on each render
  const skeletons = useMemo(() => Array.from({ length: 6 }), []);

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

          {canEdit && (
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
                <EmployeeForm
                  name={name}
                  setName={setName}
                  role={role}
                  setRole={setRole}
                  department={department}
                  setDepartment={setDepartment}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  vacationDueDate={vacationDueDate}
                  setVacationDueDate={setVacationDueDate}
                  examScheduled={examScheduled}
                  setExamScheduled={setExamScheduled}
                  selectedNrs={selectedNrs}
                  toggleNr={toggleNr}
                  onSubmit={handleAddEmployee}
                  isPending={createEmployee.isPending}
                />
              </DialogContent>
            </Dialog>
          )}
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

        {/* Loading state with skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skeletons.map((_, i) => (
              <EmployeeCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Employee Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                canEdit={canEdit}
                onEdit={openEditDialog}
                onDelete={handleDeleteEmployee}
              />
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
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
          <DialogContent className="bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Funcionário</DialogTitle>
              <DialogDescription>
                Atualize os dados do funcionário
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              isEdit
              name={name}
              setName={setName}
              role={role}
              setRole={setRole}
              department={department}
              setDepartment={setDepartment}
              startDate={startDate}
              setStartDate={setStartDate}
              vacationDueDate={vacationDueDate}
              setVacationDueDate={setVacationDueDate}
              examScheduled={examScheduled}
              setExamScheduled={setExamScheduled}
              selectedNrs={selectedNrs}
              toggleNr={toggleNr}
              onSubmit={handleEditEmployee}
              isPending={updateEmployee.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RH;
