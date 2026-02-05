import { Truck, MapPin, ExternalLink, FileText, Clock, Plus, Trash2 } from "lucide-react";
import { Leaf, ArrowUpCircle, ArrowDownCircle, Loader2 as Loader2Icon } from "lucide-react";
import { useState } from "react";
 import Layout from "@/components/layout/Layout";
 import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentCurrentlyOut } from "@/hooks/useEquipmentMovements";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { useJardinagemEquipment, useUpdateJardinagemEquipmentStatus, useCreateJardinagemEquipment, useDeleteJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};
 
 const EntradaSaidaEquipamentos = () => {
   const { data: equipment = [], isLoading } = useEquipment();
  const { data: equipmentOut = [], isLoading: loadingOut } = useEquipmentCurrentlyOut();
  const { data: jardinagemEquipment = [], isLoading: loadingJardinagem } = useJardinagemEquipment();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const updateJardinagemStatus = useUpdateJardinagemEquipmentStatus();
  const createJardinagemEquipment = useCreateJardinagemEquipment();
  const deleteJardinagemEquipment = useDeleteJardinagemEquipment();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");

  // Check if user can edit jardinagem equipment
  const canEditJardinagem = isAdmin || 
    profile?.cargo === "preposto" || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i";

  const handleToggleJardinagemStatus = (id: string, name: string, currentStatus: "entrou" | "saiu") => {
    const newStatus = currentStatus === "entrou" ? "saiu" : "entrou";
    updateJardinagemStatus.mutate({ id, name, newStatus });
  };

  const handleAddEquipment = () => {
    if (!newEquipmentName.trim()) return;
    createJardinagemEquipment.mutate(
      { name: newEquipmentName.trim() },
      {
        onSuccess: () => {
          setNewEquipmentName("");
          setAddDialogOpen(false);
        },
      }
    );
  };

  const handleDeleteEquipment = (id: string) => {
    deleteJardinagemEquipment.mutate(id);
  };
 
  // Only consider equipment "out" if exit reason is NOT "fim_turno" or "operando"
  // Those statuses mean the equipment is still on site
  const reallyOut = equipmentOut.filter(m => 
    m.exit_reason && 
    m.exit_reason !== "fim_turno" && 
    m.exit_reason !== "operando" &&
    m.exit_reason !== "aguardando_frente_servico"
  );
  
  // Get plates of equipment actually out (manutenção, vistoria, etc.)
  const platesOut = new Set(reallyOut.map(m => m.plate));
  
  // Equipment in the yard = all equipment minus those with active exit
  const equipmentNoCanteiro = equipment.filter(eq => !platesOut.has(eq.plate));
  
  // Equipment out = only those with real exit reasons (maintenance, inspection)
  const equipmentForaObra = reallyOut;

  const handleExportPDF = async () => {
    const logoBase64 = await getLogoBase64();
    const now = new Date();
    const dateStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Equipamentos - ${format(now, "dd-MM-yyyy")}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .logo { height: 50px; }
          .title { flex: 1; }
          .title h1 { font-size: 18px; margin-bottom: 4px; }
          .title p { color: #666; font-size: 11px; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #f5f5f5; border-left: 4px solid #333; }
          .section-title.in { border-left-color: #16a34a; }
          .section-title.out { border-left-color: #ea580c; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f9f9f9; font-weight: bold; font-size: 11px; }
          td { font-size: 11px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-orange { background: #ffedd5; color: #c2410c; }
          .badge-red { background: #fee2e2; color: #dc2626; }
          .badge-yellow { background: #fef9c3; color: #a16207; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
          .observation { font-size: 10px; color: #666; margin-top: 4px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoBase64}" alt="Logo" class="logo" />
          <div class="title">
            <h1>Relatório de Entrada e Saída de Equipamentos</h1>
            <p>Gerado em: ${dateStr}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title in">🟢 Equipamentos no Canteiro (${equipmentNoCanteiro.length})</div>
          ${equipmentNoCanteiro.length === 0 ? '<p style="padding: 10px; color: #666;">Nenhum equipamento no canteiro</p>' : `
          <table>
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Placa</th>
                <th>Motorista</th>
                <th>Ajudante</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${equipmentNoCanteiro.map(eq => `
                <tr>
                  <td><strong>${eq.name}</strong></td>
                  <td>${eq.plate}</td>
                  <td>${eq.driver || "-"}</td>
                  <td>${eq.helper || "-"}</td>
                  <td><span class="badge ${eq.stop_reason === "none" ? "badge-green" : eq.stop_reason === "maintenance" ? "badge-red" : "badge-yellow"}">${eq.stop_reason === "none" ? "Operando" : eq.stop_reason === "maintenance" ? "Manutenção" : eq.stop_reason === "waiting" ? "Aguardando" : eq.stop_reason === "end_of_shift" ? "Fim de Turno" : eq.stop_reason || "Aguardando"}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          `}
        </div>

        <div class="section">
          <div class="section-title out">🔴 Equipamentos Fora da Obra (${equipmentForaObra.length})</div>
          ${equipmentForaObra.length === 0 ? '<p style="padding: 10px; color: #666;">Nenhum equipamento fora da obra</p>' : `
          <table>
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Placa</th>
                <th>Data/Hora Saída</th>
                <th>Motivo</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${equipmentForaObra.map(m => `
                <tr>
                  <td><strong>${m.equipment_name}</strong></td>
                  <td>${m.plate}</td>
                  <td>${format(new Date(m.movement_date + "T" + m.movement_time), "dd/MM/yyyy HH:mm")}</td>
                  <td><span class="badge badge-orange">${EXIT_REASON_LABELS[m.exit_reason || ""] || m.exit_reason || "-"}</span></td>
                  <td>
                    ${m.problem_description ? `<strong>Problema:</strong> ${m.problem_description}<br/>` : ""}
                    ${m.observation || "-"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          `}
        </div>

        <div class="section">
          <div class="section-title" style="border-left-color: #22c55e;">🌿 Equipamentos para Jardinagem (${jardinagemEquipment.length})</div>
          ${jardinagemEquipment.length === 0 ? '<p style="padding: 10px; color: #666;">Nenhum equipamento cadastrado</p>' : `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Equipamento</th>
                <th>Status</th>
                <th>Última Atualização</th>
              </tr>
            </thead>
            <tbody>
              ${jardinagemEquipment.map((eq, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${eq.name}</strong></td>
                  <td><span class="badge ${eq.status === 'entrou' ? 'badge-green' : 'badge-orange'}">${eq.status === 'entrou' ? 'Entrou' : 'Saiu'}</span></td>
                  <td>${format(new Date(eq.status_changed_at), "dd/MM/yyyy HH:mm")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          `}
        </div>

        <div class="footer">
          <p>OBRA: 460001269 | Sucena Engenharia</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
 
   return (
     <Layout>
       <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              Entrada e Saída de Equipamentos
            </h1>
            <p className="text-muted-foreground mt-2">
              Controle de equipamentos no canteiro e fora da obra
            </p>
          </div>
          <Button onClick={handleExportPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
         </div>
 
        {isLoading || loadingOut || loadingJardinagem ? (
           <div className="flex justify-center py-12">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
         ) : (
           <div className="grid gap-6">
             {/* Equipamentos no Canteiro */}
             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="flex items-center gap-2 text-lg">
                   <MapPin className="h-5 w-5 text-green-600" />
                   Equipamentos no Canteiro
                   <Badge variant="secondary" className="ml-2">
                     {equipmentNoCanteiro.length}
                   </Badge>
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 {equipmentNoCanteiro.length === 0 ? (
                   <p className="text-muted-foreground text-center py-4">
                     Nenhum equipamento no canteiro
                   </p>
                 ) : (
                   <div className="overflow-x-auto">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead className="w-12"></TableHead>
                           <TableHead>Equipamento</TableHead>
                           <TableHead>Placa</TableHead>
                           <TableHead>Motorista</TableHead>
                           <TableHead>Ajudante</TableHead>
                           <TableHead>Status</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {equipmentNoCanteiro.map((eq) => (
                           <TableRow key={eq.id}>
                             <TableCell>
                               <VehicleIcon
                                 type={eq.equipment_type as "pipa" | "munk" | "camionete" | "onibus"}
                                 size="sm"
                               />
                             </TableCell>
                             <TableCell className="font-medium">{eq.name}</TableCell>
                             <TableCell className="font-mono text-sm">{eq.plate}</TableCell>
                             <TableCell>{eq.driver || "-"}</TableCell>
                             <TableCell>{eq.helper || "-"}</TableCell>
                             <TableCell>
                               <Badge
                                 variant="outline"
                                 className={
                                   eq.stop_reason === "none"
                                     ? "bg-green-500/10 text-green-600 border-green-500/30"
                                     : eq.stop_reason === "maintenance"
                                     ? "bg-red-500/10 text-red-600 border-red-500/30"
                                     : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                 }
                               >
                                 {eq.stop_reason === "none"
                                   ? "Operando"
                                   : eq.stop_reason === "maintenance"
                                   ? "Manutenção"
                                   : eq.stop_reason === "waiting"
                                   ? "Aguardando"
                                   : eq.stop_reason === "end_of_shift"
                                   ? "Fim de Turno"
                                   : eq.stop_reason || "Aguardando"}
                               </Badge>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 )}
               </CardContent>
             </Card>
 
             {/* Equipamentos Fora da Obra */}
             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="flex items-center gap-2 text-lg">
                   <ExternalLink className="h-5 w-5 text-orange-600" />
                   Equipamentos Fora da Obra
                   <Badge variant="secondary" className="ml-2">
                     {equipmentForaObra.length}
                   </Badge>
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 {equipmentForaObra.length === 0 ? (
                   <p className="text-muted-foreground text-center py-4">
                     Nenhum equipamento fora da obra
                   </p>
                 ) : (
                   <div className="overflow-x-auto">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead className="w-12"></TableHead>
                           <TableHead>Equipamento</TableHead>
                           <TableHead>Placa</TableHead>
                    <TableHead>Data/Hora Saída</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Observações</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                  {equipmentForaObra.map((m) => (
                    <TableRow key={m.id}>
                             <TableCell>
                        <ExternalLink className="h-4 w-4 text-orange-500" />
                      </TableCell>
                      <TableCell className="font-medium">{m.equipment_name}</TableCell>
                      <TableCell className="font-mono text-sm">{m.plate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(m.movement_date + "T" + m.movement_time), "dd/MM HH:mm")}
                        </div>
                             </TableCell>
                             <TableCell>
                               <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                          {EXIT_REASON_LABELS[m.exit_reason || ""] || m.exit_reason || "-"}
                               </Badge>
                             </TableCell>
                      <TableCell className="max-w-xs">
                        {m.problem_description && (
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            {m.problem_description}
                          </p>
                        )}
                        {m.observation && (
                          <p className="text-sm text-muted-foreground">
                            {m.observation}
                          </p>
                        )}
                        {!m.problem_description && !m.observation && "-"}
                      </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 )}
               </CardContent>
             </Card>

            {/* Equipamentos para Jardinagem */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="h-5 w-5 text-green-500" />
                  Equipamentos para Jardinagem
                  <Badge variant="secondary" className="ml-2">
                    {jardinagemEquipment.length}
                  </Badge>
                  {isAdmin && (
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="ml-auto gap-1">
                          <Plus className="h-4 w-4" />
                          Adicionar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Equipamento</DialogTitle>
                          <DialogDescription>
                            Insira o nome do novo equipamento de jardinagem.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Input
                            placeholder="Ex: Motopoda 02, Roçadeira 76..."
                            value={newEquipmentName}
                            onChange={(e) => setNewEquipmentName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddEquipment();
                            }}
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleAddEquipment}
                            disabled={!newEquipmentName.trim() || createJardinagemEquipment.isPending}
                          >
                            {createJardinagemEquipment.isPending ? (
                              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Adicionar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jardinagemEquipment.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum equipamento cadastrado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        {canEditJardinagem && <TableHead className="w-24">Ação</TableHead>}
                        {isAdmin && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jardinagemEquipment.map((eq, idx) => (
                        <TableRow key={eq.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{eq.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                eq.status === "entrou"
                                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                                  : "bg-orange-500/10 text-orange-600 border-orange-500/30"
                              }
                            >
                              {eq.status === "entrou" ? (
                                <><ArrowDownCircle className="h-3 w-3 mr-1" /> Entrou</>
                              ) : (
                                <><ArrowUpCircle className="h-3 w-3 mr-1" /> Saiu</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(eq.status_changed_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          {canEditJardinagem && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant={eq.status === "entrou" ? "destructive" : "default"}
                                onClick={() => handleToggleJardinagemStatus(eq.id, eq.name, eq.status)}
                                disabled={updateJardinagemStatus.isPending}
                                className="gap-1"
                              >
                                {updateJardinagemStatus.isPending ? (
                                  <Loader2Icon className="h-3 w-3 animate-spin" />
                                ) : eq.status === "entrou" ? (
                                  <><ArrowUpCircle className="h-3 w-3" /> Saiu</>
                                ) : (
                                  <><ArrowDownCircle className="h-3 w-3" /> Entrou</>
                                )}
                              </Button>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover equipamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover "{eq.name}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEquipment(eq.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>
           </div>
         )}
       </div>
     </Layout>
   );
 };
 
 export default EntradaSaidaEquipamentos;