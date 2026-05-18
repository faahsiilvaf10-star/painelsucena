import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Users, Phone, Calendar, Hash, MapPin, Filter, X, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, CircleAlert, Pencil, Save, History, ArrowDownAZ, ArrowUpAZ, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIsAdmin } from "@/hooks/useUserRole";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colaboradoresAtivos as initialColaboradores, funcoes, type Colaborador } from "@/data/efetivoData";
import { AddEmployeeDialog } from "@/components/rh/AddEmployeeDialog";
import { EditColaboradorDialog } from "@/components/rh/EditColaboradorDialog";
import { DeleteEmployeeDialog } from "@/components/rh/DeleteEmployeeDialog";
import { useRHPermissions } from "@/hooks/useRHPermissions";
import { ExportEfetivoPdfButton } from "@/components/rh/ExportEfetivoPdfButton";
import { ExportEfetivoExcelButton } from "@/components/rh/ExportEfetivoExcelButton";
import { ImportEfetivoExcelButton } from "@/components/rh/ImportEfetivoExcelButton";
import { toast } from "sonner";
import { PromotionDialog } from "@/components/rh/PromotionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { getEffectiveAsoExpiry, getEffectiveAsoExpiryStr } from "@/lib/asoValidity";

type SortField = "id" | "nome" | "funcao" | "admissao" | "matricula";
type SortDirection = "asc" | "desc";

