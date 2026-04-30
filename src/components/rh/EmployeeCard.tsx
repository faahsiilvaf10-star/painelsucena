import { memo } from "react";
import { Calendar, Clock, Stethoscope, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmation } from "@/components/ui/DeleteConfirmation";
import { Badge } from "@/components/ui/badge";
import { format, differenceInMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Employee } from "@/hooks/useEmployees";

const statusLabels = {
  active: { label: "Ativo", class: "bg-success/20 text-success" },
  vacation: { label: "Férias", class: "bg-info/20 text-info" },
  leave: { label: "Licença", class: "bg-warning/20 text-warning" },
};

interface EmployeeCardProps {
  employee: Employee;
  canEdit: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

const calculateVacationStatus = (startDate: string, vacationDueDate?: string | null) => {
  const start = new Date(startDate);
  const now = new Date();
  
  if (vacationDueDate) {
    const dueDate = new Date(vacationDueDate);
    const monthsUntilVacation = differenceInMonths(dueDate, now);
    if (monthsUntilVacation <= 0) return "Férias vencidas!";
    return `${monthsUntilVacation} meses para férias`;
  }
  
  const defaultDue = addMonths(start, 12);
  const monthsUntil = differenceInMonths(defaultDue, now);
  if (monthsUntil <= 0) return "Férias vencidas!";
  return `${monthsUntil} meses para férias`;
};

const EmployeeCard = memo(({ employee, canEdit, onEdit, onDelete }: EmployeeCardProps) => {
  return (
    <div className="group bg-card rounded-xl p-6 border border-border/50 hover:shadow-lg transition-shadow">
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
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit(employee)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
              onClick={() => onDelete(employee.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
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
  );
});

EmployeeCard.displayName = "EmployeeCard";

export default EmployeeCard;
