import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Search, Save, Loader2, Users, ChevronDown, FileText } from "lucide-react";
import { useDDSParticipation, useSaveDDSParticipation, AbsenceReason } from "@/hooks/useDDSParticipation";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getLogoBase64, generatePdfHeader, PDF_HEADER_STYLES } from "@/lib/pdfLogo";
import { downloadPdfFromHtml } from "@/lib/pdfDownload";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}

const ABSENCE_LABELS: Record<AbsenceReason, string> = {
  falta: "Falta",
  atestado: "Atestado",
  treinamento: "Treinamento",
  exame: "Exame",
  folga: "Folga",
  afastado: "Afastado",
};

const ABSENCE_COLORS: Record<AbsenceReason, string> = {
  falta: "bg-red-500 text-white",
  atestado: "bg-yellow-500 text-white",
  treinamento: "bg-blue-500 text-white",
  exame: "bg-purple-500 text-white",
  folga: "bg-orange-500 text-white",
  afastado: "bg-gray-500 text-white",
};

interface AttendanceState {
  present: boolean;
  absence_reason: AbsenceReason | null;
}

export const DDSParticipationDialog = ({ open, onOpenChange, date }: Props) => {
  const { data: rhData } = useRHEfetivo();
  const { data: existing, isLoading } = useDDSParticipation(date);
  const saveMutation = useSaveDDSParticipation();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({});
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const employees = useMemo(() => {
    if (!rhData) return [];
    const deleted = new Set(rhData.deletedIds);
    return rhData.colaboradores
      .filter((c) => !deleted.has(c.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rhData]);

  useEffect(() => {
    if (!open) return;
    const map: Record<string, AttendanceState> = {};
    employees.forEach((e) => {
      map[e.nome] = { present: false, absence_reason: null };
    });
    if (existing) {
      existing.forEach((r) => {
        map[r.employee_name] = {
          present: r.present,
          absence_reason: (r.absence_reason as AbsenceReason) || null,
        };
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

  const togglePresent = (name: string) => {
    setAttendance((prev) => {
      const cur = prev[name];
      if (cur?.present) {
        return { ...prev, [name]: { present: false, absence_reason: "falta" } };
      }
      return { ...prev, [name]: { present: true, absence_reason: null } };
    });
  };

  const setAbsenceReason = (name: string, reason: AbsenceReason) => {
    setAttendance((prev) => ({
      ...prev,
      [name]: { present: false, absence_reason: reason },
    }));
  };

  const markAll = (present: boolean) => {
    const map: Record<string, AttendanceState> = {};
    employees.forEach((e) => {
      map[e.nome] = { present, absence_reason: present ? null : "falta" };
    });
    setAttendance(map);
  };

  const handleSave = async () => {
    if (!profile) return;
    const participants = Object.entries(attendance).map(([name, state]) => ({
      name,
      present: state.present,
      absence_reason: state.absence_reason,
    }));
    try {
      await saveMutation.mutateAsync({ date, participants, userId: profile.user_id });
      toast.success("Lista de presença do DDS salva!");
      await generatePdf();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar lista");
    }
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const logoBase64 = await getLogoBase64();
      const formattedDate = date.split("-").reverse().join("/");

      const sortedEntries = Object.entries(attendance).sort(([a], [b]) => a.localeCompare(b));
      const presentList = sortedEntries.filter(([, s]) => s.present);
      const absentList = sortedEntries.filter(([, s]) => !s.present);

      const reasonLabel = (r: AbsenceReason | null) => {
        if (!r) return "Falta";
        return ABSENCE_LABELS[r] || r;
      };

      const html = `
        <html><head><style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #1f2937; }
          ${PDF_HEADER_STYLES}
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-item { padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; }
          .summary-present { background: #dcfce7; color: #166534; }
          .summary-absent { background: #fee2e2; color: #991b1b; }
          .summary-total { background: #f3f4f6; color: #374151; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #1f2937; color: white; padding: 8px 12px; text-align: left; }
          td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
          .badge-present { background: #dcfce7; color: #166534; }
          .badge-falta { background: #fee2e2; color: #991b1b; }
          .badge-atestado { background: #fef3c7; color: #92400e; }
          .badge-treinamento { background: #dbeafe; color: #1e40af; }
          .badge-exame { background: #ede9fe; color: #5b21b6; }
           .badge-folga { background: #ffedd5; color: #9a3412; }
           .badge-afastado { background: #e5e7eb; color: #374151; }
          .section-title { font-size: 14px; font-weight: 700; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e5e7eb; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        </style></head><body>
          ${generatePdfHeader("Lista de Presença - DDS", formattedDate, logoBase64)}
          <div class="summary">
            <div class="summary-item summary-present">✅ Presentes: ${presentList.length}</div>
            <div class="summary-item summary-absent">❌ Ausentes: ${absentList.length}</div>
            <div class="summary-item summary-total">Total: ${sortedEntries.length}</div>
          </div>

          <div class="section-title">Presentes</div>
          <table>
            <thead><tr><th>#</th><th>Colaborador</th><th>Status</th></tr></thead>
            <tbody>
              ${presentList.map(([name], i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${name}</td>
                  <td><span class="badge badge-present">Presente</span></td>
                </tr>
              `).join("")}
              ${presentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nenhum</td></tr>' : ""}
            </tbody>
          </table>

          <div class="section-title">Ausentes</div>
          <table>
            <thead><tr><th>#</th><th>Colaborador</th><th>Motivo</th></tr></thead>
            <tbody>
              ${absentList.map(([name, state], i) => {
                const reason = state.absence_reason || "falta";
                return `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${name}</td>
                    <td><span class="badge badge-${reason}">${reasonLabel(state.absence_reason)}</span></td>
                  </tr>
                `;
              }).join("")}
              ${absentList.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nenhum</td></tr>' : ""}
            </tbody>
          </table>

          <div class="footer">Sucena Engenharia • Lista de Presença DDS • ${formattedDate}</div>
        </body></html>
      `;

      await downloadPdfFromHtml(html, `DDS_Presenca_${date}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const presentCount = Object.values(attendance).filter((s) => s.present).length;
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAll(true)} className="text-xs">
            <Check className="h-3 w-3 mr-1" /> Marcar todos
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAll(false)} className="text-xs">
            <X className="h-3 w-3 mr-1" /> Desmarcar todos
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-lg overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((emp) => {
                const state = attendance[emp.nome] ?? { present: false, absence_reason: null };
                return (
                  <div key={emp.id} className="flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <button
                      onClick={() => togglePresent(emp.nome)}
                      className="flex-shrink-0"
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                          state.present
                            ? "bg-green-500 text-white"
                            : "bg-red-100 dark:bg-red-900/30 text-red-500"
                        }`}
                      >
                        {state.present ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => togglePresent(emp.nome)} role="button">
                      <p className="text-sm font-medium truncate">{emp.nome}</p>
                      <p className="text-xs text-muted-foreground">{emp.funcao}</p>
                    </div>
                    {!state.present && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs h-7 px-2 gap-1 ${
                              state.absence_reason ? ABSENCE_COLORS[state.absence_reason] : ""
                            }`}
                          >
                            {state.absence_reason ? ABSENCE_LABELS[state.absence_reason] : "Motivo"}
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(Object.keys(ABSENCE_LABELS) as AbsenceReason[]).map((reason) => (
                            <DropdownMenuItem
                              key={reason}
                              onClick={() => setAbsenceReason(emp.nome, reason)}
                              className="text-xs"
                            >
                              {ABSENCE_LABELS[reason]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
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

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saveMutation.isPending || generatingPdf} className="flex-1">
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Lista
          </Button>
          <Button
            variant="outline"
            onClick={generatePdf}
            disabled={generatingPdf || Object.keys(attendance).length === 0}
            className="gap-1"
          >
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
