import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownToLine, ArrowUpFromLine, Truck, Calendar, Clock, Search, Plus, Wrench, Shield, ClipboardCheck, Trash2, AlertCircle, History, ChevronLeft, ChevronRight, CalendarIcon, ListChecks, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useEquipmentMovements, 
  useCreateEquipmentMovement, 
  useTodayMovementsSummary,
  useDeleteEquipmentMovement,
  useWeeklyEquipmentMovements,
  useAllEntries,
  useEquipmentCurrentlyOut,
  MovementType,
  ExitReason,
  EquipmentMovement
} from "@/hooks/useEquipmentMovements";
import { useEquipment } from "@/hooks/useEquipment";
import { useIsAdmin } from "@/hooks/useUserRole";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { ExportMovementsPdfButton } from "@/components/equipamentos/ExportMovementsPdfButton";
import { ExportStatusPdfButton } from "@/components/equipamentos/ExportStatusPdfButton";

const EXIT_REASON_LABELS: Record<ExitReason, { label: string; icon: typeof Wrench; color: string }> = {
  manutencao_corretiva: { label: "Manutenção Corretiva", icon: Wrench, color: "text-red-500" },
  manutencao_preventiva: { label: "Manutenção Preventiva", icon: Shield, color: "text-orange-500" },
  vistoria: { label: "Vistoria", icon: ClipboardCheck, color: "text-blue-500" },
};

type HistoryFilterType = "semana" | "mes" | "periodo";

