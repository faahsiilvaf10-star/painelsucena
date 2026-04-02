import { Pencil, PencilOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditModeToggleProps {
  isEditMode: boolean;
  onToggle: () => void;
  className?: string;
}

export const EditModeToggle = ({ isEditMode, onToggle, className }: EditModeToggleProps) => {
  return (
    <Button
      variant={isEditMode ? "default" : "outline"}
      size="sm"
      onClick={onToggle}
      className={cn("gap-2 transition-all", isEditMode && "animate-pulse", className)}
      title={isEditMode ? "Sair do modo edição" : "Ativar modo edição"}
    >
      {isEditMode ? (
        <>
          <PencilOff className="w-4 h-4" />
          <span className="hidden sm:inline">Sair da Edição</span>
        </>
      ) : (
        <>
          <Pencil className="w-4 h-4" />
          <span className="hidden sm:inline">Modo Edição</span>
        </>
      )}
    </Button>
  );
};
