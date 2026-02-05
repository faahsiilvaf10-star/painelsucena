 import { Truck, MapPin, ExternalLink } from "lucide-react";
 import Layout from "@/components/layout/Layout";
 import { useEquipment } from "@/hooks/useEquipment";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
 import { Loader2 } from "lucide-react";
 
 const EntradaSaidaEquipamentos = () => {
   const { data: equipment = [], isLoading } = useEquipment();
 
   // For now, all equipment is "no canteiro" (on site)
   const equipmentNoCanteiro = equipment;
   const equipmentForaObra: typeof equipment = [];
 
   return (
     <Layout>
       <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
         <div className="mb-6 sm:mb-8 animate-fade-in">
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
 
         {isLoading ? (
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
                           <TableHead>Motorista</TableHead>
                           <TableHead>Motivo Saída</TableHead>
                           <TableHead>Status</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {equipmentForaObra.map((eq) => (
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
                             <TableCell>-</TableCell>
                             <TableCell>
                               <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                                 Fora
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
           </div>
         )}
       </div>
     </Layout>
   );
 };
 
 export default EntradaSaidaEquipamentos;