const EntradaSaidaEquipamentos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>("entrada");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [equipmentName, setEquipmentName] = useState("");
  const [plate, setPlate] = useState("");
  const [observation, setObservation] = useState("");
  const [exitReason, setExitReason] = useState<ExitReason | "">("");
  const [problemDescription, setProblemDescription] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [movementDate, setMovementDate] = useState<Date>(new Date());
  const [movementTime, setMovementTime] = useState<string>(format(new Date(), "HH:mm"));
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterType>("semana");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const today = getBrazilNorthTodayString();
  const { data: movements, isLoading } = useEquipmentMovements(today);
  const { data: summary } = useTodayMovementsSummary();
  const { data: equipmentList } = useEquipment();
  const createMovement = useCreateEquipmentMovement();
  const deleteMovement = useDeleteEquipmentMovement();
  const { isAdmin } = useIsAdmin();

  // Calculate week dates for history
  const weekDates = useMemo(() => {
    const baseDate = subWeeks(new Date(), weekOffset);
    const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(baseDate, { weekStartsOn: 1 }); // Sunday
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      startFormatted: format(start, "dd/MM", { locale: ptBR }),
      endFormatted: format(end, "dd/MM/yyyy", { locale: ptBR }),
    };
  }, [weekOffset]);

  // Calculate month dates for history
  const monthDates = useMemo(() => {
    const baseDate = subMonths(new Date(), monthOffset);
    const start = startOfMonth(baseDate);
    const end = endOfMonth(baseDate);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      monthFormatted: format(baseDate, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  }, [monthOffset]);

  // Calculate custom period dates
  const customDates = useMemo(() => {
    if (!customStartDate || !customEndDate) return null;
    return {
      startDate: format(customStartDate, "yyyy-MM-dd"),
      endDate: format(customEndDate, "yyyy-MM-dd"),
      startFormatted: format(customStartDate, "dd/MM/yyyy", { locale: ptBR }),
      endFormatted: format(customEndDate, "dd/MM/yyyy", { locale: ptBR }),
    };
  }, [customStartDate, customEndDate]);

  // Determine which dates to use based on filter
  const historyDates = useMemo(() => {
    switch (historyFilter) {
      case "mes":
        return { startDate: monthDates.startDate, endDate: monthDates.endDate };
      case "periodo":
        return customDates ? { startDate: customDates.startDate, endDate: customDates.endDate } : null;
      case "semana":
      default:
        return { startDate: weekDates.startDate, endDate: weekDates.endDate };
    }
  }, [historyFilter, weekDates, monthDates, customDates]);

  const { data: historyMovements, isLoading: isLoadingHistory } = useWeeklyEquipmentMovements(
    historyDates?.startDate || "",
    historyDates?.endDate || ""
  );

  // Get all entries and currently out equipment
  const { data: allEntries, isLoading: isLoadingEntries } = useAllEntries();
  const { data: currentlyOut, isLoading: isLoadingOut } = useEquipmentCurrentlyOut();

  // Group history movements by date
  const groupedHistoryMovements = useMemo(() => {
    if (!historyMovements) return {};
    return historyMovements.reduce((acc, movement) => {
      const date = movement.movement_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(movement);
      return acc;
    }, {} as Record<string, EquipmentMovement[]>);
  }, [historyMovements]);

  // Handle equipment selection
  const handleEquipmentSelect = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
    if (equipmentId === "manual") {
      setEquipmentName("");
      setPlate("");
    } else {
      const equipment = equipmentList?.find(e => e.id === equipmentId);
      if (equipment) {
        setEquipmentName(equipment.name);
        setPlate(equipment.plate);
      }
    }
  };

  const filteredMovements = movements?.filter(
    (m) =>
      m.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.plate.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const entradas = filteredMovements.filter((m) => m.movement_type === "entrada");
  const saidas = filteredMovements.filter((m) => m.movement_type === "saida");

  // Get last movement status for a plate
  const getLastMovementForPlate = (plateToCheck: string): EquipmentMovement | null => {
    if (!currentlyOut) return null;
    const found = currentlyOut.find(m => m.plate.toUpperCase() === plateToCheck.toUpperCase());
    if (found) return found; // Last movement was "saida"
    
    // Check if there's any entry for this plate (meaning last was "entrada")
    if (allEntries) {
      const lastEntry = allEntries.find(m => m.plate.toUpperCase() === plateToCheck.toUpperCase());
      if (lastEntry) return lastEntry;
    }
    return null;
  };

  // Check if movement is valid (no duplicate consecutive movements)
  const canCreateMovement = (plateToCheck: string, type: MovementType): { valid: boolean; message: string } => {
    if (!plateToCheck.trim()) return { valid: true, message: "" };
    
    const lastMovement = getLastMovementForPlate(plateToCheck);
    if (!lastMovement) return { valid: true, message: "" }; // No previous movement, allow any
    
    if (lastMovement.movement_type === type) {
      const typeLabel = type === "entrada" ? "entrada" : "saída";
      const oppositeLabel = type === "entrada" ? "saída" : "entrada";
      return { 
        valid: false, 
        message: `Este veículo já possui uma ${typeLabel} registrada. Registre uma ${oppositeLabel} primeiro.` 
      };
    }
    
    return { valid: true, message: "" };
  };

  const movementValidation = useMemo(() => {
    return canCreateMovement(plate, movementType);
  }, [plate, movementType, currentlyOut, allEntries]);

  const handleSubmit = async () => {
    if (!equipmentName.trim() || !plate.trim()) return;
    
    // Validate movement
    const validation = canCreateMovement(plate, movementType);
    if (!validation.valid) {
      return;
    }

    await createMovement.mutateAsync({
      equipment_name: equipmentName.trim(),
      plate: plate.trim().toUpperCase(),
      movement_type: movementType,
      movement_date: format(movementDate, "yyyy-MM-dd"),
      movement_time: movementTime,
      observation: observation.trim() || null,
      exit_reason: movementType === "saida" && exitReason ? exitReason : null,
      problem_description: movementType === "saida" && exitReason === "manutencao_corretiva" ? problemDescription.trim() || null : null,
    });

    // Reset form
    setSelectedEquipmentId("");
    setEquipmentName("");
    setPlate("");
    setObservation("");
    setExitReason("");
    setProblemDescription("");
    setMovementDate(new Date());
    setMovementTime(format(new Date(), "HH:mm"));
    setIsDialogOpen(false);
  };

  const renderMovementCard = (movement: EquipmentMovement) => {
    const isEntrada = movement.movement_type === "entrada";
    const exitInfo = movement.exit_reason ? EXIT_REASON_LABELS[movement.exit_reason] : null;
    const ExitIcon = exitInfo?.icon;

    return (
      <div
        key={movement.id}
        className={`p-4 rounded-lg border ${
          isEntrada
            ? "bg-green-500/5 border-green-500/20"
            : "bg-orange-500/5 border-orange-500/20"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-full ${
                isEntrada ? "bg-green-500/20" : "bg-orange-500/20"
              }`}
            >
              {isEntrada ? (
                <ArrowDownToLine className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
              )}
            </div>
            <div>
              <p className="font-semibold">{movement.equipment_name}</p>
              <p className="text-sm text-muted-foreground">{movement.plate}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {movement.movement_time.slice(0, 5)}
                </span>
              </div>
              {movement.observation && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  "{movement.observation}"
                </p>
              )}
              {exitInfo && ExitIcon && (
                <div className="flex items-center gap-2 mt-2">
                  <ExitIcon className={`h-4 w-4 ${exitInfo.color}`} />
                  <Badge variant="outline" className={exitInfo.color}>
                    {exitInfo.label}
                  </Badge>
                </div>
              )}
              {movement.problem_description && (
                <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-500">{movement.problem_description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMovement.mutate(movement.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                Entrada e Saída de Equipamentos
              </h1>
              <p className="text-muted-foreground mt-2">
                Registre a entrada e saída de equipamentos do canteiro
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Registro
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Registrar Movimento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Movement Type */}
                  <div className="space-y-2">
                    <Label>Tipo de Movimento</Label>
                    <RadioGroup
                      value={movementType}
                      onValueChange={(v) => setMovementType(v as MovementType)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="entrada" id="entrada" />
                        <Label htmlFor="entrada" className="flex items-center gap-2 cursor-pointer">
                          <ArrowDownToLine className="h-4 w-4 text-green-500" />
                          Entrada
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="saida" id="saida" />
                        <Label htmlFor="saida" className="flex items-center gap-2 cursor-pointer">
                          <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
                          Saída
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Date and Time Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data do Movimento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !movementDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {movementDate ? format(movementDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={movementDate}
                            onSelect={(date) => date && setMovementDate(date)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="movementTime">Hora</Label>
                      <Input
                        id="movementTime"
                        type="time"
                        value={movementTime}
                        onChange={(e) => setMovementTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Equipment Selection */}
                  <div className="space-y-2">
                    <Label>Selecionar Equipamento *</Label>
                    <Select value={selectedEquipmentId} onValueChange={handleEquipmentSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um equipamento cadastrado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">
                          <span className="text-muted-foreground">✏️ Inserir manualmente</span>
                        </SelectItem>
                        {equipmentList?.map((equipment) => (
                          <SelectItem key={equipment.id} value={equipment.id}>
                            <span className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              {equipment.name} - {equipment.plate}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Manual Equipment Name (only shown when manual is selected) */}
                  {selectedEquipmentId === "manual" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="equipment">Nome do Equipamento *</Label>
                        <Input
                          id="equipment"
                          placeholder="Ex: Retroescavadeira, Caminhão Pipa..."
                          value={equipmentName}
                          onChange={(e) => setEquipmentName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="plate">Placa *</Label>
                        <Input
                          id="plate"
                          placeholder="ABC-1234"
                          value={plate}
                          onChange={(e) => setPlate(e.target.value.toUpperCase())}
                          maxLength={8}
                        />
                      </div>
                    </>
                  )}

                  {/* Observation */}
                  <div className="space-y-2">
                    <Label htmlFor="observation">Observação</Label>
                    <Textarea
                      id="observation"
                      placeholder="Observações gerais sobre o movimento..."
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Exit Reason (only for saida) */}
                  {movementType === "saida" && (
                    <>
                      <div className="space-y-2">
                        <Label>Motivo da Saída *</Label>
                        <RadioGroup
                          value={exitReason}
                          onValueChange={(v) => setExitReason(v as ExitReason)}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manutencao_corretiva" id="corretiva" />
                            <Label htmlFor="corretiva" className="flex items-center gap-2 cursor-pointer">
                              <Wrench className="h-4 w-4 text-red-500" />
                              Manutenção Corretiva
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manutencao_preventiva" id="preventiva" />
                            <Label htmlFor="preventiva" className="flex items-center gap-2 cursor-pointer">
                              <Shield className="h-4 w-4 text-orange-500" />
                              Manutenção Preventiva
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="vistoria" id="vistoria" />
                            <Label htmlFor="vistoria" className="flex items-center gap-2 cursor-pointer">
                              <ClipboardCheck className="h-4 w-4 text-blue-500" />
                              Vistoria
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Problem Description (only for corretiva) */}
                      {exitReason === "manutencao_corretiva" && (
                        <div className="space-y-2">
                          <Label htmlFor="problem">Descrição do Problema *</Label>
                          <Textarea
                            id="problem"
                            placeholder="Descreva o defeito ou problema apresentado..."
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            rows={3}
                            className="border-red-500/30 focus:border-red-500"
                          />
                        </div>
                      )}
                    </>
                  )}
                  {/* Validation Warning */}
                  {plate.trim() && !movementValidation.valid && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-destructive font-medium">
                          {movementValidation.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !equipmentName.trim() ||
                      !plate.trim() ||
                      !movementValidation.valid ||
                      (movementType === "saida" && !exitReason) ||
                      (exitReason === "manutencao_corretiva" && !problemDescription.trim()) ||
                      createMovement.isPending
                    }
                  >
                    {createMovement.isPending ? "Registrando..." : "Registrar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/20">
                  <ArrowDownToLine className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entradas Hoje</p>
                  <p className="text-2xl font-bold">{summary?.entradas || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/20">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saídas Hoje</p>
                  <p className="text-2xl font-bold">{summary?.saidas || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No Canteiro</p>
                  <p className="text-2xl font-bold">{Math.max(0, summary?.noCanteiro || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por equipamento ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="todos" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="todos">
              Todos ({filteredMovements.length})
            </TabsTrigger>
            <TabsTrigger value="entradas" className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Entradas ({entradas.length})
            </TabsTrigger>
            <TabsTrigger value="saidas" className="gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              Saídas ({saidas.length})
            </TabsTrigger>
            <TabsTrigger value="situacao" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Situação
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Registros de Hoje - {format(new Date(today), "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : filteredMovements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum registro encontrado</p>
                    <p className="text-sm mt-1">Clique em "Novo Registro" para adicionar</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {filteredMovements.map(renderMovementCard)}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entradas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-green-500" />
                  Entradas de Equipamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entradas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowDownToLine className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                    <p>Nenhuma entrada registrada hoje</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {entradas.map(renderMovementCard)}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saidas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                  Saídas de Equipamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {saidas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowUpFromLine className="h-12 w-12 mx-auto mb-4 opacity-50 text-orange-500" />
                    <p>Nenhuma saída registrada hoje</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {saidas.map(renderMovementCard)}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="situacao" className="space-y-4">
            {/* Header with export button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Situação Atual dos Equipamentos</h3>
              </div>
              <ExportStatusPdfButton
                allEntries={allEntries || []}
                currentlyOut={currentlyOut || []}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* All Entries - Historic */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-green-500" />
                    Todos os Equipamentos que Entraram
                    {allEntries && (
                      <Badge variant="secondary">{allEntries.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingEntries ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : !allEntries || allEntries.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ArrowDownToLine className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                      <p>Nenhuma entrada registrada</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-2">
                        {allEntries.map((movement) => (
                          <div
                            key={movement.id}
                            className="p-3 rounded-lg border bg-green-500/5 border-green-500/20"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 rounded-full bg-green-500/20">
                                  <ArrowDownToLine className="h-4 w-4 text-green-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{movement.equipment_name}</p>
                                  <p className="text-xs text-muted-foreground">{movement.plate}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium">
                                  {format(parseISO(movement.movement_date), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {movement.movement_time.slice(0, 5)}
                                </p>
                              </div>
                            </div>
                            {movement.observation && (
                              <p className="text-xs text-muted-foreground mt-2 italic pl-8">
                                "{movement.observation}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Currently Out */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                    Equipamentos Fora do Canteiro
                    {currentlyOut && (
                      <Badge variant="destructive">{currentlyOut.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingOut ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : !currentlyOut || currentlyOut.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Todos os equipamentos estão no canteiro</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-2">
                        {currentlyOut.map((movement) => {
                          const exitInfo = movement.exit_reason ? EXIT_REASON_LABELS[movement.exit_reason] : null;
                          const ExitIcon = exitInfo?.icon;

                          return (
                            <div
                              key={movement.id}
                              className="p-3 rounded-lg border bg-orange-500/5 border-orange-500/20"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2">
                                  <div className="p-1.5 rounded-full bg-orange-500/20">
                                    <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{movement.equipment_name}</p>
                                    <p className="text-xs text-muted-foreground">{movement.plate}</p>
                                    {exitInfo && ExitIcon && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <ExitIcon className={`h-3 w-3 ${exitInfo.color}`} />
                                        <span className={`text-xs ${exitInfo.color}`}>
                                          {exitInfo.label}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium">
                                    Saiu em {format(parseISO(movement.movement_date), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    às {movement.movement_time.slice(0, 5)}
                                  </p>
                                </div>
                              </div>
                              {movement.problem_description && (
                                <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 ml-8">
                                  <div className="flex items-start gap-1">
                                    <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-500">{movement.problem_description}</p>
                                  </div>
                                </div>
                              )}
                              {movement.observation && (
                                <p className="text-xs text-muted-foreground mt-2 italic pl-8">
                                  "{movement.observation}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      Histórico de Movimentos
                    </CardTitle>
                    <ExportMovementsPdfButton
                      movements={historyMovements || []}
                      startDate={historyDates?.startDate || ""}
                      endDate={historyDates?.endDate || ""}
                    />
                  </div>

                  {/* Filter Options */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filtrar por:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={historyFilter === "semana" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHistoryFilter("semana")}
                      >
                        Semana
                      </Button>
                      <Button
                        variant={historyFilter === "mes" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHistoryFilter("mes")}
                      >
                        Mês
                      </Button>
                      <Button
                        variant={historyFilter === "periodo" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHistoryFilter("periodo")}
                      >
                        Período
                      </Button>
                    </div>
                  </div>

                  {/* Week Navigation */}
                  {historyFilter === "semana" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setWeekOffset(prev => prev + 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[160px] text-center">
                        {weekDates.startFormatted} - {weekDates.endFormatted}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                        disabled={weekOffset === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Month Navigation */}
                  {historyFilter === "mes" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMonthOffset(prev => prev + 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[180px] text-center capitalize">
                        {monthDates.monthFormatted}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMonthOffset(prev => Math.max(0, prev - 1))}
                        disabled={monthOffset === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Custom Period Selection */}
                  {historyFilter === "periodo" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Data Inicial</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[140px] justify-start text-left font-normal",
                                !customStartDate && "text-muted-foreground"
                              )}
                              size="sm"
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customStartDate}
                              onSelect={setCustomStartDate}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data Final</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-[140px] justify-start text-left font-normal",
                                !customEndDate && "text-muted-foreground"
                              )}
                              size="sm"
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customEndDate}
                              onSelect={setCustomEndDate}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                              locale={ptBR}
                              disabled={(date) => customStartDate ? date < customStartDate : false}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {customDates && (
                        <Badge variant="secondary" className="self-end mb-1">
                          {customDates.startFormatted} - {customDates.endFormatted}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando histórico...
                  </div>
                ) : historyFilter === "periodo" && !customDates ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione as datas para visualizar o histórico</p>
                  </div>
                ) : !historyMovements || historyMovements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum registro encontrado no período</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-6">
                      {Object.entries(groupedHistoryMovements)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([date, dayMovements]) => (
                          <div key={date} className="space-y-3">
                            <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-primary">
                                {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                              </span>
                              <Badge variant="secondary" className="ml-2">
                                {(dayMovements as EquipmentMovement[]).length} registro{(dayMovements as EquipmentMovement[]).length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="space-y-2 pl-6 border-l-2 border-muted">
                              {(dayMovements as EquipmentMovement[]).map(renderMovementCard)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default EntradaSaidaEquipamentos;
