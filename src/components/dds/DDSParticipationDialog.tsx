import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Search, Save, Loader2, Users } from "lucide-react";
import { useDDSParticipation, useSaveDDSParticipation } from "@/hooks/useDDSParticipation";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // YYYY-MM-DD
}

export const DDSParticipationDialog = ({ open, onOpenChange, date }: Props) => {
  const { data: rhData } = useRHEfetivo();
  const { data: existing, isLoading } = useDDSParticipation(date);
  const saveMutation = useSaveDDSParticipation();
  const { data: profile } = useProfile();
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  const employees = useMemo(() => {
    if (!rhData) return [];
    const deleted = new Set(rhData.deletedIds);
    return rhData.colaboradores
      .filter((c) => !deleted.has(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);

  // Initialize attendance from existing records or default all to false
  useEffect(() => {
    if (!open) return;
    const map: Record<string, boolean> = {};
    employees.forEach((e) => {
      map[e.nome] = false;
    });
    if (existing) {
      existing.forEach((r) => {
        map[r.employee_name] = r.present;
      });
    }
    setAttendance(map);
    setSearch("");
  }, [open, existing, employees]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) => e.nome.toLowerCase().includes(q));
  }, [employees, search]);

  const toggle = (name: string) => {
    setAttendance((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const markAll = (present: boolean) => {
    const map: Record<string, boolean> = {};
    employees.forEach((e) => {
      map[e.nome] = present;
    });
    setAttendance(map);
  };

  const handleSave = async () => {
    if (!profile) return;
    const participants = Object.entries(attendance).map(([name, present]) => ({
      name,
      present,
    }));
    try {
      await saveMutation.mutateAsync({ date, participants, userId: profile.user_id });
      toast.success("Lista de presença do DDS salva!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar lista");
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = employees.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Lista de Presença DDS
        </DialogTitle>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-green-600">{presentCount} presentes</span>
          <span>de {totalCount} colaboradores</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAll(true)} className="text-xs">
            <Check className="h-3 w-3 mr-1" /> Marcar todos
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAll(false)} className="text-xs">
            <X className="h-3 w-3 mr-1" /> Desmarcar todos
          </Button>
        </div>

        {/* Employee list */}
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-lg overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((emp) => {
                const present = attendance[emp.nome] ?? false;
                return (
                  <button
                    key={emp.id}
                    onClick={() => toggle(emp.nome)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div
                      className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                        present
                          ? "bg-green-500 text-white"
                          : "bg-red-100 dark:bg-red-900/30 text-red-500"
                      }`}
                    >
                      {present ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.nome}</p>
                      <p className="text-xs text-muted-foreground">{emp.funcao}</p>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">
                  Nenhum colaborador encontrado
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Save */}
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Lista
        </Button>
      </DialogContent>
    </Dialog>
  );
};
