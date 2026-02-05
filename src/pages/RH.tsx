import { useState, useMemo, useEffect } from "react";
import { Search, Users, Phone, Calendar, Hash, MapPin, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import Layout from "@/components/layout/Layout";
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
import { DeleteEmployeeDialog } from "@/components/rh/DeleteEmployeeDialog";
import { useRHPermissions } from "@/hooks/useRHPermissions";
import { ExportEfetivoPdfButton } from "@/components/rh/ExportEfetivoPdfButton";
import { toast } from "sonner";

type SortField = "id" | "nome" | "funcao" | "admissao" | "matricula";
type SortDirection = "asc" | "desc";

const RH = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFuncao, setFilterFuncao] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(initialColaboradores);

  const { canEditRH, isLoading: permissionsLoading } = useRHPermissions();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("rh_colaboradores");
    if (stored) {
      try {
        setColaboradores(JSON.parse(stored));
      } catch {
        // Use initial data if parse fails
      }
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem("rh_colaboradores", JSON.stringify(colaboradores));
  }, [colaboradores]);

  const handleAddEmployee = (newEmployee: Omit<Colaborador, "id">) => {
    const maxId = Math.max(...colaboradores.map(c => c.id), 0);
    const employee: Colaborador = {
      ...newEmployee,
      id: maxId + 1,
    };
    setColaboradores(prev => [...prev, employee]);
  };

  const handleDeleteEmployee = (id: number) => {
    setColaboradores(prev => prev.filter(c => c.id !== id));
    toast.success("Colaborador removido com sucesso!");
  };

  // Filter and sort employees
  const filteredColaboradores = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    let result = colaboradores.filter((colaborador) => {
      const matchesSearch =
        colaborador.nome.toLowerCase().includes(searchLower) ||
        colaborador.funcao.toLowerCase().includes(searchLower) ||
        colaborador.matricula.includes(searchTerm) ||
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
        case "admissao":
          // Parse date in DD/MM/YYYY format
          const parseDate = (dateStr: string) => {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day).getTime();
          };
          comparison = parseDate(a.admissao) - parseDate(b.admissao);
          break;
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
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">Efetivo</h1>
            <p className="text-muted-foreground">
              Quadro de colaboradores ativos: <span className="font-semibold text-primary">{colaboradores.length}</span> funcionários
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <ExportEfetivoPdfButton 
              colaboradores={filteredColaboradores} 
              filterFuncao={filterFuncao} 
            />
            {!permissionsLoading && canEditRH && (
              <AddEmployeeDialog onAdd={handleAddEmployee} />
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
                      Matrícula <SortIcon field="matricula" />
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
                  {filteredColaboradores.map((colaborador) => (
                    <>
                      <TableRow 
                        key={colaborador.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setExpandedRow(expandedRow === colaborador.id ? null : colaborador.id)}
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {colaborador.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                              {colaborador.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                            </div>
                            <span className="font-medium">{colaborador.nome}</span>
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
                            {colaborador.matricula}
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
                            <DeleteEmployeeDialog
                              employee={colaborador}
                              onDelete={handleDeleteEmployee}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {/* Expanded Row Details */}
                      {expandedRow === colaborador.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={canEditRH ? 7 : 6}>
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
      </div>
    </Layout>
  );
};

export default RH;
