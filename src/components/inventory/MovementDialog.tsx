import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordMovement, InventoryItem } from "@/hooks/useInventory";
import { useEmployees } from "@/hooks/useEmployees";
import { useEquipment } from "@/hooks/useEquipment";

const formSchema = z.object({
  movement_type: z.enum(["entrada", "saida", "ajuste"]),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
  reason: z.string().optional(),
  destination_type: z.enum(["employee", "equipment", "area", "none"]).optional(),
  destination_id: z.string().optional(),
  destination_name: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MovementDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada", icon: ArrowDownCircle, color: "text-green-500" },
  { value: "saida", label: "Saída", icon: ArrowUpCircle, color: "text-red-500" },
  { value: "ajuste", label: "Ajuste de Estoque", icon: RefreshCw, color: "text-yellow-500" },
];

const AREAS = [
  { id: "gabiao", name: "Gabião" },
  { id: "jardinagem", name: "Jardinagem" },
];

export function MovementDialog({ item, open, onOpenChange }: MovementDialogProps) {
  const recordMovement = useRecordMovement();
  const { data: employees } = useEmployees();
  const { data: equipment } = useEquipment();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      movement_type: "entrada",
      quantity: 1,
      reason: "",
      destination_type: "none",
      destination_id: "",
      destination_name: "",
    },
  });

  const movementType = form.watch("movement_type");
  const destinationType = form.watch("destination_type");

  // Reset destination when type changes
  useEffect(() => {
    form.setValue("destination_id", "");
    form.setValue("destination_name", "");
  }, [destinationType, form]);

  const onSubmit = async (data: FormData) => {
    if (!item) return;

    let destName = data.destination_name;
    
    // Get destination name based on type
    if (data.destination_type === "employee" && data.destination_id) {
      const emp = employees?.find(e => e.id === data.destination_id);
      destName = emp?.name;
    } else if (data.destination_type === "equipment" && data.destination_id) {
      const eq = equipment?.find(e => e.id === data.destination_id);
      destName = eq?.name;
    } else if (data.destination_type === "area" && data.destination_id) {
      const area = AREAS.find(a => a.id === data.destination_id);
      destName = area?.name;
    }

    await recordMovement.mutateAsync({
      item_id: item.id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      reason: data.reason,
      destination_type: data.destination_type !== "none" ? data.destination_type as "employee" | "equipment" | "area" : undefined,
      destination_id: data.destination_id || undefined,
      destination_name: destName,
    });
    form.reset();
    onOpenChange(false);
  };

  if (!item) return null;

  const showDestination = movementType === "saida";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentação de Estoque</DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            Quantidade atual: <span className="font-semibold">{item.quantity} {item.unit}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Movimentação *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOVEMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {movementType === "ajuste" ? "Nova Quantidade *" : "Quantidade *"}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={movementType === "ajuste" ? 0 : 1} 
                      {...field} 
                    />
                  </FormControl>
                  {movementType === "saida" && (
                    <p className="text-xs text-muted-foreground">
                      Máximo disponível: {item.quantity}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {showDestination && (
              <>
                <FormField
                  control={form.control}
                  name="destination_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino da Retirada</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o destino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem destino específico</SelectItem>
                          <SelectItem value="employee">Funcionário</SelectItem>
                          <SelectItem value="equipment">Equipamento</SelectItem>
                          <SelectItem value="area">Área (Gabião/Jardinagem)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {destinationType === "employee" && (
                  <FormField
                    control={form.control}
                    name="destination_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funcionário</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o funcionário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees?.filter(e => e.status === 'active').map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {destinationType === "equipment" && (
                  <FormField
                    control={form.control}
                    name="destination_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o equipamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipment?.map((eq) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.name} ({eq.plate})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {destinationType === "area" && (
                  <FormField
                    control={form.control}
                    name="destination_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a área" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AREAS.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo / Observação</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da movimentação..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={recordMovement.isPending}>
                {recordMovement.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
