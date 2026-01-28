import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownToLine, ArrowUpFromLine, Truck, Calendar, Clock, Search, Plus, Wrench, Shield, ClipboardCheck, Trash2, AlertCircle, ChevronDown } from "lucide-react";
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
  MovementType,
  ExitReason,
  EquipmentMovement
} from "@/hooks/useEquipmentMovements";
import { useEquipment } from "@/hooks/useEquipment";
import { useIsAdmin } from "@/hooks/useUserRole";
import { getBrazilNorthTodayString } from "@/lib/timezone";

const EXIT_REASON_LABELS: Record<ExitReason, { label: string; icon: typeof Wrench; color: string }> = {
  manutencao_corretiva: { label: "Manutenção Corretiva", icon: Wrench, color: "text-red-500" },
  manutencao_preventiva: { label: "Manutenção Preventiva", icon: Shield, color: "text-orange-500" },
  vistoria: { label: "Vistoria", icon: ClipboardCheck, color: "text-blue-500" },
};

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

  const today = getBrazilNorthTodayString();
  const { data: movements, isLoading } = useEquipmentMovements(today);
  const { data: summary } = useTodayMovementsSummary();
  const { data: equipmentList } = useEquipment();
  const createMovement = useCreateEquipmentMovement();
  const deleteMovement = useDeleteEquipmentMovement();
  const { isAdmin } = useIsAdmin();

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

  const handleSubmit = async () => {
    if (!equipmentName.trim() || !plate.trim()) return;

    await createMovement.mutateAsync({
      equipment_name: equipmentName.trim(),
      plate: plate.trim().toUpperCase(),
      movement_type: movementType,
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
          <TabsList>
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default EntradaSaidaEquipamentos;
