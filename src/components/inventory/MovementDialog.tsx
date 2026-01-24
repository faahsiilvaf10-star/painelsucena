import { useState } from "react";
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

const formSchema = z.object({
  movement_type: z.enum(["entrada", "saida", "ajuste"]),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
  reason: z.string().optional(),
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

export function MovementDialog({ item, open, onOpenChange }: MovementDialogProps) {
  const recordMovement = useRecordMovement();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      movement_type: "entrada",
      quantity: 1,
      reason: "",
    },
  });

  const movementType = form.watch("movement_type");

  const onSubmit = async (data: FormData) => {
    if (!item) return;

    await recordMovement.mutateAsync({
      item_id: item.id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      reason: data.reason,
    });
    form.reset();
    onOpenChange(false);
  };

  if (!item) return null;

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