const RH = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFuncao, setFilterFuncao] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const { data: rhData, isLoading: rhLoading, saveMutation } = useRHEfetivo();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(initialColaboradores);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [dbRowId, setDbRowId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [editingAso, setEditingAso] = useState<number | null>(null);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [asoForm, setAsoForm] = useState<Record<string, string>>({});

  // Sync state from DB whenever data changes (initial load + realtime updates).
  // We only skip syncing while the user is actively editing the ASO of a row
  // or has the colaborador edit dialog open, to avoid wiping their form.
  useEffect(() => {
    if (!rhData) return;
    const isEditing = editingAso !== null || editingColaborador !== null;
    if (!initialized || !isEditing) {
      setColaboradores(rhData.colaboradores);
      setDeletedIds(rhData.deletedIds);
      setDbRowId(rhData.rowId);
      setInitialized(true);
    }
  }, [rhData, initialized, editingAso, editingColaborador]);

  // Persist to database whenever colaboradores change (after initialization)
  const persistToDb = useCallback((newColaboradores: Colaborador[], newDeletedIds: number[]) => {
    saveMutation.mutate({
      colaboradores: newColaboradores,
      deletedIds: newDeletedIds,
      existingRowId: dbRowId,
    });
  }, [saveMutation, dbRowId]);

  const { canEditRH, isLoading: permissionsLoading } = useRHPermissions();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const handleClearAllEmployees = useCallback(() => {
    setColaboradores([]);
    setDeletedIds([]);
    persistToDb([], []);
    setClearAllOpen(false);
    toast.success("Todo o efetivo foi apagado neste ambiente.");
  }, [persistToDb]);

  const handleAddEmployee = (newEmployee: Omit<Colaborador, "id">) => {
    const maxId = Math.max(...colaboradores.map(c => c.id), 0);
    const employee: Colaborador = {
      ...newEmployee,
      id: maxId + 1,
    };
    const updated = [...colaboradores, employee];
    setColaboradores(updated);
    persistToDb(updated, deletedIds);
  };

  const handleImportEmployees = (updated: Colaborador[]) => {
    setColaboradores(updated);
    setDeletedIds([]);
    persistToDb(updated, []);
  };

  const handleDeleteEmployee = (id: number) => {
    const updated = colaboradores.filter(c => c.id !== id);
    const newDeletedIds = [...deletedIds, id];
    setColaboradores(updated);
    setDeletedIds(newDeletedIds);
    persistToDb(updated, newDeletedIds);
    toast.success("Colaborador removido com sucesso!");
  };

  const handleEditColaborador = (updated: Colaborador) => {
    const newList = colaboradores.map(c => c.id === updated.id ? updated : c);
    setColaboradores(newList);
    persistToDb(newList, deletedIds);
  };

  const handlePromote = useCallback(async (id: number, novaFuncao: string, observacao: string) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const dataFormatada = `${dd}/${mm}/${yyyy}`;

    // Find the employee name to sync with Supabase
    const colaborador = colaboradores.find(c => c.id === id);
    
    // Update state and persist to DB
    const newList = colaboradores.map(c => {
      if (c.id !== id) return c;
      const promocao = {
        funcaoAnterior: c.funcao,
        funcaoNova: novaFuncao,
        data: dataFormatada,
        observacao: observacao || undefined,
      };
      return {
        ...c,
        funcao: novaFuncao,
        promocoes: [...(c.promocoes || []), promocao],
      };
    });
    setColaboradores(newList);
    persistToDb(newList, deletedIds);

    // Sync with Supabase employees table (used by Presença, RDO, etc.)
    if (colaborador) {
      try {
        // Find matching employee in Supabase by name (case-insensitive)
        const { data: dbEmployees } = await supabase
          .from("employees")
          .select("id, name, role")
          .ilike("name", colaborador.nome);

        if (dbEmployees && dbEmployees.length > 0) {
          const { error } = await supabase
            .from("employees")
            .update({ role: novaFuncao })
            .eq("id", dbEmployees[0].id);

          if (error) {
            console.error("Erro ao sincronizar promoção no banco:", error);
          } else {
            // Invalidate queries so Presença, RDO, etc. reflect the change
            queryClient.invalidateQueries({ queryKey: ["employees"] });
            queryClient.invalidateQueries({ queryKey: ["employees_all"] });
            queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
            queryClient.invalidateQueries({ queryKey: ["attendance_report"] });
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar promoção:", err);
      }
    }

    toast.success("Promoção registrada com sucesso!");
  }, [colaboradores, queryClient, persistToDb, deletedIds]);

  const handleStartEditAso = (colaborador: Colaborador) => {
    setEditingAso(colaborador.id);
    setAsoForm({
      admissional: colaborador.aso?.admissional || "",
      validade: colaborador.aso?.validade || "",
      periodico: colaborador.aso?.periodico || "",
      retornoTrabalho: colaborador.aso?.retornoTrabalho || "",
      mudancaRisco: colaborador.aso?.mudancaRisco || "",
      observacao: colaborador.aso?.observacao || "",
    });
  };

  const handleSaveAso = (id: number) => {
    const newList = colaboradores.map(c => {
      if (c.id !== id) return c;

      let newValidade = asoForm.validade || c.aso?.validade || "";

      // Helper: soma 1 ano a uma data dd/mm/yyyy
      const addOneYear = (dateStr: string): string | null => {
        try {
          const parts = dateStr.split("/");
          if (parts.length !== 3) return null;
          const d = new Date(
            parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])
          );
          d.setFullYear(d.getFullYear() + 1);
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        } catch {
          return null;
        }
      };

      // Recalcula validade sempre que houver QUALQUER data preenchida entre
      // Periódico, Retorno ao Trabalho, Mudança de Risco ou Observação.
      // Pega a data MAIS RECENTE entre as 4 e define vencimento = data + 1 ano.
      // Isso garante que registros antigos também sejam corrigidos ao re-salvar.
      const triggerValues: string[] = [
        asoForm.periodico,
        asoForm.retornoTrabalho,
        asoForm.mudancaRisco,
        asoForm.observacao,
      ];
      let latest: Date | null = null;
      let latestStr = "";
      for (const v of triggerValues) {
        if (!v) continue;
        const parts = v.split("/");
        if (parts.length !== 3) continue;
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (isNaN(d.getTime())) continue;
        if (!latest || d > latest) {
          latest = d;
          latestStr = v;
        }
      }
      if (latestStr) {
        const next = addOneYear(latestStr);
        if (next) newValidade = next;
      }


      return {
        ...c,
        aso: {
          admissional: asoForm.admissional || c.aso?.admissional || "",
          validade: newValidade,
          periodico: asoForm.periodico || undefined,
          retornoTrabalho: asoForm.retornoTrabalho || undefined,
          mudancaRisco: asoForm.mudancaRisco || undefined,
          observacao: asoForm.observacao || undefined,
        },
      };
    });
    setColaboradores(newList);
    persistToDb(newList, deletedIds);
    setEditingAso(null);
    toast.success("ASO atualizado com sucesso!");
  };

  // Filter and sort employees
  const filteredColaboradores = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    const result = colaboradores.filter((colaborador) => {
      const matchesSearch =
        colaborador.nome.toLowerCase().includes(searchLower) ||
        colaborador.funcao.toLowerCase().includes(searchLower) ||
        colaborador.matricula.includes(searchTerm) ||
        (colaborador.matriculaHydro || "").includes(searchTerm) ||
        colaborador.cpf.includes(searchTerm);
      const matchesFuncao =
        filterFuncao === "all" || colaborador.funcao === filterFuncao;
      return matchesSearch && matchesFuncao;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "id":
          comparison = a.id - b.id;
          break;
        case "nome":
          comparison = a.nome.localeCompare(b.nome);
          break;
        case "funcao":
          comparison = a.funcao.localeCompare(b.funcao);
          break;
        case "admissao": {
          // Parse date in DD/MM/YYYY format
          const parseDate = (dateStr: string) => {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day).getTime();
          };
          comparison = parseDate(a.admissao) - parseDate(b.admissao);
          break;
        }
        case "matricula":
          comparison = parseInt(a.matricula) - parseInt(b.matricula);
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [searchTerm, filterFuncao, sortField, sortDirection, colaboradores]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterFuncao("all");
    setSortField("id");
    setSortDirection("asc");
  };

  const hasActiveFilters = searchTerm || filterFuncao !== "all";

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  // Count by function for stats
  const funcaoStats = useMemo(() => {
    const stats: Record<string, number> = {};
    colaboradores.forEach(c => {
      stats[c.funcao] = (stats[c.funcao] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [colaboradores]);

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <EditablePageTitle pageKey="rh" defaultValue="Efetivo" className="text-2xl sm:text-4xl font-bold mb-2" />
            <p className="text-muted-foreground">
              Quadro de colaboradores ativos: <span className="font-semibold text-primary">{colaboradores.length}</span> funcionários
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <ExportEfetivoPdfButton 
              colaboradores={filteredColaboradores} 
              filterFuncao={filterFuncao} 
            />
            <ExportEfetivoExcelButton 
              colaboradores={filteredColaboradores} 
              filterFuncao={filterFuncao} 
            />
            {canEditRH && (
              <>
                <ImportEfetivoExcelButton
                  colaboradores={colaboradores}
                  onImport={handleImportEmployees}
                />
                <AddEmployeeDialog onAdd={handleAddEmployee} />
              </>
            )}
            {isAdmin && (
              <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    title="Apagar todo o efetivo"
                    aria-label="Apagar todo o efetivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Apagar todo o efetivo?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá <strong>todos os {colaboradores.length} colaboradores</strong> deste ambiente de forma permanente.
                      <br />
                      <br />
                      Esta operação <strong>não pode ser desfeita</strong>. Considere exportar um Excel antes de prosseguir.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllEmployees}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, apagar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Efetivo</p>
                  <p className="text-2xl font-bold">{colaboradores.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {funcaoStats.map(([funcao, count]) => (
            <Card 
              key={funcao} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setFilterFuncao(funcao)}
            >
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground truncate" title={funcao}>
                  {funcao}
                </p>
                <p className="text-xl font-bold">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, função, matrícula ou CPF..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterFuncao} onValueChange={setFilterFuncao}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Filtrar por função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  {funcoes.map((funcao) => (
                    <SelectItem key={funcao} value={funcao}>
                      {funcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={sortField === "nome" ? "default" : "outline"}
                onClick={() => {
                  if (sortField === "nome") {
                    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("nome");
                    setSortDirection("asc");
                  }
                }}
                className="gap-2 whitespace-nowrap"
              >
                {sortField === "nome" && sortDirection === "desc" ? (
                  <ArrowUpAZ className="w-4 h-4" />
                ) : (
                  <ArrowDownAZ className="w-4 h-4" />
                )}
                A-Z
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="w-4 h-4" />
                  Limpar
                </Button>
              )}
            </div>
            
            {hasActiveFilters && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Busca: "{searchTerm}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                  </Badge>
                )}
                {filterFuncao !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {filterFuncao}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterFuncao("all")} />
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground ml-2">
                  ({filteredColaboradores.length} resultado{filteredColaboradores.length !== 1 ? "s" : ""})
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead 
                      className="cursor-pointer hover:bg-muted w-16"
                      onClick={() => handleSort("id")}
                    >
                      # <SortIcon field="id" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted min-w-[250px]"
                      onClick={() => handleSort("nome")}
                    >
                      Colaborador <SortIcon field="nome" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted min-w-[200px]"
                      onClick={() => handleSort("funcao")}
                    >
                      Função <SortIcon field="funcao" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted w-32"
                      onClick={() => handleSort("matricula")}
                    >
                      Matrícula Hydro <SortIcon field="matricula" />
                    </TableHead>
                    <TableHead className="w-32">
                      Matrícula Sucena
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted w-32"
                      onClick={() => handleSort("admissao")}
                    >
                      Admissão <SortIcon field="admissao" />
                    </TableHead>
                    <TableHead className="w-40 hidden lg:table-cell">Contato</TableHead>
                    {!permissionsLoading && canEditRH && (
                      <TableHead className="w-16">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColaboradores.map((colaborador, index) => (
                    <>
                      <TableRow 
                        key={colaborador.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setExpandedRow(expandedRow === colaborador.id ? null : colaborador.id)}
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                              {colaborador.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                            </div>
                            <div>
                              <span className="font-medium">{colaborador.nome}</span>
                              {colaborador.nrs && colaborador.nrs.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {colaborador.nrs.map((nr) => (
                                    <Badge key={nr} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                      {nr}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal whitespace-nowrap">
                            {colaborador.funcao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            {colaborador.matriculaHydro || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            {colaborador.matricula || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {colaborador.admissao}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {colaborador.contato && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {colaborador.contato}
                            </div>
                          )}
                        </TableCell>
                        {!permissionsLoading && canEditRH && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); setEditingColaborador(colaborador); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <PromotionDialog
                                colaborador={colaborador}
                                onPromote={handlePromote}
                              />
                              <DeleteEmployeeDialog
                                employee={colaborador}
                                onDelete={handleDeleteEmployee}
                              />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {/* Expanded Row Details */}
                      {expandedRow === colaborador.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={canEditRH ? 8 : 7}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">CPF</p>
                                <p className="font-medium">{colaborador.cpf}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Data de Nascimento</p>
                                <p className="font-medium">{colaborador.dataNascimento}</p>
                              </div>
                              <div className="lg:hidden">
                                <p className="text-xs text-muted-foreground mb-1">Contato</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {colaborador.contato || "Não informado"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Localidade</p>
                                <p className="font-medium flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {colaborador.localidade}
                                </p>
                              </div>
                            </div>

                            {/* Promotion History */}
                            {colaborador.promocoes && colaborador.promocoes.length > 0 && (
                              <div className="mt-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <History className="w-4 h-4 text-primary" />
                                  <span className="font-semibold text-sm text-primary">
                                    Histórico de Promoções ({colaborador.promocoes.length})
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {[...colaborador.promocoes].reverse().map((p, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                      <span className="text-xs font-medium text-primary">{p.data}</span>
                                      <span className="text-muted-foreground line-through text-xs">{p.funcaoAnterior}</span>
                                      <span className="text-xs">→</span>
                                      <span className="font-medium text-xs">{p.funcaoNova}</span>
                                      {p.observacao && (
                                        <span className="text-xs text-muted-foreground italic ml-1">({p.observacao})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ASO Section */}
                            {(() => {
                              const aso = colaborador.aso;
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const validade = getEffectiveAsoExpiry(aso, colaborador.admissao);
                              const validadeStr = getEffectiveAsoExpiryStr(aso, colaborador.admissao);
                              const displayedValidade = validadeStr || aso?.validade || "-";
                              const diffDays = validade ? Math.ceil((validade.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                              
                              let farolColor = "text-muted-foreground";
                              let farolBg = "bg-muted/50 border-border";
                              let farolLabel = "Sem ASO";
                              let FarolIcon = CircleAlert;
                              
                              if (diffDays !== null) {
                                if (diffDays < 0) {
                                  farolColor = "text-red-500";
                                  farolBg = "bg-red-500/10 border-red-500/30";
                                  farolLabel = "Vencido";
                                  FarolIcon = CircleAlert;
                                } else if (diffDays <= 30) {
                                  farolColor = "text-yellow-500";
                                  farolBg = "bg-yellow-500/10 border-yellow-500/30";
                                  farolLabel = "Vence em breve";
                                  FarolIcon = AlertTriangle;
                                } else if (diffDays <= 60) {
                                  farolColor = "text-orange-400";
                                  farolBg = "bg-orange-400/10 border-orange-400/30";
                                  farolLabel = "Atenção";
                                  FarolIcon = AlertTriangle;
                                } else {
                                  farolColor = "text-green-500";
                                  farolBg = "bg-green-500/10 border-green-500/30";
                                  farolLabel = "Em dia";
                                  FarolIcon = ShieldCheck;
                                }
                              }

                              const isEditing = editingAso === colaborador.id;

                              return (
                                <div className={`mt-3 p-3 rounded-lg border ${farolBg}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <FarolIcon className={`w-5 h-5 ${farolColor}`} />
                                      <span className={`font-semibold text-sm ${farolColor}`}>
                                        ASO - {farolLabel} {diffDays !== null && `(${diffDays > 0 ? `${diffDays} dias restantes` : `${Math.abs(diffDays)} dias vencido`})`}
                                      </span>
                                    </div>
                                    {canEditRH && !isEditing && (
                                      <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={(e) => { e.stopPropagation(); handleStartEditAso(colaborador); }}>
                                        <Pencil className="w-3 h-3" /> Editar
                                      </Button>
                                    )}
                                    {isEditing && (
                                      <Button variant="default" size="sm" className="h-7 gap-1" onClick={(e) => { e.stopPropagation(); handleSaveAso(colaborador.id); }}>
                                        <Save className="w-3 h-3" /> Salvar
                                      </Button>
                                    )}
                                  </div>
                                  {isEditing ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" onClick={(e) => e.stopPropagation()}>
                                      {[
                                        { key: "admissional", label: "Admissional" },
                                        { key: "validade", label: "Validade" },
                                        { key: "periodico", label: "Periódico" },
                                        { key: "retornoTrabalho", label: "Retorno ao Trabalho" },
                                        { key: "mudancaRisco", label: "Mudança de Risco" },
                                        { key: "observacao", label: "Observação" },
                                      ].map(({ key, label }) => (
                                        <div key={key}>
                                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                                          <Input
                                            className="h-8 text-sm"
                                            placeholder="DD/MM/AAAA"
                                            value={asoForm[key] || ""}
                                            onChange={(e) => setAsoForm(prev => ({ ...prev, [key]: e.target.value }))}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Admissional</p>
                                        <p className="text-sm font-medium">{aso?.admissional || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Validade</p>
                                        <p className={`text-sm font-medium ${farolColor}`}>{displayedValidade}</p>
                                        {validadeStr && aso?.validade !== validadeStr && (
                                          <p className="text-[10px] text-muted-foreground mt-0.5">(calculada)</p>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Periódico</p>
                                        <p className="text-sm font-medium">{aso?.periodico || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Retorno ao Trabalho</p>
                                        <p className="text-sm font-medium">{aso?.retornoTrabalho || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Mudança de Risco</p>
                                        <p className="text-sm font-medium">{aso?.mudancaRisco || "-"}</p>
                                      </div>
                                      {aso?.observacao && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">Observação</p>
                                          <p className="text-sm font-medium">{aso.observacao}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredColaboradores.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-lg">
                  Nenhum colaborador encontrado
                </p>
                <p className="text-sm text-muted-foreground">
                  Tente ajustar os filtros de busca
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <EditColaboradorDialog
          open={!!editingColaborador}
          onOpenChange={(open) => !open && setEditingColaborador(null)}
          colaborador={editingColaborador}
          onSave={handleEditColaborador}
        />
      </div>
    </Layout>
  );
};

export default RH;
