import { useState } from "react";
import { GripVertical, RotateCcw, Settings2, X, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  useDashboardOrder,
  DashboardItemId,
  DASHBOARD_ITEM_LABELS,
  DEFAULT_DASHBOARD_ORDER,
} from "@/hooks/useDashboardOrder";

interface SortableItemProps {
  id: DashboardItemId;
}

const SortableItem = ({ id }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <button
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex-1 font-medium">{DASHBOARD_ITEM_LABELS[id]}</span>
    </div>
  );
};

export const DashboardOrderEditor = () => {
  const { dashboardOrder, updateOrder, isLoading } = useDashboardOrder();
  const [localOrder, setLocalOrder] = useState<DashboardItemId[]>(dashboardOrder);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync local order when sheet opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalOrder(dashboardOrder);
    }
    setIsOpen(open);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(active.id as DashboardItemId);
        const newIndex = items.indexOf(over.id as DashboardItemId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateOrder(localOrder);
    setIsSaving(false);
    
    if (success) {
      toast.success("Ordem dos destaques salva!");
      setIsOpen(false);
    } else {
      toast.error("Erro ao salvar ordem");
    }
  };

  const handleReset = () => {
    setLocalOrder(DEFAULT_DASHBOARD_ORDER);
  };

  const hasChanges = JSON.stringify(localOrder) !== JSON.stringify(dashboardOrder);

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isLoading}
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Organizar Destaques</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Organizar Destaques
          </SheetTitle>
          <SheetDescription>
            Arraste os itens para reorganizar a ordem dos destaques no seu painel.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localOrder.map((id) => (
                  <SortableItem key={id} id={id} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrão
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
