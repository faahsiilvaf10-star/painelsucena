import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { colorLabels, colorClasses, type SlingWithInspection } from "@/hooks/useSlingEquipment";

interface SlingInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sling: SlingWithInspection | null;
  onConfirm: (status: "inspected" | "cancelled", notes: string) => void;
  isLoading?: boolean;
}

export function SlingInspectionDialog({
  open,
  onOpenChange,
  sling,
  onConfirm,
  isLoading,
}: SlingInspectionDialogProps) {
  const [notes, setNotes] = useState("");

  const handleConfirm = (status: "inspected" | "cancelled") => {
    onConfirm(status, notes);
    setNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNotes("");
    }
    onOpenChange(open);
  };

  if (!sling) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Inspeção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sling Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`w-6 h-6 rounded-full ${colorClasses[sling.color]}`} />
            <div className="flex-1">
              <p className="font-mono font-medium">{sling.tag}</p>
              <p className="text-sm text-muted-foreground">{sling.description}</p>
            </div>
            <Badge variant="outline">{colorLabels[sling.color]}</Badge>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações da Vistoria</Label>
            <Textarea
              id="notes"
              placeholder="Descreva os achados durante a inspeção, condição da cinta, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Opcional: documente qualquer observação relevante sobre o estado da cinta.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => handleConfirm("inspected")}
              disabled={isLoading}
            >
              <Check className="w-4 h-4" />
              Inspecionada
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => handleConfirm("cancelled")}
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
